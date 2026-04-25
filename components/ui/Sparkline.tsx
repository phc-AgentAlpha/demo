'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/cn';

export function Sparkline({
  data,
  width = 96,
  height = 28,
  tone,
  showDot = true,
  className,
  strokeWidth = 1.25,
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: 'pos' | 'neg' | 'mute';
  showDot?: boolean;
  className?: string;
  strokeWidth?: number;
}) {
  const { path, area, lastX, lastY, sign } = useMemo(() => buildPath(data, width, height), [data, width, height]);
  const t = tone ?? (sign > 0 ? 'pos' : sign < 0 ? 'neg' : 'mute');
  const stroke = t === 'pos' ? '#34d399' : t === 'neg' ? '#f87171' : '#6b7382';
  const fill = t === 'pos' ? 'rgba(52,211,153,0.18)' : t === 'neg' ? 'rgba(248,113,113,0.18)' : 'rgba(107,115,130,0.14)';
  const id = useMemo(() => `spark-${Math.random().toString(36).slice(2, 9)}`, []);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('block', className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {showDot ? (
        <circle cx={lastX} cy={lastY} r={2} fill={stroke}>
          <animate attributeName="r" values="2;3;2" dur="1.6s" repeatCount="indefinite" />
        </circle>
      ) : null}
    </svg>
  );
}

function buildPath(data: number[], w: number, h: number) {
  if (!data || data.length === 0) return { path: '', area: '', lastX: 0, lastY: h / 2, sign: 0 };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? w / (data.length - 1) : w;
  const pad = 2;
  const usableH = h - pad * 2;
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = pad + (1 - (v - min) / range) * usableH;
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${path} L${(pts[pts.length - 1][0]).toFixed(2)},${h} L0,${h} Z`;
  const sign = Math.sign(data[data.length - 1] - data[0]);
  return { path, area, lastX: pts[pts.length - 1][0], lastY: pts[pts.length - 1][1], sign };
}
