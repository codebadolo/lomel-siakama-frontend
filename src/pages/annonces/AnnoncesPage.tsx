import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { messagesApi, type Annonce } from '@/api/messages.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import { AnnonceFormModal } from '../messages/components/AnnonceFormModal'

const PUBLIC_BADGE: Record<string, 'neutral' | 'warning' | 'success'> = {
  tous:        'neutral',
  parents:     'warning',
  enseignants: 'success',
}

export default function AnnoncesPage() {
  const qc = useQueryClient()
  const { isAdmin } = usePermissions()

  const [filterActif,  setFilterActif]  = useState<string | number>('')
  const [filterPublic, setFilterPublic] = useState<string | number>('')
  const [modalAnnonce, setModalAnnonce] = useState<Annonce | null | false>(false)

  const { data, isLoading } = useQuery({
    queryKey: ['annonces', filterActif, filterPublic],
    queryFn: () => messagesApi.listAnnonces({
      est_active:   filterActif === '' ? undefined : filterActif === 'true',
      public_cible: filterPublic ? String(filterPublic) : undefined,
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => messagesApi.deleteAnnonce(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['annonces'] }),
  })

  const annonces: Annonce[] = data?.resultats ?? []

  const columns: ColumnDef<Annonce>[] = [
    {
      header: 'Titre',
      accessor: 'titre',
      cell: (row) => <span className="font-medium text-gray-900">{row.titre}</span>,
    },
    {
      header: 'Public cible',
      accessor: 'public_cible',
      cell: (row) => (
        <Badge variant={PUBLIC_BADGE[row.public_cible] ?? 'neutral'}>
          {row.public_label}
        </Badge>
      ),
    },
    {
      header: 'Statut',
      accessor: 'est_active',
      cell: (row) => row.est_active ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Inactive
        </span>
      ),
    },
    {
      header: 'Auteur',
      accessor: 'nom_auteur',
      cell: (row) => <span className="text-gray-600 text-sm">{row.nom_auteur}</span>,
    },
    {
      header: 'Publié le',
      accessor: 'publie_le',
      cell: (row) => (
        <span className="text-gray-400 text-xs">
          {format(new Date(row.publie_le), 'd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Annonces"
        subtitle={`${data?.total ?? 0} annonce${(data?.total ?? 0) > 1 ? 's' : ''}`}
        actions={
          isAdmin ? (
            <Button leftIcon={<Plus size={14} />} onClick={() => setModalAnnonce(null)}>
              Nouvelle annonce
            </Button>
          ) : undefined
        }
      />

      <DataTable
        data={annonces}
        columns={columns}
        loading={isLoading}
        filters={[
          {
            key: 'statut',
            label: 'Tous les statuts',
            options: [
              { value: 'true',  label: 'Actives' },
              { value: 'false', label: 'Inactives' },
            ],
          },
          {
            key: 'public',
            label: 'Tous les publics',
            options: [
              { value: 'parents',     label: 'Parents' },
              { value: 'enseignants', label: 'Enseignants' },
            ],
          },
        ]}
        filterValues={{ statut: filterActif, public: filterPublic }}
        onFilterChange={(key, value) => {
          if (key === 'statut') setFilterActif(value)
          if (key === 'public') setFilterPublic(value)
        }}
        emptyMessage="Aucune annonce trouvée"
        actions={isAdmin ? (row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setModalAnnonce(row)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="Modifier"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => { if (confirm('Supprimer cette annonce ?')) deleteMutation.mutate(row.id) }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Supprimer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ) : undefined}
      />

      {modalAnnonce !== false && (
        <AnnonceFormModal annonce={modalAnnonce} onClose={() => setModalAnnonce(false)} />
      )}
    </div>
  )
}
