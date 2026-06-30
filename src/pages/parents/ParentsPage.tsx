import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { parentsApi, type ProfilParent } from '@/api/students.api'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'

const LIEN_LABEL: Record<string, string> = { pere: 'Père', mere: 'Mère', tuteur: 'Tuteur' }

export default function ParentsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['parents', debouncedSearch],
    queryFn: () => parentsApi.list({ search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  })
  const parents = data?.resultats ?? []

  const columns: ColumnDef<ProfilParent>[] = [
    {
      header: 'Nom complet',
      accessor: 'nom_complet',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.nom_complet || 'P'} size="sm" />
          <span className="font-medium text-gray-900">{row.nom_complet}</span>
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
      cell: (row) => <span className="text-gray-600">{row.email || '—'}</span>,
    },
    {
      header: 'Téléphone',
      accessor: 'telephone',
      cell: (row) => <span className="text-gray-600">{row.telephone || '—'}</span>,
    },
    {
      header: 'Enfants',
      accessor: 'enfants',
      cell: (row) => row.enfants.length === 0 ? (
        <span className="text-gray-400 text-xs">Aucun enfant lié</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {row.enfants.map((lien) => (
            <Link
              key={lien.id}
              to={`/eleves/${lien.eleve_id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors"
            >
              {lien.nom_complet}
              <Badge variant="neutral" className="text-[10px]">{LIEN_LABEL[lien.lien]}</Badge>
            </Link>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Parents"
        subtitle={`${data?.total ?? '—'} parent${(data?.total ?? 0) > 1 ? 's' : ''} enregistrés`}
      />

      <DataTable
        data={parents}
        columns={columns}
        loading={isLoading}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Nom, email…"
        emptyMessage="Aucun parent trouvé"
      />
    </div>
  )
}
