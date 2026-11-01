'use client';

import { Star, Zap } from 'lucide-react';
import type { ValueRating } from '@/lib/real-estate/value-rating';

export function ListingValueBadge({ rating, compact = false }: { rating: ValueRating; compact?: boolean }) {
  const batteryWidth = Math.max(8, (rating.score / 100) * 100);

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${compact ? 'text-[10px]' : 'text-xs'}`}
      style={{ backgroundColor: rating.bgColor }}
    >
      <div className="flex shrink-0 items-center" style={{ gap: '1px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={compact ? 9 : 11}
            fill={i < rating.stars ? rating.color : 'none'}
            stroke={i < rating.stars ? rating.color : '#666'}
            strokeWidth={1.5}
          />
        ))}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-semibold" style={{ color: rating.color }}>
          {rating.label}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <div className="relative h-3 w-7 rounded-[3px] border" style={{ borderColor: rating.color }}>
          <div
            className="absolute inset-y-0 left-0 rounded-[1px] transition-all duration-500"
            style={{ width: `${batteryWidth}%`, backgroundColor: rating.color }}
          />
        </div>
        <div className="h-1.5 w-0.5 rounded-r-sm" style={{ backgroundColor: rating.color }} />
      </div>

      {rating.stars === 5 && (
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-bold ${compact ? 'text-[8px]' : 'text-[9px]'}`}
          style={{ backgroundColor: rating.color, color: '#fff' }}
        >
          <Zap size={compact ? 8 : 10} fill="currentColor" />
          EMLAKTA KAZAN
        </span>
      )}
    </div>
  );
}
