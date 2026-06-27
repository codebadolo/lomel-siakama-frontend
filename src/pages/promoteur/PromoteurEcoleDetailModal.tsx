import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, UserPlus, MoreVertical, Check, XCircle, KeyRound, LogIn } from 'lucide-react'
import { promoteurApi, type EcolePromo, type AdminEcole } from '@/api/promoteur.api'

export function PromoteurEcoleDetailModal({ ecole, onClose }: {
  ecole: EcolePromo
  onClose: () => void
  onRefresh?: () => void
}) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'infos' | 'admins'>('infos')
  const [showCreateAdmin, setShowCreateAdmin] = useState(false)

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['promoteur-admins', ecole.id],
    queryFn: () => promoteurApi.getAdmins(ecole.id),
  })

  const refreshAdmins = () => qc.invalidateQueries({ queryKey: ['promoteur-admins', ecole.id] })

  const abo = ecole.abonnement

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{ecole.nom}</h2>
            <p className="text-xs text-muted-foreground">{ecole.ville || ecole.type_ecole}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] px-6">
          {(['infos', 'admins'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {t === 'infos' ? 'Informations' : 'Comptes admin'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'infos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Statut"     value={ecole.est_active ? '✅ Active' : '🔴 Suspendue'} />
                <InfoRow label="Type"       value={ecole.type_ecole} />
                <InfoRow label="Élèves"     value={`${ecole.nb_eleves}`} />
                <InfoRow label="Enseignants" value={`${ecole.nb_enseignants}`} />
                <InfoRow label="Adresse"    value={ecole.adresse || '—'} />
                <InfoRow label="Email"      value={ecole.email || '—'} />
                <InfoRow label="Téléphone"  value={ecole.telephone || '—'} />
                <InfoRow label="Créée le"   value={new Date(ecole.cree_le).toLocaleDateString('fr-FR')} />
              </div>
              {abo ? (
                <div className="mt-4 p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wider">Abonnement</p>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow label="Plan"     value={abo.plan} />
                    <InfoRow label="Montant"  value={`${abo.montant} FCFA`} />
                    <InfoRow label="Début"    value={abo.date_debut} />
                    <InfoRow label="Fin"      value={abo.date_fin} />
                    <InfoRow label="Restant"  value={abo.est_expire ? '⚠️ Expiré' : `${abo.jours_restants} jours`} />
                    <InfoRow label="Statut"   value={abo.est_actif ? 'Actif' : 'Inactif'} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun abonnement actif.</p>
              )}
            </div>
          )}

          {tab === 'admins' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateAdmin(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <UserPlus size={13} />
                  Créer un compte admin
                </button>
              </div>
              {isLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
              ) : admins.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun compte admin pour cette école</p>
              ) : admins.map(admin => (
                <AdminRow key={admin.id} admin={admin} ecoleId={ecole.id} onRefresh={refreshAdmins} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateAdmin && (
        <CreateAdminModal
          ecoleId={ecole.id}
          onClose={() => setShowCreateAdmin(false)}
          onCreated={() => { setShowCreateAdmin(false); refreshAdmins() }}
        />
      )}
    </div>
  )
}

function AdminRow({ admin, ecoleId, onRefresh }: { admin: AdminEcole; ecoleId: number; onRefresh: () => void }) {
  const [showResetMdp, setShowResetMdp] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const toggleActive = async () => {
    if (admin.is_active) await promoteurApi.desactiverAdmin(ecoleId, admin.id)
    else                 await promoteurApi.activerAdmin(ecoleId, admin.id)
    onRefresh()
    setMenuOpen(false)
  }

  const impersonner = async () => {
    try {
      const tokens = await promoteurApi.impersonner(ecoleId, admin.id)
      alert(`Token d'accès (copiez pour tester) :\n\n${tokens.access.substring(0, 80)}…`)
    } catch { alert('Erreur d\'impersonation') }
    setMenuOpen(false)
  }

  return (
    <div className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
        {(admin.first_name?.[0] ?? admin.email[0]).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{`${admin.first_name} ${admin.last_name}`.trim() || admin.email}</p>
        <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
        {admin.is_active ? 'Actif' : 'Inactif'}
      </span>

      <div className="relative">
        <button onClick={() => setMenuOpen(o => !o)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg z-10 min-w-[160px]">
            <button onClick={toggleActive} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-gray-50 transition-colors">
              {admin.is_active ? <XCircle size={12} className="text-red-500" /> : <Check size={12} className="text-emerald-600" />}
              {admin.is_active ? 'Désactiver' : 'Activer'}
            </button>
            <button onClick={() => { setShowResetMdp(true); setMenuOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-gray-50 transition-colors">
              <KeyRound size={12} className="text-amber-500" />
              Réinitialiser MDP
            </button>
            <button onClick={impersonner} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-gray-50 transition-colors">
              <LogIn size={12} className="text-primary" />
              Impersonner
            </button>
          </div>
        )}
      </div>

      {showResetMdp && (
        <ResetMdpModal
          ecoleId={ecoleId}
          adminId={admin.id}
          name={`${admin.first_name} ${admin.last_name}`.trim()}
          onClose={() => setShowResetMdp(false)}
        />
      )}
    </div>
  )
}

function ResetMdpModal({ ecoleId, adminId, name, onClose }: { ecoleId: number; adminId: number; name: string; onClose: () => void }) {
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.length < 6) return
    setLoading(true)
    try {
      await promoteurApi.resetMdp(ecoleId, adminId, pwd)
      setDone(true)
      setTimeout(onClose, 1200)
    } catch { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold">Réinitialiser le mot de passe</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {done ? (
            <p className="text-sm text-emerald-600 text-center py-2">✅ Mot de passe réinitialisé</p>
          ) : (
            <>
              <input
                type="password"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="Nouveau mot de passe (min. 6 caractères)"
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-3 py-2 text-xs text-muted-foreground hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
                <button type="submit" disabled={loading || pwd.length < 6} className="px-3 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {loading ? 'Envoi…' : 'Réinitialiser'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

function CreateAdminModal({ ecoleId, onClose, onCreated }: { ecoleId: number; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', telephone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.email || !form.password) { setError('Tous les champs obligatoires sont requis.'); return }
    setLoading(true)
    try {
      await promoteurApi.creerAdmin(ecoleId, form)
      onCreated()
    } catch { setError('Erreur lors de la création.') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold">Créer un compte administrateur</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}
          {[
            { key: 'first_name', label: 'Prénom *' },
            { key: 'last_name',  label: 'Nom *' },
            { key: 'email',      label: 'Email *', type: 'email' },
            { key: 'telephone',  label: 'Téléphone' },
            { key: 'password',   label: 'Mot de passe *', type: 'password' },
          ].map(({ key, label, type = 'text' }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={e => set(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-2 text-xs text-muted-foreground hover:bg-gray-100 rounded-lg transition-colors">Annuler</button>
            <button type="submit" disabled={loading} className="px-3 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground capitalize">{value}</p>
    </div>
  )
}
