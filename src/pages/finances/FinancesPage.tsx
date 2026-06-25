import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, CreditCard, Trash2, X, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { financesApi, type FraisScolaire } from '@/api/finances.api'
import { studentsApi } from '@/api/students.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'

type Tab = 'frais' | 'paiements'

const fmt = (v: number | string) => Number(v).toLocaleString('fr-FR') + ' FCFA'

export default function FinancesPage() {
  const qc   = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('frais')
  const [showFraisModal,    setShowFraisModal]    = useState(false)
  const [showPaiementModal, setShowPaiementModal] = useState(false)
  const [selectedFrais,     setSelectedFrais]     = useState<FraisScolaire | null>(null)

  const { data: fraisData, isLoading: loadingFrais } = useQuery({
    queryKey: ['frais'],
    queryFn: financesApi.listFrais,
  })
  const fraisList = fraisData?.resultats ?? []

  const { data: paiementsData, isLoading: loadingPaie } = useQuery({
    queryKey: ['paiements', selectedFrais?.id],
    queryFn: () => financesApi.listPaiements({ frais: selectedFrais?.id }),
  })
  const paiements = paiementsData?.resultats ?? []

  const deleteFraisMutation = useMutation({
    mutationFn: financesApi.deleteFrais,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['frais'] }),
  })

  const totalFrais    = fraisList.reduce((s, f) => s + Number(f.montant), 0)
  const totalCollecte = fraisList.reduce((s, f) => s + Number(f.montant_collecte), 0)
  const tauxRecouvrement = totalFrais > 0 ? Math.round((totalCollecte / totalFrais) * 100) : 0

  const fraisColumns: ColumnDef<FraisScolaire>[] = [
    {
      header: 'Libellé',
      accessor: 'libelle',
      cell: (row) => <span className="font-medium text-gray-900">{row.libelle}</span>,
    },
    {
      header: 'Montant attendu',
      accessor: 'montant',
      cell: (row) => <span className="text-gray-700">{fmt(row.montant)}</span>,
    },
    {
      header: 'Collecté',
      accessor: 'montant_collecte',
      cell: (row) => <span className="text-emerald-700 font-medium">{fmt(row.montant_collecte)}</span>,
    },
    {
      header: 'Taux',
      accessor: 'id',
      cell: (row) => {
        const pct = Number(row.montant) > 0
          ? Math.min(100, Math.round((Number(row.montant_collecte) / Number(row.montant)) * 100))
          : 0
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-indigo-600 font-medium">{pct}%</span>
          </div>
        )
      },
    },
    {
      header: 'Échéance',
      accessor: 'date_echeance',
      cell: (row) => (
        <span className="text-gray-400 text-xs">
          {format(new Date(row.date_echeance), 'd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
  ]

  const paiementsColumns: ColumnDef<typeof paiements[0]>[] = [
    {
      header: 'Élève',
      accessor: 'nom_eleve',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.nom_eleve} size="sm" />
          <span className="font-medium text-gray-900">{row.nom_eleve}</span>
        </div>
      ),
    },
    {
      header: 'Frais',
      accessor: 'libelle_frais',
      cell: (row) => <span className="text-gray-600 text-xs">{row.libelle_frais}</span>,
    },
    {
      header: 'Montant payé',
      accessor: 'montant_paye',
      cell: (row) => <span className="font-medium text-gray-900">{fmt(row.montant_paye)}</span>,
    },
    {
      header: 'Mode',
      accessor: 'mode_label',
      cell: (row) => <span className="text-gray-500 text-xs">{row.mode_label}</span>,
    },
    {
      header: 'Date',
      accessor: 'date_paiement',
      cell: (row) => (
        <span className="text-gray-400 text-xs">
          {format(new Date(row.date_paiement), 'd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Finances"
        subtitle="Frais scolaires et suivi des paiements"
        actions={
          <Button
            leftIcon={<Plus size={14} />}
            onClick={() => tab === 'frais' ? setShowFraisModal(true) : setShowPaiementModal(true)}
          >
            {tab === 'frais' ? 'Nouveau frais' : 'Enregistrer un paiement'}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp size={18} />} label="Total attendu"        value={fmt(totalFrais)}           color="indigo" />
        <StatCard icon={<CheckCircle size={18} />} label="Total collecté"      value={fmt(totalCollecte)}        color="emerald" />
        <StatCard icon={<AlertCircle size={18} />} label="Taux de recouvrement" value={`${tauxRecouvrement}%`}  color={tauxRecouvrement >= 80 ? 'emerald' : 'amber'} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['frais', 'paiements'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t === 'frais' ? 'Frais scolaires' : 'Historique des paiements'}
          </button>
        ))}
      </div>

      {tab === 'frais' ? (
        <DataTable
          data={fraisList}
          columns={fraisColumns}
          loading={loadingFrais}
          emptyMessage="Aucun frais créé. Créez un premier frais scolaire pour commencer le suivi."
          actions={(row) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSelectedFrais(row); setTab('paiements') }}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-md px-2 py-1 hover:bg-indigo-50 transition-colors"
                title="Voir les paiements"
              >
                <CreditCard size={12} /> Paiements
              </button>
              <button
                onClick={() => { if (confirm('Supprimer ce frais ?')) deleteFraisMutation.mutate(row.id) }}
                className="p-1.5 text-gray-300 hover:text-red-500 rounded-md transition-colors"
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedFrais(null)}
              className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
                !selectedFrais ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              Tous
            </button>
            {fraisList.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFrais(f)}
                className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
                  selectedFrais?.id === f.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {f.libelle}
              </button>
            ))}
          </div>
          <DataTable
            data={paiements}
            columns={paiementsColumns}
            loading={loadingPaie}
            emptyMessage="Aucun paiement enregistré"
          />
        </div>
      )}

      {showFraisModal && (
        <FraisFormModal ecoleId={user?.ecole ?? 0} onClose={() => setShowFraisModal(false)} />
      )}
      {showPaiementModal && (
        <PaiementFormModal fraisList={fraisList} onClose={() => setShowPaiementModal(false)} />
      )}
    </div>
  )
}

