import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Plus, CreditCard, Trash2, X, TrendingUp, AlertCircle,
  CheckCircle, Download, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { financesApi, type FraisScolaire, type DetailFraisDashboard } from '@/api/finances.api'
import { studentsApi } from '@/api/students.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'

type Tab = 'dashboard' | 'frais' | 'paiements' | 'impayes'

const fmt = (v: number | string) => Number(v).toLocaleString('fr-FR') + ' FCFA'

export default function FinancesPage() {
  const qc   = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [showFraisModal,    setShowFraisModal]    = useState(false)
  const [showPaiementModal, setShowPaiementModal] = useState(false)
  const [selectedFrais,     setSelectedFrais]     = useState<FraisScolaire | null>(null)

  const { data: fraisData, isLoading: loadingFrais } = useQuery({
    queryKey: ['frais'],
    queryFn: financesApi.listFrais,
  })
  const fraisList = fraisData?.resultats ?? []

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ['finances-dashboard'],
    queryFn: financesApi.getTableauDeBord,
  })

  const { data: impayesData, isLoading: loadingImpayes } = useQuery({
    queryKey: ['impayes'],
    queryFn: () => financesApi.getImpayes(15),
    enabled: tab === 'impayes',
  })
  const impayes = impayesData?.resultats ?? []

  const { data: paiementsData, isLoading: loadingPaie } = useQuery({
    queryKey: ['paiements', selectedFrais?.id],
    queryFn: () => financesApi.listPaiements({ frais: selectedFrais?.id }),
    enabled: tab === 'paiements',
  })
  const paiements = paiementsData?.resultats ?? []

  const deleteFraisMutation = useMutation({
    mutationFn: financesApi.deleteFrais,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['frais'] }),
  })

  const fraisColumns: ColumnDef<FraisScolaire>[] = [
    {
      header: 'Libellé',
      accessor: 'libelle',
      cell: (row) => <span className="font-medium text-foreground">{row.libelle}</span>,
    },
    {
      header: 'Montant attendu',
      accessor: 'montant',
      cell: (row) => <span className="text-foreground">{fmt(row.montant)}</span>,
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
              <div className={cn('h-full rounded-full', pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
          </div>
        )
      },
    },
    {
      header: 'Échéance',
      accessor: 'date_echeance',
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
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
          <span className="font-medium text-foreground">{row.nom_eleve}</span>
        </div>
      ),
    },
    {
      header: 'Frais',
      accessor: 'libelle_frais',
      cell: (row) => <span className="text-muted-foreground text-xs">{row.libelle_frais}</span>,
    },
    {
      header: 'Montant payé',
      accessor: 'montant_paye',
      cell: (row) => <span className="font-medium text-foreground">{fmt(row.montant_paye)}</span>,
    },
    {
      header: 'Mode',
      accessor: 'mode_label',
      cell: (row) => <span className="text-muted-foreground text-xs">{row.mode_label}</span>,
    },
    {
      header: 'Date',
      accessor: 'date_paiement',
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
          {format(new Date(row.date_paiement), 'd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
    {
      header: 'Relevé',
      accessor: 'eleve',
      cell: (row) => (
        <a
          href={financesApi.relevePdfUrl(row.eleve)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          title="Télécharger le relevé PDF"
        >
          <Download size={12} /> PDF
        </a>
      ),
    },
  ]

  const TABS: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Tableau de bord' },
    { key: 'frais',     label: 'Frais scolaires' },
    { key: 'paiements', label: 'Paiements' },
    { key: 'impayes',   label: `Impayés${impayesData ? ` (${impayesData.count})` : ''}` },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Finances"
        subtitle="Frais scolaires et suivi des paiements"
        actions={
          tab === 'frais' ? (
            <Button leftIcon={<Plus size={14} />} onClick={() => setShowFraisModal(true)}>
              Nouveau frais
            </Button>
          ) : tab === 'paiements' ? (
            <Button leftIcon={<Plus size={14} />} onClick={() => setShowPaiementModal(true)}>
              Enregistrer un paiement
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── Dashboard ────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <DashboardTab dashboard={dashboard} loading={loadingDash} />
      )}

      {/* ─── Frais ────────────────────────────────────────────────────────── */}
      {tab === 'frais' && (
        <DataTable
          data={fraisList}
          columns={fraisColumns}
          loading={loadingFrais}
          emptyMessage="Aucun frais créé. Créez un premier frais scolaire pour commencer le suivi."
          actions={(row) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSelectedFrais(row); setTab('paiements') }}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 border border-[var(--border)] rounded-md px-2 py-1 hover:bg-secondary transition-colors"
              >
                <CreditCard size={12} /> Paiements
              </button>
              <button
                onClick={() => { if (confirm('Supprimer ce frais ?')) deleteFraisMutation.mutate(row.id) }}
                className="p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        />
      )}

      {/* ─── Paiements ────────────────────────────────────────────────────── */}
      {tab === 'paiements' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedFrais(null)}
              className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
                !selectedFrais ? 'bg-primary border-primary text-white' : 'border-[var(--border)] text-muted-foreground hover:bg-secondary'
              )}
            >
              Tous
            </button>
            {fraisList.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFrais(f)}
                className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
                  selectedFrais?.id === f.id ? 'bg-primary border-primary text-white' : 'border-[var(--border)] text-muted-foreground hover:bg-secondary'
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

      {/* ─── Impayés ──────────────────────────────────────────────────────── */}
      {tab === 'impayes' && (
        <ImpayesTab impayes={impayes} loading={loadingImpayes} />
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

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ dashboard, loading }: { dashboard: Awaited<ReturnType<typeof financesApi.getTableauDeBord>> | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }
  if (!dashboard) return null

  const taux = dashboard.taux_recouvrement
  const modeLabels: Record<string, string> = { especes: 'Espèces', mobile_money: 'Mobile Money', virement: 'Virement' }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<TrendingUp size={18} />} label="Total attendu"       value={fmt(dashboard.total_frais_attendu)} color="blue" />
        <KpiCard icon={<CheckCircle size={18} />} label="Total collecté"     value={fmt(dashboard.total_collecte)}      color="green" />
        <KpiCard icon={<AlertCircle size={18} />} label="Solde impayé"       value={fmt(dashboard.total_impaye)}        color={dashboard.total_impaye > 0 ? 'red' : 'green'} />
        <KpiCard icon={<RefreshCw  size={18} />} label="Taux recouvrement"   value={`${taux}%`}                        color={taux >= 80 ? 'green' : taux >= 50 ? 'amber' : 'red'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Alerte élèves impayés */}
        {dashboard.nb_eleves_impayes > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">{dashboard.nb_eleves_impayes} élève{dashboard.nb_eleves_impayes > 1 ? 's' : ''} avec impayé</p>
              <p className="text-xs text-red-600 mt-0.5">Consultez l'onglet Impayés pour le détail.</p>
            </div>
          </div>
        )}

        {/* Répartition modes */}
        {dashboard.repartition_modes.length > 0 && (
          <div className="bg-white border border-[var(--border)] rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Répartition par mode</p>
            <div className="space-y-2">
              {dashboard.repartition_modes.map((m) => {
                const pct = dashboard.total_collecte > 0
                  ? Math.round((m.total / dashboard.total_collecte) * 100)
                  : 0
                return (
                  <div key={m.mode_paiement} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0">{modeLabels[m.mode_paiement] ?? m.mode_paiement}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground w-16 text-right">{fmt(m.total)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Détail par frais */}
      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <p className="text-sm font-semibold text-foreground">Suivi par frais</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Frais</th>
                <th className="text-right px-3 py-3 font-medium">Attendu</th>
                <th className="text-right px-3 py-3 font-medium">Collecté</th>
                <th className="text-right px-3 py-3 font-medium">Restant</th>
                <th className="text-center px-3 py-3 font-medium">Taux</th>
                <th className="text-left px-3 py-3 font-medium">Échéance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {dashboard.detail_par_frais.map((f: DetailFraisDashboard) => (
                <tr key={f.frais_id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{f.libelle}</p>
                    <p className="text-[11px] text-muted-foreground">{f.nb_eleves} élève{f.nb_eleves > 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground">{fmt(f.montant_attendu)}</td>
                  <td className="px-3 py-3 text-right text-emerald-600 font-medium">{fmt(f.montant_collecte)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={f.montant_restant > 0 ? 'text-red-500 font-medium' : 'text-emerald-600'}>
                      {fmt(f.montant_restant)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', f.taux_recouvrement >= 80 ? 'bg-emerald-500' : f.taux_recouvrement >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                          style={{ width: `${f.taux_recouvrement}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{f.taux_recouvrement}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <span className={f.est_echu ? 'text-red-500 font-medium' : ''}>
                      {format(new Date(f.echeance), 'd MMM yyyy', { locale: fr })}
                      {f.est_echu && ' ⚠'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dashboard.detail_par_frais.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">Aucun frais créé.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Impayés Tab ─────────────────────────────────────────────────────────────

function ImpayesTab({ impayes, loading }: { impayes: ReturnType<typeof financesApi.getImpayes> extends Promise<{ resultats: infer T }> ? T : never; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
      </div>
    )
  }

  if (impayes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-[var(--border)] rounded-xl">
        <CheckCircle size={32} className="text-emerald-500 mb-3" />
        <p className="text-sm font-medium text-foreground">Aucun impayé en retard</p>
        <p className="text-xs text-muted-foreground mt-1">Tous les paiements sont à jour (seuil : 15 jours).</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <AlertTriangle size={15} className="text-red-500" />
        <p className="text-sm font-semibold text-foreground">{impayes.length} impayé{impayes.length > 1 ? 's' : ''} en retard (+ 15 jours)</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left px-5 py-3 font-medium">Élève</th>
            <th className="text-left px-3 py-3 font-medium">Frais</th>
            <th className="text-right px-3 py-3 font-medium">Restant</th>
            <th className="text-left px-3 py-3 font-medium">Échéance</th>
            <th className="px-3 py-3 font-medium">Relevé</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {impayes.map((imp, i) => (
            <tr key={i} className="hover:bg-red-50/40 transition-colors">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <Avatar name={imp.nom_eleve} size="sm" />
                  <span className="font-medium text-foreground">{imp.nom_eleve}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-muted-foreground text-xs">{imp.frais}</td>
              <td className="px-3 py-3 text-right text-red-500 font-semibold">{fmt(imp.restant)}</td>
              <td className="px-3 py-3 text-xs text-red-500 font-medium">
                {format(new Date(imp.echeance), 'd MMM yyyy', { locale: fr })}
              </td>
              <td className="px-3 py-3 text-center">
                <a
                  href={financesApi.relevePdfUrl(imp.eleve_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Download size={12} /> PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const styles: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-600',
    red:   'bg-red-50 text-red-500',
    blue:  'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-4 animate-slide-in-up">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', styles[color] ?? styles.blue)}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function FraisFormModal({ ecoleId, onClose }: { ecoleId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({
    defaultValues: { libelle: '', montant: '', date_echeance: '' },
  })
  const mut = useMutation({
    mutationFn: (v: { libelle: string; montant: string; date_echeance: string }) =>
      financesApi.createFrais({ ...v, ecole: ecoleId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['frais'] }); qc.invalidateQueries({ queryKey: ['finances-dashboard'] }); onClose() },
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
    defaultValues: {
      eleve: 0, frais: 0, montant_paye: '',
      date_paiement: format(new Date(), 'yyyy-MM-dd'),
      mode_paiement: 'especes', numero_recu: '',
    },
  })
  const mut = useMutation({
    mutationFn: (v: Parameters<typeof financesApi.createPaiement>[0]) => financesApi.createPaiement(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paiements'] })
      qc.invalidateQueries({ queryKey: ['finances-dashboard'] })
      qc.invalidateQueries({ queryKey: ['impayes'] })
      onClose()
    },
  })

  return (
    <Modal title="Enregistrer un paiement" onClose={onClose}>
      <form onSubmit={handleSubmit((v) => mut.mutate(v as Parameters<typeof financesApi.createPaiement>[0]))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Rechercher un élève</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou prénom (min. 2 caractères)…"
            className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {eleves.length > 0 && (
            <div className="mt-1 border border-[var(--border)] rounded-md overflow-hidden divide-y divide-[var(--border)]">
              {eleves.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => { setValue('eleve', e.id); setSearch(`${e.prenom} ${e.nom}`) }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-secondary text-sm"
                >
                  <Avatar name={`${e.prenom} ${e.nom}`} size="sm" />
                  {e.prenom} {e.nom} — <span className="text-muted-foreground text-xs">{e.matricule}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Frais concerné</label>
          <select {...register('frais', { setValueAs: Number })} className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40">
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
            <label className="block text-sm font-medium text-foreground mb-1">Mode</label>
            <select {...register('mode_paiement')} className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40">
              <option value="especes">Espèces</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="virement">Virement</option>
            </select>
          </div>
          <Input label="N° reçu" {...register('numero_recu')} placeholder="Optionnel" />
        </div>
        {mut.isError && <p className="text-xs text-destructive">Erreur lors de l'enregistrement.</p>}
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose}><X size={18} className="text-muted-foreground hover:text-foreground" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
