import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Edit2, Trash2, FileText, Users, UserCheck } from 'lucide-react'
import { messagesApi, type Annonce } from '@/api/messages.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AnnonceFormModal } from './AnnonceFormModal'
import { cn } from '@/lib/utils'

const PUBLIC_ICON: Record<string, React.ReactNode> = {
  tous:         <Users size={11} />,
  parents:      <Users size={11} />,
  enseignants:  <UserCheck size={11} />,
}

const PUBLIC_BADGE: Record<string, 'neutral' | 'warning' | 'success'> = {
  tous:         'neutral',
  parents:      'warning',
  enseignants:  'success',
}

interface Props {
  canManage: boolean
}

export function AnnoncePanel({ canManage }: Props) {
  const qc = useQueryClient()
  const [modalAnnonce, setModalAnnonce] = useState<Annonce | null | false>(false)
  const [filterActif, setFilterActif] = useState<boolean | undefined>(undefined)

  const { data, isLoading } = useQuery({
    queryKey: ['annonces', filterActif],
    queryFn: () => messagesApi.listAnnonces(filterActif !== undefined ? { est_active: filterActif } : undefined),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => messagesApi.deleteAnnonce(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annonces'] }),
  })

  const annonces: Annonce[] = data?.resultats ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Toutes', value: undefined },
            { label: 'Actives', value: true },
            { label: 'Inactives', value: false },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setFilterActif(opt.value)}
              className={cn(
                'text-xs px-3 py-1 rounded-full border transition-colors',
                filterActif === opt.value
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {canManage && (
          <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => setModalAnnonce(null)}>
            Nouvelle
          </Button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-4 animate-pulse space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="h-2.5 bg-gray-100 rounded w-full" />
              <div className="h-2.5 bg-gray-100 rounded w-4/5" />
            </div>
          ))
        ) : annonces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500">Aucune annonce</p>
            <p className="text-xs text-gray-400 mt-1">Les annonces publiées apparaîtront ici.</p>
          </div>
        ) : (
          annonces.map((a) => (
            <AnnonceCard
              key={a.id}
              annonce={a}
              canManage={canManage}
              onEdit={() => setModalAnnonce(a)}
              onDelete={() => {
                if (confirm('Supprimer cette annonce ?')) deleteMutation.mutate(a.id)
              }}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {modalAnnonce !== false && (
        <AnnonceFormModal
          annonce={modalAnnonce}
          onClose={() => setModalAnnonce(false)}
        />
      )}
    </div>
  )
}

function AnnonceCard({
  annonce, canManage, onEdit, onDelete,
}: {
  annonce: Annonce
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-colors',
      annonce.est_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'
    )}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{annonce.titre}</h3>
          <Badge variant={PUBLIC_BADGE[annonce.public_cible]}>
            <span className="flex items-center gap-1">
              {PUBLIC_ICON[annonce.public_cible]}
              {annonce.public_label}
            </span>
          </Badge>
          {!annonce.est_active && <Badge variant="neutral">Inactive</Badge>}
        </div>
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{annonce.contenu}</p>

      {annonce.fichier && (
        <a
          href={annonce.fichier}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-md px-2.5 py-1 hover:bg-indigo-50 transition-colors"
        >
          <FileText size={12} />
          Pièce jointe
        </a>
      )}

      <p className="text-[11px] text-gray-400 mt-3">
        {annonce.nom_auteur} · {format(new Date(annonce.publie_le), 'd MMM yyyy', { locale: fr })}
      </p>
    </div>
  )
}
