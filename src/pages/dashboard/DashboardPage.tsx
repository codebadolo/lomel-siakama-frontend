import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, CheckSquare, MessageSquare, CreditCard, Building2,
  Bell, ArrowRight, BookOpen, AlertTriangle, GraduationCap,
  TrendingUp, Calendar,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth.store'
import { studentsApi } from '@/api/students.api'
import { notificationsApi } from '@/api/notifications.api'
import { promoteurApi } from '@/api/promoteur.api'
import { financesApi } from '@/api/finances.api'
import { attendanceApi } from '@/api/attendance.api'
import { schoolsApi } from '@/api/schools.api'
import { StatCard } from './components/StatCard'
import { RecentMessages } from './components/RecentMessages'
import { AttendanceChart } from './components/AttendanceChart'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'promoteur') return <PromoteurDashboard />
  return <AdminDashboard />
}

function AdminDashboard() {
  const user     = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const { data: elevesData } = useQuery({
    queryKey: ['dashboard-eleves-count'],
    queryFn: () => studentsApi.list({ taille_page: 1 }),
  })
  const { data: tauxData } = useQuery({
    queryKey: ['dashboard-taux-assiduite'],
    queryFn: () => attendanceApi.getTauxAssiduite(),
  })
  const { data: dashFinance } = useQuery({
    queryKey: ['dashboard-finance'],
    queryFn: () => financesApi.getTableauDeBord(),
  })
  const { data: classesData } = useQuery({
    queryKey: ['dashboard-classes-count'],
    queryFn: () => schoolsApi.listClasses(),
  })
  const { data: anneeScolaire } = useQuery({
    queryKey: ['annee-scolaire-active'],
    queryFn: () => schoolsApi.getAnneeActive(),
  })
  const { data: notifData } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: () => notificationsApi.list({ taille_page: 8 }),
  })

  const nbEleves     = elevesData?.total ?? '—'
  const tauxPresence = tauxData?.taux_presence !== undefined
    ? `${tauxData.taux_presence}%`
    : '—'
  const nbClasses    = classesData?.total ?? '—'
  const taux         = dashFinance?.taux_recouvrement ?? 0
  const notifications = notifData?.resultats ?? []

  const modeData = (dashFinance?.repartition_modes ?? []).map((m) => ({
    name: m.mode_paiement === 'especes'     ? 'Espèces'
        : m.mode_paiement === 'mobile_money' ? 'Mobile Money'
        : 'Virement',
    value: m.total,
  }))
  const MODE_COLORS = ['#10b981', '#3b82f6', '#f59e0b']

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px]">

      {/* Header + Année scolaire */}
      <div className="flex items-start justify-between animate-slide-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bonjour{user?.first_name ? `, ${user.first_name}` : ''} — vue d'ensemble de votre établissement.
          </p>
        </div>
        {anneeScolaire && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <Calendar size={14} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Année active</p>
              <p className="text-sm font-bold text-emerald-700">{anneeScolaire.libelle}</p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards — green theme */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Élèves actifs"         value={nbEleves}     icon={Users}        color="emerald" delay="0ms"   />
        <StatCard title="Taux d'assiduité"      value={tauxPresence} icon={CheckSquare}  color="emerald" delay="100ms" />
        <StatCard title="Classes"               value={nbClasses}    icon={GraduationCap} color="emerald" delay="200ms" />
        <StatCard title="Recouvrement"
          value={`${taux.toFixed(0)}%`}
          subtitle={`Impayé : ${Intl.NumberFormat('fr-FR').format(dashFinance?.total_impaye ?? 0)} F`}
          icon={CreditCard}
          color={taux >= 75 ? 'emerald' : taux >= 50 ? 'amber' : 'red'}
          delay="300ms"
        />
      </div>

      {/* Finance KPI row */}
      {dashFinance && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 animate-slide-in-up" style={{ animationDelay: '350ms' }}>
          {[
            { label: 'Frais attendu',   val: dashFinance.total_frais_attendu, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Collecté',        val: dashFinance.total_collecte,       color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Impayé',          val: dashFinance.total_impaye,         color: 'bg-red-50 text-red-700 border-red-200' },
            { label: 'Élèves impayés',  val: dashFinance.nb_eleves_impayes, format: 'count', color: 'bg-amber-50 text-amber-700 border-amber-200' },
          ].map(({ label, val, format: fmt, color }) => (
            <div key={label} className={`rounded-xl border px-4 py-3 ${color}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
              <p className="text-xl font-bold mt-1">
                {fmt === 'count'
                  ? val
                  : Intl.NumberFormat('fr-FR').format(val) + ' F'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AttendanceChart />

          {/* Finance — modes de paiement + évolution */}
          {modeData.length > 0 && (
            <div
              className="bg-white border border-[var(--border)] rounded-xl p-5 animate-slide-in-up"
              style={{ animationDelay: '450ms' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Répartition des paiements</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Par mode de paiement</p>
                </div>
                <button
                  onClick={() => navigate('/finances')}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Détails <ArrowRight size={12} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={modeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {modeData.map((_, i) => (
                        <Cell key={i} fill={MODE_COLORS[i % MODE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [Intl.NumberFormat('fr-FR').format(v) + ' F', '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {modeData.map((m, i) => (
                    <div key={m.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MODE_COLORS[i % MODE_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground flex-1">{m.name}</span>
                      <span className="text-xs font-semibold text-foreground">
                        {Intl.NumberFormat('fr-FR').format(m.value)} F
                      </span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={12} className="text-emerald-600" />
                      <span className="text-xs text-muted-foreground">Taux de recouvrement</span>
                      <span className="text-xs font-bold text-emerald-600 ml-auto">{taux.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <RecentMessages />
        </div>

        <div className="space-y-4">
          {/* Présence breakdown */}
          {tauxData && (
            <div
              className="bg-white border border-[var(--border)] rounded-xl p-4 animate-slide-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-3">Assiduité globale</h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  data={[
                    { name: 'Présents', value: tauxData.presents, fill: '#10b981' },
                    { name: 'Absents',  value: tauxData.absents,  fill: '#f87171' },
                    { name: 'Retards',  value: tauxData.retards,  fill: '#fbbf24' },
                  ]}
                  barSize={28}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[tauxData.presents, tauxData.absents, tauxData.retards].map((_, i) => (
                      <Cell key={i} fill={['#10b981', '#f87171', '#fbbf24'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 pt-2 border-t border-[var(--border)] text-xs text-center">
                <span className="text-muted-foreground">Taux présence : </span>
                <span className="font-bold text-emerald-600">{tauxData.taux_presence}%</span>
              </div>
            </div>
          )}

          {/* Messages en attente */}
          <div
            className="bg-white border border-[var(--border)] rounded-xl transition-all duration-500 hover:shadow-xl animate-slide-in-up"
            style={{ animationDelay: '500ms' }}
          >
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Tout voir <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {notifications.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">Aucune notification</p>
              ) : notifications.map((n, i) => (
                <div
                  key={n.id}
                  style={{ animationDelay: `${550 + i * 60}ms` }}
                  className={`animate-slide-in-up flex items-start gap-3 px-5 py-3.5 hover:bg-secondary transition-all duration-300 ${!n.est_lue ? 'bg-emerald-50/40' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!n.est_lue ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {n.titre}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(n.cree_le), 'd MMM, HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {!n.est_lue && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Raccourcis */}
          <div
            className="bg-white border border-[var(--border)] rounded-xl p-4 animate-slide-in-up"
            style={{ animationDelay: '600ms' }}
          >
            <h3 className="text-sm font-semibold text-foreground mb-3">Accès rapide</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Users,        label: 'Élèves',      to: '/eleves'    },
                { icon: BookOpen,     label: 'Bulletins',   to: '/bulletins' },
                { icon: CreditCard,   label: 'Finances',    to: '/finances'  },
                { icon: AlertTriangle,label: 'Discipline',  to: '/discipline'},
                { icon: MessageSquare,label: 'Messages',    to: '/messages'  },
                { icon: CheckSquare,  label: 'Présences',   to: '/presences' },
              ].map(({ icon: Icon, label, to }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all duration-200"
                >
                  <Icon size={13} className="text-emerald-600" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PromoteurDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['promoteur-dashboard'],
    queryFn: promoteurApi.getDashboard,
  })

  const fmt = (v: number) => Intl.NumberFormat('fr-FR').format(v) + ' FCFA'

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="h-8 bg-gray-100 rounded w-64 animate-pulse" />
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-destructive">Erreur lors du chargement du tableau de bord.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px]">
      <div className="animate-slide-in-up">
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord promoteur</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue consolidée de toutes vos écoles</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Écoles"            value={data.nb_ecoles}         icon={Building2}     color="emerald" delay="0ms"   />
        <StatCard title="Total élèves"      value={data.total_eleves}      icon={Users}         color="emerald" delay="100ms" />
        <StatCard title="Total classes"     value={data.total_classes}     icon={CheckSquare}   color="emerald" delay="200ms" />
        <StatCard title="Enseignants"       value={data.total_enseignants} icon={Users}         color="emerald" delay="300ms" />
        <StatCard title="Chiffre d'affaires" value={fmt(data.chiffre_affaires)} icon={CreditCard} color="emerald" delay="400ms" />
        <StatCard title="Impayés estimés"  value={fmt(data.impayes_estime)} icon={CreditCard}  color="red"     delay="500ms" />
      </div>

      <div
        className="bg-white border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-500 hover:shadow-xl animate-slide-in-up"
        style={{ animationDelay: '600ms' }}
      >
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-foreground">Détail par école</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Performances et indicateurs par établissement</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-gray-50/60">
              {['École','Élèves','Classes','Enseignants','Remplissage','Assiduité','CA','Impayés'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.ecoles.map((ecole) => (
              <tr key={ecole.id} className="hover:bg-secondary transition-all duration-300">
                <td className="px-5 py-3.5 font-semibold text-foreground">{ecole.nom}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.nb_eleves}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.nb_classes}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.nb_enseignants}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.taux_remplissage !== null ? `${ecole.taux_remplissage}%` : '—'}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.taux_assiduite !== null ? `${ecole.taux_assiduite}%` : '—'}</td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs">{fmt(ecole.chiffre_affaires)}</td>
                <td className="px-5 py-3.5 text-xs"><span className="text-red-500 font-medium">{fmt(ecole.impayes_estime)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
