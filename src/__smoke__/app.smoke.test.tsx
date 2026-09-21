/**
 * DONUM runtime smoke test.
 *
 * Mounts the REAL application in jsdom, signs in as each of the four roles and
 * walks every major route, failing on any console error or thrown exception.
 * This catches runtime problems (bad hooks, undefined access, broken context)
 * that typechecking alone cannot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import App from '@/App';
import { DEMO_ACCOUNTS } from '@/services/seed';

const errors: string[] = [];
const originalError = console.error;
const originalWarn = console.warn;

function installConsoleGuards() {
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
    originalError(...(args as []));
  };
  console.warn = (...args: unknown[]) => {
    const text = args.map(String).join(' ');
    // React Router v7 future-flag notices are informational, not defects.
    if (!text.includes('React Router Future Flag')) errors.push(text);
    originalWarn(...(args as []));
  };
}

beforeEach(() => {
  errors.length = 0;
  installConsoleGuards();
  window.localStorage.clear();
  window.history.pushState({}, '', '/');

  // jsdom lacks these browser APIs; the app must tolerate their absence.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
  global.IntersectionObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = '';
    thresholds = [];
  } as never;
});

afterEach(() => {
  cleanup();
  console.error = originalError;
  console.warn = originalWarn;
});

function expectNoErrors(context: string) {
  const real = errors.filter(
    (e) => !e.includes('not wrapped in act') && !e.includes('React Router Future Flag'),
  );
  expect(real, `Console errors during ${context}:\n${real.join('\n---\n')}`).toEqual([]);
}

async function signInAs(email: string) {
  const user = (await import('@testing-library/user-event')).default;
  const session = user.setup();

  window.history.pushState({}, '', '/signin');
  render(<App />);

  await screen.findByRole('heading', { name: /welcome back/i });

  const account = DEMO_ACCOUNTS.find((a) => a.email === email)!;
  // The demo quick-select buttons are the fastest deterministic path in.
  const panel = screen.getByText(/try a demo account/i).closest('div')!;
  const button = within(panel).getByText(account.role).closest('button')!;
  await session.click(button);

  await waitFor(() => expect(window.location.pathname).toBe('/app'), { timeout: 5000 });
  return session;
}

describe('DONUM application smoke', () => {
  it('renders the landing page with hero, stats and all required sections', async () => {
    render(<App />);

    const hero = await screen.findByRole('heading', { level: 1 });
    expect(hero.textContent).toMatch(/Turn Surplus Into Impact\./i);
    expect(
      screen.getByText(/DONUM connects surplus resources with people and communities who need them\./i),
    ).toBeTruthy();

    // CTAs
    expect(screen.getByText('Start Donating')).toBeTruthy();
    expect(screen.getByText('Request Resources')).toBeTruthy();

    // Hero statistics
    ['Resources Donated', 'People Reached', 'Donations Completed', 'Volunteers'].forEach((label) => {
      expect(screen.getByText(label), `missing hero stat: ${label}`).toBeTruthy();
    });

    // The seven required sections (scoped to page content, not the nav bar)
    const main = screen.getByRole('main');
    expect(within(main).getAllByText(/How DONUM works/i).length).toBeGreaterThan(0);
    expect(within(main).getAllByText(/Why DONUM/i).length).toBeGreaterThan(0);
    expect(within(main).getAllByText(/Donation categories/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Impact/i).length).toBeGreaterThan(0);
    expect(within(main).getAllByText(/Trust & verification/i).length).toBeGreaterThan(0);
    expect(within(main).getByText(/Choose how you want to make an impact/i)).toBeTruthy();
    expect(within(main).getByText(/Turning surplus into impact/i)).toBeTruthy();

    expectNoErrors('landing page');
  });

  it('shows the onboarding welcome screen', async () => {
    window.history.pushState({}, '', '/onboarding');
    render(<App />);
    expect(await screen.findByText(/Welcome to DONUM/i)).toBeTruthy();
    expect(screen.getByText(/Get started/i)).toBeTruthy();
    expectNoErrors('onboarding');
  });

  it('signs in a DONOR and renders the dashboard, donations and impact', async () => {
    const session = await signInAs('donor@donum.app');

    expect(await screen.findByText(/Make an impact today\./i)).toBeTruthy();
    const main = screen.getByRole('main');
    expect(within(main).getAllByText('Add Donation').length).toBeGreaterThan(0);
    expect(within(main).getByText('Track Donations')).toBeTruthy();
    expect(within(main).getByText('Donation History')).toBeTruthy();
    expect(await screen.findByText('Total Donations')).toBeTruthy();
    expect(screen.getByText('People Helped')).toBeTruthy();
    expect(screen.getByText('Waste Diverted')).toBeTruthy();
    expectNoErrors('donor dashboard');

    const nav = screen.getAllByRole('navigation')[0];
    await session.click(within(nav).getByRole('link', { name: /^My Donations$/i }));
    expect(await screen.findByRole('heading', { name: /my donations/i })).toBeTruthy();
    expectNoErrors('donations list');

    await session.click(within(nav).getByRole('link', { name: /^Impact$/i }));
    expect(await screen.findByRole('heading', { name: /impact dashboard/i })).toBeTruthy();
    expect(await screen.findByText('Volunteer Hours')).toBeTruthy();
    expect(screen.getByText(/Donations by category/i)).toBeTruthy();
    expect(screen.getByText(/Donations over time/i)).toBeTruthy();
    expect(screen.getByText(/Impact by location/i)).toBeTruthy();
    expectNoErrors('impact dashboard');
  }, 30000);

  it('opens the Add Donation form and reveals food-specific fields', async () => {
    const session = await signInAs('donor@donum.app');
    await screen.findByText(/Make an impact today\./i);

    const donorNav = screen.getAllByRole('navigation')[0];
    await session.click(within(donorNav).getByRole('link', { name: /Add Donation/i }));

    expect(await screen.findByRole('heading', { name: /add a donation/i })).toBeTruthy();
    expect(screen.getByLabelText(/Donation title/i)).toBeTruthy();
    expect(screen.getByText(/Special instructions/i)).toBeTruthy();

    // Food Items is the default category, so food fields must be visible.
    expect(screen.getByText(/Food safety details/i)).toBeTruthy();
    expect(screen.getByText(/Preparation date & time/i)).toBeTruthy();
    expect(screen.getByText(/Storage requirement/i)).toBeTruthy();
    expect(screen.getByText(/Estimated servings/i)).toBeTruthy();
    expect(screen.getByText('Vegetarian')).toBeTruthy();

    // Switching to Clothes must hide them.
    await session.click(screen.getByRole('button', { name: /Clothes/i }));
    await waitFor(() => expect(screen.queryByText(/Food safety details/i)).toBeNull());

    expectNoErrors('add donation form');
  }, 30000);

  it('opens a donation detail page with its status timeline', async () => {
    const session = await signInAs('donor@donum.app');
    await screen.findByText(/Make an impact today\./i);

    const detailNav = screen.getAllByRole('navigation')[0];
    await session.click(within(detailNav).getByRole('link', { name: /^My Donations$/i }));
    await screen.findByRole('heading', { name: /my donations/i });

    const card = await screen.findByText(/Surplus wedding catering/i);
    await session.click(card);

    expect(await screen.findByText(/Status timeline/i)).toBeTruthy();
    expect(screen.getByText(/Food safety details/i)).toBeTruthy();
    expectNoErrors('donation detail');
  }, 30000);

  it('signs in an NGO and renders browse + requests', async () => {
    const session = await signInAs('ngo@donum.app');

    expect(await screen.findByText(/Anna Seva Foundation/i)).toBeTruthy();
    expect(screen.getByText('Pending Pickups')).toBeTruthy();
    expectNoErrors('ngo dashboard');

    const ngoNav = screen.getAllByRole('navigation')[0];
    await session.click(within(ngoNav).getByRole('link', { name: /Browse Donations/i }));
    expect(await screen.findByRole('heading', { name: /browse donations/i })).toBeTruthy();
    expect(screen.getByText(/Filters/i)).toBeTruthy();
    expectNoErrors('browse donations');

    await session.click(within(ngoNav).getByRole('link', { name: /^Requests$/i }));
    expect(await screen.findByRole('heading', { name: /my requests/i })).toBeTruthy();
    expectNoErrors('ngo requests');
  }, 30000);

  it('signs in a VOLUNTEER and renders tasks', async () => {
    const session = await signInAs('volunteer@donum.app');

    const volTasks = await screen.findAllByText(/Available Tasks/i, {}, { timeout: 5000 });
    expect(volTasks.length).toBeGreaterThan(0);
    expectNoErrors('volunteer dashboard');

    const volNav = screen.getAllByRole('navigation')[0];
    await session.click(within(volNav).getByRole('link', { name: /^Tasks$/i }));
    expect(await screen.findByRole('heading', { name: /delivery tasks/i })).toBeTruthy();
    expectNoErrors('volunteer tasks');
  }, 30000);

  it('signs in a REQUESTOR and renders the request flow', async () => {
    const session = await signInAs('requestor@donum.app');

    expect(await screen.findByText(/Open Requests/i)).toBeTruthy();
    expectNoErrors('requestor dashboard');

    const reqNav = screen.getAllByRole('navigation')[0];
    await session.click(within(reqNav).getByRole('link', { name: /New Request/i }));
    expect(await screen.findByRole('heading', { name: /create a resource request/i })).toBeTruthy();
    expect(screen.getByText(/Urgency & timing/i)).toBeTruthy();
    expect(screen.getByText('Critical')).toBeTruthy();
    expectNoErrors('create request');
  }, 30000);
});
