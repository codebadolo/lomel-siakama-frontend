import { useNavigate } from 'react-router-dom'
import { MessageSquare, ArrowRight, Plus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { MessagePreview } from '@/types'

const MOCK: MessagePreview[] = [
  { id: 1, nom_expediteur: 'Koné Aboubakar',    objet: 'Absence de mon fils hier matin',        statut: 'en_attente', statut_label: 'En attente', cree_le: new Date(Date.now() - 1.2 * 3600_000).toISOString(), nb_reponses: 0 },
  { id: 2, nom_expediteur: 'Bamba Fatoumata',   objet: 'Question sur les frais du 3e trimestre', statut: 'en_attente', statut_label: 'En attente', cree_le: new Date(Date.now() - 3.5 * 3600_000).toISOString(), nb_reponses: 0 },
  { id: 3, nom_expediteur: 'Coulibaly Seydou',  objet: 'Demande de rendez-vous urgent',          statut: 'repondu',    statut_label: 'Répondu',    cree_le: new Date(Date.now() - 6   * 3600_000).toISOString(), nb_reponses: 2 },
  { id: 4, nom_expediteur: 'Traoré Awa',        objet: 'Résultats du 2ème trimestre',            statut: 'repondu',    statut_label: 'Répondu',    cree_le: new Date(Date.now() - 26  * 3600_000).toISOString(), nb_reponses: 1 },
  { id: 5, nom_expediteur: 'Ouédraogo Ibrahim', objet: 'Retards répétés de mon enfant',          statut: 'clos',       statut_label: 'Clôturé',    cree_le: new Date(Date.now() - 50  * 3600_000).toISOString(), nb_reponses: 4 },
]

const STATUS_STYLE: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-700',
  repondu:    'bg-emerald-100 text-emerald-700',
  clos:       'bg-gray-100 text-gray-500',
}

export function RecentMessages() {
  const navigate = useNavigate()
  const pending = MOCK.filter((m) => m.statut === 'en_attente').length

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl transition-all duration-500 hover:shadow-xl flex flex-col animate-slide-in-up" style={{ animationDelay: '500ms' }}>
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Messages récents</h3>
          {pending > 0 && (
            <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse">
              {pending} en attente
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/messages')}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Tout voir <ArrowRight size={12} />
        </button>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {MOCK.map((msg, i) => (
          <button
            key={msg.id}
            onClick={() => navigate('/messages')}
            style={{ animationDelay: `${550 + i * 80}ms` }}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary transition-all duration-300 text-left group animate-slide-in-up"
          >
            <div className="ring-2 ring-primary/10 group-hover:ring-primary/30 rounded-full transition-all duration-300 group-hover:scale-105">
              <Avatar name={msg.nom_expediteur} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{msg.nom_expediteur}</p>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(msg.cree_le), { addSuffix: true, locale: fr })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground truncate flex-1">{msg.objet}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap transition-all duration-300 group-hover:scale-105 ${STATUS_STYLE[msg.statut]}`}>
                  {msg.statut_label}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-[var(--border)]">
        <button
          onClick={() => navigate('/messages')}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all duration-300 hover:shadow-md"
        >
          <Plus size={13} />
          Nouveau message
        </button>
      </div>
    </div>
  )
}
