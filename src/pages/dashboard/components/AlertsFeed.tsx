import { useState } from 'react'
import { User, MessageSquare, CreditCard, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Alert { id: string; type: 'absence' | 'message' | 'paiement' | 'discipline'; title: string; desc: string; time: string }

const ALERTS: Alert[] = [
  { id: '1', type: 'absence',    title: '3 absences ce matin',        desc: '6ème A — cours de 8h00',      time: 'il y a 2h' },
  { id: '2', type: 'message',    title: '2 messages sans réponse',    desc: 'En attente depuis + de 24h',  time: 'il y a 3h' },
  { id: '3', type: 'paiement',   title: '5 frais scolaires échus',    desc: "Date d'échéance dépassée",    time: 'Hier'      },
  { id: '4', type: 'discipline', title: 'Incident disciplinaire',     desc: 'Koné Ibrahim — 5ème B',       time: 'Hier'      },
]

const CFG: Record<Alert['type'], { icon: LucideIcon; iconColor: string; bg: string; label: string; badgeColor: string }> = {
  absence:    { icon: User,          iconColor: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Absence',    badgeColor: 'bg-amber-100 text-amber-700'    },
  message:    { icon: MessageSquare, iconColor: 'text-primary',    bg: 'bg-indigo-50', label: 'Message',    badgeColor: 'bg-indigo-100 text-indigo-700'  },
  paiement:   { icon: CreditCard,    iconColor: 'text-red-500',    bg: 'bg-red-50',    label: 'Paiement',   badgeColor: 'bg-red-100 text-red-600'        },
  discipline: { icon: AlertTriangle, iconColor: 'text-orange-600', bg: 'bg-orange-50', label: 'Discipline', badgeColor: 'bg-orange-100 text-orange-700'  },
}

export function AlertsFeed() {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div
      className="bg-white border border-[var(--border)] rounded-xl transition-all duration-500 hover:shadow-xl flex flex-col animate-slide-in-up"
      style={{ animationDelay: '600ms' }}
    >
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-foreground">Alertes du jour</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Points d'attention immédiats</p>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {ALERTS.map((a, i) => {
          const { icon: Icon, iconColor, bg, label, badgeColor } = CFG[a.type]
          return (
            <div
              key={a.id}
              onMouseEnter={() => setHovered(a.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ animationDelay: `${650 + i * 80}ms` }}
              className="animate-slide-in-up flex items-start gap-3 px-5 py-4 hover:bg-secondary transition-all duration-300 cursor-pointer group"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg} transition-transform duration-300 ${hovered === a.id ? 'scale-110' : ''}`}>
                <Icon size={15} className={iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-all duration-300 group-hover:scale-105 ${badgeColor}`}>
                  {label}
                </span>
                <span className="text-[11px] text-muted-foreground">{a.time}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
