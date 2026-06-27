import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { School, Plus, Power, Pause, Trash2, Users, ChevronRight, Search } from 'lucide-react'
import { promoteurApi, type EcolePromo } from '@/api/promoteur.api'
import { PromoteurEcoleDetailModal } from './PromoteurEcoleDetailModal'

export default function PromoteurEcolesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<EcolePromo | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: ecoles = [], isLoading } = useQuery({
    queryKey: ['promoteur-ecoles'],
    queryFn: promoteurApi.listEcoles,
  })

  const activate = useMutation({ mutationFn: promoteurApi.activerEcole,   onSuccess: () => qc.invalidateQueries({ queryKey: ['promoteur-ecoles'] }) })
  const suspend  = useMutation({ mutationFn: promoteurApi.suspendreEcole, onSuccess: () => qc.invalidateQueries({ queryKey: ['promoteur-ecoles'] }) })
  const remove   = useMutation({ mutationFn: promoteurApi.deleteEcole,    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoteur-ecoles'] }) })

  const filtered = ecoles.filter((e: EcolePromo) =>
    e.nom.toLowerCase().includes(search.toLowerCase()) ||
    (e.ville ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between animate-slide-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Écoles</h1>
          <p className="text-sm text-muted-foreground mt-1">{ecoles.length} établissement{ecoles.length > 1 ? 's' : ''} enregistré{ecoles.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} />
          Nouvelle école
        </button>
      </div>

      {/* Search */}
      <div className="relative animate-slide-in-up" style={{ animationDelay: '60ms' }}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher une école…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <School size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Aucune école trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ecole: EcolePromo, i: number) => (
            <EcoleCard
              key={ecole.id}
              ecole={ecole}
              delay={`${i * 50}ms`}
              onSelect={() => setSelected(ecole)}
              onActivate={() => activate.mutate(ecole.id)}
              onSuspend={() => suspend.mutate(ecole.id)}
              onDelete={() => { if (confirm(`Supprimer "${ecole.nom}" ?`)) remove.mutate(ecole.id) }}
            />
          ))}
        </div>
      )}

      {selected && (
        <PromoteurEcoleDetailModal
          ecole={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['promoteur-ecoles'] })}
        />
      )}

      {showCreate && (
        <CreateEcoleModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['promoteur-ecoles'] }) }}
        />
      )}
    </div>
  )
}

function EcoleCard({ ecole, delay, onSelect, onActivate, onSuspend, onDelete }: {
  ecole: EcolePromo
  delay: string
  onSelect: () => void
  onActivate: () => void
  onSuspend: () => void
  onDelete: () => void
}) {
  const abo = ecole.abonnement

  return (
    <div
      className="animate-slide-in-up bg-white border border-[var(--border)] rounded-xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer group"
      style={{ animationDelay: delay }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ecole.est_active ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <School size={18} className={ecole.est_active ? 'text-emerald-600' : 'text-red-500'} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">{ecole.nom}</h3>
            {ecole.ville && <p className="text-xs text-muted-foreground">{ecole.ville}</p>}
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ecole.est_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
          {ecole.est_active ? 'Active' : 'Suspendue'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><Users size={11} />{ecole.nb_eleves} élèves</span>
        <span>{ecole.nb_enseignants} enseignants</span>
      </div>

      {abo ? (
        <div className={`text-[10px] font-medium px-2 py-1 rounded-md inline-flex items-center gap-1 ${abo.est_expire ? 'bg-red-50 text-red-600' : abo.jours_restants < 15 ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
          <span className="capitalize">{abo.plan}</span>
          <span>·</span>
          <span>{abo.est_expire ? 'Expiré' : `${abo.jours_restants} j restants`}</span>
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground bg-gray-100 px-2 py-1 rounded-md">Sans abonnement</span>
      )}

      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex gap-1">
          {ecole.est_active
            ? <ActionBtn icon={Pause}  label="Suspendre" color="text-amber-500" onClick={onSuspend} />
            : <ActionBtn icon={Power}  label="Activer"   color="text-emerald-600" onClick={onActivate} />
          }
          <ActionBtn icon={Trash2} label="Supprimer" color="text-red-500" onClick={onDelete} />
        </div>
        <button className="flex items-center gap-1 text-xs text-primary font-medium" onClick={onSelect}>
          Détails <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${color}`}
    >
      <Icon size={13} />
    </button>
  )
}

function CreateEcoleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ nom: '', ville: '', adresse: '', telephone: '', email: '', type_ecole: 'mixte' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom.trim()) { setError('Le nom est requis.'); return }
    setLoading(true)
    try {
      await promoteurApi.createEcole(form)
      onCreated()
    } catch { setError('Erreur lors de la création.') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">Nouvelle école</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}
          <Field label="Nom *" value={form.nom} onChange={v => set('nom', v)} />
          <Field label="Ville" value={form.ville} onChange={v => set('ville', v)} />
          <Field label="Adresse" value={form.adresse} onChange={v => set('adresse', v)} />
          <Field label="Téléphone" value={form.telephone} onChange={v => set('telephone', v)} />
          <Field label="Email" value={form.email} type="email" onChange={v => set('email', v)} />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
            <select
              value={form.type_ecole}
              onChange={e => set('type_ecole', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="primaire">Primaire</option>
              <option value="secondaire">Secondaire</option>
              <option value="mixte">Mixte</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
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

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  )
}
