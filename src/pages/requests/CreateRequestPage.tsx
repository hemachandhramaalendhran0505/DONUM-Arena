import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, HandHeart, Info, MapPin, Navigation, Siren, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChoiceGroup, Input, Select, Textarea } from '@/components/ui/Field';
import { Card, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createRequest } from '@/services/requestService';
import { CATEGORY_EMOJI, CATEGORY_LABEL, UNITS_BY_CATEGORY, URGENCY_LABEL } from '@/utils/labels';
import type { DonationCategory, Urgency } from '@/types';
import { toDateInput } from '@/utils/format';
import { MapView } from '@/components/map/MapView';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as DonationCategory[];
const URGENCIES = Object.keys(URGENCY_LABEL) as Urgency[];
const DAY = 864e5;

const URGENCY_HINT: Record<Urgency, string> = {
  low: 'Needed eventually — flexible timing.',
  medium: 'Needed this week.',
  high: 'Needed within a day or two.',
  critical: 'Needed today. Prioritised above everything else.',
};

export function CreateRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const geo = useGeolocation();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DonationCategory>('food_items');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('meals');
  const [urgency, setUrgency] = useState<Urgency>('high');
  const [requiredBy, setRequiredBy] = useState(toDateInput(Date.now() + 2 * DAY));
  const [address, setAddress] = useState(user?.location ?? '');
  const [coords, setCoords] = useState({
    latitude: user?.latitude || 12.9716,
    longitude: user?.longitude || 77.5946,
  });
  const [description, setDescription] = useState('');
  const [beneficiaryCount, setBeneficiaryCount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onCategoryChange = (next: DonationCategory) => {
    setCategory(next);
    setUnit(UNITS_BY_CATEGORY[next][0]);
  };

  const useMyLocation = async () => {
    const position = await geo.request();
    setCoords(position);
    if (!address) setAddress(user?.location || 'Current location');
    toast('Location captured.');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Give your request a clear title.';
    if (!quantity || Number(quantity) <= 0) next.quantity = 'How much do you need?';
    if (!address.trim()) next.address = 'Where should this be delivered?';
    if (!description.trim()) next.description = 'Explain the need — it helps donors decide.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const request = await createRequest(user, {
        title: title.trim(),
        category,
        quantity: Number(quantity),
        unit,
        urgency,
        requiredBy: new Date(requiredBy).getTime(),
        location: { ...coords, address: address.trim(), city: address.split(',').pop()?.trim() },
        description: description.trim(),
        beneficiaryCount: Number(beneficiaryCount) || Number(quantity),
      });
      toast('Request created. DONUM is searching for matching donations.');
      navigate(`/app/requests/${request.id}`);
    } catch (error) {
      console.error(error);
      toast('Could not create your request. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Create a resource request</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          Tell DONUM what you need. Matching donations will be routed to you automatically.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader title="What do you need?" icon={<HandHeart className="h-4.5 w-4.5" />} />
            <div className="space-y-4">
              <Input
                label="Request title"
                required
                placeholder="Hot dinner for night shelter — 150 people"
                value={title}
                error={errors.title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <ChoiceGroup
                label="Resource category"
                required
                value={category}
                onChange={onCategoryChange}
                columns={3}
                options={CATEGORIES.map((c) => ({
                  value: c,
                  label: CATEGORY_LABEL[c],
                  icon: <span>{CATEGORY_EMOJI[c]}</span>,
                }))}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Required quantity"
                  type="number"
                  min={1}
                  required
                  placeholder="150"
                  value={quantity}
                  error={errors.quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <Select
                  label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  options={UNITS_BY_CATEGORY[category].map((u) => ({ value: u, label: u }))}
                />
                <Input
                  label="Beneficiary count"
                  type="number"
                  min={1}
                  placeholder="150"
                  icon={<Users className="h-4 w-4" />}
                  value={beneficiaryCount}
                  onChange={(e) => setBeneficiaryCount(e.target.value)}
                />
              </div>

              <Textarea
                label="Description"
                required
                placeholder="Our regular supplier cancelled. We need hot vegetarian dinner for 150 residents tonight."
                value={description}
                error={errors.description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Urgency & timing" icon={<Siren className="h-4.5 w-4.5" />} />
            <div className="space-y-4">
              <ChoiceGroup
                label="Urgency"
                required
                value={urgency}
                onChange={setUrgency}
                columns={4}
                hint={URGENCY_HINT[urgency]}
                options={URGENCIES.map((u) => ({ value: u, label: URGENCY_LABEL[u] }))}
              />
              <Input
                label="Required by"
                type="date"
                required
                value={requiredBy}
                onChange={(e) => setRequiredBy(e.target.value)}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Delivery location"
              icon={<MapPin className="h-4.5 w-4.5" />}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={useMyLocation}
                  loading={geo.loading}
                  icon={<Navigation className="h-4 w-4" />}
                >
                  Use my location
                </Button>
              }
            />
            <div className="space-y-4">
              <Input
                label="Address"
                required
                placeholder="Anna Seva Night Shelter, Shivajinagar, Bengaluru"
                value={address}
                error={errors.address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <MapView
                height="h-52"
                markers={[{ id: 'dropoff', ...coords, label: address || 'Delivery point', kind: 'request', active: true }]}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <Card className="border-primary/15 bg-primary-50/40">
            <div className="flex gap-3">
              <Info className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-bold text-ink">How matching works</p>
                <p className="mt-2 leading-relaxed text-ink/60">
                  DONUM scores every open donation against your request on distance, urgency, category fit,
                  quantity coverage and expiry — then notifies you the moment something suitable is listed.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-2.5">
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              icon={<CheckCircle2 className="h-4.5 w-4.5" />}
            >
              Create request
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={() => navigate('/app')}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
