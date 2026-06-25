import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, X, Download, AlertTriangle, Users, Clock, Shield } from 'lucide-react'
import { disciplineApi, type Incident, type Convocation, type Categorie, type NiveauIncident } from '@/api/discipline.api'
import { studentsApi } from '@/api/students.api'
import { schoolsApi } from '@/api/schools.api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

type Tab = 'incidents' | 'convocations'

const CATEGORIE_LABELS: Record<Categorie, string> = {
  expulsion:         'Expulsion',
  manque_de_respect: 'Manque de respect',
  violence:          'Violence',
  triche:            'Triche',
  perturbation:      'Perturbation',
  autre:             'Autre',
}

const NIVEAU_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Faible',     color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  2: { label: 'Modéré',     color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  3: { label: 'Grave',      color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  4: { label: 'Très grave', color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  5: { label: 'Critique',   color: 'text-white',      bg: 'bg-red-600 border-red-600' },
}

function NiveauBadge({ niveau }: { niveau: number }) {
  const cfg = NIVEAU_CONFIG[niveau] ?? NIVEAU_CONFIG[1]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold', cfg.bg, cfg.color)}>
      N{niveau} · {cfg.label}
    </span>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function DisciplinePage() {
  const qc = useQueryClient()
  const { canConvoquer, isPersonnel } = usePermissions()

  const [tab, setTab]               = useState<Tab>('incidents')
  const [showModal, setShowModal]   = useState(false)
  const [filterCategorie, setFilterCategorie] = useState('')
  const [filterNiveau, setFilterNiveau]       = useState('')
  const [filterStatut, setFilterStatut]       = useState('')
  const [filterClasse, setFilterClasse]       = useState('')
  const [confirmConvId, setConfirmConvId]     = useState<number | null>(null)

  const { data: incidentsData, isLoading: loadingIncidents } = useQuery({
    queryKey: ['incidents', filterCategorie, filterNiveau, filterStatut, filterClasse],
    queryFn: () => disciplineApi.listIncidents({
      categorie:       filterCategorie || undefined,
      niveau:          filterNiveau ? Number(filterNiveau) : undefined,
      statut:          filterStatut || undefined,
      'eleve__classe': filterClasse ? Number(filterClasse) : undefined,
    }),
  })

  const { data: convsData, isLoading: loadingConvs } = useQuery({
    queryKey: ['convocations'],
    queryFn:  () => disciplineApi.listConvocations(),
    enabled:  tab === 'convocations',
  })

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn:  () => schoolsApi.listClasses(),
  })

  const cloturerMutation = useMutation({
    mutationFn: (id: number) => disciplineApi.cloturerIncident(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  })

  const pdfMutation = useMutation({
    mutationFn: async (convId: number) => {
      const blob = await disciplineApi.genererPdfConvocation(convId)
      downloadBlob(blob, `convocation_${convId}.pdf`)
    },
  })

  const envoyerMutation = useMutation({
    mutationFn: (id: number) => disciplineApi.marquerEnvoyee(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['convocations'] }),
  })

  const traiterMutation = useMutation({
    mutationFn: (id: number) => disciplineApi.marquerTraitee(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['convocations'] })
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })

  const incidents: Incident[]      = incidentsData?.resultats ?? []
  const convocations: Convocation[] = convsData?.resultats ?? []
  const classes                     = classesData?.resultats ?? []

  const incidentCols: ColumnDef<Incident>[] = [
    {
      header: 'Élève / Classe',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{row.nom_eleve}</p>
          {row.nom_classe && <p className="text-xs text-gray-400">{row.nom_classe}</p>}
        </div>
      ),
    },
    {
      header: 'Catégorie',
      cell: (row) => (
        <div className="space-y-1">
          <Badge variant={
            row.categorie === 'expulsion' || row.categorie === 'violence' ? 'danger' :
            row.categorie === 'manque_de_respect' ? 'warning' : 'neutral'
          }>
            {row.categorie_label}
          </Badge>
          {row.description_autre && (
            <p className="text-[11px] text-gray-500 italic">→ {row.description_autre}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Niveau',
      cell: (row) => <NiveauBadge niveau={row.niveau} />,
    },
    {
      header: 'Date / Heure',
      cell: (row) => (
        <div className="text-sm">
          <p className="text-gray-700">{format(new Date(row.date), 'dd MMM yyyy', { locale: fr })}</p>
          {row.heure && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={10} /> {row.heure.slice(0, 5)}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Signalé par',
      cell: (row) => row.nom_signale_par ? (
        <div className="text-sm">
          <p className="text-gray-700">{row.nom_signale_par}</p>
          <p className="text-xs text-gray-400">{row.role_signale_par}</p>
        </div>
      ) : <span className="text-gray-400 text-sm">—</span>,
    },
    {
      header: 'Statut',
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <Badge variant={row.statut === 'ouvert' ? 'warning' : 'success'}>{row.statut_label}</Badge>
          {row.a_convocation && (
            <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-0.5">
              <Shield size={10} /> Convoqué
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {canConvoquer && row.statut === 'ouvert' && !row.a_convocation && (
            <Button size="sm" variant="secondary" onClick={() => setConfirmConvId(row.id)}>
              Convoquer
            </Button>
          )}
          {canConvoquer && row.statut === 'ouvert' && (
            <Button
              size="sm"
              variant="ghost"
              loading={cloturerMutation.isPending}
              onClick={() => { if (confirm('Clôturer cet incident ?')) cloturerMutation.mutate(row.id) }}
            >
              Clôturer
            </Button>
          )}
        </div>
      ),
    },
  ]

  const convCols: ColumnDef<Convocation>[] = [
    {
      header: 'Élève',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{row.nom_eleve}</p>
          <p className="text-xs text-gray-400">{row.categorie_label}</p>
        </div>
      ),
    },
    { header: 'Niveau', cell: (row) => <NiveauBadge niveau={row.niveau} /> },
    {
      header: 'Incident le',
      cell: (row) => (
        <span className="text-sm text-gray-600">
          {format(new Date(row.date_incident), 'dd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
    { header: 'Créée par', cell: (row) => <span className="text-sm text-gray-600">{row.nom_cree_par ?? '—'}</span> },
    {
      header: 'Statut',
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <Badge variant={row.est_traitee ? 'success' : row.est_envoyee ? 'warning' : 'neutral'}>
            {row.est_traitee ? 'Traitée' : row.est_envoyee ? 'Envoyée' : 'Générée'}
          </Badge>
          {row.envoye_le && (
            <p className="text-[11px] text-gray-400">
              {format(new Date(row.envoye_le), 'dd/MM/yy')}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="secondary" leftIcon={<Download size={12} />}
            loading={pdfMutation.isPending} onClick={() => pdfMutation.mutate(row.id)}>
            PDF
          </Button>
          {!row.est_envoyee && (
            <Button size="sm" variant="secondary" loading={envoyerMutation.isPending}
              onClick={() => envoyerMutation.mutate(row.id)}>
              Marquer envoyée
            </Button>
          )}
          {row.est_envoyee && !row.est_traitee && (
            <Button size="sm" loading={traiterMutation.isPending}
              onClick={() => traiterMutation.mutate(row.id)}>
              Marquer traitée
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-[1400px]">
      <PageHeader
        title="Discipline"
        subtitle={`${incidentsData?.total ?? 0} incident${(incidentsData?.total ?? 0) > 1 ? 's' : ''} enregistré${(incidentsData?.total ?? 0) > 1 ? 's' : ''}`}
        actions={
          isPersonnel ? (
            <Button leftIcon={<Plus size={14} />} onClick={() => setShowModal(true)}>
              Signaler un incident
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([['incidents', 'Incidents', AlertTriangle], ['convocations', 'Convocations', Users]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'incidents' && (
        <>
          <div className="flex flex-wrap gap-2">
            <select value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Toutes catégories</option>
              {Object.entries(CATEGORIE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterNiveau} onChange={(e) => setFilterNiveau(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Tous niveaux</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>N{n} — {NIVEAU_CONFIG[n].label}</option>)}
            </select>
            <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Tous statuts</option>
              <option value="ouvert">Ouvert</option>
              <option value="clos">Clôturé</option>
            </select>
            <select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Toutes classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <DataTable columns={incidentCols} data={incidents} loading={loadingIncidents} />
        </>
      )}

      {tab === 'convocations' && (
        <DataTable columns={convCols} data={convocations} loading={loadingConvs} />
      )}

      {showModal && (
        <IncidentModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ['incidents'] }) }}
        />
      )}

      {confirmConvId !== null && (
        <ConvocationModal
          incidentId={confirmConvId}
          onClose={() => setConfirmConvId(null)}
          onSuccess={() => {
            setConfirmConvId(null)
            qc.invalidateQueries({ queryKey: ['incidents'] })
            qc.invalidateQueries({ queryKey: ['convocations'] })
          }}
        />
      )}
    </div>
  )
}

// ─── Modal signalement ──────────────────────────────────────────────────────

interface IncidentFormData {
  eleve:             string
  date:              string
  heure:             string
  categorie:         Categorie
  niveau:            string
  description:       string
  description_autre: string
}

function IncidentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<IncidentFormData>({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), niveau: '1', categorie: 'autre' },
  })

  const categorieValue = watch('categorie')

  const { data: elevesData } = useQuery({
    queryKey: ['eleves-actifs'],
    queryFn:  () => studentsApi.list({ est_archive: false }),
  })
  const eleves = elevesData?.resultats ?? []

  const mutation = useMutation({
    mutationFn: (data: IncidentFormData) => disciplineApi.createIncident({
      eleve:             Number(data.eleve),
      date:              data.date,
      heure:             data.heure || undefined,
      categorie:         data.categorie,
      niveau:            Number(data.niveau) as NiveauIncident,
      description:       data.description,
      description_autre: data.description_autre || undefined,
    }),
    onSuccess,
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Signaler un incident</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Élève *</label>
            <select {...register('eleve', { required: true })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">— Sélectionner —</option>
              {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
            </select>
            {errors.eleve && <p className="text-xs text-red-500 mt-1">Champ requis</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
              <Input type="date" {...register('date', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Heure</label>
              <Input type="time" {...register('heure')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie *</label>
              <select {...register('categorie', { required: true })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {Object.entries(CATEGORIE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Niveau *</label>
              <select {...register('niveau', { required: true })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>N{n} — {NIVEAU_CONFIG[n].label}</option>)}
              </select>
            </div>
          </div>

          {categorieValue === 'autre' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Précision *</label>
              <Input placeholder="Type d'incident à préciser…" {...register('description_autre')} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description détaillée *</label>
            <textarea {...register('description', { required: true })} rows={3}
              placeholder="Décrivez l'incident…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
            {errors.description && <p className="text-xs text-red-500 mt-1">Champ requis</p>}
          </div>

          {mutation.isError && <p className="text-xs text-red-500">Une erreur s'est produite.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={mutation.isPending}>Signaler</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal convocation ──────────────────────────────────────────────────────

function ConvocationModal({ incidentId, onClose, onSuccess }: { incidentId: number; onClose: () => void; onSuccess: () => void }) {
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: () => disciplineApi.createConvocation({ incident: incidentId, notes }),
    onSuccess,
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Créer une convocation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Une convocation sera créée et le PDF sera disponible dans l'onglet Convocations pour envoi aux parents.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes internes (optionnel)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Créer la convocation</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
