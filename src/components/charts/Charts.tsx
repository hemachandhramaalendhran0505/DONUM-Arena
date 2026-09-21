/**
 * DONUM — lightweight, dependency-free charts.
 * Pure SVG/CSS so the bundle stays small and everything animates smoothly.
 */
import { useId } from 'react';
import { cn } from '@/utils/cn';
import { compactNumber } from '@/utils/format';

// --- Bar chart -------------------------------------------------------------

export interface BarDatum {
  label: string;
  value: number;
  secondary?: number;
  color?: string;
}

export function BarChart({
  data,
  height = 200,
  showSecondary = false,
  valueFormatter = compactNumber,
}: {
  data: BarDatum[];
  height?: number;
  showSecondary?: boolean;
  valueFormatter?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)));

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
        {data.map((d) => {
          const h = (d.value / max) * 100;
          const h2 = ((d.secondary ?? 0) / max) * 100;
          return (
            <div key={d.label} className="group flex h-full flex-1 flex-col justify-end gap-1.5">
              <div className="relative flex h-full items-end justify-center gap-1">
                <div
                  className="w-full max-w-[26px] rounded-t-lg bg-gradient-to-t from-primary to-primary-400 transition-all duration-700 group-hover:from-primary-700"
                  style={{ height: `${Math.max(2, h)}%` }}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                    {valueFormatter(d.value)}
                    {showSecondary && d.secondary !== undefined && ` · ${valueFormatter(d.secondary)} done`}
                  </span>
                </div>
                {showSecondary && d.secondary !== undefined && (
                  <div
                    className="w-full max-w-[26px] rounded-t-lg bg-success/70 transition-all duration-700"
                    style={{ height: `${Math.max(2, h2)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {data.map((d) => (
          <p key={d.label} className="flex-1 truncate text-center text-[11px] font-medium text-ink/45">
            {d.label}
          </p>
        ))}
      </div>
    </div>
  );
}

// --- Donut chart -----------------------------------------------------------

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const id = useId();
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(23,19,33,0.06)"
            strokeWidth={thickness}
          />
          {data.map((slice) => {
            const fraction = slice.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={`${id}-${slice.label}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                className="transition-all duration-700"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-extrabold text-ink">{centerValue ?? compactNumber(total)}</p>
            {centerLabel && <p className="text-xs font-medium text-ink/45">{centerLabel}</p>}
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
            <span className="flex-1 truncate text-sm font-medium text-ink/70">{slice.label}</span>
            <span className="text-sm font-bold text-ink">{compactNumber(slice.value)}</span>
            <span className="w-11 text-right text-xs font-medium text-ink/40">
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Area / line chart -----------------------------------------------------

export function AreaChart({
  data,
  height = 190,
}: {
  data: Array<{ label: string; value: number; secondary?: number }>;
  height?: number;
}) {
  const id = useId();
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)));
  const W = 100;
  const H = 100;
  const stepX = data.length > 1 ? W / (data.length - 1) : W;

  const toPoints = (key: 'value' | 'secondary') =>
    data.map((d, i) => `${i * stepX},${H - ((d[key] ?? 0) / max) * (H - 8)}`).join(' ');

  const linePoints = toPoints('value');
  const hasSecondary = data.some((d) => d.secondary !== undefined);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }} className="w-full">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C3CE9" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#6C3CE9" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="rgba(23,19,33,0.05)" strokeWidth="0.4" />
        ))}
        <polygon points={`0,${H} ${linePoints} ${W},${H}`} fill={`url(#grad-${id})`} />
        <polyline
          points={linePoints}
          fill="none"
          stroke="#6C3CE9"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {hasSecondary && (
          <polyline
            points={toPoints('secondary')}
            fill="none"
            stroke="#22C55E"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {data.map((d, i) => (
          <circle
            key={d.label}
            cx={i * stepX}
            cy={H - (d.value / max) * (H - 8)}
            r="1.6"
            fill="#6C3CE9"
            stroke="#fff"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between">
        {data.map((d, i) => (
          <span
            key={d.label}
            className={cn(
              'text-[11px] font-medium text-ink/40',
              data.length > 6 && i % 2 === 1 && 'hidden sm:inline',
            )}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Horizontal progress rows ---------------------------------------------

export function ProgressRows({
  rows,
}: {
  rows: Array<{ label: string; value: number; sublabel?: string; color?: string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold text-ink/75">{row.label}</span>
            <span className="shrink-0 text-sm font-bold text-ink">
              {compactNumber(row.value)}
              {row.sublabel && <span className="ml-1 text-xs font-medium text-ink/40">{row.sublabel}</span>}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink/6">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(row.value / max) * 100}%`, background: row.color ?? '#6C3CE9' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export const CHART_COLORS = ['#6C3CE9', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#0EA5E9'];
