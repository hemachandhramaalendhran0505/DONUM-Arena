import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Building2,
  Check,
  Clock,
  Info,
  MapPin,
  Phone,
  Trash2,
  Truck,
  User as UserIcon,
  Utensils,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusBadge, VerificationBadge } from '@/components/ui/Badge';
import { Timeline } from '@/components/common/Timeline';
import { MapView, MapLegend } from '@/components/map/MapView';
import { MatchExplanation } from '@/features/matching/MatchExplanation';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { acceptDonation, cancelDonation, rejectDonation } from '@/features/donations/donationService';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  DONATION_LIFECYCLE,
  DONATION_STATUS_LABEL,
  FAILURE_STATUSES,
} from '@/utils/labels';
import { countdown, formatDate, formatDateTime } from '@/utils/format';
import { formatDistance, roadDistanceKm } from '@/utils/geo';

export function DonationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { donations, matches, tasks, users } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<'cancel' | 'reject' | null>(null);
  const [busy, setBusy] = useState(false);

  const donation = donations.find((d) => d.id === id);
  const match = useMemo(
    () => matches.find((m) => m.id === donation?.matchId) ?? matches.find((m) => m.donationId === donation?.id),
    [matches, donation],
  );
  const task = tasks.find((t) => t.donationId === donation?.id);
  const receiver = users.find((u) => u.id === donation?.matchedReceiverId);

  if (!donation) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-ink/55">
          This donation could not be found.{' '}
          <Link to="/app" className="font-bold text-primary">
            Go back
          </Link>
        </p>
      </Card>
    );
  }

  const isDonor = user?.id === donation.donorId;
  const isReceiver = user?.id === donation.matchedReceiverId;
  const canAccept =
    user?.role === 'ngo' && ['matched', 'created', 'matching'].includes(donation.status) && !isDonor;
  const failed = FAILURE_STATUSES.includes(donation.status);
  const steps = DONATION_LIFECYCLE.map((s) => ({ key: s, label: DONATION_STATUS_LABEL[s] }));

  const distance = receiver
    ? roadDistanceKm(donation.location, { latitude: receiver.latitude, longitude: receiver.longitude })
    : null;

  const handleAccept = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await acceptDonation(donation, user);
      toast('Donation accepted. The donor has been notified.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await rejectDonation(donation, 'Declined by the receiving organisation.');
      toast('Match declined. DONUM will look for another receiver.', 'info');
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await cancelDonation(donation, 'Cancelled by the donor.');
      toast('Donation cancelled.', 'info');
      setConfirm(null);
      navigate('/app/donations');
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
          {/* Header card */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-3xl">
                  {CATEGORY_EMOJI[donation.category]}
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{donation.title}</h1>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {donation.quantity} {donation.unit}
                    <span className="ml-2 font-medium text-ink/45">{CATEGORY_LABEL[donation.category]}</span>
                  </p>
                </div>
              </div>
              <StatusBadge status={donation.status} />
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink/65">{donation.description}</p>

            {donation.images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                {donation.images.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${donation.title} ${i + 1}`}
                    className="aspect-square w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            )}

            <dl className="mt-5 grid gap-x-6 gap-y-3.5 border-t border-ink/5 pt-5 sm:grid-cols-2">
              <Detail label="Condition" value={CONDITION_LABEL[donation.condition]} />
              <Detail label="Pickup" value={`${formatDate(donation.pickupDate)} · ${donation.pickupTime}`} />
              {donation.expiryDate && (
                <Detail label="Best before" value={`${formatDateTime(donation.expiryDate)} · ${countdown(donation.expiryDate)}`} />
              )}
              <Detail label="Listed" value={formatDateTime(donation.createdAt)} />
            </dl>

            {donation.specialInstructions && (
              <div className="mt-4 flex gap-3 rounded-xl bg-warning/8 p-3.5">
                <Info className="h-4.5 w-4.5 shrink-0 text-warning" />
                <p className="text-sm leading-relaxed text-ink/70">
                  <span className="font-bold text-ink">Special instructions: </span>
                  {donation.specialInstructions}
                </p>
              </div>
            )}
          </Card>

          {/* Food details */}
          {donation.foodDetails && (
            <Card>
              <CardHeader title="Food safety details" icon={<Utensils className="h-4.5 w-4.5" />} />
              <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                {donation.foodDetails.foodType && <Detail label="Food type" value={donation.foodDetails.foodType.replace('_', ' ')} />}
                {donation.foodDetails.preparationDate && (
                  <Detail label="Prepared" value={formatDateTime(donation.foodDetails.preparationDate)} />
                )}
                {donation.foodDetails.storageRequirement && (
                  <Detail label="Storage" value={donation.foodDetails.storageRequirement} />
                )}
                {donation.foodDetails.dietary && (
                  <Detail label="Dietary" value={donation.foodDetails.dietary.replace('_', '-')} />
                )}
                {donation.foodDetails.estimatedServings && (
                  <Detail label="Estimated servings" value={String(donation.foodDetails.estimatedServings)} />
                )}
                {donation.foodDetails.allergens && <Detail label="Allergens" value={donation.foodDetails.allergens} />}
              </dl>
            </Card>
          )}

          {/* Match */}
          {match && (
            <Card>
              <CardHeader
                title="Why this was matched"
                subtitle={`${match.donorName} → ${match.receiverName}`}
                icon={<Building2 className="h-4.5 w-4.5" />}
              />
              <MatchExplanation breakdown={match} />
            </Card>
          )}

          {/* Map */}
          <Card>
            <CardHeader title="Location" icon={<MapPin className="h-4.5 w-4.5" />} />
            <MapView
              route={Boolean(receiver)}
              markers={[
                {
                  id: 'pickup',
                  ...donation.location,
                  label: donation.donorName,
                  kind: 'pickup',
                  active: true,
                },
                ...(receiver
                  ? [
                      {
                        id: 'dropoff',
                        latitude: receiver.latitude,
                        longitude: receiver.longitude,
                        label: receiver.organizationName ?? receiver.name,
                        kind: 'destination' as const,
                      },
                    ]
                  : []),
              ]}
            />
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
              <MapLegend
                items={[
                  { kind: 'pickup', label: 'Pickup' },
                  ...(receiver ? [{ kind: 'destination' as const, label: 'Destination' }] : []),
                ]}
              />
              {distance !== null && (
                <Badge tone="primary">{formatDistance(distance)} to destination</Badge>
              )}
            </div>
            <p className="mt-3 flex items-start gap-2 text-sm text-ink/60">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink/35" />
              {donation.location.address}
            </p>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Status timeline" icon={<Clock className="h-4.5 w-4.5" />} />
            <Timeline
              steps={steps}
              events={donation.timeline}
              currentStatus={donation.status}
              failed={failed}
            />
          </Card>

          <Card>
            <CardHeader title="Donor" icon={<UserIcon className="h-4.5 w-4.5" />} />
            <p className="text-sm font-bold text-ink">{donation.donorName}</p>
            <div className="mt-2">
              <VerificationBadge status={donation.donorVerification} />
            </div>
            {donation.donorPhone && (isReceiver || isDonor || user?.role === 'volunteer') && (
              <a
                href={`tel:${donation.donorPhone}`}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-700"
              >
                <Phone className="h-4 w-4" />
                {donation.donorPhone}
              </a>
            )}
          </Card>

          {donation.matchedReceiverName && (
            <Card>
              <CardHeader title="Receiver" icon={<Building2 className="h-4.5 w-4.5" />} />
              <p className="text-sm font-bold text-ink">{donation.matchedReceiverName}</p>
              {receiver && (
                <>
                  <p className="mt-1 text-sm text-ink/55">{receiver.location}</p>
                  <div className="mt-2">
                    <VerificationBadge status={receiver.verificationStatus} />
                  </div>
                </>
              )}
            </Card>
          )}

          {task && (
            <Card>
              <CardHeader title="Delivery" icon={<Truck className="h-4.5 w-4.5" />} />
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink/55">Volunteer</span>
                  <span className="font-semibold text-ink">{task.volunteerName ?? 'Not yet assigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink/55">Distance</span>
                  <span className="font-semibold text-ink">{formatDistance(task.distanceKm)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink/55">Estimated time</span>
                  <span className="font-semibold text-ink">{task.estimatedMinutes} min</span>
                </div>
              </div>
              <Link
                to={`/app/tasks/${task.id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-700"
              >
                <Bike className="h-4 w-4" />
                View delivery
              </Link>
            </Card>
          )}

          {/* Actions */}
          {(canAccept || (isDonor && !failed && donation.status !== 'completed')) && (
            <Card>
              <CardHeader title="Actions" />
              <div className="space-y-2.5">
                {canAccept && (
                  <>
                    <Button
                      fullWidth
                      loading={busy}
                      onClick={handleAccept}
                      icon={<Check className="h-4.5 w-4.5" />}
                    >
                      Accept donation
                    </Button>
                    <Button
                      fullWidth
                      variant="outline"
                      onClick={() => setConfirm('reject')}
                      icon={<X className="h-4.5 w-4.5" />}
                    >
                      Decline
                    </Button>
                  </>
                )}
                {isDonor && !failed && donation.status !== 'completed' && (
                  <Button
                    fullWidth
                    variant="ghost"
                    className="text-danger hover:bg-danger/5"
                    onClick={() => setConfirm('cancel')}
                    icon={<Trash2 className="h-4.5 w-4.5" />}
                  >
                    Cancel donation
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'cancel' ? 'Cancel this donation?' : 'Decline this match?'}
        description={
          confirm === 'cancel'
            ? 'The matched receiver will be notified and the donation will be closed.'
            : 'DONUM will search for another receiver for this donation.'
        }
        footer={
          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={confirm === 'cancel' ? handleCancel : handleReject}
            >
              {confirm === 'cancel' ? 'Cancel donation' : 'Decline match'}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-ink/60">
          {confirm === 'cancel'
            ? 'This cannot be undone. If your plans change you can always list the donation again.'
            : 'Declining helps DONUM learn — the donation will re-enter matching immediately.'}
        </p>
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold capitalize text-ink">{value}</dd>
    </div>
  );
}
