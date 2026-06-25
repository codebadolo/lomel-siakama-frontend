import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, Save, ChevronDown } from 'lucide-react'
import { attendanceApi, type StatutPresence } from '@/api/attendance.api'
import { studentsApi } from '@/api/students.api'
import { schoolsApi } from '@/api/schools.api'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

const STATUT_CONFIG = {
  present: { label: 'Présent',  icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-300' },
  absent:  { label: 'Absent',   icon: XCircle,    color: 'text-red-500',     bg: 'bg-red-50 border-red-300' },
  retard:  { label: 'En retard',icon: Clock,      color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-300' },
} as const

export default function PresencesPage() {
  const qc = useQueryClient()

  const today = format(new Date(), 'yyyy-MM-dd')
  const [classeId, setClasseId] = useState<number | null>(null)
  const [date,     setDate]     = useState(today)
  const [creneauId, setCreneauId] = useState<number | null>(null)
  const [statuts, setStatuts]   = useState<Record<number, StatutPresence>>({})
  const [heures,  setHeures]    = useState<Record<number, string>>({})
  const [saved,   setSaved]     = useState(false)

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
    queryKey: ['presences', creneauId, date],
    queryFn: () => attendanceApi.listPresences({ creneau: creneauId!, date }),
    enabled: creneauId !== null,
  })

  useEffect(() => {
    if (!presencesData) return
    const init: Record<number, StatutPresence> = {}
    const initH: Record<number, string> = {}
    presencesData.resultats.forEach((p) => {
      init[p.eleve]  = p.statut
      if (p.heure_arrivee) initH[p.eleve] = p.heure_arrivee
    })
    setStatuts(init)
    setHeures(initH)
    setSaved(false)
  }, [presencesData])

  const saveMutation = useMutation({
    mutationFn: () => attendanceApi.saisieGroupee({
      creneau_id: creneauId!,
      date,
      presences: eleves.map((e) => ({
        eleve_id:    e.id,
        statut:      statuts[e.id] ?? 'present',
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

  const canSave = classeId !== null && creneauId !== null && eleves.length > 0

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Présences</h1>
        <p className="text-sm text-gray-500 mt-0.5">Saisie et suivi des présences par cours</p>
      </div>

      {/* Toolbar sélection */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Classe</label>
          <div className="relative">
            <select
              value={classeId ?? ''}
              onChange={(e) => { setClasseId(e.target.value ? Number(e.target.value) : null); setCreneauId(null); setStatuts({}) }}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option value="">Sélectionner…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setCreneauId(null); setStatuts({}) }}
            max={today}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Créneau</label>
          <div className="relative">
            <select
              value={creneauId ?? ''}
              onChange={(e) => { setCreneauId(e.target.value ? Number(e.target.value) : null); setStatuts({}) }}
              disabled={!classeId || creneaux.length === 0}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:opacity-50"
            >
              <option value="">{creneaux.length === 0 && classeId ? 'Aucun cours ce jour' : 'Sélectionner…'}</option>
              {creneaux.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)} — {c.nom_matiere}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {creneauId && eleves.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex gap-3 text-xs text-gray-600">
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

      {/* Liste élèves */}
      {!classeId ? (
        <Empty title="Sélectionnez une classe" subtitle="Choisissez une classe et une date pour saisir les présences." />
      ) : !creneauId ? (
        <Empty title="Sélectionnez un créneau" subtitle="Choisissez un cours dans l'emploi du temps du jour." />
      ) : eleves.length === 0 ? (
        <Empty title="Aucun élève dans cette classe" subtitle="" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 grid grid-cols-[1fr_auto] gap-4">
            <span>Élève ({eleves.length})</span>
            <span>Statut</span>
          </div>
          <div className="divide-y divide-gray-100">
            {eleves.map((eleve) => {
              const statut = statuts[eleve.id] ?? 'present'
              return (
                <div key={eleve.id} className="flex items-center gap-4 px-5 py-3">
                  <Avatar name={`${eleve.prenom} ${eleve.nom}`} size="sm" />
                  <p className="flex-1 text-sm font-medium text-gray-900">{eleve.prenom} {eleve.nom}</p>
                  <div className="flex items-center gap-1.5">
                    {(Object.entries(STATUT_CONFIG) as [StatutPresence, typeof STATUT_CONFIG[StatutPresence]][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setStatut(eleve.id, key)}
                        className={cn(
                          'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all',
                          statut === key ? cn(cfg.bg, cfg.color, 'font-medium') : 'border-gray-200 text-gray-400 hover:border-gray-300'
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
                        placeholder="08:30"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-gray-200 rounded-xl">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}
