import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, X, BookOpen, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
import { evaluationsApi, type Matiere } from '@/api/evaluations.api'
import { schoolsApi, type ClasseMatiere } from '@/api/schools.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'

export default function MatieresPage() {
  const qc            = useQueryClient()
  const user          = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const classeIdParam = searchParams.get('classe')

  const [selectedClasse, setSelectedClasse] = useState<number | null>(
    classeIdParam ? Number(classeIdParam) : null
  )
  const [editMatiere, setEditMatiere] = useState<Matiere | null | false>(false)
  const [editCoefModal, setEditCoefModal] = useState<{ matiereId: number; configId: number | null; current: string; nom: string } | null>(null)

  const { data: matieresData, isLoading: mLoading } = useQuery({
    queryKey: ['matieres'],
    queryFn:  () => evaluationsApi.listMatieres(),
  })

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn:  () => schoolsApi.listClasses(),
  })

  const { data: classeMatieresData, isLoading: cmLoading } = useQuery({
    queryKey: ['classe-matieres', selectedClasse],
    queryFn:  () => selectedClasse ? schoolsApi.getClasseMatieres(selectedClasse) : null,
    enabled:  selectedClasse !== null,
  })

  const matieres = matieresData?.resultats ?? []
  const classes  = classesData?.resultats ?? []
  const classMatieres: ClasseMatiere[] = classeMatieresData?.resultats ?? []

  useEffect(() => {
    if (classeIdParam && classes.length > 0) {
      setSelectedClasse(Number(classeIdParam))
    }
  }, [classeIdParam, classes.length])

  const deleteMat = useMutation({
    mutationFn: (id: number) => evaluationsApi.deleteMatiere(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['matieres'] }),
  })

  const toggleMat = useMutation({
    mutationFn: (id: number) => evaluationsApi.toggleMatiereActive(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['matieres'] }),
  })

  const updateCoef = useMutation({
    mutationFn: async ({ configId, matiereId, coef }: { configId: number | null; matiereId: number; coef: string }) => {
      if (configId) {
        return schoolsApi.updateConfig(configId, coef)
      }
      return schoolsApi.createConfig({
        matiere: matiereId,
        classe: selectedClasse!,
        ecole: user?.ecole ?? 0,
        coefficient: coef,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classe-matieres', selectedClasse] })
      setEditCoefModal(null)
    },
  })

  const selectedClasObj = classes.find((c) => c.id === selectedClasse)

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-6 pb-4">
        <PageHeader
          title="Matières & Coefficients"
          subtitle={`${matieres.length} matière${matieres.length > 1 ? 's' : ''} dans votre établissement`}
          actions={
            <Button leftIcon={<Plus size={14} />} onClick={() => setEditMatiere(null)}>
              Nouvelle matière
            </Button>
          }
        />
      </div>

      <div className="flex-1 overflow-hidden flex gap-0">
        {/* ── Panneau gauche : liste matières ───────────────────────────────── */}
        <div className="w-72 shrink-0 border-r border-[var(--border)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-gray-50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Toutes les matières
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {mLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : matieres.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <BookOpen size={28} className="text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">Aucune matière. Créez-en une.</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {matieres.map((m) => (
                  <div key={m.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 group ${!m.est_active ? 'opacity-50' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.est_active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <span className={`text-[10px] font-bold ${m.est_active ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {m.nom.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${m.est_active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>{m.nom}</p>
                      <p className="text-[10px] text-muted-foreground">Coef. {m.coefficient}{!m.est_active && ' · Inactive'}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleMat.mutate(m.id)}
                        className={`p-1 rounded transition-colors ${m.est_active ? 'text-amber-400 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                        title={m.est_active ? 'Désactiver' : 'Activer'}
                      >
                        {m.est_active ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}
                      </button>
                      <button
                        onClick={() => setEditMatiere(m)}
                        className="p-1 text-muted-foreground hover:text-primary hover:bg-emerald-50 rounded transition-colors"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer "${m.nom}" ?`)) deleteMat.mutate(m.id)
                        }}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Panneau droit : coefficients par classe ───────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sélecteur de classe */}
          <div className="px-6 py-4 border-b border-[var(--border)] bg-white flex items-center gap-4">
            <Settings size={15} className="text-muted-foreground shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                Configurer les coefficients pour la classe
              </label>
              <select
                value={selectedClasse ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null
                  setSelectedClasse(v)
                  if (v) setSearchParams({ classe: String(v) })
                  else setSearchParams({})
                }}
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 min-w-[220px]"
              >
                <option value="">— Sélectionner une classe —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            {selectedClasObj && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Classe sélectionnée</p>
                <p className="text-sm font-bold text-foreground">{selectedClasObj.nom}</p>
                <p className="text-[10px] text-muted-foreground">{selectedClasObj.nombre_eleves} élèves</p>
              </div>
            )}
          </div>

          {/* Table des coefficients */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedClasse ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Settings size={40} className="text-gray-200 mb-3" />
                <p className="text-sm text-muted-foreground">Sélectionnez une classe pour configurer les coefficients</p>
                <p className="text-xs text-gray-400 mt-1">Vous pouvez personnaliser le coefficient de chaque matière par classe</p>
              </div>
            ) : cmLoading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_120px_160px_80px] gap-4 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-[var(--border)]">
                  <span>Matière</span>
                  <span className="text-center">Coef. par défaut</span>
                  <span className="text-center">Coef. pour cette classe</span>
                  <span></span>
                </div>
                {classMatieres.map((m) => {
                  const base = matieres.find((mat) => mat.id === m.id)
                  const isCustom = m.config_id !== null
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'grid grid-cols-[1fr_120px_160px_80px] gap-4 items-center px-4 py-3 rounded-xl border transition-all',
                        isCustom
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-[var(--border)] bg-white hover:border-emerald-200',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-emerald-700">{m.nom.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{m.nom}</p>
                          {m.enseignant && (
                            <p className="text-[10px] text-muted-foreground">{m.enseignant}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-sm text-muted-foreground">{base?.coefficient ?? '—'}</span>
                      </div>
                      <div className="text-center">
                        <span className={cn(
                          'text-sm font-bold px-2 py-1 rounded-lg',
                          isCustom ? 'text-emerald-700 bg-emerald-100' : 'text-muted-foreground',
                        )}>
                          {m.coefficient}
                          {isCustom && <span className="text-[9px] ml-1 font-normal">(personnalisé)</span>}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => setEditCoefModal({
                            matiereId: m.id,
                            configId: m.config_id,
                            current: m.coefficient,
                            nom: m.nom,
                          })}
                          className="p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                          title="Modifier le coefficient"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal matière ─────────────────────────────────────────────────────── */}
      {editMatiere !== false && (
        <MatiereModal
          matiere={editMatiere}
          ecoleId={user?.ecole ?? 0}
          onClose={() => setEditMatiere(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['matieres'] })
            setEditMatiere(false)
          }}
        />
      )}

      {/* ── Modal coefficient ─────────────────────────────────────────────────── */}
      {editCoefModal && (
        <CoefModal
          nom={editCoefModal.nom}
          current={editCoefModal.current}
          isPending={updateCoef.isPending}
          onClose={() => setEditCoefModal(null)}
          onSave={(coef) => updateCoef.mutate({
            configId: editCoefModal.configId,
            matiereId: editCoefModal.matiereId,
            coef,
          })}
        />
      )}
    </div>
  )
}

function MatiereModal({ matiere, ecoleId, onClose, onSuccess }: {
  matiere: Matiere | null
  ecoleId: number
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = Boolean(matiere)
  const [nom,  setNom]  = useState(matiere?.nom ?? '')
  const [coef, setCoef] = useState(matiere?.coefficient ?? '1')
  const [err,  setErr]  = useState('')

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? evaluationsApi.updateMatiere(matiere!.id, { nom, coefficient: coef })
      : evaluationsApi.createMatiere({ nom, coefficient: coef, ecole: ecoleId }),
    onSuccess,
    onError: () => setErr('Une erreur est survenue.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">{isEdit ? 'Modifier la matière' : 'Nouvelle matière'}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Input label="Nom de la matière" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Mathématiques" />
          <Input label="Coefficient par défaut" type="number" step="0.5" min={0.5} max={10} value={coef} onChange={(e) => setCoef(e.target.value)} />
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button size="sm" loading={mutation.isPending} onClick={() => mutation.mutate()}>
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CoefModal({ nom, current, isPending, onClose, onSave }: {
  nom: string; current: string; isPending: boolean
  onClose: () => void; onSave: (coef: string) => void
}) {
  const [coef, setCoef] = useState(current)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Coefficient — {nom}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Personnalisez le coefficient de cette matière pour la classe sélectionnée.
            Si non modifié, le coefficient par défaut de la matière sera utilisé.
          </p>
          <Input
            label="Nouveau coefficient"
            type="number"
            step="0.5"
            min={0.5}
            max={10}
            value={coef}
            onChange={(e) => setCoef(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button size="sm" loading={isPending} onClick={() => onSave(coef)}>
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
