import { cn } from '@/lib/utils'

const SIZES  = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
const COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500']

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

const colorFor = (name: string) =>
  COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % COLORS.length]

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return <img src={src} alt={name} className={cn('rounded-full object-cover shrink-0', SIZES[size], className)} />
  }
  return (
    <div className={cn('rounded-full flex items-center justify-center shrink-0 text-white font-semibold', SIZES[size], colorFor(name || 'U'), className)}>
      {initials(name || 'U')}
    </div>
  )
}
