import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Route } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Card, EmptyState } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { TaskStatusBadge } from '@/components/ui/Badge';
import { acceptTask } from '@/services/taskService';
import { useToast } from '@/context/ToastContext';
import { formatDistance } from '@/utils/geo';
import { relativeTime } from '@/utils/format';
import { CATEGORY_LABEL } from '@/utils/labels';
import { cn } from '@/utils/cn';
import type { DeliveryTask } from '@/types';

const TABS = [
  { key: 'available', label: 'Available' },
  { key: 'mine', label: 'My tasks' },
  { key: 'completed', label: 'Completed' },
] as const;

export function TasksPage({ defaultTab = 'available' }: { defaultTab?: (typeof TABS)[number]['key'] }) {
  const { user } = useAuth();
  const { tasks } = useData();
  const { toast } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>(defaultTab);

  const lists = useMemo(
    () => ({
      available: tasks.filter((t) => t.status === 'available'),
      mine: tasks.filter((t) => t.volunteerId === user?.id && t.status !== 'completed'),
      completed: tasks.filter((t) => t.volunteerId === user?.id && t.status === 'completed'),
    }),
    [tasks, user?.id],
  );

  const visible = lists[tab];

  const accept = async (task: DeliveryTask) => {
    if (!user) return;
    await acceptTask(task, user);
    toast('Task accepted.');
    setTab('mine');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Delivery tasks</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          Pick up surplus and deliver it where it's needed. Every step updates the donor and receiver in real time.
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition focus-ring',
              tab === t.key
                ? 'bg-primary text-white shadow-lift'
                : 'bg-white text-ink/60 ring-1 ring-ink/5 hover:bg-primary-50 hover:text-primary',
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">{lists[t.key].length}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<Route className="h-6 w-6" />}
            title={
              tab === 'available'
                ? 'No tasks available right now'
                : tab === 'mine'
                  ? 'No active tasks'
                  : 'No completed deliveries yet'
            }
            description={
              tab === 'available'
                ? 'New pickups appear here as soon as donors list surplus nearby.'
                : tab === 'mine'
                  ? 'Accept a task from the Available tab to get started.'
                  : 'Your delivery history will build up here.'
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((task) => (
            <Card key={task.id} hover>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-1 text-sm font-bold text-ink">{task.title}</h3>
                  <p className="mt-0.5 text-sm font-semibold text-primary">
                    {task.quantity} {task.unit}
                    <span className="ml-2 font-medium text-ink/45">{CATEGORY_LABEL[task.category]}</span>
                  </p>
                </div>
                <TaskStatusBadge status={task.status} />
              </div>

              <div className="mt-4 space-y-1">
                <Row icon={MapPin} label={task.pickup.name} sub={task.pickup.address} tone="primary" />
                <div className="ml-4 h-4 w-0.5 rounded bg-ink/10" />
                <Row icon={MapPin} label={task.dropoff.name} sub={task.dropoff.address} tone="success" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-ink/55">
                <span className="flex items-center gap-1">
                  <Route className="h-3.5 w-3.5" />
                  {formatDistance(task.distanceKm)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {task.estimatedMinutes} min
                </span>
                <span>{task.pickupWindow}</span>
                <span>{relativeTime(task.scheduledFor)}</span>
              </div>

              <div className="mt-4 flex gap-2">
                {task.status === 'available' && (
                  <Button size="sm" className="flex-1" onClick={() => void accept(task)}>
                    Accept
                  </Button>
                )}
                <LinkButton
                  to={`/app/tasks/${task.id}`}
                  size="sm"
                  variant={task.status === 'available' ? 'outline' : 'primary'}
                  className="flex-1"
                >
                  {task.status === 'available' ? 'Details' : 'Open task'}
                </LinkButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'completed' && visible.length > 0 && (
        <p className="text-center text-sm text-ink/45">
          You've completed {visible.length} deliveries.{' '}
          <Link to="/app/impact" className="font-bold text-primary">
            See your impact
          </Link>
        </p>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  sub,
  tone,
}: {
  icon: typeof MapPin;
  label: string;
  sub: string;
  tone: 'primary' | 'success';
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg',
          tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{label}</p>
        <p className="truncate text-xs text-ink/50">{sub}</p>
      </div>
    </div>
  );
}
