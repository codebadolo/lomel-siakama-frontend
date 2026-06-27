import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, XCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { promoteurApi } from '@/api/promoteur.api'

export default function PromoteurMonitoringPage() {
  const qc = useQueryClient()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['promoteur-monitoring'],
    queryFn: promoteurApi.getMonitoring,
    refetchInterval: 5 * 60 * 1000,
  })

  const marquer = useMutation({
    mutationFn: (id: number) => promoteurApi.marquerPaye(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promoteur-monitoring'] }); qc.invalidateQueries({ queryKey: ['promoteur-abonnements'] }) },
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between animate-slide-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Alertes et état de la plateforme</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={13} />
          Actualiser
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Impossible de charger les données.</p>
      ) : (
        <div className="space-y-6">
          {/* Résumé global */}
          <div className="grid grid-cols-2 gap-4 animate-slide-in-up" style={{ animationDelay: '60ms' }}>
            <div className="p-4 bg-white border border-[var(--border)] rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">Écoles totales</p>
              <p className="text-3xl font-bold">{data.total_ecoles}</p>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-xs text-emerald-700 mb-1">Écoles actives</p>
              <p className="text-3xl font-bold text-emerald-700">{data.total_ecoles_actives}</p>
            </div>
          </div>

          {/* Écoles suspendues */}
          <AlertSection
            title="Écoles suspendues"
            icon={XCircle}
            color="red"
            count={data.ecoles_inactives.length}
          >
            {data.ecoles_inactives.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{e.nom}</p>
                  <p className="text-xs text-muted-foreground">{e.ville || e.type_ecole} · {e.nb_eleves} élèves</p>
                </div>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Suspendue</span>
              </div>
            ))}
          </AlertSection>

          {/* Abonnements expirant */}
          <AlertSection
            title="Abonnements expirant dans moins de 30 jours"
            icon={AlertTriangle}
            color="amber"
            count={data.abonnements_expirant.length}
          >
            {data.abonnements_expirant.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium capitalize">{a.plan} — {a.montant.toLocaleString('fr-FR')} FCFA</p>
                  <p className="text-xs text-muted-foreground">Fin : {a.date_fin} ({a.jours_restants} j)</p>
                </div>
                <button
                  onClick={() => marquer.mutate(a.id)}
                  className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Marquer payé
                </button>
              </div>
            ))}
          </AlertSection>

          {/* Abonnements expirés */}
          <AlertSection
            title="Abonnements expirés"
            icon={XCircle}
            color="red"
            count={data.abonnements_expires.length}
          >
            {data.abonnements_expires.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium capitalize">{a.plan} — {a.montant.toLocaleString('fr-FR')} FCFA</p>
                  <p className="text-xs text-muted-foreground">Expiré le : {a.date_fin}</p>
                </div>
                <button
                  onClick={() => marquer.mutate(a.id)}
                  className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Renouveler
                </button>
              </div>
            ))}
          </AlertSection>

          {data.ecoles_inactives.length === 0 && data.abonnements_expirant.length === 0 && data.abonnements_expires.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
              <CheckCircle size={48} className="mb-3" />
              <p className="text-base font-semibold">Tout est en ordre</p>
              <p className="text-sm text-muted-foreground mt-1">Aucune alerte active sur la plateforme.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AlertSection({ title, icon: Icon, color, count, children }: {
  title: string
  icon: any
  color: 'red' | 'amber' | 'emerald'
  count: number
  children: React.ReactNode
}) {
  const cfg = {
    red:     { header: 'bg-red-50 border-red-100',   text: 'text-red-700',   badge: 'bg-red-600'   },
    amber:   { header: 'bg-amber-50 border-amber-100', text: 'text-amber-700', badge: 'bg-amber-500' },
    emerald: { header: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', badge: 'bg-emerald-600' },
  }[color]

  return (
    <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden animate-slide-in-up">
      <div className={`flex items-center justify-between px-5 py-3 border-b ${cfg.header}`}>
        <div className={`flex items-center gap-2 ${cfg.text}`}>
          <Icon size={15} />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <span className={`text-xs text-white font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{count}</span>
      </div>
      {count === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Aucune alerte dans cette catégorie.</p>
      ) : (
        <div className="px-5 py-2">{children}</div>
      )}
    </div>
  )
}
