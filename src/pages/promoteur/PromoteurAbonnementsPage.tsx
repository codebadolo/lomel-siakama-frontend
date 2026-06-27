import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Plus, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { promoteurApi, type Abonnement, type EcolePromo } from '@/api/promoteur.api'

export default function PromoteurAbonnementsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: abos = [], isLoading } = useQuery({
    queryKey: ['promoteur-abonnements'],
    queryFn: promoteurApi.listAbonnements,
  })

  const marquer = useMutation({
    mutationFn: (id: number) => promoteurApi.marquerPaye(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoteur-abonnements'] }),
  })

  const expires  = abos.filter((a: Abonnement) => a.est_expire)
  const expirent = abos.filter((a: Abonnement) => !a.est_expire && a.jours_restants < 30)
  const actifs   = abos.filter((a: Abonnement) => !a.est_expire && a.jours_restants >= 30)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between animate-slide-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Abonnements</h1>
          <p className="text-sm text-muted-foreground mt-1">{abos.length} abonnement{abos.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} />
          Nouvel abonnement
        </button>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4 animate-slide-in-up" style={{ animationDelay: '60ms' }}>
        <SummaryCard label="Actifs" count={actifs.length}   icon={CheckCircle}   color="emerald" />
        <SummaryCard label="Expirent bientôt" count={expirent.length} icon={AlertTriangle} color="amber" />
        <SummaryCard label="Expirés" count={expires.length} icon={XCircle}       color="red" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {expires.length > 0 && <AboGroup title="Expirés" abos={expires} color="red"    onPay={id => marquer.mutate(id)} />}
          {expirent.length > 0 && <AboGroup title="Expirent dans moins de 30 jours" abos={expirent} color="amber" onPay={id => marquer.mutate(id)} />}
          {actifs.length > 0 && <AboGroup title="Actifs" abos={actifs} color="emerald" onPay={id => marquer.mutate(id)} />}
          {abos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CreditCard size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Aucun abonnement</p>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateAboModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['promoteur-abonnements'] }) }}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, count, icon: Icon, color }: { label: string; count: number; icon: any; color: string }) {
  const cfg: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:   'bg-amber-50  text-amber-700  border-amber-100',
    red:     'bg-red-50    text-red-600    border-red-100',
  }
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${cfg[color]}`}>
      <Icon size={20} />
      <div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-xs font-medium opacity-75">{label}</p>
      </div>
    </div>
  )
}

function AboGroup({ title, abos, onPay }: { title: string; abos: Abonnement[]; color?: string; onPay: (id: number) => void }) {
  const planColor: Record<string, string> = {
    mensuel:     'bg-indigo-100 text-indigo-700',
    trimestriel: 'bg-purple-100 text-purple-700',
    annuel:      'bg-emerald-100 text-emerald-700',
  }
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">
        {abos.map(a => (
          <div key={a.id} className="bg-white border border-[var(--border)] rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${planColor[a.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                  {a.plan}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{a.montant.toLocaleString('fr-FR')} FCFA</p>
                  <p className="text-xs text-muted-foreground">{a.date_debut} → {a.date_fin}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  {a.est_expire
                    ? <p className="text-xs font-semibold text-red-500">Expiré</p>
                    : <p className="text-xs font-semibold text-muted-foreground">{a.jours_restants} jours restants</p>
                  }
                  {a.dernier_paiement && <p className="text-[10px] text-muted-foreground">Dernier paiement : {a.dernier_paiement}</p>}
                </div>
                {(a.est_expire || a.jours_restants < 15) && (
                  <button
                    onClick={() => onPay(a.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                  >
                    ✓ Marquer payé
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CreateAboModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: ecoles = [] } = useQuery({ queryKey: ['promoteur-ecoles'], queryFn: promoteurApi.listEcoles })
  const [form, setForm] = useState({ ecole: '', plan: 'mensuel', montant: '', date_debut: new Date().toISOString().substring(0, 10), date_fin: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ecole || !form.montant || !form.date_fin) { setError('École, montant et date de fin sont requis.'); return }
    setLoading(true)
    try {
      await promoteurApi.createAbonnement({
        ecole: Number(form.ecole),
        plan: form.plan,
        montant: Number(form.montant),
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        notes: form.notes,
      })
      onCreated()
    } catch { setError('Erreur lors de la création.') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">Nouvel abonnement</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">École *</label>
            <select value={form.ecole} onChange={e => set('ecole', e.target.value)} className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">— Sélectionner —</option>
              {ecoles.map((e: EcolePromo) => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Plan</label>
            <select value={form.plan} onChange={e => set('plan', e.target.value)} className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="mensuel">Mensuel</option>
              <option value="trimestriel">Trimestriel</option>
              <option value="annuel">Annuel</option>
            </select>
          </div>
          {[
            { key: 'montant',    label: 'Montant (FCFA) *', type: 'number' },
            { key: 'date_debut', label: 'Date début',       type: 'date'   },
            { key: 'date_fin',   label: 'Date fin *',       type: 'date'   },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
              <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
