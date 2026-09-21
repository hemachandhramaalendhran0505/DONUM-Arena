import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AuthError } from '@/features/auth/authService';
import { DEMO_ACCOUNTS } from '@/services/seed';
import { isFirebaseConfigured } from '@/firebase/config';
import { AuthAside } from './AuthAside';

export function SignInPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const profile = await signIn(email, password);
      toast(`Welcome back, ${profile.name.split(' ')[0]}.`);
      navigate(profile.onboardingComplete ? '/app' : '/onboarding/profile');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickSignIn = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('donum123');
    setError('');
    setLoading(true);
    try {
      const profile = await signIn(demoEmail, 'donum123');
      toast(`Signed in as ${profile.name}.`);
      navigate('/app');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError('');
    try {
      const profile = await signInWithGoogle();
      navigate(profile.onboardingComplete ? '/app' : '/onboarding/profile');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Google sign-in failed.');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Logo className="mb-10" />

          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-ink/55">
            Sign in to manage your donations, matches and deliveries.
          </p>

          {!isFirebaseConfigured && (
            <div className="mt-6 rounded-2xl border border-primary/15 bg-primary-50/60 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Try a demo account
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => void quickSignIn(account.email)}
                    disabled={loading}
                    className="rounded-xl border border-primary/15 bg-white px-3 py-2.5 text-left transition hover:border-primary/40 hover:shadow-soft disabled:opacity-60 focus-ring"
                  >
                    <span className="block text-sm font-bold text-ink">{account.role}</span>
                    <span className="block truncate text-[11px] text-ink/50">{account.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p role="alert" className="rounded-xl bg-danger/8 px-3.5 py-2.5 text-sm font-medium text-danger">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth size="lg" loading={loading} iconRight={<ArrowRight className="h-4.5 w-4.5" />}>
              Sign in
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-ink/8" />
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/35">or</span>
            <span className="h-px flex-1 bg-ink/8" />
          </div>

          <Button variant="outline" fullWidth size="lg" onClick={google} icon={<GoogleIcon />}>
            Continue with Google
          </Button>

          <p className="mt-8 text-center text-sm text-ink/55">
            New to DONUM?{' '}
            <Link to="/onboarding" className="font-bold text-primary hover:text-primary-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <AuthAside />
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v3h3.86c2.26-2.09 3.59-5.17 3.59-8.88Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
