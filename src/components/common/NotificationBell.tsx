import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, Handshake, PackageCheck, Siren, Truck } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { markAllRead, markRead } from '@/services/notificationService';
import { relativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { NotificationKind } from '@/types';

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  match: Handshake,
  pickup: Truck,
  delivery: PackageCheck,
  request: Siren,
  verification: CheckCheck,
  system: Bell,
};

export function NotificationBell() {
  const { notifications, unreadCount } = useData();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-ink/60 transition hover:bg-ink/5 hover:text-ink focus-ring"
      >
        {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(94vw,23rem)] overflow-hidden rounded-2xl border border-ink/8 bg-white shadow-lift animate-scale-in">
          <div className="flex items-center justify-between border-b border-ink/5 px-4 py-3">
            <p className="text-sm font-bold text-ink">Notifications</p>
            {unreadCount > 0 && user && (
              <button
                type="button"
                onClick={() => void markAllRead(user.id)}
                className="text-xs font-semibold text-primary transition hover:text-primary-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-ink/45">
                You're all caught up. Updates about matches, pickups and deliveries appear here.
              </p>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      void markRead(n.id);
                      setOpen(false);
                      if (n.link) navigate(n.link);
                    }}
                    className={cn(
                      'flex w-full gap-3 border-b border-ink/4 px-4 py-3 text-left transition last:border-0 hover:bg-primary-50/50',
                      !n.read && 'bg-primary-50/30',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                        n.read ? 'bg-ink/5 text-ink/45' : 'bg-primary/10 text-primary',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cn('truncate text-sm', n.read ? 'font-medium text-ink/75' : 'font-bold text-ink')}>
                          {n.title}
                        </span>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink/55">{n.body}</span>
                      <span className="mt-1 block text-[11px] font-medium text-ink/35">
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
