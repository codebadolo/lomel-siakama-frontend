import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, X, Trash2 } from 'lucide-react'
import { attendanceApi, type Creneau } from '@/api/attendance.api'
import { schoolsApi } from '@/api/schools.api'
import { usersApi } from '@/api/users.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function EmploiDuTempsPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { isAdmin } = usePermissions()

  const [filterClasse, setFilterClasse] = useState<string | number>('')
  const [showModal,    setShowModal]    = useState(false)

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn:  () => schoolsApi.listClasses(),
  })
  const classes = classesData?.resultats ?? []

  const { data: creneauxData, isLoading } = useQuery({
    queryKey: ['creneaux', filterClasse],
    queryFn: () => attendanceApi.listCreneaux(filterClasse ? { classe: Number(filterClasse) } : undefined),
    enabled: !!filterClasse || !isAdmin,
  })
  const creneaux: Creneau[] = creneauxData?.resultats ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => attendanceApi.deleteCreneau(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['creneaux'] }),
  })

  const columns: ColumnDef<Creneau>[] = [
    {
      header: 'Jour',
      accessor: 'jour_semaine',
      cell: (row) => (
        <span className="font-medium text-gray-900">
          {JOURS[(row.jour_semaine - 1)] ?? row.jour_semaine}
        </span>
      ),
    },
    {
      header: 'Heure début',
      accessor: 'heure_debut',
      cell: (row) => <span className="text-gray-700">{row.heure_debut.slice(0, 5)}</span>,
    },
    {
      header: 'Heure fin',
      accessor: 'heure_fin',
      cell: (row) => <span className="text-gray-700">{row.heure_fin.slice(0, 5)}</span>,
    },
    {
      header: 'Matière',
      accessor: 'nom_matiere',
      cell: (row) => <span className="text-gray-700">{row.nom_matiere}</span>,
    },
    {
      header: 'Classe',
      accessor: 'nom_classe',
      cell: (row) => <span className="text-gray-600">{row.nom_classe}</span>,
    },
    {
      header: 'Enseignant',
      accessor: 'nom_enseignant',
      cell: (row) => <span className="text-gray-500">{row.nom_enseignant || '—'}</span>,
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Emploi du temps"
        subtitle="Créneaux hebdomadaires par classe"
        actions={
          isAdmin ? (
            <Button leftIcon={<Plus size={14} />} onClick={() => setShowModal(true)}>
              Ajouter un créneau
            </Button>
          ) : undefined
        }
      />

      <DataTable
        data={creneaux}
        columns={columns}
        loading={isLoading}
        filters={[
          {
            key: 'classe',
            label: 'Toutes les classes',
            options: classes.map((c) => ({ value: c.id, label: c.nom })),
          },
        ]}
        filterValues={{ classe: filterClasse }}
        onFilterChange={(key, value) => {
          if (key === 'classe') setFilterClasse(value)
        }}
        emptyMessage={filterClasse ? 'Aucun créneau pour cette classe' : 'Sélectionnez une classe pour voir les créneaux'}
        actions={isAdmin ? (row) => (
          <button
            onClick={() => { if (confirm('Supprimer ce créneau ?')) deleteMutation.mutate(row.id) }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Supprimer"
          >
            <Trash2 size={13} />
          </button>
        ) : undefined}
      />

      {showModal && (
        <CreneauModal
          classeId={filterClasse ? Number(filterClasse) : undefined}
          classes={classes}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ['creneaux'] }) }}
          ecoleId={user?.ecole}
        />
      )}
    </div>
  )
}

interface CreneauFormData {
  classe:       string
  jour_semaine: string
  heure_debut:  string
  heure_fin:    string
  matiere:      string
  enseignant:   string
}

function CreneauModal({ classeId, classes, onClose, onSuccess, ecoleId }: {
  classeId?: number
  classes: import('@/api/schools.api').Classe[]
  onClose: () => void
  onSuccess: () => void
  ecoleId?: number | null
}) {
  const { register, handleSubmit } = useForm<CreneauFormData>({
    defaultValues: { classe: classeId ? String(classeId) : '' },
  })

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { apiClient } = await import('@/api/client')
      const { data } = await apiClient.get('/matieres/')
      return data
    },
  })

  const { data: teachersData } = useQuery({
    queryKey: ['enseignants'],
    queryFn: () => usersApi.list({ role: 'enseignant' }),
  })

  const mutation = useMutation({
    mutationFn: async (d: CreneauFormData) => {
      const { apiClient } = await import('@/api/client')
      await apiClient.post('/emploi-du-temps/', {
        classe:       Number(d.classe),
        jour_semaine: Number(d.jour_semaine),
        heure_debut:  d.heure_debut,
        heure_fin:    d.heure_fin,
        matiere:      Number(d.matiere),
        enseignant:   Number(d.enseignant),
        ecole:        ecoleId,
      })
    },
    onSuccess,
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Ajouter un créneau</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe *</label>
            <select {...register('classe', { required: true })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">— Classe —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jour *</label>
            <select {...register('jour_semaine', { required: true })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">— Jour —</option>
              {JOURS.map((j, i) => <option key={i + 1} value={i + 1}>{j}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début *</label>
              <Input type="time" {...register('heure_debut', { required: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
              <Input type="time" {...register('heure_fin', { required: true })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matière *</label>
            <select {...register('matiere', { required: true })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">— Matière —</option>
              {(subjectsData?.resultats ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enseignant *</label>
            <select {...register('enseignant', { required: true })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">— Enseignant —</option>
              {(teachersData?.resultats ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.nom_complet}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" size="sm" loading={mutation.isPending}>Ajouter</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
