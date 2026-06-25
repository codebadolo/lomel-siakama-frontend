import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Archive, Edit2, Users, X, Download } from 'lucide-react'
import { studentsApi, type Eleve } from '@/api/students.api'
import { schoolsApi, type Classe } from '@/api/schools.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'

const schema = z.object({
  nom:            z.string().min(1, 'Nom requis'),
  prenom:         z.string().min(1, 'Prénom requis'),
  sexe:           z.enum(['M', 'F', '']).optional(),
  date_naissance: z.string().optional(),
  classe:         z.number().nullable().optional(),
})
type FormValues = z.infer<typeof schema>

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ElevesPage() {
  const qc      = useQueryClient()
  const user    = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const [classeFilter, setClasseFilter] = useState<string | number>('')
  const [sexeFilter,   setSexeFilter]   = useState<string | number>('')
  const [archiveFilter,setArchiveFilter]= useState<string | number>('')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(20)
  const [modal,        setModal]        = useState<Eleve | null | false>(false)
  const [confirmArchive, setConfirmArchive] = useState<Eleve | null>(null)
  const [exporting,    setExporting]    = useState(false)

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolsApi.listClasses(),
  })
  const classes = classesData?.resultats ?? []

  const { data: elevesData, isLoading } = useQuery({
    queryKey: ['eleves', classeFilter, sexeFilter, archiveFilter, search, page, pageSize],
    queryFn: () => studentsApi.list({
      classe:       classeFilter ? Number(classeFilter) : undefined,
      search:       search || undefined,
      est_archive:  archiveFilter === 'true' ? true : archiveFilter === 'false' ? false : undefined,
      taille_page:  pageSize,
      page,
    }),
  })
  const eleves = elevesData?.resultats ?? []

  const archiveMutation = useMutation({
    mutationFn: (eleve: Eleve) =>
      eleve.est_archive ? studentsApi.desarchiver(eleve.id) : studentsApi.archiver(eleve.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eleves'] })
      setConfirmArchive(null)
    },
  })

  const nbGarcons = eleves.filter((e) => e.sexe === 'M').length
  const nbFilles  = eleves.filter((e) => e.sexe === 'F').length

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await studentsApi.exportExcel(
        classeFilter ? { classe_id: Number(classeFilter) } : undefined
      )
      downloadBlob(blob, 'eleves_export.xlsx')
    } finally {
      setExporting(false)
    }
  }

  const columns: ColumnDef<Eleve>[] = [
    {
      header: 'Matricule',
      accessor: 'matricule',
      cell: (row) => (
        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {row.matricule}
        </span>
      ),
    },
    {
      header: 'Nom complet',
      accessor: 'nom_complet',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={`${row.prenom} ${row.nom}`} size="sm" />
          <span className="font-medium text-gray-900">{row.prenom} {row.nom}</span>
        </div>
      ),
    },
    {
      header: 'Classe',
      accessor: 'nom_classe',
      cell: (row) => row.nom_classe
        ? <Badge variant="neutral">{row.nom_classe}</Badge>
        : <span className="text-xs text-gray-400">—</span>,
    },
    {
      header: 'Sexe',
      accessor: 'sexe',
      cell: (row) => (
        <span className="text-gray-600 text-xs">
          {row.sexe === 'M' ? 'Masculin' : row.sexe === 'F' ? 'Féminin' : '—'}
        </span>
      ),
    },
    {
      header: 'Statut',
      accessor: 'est_archive',
      cell: (row) => row.est_archive
        ? <Badge variant="warning">Archivé</Badge>
        : <Badge variant="success">Actif</Badge>,
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Élèves"
        subtitle={`${elevesData?.total ?? '—'} élève${(elevesData?.total ?? 0) > 1 ? 's' : ''} au total`}
        breadcrumb={[
          { label: 'Tableau de bord', href: '/dashboard' },
          { label: 'Élèves' },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download size={13} />}
              onClick={handleExport}
              loading={exporting}
            >
              Export Excel
            </Button>
            <Button leftIcon={<Plus size={14} />} onClick={() => setModal(null)}>
              Nouvel élève
            </Button>
          </>
        }
      />

      {/* StatCards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-50 mb-3">
            <Users size={16} className="text-indigo-600" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">Total élèves</p>
          <p className="text-lg font-bold text-gray-900">{elevesData?.total ?? '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 mb-3">
            <Users size={16} className="text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">Garçons</p>
          <p className="text-lg font-bold text-gray-900">{nbGarcons}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-pink-50 mb-3">
            <Users size={16} className="text-pink-600" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">Filles</p>
          <p className="text-lg font-bold text-gray-900">{nbFilles}</p>
        </div>
      </div>

      <DataTable
        data={eleves}
        columns={columns}
        total={elevesData?.total}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        loading={isLoading}
        searchable
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Nom, prénom, matricule…"
        filters={[
          {
            key: 'classe',
            label: 'Toutes les classes',
            options: classes.map((c) => ({ value: c.id, label: c.nom })),
          },
          {
            key: 'sexe',
            label: 'Tous sexes',
            options: [
              { value: 'M', label: 'Masculin' },
              { value: 'F', label: 'Féminin' },
            ],
          },
          {
            key: 'archive',
            label: 'Statut',
            options: [
              { value: 'false', label: 'Actifs' },
              { value: 'true', label: 'Archivés' },
            ],
          },
        ]}
        filterValues={{ classe: classeFilter, sexe: sexeFilter, archive: archiveFilter }}
        onFilterChange={(key, value) => {
          setPage(1)
          if (key === 'classe') setClasseFilter(value)
          else if (key === 'sexe') setSexeFilter(value)
          else if (key === 'archive') setArchiveFilter(value)
        }}
        emptyMessage="Aucun élève trouvé"
        onRowClick={(row) => navigate(`/eleves/${row.id}`)}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setModal(row)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="Modifier"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => setConfirmArchive(row)}
              className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
              title={row.est_archive ? 'Désarchiver' : 'Archiver'}
            >
              <Archive size={13} />
            </button>
          </div>
        )}
      />

      {modal !== false && (
        <EleveFormModal
          eleve={modal}
          classes={classes}
          ecoleId={user?.ecole ?? 0}
          onClose={() => setModal(false)}
        />
      )}
      {confirmArchive && (
        <ConfirmModal
          title={confirmArchive.est_archive ? "Désarchiver l'élève" : "Archiver l'élève"}
          body={
            confirmArchive.est_archive
              ? `${confirmArchive.prenom} ${confirmArchive.nom} sera réactivé.`
              : `Le dossier de ${confirmArchive.prenom} ${confirmArchive.nom} sera archivé. Ses données sont conservées.`
          }
          confirmLabel={confirmArchive.est_archive ? 'Désarchiver' : 'Archiver'}
          isPending={archiveMutation.isPending}
          onClose={() => setConfirmArchive(null)}
          onConfirm={() => archiveMutation.mutate(confirmArchive)}
        />
      )}
    </div>
  )
}

function EleveFormModal({ eleve, classes, ecoleId, onClose }: {
  eleve: Eleve | null
  classes: Classe[]
  ecoleId: number
  onClose: () => void
}) {
  const qc     = useQueryClient()
  const isEdit = Boolean(eleve)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: eleve ? {
      nom:            eleve.nom,
      prenom:         eleve.prenom,
      sexe:           eleve.sexe || '',
      date_naissance: eleve.date_naissance ?? '',
      classe:         eleve.classe,
    } : { sexe: '', classe: null },
  })

  const saveMutation = useMutation({
    mutationFn: (v: FormValues) => isEdit
      ? studentsApi.update(eleve!.id, { ...v, ecole: ecoleId })
      : studentsApi.create({ ...v, ecole: ecoleId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eleves'] })
      qc.invalidateQueries({ queryKey: ['classes'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Modifier l'élève" : 'Nouvel élève'}
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" {...register('prenom')} error={errors.prenom?.message} />
            <Input label="Nom"    {...register('nom')}    error={errors.nom?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
              <select
                {...register('sexe')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <Input label="Date de naissance" type="date" {...register('date_naissance')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
            <select
              {...register('classe', { setValueAs: (v) => v ? Number(v) : null })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— Aucune —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          {saveMutation.isError && <p className="text-xs text-red-500">Une erreur s'est produite.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" size="sm" loading={saveMutation.isPending}>
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmModal({ title, body, confirmLabel, isPending, onClose, onConfirm }: {
  title: string; body: string; confirmLabel: string
  isPending: boolean; onClose: () => void; onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-5">{body}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button variant="danger" size="sm" loading={isPending} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
