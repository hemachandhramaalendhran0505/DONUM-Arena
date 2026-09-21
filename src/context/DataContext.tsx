/**
 * DONUM — realtime data context.
 *
 * Opens one listener per collection and shares the results app-wide, so every
 * dashboard reflects donation, match and delivery changes the instant they
 * happen — exactly the realtime tracking behaviour described in the spec.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppNotification, DeliveryTask, Donation, Match, ResourceRequest, UserProfile } from '@/types';
import { subscribeDonations, expireStaleDonations } from '@/features/donations/donationService';
import { subscribeRequests } from '@/features/requests/requestService';
import { subscribeTasks } from '@/features/tracking/taskService';
import { subscribeMatches } from '@/features/matching/matchService';
import { subscribeCollection } from '@/services/db';
import { subscribeNotifications } from '@/features/notifications/notificationService';
import { useAuth } from './AuthContext';

interface DataContextValue {
  donations: Donation[];
  requests: ResourceRequest[];
  tasks: DeliveryTask[];
  matches: Match[];
  users: UserProfile[];
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      subscribeDonations((items) => {
        setDonations(items);
        setLoading(false);
      }),
      subscribeRequests(setRequests),
      subscribeTasks(setTasks),
      subscribeMatches(setMatches),
      subscribeCollection<UserProfile>('users', setUsers),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    return subscribeNotifications(user.id, setNotifications);
  }, [user]);

  // Sweep expired donations on load and then hourly.
  useEffect(() => {
    if (!donations.length) return;
    expireStaleDonations(donations);
    const id = window.setInterval(() => expireStaleDonations(donations), 36e5);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donations.length]);

  const value = useMemo<DataContextValue>(
    () => ({
      donations,
      requests,
      tasks,
      matches,
      users,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      loading,
    }),
    [donations, requests, tasks, matches, users, notifications, loading],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
