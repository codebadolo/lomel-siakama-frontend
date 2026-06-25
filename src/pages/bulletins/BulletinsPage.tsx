import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Download, FileText } from 'lucide-react'
import { bulletinsApi, type ImpayeItem } from '@/api/bulletins.api'
import { studentsApi } from '@/api/students.api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'

type Trimestre = 'T1' | 'T2' | 'T3'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const fmt = (v: number) => v.toLocaleString('fr-FR') + ' FCFA'

export default function BulletinsPage() {
  const [eleveSearch, setEleveSearch] = useState('')
  const [selectedEleveId, setSelectedEleveId] = useState<number | null>(null)
  const [selectedEleveName, setSelectedEleveName] = useState('')
  const [trimestre, setTrimestre] = useState<Trimestre>('T1')
  const [downloading, setDownloading] = useState(false)

  const { data: elevesData } = useQuery({
    queryKey: ['eleves-search-bulletins', eleveSearch],
    queryFn: () => studentsApi.list({ search: eleveSearch || undefined, taille_page: 10 }),
    enabled: eleveSearch.length >= 2,
  })
  const elevesResults = elevesData?.resultats ?? []

  const { data: impayesData, isLoading: loadingImpayes } = useQuery({
    queryKey: ['impayes'],
    queryFn: () => bulletinsApi.getImpayes(),
  })

  async function handleDownloadBulletin() {
    if (!selectedEleveId) return
    setDownloading(true)
    try {
      const blob = await bulletinsApi.getBulletinPdf(selectedEleveId, trimestre)
      downloadBlob(blob, `bulletin_${selectedEleveName}_${trimestre}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  const impayeColumns: ColumnDef<ImpayeItem>[] = [
    {
      header: 'Élève',
      accessor: 'nom_eleve',
      cell: (row) => <span className="font-medium text-gray-900">{row.nom_eleve}</span>,
    },
    {
      header: 'Frais',
      accessor: 'frais',
      cell: (row) => <span className="text-gray-600 text-xs">{row.frais}</span>,
    },
    {
      header: 'Montant restant',
      accessor: 'restant',
      cell: (row) => <span className="font-medium text-red-500">{fmt(row.restant)}</span>,
    },
    {
      header: 'Échéance',
      accessor: 'echeance',
      cell: (row) => (
        <span className="text-gray-500 text-xs">
          {format(new Date(row.echeance), 'd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <PageHeader
        title="Bulletins"
        subtitle="Téléchargement des bulletins scolaires et suivi des impayés"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/dashboard' },
          { label: 'Bulletins' },
        ]}
      />

      {/* Sélecteur bulletin */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={15} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Télécharger un bulletin</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Élève</label>
            <input
              value={eleveSearch}
              onChange={(e) => { setEleveSearch(e.target.value); setSelectedEleveId(null) }}
              placeholder="Rechercher un élève (min. 2 caractères)…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {elevesResults.length > 0 && !selectedEleveId && (
              <div className="mt-1 border border-gray-200 rounded-md overflow-hidden divide-y divide-gray-100 shadow-sm">
                {elevesResults.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setSelectedEleveId(e.id)
                      const name = `${e.prenom}_${e.nom}`
                      setSelectedEleveName(name)
                      setEleveSearch(`${e.prenom} ${e.nom}`)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-900"
                  >
                    {e.prenom} {e.nom} — <span className="text-xs text-gray-400">{e.matricule}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
            <select
              value={trimestre}
              onChange={(e) => setTrimestre(e.target.value as Trimestre)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="T1">1er trimestre</option>
              <option value="T2">2ème trimestre</option>
              <option value="T3">3ème trimestre</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            leftIcon={<Download size={14} />}
            onClick={handleDownloadBulletin}
            disabled={!selectedEleveId}
            loading={downloading}
          >
            Télécharger le bulletin PDF
          </Button>
        </div>
      </div>

      {/* Tableau des impayés */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Élèves avec impayés</h3>
        <DataTable
          data={impayesData?.resultats ?? []}
          columns={impayeColumns}
          total={impayesData?.count}
          loading={loadingImpayes}
          emptyMessage="Aucun impayé en cours"
        />
      </div>
    </div>
  )
}
