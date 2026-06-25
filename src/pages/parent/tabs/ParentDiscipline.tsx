import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, FileText, ChevronDown } from 'lucide-react'
import { studentsApi } from '@/api/students.api'
import { disciplineApi, type Incident, type Convocation } from '@/api/discipline.api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const NIVEAU_COLOR: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-700',
  2: 'bg-orange-100 text-orange-700',
  3: 'bg-red-100 text-red-600',
  4: 'bg-red-200 text-red-700',
  5: 'bg-red-900 text-white',
}

function IncidentCard({ incident }: { incident: Incident }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${NIVEAU_COLOR[incident.niveau]}`}>
            {incident.niveau}
          </div>
          <div>
            <p className="text-sm font-semibold">{incident.categorie_label}</p>
            <p className="text-xs text-muted-foreground">
              {incident.nom_eleve} · {format(new Date(incident.date), 'd MMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${incident.statut === 'clos' ? 'bg-secondary text-muted-foreground' : 'bg-red-100 text-red-600'}`}>
            {incident.statut_label}
          </span>
          {incident.a_convocation && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
              Convocation
            </span>
          )}
          <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-4 py-3 bg-secondary/10 space-y-2">
          <p className="text-sm text-foreground">{incident.description}</p>
          {incident.description_autre && (
            <p className="text-xs text-muted-foreground">{incident.description_autre}</p>
          )}
          {incident.nom_signale_par && (
            <p className="text-xs text-muted-foreground">
              Signalé par : <span className="font-medium">{incident.nom_signale_par}</span>
              {incident.role_signale_par && ` (${incident.role_signale_par})`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ConvocationRow({ conv }: { conv: Convocation }) {
  const statusColor = conv.est_traitee
    ? 'bg-emerald-100 text-emerald-700'
    : conv.est_envoyee
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-600'
  const statusLabel = conv.est_traitee ? 'Traitée' : conv.est_envoyee ? 'Envoyée' : 'En attente'

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0">
      <div>
        <p className="text-sm font-medium">{conv.nom_eleve}</p>
        <p className="text-xs text-muted-foreground">
          {conv.categorie_label} · Incident du {format(new Date(conv.date_incident), 'd MMM yyyy', { locale: fr })}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
    </div>
  )
}

export function ParentDiscipline() {
  const [eleveId, setEleveId] = useState<number | null>(null)
  const [view, setView] = useState<'incidents' | 'convocations'>('incidents')

  const { data: enfantsData } = useQuery({
    queryKey: ['parent-enfants'],
    queryFn: () => studentsApi.list({ taille_page: 20 }),
  })
  const enfants = enfantsData?.resultats ?? []
  const selectedId = eleveId ?? (enfants[0]?.id ?? null)

  const { data: incidentsData, isLoading: loadingI } = useQuery({
    queryKey: ['parent-incidents', selectedId],
    queryFn: () => disciplineApi.listIncidents({ eleve: selectedId! }),
    enabled: !!selectedId,
  })

  const { data: convsData, isLoading: loadingC } = useQuery({
    queryKey: ['parent-convocations'],
    queryFn: () => disciplineApi.listConvocations({}),
    enabled: !!selectedId,
  })

  const incidents: Incident[]    = incidentsData?.resultats ?? []
  const convocations: Convocation[] = convsData?.resultats ?? []
  const loading = loadingI || loadingC

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-500" />
        <h2 className="text-base font-semibold">Discipline</h2>
      </div>

      {enfants.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {enfants.map((e: any) => (
            <button
              key={e.id}
              onClick={() => setEleveId(e.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                (eleveId ?? enfants[0]?.id) === e.id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {e.prenom} {e.nom}
            </button>
          ))}
        </div>
      )}

      {/* Stats rapides */}
      {incidents.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{incidents.filter(i => i.statut === 'ouvert').length}</p>
            <p className="text-xs text-muted-foreground">Incidents ouverts</p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{convocations.length}</p>
            <p className="text-xs text-muted-foreground">Convocations</p>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {([['incidents','Incidents'] as const, ['convocations','Convocations'] as const]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${view === k ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground py-8 text-center">Chargement...</p>}

      {!loading && view === 'incidents' && (
        incidents.length === 0
          ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun incident signalé</p>
            </div>
          )
          : <div className="space-y-2">{incidents.map(i => <IncidentCard key={i.id} incident={i} />)}</div>
      )}

      {!loading && view === 'convocations' && (
        convocations.length === 0
          ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune convocation</p>
            </div>
          )
          : (
            <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
              {convocations.map(c => <ConvocationRow key={c.id} conv={c} />)}
            </div>
          )
      )}
    </div>
  )
}
