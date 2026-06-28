import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, type TooltipProps,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { attendanceApi } from '@/api/attendance.api'

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-xl text-xs shadow-xl">
      <p className="font-bold text-sm mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-white/70">
            {p.name === 'presents' ? 'Présents' : p.name === 'absents' ? 'Absents' : 'Retards'}
          </span>
          <span className="font-semibold ml-auto pl-4">{p.value}</span>
        </div>
      ))}
      {payload[0] && (
        <div className="pt-2 mt-1 border-t border-white/20 text-white/60">
          Taux : {payload[0]?.payload?.taux_presence?.toFixed(1)}%
        </div>
      )}
    </div>
  )
}

const SKELETON = [...Array(7)].map((_, i) => ({
  date: format(subDays(new Date(), 6 - i), 'd MMM', { locale: fr }),
  presents: 0,
  absents: 0,
  retards: 0,
  taux_presence: 0,
}))

export function AttendanceChart() {
  const dateDebut = format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const dateFin   = format(new Date(), 'yyyy-MM-dd')

  const { data, isLoading } = useQuery({
    queryKey: ['presence-evolution', dateDebut, dateFin],
    queryFn:  () => attendanceApi.getEvolution({ date_debut: dateDebut, date_fin: dateFin }),
    staleTime: 5 * 60 * 1000,
  })

  const chartData = isLoading || !data?.length
    ? SKELETON
    : data.map((d) => ({
        ...d,
        date: format(new Date(d.date), 'd MMM', { locale: fr }),
      }))

  const totalPresents = data?.reduce((s, d) => s + d.presents, 0) ?? 0
  const totalTotal    = data?.reduce((s, d) => s + d.total, 0) ?? 0
  const tauxMoyen     = totalTotal > 0 ? ((totalPresents / totalTotal) * 100).toFixed(1) : '—'
  const picPresents   = data ? Math.max(...data.map((d) => d.presents), 0) : 0

  return (
    <div
      className="bg-white border border-[var(--border)] rounded-xl p-5 transition-all duration-500 hover:shadow-xl animate-slide-in-up"
      style={{ animationDelay: '400ms' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Évolution des présences</h3>
          <p className="text-xs text-muted-foreground mt-0.5">30 derniers jours</p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Présents
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Absents
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />Retards
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[200px] bg-gray-50 rounded-lg animate-pulse" />
      ) : !data?.length ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          Aucune donnée de présence enregistrée
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f87171" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="presents"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradPresent)"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
            <Area
              type="monotone"
              dataKey="absents"
              stroke="#f87171"
              strokeWidth={1.5}
              fill="url(#gradAbsent)"
              dot={false}
              activeDot={{ r: 4, fill: '#f87171' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">Taux moyen : </span>
          <span className="font-semibold text-emerald-600">{tauxMoyen}%</span>
        </div>
        {picPresents > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Pic : </span>
            <span className="font-semibold text-foreground">{picPresents}</span>
          </div>
        )}
      </div>
    </div>
  )
}
