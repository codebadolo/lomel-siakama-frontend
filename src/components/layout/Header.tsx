import { Bell, Search } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function Header() {
  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })
  const label = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <header className="h-[52px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <p className="text-sm text-gray-400">{label}</p>

      <div className="flex items-center gap-1.5">
        <button className="flex items-center gap-2 text-sm text-gray-400 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-md">
          <Search size={13} />
          <span>Rechercher…</span>
          <kbd className="ml-1 text-[10px] bg-white border border-gray-300 rounded px-1 py-px text-gray-400">⌘K</kbd>
        </button>

        <button className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
          <Bell size={17} />
          <span className="absolute top-[7px] right-[7px] w-1.5 h-1.5 bg-indigo-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
