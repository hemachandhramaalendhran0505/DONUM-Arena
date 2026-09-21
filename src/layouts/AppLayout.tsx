/**
 * Authenticated shell: role-aware sidebar (desktop), bottom tab bar (mobile),
 * top bar with notifications and profile.
 */
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bike,
  ClipboardList,
  Compass,
  HandHeart,
  Heart,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PackagePlus,
  Route,
  Settings,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/common/Logo';
import { NotificationBell } from '@/components/common/NotificationBell';
import { cn } from '@/utils/cn';
import { initials } from '@/utils/format';
import { ROLE_LABEL } from '@/utils/labels';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  donor: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/donations/new', label: 'Add Donation', icon: PackagePlus },
    { to: '/app/donations', label: 'My Donations', icon: ClipboardList },
    { to: '/app/impact', label: 'Impact', icon: BarChart3 },
  ],
  ngo: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/browse', label: 'Browse Donations', icon: Compass },
    { to: '/app/requests', label: 'Requests', icon: ListChecks },
    { to: '/app/impact', label: 'Impact', icon: BarChart3 },
  ],
  volunteer: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/tasks', label: 'Tasks', icon: Route },
    { to: '/app/tasks/history', label: 'History', icon: ClipboardList },
    { to: '/app/impact', label: 'Impact', icon: BarChart3 },
  ],
  requestor: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/requests/new', label: 'New Request', icon: HandHeart },
    { to: '/app/requests', label: 'My Requests', icon: ListChecks },
    { to: '/app/impact', label: 'Impact', icon: BarChart3 },
  ],
};

const ROLE_ICON: Record<UserRole, typeof Heart> = {
  donor: Heart,
  ngo: HandHeart,
  volunteer: Bike,
  requestor: ListChecks,
};

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = useMemo(() => (user ? NAV_BY_ROLE[user.role] : []), [user]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  if (!user) return null;
  const RoleIcon = ROLE_ICON[user.role];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-ink/5 bg-white lg:flex">
        <div className="flex h-16 items-center px-6">
          <Logo to="/app" />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="border-t border-ink/5 p-3">
          <NavLink
            to="/app/profile"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 transition',
                isActive ? 'bg-primary-50' : 'hover:bg-ink/4',
              )
            }
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">
              {initials(user.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
              <span className="flex items-center gap-1 text-xs text-ink/50">
                <RoleIcon className="h-3 w-3" />
                {ROLE_LABEL[user.role]}
              </span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/55 transition hover:bg-danger/5 hover:text-danger focus-ring"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-ink/5 bg-white/85 backdrop-blur-lg lg:pl-64">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="grid h-10 w-10 place-items-center rounded-xl text-ink/60 transition hover:bg-ink/5 lg:hidden focus-ring"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="lg:hidden">
            <Logo to="/app" />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell />
            <NavLink
              to="/app/profile"
              aria-label="Profile"
              className="grid h-10 w-10 place-items-center rounded-xl text-ink/60 transition hover:bg-ink/5 hover:text-ink focus-ring lg:hidden"
            >
              <User className="h-5 w-5" />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl animate-fade-in">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo to="/app" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-xl text-ink/50 hover:bg-ink/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-3">
              {items.map((item) => (
                <SideLink key={item.to} item={item} />
              ))}
              <SideLink item={{ to: '/app/profile', label: 'Profile & Settings', icon: Settings }} />
            </nav>
            <div className="border-t border-ink/5 p-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/60 transition hover:bg-danger/5 hover:text-danger"
              >
                <LogOut className="h-4.5 w-4.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="pb-24 lg:pb-10 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom tabs (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/5 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        <div className="flex">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition',
                  isActive ? 'text-primary' : 'text-ink/45',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-8 w-12 place-items-center rounded-full transition',
                      isActive && 'bg-primary-50',
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="max-w-[72px] truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
          isActive
            ? 'bg-primary text-white shadow-lift'
            : 'text-ink/60 hover:bg-primary-50 hover:text-primary-700',
        )
      }
    >
      <item.icon className="h-4.5 w-4.5 shrink-0" />
      {item.label}
    </NavLink>
  );
}
