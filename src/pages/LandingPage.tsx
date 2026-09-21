import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Boxes,
  Clock4,
  Eye,
  HandHeart,
  Heart,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Logo } from '@/components/common/Logo';
import { useData } from '@/context/DataContext';
import { buildImpactSummary } from '@/features/analytics/impact';
import { useCountUp } from '@/hooks/useCountUp';
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '@/utils/labels';
import { compactNumber } from '@/utils/format';
import type { DonationCategory } from '@/types';
import { cn } from '@/utils/cn';

export function LandingPage() {
  const { donations, tasks, users } = useData();

  const stats = useMemo(() => buildImpactSummary(donations, tasks), [donations, tasks]);
  const volunteers = users.filter((u) => u.role === 'volunteer').length;

  return (
    <div className="overflow-hidden">
      <Hero
        stats={[
          { label: 'Resources Donated', value: stats.resourcesDistributed, icon: Boxes },
          { label: 'People Reached', value: stats.peopleReached, icon: Users },
          { label: 'Donations Completed', value: stats.successfulDonations, icon: PackageCheck },
          { label: 'Volunteers', value: Math.max(volunteers, 1) * 24, icon: Bike },
        ]}
      />
      <HowItWorks />
      <WhyDonum />
      <Categories />
      <Impact stats={stats} />
      <Trust />
      <CallToAction />
      <Footer />
    </div>
  );
}

// --- Hero -------------------------------------------------------------------

function Hero({
  stats,
}: {
  stats: Array<{ label: string; value: number; icon: typeof Boxes }>;
}) {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute right-0 top-32 h-[24rem] w-[24rem] rounded-full bg-secondary/12 blur-3xl" />
        <div className="absolute inset-0 grid-noise opacity-40" />
      </div>

      <div className="donum-section pb-16 pt-14 sm:pb-24 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-3.5 py-1.5 text-xs font-bold text-primary shadow-soft">
              <Sparkles className="h-3.5 w-3.5" />
              Intelligent donation matching
            </span>

            <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.85rem]">
              Turn Surplus <span className="text-primary">Into Impact.</span>
            </h1>

            <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-ink/60">
              DONUM connects surplus resources with people and communities who need them.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton
                to="/onboarding?role=donor"
                size="lg"
                iconRight={<ArrowRight className="h-5 w-5" />}
              >
                Start Donating
              </LinkButton>
              <LinkButton to="/onboarding?role=requestor" size="lg" variant="outline">
                Request Resources
              </LinkButton>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink/50">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-success" />
                Verified organisations
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-warning" />
                Matched in seconds
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-primary" />
                Tracked end to end
              </span>
            </div>
          </div>

          <HeroVisual />
        </div>

        <div className="mt-16 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <HeroStat key={stat.label} {...stat} delay={i * 90} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  icon: Icon,
  delay,
}: {
  label: string;
  value: number;
  icon: typeof Boxes;
  delay: number;
}) {
  const animated = useCountUp(value, { duration: 1400 });
  return (
    <div
      className="rounded-2xl border border-ink/5 bg-white/80 p-4 shadow-soft backdrop-blur animate-fade-up sm:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {compactNumber(animated)}
        <span className="text-primary">+</span>
      </p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</p>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative animate-fade-up" style={{ animationDelay: '180ms' }}>
      <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary/15 to-secondary/10 blur-2xl" />

      <div className="space-y-3 rounded-3xl border border-ink/5 bg-white p-4 shadow-glow sm:p-5">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary to-primary-500 p-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Live match</p>
            <p className="mt-1 text-base font-bold">120 meals → Anna Seva Foundation</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-extrabold">
            94%
          </span>
        </div>

        <FlowRow
          icon={<Heart className="h-4 w-4" />}
          tone="primary"
          title="Spice Route Kitchen"
          subtitle="Surplus catering · Indiranagar"
          badge="Donor"
        />
        <div className="flex justify-center">
          <span className="h-6 w-px bg-gradient-to-b from-primary/40 to-success/40" />
        </div>
        <FlowRow
          icon={<Bike className="h-4 w-4" />}
          tone="warning"
          title="Rohit is on the way"
          subtitle="4.6 km · arrives in 18 min"
          badge="Volunteer"
        />
        <div className="flex justify-center">
          <span className="h-6 w-px bg-gradient-to-b from-warning/40 to-success/40" />
        </div>
        <FlowRow
          icon={<HandHeart className="h-4 w-4" />}
          tone="success"
          title="Anna Seva Foundation"
          subtitle="150 people · Shivajinagar"
          badge="Verified NGO"
        />

        <div className="flex items-center gap-2 rounded-2xl bg-success/8 px-4 py-3 text-sm font-semibold text-emerald-700">
          <PackageCheck className="h-4.5 w-4.5" />
          54 kg of food diverted from waste today
        </div>
      </div>
    </div>
  );
}

