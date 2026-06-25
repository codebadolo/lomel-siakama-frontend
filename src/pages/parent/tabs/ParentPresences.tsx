import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, XCircle, Clock, Filter } from 'lucide-react'
import { studentsApi } from '@/api/students.api'
import { attendanceApi, type Presence } from '@/api/attendance.api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUT_CONFIG = {
  present: { label: 'Présent',  bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckSquare },
  absent:  { label: 'Absent',   bg: 'bg-red-100',     text: 'text-red-600',     icon: XCircle },
  retard:  { label: 'Retard',   bg: 'bg-amber-100',   text: 'text-amber-700',   icon: Clock },
}

export function ParentPresences() {
  const [eleveId, setEleveId] = useState<number | null>(null)
  const [statut,  setStatut]  = useState<'all' | 'absent' | 'retard'>('all')

  const { data: enfantsData } = useQuery({
    queryKey: ['parent-enfants'],
    queryFn: () => studentsApi.list({ taille_page: 20 }),
  })
  const enfants = enfantsData?.resultats ?? []
  const selectedId = eleveId ?? (enfants[0]?.id ?? null)

  const { data: presencesData, isLoading } = useQuery({
    queryKey: ['parent-presences', selectedId, statut],
    queryFn: () => attendanceApi.listPresences({ eleve: selectedId! }),
    enabled: !!selectedId,
  })

  const allPresences: Presence[] = presencesData?.resultats ?? []
  const presences = statut === 'all' ? allPresences : allPresences.filter(p => p.statut === statut)

  const stats = {
    presents: allPresences.filter(p => p.statut === 'present').length,
    absents:  allPresences.filter(p => p.statut === 'absent').length,
    retards:  allPresences.filter(p => p.statut === 'retard').length,
  }
  const total = allPresences.length

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-2">
        <CheckSquare size={16} className="text-primary" />
        <h2 className="text-base font-semibold">Présences & Absences</h2>
      </div>

      {/* Sélecteur enfant */}
      {enfants.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {enfants.map((e: any) => (
            <button
              key={e.id}
              onClick={() => setEleveId(e.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                (eleveId ?? enfants[0]?.id) === e.id
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {e.prenom} {e.nom}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Présences', value: stats.presents, pct: total ? Math.round(stats.presents/total*100) : 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Absences',  value: stats.absents,  pct: total ? Math.round(stats.absents/total*100) : 0,  color: 'text-red-500',     bg: 'bg-red-50' },
            { label: 'Retards',   value: stats.retards,  pct: total ? Math.round(stats.retards/total*100) : 0,  color: 'text-amber-600',   bg: 'bg-amber-50' },
          ].map(({ label, value, pct, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xs font-semibold ${color}`}>{pct}%</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtre */}
      <div className="flex items-center gap-2">
        <Filter size={12} className="text-muted-foreground" />
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {([['all','Tout'], ['absent','Absences'], ['retard','Retards']] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setStatut(k as any)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statut === k ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Chargement...</p>}

      {!isLoading && presences.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune donnée de présence</p>
        </div>
      )}

      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="divide-y divide-[var(--border)]">
          {presences.map(p => {
            const cfg = STATUT_CONFIG[p.statut]
            const Icon = cfg.icon
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon size={13} className={cfg.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.nom_creneau}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(p.date), 'EEEE d MMMM yyyy', { locale: fr })}
                    {p.heure_arrivee && ` · ${p.heure_arrivee}`}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
