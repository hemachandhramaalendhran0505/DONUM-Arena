import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SignUpPayload, UserProfile, UserRole } from '@/types';
import {
  observeSession,
  signIn as authSignIn,
  signInWithGoogle as authGoogle,
  signOut as authSignOut,
  signUp as authSignUp,
  updateUserProfile,
} from '@/services/authService';
import { ensureSeeded } from '@/services/db';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signUp: (payload: SignUpPayload) => Promise<UserProfile>;
  signInWithGoogle: (role?: UserRole) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureSeeded();
    const unsubscribe = observeSession((profile) => {
      setUser(profile);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) return;
      await updateUserProfile(user.id, patch);
      setUser((prev) => (prev ? { ...prev, ...patch, updatedAt: Date.now() } : prev));
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: authSignIn,
      signUp: authSignUp,
      signInWithGoogle: authGoogle,
      signOut: async () => {
        await authSignOut();
        setUser(null);
      },
      updateProfile,
    }),
    [user, loading, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
