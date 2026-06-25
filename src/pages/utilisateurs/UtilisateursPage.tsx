import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Edit2, UserX } from 'lucide-react'
import { usersApi, type Utilisateur } from '@/api/users.api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { UserFormModal, ConfirmDeactivateModal } from './components/UserFormModal'

const ROLE_BADGE: Record<string, 'warning' | 'success' | 'neutral'> = {
  admin:        'warning',
  enseignant:   'success',
  parent:       'neutral',
  promoteur:    'neutral',
  surveillant:  'neutral',
}

const ROLE_LABEL: Record<string, string> = {
  admin:        'Administrateur',
  enseignant:   'Enseignant',
  parent:       'Parent',
  promoteur:    'Promoteur',
  surveillant:  'Surveillant',
}

export default function UtilisateursPage() {
  const qc = useQueryClient()

  const [search,       setSearch]   = useState('')
  const [roleFilter,   setRole]     = useState<string | number>('')
  const [statusFilter, setStatus]   = useState<string | number>('')
  const [page,         setPage]     = useState(1)
  const [pageSize,     setPageSize] = useState(20)

  const [modalUser,   setModalUser]   = useState<Utilisateur | null | false>(false)
  const [confirmUser, setConfirmUser] = useState<Utilisateur | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['utilisateurs', search, roleFilter, statusFilter, page, pageSize],
    queryFn: () => usersApi.list({
      search:    search || undefined,
      role:      roleFilter ? String(roleFilter) : undefined,
      is_active: statusFilter === '' ? undefined : statusFilter === 'true',
      page,
    }),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utilisateurs'] })
      setConfirmUser(null)
    },
  })

  const columns: ColumnDef<Utilisateur>[] = [
    {
      header: 'Utilisateur',
      accessor: 'nom_complet',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.nom_complet} size="sm" />
          <div>
            <p className="font-medium text-gray-900">{row.nom_complet}</p>
            <p className="text-xs text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Rôle',
      accessor: 'role',
      cell: (row) => (
        <Badge variant={ROLE_BADGE[row.role] ?? 'neutral'}>
          {ROLE_LABEL[row.role] ?? row.role}
        </Badge>
      ),
    },
    {
      header: 'Téléphone',
      accessor: 'telephone',
      cell: (row) => <span className="text-gray-600">{row.telephone || '—'}</span>,
    },
    {
      header: 'Statut',
      accessor: 'is_active',
      cell: (row) => row.is_active ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Actif
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Inactif
        </span>
      ),
    },
    {
      header: 'Créé',
      accessor: 'cree_le',
      cell: (row) => (
        <span className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(row.cree_le), { addSuffix: true, locale: fr })}
        </span>
      ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Utilisateurs"
        subtitle={`${data?.total ?? '—'} compte${(data?.total ?? 0) > 1 ? 's' : ''} dans votre établissement`}
        actions={
          <Button leftIcon={<Plus size={14} />} onClick={() => setModalUser(null)}>
            Nouveau compte
          </Button>
        }
      />

      <DataTable
        data={data?.resultats ?? []}
        columns={columns}
        total={data?.total}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        loading={isLoading}
        searchable
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Rechercher un utilisateur…"
        filters={[
          {
            key: 'role',
            label: 'Tous les rôles',
            options: [
              { value: 'admin',       label: 'Administrateur' },
              { value: 'enseignant',  label: 'Enseignant' },
              { value: 'parent',      label: 'Parent' },
              { value: 'promoteur',   label: 'Promoteur' },
              { value: 'surveillant', label: 'Surveillant' },
            ],
          },
          {
            key: 'statut',
            label: 'Tous les statuts',
            options: [
              { value: 'true',  label: 'Actifs' },
              { value: 'false', label: 'Inactifs' },
            ],
          },
        ]}
        filterValues={{ role: roleFilter, statut: statusFilter }}
        onFilterChange={(key, value) => {
          setPage(1)
          if (key === 'role')   setRole(value)
          if (key === 'statut') setStatus(value)
        }}
        emptyMessage="Aucun utilisateur trouvé"
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setModalUser(row)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="Modifier"
            >
              <Edit2 size={14} />
            </button>
            {row.is_active && (
              <button
                onClick={() => setConfirmUser(row)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Désactiver"
              >
                <UserX size={14} />
              </button>
            )}
          </div>
        )}
      />

      {modalUser !== false && (
        <UserFormModal user={modalUser} onClose={() => setModalUser(false)} />
      )}
      {confirmUser && (
        <ConfirmDeactivateModal
          user={confirmUser}
          onClose={() => setConfirmUser(null)}
          onConfirm={() => deactivateMutation.mutate(confirmUser.id)}
          isPending={deactivateMutation.isPending}
        />
      )}
    </div>
  )
}
