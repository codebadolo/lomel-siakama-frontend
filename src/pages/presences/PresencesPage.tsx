import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, Save, ChevronDown, BarChart2 } from 'lucide-react'
import { attendanceApi, type StatutPresence, type RapportRow } from '@/api/attendance.api'
import { studentsApi } from '@/api/students.api'
import { schoolsApi } from '@/api/schools.api'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

type Tab = 'saisie' | 'rapport'

const STATUT_CONFIG = {
  present: { label: 'Présent',   icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-300' },
  absent:  { label: 'Absent',    icon: XCircle,    color: 'text-red-500',     bg: 'bg-red-50 border-red-300' },
  retard:  { label: 'En retard', icon: Clock,      color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-300' },
} as const

export default function PresencesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('saisie')

  // ─── Saisie ────────────────────────────────────────────────────────────────
  const today = format(new Date(), 'yyyy-MM-dd')
  const [classeId,  setClasseId]  = useState<number | null>(null)
  const [date,      setDate]      = useState(today)
  const [creneauId, setCreneauId] = useState<number | null>(null)
  const [statuts,   setStatuts]   = useState<Record<number, StatutPresence>>({})
  const [heures,    setHeures]    = useState<Record<number, string>>({})
  const [saved,     setSaved]     = useState(false)

  // ─── Rapport ───────────────────────────────────────────────────────────────
  const firstDay = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  const [rDateDebut, setRDateDebut] = useState(firstDay)
  const [rDateFin,   setRDateFin]   = useState(today)
  const [rClasseId,  setRClasseId]  = useState<number | ''>('')
  const [rStatut,    setRStatut]    = useState('')
  const [rapportEnabled, setRapportEnabled] = useState(false)

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolsApi.listClasses(),
  })
  const classes = classesData?.resultats ?? []

  const jourSemaine = new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1

  const { data: creneauxData } = useQuery({
    queryKey: ['creneaux', classeId, jourSemaine],
    queryFn: () => attendanceApi.listCreneaux({ classe: classeId!, jour_semaine: jourSemaine }),
    enabled: classeId !== null,
  })
  const creneaux = creneauxData?.resultats ?? []

  const { data: elevesData } = useQuery({
    queryKey: ['eleves-classe', classeId],
    queryFn: () => studentsApi.list({ classe: classeId!, taille_page: 100, est_archive: false }),
    enabled: classeId !== null,
  })
  const eleves = elevesData?.resultats ?? []

  const { data: presencesData } = useQuery({
    queryKey: ['presences', classeId, creneauId, date],
    queryFn: () => attendanceApi.listPresences({
      creneau: creneauId ?? undefined,
      'creneau__classe': creneauId ? undefined : (classeId ?? undefined),
      date,
    }),
    enabled: classeId !== null,
  })

  const { data: rapport, isFetching: loadingRapport } = useQuery({
    queryKey: ['rapport-assiduite', rDateDebut, rDateFin, rClasseId, rStatut],
    queryFn: () => attendanceApi.getRapport({
      date_debut: rDateDebut || undefined,
      date_fin:   rDateFin   || undefined,
      classe_id:  rClasseId  ? Number(rClasseId) : undefined,
      statut:     rStatut    || undefined,
    }),
    enabled: rapportEnabled,
  })

  useEffect(() => {
    if (!presencesData) return
    const init: Record<number, StatutPresence> = {}
    const initH: Record<number, string> = {}
    presencesData.resultats.forEach((p) => {
      init[p.eleve] = p.statut
      if (p.heure_arrivee) initH[p.eleve] = p.heure_arrivee
    })
    setStatuts(init)
    setHeures(initH)
    setSaved(false)
  }, [presencesData])

  const saveMutation = useMutation({
    mutationFn: () => attendanceApi.saisieGroupee({
      creneau_id: creneauId ?? undefined,
      date,
      presences: eleves.map((e) => ({
        eleve_id:     e.id,
        statut:       statuts[e.id] ?? 'present',
        heure_arrivee: statuts[e.id] === 'retard' ? (heures[e.id] || undefined) : undefined,
      })),
    }),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['presences'] })
    },
  })

  const setStatut = (eleveId: number, s: StatutPresence) => {
    setStatuts((prev) => ({ ...prev, [eleveId]: s }))
    setSaved(false)
  }

  const stats = useMemo(() => {
    const vals = Object.values(statuts)
    return {
      present: vals.filter((v) => v === 'present').length,
      absent:  vals.filter((v) => v === 'absent').length,
      retard:  vals.filter((v) => v === 'retard').length,
    }
  }, [statuts])

  const canSave = classeId !== null && eleves.length > 0

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Présences</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Saisie et suivi des présences par cours</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {([
          { key: 'saisie',  label: 'Saisie du jour',    icon: CheckCircle },
          { key: 'rapport', label: 'Rapport d\'assiduité', icon: BarChart2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'saisie' && (
        <>
          {/* Toolbar sélection */}
          <div className="bg-white border border-[var(--border)] rounded-xl p-4 flex flex-wrap items-end gap-4">
            <SelField label="Classe">
              <select
                value={classeId ?? ''}
                onChange={(e) => { setClasseId(e.target.value ? Number(e.target.value) : null); setCreneauId(null); setStatuts({}) }}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
              >
                <option value="">Sélectionner…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </SelField>

            <SelField label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setCreneauId(null); setStatuts({}) }}
                max={today}
                className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </SelField>

            <SelField label="Créneau">
              <select
                value={creneauId ?? ''}
                onChange={(e) => { setCreneauId(e.target.value ? Number(e.target.value) : null); setStatuts({}) }}
                disabled={!classeId}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white disabled:opacity-50"
              >
                <option value="">Sans créneau spécifique</option>
                {creneaux.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)} — {c.nom_matiere}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </SelField>

            {creneauId && eleves.length > 0 && (
              <div className="ml-auto flex items-center gap-3">
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={12} /> {stats.present}</span>
                  <span className="flex items-center gap-1 text-red-500"><XCircle size={12} /> {stats.absent}</span>
                  <span className="flex items-center gap-1 text-amber-600"><Clock size={12} /> {stats.retard}</span>
                </div>
                <Button
                  size="sm"
                  leftIcon={<Save size={13} />}
                  loading={saveMutation.isPending}
                  disabled={!canSave}
                  onClick={() => saveMutation.mutate()}
                  className={saved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {saved ? 'Enregistré ✓' : 'Enregistrer'}
                </Button>
              </div>
            )}
          </div>

          {!classeId ? (
            <Empty title="Sélectionnez une classe" subtitle="Choisissez une classe et une date pour saisir les présences." />
          ) : !creneauId ? (
            <Empty title="Sélectionnez un créneau" subtitle="Choisissez un cours dans l'emploi du temps du jour." />
          ) : eleves.length === 0 ? (
            <Empty title="Aucun élève dans cette classe" subtitle="" />
          ) : (
            <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-secondary border-b border-[var(--border)] text-xs font-medium text-muted-foreground grid grid-cols-[1fr_auto] gap-4">
                <span>Élève ({eleves.length})</span>
                <span>Statut</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {eleves.map((eleve) => {
                  const statut = statuts[eleve.id] ?? 'present'
                  return (
                    <div key={eleve.id} className="flex items-center gap-4 px-5 py-3">
                      <Avatar name={`${eleve.prenom} ${eleve.nom}`} size="sm" />
                      <p className="flex-1 text-sm font-medium text-foreground">{eleve.prenom} {eleve.nom}</p>
                      <div className="flex items-center gap-1.5">
                        {(Object.entries(STATUT_CONFIG) as [StatutPresence, typeof STATUT_CONFIG[StatutPresence]][]).map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() => setStatut(eleve.id, key)}
                            className={cn(
                              'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all',
                              statut === key ? cn(cfg.bg, cfg.color, 'font-medium') : 'border-[var(--border)] text-muted-foreground hover:border-gray-300'
                            )}
                          >
                            <cfg.icon size={11} />
                            {cfg.label}
                          </button>
                        ))}
                        {statut === 'retard' && (
                          <input
                            type="time"
                            value={heures[eleve.id] ?? ''}
                            onChange={(e) => setHeures((prev) => ({ ...prev, [eleve.id]: e.target.value }))}
                            className="ml-1 text-xs border border-amber-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 w-24"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'rapport' && (
        <RapportTab
          classes={classes}
          rDateDebut={rDateDebut}
          rDateFin={rDateFin}
          rClasseId={rClasseId}
          rStatut={rStatut}
          rapport={rapport}
          loadingRapport={loadingRapport}
          rapportEnabled={rapportEnabled}
          onDateDebut={setRDateDebut}
          onDateFin={setRDateFin}
          onClasse={(v) => setRClasseId(v)}
          onStatut={setRStatut}
          onGenerer={() => setRapportEnabled(true)}
        />
      )}
    </div>
  )
}

// ─── Rapport tab ─────────────────────────────────────────────────────────────

function RapportTab({
  classes, rDateDebut, rDateFin, rClasseId, rStatut,
  rapport, loadingRapport, rapportEnabled,
  onDateDebut, onDateFin, onClasse, onStatut, onGenerer,
}: {
  classes: { id: number; nom: string }[]
  rDateDebut: string; rDateFin: string
  rClasseId: number | ''; rStatut: string
  rapport: ReturnType<typeof attendanceApi.getRapport> extends Promise<infer T> ? T | undefined : undefined
  loadingRapport: boolean
  rapportEnabled: boolean
  onDateDebut: (v: string) => void
  onDateFin:   (v: string) => void
  onClasse:    (v: number | '') => void
  onStatut:    (v: string) => void
  onGenerer:   () => void
}) {
  return (
    <div className="space-y-5">
      {/* Filtres */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Date début</label>
          <input
            type="date"
            value={rDateDebut}
            onChange={(e) => onDateDebut(e.target.value)}
            className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Date fin</label>
          <input
            type="date"
            value={rDateFin}
            onChange={(e) => onDateFin(e.target.value)}
            className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Classe</label>
          <select
            value={rClasseId}
            onChange={(e) => onClasse(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Statut</label>
          <select
            value={rStatut}
            onChange={(e) => onStatut(e.target.value)}
            className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
          >
            <option value="">Tous</option>
            <option value="present">Présents</option>
            <option value="absent">Absents</option>
            <option value="retard">Retards</option>
          </select>
        </div>
        <Button
          leftIcon={<BarChart2 size={14} />}
          loading={loadingRapport}
          onClick={onGenerer}
        >
          Générer le rapport
        </Button>
      </div>

      {!rapportEnabled ? (
        <Empty title="Configurez vos filtres" subtitle="Sélectionnez une période et cliquez sur Générer." />
      ) : loadingRapport ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rapport ? (
        <>
          {/* Stats globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatKpi label="Total saisies"   value={String(rapport.stats_globales.total)}   color="text-foreground" />
            <StatKpi label="Présents"         value={String(rapport.stats_globales.presents)} color="text-emerald-600" />
            <StatKpi label="Absents"          value={String(rapport.stats_globales.absents)}  color="text-red-500" />
            <StatKpi label="Retards"          value={String(rapport.stats_globales.retards)}  color="text-amber-600" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TauxBar label="Taux de présence"     pct={rapport.stats_globales.taux_presence}    color="bg-emerald-500" />
            <TauxBar label="Taux d'absentéisme"  pct={rapport.stats_globales.taux_absenteisme} color="bg-red-500" />
          </div>

          {/* Tableau par élève */}
          <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Détail par élève</p>
              <span className="text-xs text-muted-foreground">{rapport.par_eleve.length} élève{rapport.par_eleve.length > 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-medium">Élève</th>
                    <th className="text-left px-3 py-3 font-medium">Classe</th>
                    <th className="text-center px-3 py-3 font-medium">Total</th>
                    <th className="text-center px-3 py-3 font-medium text-emerald-600">Présents</th>
                    <th className="text-center px-3 py-3 font-medium text-red-500">Absents</th>
                    <th className="text-center px-3 py-3 font-medium text-amber-600">Retards</th>
                    <th className="text-center px-3 py-3 font-medium">Taux présence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rapport.par_eleve.map((row: RapportRow) => (
                    <tr key={row.eleve} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={`${row.eleve__prenom} ${row.eleve__nom}`} size="sm" />
                          <div>
                            <p className="font-medium text-foreground">{row.eleve__prenom} {row.eleve__nom}</p>
                            <p className="text-[11px] text-muted-foreground">{row.eleve__matricule}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{row.eleve__classe__nom}</td>
                      <td className="px-3 py-3 text-center font-medium">{row.total}</td>
                      <td className="px-3 py-3 text-center text-emerald-600 font-medium">{row.presents}</td>
                      <td className="px-3 py-3 text-center text-red-500 font-medium">{row.absents}</td>
                      <td className="px-3 py-3 text-center text-amber-600 font-medium">{row.retards}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', row.taux_presence >= 80 ? 'bg-emerald-500' : row.taux_presence >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                              style={{ width: `${row.taux_presence}%` }}
                            />
                          </div>
                          <span className={cn('text-xs font-semibold', row.taux_presence >= 80 ? 'text-emerald-600' : row.taux_presence >= 60 ? 'text-amber-600' : 'text-red-500')}>
                            {row.taux_presence}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rapport.par_eleve.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">Aucune donnée pour ces filtres.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

// ─── Petits composants ────────────────────────────────────────────────────────

function SelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="relative">{children}</div>
    </div>
  )
}

function StatKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function TauxBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-lg font-bold text-foreground">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-[var(--border)] rounded-xl">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>}
    </div>
  )
}
