import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button, LinkButton } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

const LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#why', label: 'Why DONUM' },
  { href: '/#categories', label: 'Categories' },
  { href: '/#impact', label: 'Impact' },
  { href: '/#trust', label: 'Trust' },
];

export function PublicLayout() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location]);

  return (
    <div className="min-h-screen bg-surface">
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled ? 'border-b border-ink/5 bg-white/85 backdrop-blur-lg' : 'bg-transparent',
        )}
      >
        <div className="donum-section flex h-18 items-center justify-between py-3.5">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/60 transition hover:bg-ink/4 hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <LinkButton to="/app" size="sm" iconRight={<ArrowRight className="h-4 w-4" />}>
                Open dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton to="/signin" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Sign in
                </LinkButton>
                <LinkButton to="/onboarding" size="sm">
                  Get started
                </LinkButton>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label="Menu"
              className="px-2 md:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="border-t border-ink/5 bg-white md:hidden">
            <nav className="donum-section flex flex-col py-3">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-2 py-2.5 text-sm font-semibold text-ink/70 transition hover:bg-ink/4"
                >
                  {link.label}
                </a>
              ))}
              {!user && (
                <Link to="/signin" className="rounded-lg px-2 py-2.5 text-sm font-semibold text-primary">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="pt-18">
        <Outlet />
      </main>
    </div>
  );
}
