import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, Circle, X, Calendar } from 'lucide-react'
import { schoolsApi, type AnneeScolaire } from '@/api/schools.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function AnneesScolairesPage() {
  const qc   = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [modal, setModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['annees-scolaires'],
    queryFn:  () => schoolsApi.listAnneesScolaires(),
  })

  const activerMut = useMutation({
    mutationFn: (id: number) => schoolsApi.activerAnneeScolaire(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['annees-scolaires'] }),
  })

  const annees = data?.resultats ?? []

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Années scolaires"
        subtitle={`${annees.length} année${annees.length > 1 ? 's' : ''} enregistrée${annees.length > 1 ? 's' : ''}`}
        actions={
          <Button leftIcon={<Plus size={14} />} onClick={() => setModal(true)}>
            Nouvelle année
          </Button>
        }
      />

      {/* Active year banner */}
      {annees.find((a) => a.est_active) && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Année active : {annees.find((a) => a.est_active)?.libelle}
            </p>
            <p className="text-xs text-emerald-600">
              {(() => {
                const a = annees.find((x) => x.est_active)
                if (!a) return ''
                return `Du ${format(new Date(a.date_debut), 'd MMM yyyy', { locale: fr })} au ${format(new Date(a.date_fin), 'd MMM yyyy', { locale: fr })}`
              })()}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : annees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar size={40} className="text-gray-200 mb-3" />
          <p className="text-sm text-muted-foreground">Aucune année scolaire créée</p>
          <p className="text-xs text-gray-400 mt-1">Créez la première année scolaire de votre établissement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {annees.map((a) => (
            <AnneeScolaireCard
              key={a.id}
              annee={a}
              onActiver={() => activerMut.mutate(a.id)}
              isActivating={activerMut.isPending}
            />
          ))}
        </div>
      )}

      {modal && (
        <NouvelleAnneeModal
          ecoleId={user?.ecole ?? 0}
          onClose={() => setModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['annees-scolaires'] })
            setModal(false)
          }}
        />
      )}
    </div>
  )
}

function AnneeScolaireCard({ annee, onActiver, isActivating }: {
  annee: AnneeScolaire
  onActiver: () => void
  isActivating: boolean
}) {
  const fmtDate = (d: string) => format(new Date(d), 'd MMM yyyy', { locale: fr })

  return (
    <div className={`
      flex items-center gap-4 px-5 py-4 rounded-xl border transition-all
      ${annee.est_active
        ? 'bg-emerald-50 border-emerald-200 shadow-sm'
        : 'bg-white border-[var(--border)] hover:border-emerald-200 hover:bg-emerald-50/20'}
    `}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${annee.est_active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
        {annee.est_active
          ? <CheckCircle size={20} className="text-emerald-600" />
          : <Circle size={20} className="text-gray-400" />
        }
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-base font-bold text-foreground">{annee.libelle}</p>
          {annee.est_active && (
            <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
              ACTIVE
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {fmtDate(annee.date_debut)} → {fmtDate(annee.date_fin)}
        </p>
      </div>
      {!annee.est_active && (
        <Button
          variant="secondary"
          size="sm"
          loading={isActivating}
          onClick={onActiver}
        >
          Activer
        </Button>
      )}
    </div>
  )
}

function NouvelleAnneeModal({ ecoleId, onClose, onSuccess }: {
  ecoleId: number; onClose: () => void; onSuccess: () => void
}) {
  const [libelle,    setLibelle]    = useState('')
  const [dateDebut,  setDateDebut]  = useState('')
  const [dateFin,    setDateFin]    = useState('')
  const [err,        setErr]        = useState('')

  const mutation = useMutation({
    mutationFn: () => schoolsApi.createAnneeScolaire({
      libelle,
      date_debut: dateDebut,
      date_fin:   dateFin,
      ecole:      ecoleId,
    }),
    onSuccess,
    onError: () => setErr('Erreur lors de la création. Vérifiez les champs.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Nouvelle année scolaire</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Input
            label="Libellé"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Ex : 2025-2026"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date de début"
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
            <Input
              label="Date de fin"
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button
              size="sm"
              loading={mutation.isPending}
              onClick={() => {
                if (!libelle || !dateDebut || !dateFin) { setErr('Tous les champs sont requis.'); return }
                mutation.mutate()
              }}
            >
              Créer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
