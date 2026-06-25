import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { schoolsApi, type Classe } from '@/api/schools.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'

const NIVEAU_CHOICES = [
  { value: '',      label: '— Aucun —' },
  { value: 'CP',    label: 'CP' },
  { value: 'CE1',   label: 'CE1' },
  { value: 'CE2',   label: 'CE2' },
  { value: 'CM1',   label: 'CM1' },
  { value: 'CM2',   label: 'CM2' },
  { value: '6eme',  label: '6ème' },
  { value: '5eme',  label: '5ème' },
  { value: '4eme',  label: '4ème' },
  { value: '3eme',  label: '3ème' },
  { value: '2nde',  label: '2nde' },
  { value: '1ere',  label: '1ère' },
  { value: 'Tle',   label: 'Terminale' },
]

const SERIE_CHOICES = [
  { value: '',  label: '— Sans série —' },
  { value: 'A', label: 'Série A (Littéraire)' },
  { value: 'D', label: 'Série D (Sciences naturelles)' },
  { value: 'C', label: 'Série C (Sciences exactes)' },
]

const LYCEE_NIVEAUX = ['2nde', '1ere', 'Tle']

const schema = z.object({
  nom:      z.string().min(1, 'Nom requis'),
  niveau:   z.string().optional(),
  serie:    z.string().optional(),
  capacite: z.number({ coerce: true }).int().min(1).max(200).default(40),
})
type FormValues = z.infer<typeof schema>

export default function ClassesPage() {
  const qc   = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [search,        setSearch]        = useState('')
  const [modal,         setModal]         = useState<Classe | null | false>(false)
  const [confirmDelete, setConfirmDelete] = useState<Classe | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['classes', search],
    queryFn: () => schoolsApi.listClasses({ search: search || undefined }),
  })
  const classes = data?.resultats ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => schoolsApi.deleteClasse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      setConfirmDelete(null)
    },
  })

  const columns: ColumnDef<Classe>[] = [
    {
      header: 'Nom',
      accessor: 'nom',
      cell: (row) => <span className="font-medium text-gray-900">{row.nom}</span>,
    },
    {
      header: 'Niveau',
      accessor: 'niveau',
      cell: (row) => row.niveau
        ? <span className="text-gray-600 text-xs">{row.niveau}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      header: 'Série',
      accessor: 'serie',
      cell: (row) => row.serie
        ? <Badge variant="neutral">Série {row.serie}</Badge>
        : <span className="text-gray-300">—</span>,
    },
    {
      header: 'Effectif',
      accessor: 'nombre_eleves',
      cell: (row) => (
        <span className="text-gray-700 text-sm">
          {row.nombre_eleves}
          <span className="text-gray-400">/{row.capacite}</span>
        </span>
      ),
    },
    {
      header: 'Statut',
      accessor: 'est_pleine',
      cell: (row) => row.est_pleine
        ? <Badge variant="danger">Pleine</Badge>
        : <Badge variant="success">Disponible</Badge>,
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Classes"
        subtitle={`${data?.total ?? '—'} classe${(data?.total ?? 0) > 1 ? 's' : ''} dans votre établissement`}
        actions={
          <Button leftIcon={<Plus size={14} />} onClick={() => setModal(null)}>
            Nouvelle classe
          </Button>
        }
      />

      <DataTable
        data={classes}
        columns={columns}
        loading={isLoading}
        searchable
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Chercher une classe…"
        emptyMessage="Aucune classe trouvée"
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
              onClick={() => setConfirmDelete(row)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Supprimer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      />

      {modal !== false && (
        <ClasseFormModal
          classe={modal}
          ecoleId={user?.ecole ?? 0}
          onClose={() => setModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['classes'] })
            setModal(false)
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Supprimer la classe"
          body={`La classe "${confirmDelete.nom}" sera supprimée définitivement. Impossible si des élèves y sont affectés.`}
          confirmLabel="Supprimer"
          isPending={deleteMutation.isPending}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
          error={deleteMutation.isError ? 'Impossible : des élèves sont encore dans cette classe.' : undefined}
        />
      )}
    </div>
  )
}

function ClasseFormModal({ classe, ecoleId, onClose, onSuccess }: {
  classe: Classe | null
  ecoleId: number
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = Boolean(classe)
  const [niveau, setNiveau] = useState(classe?.niveau ?? '')
  const isLycee = LYCEE_NIVEAUX.includes(niveau)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: classe
      ? { nom: classe.nom, niveau: classe.niveau ?? '', serie: classe.serie ?? '', capacite: classe.capacite }
      : { niveau: '', serie: '', capacite: 40 },
  })

  const mutation = useMutation({
    mutationFn: (v: FormValues) => isEdit
      ? schoolsApi.updateClasse(classe!.id, { ...v, ecole: ecoleId })
      : schoolsApi.createClasse({ ...v, ecole: ecoleId }),
    onSuccess,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Modifier la classe' : 'Nouvelle classe'}
          </h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="px-6 py-5 space-y-4">
          <Input label="Nom de la classe" {...register('nom')} error={errors.nom?.message} placeholder="Ex : 6ème A" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
              <select
                {...register('niveau')}
                onChange={(e) => setNiveau(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {NIVEAU_CHOICES.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Capacité max."
              type="number"
              min={1}
              max={200}
              {...register('capacite', { valueAsNumber: true })}
              error={errors.capacite?.message}
            />
          </div>

          {isLycee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Série</label>
              <select
                {...register('serie')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {SERIE_CHOICES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {mutation.isError && (
            <p className="text-xs text-red-500">Une erreur s'est produite.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" size="sm" loading={mutation.isPending}>
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmModal({ title, body, confirmLabel, isPending, onClose, onConfirm, error }: {
  title: string; body: string; confirmLabel: string
  isPending: boolean; onClose: () => void; onConfirm: () => void
  error?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-4">{body}</p>
        {error && <p className="text-xs text-red-500 mb-4">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button variant="danger" size="sm" loading={isPending} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
