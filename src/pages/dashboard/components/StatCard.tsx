import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Color = 'indigo' | 'emerald' | 'amber' | 'red'

const PALETTE: Record<Color, {
  cardBg: string
  cardText: string
  iconBg: string
  iconColor: string
  shadow: string
  arrowBg: string
  arrowColor: string
}> = {
  indigo: {
    cardBg:    'bg-primary',
    cardText:  'text-white',
    iconBg:    'bg-white/20',
    iconColor: 'text-white',
    shadow:    'hover:shadow-[0_8px_30px_rgba(79,70,229,0.35)]',
    arrowBg:   'bg-white/20',
    arrowColor:'text-white',
  },
  emerald: {
    cardBg:    'bg-white',
    cardText:  'text-gray-900',
    iconBg:    'bg-emerald-50',
    iconColor: 'text-emerald-600',
    shadow:    'hover:shadow-[0_8px_30px_rgba(16,185,129,0.2)]',
    arrowBg:   'bg-emerald-100',
    arrowColor:'text-emerald-600',
  },
  amber: {
    cardBg:    'bg-white',
    cardText:  'text-gray-900',
    iconBg:    'bg-amber-50',
    iconColor: 'text-amber-500',
    shadow:    'hover:shadow-[0_8px_30px_rgba(245,158,11,0.2)]',
    arrowBg:   'bg-amber-100',
    arrowColor:'text-amber-600',
  },
  red: {
    cardBg:    'bg-white',
    cardText:  'text-gray-900',
    iconBg:    'bg-red-50',
    iconColor: 'text-red-500',
    shadow:    'hover:shadow-[0_8px_30px_rgba(239,68,68,0.2)]',
    arrowBg:   'bg-red-100',
    arrowColor:'text-red-500',
  },
}

interface StatCardProps {
  title:    string
  value:    string | number
  subtitle?: string
  icon:     LucideIcon
  color?:   Color
  trend?:   { value: number; label: string }
  delay?:   string
}

export function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo', trend, delay = '0ms' }: StatCardProps) {
  const [hovered, setHovered] = useState(false)
  const p = PALETTE[color]
  const up = (trend?.value ?? 0) >= 0
  const isPrimary = color === 'indigo'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ animationDelay: delay }}
      className={cn(
        'animate-slide-in-up rounded-xl p-5 border transition-all duration-500 cursor-pointer',
        'shadow-md',
        p.cardBg,
        p.cardText,
        p.shadow,
        hovered ? 'scale-[1.03] shadow-xl' : '',
        isPrimary ? 'border-transparent' : 'border-[var(--border)]',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className={cn('text-xs font-medium', isPrimary ? 'text-white/80' : 'text-muted-foreground')}>
          {title}
        </h3>
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300',
          p.arrowBg,
          hovered ? 'rotate-45' : '',
        )}>
          <ArrowUpRight size={14} className={p.arrowColor} />
        </div>
      </div>

      <p className="text-[32px] font-bold leading-none tracking-tight mb-2">{value}</p>

      {subtitle && (
        <p className={cn('text-xs', isPrimary ? 'text-white/70' : 'text-muted-foreground')}>{subtitle}</p>
      )}

      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {up
            ? <TrendingUp size={12} className={isPrimary ? 'text-white/80' : 'text-emerald-500'} />
            : <TrendingDown size={12} className={isPrimary ? 'text-white/80' : 'text-red-500'} />}
          <span className={cn('text-xs font-medium', isPrimary ? 'text-white/80' : up ? 'text-emerald-600' : 'text-red-500')}>
            {up ? '+' : ''}{trend.value}%
          </span>
          <span className={cn('text-xs', isPrimary ? 'text-white/60' : 'text-muted-foreground')}>
            {trend.label}
          </span>
        </div>
      )}

      {!trend && !subtitle && (
        <div className={cn('text-xs flex items-center gap-1', isPrimary ? 'text-white/60' : 'text-muted-foreground')}>
          <TrendingUp size={11} />
          <span>Augmenté ce mois</span>
        </div>
      )}

      <div className={cn('mt-4 w-8 h-8 rounded-lg flex items-center justify-center', p.iconBg)}>
        <Icon size={17} className={p.iconColor} />
      </div>
    </div>
  )
}
