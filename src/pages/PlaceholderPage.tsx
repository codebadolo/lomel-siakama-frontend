import { Construction } from 'lucide-react'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-[1400px]">
      <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">{title}</h1>
      <div className="bg-white border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
          <Construction size={22} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">En développement</p>
        <p className="text-xs text-gray-400 mt-1">Cette section sera disponible prochainement.</p>
      </div>
    </div>
  )
}
