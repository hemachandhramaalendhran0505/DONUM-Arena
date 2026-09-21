import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TaskStatusBadge } from '@/components/ui/Badge';
import { Timeline } from '@/components/common/Timeline';
import { MapView, MapLegend } from '@/components/map/MapView';
import { useToast } from '@/context/ToastContext';
import { advanceTask, nextStatus } from '@/services/taskService';
import { TASK_LIFECYCLE, TASK_STATUS_LABEL, CATEGORY_LABEL } from '@/utils/labels';
import { formatDateTime } from '@/utils/format';
import { formatDistance } from '@/utils/geo';
import type { DeliveryStop } from '@/types';

const NEXT_LABEL: Record<string, string> = {
  accepted: 'Accept this task',
  going_to_pickup: 'Start heading to pickup',
  picked_up: 'Confirm pickup',
  out_for_delivery: 'Start delivery',
  delivered: 'Mark as delivered',
  completed: 'Complete task',
};

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { tasks, donations } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const task = tasks.find((t) => t.id === id);
  const donation = donations.find((d) => d.id === task?.donationId);

  if (!task) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-ink/55">
          This task could not be found.{' '}
          <Link to="/app/tasks" className="font-bold text-primary">
            Back to tasks
          </Link>
        </p>
      </Card>
    );
  }

  const isMine = task.volunteerId === user?.id;
  const canAct = user?.role === 'volunteer' && (task.status === 'available' || isMine);
  const next = nextStatus(task.status);
  const steps = TASK_LIFECYCLE.map((s) => ({ key: s, label: TASK_STATUS_LABEL[s] }));

  const advance = async () => {
    if (!user || !next) return;
    setBusy(true);
    try {
      await advanceTask(task, next, user);
      toast(`Status updated: ${TASK_STATUS_LABEL[next]}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary">
                  <Bike className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{task.title}</h1>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {task.quantity} {task.unit}
                    <span className="ml-2 font-medium text-ink/45">{CATEGORY_LABEL[task.category]}</span>
                  </p>
                </div>
              </div>
              <TaskStatusBadge status={task.status} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ink/5 pt-5">
              <Metric label="Distance" value={formatDistance(task.distanceKm)} icon={<Navigation className="h-4 w-4" />} />
              <Metric label="Estimated time" value={`${task.estimatedMinutes} min`} icon={<Clock className="h-4 w-4" />} />
              <Metric label="Pickup window" value={task.pickupWindow} icon={<Package className="h-4 w-4" />} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Route" icon={<Navigation className="h-4.5 w-4.5" />} />
            <MapView
              route
              height="h-72"
              markers={[
                { id: 'pickup', ...task.pickup, label: task.pickup.name, kind: 'pickup', active: task.status === 'available' || task.status === 'accepted' || task.status === 'going_to_pickup' },
                { id: 'dropoff', ...task.dropoff, label: task.dropoff.name, kind: 'destination', active: task.status === 'out_for_delivery' },
              ]}
            />
            <div className="mt-3.5">
              <MapLegend
                items={[
                  { kind: 'pickup', label: 'Pickup' },
                  { kind: 'destination', label: 'Delivery' },
                ]}
              />
            </div>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            <StopCard title="Pickup" stop={task.pickup} tone="primary" />
            <StopCard title="Delivery" stop={task.dropoff} tone="success" />
          </div>

          {donation && (
            <Card>
              <CardHeader title="Donation details" icon={<Package className="h-4.5 w-4.5" />} />
              <p className="text-sm leading-relaxed text-ink/65">{donation.description}</p>
              {donation.specialInstructions && (
                <p className="mt-3 rounded-xl bg-warning/8 p-3.5 text-sm leading-relaxed text-ink/70">
                  <span className="font-bold text-ink">Instructions: </span>
                  {donation.specialInstructions}
                </p>
              )}
              <Link
                to={`/app/donations/${donation.id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-700"
              >
                View full donation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {canAct && next && (
            <Card className="border-primary/20 bg-primary-50/40">
              <CardHeader title="Next step" icon={<CheckCircle2 className="h-4.5 w-4.5" />} />
              <p className="text-sm leading-relaxed text-ink/60">
                Updating the status here notifies the donor and the receiving organisation instantly.
              </p>
              <Button fullWidth size="lg" className="mt-4" loading={busy} onClick={advance}>
                {NEXT_LABEL[next] ?? `Mark as ${TASK_STATUS_LABEL[next]}`}
              </Button>
            </Card>
          )}

          <Card>
            <CardHeader title="Delivery timeline" icon={<Clock className="h-4.5 w-4.5" />} />
            <Timeline steps={steps} events={task.timeline} currentStatus={task.status} />
          </Card>

          <Card>
            <CardHeader title="Scheduled" />
            <p className="text-sm font-semibold text-ink">{formatDateTime(task.scheduledFor)}</p>
            <p className="mt-1 text-xs text-ink/50">Pickup window {task.pickupWindow}</p>
            {task.volunteerName && (
              <p className="mt-3 text-sm text-ink/60">
                Assigned to <span className="font-bold text-ink">{task.volunteerName}</span>
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/40">
        <span className="text-ink/30">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function StopCard({
  title,
  stop,
  tone,
}: {
  title: string;
  stop: DeliveryStop;
  tone: 'primary' | 'success';
}) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
          }`}
        >
          <MapPin className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">{title}</p>
          <p className="text-sm font-bold text-ink">{stop.name}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink/55">{stop.address}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {stop.contactPhone && (
          <a
            href={`tel:${stop.contactPhone}`}
            className="flex items-center gap-2 rounded-xl border border-ink/8 px-3.5 py-2.5 text-sm font-semibold text-ink transition hover:border-primary/30 hover:bg-primary-50/40"
          >
            <Phone className="h-4 w-4 text-primary" />
            {stop.contactName ?? 'Contact'} · {stop.contactPhone}
          </a>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-ink/8 px-3.5 py-2.5 text-sm font-semibold text-ink transition hover:border-primary/30 hover:bg-primary-50/40"
        >
          <Navigation className="h-4 w-4 text-primary" />
          Navigate
          <ExternalLink className="ml-auto h-3.5 w-3.5 text-ink/30" />
        </a>
      </div>
    </Card>
  );
}
