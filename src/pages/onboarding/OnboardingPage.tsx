/**
 * DONUM onboarding — 5 screens:
 *  1 Welcome · 2 Choose role · 3 Create account · 4 Complete profile · 5 Location
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Building2,
  CheckCircle2,
  HandHeart,
  Heart,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AuthError } from '@/features/auth/authService';
import { useGeolocation } from '@/hooks/useGeolocation';
import { enablePush } from '@/firebase/messaging';
import type { UserRole } from '@/types';
import { VEHICLE_LABEL } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { GoogleIcon } from '../auth/SignInPage';

const ROLES: Array<{
  value: UserRole;
  title: string;
  body: string;
  icon: typeof Heart;
}> = [
  { value: 'donor', title: 'I want to Donate', body: 'Share surplus food, clothes, groceries or essentials.', icon: Heart },
  { value: 'ngo', title: 'I represent an NGO', body: 'Receive matched donations for the people you serve.', icon: HandHeart },
  { value: 'volunteer', title: 'I want to Volunteer', body: 'Pick up donations and deliver them where needed.', icon: Bike },
  { value: 'requestor', title: 'I need Resources', body: 'Request what you or your community needs.', icon: Users },
];

type Step = 1 | 2 | 3 | 4 | 5;

export function OnboardingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, signUp, signInWithGoogle, updateProfile } = useAuth();
  const { toast } = useToast();
  const geo = useGeolocation();

  const roleParam = params.get('role') as UserRole | null;
  const startStep: Step = user ? 4 : roleParam ? 3 : 1;

  const [step, setStep] = useState<Step>(startStep);
  const [role, setRole] = useState<UserRole>(roleParam ?? 'donor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // profile
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [fssaiLicense, setFssaiLicense] = useState('');
  const [vehicleType, setVehicleType] = useState('two_wheeler');
  const [availability, setAvailability] = useState('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [householdSize, setHouseholdSize] = useState('');
  const [bio, setBio] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      if (user.onboardingComplete) navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  const progress = useMemo(() => (step / 5) * 100, [step]);

  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp({ name, email, password, role, phone });
      toast('Account created. Let’s finish your profile.');
      setStep(4);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError('');
    try {
      await signInWithGoogle(role);
      setStep(4);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Google sign-in failed.');
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await updateProfile({
        phone,
        location: address,
        city: address.split(',').pop()?.trim(),
        bio,
        ...(role === 'ngo' && { organizationName, registrationNumber, fssaiLicense }),
        ...(role === 'volunteer' && {
          vehicleType: vehicleType as never,
          availability,
          idProofNumber,
        }),
        ...(role === 'requestor' && { householdSize: Number(householdSize) || undefined }),
      });
      setStep(5);
    } catch {
      setError('Could not save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const finish = async (withLocation: boolean) => {
    setLoading(true);
    let position = coords;
    if (withLocation && !position) {
      position = await geo.request();
      setCoords(position);
    }
    // Request push alongside location, and persist the device token so the
    // backend can actually reach this device later.
    let fcmTokens: string[] | undefined;
    if (withLocation) {
      const push = await enablePush();
      if (push.token) fcmTokens = [push.token];
    }

    await updateProfile({
      latitude: position?.latitude ?? 0,
      longitude: position?.longitude ?? 0,
      locationPermission: withLocation,
      onboardingComplete: true,
      ...(fcmTokens && { fcmTokens }),
    });
    setLoading(false);
    toast('You’re all set. Welcome to DONUM.');
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <header className="donum-section flex items-center justify-between py-5">
        <Logo />
        <Link to="/signin" className="text-sm font-semibold text-ink/55 transition hover:text-primary">
          Already have an account?
        </Link>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pb-16">
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink/45">
            <span>Step {step} of 5</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-danger/8 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        {step === 1 && <Welcome onNext={() => setStep(2)} />}

        {step === 2 && (
          <section className="animate-fade-up">
            <StepHeading
              title="Choose your role"
              subtitle="This shapes your dashboard, your matches and the notifications you receive."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLES.map((option) => {
                const active = option.value === role;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    aria-pressed={active}
                    className={cn(
                      'group rounded-2xl border p-5 text-left transition-all duration-200 focus-ring',
                      active
                        ? 'border-primary bg-white shadow-glow'
                        : 'border-ink/8 bg-white/70 hover:border-primary/35 hover:bg-white hover:shadow-soft',
                    )}
                  >
                    <span className="flex items-start justify-between">
                      <span
                        className={cn(
                          'grid h-11 w-11 place-items-center rounded-xl transition',
                          active ? 'bg-primary text-white' : 'bg-primary-50 text-primary',
                        )}
                      >
                        <option.icon className="h-5 w-5" />
                      </span>
                      {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </span>
                    <span className="mt-4 block text-base font-bold text-ink">{option.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink/55">{option.body}</span>
                  </button>
                );
              })}
            </div>
            <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </section>
        )}

        {step === 3 && (
          <section className="animate-fade-up">
            <StepHeading
              title="Create your account"
              subtitle={`Signing up as ${ROLES.find((r) => r.value === role)?.title.replace('I ', '').replace('want to ', '') ?? role}.`}
            />
            <form onSubmit={createAccount} className="space-y-4 rounded-2xl border border-ink/5 bg-white p-6 shadow-soft">
              <Input
                label="Full name"
                name="name"
                required
                placeholder="Aarav Mehta"
                icon={<UserIcon className="h-4 w-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                placeholder="+91 98450 11223"
                icon={<Phone className="h-4 w-4" />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                icon={<Lock className="h-4 w-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button type="submit" fullWidth size="lg" loading={loading} iconRight={<ArrowRight className="h-4.5 w-4.5" />}>
                Create account
              </Button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-ink/8" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ink/35">or</span>
                <span className="h-px flex-1 bg-ink/8" />
              </div>

              <Button type="button" variant="outline" fullWidth onClick={google} icon={<GoogleIcon />}>
                Continue with Google
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 transition hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Change role
            </button>
          </section>
        )}

        {step === 4 && (
          <section className="animate-fade-up">
            <StepHeading
              title="Complete your profile"
              subtitle="A few details so DONUM can match you accurately and people know who they're working with."
            />
            <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-ink/5 bg-white p-6 shadow-soft">
              {role === 'ngo' && (
                <>
                  <Input
                    label="Organisation name"
                    required
                    placeholder="Anna Seva Foundation"
                    icon={<Building2 className="h-4 w-4" />}
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                  <Input
                    label="Registration number"
                    required
                    placeholder="KA/2019/0098765"
                    hint="Used to verify your organisation. Verification is usually reviewed within 48 hours."
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                  <Input
                    label="FSSAI licence (for food handling)"
                    placeholder="11223344556677"
                    hint="Optional, but required before you can receive cooked food donations."
                    value={fssaiLicense}
                    onChange={(e) => setFssaiLicense(e.target.value)}
                  />
                </>
              )}

              {role === 'volunteer' && (
                <>
                  <Select
                    label="How will you travel?"
                    required
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    options={Object.entries(VEHICLE_LABEL).map(([value, label]) => ({ value, label }))}
                  />
                  <Input
                    label="Availability"
                    placeholder="Weekday evenings, 6pm – 10pm"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                  />
                  <Input
                    label="ID proof number"
                    placeholder="Driving licence or government ID"
                    hint="Volunteers are identity-checked before accepting their first pickup."
                    value={idProofNumber}
                    onChange={(e) => setIdProofNumber(e.target.value)}
                  />
                </>
              )}

              {role === 'requestor' && (
                <Input
                  label="How many people do you represent?"
                  type="number"
                  min={1}
                  placeholder="34"
                  hint="Households, family members or community members you're requesting for."
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(e.target.value)}
                />
              )}

              <Input
                label="Phone"
                type="tel"
                required
                placeholder="+91 98450 11223"
                icon={<Phone className="h-4 w-4" />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Address / area"
                required
                placeholder="100 Feet Road, Indiranagar, Bengaluru"
                icon={<MapPin className="h-4 w-4" />}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Textarea
                label="Short bio"
                placeholder="Tell others what you do — it builds trust."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />

              <Button type="submit" fullWidth size="lg" loading={loading} iconRight={<ArrowRight className="h-4.5 w-4.5" />}>
                Continue
              </Button>
            </form>
          </section>
        )}

        {step === 5 && (
          <section className="animate-fade-up">
            <StepHeading
              title="Enable location"
              subtitle="Your location helps DONUM find nearby resources and optimise pickups."
            />

            <div className="rounded-2xl border border-ink/5 bg-white p-6 text-center shadow-soft sm:p-8">
              <div className="relative mx-auto grid h-24 w-24 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/15" />
                <span className="absolute inset-3 rounded-full bg-primary/10" />
                <span className="relative grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-lift">
                  <Navigation className="h-6 w-6" />
                </span>
              </div>

              <h3 className="mt-6 text-lg font-bold text-ink">Why DONUM needs your location</h3>
              <ul className="mx-auto mt-4 max-w-sm space-y-2.5 text-left">
                {[
                  'Find donations and requests closest to you',
                  'Give volunteers accurate distances and routes',
                  'Prioritise urgent, nearby needs in matching',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink/60">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>

              {geo.error && <p className="mt-4 text-xs font-medium text-warning">{geo.error}</p>}
              {coords && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Location captured
                </p>
              )}

              <div className="mt-7 space-y-2.5">
                <Button
                  fullWidth
                  size="lg"
                  loading={loading || geo.loading}
                  onClick={() => void finish(true)}
                  icon={geo.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4.5 w-4.5" />}
                >
                  Allow location access
                </Button>
                <Button variant="ghost" fullWidth onClick={() => void finish(false)} disabled={loading}>
                  Skip for now
                </Button>
              </div>

              <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink/40">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your exact location is never shown publicly — only approximate distance.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <section className="animate-fade-up text-center">
      <div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-3xl bg-primary text-white shadow-glow">
        <Sparkles className="h-9 w-9" />
      </div>
      <h1 className="text-balance text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Welcome to DONUM
      </h1>
      <p className="mx-auto mt-4 max-w-md text-balance text-base leading-relaxed text-ink/55">
        DONUM connects surplus to scarcity. In a few short steps we'll set up your account so you can start
        turning surplus into impact.
      </p>

      <div className="mx-auto mt-10 grid max-w-md gap-3 text-left">
        {[
          { icon: Heart, title: 'Give or receive', body: 'Food, clothes, groceries, essentials and more.' },
          { icon: Sparkles, title: 'Matched intelligently', body: 'Distance, urgency, category, quantity and expiry.' },
          { icon: ShieldCheck, title: 'Verified and tracked', body: 'Know exactly where every donation goes.' },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3.5 rounded-2xl border border-ink/5 bg-white p-4 shadow-soft">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
              <item.icon className="h-4.5 w-4.5" />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">{item.title}</span>
              <span className="mt-0.5 block text-sm text-ink/55">{item.body}</span>
            </span>
          </div>
        ))}
      </div>

      <Button size="lg" className="mt-9" onClick={onNext} iconRight={<ArrowRight className="h-5 w-5" />}>
        Get started
      </Button>
    </section>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink/55">{subtitle}</p>
    </div>
  );
}

function StepNav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" />}>
        Back
      </Button>
      <Button onClick={onNext} size="lg" iconRight={<ArrowRight className="h-4.5 w-4.5" />}>
        Continue
      </Button>
    </div>
  );
}
