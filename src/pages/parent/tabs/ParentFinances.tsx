import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react'
import { studentsApi } from '@/api/students.api'
import { financesApi, type Paiement, type FraisScolaire } from '@/api/finances.api'
import { bulletinsApi } from '@/api/bulletins.api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const MODE_LABEL: Record<string, string> = {
  especes:      'Espèces',
  mobile_money: 'Mobile Money',
  virement:     'Virement',
}

function fmt(n: number | string) {
  return Number(n).toLocaleString('fr-FR') + ' FCFA'
}

function SoldeCard({ eleveId, nomEleve }: { eleveId: number; nomEleve: string }) {
  const { data: solde } = useQuery({
    queryKey: ['parent-solde', eleveId],
    queryFn: () => bulletinsApi.getSoldeEleve(eleveId),
  })

  if (!solde) return null
  const ok = solde.solde <= 0

  return (
    <div className={`rounded-xl p-4 border ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{nomEleve}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total dû : {fmt(solde.total_du)} · Payé : {fmt(solde.total_paye)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
            {ok ? '✓ Soldé' : fmt(solde.solde)}
          </p>
          {!ok && <p className="text-xs text-red-400">restant dû</p>}
        </div>
      </div>
    </div>
  )
}

export function ParentFinances() {
  const [eleveId, setEleveId] = useState<number | null>(null)
  const [view, setView] = useState<'frais' | 'paiements'>('frais')

  const { data: enfantsData } = useQuery({
    queryKey: ['parent-enfants'],
    queryFn: () => studentsApi.list({ taille_page: 20 }),
  })
  const enfants = enfantsData?.resultats ?? []
  const selectedId = eleveId ?? (enfants[0]?.id ?? null)

  const { data: fraisData, isLoading: loadingF } = useQuery({
    queryKey: ['parent-frais'],
    queryFn: () => financesApi.listFrais(),
  })

  const { data: paiementsData, isLoading: loadingP } = useQuery({
    queryKey: ['parent-paiements', selectedId],
    queryFn: () => financesApi.listPaiements({ eleve: selectedId! }),
    enabled: !!selectedId,
  })

  const frais: FraisScolaire[] = fraisData?.resultats ?? []
  const paiements: Paiement[]  = paiementsData?.resultats ?? []
  const loading = loadingF || loadingP

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-amber-600" />
        <h2 className="text-base font-semibold">Finances</h2>
      </div>

      {/* Soldes par enfant */}
      {enfants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Situation financière</p>
          {enfants.map((e: any) => (
            <SoldeCard key={e.id} eleveId={e.id} nomEleve={`${e.prenom} ${e.nom}`} />
          ))}
        </div>
      )}

      {/* Sélecteur enfant */}
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

      {/* Onglets */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {([['frais','Frais scolaires'] as const, ['paiements','Historique paiements'] as const]).map(([k, l]) => (
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

      {!loading && view === 'frais' && (
        frais.length === 0
          ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun frais scolaire</p>
            </div>
          )
          : (
            <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="divide-y divide-[var(--border)]">
                {frais.map(f => {
                  const isEchu = f.date_echeance && new Date(f.date_echeance) < new Date()
                  return (
                    <div key={f.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{f.libelle}</p>
                        <p className="text-xs text-muted-foreground">
                          Échéance : {f.date_echeance ? format(new Date(f.date_echeance), 'd MMM yyyy', { locale: fr }) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{fmt(f.montant)}</p>
                        {isEchu
                          ? <p className="text-xs text-red-500 flex items-center gap-1 justify-end"><AlertCircle size={10} />Échu</p>
                          : <p className="text-xs text-emerald-600 flex items-center gap-1 justify-end"><CheckCircle size={10} />À jour</p>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
      )}

      {!loading && view === 'paiements' && (
        paiements.length === 0
          ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingDown size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun paiement enregistré</p>
            </div>
          )
          : (
            <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="divide-y divide-[var(--border)]">
                {paiements.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{p.libelle_frais}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.date_paiement), 'd MMM yyyy', { locale: fr })}
                        {' · '}{MODE_LABEL[p.mode_paiement] ?? p.mode_paiement}
                        {p.numero_recu && ` · Reçu #${p.numero_recu}`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{fmt(p.montant_paye)}</p>
                  </div>
                ))}
              </div>
            </div>
          )
      )}
    </div>
  )
}
