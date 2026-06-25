import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, ChevronDown } from 'lucide-react'
import { studentsApi } from '@/api/students.api'
import { evaluationsApi, type Trimestre, type Bulletin } from '@/api/evaluations.api'

const TRIMESTRES: Trimestre[] = ['T1', 'T2', 'T3']

function moyColor(moy: number, base: number) {
  const pct = (moy / base) * 100
  return pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'
}

function MoyenneBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-secondary rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{value.toFixed(2)}</span>
    </div>
  )
}

function BulletinCard({ bulletin }: { bulletin: Bulletin }) {
  const [open, setOpen] = useState(false)
  const moy  = bulletin.moyenne_generale
  const base = bulletin.base_notation ?? 20
  const color = moy !== null ? moyColor(moy, base) : 'text-muted-foreground'
  const isPrimaire = bulletin.est_primaire

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm font-semibold">{bulletin.eleve.nom_complet}</p>
          <p className="text-xs text-muted-foreground">
            {bulletin.eleve.classe_nom ?? 'Sans classe'}
            {bulletin.annee_scolaire && ` · ${bulletin.annee_scolaire}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {moy !== null && (
            <span className={`text-lg font-bold ${color}`}>
              {moy.toFixed(2)}<span className="text-xs text-muted-foreground">/{base}</span>
            </span>
          )}
          {bulletin.mention && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
              {bulletin.mention}
            </span>
          )}
          {bulletin.rang && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {bulletin.rang}e
            </span>
          )}
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/40 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Matière</th>
                {!isPrimaire && <th className="px-4 py-2 text-right font-medium">Coef.</th>}
                <th className="px-4 py-2 text-right font-medium">Moy./{base}</th>
                {isPrimaire
                  ? <th className="px-4 py-2 text-left font-medium">Appréciation</th>
                  : <th className="px-4 py-2 w-32 font-medium">Barre</th>
                }
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {bulletin.matieres.map(m => (
                <tr key={m.matiere_id} className="hover:bg-secondary/20">
                  <td className="px-4 py-2.5 font-medium">{m.nom}</td>
                  {!isPrimaire && (
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{m.coefficient}</td>
                  )}
                  <td className={`px-4 py-2.5 text-right font-semibold ${moyColor(m.moyenne_matiere, base)}`}>
                    {m.moyenne_matiere.toFixed(2)}
                  </td>
                  {isPrimaire
                    ? <td className="px-4 py-2.5 text-sm text-muted-foreground">{m.appreciation ?? '—'}</td>
                    : <td className="px-4 py-2.5"><MoyenneBar value={m.moyenne_matiere} max={base} /></td>
                  }
                </tr>
              ))}
            </tbody>
          </table>

          {!isPrimaire && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/20 text-xs text-muted-foreground border-t border-[var(--border)]">
              <span>Total coefficients : <strong className="text-foreground">{bulletin.total_coefficients}</strong></span>
              <span>Total points : <strong className="text-foreground">{bulletin.total_points.toFixed(2)}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ParentNotes() {
  const [trimestre, setTrimestre] = useState<Trimestre>('T1')

  const { data: enfantsData } = useQuery({
    queryKey: ['parent-enfants'],
    queryFn: () => studentsApi.list({ taille_page: 20 }),
  })
  const enfants = enfantsData?.resultats ?? []

  const bulletinQueries = enfants.map((e: any) => ({
    queryKey: ['parent-bulletin', e.id, trimestre],
    queryFn: () => evaluationsApi.getBulletin(e.id, trimestre),
    enabled: enfants.length > 0,
  }))

  const results  = bulletinQueries.map(q => useQuery(q))
  const bulletins = results.map(r => r.data).filter(Boolean) as Bulletin[]
  const loading   = results.some(r => r.isLoading)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-base font-semibold">Notes & Moyennes</h2>
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {TRIMESTRES.map(t => (
            <button
              key={t}
              onClick={() => setTrimestre(t)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${trimestre === t ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground py-8 text-center">Chargement...</p>}

      {!loading && bulletins.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun bulletin disponible pour ce trimestre</p>
        </div>
      )}

      <div className="space-y-3">
        {bulletins.map(b => <BulletinCard key={b.eleve.id} bulletin={b} />)}
      </div>
    </div>
  )
}
