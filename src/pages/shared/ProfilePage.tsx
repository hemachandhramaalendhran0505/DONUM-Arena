import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Database,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Badge, VerificationBadge } from '@/components/ui/Badge';
import { useGeolocation } from '@/hooks/useGeolocation';
import { enablePush, pushSupported } from '@/firebase/messaging';
import { resetDemoData } from '@/services/db';
import { isFirebaseConfigured, backendMode } from '@/firebase/config';
import { ROLE_LABEL, VEHICLE_LABEL } from '@/utils/labels';
import { formatDate, initials } from '@/utils/format';

export function ProfilePage() {
  const { user, updateProfile, signOut } = useAuth();
  const { toast } = useToast();
  const geo = useGeolocation();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [organizationName, setOrganizationName] = useState(user?.organizationName ?? '');
  const [registrationNumber, setRegistrationNumber] = useState(user?.registrationNumber ?? '');
  const [fssaiLicense, setFssaiLicense] = useState(user?.fssaiLicense ?? '');
  const [vehicleType, setVehicleType] = useState(user?.vehicleType ?? 'two_wheeler');
  const [availability, setAvailability] = useState(user?.availability ?? '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name,
        phone,
        location,
        bio,
        ...(user.role === 'ngo' && { organizationName, registrationNumber, fssaiLicense }),
        ...(user.role === 'volunteer' && { vehicleType: vehicleType as never, availability }),
      });
      toast('Profile updated.');
    } finally {
      setSaving(false);
    }
  };

  const updateLocation = async () => {
    const position = await geo.request();
    await updateProfile({ ...position, locationPermission: true });
    toast('Location updated.');
  };

  const turnOnPush = async () => {
    const result = await enablePush();
    if (result.permission === 'granted') {
      if (result.token) await updateProfile({ updatedAt: Date.now() });
      toast('Notifications enabled.');
    } else if (result.permission === 'denied') {
      toast('Notification permission was declined in your browser.', 'error');
    } else {
      toast('Push notifications are not available in this browser.', 'info');
    }
  };

  const reset = () => {
    resetDemoData();
    toast('Demo data restored.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Profile & settings</h1>
        <p className="mt-1.5 text-sm text-ink/55">Manage your details, verification and notifications.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <form onSubmit={save} className="space-y-5">
          <Card>
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-extrabold text-white">
                {initials(user.name)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-ink">{user.name}</h2>
                <p className="truncate text-sm text-ink/55">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{ROLE_LABEL[user.role]}</Badge>
                  <VerificationBadge status={user.verificationStatus} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Personal details" icon={<UserIcon className="h-4.5 w-4.5" />} />
            <div className="space-y-4">
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                label="Phone"
                type="tel"
                icon={<Phone className="h-4 w-4" />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Address / area"
                icon={<MapPin className="h-4 w-4" />}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </Card>

          {user.role === 'ngo' && (
            <Card>
              <CardHeader
                title="Organisation & verification"
                subtitle="Verification unlocks food donations and builds donor trust."
                icon={<Building2 className="h-4.5 w-4.5" />}
              />
              <div className="space-y-4">
                <Input
                  label="Organisation name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                />
                <Input
                  label="Registration number"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                />
                <Input
                  label="FSSAI licence"
                  hint="Required to receive cooked food donations."
                  value={fssaiLicense}
                  onChange={(e) => setFssaiLicense(e.target.value)}
                />
              </div>
            </Card>
          )}

          {user.role === 'volunteer' && (
            <Card>
              <CardHeader title="Volunteer details" icon={<Navigation className="h-4.5 w-4.5" />} />
              <div className="space-y-4">
                <Select
                  label="Vehicle"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as typeof vehicleType)}
                  options={Object.entries(VEHICLE_LABEL).map(([value, label]) => ({ value, label }))}
                />
                <Input
                  label="Availability"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                />
              </div>
            </Card>
          )}

          <Button type="submit" size="lg" loading={saving} icon={<Save className="h-4.5 w-4.5" />}>
            Save changes
          </Button>
        </form>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Location" icon={<MapPin className="h-4.5 w-4.5" />} />
            <p className="text-sm leading-relaxed text-ink/60">
              Your location helps DONUM find nearby resources and optimise pickups.
            </p>
            <p className="mt-3 text-xs font-medium text-ink/45">
              {user.latitude
                ? `Saved: ${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`
                : 'No coordinates saved yet.'}
            </p>
            <Button
              variant="outline"
              fullWidth
              className="mt-3.5"
              loading={geo.loading}
              onClick={updateLocation}
              icon={<Navigation className="h-4 w-4" />}
            >
              Update my location
            </Button>
            {geo.error && <p className="mt-2 text-xs text-warning">{geo.error}</p>}
          </Card>

          <Card>
            <CardHeader title="Notifications" icon={<Bell className="h-4.5 w-4.5" />} />
            <p className="text-sm leading-relaxed text-ink/60">
              Get alerted about matches, scheduled pickups and completed deliveries.
            </p>
            <Button
              variant="outline"
              fullWidth
              className="mt-3.5"
              onClick={turnOnPush}
              disabled={!pushSupported()}
              icon={<Bell className="h-4 w-4" />}
            >
              {pushSupported() ? 'Enable push notifications' : 'Not supported in this browser'}
            </Button>
          </Card>

          <Card>
            <CardHeader title="Verification" icon={<ShieldCheck className="h-4.5 w-4.5" />} />
            <VerificationBadge status={user.verificationStatus} />
            <p className="mt-3 text-sm leading-relaxed text-ink/60">
              {user.verificationStatus === 'verified'
                ? 'Your account is verified. Donors and organisations can see this badge.'
                : user.verificationStatus === 'pending'
                  ? 'Your documents are under review. This usually takes up to 48 hours.'
                  : user.verificationStatus === 'rejected'
                    ? 'Verification was not approved. Update your details and resubmit.'
                    : 'Verification is optional for your role, but it increases trust.'}
            </p>
            <p className="mt-3 text-xs text-ink/40">Member since {formatDate(user.createdAt)}</p>
          </Card>

          <Card>
            <CardHeader title="Data & backend" icon={<Database className="h-4.5 w-4.5" />} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/55">Mode</span>
              <Badge tone={isFirebaseConfigured ? 'success' : 'primary'}>
                {backendMode === 'firebase' ? 'Firebase' : 'Local realtime'}
              </Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink/50">
              {isFirebaseConfigured
                ? 'Connected to your Firebase project — Auth, Firestore, Storage and Cloud Messaging.'
                : 'Running on DONUM’s offline-first store. Add Firebase keys to .env to switch automatically.'}
            </p>
            {!isFirebaseConfigured && (
              <Button
                variant="outline"
                fullWidth
                className="mt-3.5"
                onClick={reset}
                icon={<RotateCcw className="h-4 w-4" />}
              >
                Restore demo data
              </Button>
            )}
          </Card>

          <Button
            variant="ghost"
            fullWidth
            className="text-danger hover:bg-danger/5"
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
            icon={<LogOut className="h-4.5 w-4.5" />}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
