import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, type TooltipProps,
} from 'recharts'

const DATA = [
  { jour: 'Lun', presents: 312, absents: 30 },
  { jour: 'Mar', presents: 298, absents: 44 },
  { jour: 'Mer', presents: 325, absents: 17 },
  { jour: 'Jeu', presents: 308, absents: 34 },
  { jour: 'Ven', presents: 320, absents: 22 },
  { jour: 'Sam', presents: 285, absents: 57 },
]

const PRESENT_COLORS = ['#4f46e5', '#4338ca', '#6366f1', '#4f46e5', '#4338ca', '#6366f1']

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-xl text-xs shadow-xl">
      <p className="font-bold text-sm mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-white/70 capitalize">{p.name === 'presents' ? 'Présents' : 'Absents'}</span>
          <span className="font-semibold ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AttendanceChart() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const total = DATA.reduce((s, d) => s + d.presents, 0)
  const avg = Math.round(total / DATA.length)

  return (
    <div
      className="bg-gradient-to-br from-white to-gray-50/60 border border-[var(--border)] rounded-xl p-5 transition-all duration-500 hover:shadow-xl animate-slide-in-up"
      style={{ animationDelay: '400ms' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Présences — semaine en cours</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Présents vs absents par jour</p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
            Présents
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" />
            Absents
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={DATA} barSize={20} barCategoryGap="35%">
          <defs>
            <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar
            dataKey="presents"
            name="presents"
            fill="url(#presentGrad)"
            radius={[6, 6, 0, 0]}
            onMouseEnter={(_, index) => setHoveredBar(index)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            {DATA.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={hoveredBar === index ? '#4f46e5' : PRESENT_COLORS[index]}
                style={{ filter: hoveredBar === index ? 'brightness(1.15) drop-shadow(0 4px 8px rgba(79,70,229,0.35))' : 'none' }}
              />
            ))}
          </Bar>
          <Bar dataKey="absents" name="absents" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">Moyenne : </span>
          <span className="font-semibold text-foreground">{avg} élèves/jour</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Pic : </span>
          <span className="font-semibold text-primary">{Math.max(...DATA.map(d => d.presents))} élèves</span>
        </div>
      </div>
    </div>
  )
}
