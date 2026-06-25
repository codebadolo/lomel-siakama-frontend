import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Trash2, X, ClipboardList, ChevronLeft } from 'lucide-react'
import { evaluationsApi, type Evaluation, type Trimestre } from '@/api/evaluations.api'
import { studentsApi } from '@/api/students.api'
import { schoolsApi } from '@/api/schools.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'

const TYPE_BADGE: Record<string, 'warning' | 'success' | 'neutral'> = {
  devoir:        'neutral',
  composition:   'warning',
  examen:        'success',
  interrogation: 'neutral',
}

const evalSchema = z.object({
  titre:           z.string().min(1, 'Titre requis'),
  date:            z.string().min(1, 'Date requise'),
  trimestre:       z.enum(['T1', 'T2', 'T3']),
  matiere:         z.number({ required_error: 'Matière requise' }),
  classe:          z.number({ required_error: 'Classe requise' }),
  type_evaluation: z.enum(['devoir', 'composition', 'examen', 'interrogation']),
  coefficient:     z.string().default('1.00'),
  note_maximale:   z.string().default('20.00'),
})
type EvalForm = z.infer<typeof evalSchema>

export default function EvaluationsPage() {
  const qc   = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [classeFilter,    setClasseFilter]    = useState<string | number>('')
  const [matiereFilter,   setMatiereFilter]   = useState<string | number>('')
  const [trimestreFilter, setTrimestreFilter] = useState<string | number>('')
  const [selectedEval,    setSelectedEval]    = useState<Evaluation | null>(null)
  const [showModal,       setShowModal]       = useState(false)

  const { data: classesData } = useQuery({ queryKey: ['classes'],  queryFn: () => schoolsApi.listClasses() })
  const { data: matieresData } = useQuery({ queryKey: ['matieres'], queryFn: () => evaluationsApi.listMatieres() })
  const classes  = classesData?.resultats  ?? []
  const matieres = matieresData?.resultats ?? []

  const { data: evalsData, isLoading } = useQuery({
    queryKey: ['evaluations', classeFilter, matiereFilter, trimestreFilter],
    queryFn: () => evaluationsApi.list({
      classe:    classeFilter    ? Number(classeFilter)    : undefined,
      matiere:   matiereFilter   ? Number(matiereFilter)   : undefined,
      trimestre: trimestreFilter ? (trimestreFilter as Trimestre) : undefined,
    }),
  })
  const evaluations = evalsData?.resultats ?? []

  const deleteMutation = useMutation({
    mutationFn: evaluationsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      setSelectedEval(null)
    },
  })

  const columns: ColumnDef<Evaluation>[] = [
    {
      header: 'Titre',
      accessor: 'titre',
      cell: (row) => <span className="font-medium text-gray-900">{row.titre}</span>,
    },
    {
      header: 'Classe',
      accessor: 'nom_classe',
      cell: (row) => <span className="text-gray-600">{row.nom_classe}</span>,
    },
    {
      header: 'Matière',
      accessor: 'nom_matiere',
      cell: (row) => <span className="text-gray-600">{row.nom_matiere}</span>,
    },
    {
      header: 'Date',
      accessor: 'date',
      cell: (row) => (
        <span className="text-gray-500 text-xs">
          {format(new Date(row.date), 'd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
    {
      header: 'Trimestre',
      accessor: 'trimestre',
      cell: (row) => <span className="text-indigo-600 text-xs font-medium">{row.trimestre}</span>,
    },
    {
      header: 'Type',
      accessor: 'type_evaluation',
      cell: (row) => (
        <Badge variant={TYPE_BADGE[row.type_evaluation]}>{row.type_label}</Badge>
      ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Évaluations"
        subtitle={`${evaluations.length} évaluation${evaluations.length > 1 ? 's' : ''}`}
        actions={
          <Button leftIcon={<Plus size={14} />} onClick={() => setShowModal(true)}>
            Nouvelle
          </Button>
        }
      />

      <DataTable
        data={evaluations}
        columns={columns}
        loading={isLoading}
        filters={[
          {
            key: 'classe',
            label: 'Toutes les classes',
            options: classes.map((c) => ({ value: c.id, label: c.nom })),
          },
          {
            key: 'matiere',
            label: 'Toutes les matières',
            options: matieres.map((m) => ({ value: m.id, label: m.nom })),
          },
          {
            key: 'trimestre',
            label: 'Tous les trimestres',
            options: [
              { value: 'T1', label: 'Trimestre 1' },
              { value: 'T2', label: 'Trimestre 2' },
              { value: 'T3', label: 'Trimestre 3' },
            ],
          },
        ]}
        filterValues={{ classe: classeFilter, matiere: matiereFilter, trimestre: trimestreFilter }}
        onFilterChange={(key, value) => {
          if (key === 'classe')    setClasseFilter(value)
          if (key === 'matiere')   setMatiereFilter(value)
          if (key === 'trimestre') setTrimestreFilter(value)
        }}
        emptyMessage="Aucune évaluation. Créez une évaluation pour commencer la saisie des notes."
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedEval(row)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-md px-2 py-1 hover:bg-indigo-50 transition-colors"
              title="Saisir les notes"
            >
              <ClipboardList size={12} /> Notes
            </button>
            <button
              onClick={() => { if (confirm('Supprimer cette évaluation ?')) deleteMutation.mutate(row.id) }}
              className="p-1.5 text-gray-300 hover:text-red-500 rounded-md transition-colors"
              title="Supprimer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      />

      {/* Panneau saisie des notes — plein écran */}
      {selectedEval && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <NotesSaisiePanel
            evaluation={selectedEval}
            onClose={() => setSelectedEval(null)}
          />
        </div>
      )}

      {showModal && (
        <EvaluationFormModal
          classes={classes}
          matieres={matieres}
          ecoleId={user?.ecole ?? 0}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

function NotesSaisiePanel({ evaluation, onClose }: { evaluation: Evaluation; onClose: () => void }) {
  const qc = useQueryClient()
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)

  const { data: elevesData } = useQuery({
    queryKey: ['eleves-classe', evaluation.classe],
    queryFn: () => studentsApi.list({ classe: evaluation.classe, taille_page: 100, est_archive: false }),
  })
  const eleves = elevesData?.resultats ?? []

  const { data: notesData } = useQuery({
    queryKey: ['notes', evaluation.id],
    queryFn: () => evaluationsApi.listNotes({ evaluation: evaluation.id }),
  })

  useEffect(() => {
    if (!notesData) return
    const init: Record<number, string> = {}
    notesData.resultats.forEach((n) => { init[n.eleve] = n.note })
    setNotes(init)
  }, [notesData])

  const saveMutation = useMutation({
    mutationFn: () => evaluationsApi.saisieGroupee({
      evaluation_id: evaluation.id,
      notes: eleves.map((e) => ({
        eleve_id:    e.id,
        note:        notes[e.id] !== undefined ? parseFloat(notes[e.id]) : null,
        commentaire: '',
      })).filter((n) => n.note !== null),
    }),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['notes', evaluation.id] })
    },
  })

  const noteMax = parseFloat(evaluation.note_maximale)
  const saisies = Object.values(notes).filter((v) => v !== '').length

  return (
    <>
      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 shrink-0">
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{evaluation.titre}</p>
          <p className="text-xs text-gray-500">{evaluation.nom_classe} · {saisies}/{eleves.length} notes saisies</p>
        </div>
        <Button
          size="sm"
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className={saved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          {saved ? 'Enregistré ✓' : 'Enregistrer'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Élève</th>
              <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Note /{evaluation.note_maximale}</th>
              <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">/20</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {eleves.map((eleve) => {
              const val   = notes[eleve.id] ?? ''
              const num   = parseFloat(val)
              const sur20 = !isNaN(num) && noteMax > 0 ? ((num / noteMax) * 20).toFixed(2) : '—'
              const invalid = !isNaN(num) && num > noteMax

              return (
                <tr key={eleve.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${eleve.prenom} ${eleve.nom}`} size="sm" />
                      <span className="text-sm text-gray-900">{eleve.prenom} {eleve.nom}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      max={noteMax}
                      step={0.5}
                      value={val}
                      onChange={(e) => { setNotes((prev) => ({ ...prev, [eleve.id]: e.target.value })); setSaved(false) }}
                      className={cn(
                        'w-20 text-right border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500',
                        invalid ? 'border-red-400 text-red-600' : 'border-gray-300'
                      )}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-400">{sur20}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function EvaluationFormModal({ classes, matieres, ecoleId, onClose }: {
  classes: import('@/api/schools.api').Classe[]
  matieres: import('@/api/evaluations.api').Matiere[]
  ecoleId: number
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<EvalForm>({
    resolver: zodResolver(evalSchema),
    defaultValues: { type_evaluation: 'devoir', trimestre: 'T1', coefficient: '1.00', note_maximale: '20.00' },
  })

  const createMutation = useMutation({
    mutationFn: (v: EvalForm) => evaluationsApi.create({ ...v, ecole: ecoleId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Nouvelle évaluation</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="px-6 py-5 space-y-4">
          <Input label="Titre" {...register('titre')} error={errors.titre?.message} placeholder="Ex: Devoir n°1 — Fractions" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
              <select {...register('classe', { setValueAs: Number })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">Sélectionner…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              {errors.classe && <p className="text-xs text-red-500 mt-0.5">{errors.classe.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
              <select {...register('matiere', { setValueAs: Number })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">Sélectionner…</option>
                {matieres.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              {errors.matiere && <p className="text-xs text-red-500 mt-0.5">{errors.matiere.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Date" type="date" {...register('date')} error={errors.date?.message} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
              <select {...register('trimestre')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="T1">Trimestre 1</option>
                <option value="T2">Trimestre 2</option>
                <option value="T3">Trimestre 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select {...register('type_evaluation')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="interrogation">Interrogation</option>
                <option value="devoir">Devoir</option>
                <option value="composition">Composition</option>
                <option value="examen">Examen</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Coefficient" type="number" step="0.5" {...register('coefficient')} />
            <Input label="Note maximale" type="number" step="0.5" {...register('note_maximale')} />
          </div>
          {createMutation.isError && <p className="text-xs text-red-500">Erreur lors de la création.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button type="submit" size="sm" loading={createMutation.isPending}>Créer</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
