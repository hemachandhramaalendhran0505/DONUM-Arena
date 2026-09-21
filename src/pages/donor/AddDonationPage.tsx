/**
 * Add Donation — complete form with dynamic, category-aware fields.
 * Food donations reveal prep date, storage, dietary type and servings.
 */
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChoiceGroup, Input, Select, Textarea, Toggle } from '@/components/ui/Field';
import { Card, CardHeader } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createDonation } from '@/services/donationService';
import { previewMatchesForDonation } from '@/services/matchService';
import { uploadImages } from '@/firebase/storage';
import type { Donation, DonationCategory, DonationCondition, FoodDetails } from '@/types';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CONDITION_LABEL,
  UNITS_BY_CATEGORY,
} from '@/utils/labels';
import { toDateInput, toDateTimeInput } from '@/utils/format';
import { MatchExplanation } from '@/features/matching/MatchExplanation';
import type { RankedMatch } from '@/features/matching/engine';
import { MapView } from '@/components/map/MapView';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as DonationCategory[];
const HOUR = 36e5;

export function AddDonationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const geo = useGeolocation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DonationCategory>('food_items');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('meals');
  const [condition, setCondition] = useState<DonationCondition>('cooked');
  const [expiryDate, setExpiryDate] = useState(toDateTimeInput(Date.now() + 12 * HOUR));
  const [pickupDate, setPickupDate] = useState(toDateInput(Date.now() + 2 * HOUR));
  const [pickupTime, setPickupTime] = useState('18:00 – 20:00');
  const [address, setAddress] = useState(user?.location ?? '');
  const [coords, setCoords] = useState({
    latitude: user?.latitude || 12.9716,
    longitude: user?.longitude || 77.5946,
  });
  const [instructions, setInstructions] = useState('');
  const [needsVolunteer, setNeedsVolunteer] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Food-specific
  const [foodType, setFoodType] = useState<NonNullable<FoodDetails['foodType']>>('cooked');
  const [preparationDate, setPreparationDate] = useState(toDateTimeInput(Date.now() - 2 * HOUR));
  const [storage, setStorage] = useState<NonNullable<FoodDetails['storageRequirement']>>('hot');
  const [dietary, setDietary] = useState<NonNullable<FoodDetails['dietary']>>('vegetarian');
  const [servings, setServings] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<RankedMatch[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isFood = category === 'food_items';
  const units = useMemo(() => UNITS_BY_CATEGORY[category], [category]);

  const onCategoryChange = (next: DonationCategory) => {
    setCategory(next);
    setUnit(UNITS_BY_CATEGORY[next][0]);
    setCondition(next === 'food_items' ? 'cooked' : 'good');
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).slice(0, 5 - files.length);
    setFiles((prev) => [...prev, ...next]);
    setPreviews((prev) => [...prev, ...next.map((f) => URL.createObjectURL(f))]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const useMyLocation = async () => {
    const position = await geo.request();
    setCoords(position);
    if (!address) setAddress(user?.location || 'Current location');
    toast('Location captured.');
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Give your donation a clear title.';
    if (!quantity || Number(quantity) <= 0) next.quantity = 'Enter how much you are donating.';
    if (!address.trim()) next.address = 'Where should this be collected from?';
    if (!description.trim()) next.description = 'A short description helps receivers decide.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildDraft = (): Omit<Donation, 'id' | 'donorId' | 'donorName' | 'donorVerification' | 'status' | 'timeline' | 'createdAt' | 'updatedAt'> => ({
    title: title.trim(),
    category,
    description: description.trim(),
    quantity: Number(quantity),
    unit,
    condition,
    expiryDate: expiryDate ? new Date(expiryDate).getTime() : undefined,
    pickupDate: new Date(pickupDate).getTime(),
    pickupTime,
    location: { ...coords, address: address.trim(), city: address.split(',').pop()?.trim() },
    images: [],
    specialInstructions: instructions.trim() || undefined,
    needsVolunteer,
    foodDetails: isFood
      ? {
          foodType,
          preparationDate: preparationDate ? new Date(preparationDate).getTime() : undefined,
          storageRequirement: storage,
          dietary,
          estimatedServings: servings ? Number(servings) : Number(quantity),
        }
      : undefined,
  });

  const runPreview = async () => {
    if (!validate() || !user) return;
    const draft = {
      ...buildDraft(),
      id: 'preview',
      donorId: user.id,
      donorName: user.name,
      donorVerification: user.verificationStatus,
      status: 'created' as const,
      timeline: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const results = await previewMatchesForDonation(draft);
    setPreview(results);
    if (!results.length) toast('No open requests match this yet — it will stay listed for new requests.', 'info');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !validate()) return;

    setSubmitting(true);
    try {
      const images = files.length ? await uploadImages(files, `donations/${user.id}`) : [];
      const donation = await createDonation(user, { ...buildDraft(), images });
      toast('Donation listed. DONUM is finding the best match now.');
      navigate(`/app/donations/${donation.id}`);
    } catch (error) {
      console.error(error);
      toast('Could not list your donation. Please try again.', 'error');
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
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Add a donation</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          The more detail you give, the better DONUM can match your surplus to a real need.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          {/* Basics */}
          <Card>
            <CardHeader title="What are you donating?" icon={<Sparkles className="h-4.5 w-4.5" />} />
            <div className="space-y-4">
              <Input
                label="Donation title"
                required
                placeholder="Surplus wedding catering — rice, dal & curry"
                value={title}
                error={errors.title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <ChoiceGroup
                label="Category"
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

              <Textarea
                label="Description"
                required
                placeholder="Describe the items, how they were stored and anything a receiver should know."
                value={description}
                error={errors.description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Quantity"
                  type="number"
                  min={1}
                  required
                  placeholder="120"
                  value={quantity}
                  error={errors.quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <Select
                  label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  options={units.map((u) => ({ value: u, label: u }))}
                />
                <Select
                  label="Condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as DonationCondition)}
                  options={Object.entries(CONDITION_LABEL).map(([value, label]) => ({ value, label }))}
                />
              </div>
            </div>
          </Card>

          {/* Food details */}
          {isFood && (
            <Card className="animate-fade-up border-warning/20 bg-warning/[0.03]">
              <CardHeader
                title="Food safety details"
                subtitle="Required for food donations so receivers can accept quickly and safely."
                icon={<Utensils className="h-4.5 w-4.5" />}
              />
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Food type"
                    value={foodType}
                    onChange={(e) => setFoodType(e.target.value as typeof foodType)}
                    options={[
                      { value: 'cooked', label: 'Cooked / prepared' },
                      { value: 'raw', label: 'Raw ingredients' },
                      { value: 'packaged', label: 'Packaged' },
                      { value: 'bakery', label: 'Bakery' },
                      { value: 'dairy', label: 'Dairy' },
                      { value: 'beverage', label: 'Beverage' },
                    ]}
                  />
                  <Select
                    label="Storage requirement"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value as typeof storage)}
                    options={[
                      { value: 'hot', label: 'Keep hot' },
                      { value: 'ambient', label: 'Room temperature' },
                      { value: 'refrigerated', label: 'Refrigerated' },
                      { value: 'frozen', label: 'Frozen' },
                    ]}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Preparation date & time"
                    type="datetime-local"
                    value={preparationDate}
                    onChange={(e) => setPreparationDate(e.target.value)}
                  />
                  <Input
                    label="Estimated servings"
                    type="number"
                    min={1}
                    placeholder="120"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>

                <ChoiceGroup
                  label="Dietary"
                  value={dietary}
                  onChange={setDietary}
                  columns={4}
                  options={[
                    { value: 'vegetarian', label: 'Vegetarian' },
                    { value: 'non_vegetarian', label: 'Non-vegetarian' },
                    { value: 'vegan', label: 'Vegan' },
                    { value: 'mixed', label: 'Mixed' },
                  ]}
                />
              </div>
            </Card>
          )}

          {/* Timing */}
          <Card>
            <CardHeader title="Timing" icon={<Clock className="h-4.5 w-4.5" />} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label={isFood ? 'Best before' : 'Expiry date'}
                type="datetime-local"
                value={expiryDate}
                hint={isFood ? 'Drives priority in matching.' : 'Leave blank if not applicable.'}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <Input
                label="Pickup date"
                type="date"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
              <Input
                label="Pickup time window"
                placeholder="18:00 – 20:00"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              />
            </div>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader
              title="Pickup location"
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
                placeholder="Spice Route Kitchen, 100 Feet Road, Indiranagar, Bengaluru"
                value={address}
                error={errors.address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <MapView
                height="h-52"
                markers={[
                  {
                    id: 'pickup',
                    ...coords,
                    label: address || 'Pickup point',
                    kind: 'pickup',
                    active: true,
                  },
                ]}
              />
              <Textarea
                label="Special instructions"
                placeholder="Use the service entrance at the rear. Ask for Aarav at the kitchen desk."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
              <Toggle
                checked={needsVolunteer}
                onChange={setNeedsVolunteer}
                label="I need a volunteer to collect this"
                description="Turn off if the receiving organisation will arrange their own pickup."
              />
            </div>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader
              title="Photos"
              subtitle="Up to 5 images. Clear photos get accepted faster."
              icon={<Camera className="h-4.5 w-4.5" />}
            />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {previews.map((src, i) => (
                <div key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-ink/5">
                  <img src={src} alt={`Donation ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label="Remove image"
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-ink/70 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid aspect-square place-items-center gap-1 rounded-xl border-2 border-dashed border-ink/12 text-ink/40 transition hover:border-primary/40 hover:bg-primary-50/40 hover:text-primary focus-ring"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[11px] font-semibold">Add</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 lg:sticky lg:top-24">
          <Card>
            <CardHeader title="Preview matches" icon={<Sparkles className="h-4.5 w-4.5" />} />
            <p className="text-sm leading-relaxed text-ink/55">
              See who DONUM would route this to before you publish — scored on distance, urgency, category,
              quantity and expiry.
            </p>
            <Button type="button" variant="outline" fullWidth className="mt-4" onClick={runPreview}>
              Find likely matches
            </Button>

            {preview && (
              <div className="mt-4 space-y-3 animate-fade-in">
                {preview.length === 0 ? (
                  <p className="rounded-xl bg-ink/4 px-3.5 py-3 text-xs leading-relaxed text-ink/55">
                    No open requests match this yet. Your donation will stay listed and be matched as soon as a
                    suitable request arrives.
                  </p>
                ) : (
                  preview.slice(0, 2).map((match) => (
                    <div key={match.request.id} className="rounded-xl border border-ink/5 bg-surface/60 p-3.5">
                      <p className="text-sm font-bold text-ink">{match.request.requestorName}</p>
                      <p className="mt-0.5 text-xs text-ink/55">{match.request.title}</p>
                      <MatchExplanation breakdown={match} compact className="mt-3" />
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>

          <Card className="border-primary/15 bg-primary-50/40">
            <div className="flex gap-3">
              <Info className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-bold text-ink">What happens next</p>
                <ol className="mt-2 space-y-1.5 text-ink/60">
                  <li>1. DONUM scores every open request.</li>
                  <li>2. The best receiver is notified instantly.</li>
                  <li>3. A volunteer is assigned if you need pickup.</li>
                  <li>4. You track every step on a live timeline.</li>
                </ol>
              </div>
            </div>
          </Card>

          <div className="space-y-2.5">
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
            >
              List donation
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