function FlowRow({
  icon,
  title,
  subtitle,
  badge,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  tone: 'primary' | 'warning' | 'success';
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink/5 bg-surface/60 p-3.5">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[tone])}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{title}</p>
        <p className="truncate text-xs text-ink/50">{subtitle}</p>
      </div>
      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink/50 ring-1 ring-ink/5">
        {badge}
      </span>
    </div>
  );
}

// --- Section shell ----------------------------------------------------------

function SectionHeading({
  eyebrow,
  title,
  description,
  center = true,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center')}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</span>
      <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-balance text-base leading-relaxed text-ink/55">{description}</p>}
    </div>
  );
}

// --- How it works -----------------------------------------------------------

const STEPS = [
  {
    icon: Boxes,
    title: 'List your surplus',
    body: 'Snap a photo, set quantity, category and pickup window. Food donations capture prep time, storage and servings.',
  },
  {
    icon: Sparkles,
    title: 'DONUM finds the match',
    body: 'Our engine scores every open request on distance, urgency, category, quantity and expiry — not distance alone.',
  },
  {
    icon: Bike,
    title: 'A volunteer collects it',
    body: 'Nearby volunteers accept the task and navigate pickup to drop-off with live status at every step.',
  },
  {
    icon: PackageCheck,
    title: 'Impact is confirmed',
    body: 'The receiving organisation confirms delivery, and your verified impact is added to your dashboard.',
  },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="donum-section">
        <SectionHeading
          eyebrow="How DONUM works"
          title="From surplus to someone who needs it, in four steps"
          description="Every donation follows the same transparent path — and you can see exactly where it is at any moment."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="group relative rounded-2xl border border-ink/5 bg-surface/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-white hover:shadow-lift"
            >
              <span className="absolute right-5 top-5 text-4xl font-extrabold text-primary/8 transition group-hover:text-primary/15">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-lift">
                <step.icon className="h-5.5 w-5.5" />
              </span>
              <h3 className="mt-5 text-base font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Why DONUM --------------------------------------------------------------

const REASONS = [
  {
    icon: Sparkles,
    title: 'Intelligent, not just nearby',
    body: 'A weighted score balances distance, urgency, category fit, quantity coverage and expiry pressure — so critical needs win, not just close ones.',
  },
  {
    icon: Eye,
    title: 'Transparent end to end',
    body: 'A visual timeline follows every donation from created to completed. Donors, NGOs and volunteers see the same truth in real time.',
  },
  {
    icon: Clock4,
    title: 'Built for perishables',
    body: 'Expiry-aware routing gets cooked food moving within hours, with storage and dietary details captured up front.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified by design',
    body: 'NGOs submit registration and FSSAI details. Verification status is visible on every card, so trust is never assumed.',
  },
  {
    icon: MapPin,
    title: 'Location aware',
    body: 'Live maps show pickup points, drop-offs and optimised volunteer routes with real distances and travel estimates.',
  },
  {
    icon: Users,
    title: 'Four roles, one flow',
    body: 'Donors, NGOs, volunteers and beneficiaries each get a purpose-built dashboard on the same shared timeline.',
  },
];

function WhyDonum() {
  return (
    <section id="why" className="scroll-mt-20 py-20 sm:py-24">
      <div className="donum-section">
        <SectionHeading
          eyebrow="Why DONUM"
          title="Donation logistics that actually work"
          description="Most surplus is wasted because coordination is hard. DONUM removes the friction at every step."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className="rounded-2xl border border-ink/5 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary">
                <reason.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">{reason.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Categories -------------------------------------------------------------

const CATEGORY_COPY: Record<DonationCategory, string> = {
  food_items: 'Cooked meals, bakery surplus and packaged food — routed fast, before expiry.',
  clothes: 'Seasonal wear, uniforms and blankets, sorted and matched to shelters.',
  groceries: 'Ration kits, staples and fresh produce for families and community kitchens.',
  essentials: 'Hygiene kits, sanitary products, school supplies and household basics.',
  animal_food: 'Kibble and feed for shelters, rescues and street animal programmes.',
  other: 'Books, furniture, electronics and anything else a community can use.',
};

function Categories() {
  const categories = Object.keys(CATEGORY_COPY) as DonationCategory[];
  return (
    <section id="categories" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="donum-section">
        <SectionHeading
          eyebrow="Donation categories"
          title="If someone can use it, DONUM can route it"
          description="Each category carries its own fields and matching behaviour, so a tray of hot biryani is handled very differently from a carton of jackets."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category}
              className="group flex gap-4 rounded-2xl border border-ink/5 bg-surface/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-white hover:shadow-lift"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-2xl shadow-soft ring-1 ring-ink/5">
                {CATEGORY_EMOJI[category]}
              </span>
              <div>
                <h3 className="text-base font-bold text-ink">{CATEGORY_LABEL[category]}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{CATEGORY_COPY[category]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Impact -----------------------------------------------------------------

function Impact({ stats }: { stats: ReturnType<typeof buildImpactSummary> }) {
  const items = [
    { label: 'Meals & items distributed', value: stats.resourcesDistributed, suffix: '' },
    { label: 'People reached', value: stats.peopleReached, suffix: '' },
    { label: 'Waste diverted', value: stats.wasteDivertedKg, suffix: 'kg' },
    { label: 'Volunteer hours', value: Math.round(stats.volunteerHours), suffix: 'hrs' },
  ];

  return (
    <section id="impact" className="scroll-mt-20 py-20 sm:py-24">
      <div className="donum-section">
        <div className="overflow-hidden rounded-3xl bg-ink">
          <div className="relative px-6 py-14 sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
              <div className="absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
            </div>

            <div className="relative">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary-300">Impact</span>
                <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  Every donation becomes a number you can point to.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/60">
                  DONUM measures outcomes, not intentions — resources distributed, people reached, waste diverted and
                  volunteer time given, all computed from real completed deliveries.
                </p>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {items.map((item) => (
                  <ImpactStat key={item.label} {...item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ImpactStat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const animated = useCountUp(value, { duration: 1600 });
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {compactNumber(animated)}
        {suffix && <span className="ml-1 text-lg text-primary-300">{suffix}</span>}
      </p>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-white/45">{label}</p>
    </div>
  );
}

// --- Trust ------------------------------------------------------------------

const TRUST_ITEMS = [
  {
    icon: BadgeCheck,
    title: 'Organisation verification',
    body: 'NGOs submit registration numbers and, for food handling, FSSAI licence details. Status is Pending, Verified or Rejected — and always visible.',
  },
  {
    icon: ShieldCheck,
    title: 'Volunteer identity checks',
    body: 'Volunteers provide ID and vehicle details before they can accept a pickup, and every handover is timestamped.',
  },
  {
    icon: Eye,
    title: 'Auditable matching',
    body: 'Each match stores its full score breakdown. Nothing about who received what is a black box.',
  },
];

function Trust() {
  return (
    <section id="trust" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className="donum-section">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <SectionHeading
            center={false}
            eyebrow="Trust & verification"
            title="Generosity deserves accountability"
            description="Donating is an act of trust. DONUM makes that trust verifiable at every layer — organisations, volunteers and the matching itself."
          />

          <div className="space-y-4">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 rounded-2xl border border-ink/5 bg-surface/60 p-5 transition hover:border-primary/20 hover:bg-white hover:shadow-soft"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// --- CTA --------------------------------------------------------------------

const ROLE_CARDS = [
  { role: 'donor', icon: Heart, title: 'I want to Donate', body: 'List surplus in under a minute.' },
  { role: 'ngo', icon: HandHeart, title: 'I represent an NGO', body: 'Receive matched donations.' },
  { role: 'volunteer', icon: Bike, title: 'I want to Volunteer', body: 'Deliver where it matters.' },
  { role: 'requestor', icon: Users, title: 'I need Resources', body: 'Request what your community needs.' },
] as const;

function CallToAction() {
  return (
    <section className="py-20 sm:py-24">
      <div className="donum-section">
        <SectionHeading
          eyebrow="Get started"
          title="Choose how you want to make an impact"
          description="Pick your role and DONUM will tailor everything — your dashboard, your matches and your notifications."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_CARDS.map((card) => (
            <Link
              key={card.role}
              to={`/onboarding?role=${card.role}`}
              className="group flex flex-col rounded-2xl border border-ink/5 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-lift"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary transition group-hover:bg-primary group-hover:text-white">
                <card.icon className="h-5.5 w-5.5" />
              </span>
              <h3 className="mt-5 text-base font-bold text-ink">{card.title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-ink/55">{card.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                Continue
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Footer -----------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-ink/5 bg-white">
      <div className="donum-section py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo showTagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/55">
              DONUM connects surplus to scarcity — a donation distribution and resource-matching platform for
              donors, NGOs, volunteers and communities.
            </p>
          </div>

          <FooterColumn
            title="Platform"
            links={[
              { label: 'How it works', href: '/#how' },
              { label: 'Why DONUM', href: '/#why' },
              { label: 'Categories', href: '/#categories' },
              { label: 'Impact', href: '/#impact' },
            ]}
          />
          <FooterColumn
            title="Get started"
            links={[
              { label: 'Donate surplus', href: '/onboarding?role=donor' },
              { label: 'Register an NGO', href: '/onboarding?role=ngo' },
              { label: 'Become a volunteer', href: '/onboarding?role=volunteer' },
              { label: 'Request resources', href: '/onboarding?role=requestor' },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { label: 'Sign in', href: '/signin' },
              { label: 'Create account', href: '/signup' },
              { label: 'Trust & verification', href: '/#trust' },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-ink/5 pt-8 sm:flex-row">
          <p className="text-xs text-ink/40">
            © {new Date().getFullYear()} DONUM. Turning surplus into impact.
          </p>
          <p className="text-xs text-ink/40">Built with React, TypeScript, Tailwind CSS and Firebase.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-ink/45">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.href} className="text-sm font-medium text-ink/60 transition hover:text-primary">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
