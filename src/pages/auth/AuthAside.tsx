import { PackageCheck, ShieldCheck, Sparkles, Users } from 'lucide-react';

const POINTS = [
  { icon: Sparkles, label: 'Matched in seconds', body: 'Weighted scoring across five signals, not distance alone.' },
  { icon: PackageCheck, label: 'Tracked end to end', body: 'A shared timeline from created to completed.' },
  { icon: ShieldCheck, label: 'Verified receivers', body: 'Registration and FSSAI checks on every organisation.' },
  { icon: Users, label: 'Four connected roles', body: 'Donors, NGOs, volunteers and communities in one flow.' },
];

/** Decorative panel shown beside the auth forms on large screens. */
export function AuthAside() {
  return (
    <div className="relative hidden overflow-hidden bg-ink lg:block">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute inset-0 grid-noise opacity-20" />
      </div>

      <div className="relative flex h-full flex-col justify-center px-14 py-16">
        <blockquote className="max-w-md">
          <p className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-white">
            “Instead of throwing away 120 meals, we fed a shelter 4 kilometres away — in 40 minutes.”
          </p>
          <footer className="mt-5 text-sm text-white/50">
            Spice Route Kitchen · DONUM donor since 2024
          </footer>
        </blockquote>

        <ul className="mt-12 max-w-md space-y-4">
          {POINTS.map((point) => (
            <li key={point.label} className="flex items-start gap-3.5">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-primary-200 backdrop-blur">
                <point.icon className="h-4.5 w-4.5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-white">{point.label}</span>
                <span className="mt-0.5 block text-sm text-white/50">{point.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
