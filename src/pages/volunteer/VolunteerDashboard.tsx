import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bike, Clock, MapPin, PackageCheck, Route, Timer, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Stat } from '@/components/ui/Stat';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { Button, LinkButton } from '@/components/ui/Button';
import { TaskStatusBadge } from '@/components/ui/Badge';
import { MapView } from '@/components/map/MapView';
import { greeting, relativeTime } from '@/utils/format';
import { formatDistance } from '@/utils/geo';
import { acceptTask } from '@/features/tracking/taskService';
import { useToast } from '@/context/ToastContext';
import { CATEGORY_LABEL } from '@/utils/labels';
import type { DeliveryTask } from '@/types';

export function VolunteerDashboard() {
  const { user } = useAuth();
  const { tasks } = useData();
  const { toast } = useToast();

  const available = useMemo(() => tasks.filter((t) => t.status === 'available'), [tasks]);
  const mine = useMemo(() => tasks.filter((t) => t.volunteerId === user?.id), [tasks, user?.id]);
  const activeTasks = mine.filter((t) => t.status !== 'completed');
  const completed = mine.filter((t) => t.status === 'completed');

  const hours = completed.reduce((sum, t) => sum + t.estimatedMinutes / 60, 0);
  const distance = completed.reduce((sum, t) => sum + t.distanceKm, 0);
  const peopleServed = completed.reduce((sum, t) => sum + t.quantity, 0);

  const accept = async (task: DeliveryTask) => {
    if (!user) return;
    await acceptTask(task, user);
    toast('Task accepted. Navigate to the pickup point when you are ready.');
  };

  return (
    <div className="space-y-7">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-700 p-6 text-white shadow-glow sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-white/70">
              {greeting()}, {user?.name.split(' ')[0]}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {available.length > 0
                ? `${available.length} pickup${available.length > 1 ? 's' : ''} need a volunteer`
                : 'Thanks for showing up.'}
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/60">
              {activeTasks.length > 0
                ? `You have ${activeTasks.length} task${activeTasks.length > 1 ? 's' : ''} in progress.`
                : 'Accept a task and DONUM will guide you from pickup to delivery.'}
            </p>
          </div>
          <LinkButton
            to="/app/tasks"
            size="lg"
            className="bg-white text-primary shadow-none hover:bg-white/90"
            icon={<Route className="h-5 w-5" />}
          >
            View tasks
          </LinkButton>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Available Tasks" value={available.length} icon={<Route className="h-4.5 w-4.5" />} />
        <Stat label="Completed" value={completed.length} icon={<PackageCheck className="h-4.5 w-4.5" />} tone="success" />
        <Stat label="Volunteer Hours" value={Math.round(hours * 10) / 10} suffix="hrs" icon={<Timer className="h-4.5 w-4.5" />} />
        <Stat label="Distance Covered" value={Math.round(distance)} suffix="km" icon={<Bike className="h-4.5 w-4.5" />} />
      </section>

      {/* Active task */}
      {activeTasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">In progress</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {activeTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader
                  title={task.title}
                  subtitle={`${task.quantity} ${task.unit} · ${CATEGORY_LABEL[task.category]}`}
                  icon={<Bike className="h-4.5 w-4.5" />}
                  action={<TaskStatusBadge status={task.status} />}
                />
                <MapView
                  height="h-44"
                  route
                  markers={[
                    { id: 'p', ...task.pickup, label: task.pickup.name, kind: 'pickup', active: true },
                    { id: 'd', ...task.dropoff, label: task.dropoff.name, kind: 'destination' },
                  ]}
                />
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-ink/60">
                    <MapPin className="h-4 w-4" />
                    {formatDistance(task.distanceKm)}
                  </span>
                  <span className="flex items-center gap-1.5 text-ink/60">
                    <Clock className="h-4 w-4" />
                    {task.estimatedMinutes} min
                  </span>
                  <Link
                    to={`/app/tasks/${task.id}`}
                    className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary-700"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Available */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Available tasks</h2>
          <Link to="/app/tasks" className="text-sm font-semibold text-primary hover:text-primary-700">
            View all
          </Link>
        </div>

        {available.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={<Route className="h-6 w-6" />}
              title="No tasks available right now"
              description="New pickup requests appear here as soon as donors list surplus nearby."
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {available.slice(0, 4).map((task) => (
              <Card key={task.id} hover>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 text-sm font-bold text-ink">{task.title}</h3>
                    <p className="mt-0.5 text-sm font-semibold text-primary">
                      {task.quantity} {task.unit}
                    </p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </div>

                <div className="mt-4 space-y-2.5">
                  <Stop label="Pickup" name={task.pickup.name} address={task.pickup.address} tone="primary" />
                  <div className="ml-[15px] h-4 w-0.5 rounded bg-ink/10" />
                  <Stop label="Deliver" name={task.dropoff.name} address={task.dropoff.address} tone="success" />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-ink/55">
                  <span>{formatDistance(task.distanceKm)}</span>
                  <span>{task.estimatedMinutes} min</span>
                  <span>Pickup {relativeTime(task.scheduledFor)}</span>
                  <span>{task.pickupWindow}</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => void accept(task)}>
                    Accept task
                  </Button>
                  <LinkButton to={`/app/tasks/${task.id}`} size="sm" variant="outline" className="flex-1">
                    Details
                  </LinkButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Your impact</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Deliveries Completed" value={completed.length} icon={<PackageCheck className="h-4.5 w-4.5" />} tone="success" />
            <Stat label="Items Delivered" value={peopleServed} icon={<Users className="h-4.5 w-4.5" />} />
            <Stat label="Distance Saved" value={Math.round(distance)} suffix="km" icon={<Route className="h-4.5 w-4.5" />} />
          </div>
        </section>
      )}
    </div>
  );
}

function Stop({
  label,
  name,
  address,
  tone,
}: {
  label: string;
  name: string;
  address: string;
  tone: 'primary' | 'success';
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
        }`}
      >
        <MapPin className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="truncate text-xs text-ink/50">{address}</p>
      </div>
    </div>
  );
}
