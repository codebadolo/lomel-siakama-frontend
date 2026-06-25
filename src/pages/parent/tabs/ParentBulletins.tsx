import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Download, Loader2 } from 'lucide-react'
import { studentsApi } from '@/api/students.api'
import { bulletinsApi } from '@/api/bulletins.api'
import { evaluationsApi, type Trimestre } from '@/api/evaluations.api'

const TRIMESTRES: { key: Trimestre; label: string }[] = [
  { key: 'T1', label: '1er Trimestre' },
  { key: 'T2', label: '2ème Trimestre' },
  { key: 'T3', label: '3ème Trimestre' },
]

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function ParentBulletins() {
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data: enfantsData } = useQuery({
    queryKey: ['parent-enfants'],
    queryFn: () => studentsApi.list({ taille_page: 20 }),
  })
  const enfants = enfantsData?.resultats ?? []

  const handleDownload = async (eleveId: number, nomEleve: string, trimestre: Trimestre) => {
    const key = `${eleveId}-${trimestre}`
    setDownloading(key)
    try {
      const blob = await bulletinsApi.getBulletinPdf(eleveId, trimestre)
      downloadBlob(blob, `Bulletin_${nomEleve.replace(/ /g, '_')}_${trimestre}.pdf`)
    } catch {
      // PDF not yet generated
    } finally {
      setDownloading(null)
    }
  }

  const { data: previewData, isLoading } = useQuery({
    queryKey: ['parent-bulletins-preview', enfants.map((e: any) => e.id)],
    queryFn: async () => {
      const rows: Array<{
        eleve: any; trimestre: Trimestre
        moy: number | null; base: 10 | 20; mention: string | null
      }> = []
      for (const e of enfants) {
        for (const t of TRIMESTRES) {
          try {
            const b = await evaluationsApi.getBulletin(e.id, t.key)
            rows.push({ eleve: e, trimestre: t.key, moy: b.moyenne_generale, base: b.base_notation ?? 20, mention: b.mention ?? null })
          } catch {
            rows.push({ eleve: e, trimestre: t.key, moy: null, base: 20, mention: null })
          }
        }
      }
      return rows
    },
    enabled: enfants.length > 0,
  })

  const byEleve = enfants.map((e: any) => ({
    eleve: e,
    trimestres: TRIMESTRES.map(t => {
      const found = previewData?.find(r => r.eleve.id === e.id && r.trimestre === t.key)
      return { ...t, moy: found?.moy ?? null, base: found?.base ?? 20, mention: found?.mention ?? null }
    }),
  }))

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-primary" />
        <h2 className="text-base font-semibold">Bulletins scolaires</h2>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Chargement...</p>}

      {!isLoading && enfants.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun enfant associé</p>
        </div>
      )}

      <div className="space-y-4">
        {byEleve.map(({ eleve, trimestres }) => (
          <div key={eleve.id} className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-secondary/30 border-b">
              <p className="text-sm font-semibold">{eleve.prenom} {eleve.nom}</p>
              <p className="text-xs text-muted-foreground">{eleve.nom_classe ?? 'Sans classe'}</p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {trimestres.map(({ key, label, moy, base, mention }) => {
                const dk = `${eleve.id}-${key}`
                const pct = moy !== null ? (moy / base) * 100 : 0
                const color = moy !== null
                  ? (pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500')
                  : 'text-muted-foreground'
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      {moy !== null
                        ? (
                          <p className={`text-xs font-semibold ${color}`}>
                            Moyenne : {moy.toFixed(2)}/{base}
                            {mention && <span className="ml-2 font-normal text-muted-foreground">· {mention}</span>}
                          </p>
                        )
                        : <p className="text-xs text-muted-foreground">Non disponible</p>
                      }
                    </div>
                    <button
                      onClick={() => handleDownload(eleve.id, `${eleve.prenom} ${eleve.nom}`, key)}
                      disabled={downloading === dk}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {downloading === dk
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Download size={12} />
                      }
                      PDF
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