function FraisFormModal({ ecoleId, onClose }: { ecoleId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({
    defaultValues: { libelle: '', montant: '', date_echeance: '' },
  })
  const mut = useMutation({
    mutationFn: (v: { libelle: string; montant: string; date_echeance: string }) =>
      financesApi.createFrais({ ...v, ecole: ecoleId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['frais'] }); onClose() },
  })
  return (
    <Modal title="Nouveau frais scolaire" onClose={onClose}>
      <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4">
        <Input label="Libellé" {...register('libelle', { required: true })} placeholder="Ex: Frais d'inscription 2025-2026" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Montant (FCFA)" type="number" {...register('montant', { required: true })} placeholder="75000" />
          <Input label="Date d'échéance" type="date" {...register('date_echeance', { required: true })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button type="submit" size="sm" loading={mut.isPending}>Créer</Button>
        </div>
      </form>
    </Modal>
  )
}

function PaiementFormModal({ fraisList, onClose }: { fraisList: FraisScolaire[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const { data: elevesData } = useQuery({
    queryKey: ['eleves-search', search],
    queryFn: () => studentsApi.list({ search: search || undefined, taille_page: 10 }),
    enabled: search.length >= 2,
  })
  const eleves = elevesData?.resultats ?? []

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: { eleve: 0, frais: 0, montant_paye: '', date_paiement: format(new Date(), 'yyyy-MM-dd'), mode_paiement: 'especes', numero_recu: '' },
  })
  const mut = useMutation({
    mutationFn: (v: any) => financesApi.createPaiement(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['paiements'] }); onClose() },
  })

  return (
    <Modal title="Enregistrer un paiement" onClose={onClose}>
      <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rechercher un élève</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou prénom (min. 2 caractères)…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {eleves.length > 0 && (
            <div className="mt-1 border border-gray-200 rounded-md overflow-hidden divide-y divide-gray-100">
              {eleves.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => { setValue('eleve', e.id); setSearch(`${e.prenom} ${e.nom}`) }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  <Avatar name={`${e.prenom} ${e.nom}`} size="sm" />
                  {e.prenom} {e.nom} — <span className="text-gray-400 text-xs">{e.matricule}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frais concerné</label>
          <select {...register('frais', { setValueAs: Number })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="">Sélectionner…</option>
            {fraisList.map((f) => <option key={f.id} value={f.id}>{f.libelle} ({fmt(f.montant)})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Montant payé (FCFA)" type="number" {...register('montant_paye')} />
          <Input label="Date" type="date" {...register('date_paiement')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
            <select {...register('mode_paiement')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="especes">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="virement">Virement</option>
            </select>
          </div>
          <Input label="N° reçu" {...register('numero_recu')} placeholder="Optionnel" />
        </div>
        {mut.isError && <p className="text-xs text-red-500">Erreur lors de l'enregistrement.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button type="submit" size="sm" loading={mut.isPending}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    indigo:  'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', colors[color])}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}
