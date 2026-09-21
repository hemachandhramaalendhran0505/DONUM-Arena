/**
 * Human-readable match explanation.
 *
 * Normal users see the sentence and a confidence bar; the full algorithmic
 * breakdown is tucked behind "How this was calculated" so DONUM stays simple
 * on the surface and transparent when you want the detail.
 */
import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import type { MatchScoreBreakdown } from '@/types';
import { cn } from '@/utils/cn';
import { matchQuality, DEFAULT_WEIGHTS } from './engine';
import { Badge } from '@/components/ui/Badge';

interface Props {
  breakdown: MatchScoreBreakdown;
  compact?: boolean;
  className?: string;
}

const FACTORS: Array<{ key: keyof MatchScoreBreakdown; label: string; weight: number }> = [
  { key: 'distanceScore', label: 'Distance', weight: DEFAULT_WEIGHTS.distance },
  { key: 'urgencyScore', label: 'Urgency', weight: DEFAULT_WEIGHTS.urgency },
  { key: 'categoryScore', label: 'Category', weight: DEFAULT_WEIGHTS.category },
  { key: 'quantityScore', label: 'Quantity', weight: DEFAULT_WEIGHTS.quantity },
  { key: 'expiryScore', label: 'Expiry', weight: DEFAULT_WEIGHTS.expiry },
];

export function MatchExplanation({ breakdown, compact, className }: Props) {
  const [open, setOpen] = useState(false);
  const quality = matchQuality(breakdown.matchScore);
  const pct = Math.round(breakdown.matchScore * 100);

  return (
    <div
      className={cn(
        'rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-50/80 to-white p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-lift">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink">{quality.label}</p>
            <Badge tone={quality.tone === 'muted' ? 'muted' : quality.tone}>{pct}% match</Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink/65">{breakdown.explanation}</p>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-inset ring-primary/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary transition-all duration-1000"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>

      {!compact && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-primary-700 focus-ring"
          >
            How this was calculated
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
          </button>

          {open && (
            <div className="mt-3 space-y-2.5 rounded-xl bg-white/70 p-3.5 ring-1 ring-primary/10 animate-fade-in">
              {FACTORS.map((factor) => {
                const score = breakdown[factor.key] as number;
                return (
                  <div key={factor.key} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs font-semibold text-ink/65">{factor.label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-700"
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold text-ink">
                      {score.toFixed(2)}
                    </span>
                    <span className="w-10 shrink-0 text-right text-[11px] font-medium text-ink/40">
                      ×{factor.weight.toFixed(2)}
                    </span>
                  </div>
                );
              })}
              <p className="border-t border-ink/5 pt-2.5 text-[11px] leading-relaxed text-ink/45">
                Weighted total: <span className="font-bold text-ink/70">{breakdown.matchScore.toFixed(3)}</span> ·
                straight-line distance {breakdown.distanceKm.toFixed(1)} km. Weights are configurable per deployment.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** One-line inline variant for dense lists. */
export function MatchScorePill({ score }: { score: number }) {
  const quality = matchQuality(score);
  return (
    <Badge tone={quality.tone === 'muted' ? 'muted' : quality.tone}>
      {Math.round(score * 100)}% match
    </Badge>
  );
}
