import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Paperclip } from 'lucide-react'
import type { MessagePreview } from '@/api/messages.api'

const STATUT: Record<string, 'warning' | 'success' | 'neutral'> = {
  en_attente: 'warning',
  repondu:    'success',
  clos:       'neutral',
}

interface Props {
  messages: MessagePreview[]
  selectedId: number | null
  onSelect: (id: number) => void
  loading?: boolean
}

export function MessageList({ messages, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="divide-y divide-gray-100">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="h-2.5 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-sm font-medium text-gray-500">Aucun message</p>
        <p className="text-xs text-gray-400 mt-1">Les messages des parents apparaîtront ici.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {messages.map((msg) => (
        <button
          key={msg.id}
          onClick={() => onSelect(msg.id)}
          className={cn(
            'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors',
            selectedId === msg.id
              ? 'bg-indigo-50 border-r-2 border-indigo-600'
              : 'hover:bg-gray-50'
          )}
        >
          <Avatar name={msg.nom_expediteur} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <p className={cn('text-sm truncate', msg.statut === 'en_attente' ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>
                {msg.nom_expediteur}
              </p>
              <span className="text-[11px] text-gray-400 shrink-0">
                {formatDistanceToNow(new Date(msg.cree_le), { addSuffix: true, locale: fr })}
              </span>
            </div>
            <p className={cn('text-xs truncate mb-1.5', msg.statut === 'en_attente' ? 'text-gray-700' : 'text-gray-500')}>
              {msg.objet}
            </p>
            <div className="flex items-center gap-1.5">
              <Badge variant={STATUT[msg.statut]}>{msg.statut_label}</Badge>
              {msg.nb_reponses > 0 && (
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <Paperclip size={10} /> {msg.nb_reponses}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
