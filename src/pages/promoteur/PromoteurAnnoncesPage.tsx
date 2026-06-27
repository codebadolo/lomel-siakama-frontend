import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, Send } from 'lucide-react'
import { promoteurApi, type EcolePromo } from '@/api/promoteur.api'

export default function PromoteurAnnoncesPage() {
  const { data: ecoles = [] } = useQuery({ queryKey: ['promoteur-ecoles'], queryFn: promoteurApi.listEcoles })
  const [sujet,   setSujet]   = useState('')
  const [message, setMessage] = useState('')
  const [sendAll, setSendAll] = useState(true)
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ detail: string; nb: number } | null>(null)
  const [error, setError] = useState('')

  const toggleEcole = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sujet.trim() || !message.trim()) { setError('Sujet et message sont requis.'); return }
    if (!sendAll && selected.length === 0) { setError('Sélectionnez au moins une école.'); return }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await promoteurApi.envoyerAnnonce({
        sujet: sujet.trim(),
        message: message.trim(),
        ecoles: sendAll ? [] : selected,
      })
      setResult({ detail: res.detail, nb: res.nb_destinataires })
      setSujet('')
      setMessage('')
      setSelected([])
      setSendAll(true)
    } catch { setError("Erreur lors de l'envoi.") }
    finally { setLoading(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-[860px] space-y-6">
      <div className="animate-slide-in-up">
        <h1 className="text-2xl font-bold text-foreground">Annonces</h1>
        <p className="text-sm text-muted-foreground mt-1">Envoyer une notification à vos administrateurs d'école</p>
      </div>

      {/* Header card */}
      <div className="bg-gradient-to-r from-primary to-indigo-700 rounded-xl p-5 flex items-center gap-4 animate-slide-in-up" style={{ animationDelay: '60ms' }}>
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Megaphone size={24} className="text-white" />
        </div>
        <div className="text-white">
          <p className="font-semibold">Broadcast vers les admins</p>
          <p className="text-sm text-white/70">Les administrateurs recevront une notification dans leur espace</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[var(--border)] rounded-xl p-6 space-y-5 animate-slide-in-up" style={{ animationDelay: '120ms' }}>
        {result && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            <span className="text-emerald-600 text-sm font-medium">{result.detail}</span>
          </div>
        )}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Sujet */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Sujet *</label>
          <input
            type="text"
            value={sujet}
            onChange={e => setSujet(e.target.value)}
            placeholder="Ex : Maintenance de la plateforme le 15 juillet"
            className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Message *</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            placeholder="Rédigez votre annonce ici…"
            className="w-full px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">{message.length} caractère{message.length > 1 ? 's' : ''}</p>
        </div>

        {/* Destinataires */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Destinataires</label>
          <div className="flex gap-2 mb-3">
            <ToggleBtn active={sendAll}  label="Toutes les écoles" onClick={() => setSendAll(true)} />
            <ToggleBtn active={!sendAll} label="Sélection"         onClick={() => setSendAll(false)} />
          </div>
          {!sendAll && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
              {ecoles.map((e: EcolePromo) => (
                <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(e.id)}
                    onChange={() => toggleEcole(e.id)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">{e.nom}</span>
                </label>
              ))}
              {ecoles.length === 0 && <p className="text-xs text-muted-foreground col-span-2">Aucune école disponible</p>}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={15} />
          )}
          {loading ? 'Envoi en cours…' : 'Envoyer l\'annonce'}
        </button>
      </form>
    </div>
  )
}

function ToggleBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${active ? 'bg-primary text-white border-primary' : 'border-[var(--border)] text-muted-foreground hover:bg-gray-50'}`}
    >
      {label}
    </button>
  )
}
