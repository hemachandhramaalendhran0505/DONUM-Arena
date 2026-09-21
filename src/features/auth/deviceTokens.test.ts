/**
 * FCM device-token persistence (§7).
 *
 * This is regression cover for a bug that shipped once already: `enablePush()`
 * fetched a registration token and threw it away, so the UI said
 * "Notifications enabled" while the backend had no way to reach the device.
 *
 * The second bug these tests pin down is subtler — appending with a
 * read-modify-write (`[...existing, token]`) silently deletes the *other*
 * device's token when an account is signed in on a phone and a laptop.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { localStore } from '@/services/localStore';
import { registerDeviceToken } from '@/features/auth/authService';
import type { UserProfile } from '@/types';

const baseUser: UserProfile = {
  id: 'u_token_test',
  name: 'Token Tester',
  email: 'tokens@donum.app',
  phone: '+91 90000 11111',
  role: 'donor',
  location: 'Indiranagar, Bengaluru',
  city: 'Bengaluru',
  latitude: 12.9784,
  longitude: 77.6408,
  verificationStatus: 'not_required',
  onboardingComplete: true,
  locationPermission: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const readTokens = () =>
  localStore.get<UserProfile>('users', baseUser.id)?.fcmTokens ?? [];

describe('FCM device tokens', () => {
  beforeEach(() => {
    localStore.reset(
      () =>
        ({
          users: [{ ...baseUser }],
          donations: [],
          requests: [],
          matches: [],
          tasks: [],
          notifications: [],
        }) as never,
    );
  });

  it('persists a token when push is enabled', async () => {
    expect(readTokens()).toEqual([]);
    await registerDeviceToken(baseUser.id, 'token-phone');
    expect(readTokens()).toEqual(['token-phone']);
  });

  it('keeps tokens from multiple devices instead of overwriting', async () => {
    await registerDeviceToken(baseUser.id, 'token-phone');
    await registerDeviceToken(baseUser.id, 'token-laptop');

    // The regression: a read-modify-write would leave only 'token-laptop'.
    expect(readTokens()).toEqual(['token-phone', 'token-laptop']);
  });

  it('does not duplicate a token that is already registered', async () => {
    await registerDeviceToken(baseUser.id, 'token-phone');
    await registerDeviceToken(baseUser.id, 'token-phone');
    await registerDeviceToken(baseUser.id, 'token-phone');

    expect(readTokens()).toEqual(['token-phone']);
  });

  it('survives concurrent registrations from two devices', async () => {
    // Both calls start from the same observed state, which is exactly the
    // interleaving that loses data under read-modify-write.
    await Promise.all([
      registerDeviceToken(baseUser.id, 'token-phone'),
      registerDeviceToken(baseUser.id, 'token-laptop'),
    ]);

    expect(readTokens().sort()).toEqual(['token-laptop', 'token-phone']);
  });
});
