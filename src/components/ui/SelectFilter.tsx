import { cn } from '@/lib/utils'

interface SelectFilterProps {
  value: string | number | ''
  onChange: (v: string | number | '') => void
  options: { value: string | number; label: string }[]
  placeholder?: string
  className?: string
}

export function SelectFilter({ value, onChange, options, placeholder, className }: SelectFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'border border-gray-200 rounded-md text-sm px-3 py-1.5 bg-white text-gray-700',
        'focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500',
        className
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
