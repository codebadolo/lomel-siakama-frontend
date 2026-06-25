import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInYears } from 'date-fns'
import {
  ArrowLeft, Archive, ArchiveRestore, Phone, Mail,
  Users, User, ChevronRight, Plus, Trash2,
  GraduationCap, BookOpen, TrendingUp, Award,
  AlertTriangle, UserCheck, MessageSquare, XCircle,
} from 'lucide-react'
import { studentsApi, parentsApi, liensApi, type LienParent } from '@/api/students.api'
import { conversationsApi } from '@/api/messages.api'
import { schoolsApi, type Classe } from '@/api/schools.api'
import { evaluationsApi, type BulletinMatiere, type Trimestre } from '@/api/evaluations.api'
import { attendanceApi } from '@/api/attendance.api'
import { disciplineApi } from '@/api/discipline.api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const LIEN_LABEL: Record<string, string> = { pere: 'Père', mere: 'Mère', tuteur: 'Tuteur / Tutrice' }

export default function EleveDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const qc       = useQueryClient()
  const navigate = useNavigate()
  const eleveId  = Number(id)

  const [showChangerClasse, setShowChangerClasse] = useState(false)
  const [showAjouterParent, setShowAjouterParent] = useState(false)
  const [confirmArchive, setConfirmArchive]       = useState(false)
  const [confirmLienId, setConfirmLienId]         = useState<number | null>(null)
  const [bulletinTrimestre, setBulletinTrimestre] = useState<Trimestre>('T1')
  const [activeTab, setActiveTab] = useState<'infos' | 'absences' | 'incidents' | 'parents'>('infos')

  const { data: eleve, isLoading } = useQuery({
    queryKey: ['eleve', eleveId],
    queryFn: () => studentsApi.get(eleveId),
    enabled: !!eleveId,
  })

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => schoolsApi.listClasses(),
  })
  const classes = classesData?.resultats ?? []

  const archiveMutation = useMutation({
    mutationFn: () => eleve?.est_archive
      ? studentsApi.desarchiver(eleveId)
      : studentsApi.archiver(eleveId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eleve', eleveId] })
      qc.invalidateQueries({ queryKey: ['eleves'] })
      setConfirmArchive(false)
    },
  })

  const supprimerLienMutation = useMutation({
    mutationFn: (lienId: number) => liensApi.destroy(lienId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eleve', eleveId] })
      setConfirmLienId(null)
    },
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!eleve) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Élève introuvable.
      </div>
    )
  }

  const age = eleve.date_naissance
    ? differenceInYears(new Date(), new Date(eleve.date_naissance))
    : null

  const classeActuelle = classes.find((c) => c.id === eleve.classe)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-[1000px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/eleves" className="hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft size={14} /> Élèves
        </Link>
        <ChevronRight size={12} className="text-gray-300" />
        <span className="text-gray-900 font-medium">{eleve.prenom} {eleve.nom}</span>
      </div>

      {/* ── En-tête élève ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <Avatar name={`${eleve.prenom} ${eleve.nom}`} size="lg" className="!w-16 !h-16 text-xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{eleve.prenom} {eleve.nom}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {eleve.matricule}
                  </span>
                  {classeActuelle && (
                    <Badge variant="default">{classeActuelle.nom}</Badge>
                  )}
                  {eleve.est_archive && (
                    <Badge variant="warning">Archivé</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {eleve.parents_lies && eleve.parents_lies.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<MessageSquare size={14} />}
                    onClick={async () => {
                      const principal = eleve.parents_lies!.find(l => l.contact_principal) ?? eleve.parents_lies![0]
                      try {
                        const conv = await conversationsApi.demarrerDirect(principal.utilisateur_id)
                        navigate(`/messages?conv=${conv.id}`)
                      } catch {
                        setActiveTab('parents')
                      }
                    }}
                  >
                    Contacter parent
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={eleve.est_archive ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  onClick={() => setConfirmArchive(true)}
                >
                  {eleve.est_archive ? 'Désarchiver' : 'Archiver'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div className="flex border-b border-gray-200">
        {([
          ['infos',     'Informations', User],
          ['absences',  'Absences',     XCircle],
          ['incidents', 'Incidents',    AlertTriangle],
          ['parents',   'Parents',      UserCheck],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab : Infos ── */}
      {activeTab === 'infos' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Informations personnelles ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <User size={14} className="text-gray-400" /> Informations
          </h2>
          <dl className="space-y-3">
            <InfoRow label="Sexe" value={eleve.sexe === 'M' ? 'Masculin' : eleve.sexe === 'F' ? 'Féminin' : '—'} />
            <InfoRow
              label="Date de naissance"
              value={eleve.date_naissance
                ? `${new Date(eleve.date_naissance).toLocaleDateString('fr-FR')} ${age !== null ? `(${age} ans)` : ''}`
                : '—'}
            />
            <InfoRow label="Matricule" value={eleve.matricule} mono />
          </dl>
        </div>

        {/* ── Scolarité ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap size={14} className="text-gray-400" /> Scolarité
            </h2>
            <button
              onClick={() => setShowChangerClasse(true)}
              className="text-xs text-indigo-600 hover:underline"
            >
              Changer de classe
            </button>
          </div>
          <dl className="space-y-3">
            <InfoRow
              label="Classe"
              value={classeActuelle ? `${classeActuelle.nom}${classeActuelle.niveau ? ` — ${classeActuelle.niveau}` : ''}` : '—'}
            />
            {classeActuelle && (
              <InfoRow
                label="Effectif"
                value={`${classeActuelle.nombre_eleves} / ${classeActuelle.capacite} élèves`}
              />
            )}
          </dl>
        </div>

        {/* ── Bulletin scolaire ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen size={14} className="text-gray-400" /> Bulletin scolaire
            </h2>
            <div className="flex gap-1">
              {(['T1', 'T2', 'T3'] as Trimestre[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setBulletinTrimestre(t)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    bulletinTrimestre === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <BulletinSection eleveId={eleveId} trimestre={bulletinTrimestre} />
        </div>

        {/* ── Parents / tuteurs ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users size={14} className="text-gray-400" /> Parents / tuteurs
            </h2>
            <Button size="sm" variant="secondary" leftIcon={<Plus size={13} />} onClick={() => setShowAjouterParent(true)}>
              Lier un parent
            </Button>
          </div>
          {(!eleve.parents_lies || eleve.parents_lies.length === 0) ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucun parent lié à cet élève.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {eleve.parents_lies.map((lien) => (
                <ParentRow key={lien.id} lien={lien} onDelete={() => setConfirmLienId(lien.id)} />
              ))}
            </div>
          )}
        </div>
      </div>}

      {/* ── Tab : Absences ── */}
      {activeTab === 'absences' && <AbsencesSection eleveId={eleveId} />}

      {/* ── Tab : Incidents disciplinaires ── */}
      {activeTab === 'incidents' && <IncidentsSection eleveId={eleveId} />}

      {/* ── Tab : Parents ── */}
      {activeTab === 'parents' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck size={14} className="text-gray-400" /> Parents / tuteurs
            </h2>
            <Button size="sm" variant="secondary" leftIcon={<Plus size={13} />} onClick={() => setShowAjouterParent(true)}>
              Lier un parent
            </Button>
          </div>
          {(!eleve.parents_lies || eleve.parents_lies.length === 0) ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucun parent lié à cet élève.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {eleve.parents_lies.map((lien) => (
                <div key={lien.id} className="group py-3 flex items-center gap-3">
                  <Avatar name={lien.nom_complet || 'P'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{lien.nom_complet}</p>
                    <span className="text-xs text-gray-400">{LIEN_LABEL[lien.lien] ?? lien.lien}</span>
                    <div className="flex items-center gap-3 mt-1">
                      {lien.email && (
                        <a href={`mailto:${lien.email}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                          <Mail size={10} /> {lien.email}
                        </a>
                      )}
                      {lien.telephone && (
                        <a href={`tel:${lien.telephone}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                          <Phone size={10} /> {lien.telephone}
                        </a>
                      )}
                    </div>
                  </div>
                  {lien.contact_principal && <Badge variant="success">Contact principal</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal changer classe ── */}
      {showChangerClasse && (
        <ChangerClasseModal
          eleveId={eleveId}
          classeActuelleId={eleve.classe}
          classes={classes}
          onClose={() => setShowChangerClasse(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['eleve', eleveId] })
            qc.invalidateQueries({ queryKey: ['classes'] })
            setShowChangerClasse(false)
          }}
        />
      )}

      {/* ── Modal lier un parent ── */}
      {showAjouterParent && (
        <AjouterParentModal
          eleveId={eleveId}
          onClose={() => setShowAjouterParent(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['eleve', eleveId] })
            setShowAjouterParent(false)
          }}
        />
      )}

      {/* ── Confirm archive ── */}
      {confirmArchive && (
        <ConfirmModal
          title={eleve.est_archive ? "Désarchiver l'élève" : "Archiver l'élève"}
          body={eleve.est_archive
            ? `${eleve.prenom} ${eleve.nom} sera réactivé et apparaîtra dans les listes actives.`
            : `Le dossier de ${eleve.prenom} ${eleve.nom} sera archivé. Toutes les données sont conservées.`
          }
          confirmLabel={eleve.est_archive ? 'Désarchiver' : 'Archiver'}
          isPending={archiveMutation.isPending}
          onClose={() => setConfirmArchive(false)}
          onConfirm={() => archiveMutation.mutate()}
        />
      )}

      {/* ── Confirm supprimer lien ── */}
      {confirmLienId !== null && (
        <ConfirmModal
          title="Retirer le parent"
          body="Ce parent ne sera plus lié à cet élève. Le compte parent est conservé."
          confirmLabel="Retirer"
          isPending={supprimerLienMutation.isPending}
          onClose={() => setConfirmLienId(null)}
          onConfirm={() => supprimerLienMutation.mutate(confirmLienId)}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-gray-500 shrink-0">{label}</dt>
      <dd className={cn('text-sm text-gray-900 text-right', mono && 'font-mono')}>{value}</dd>
    </div>
  )
}

function ParentRow({ lien, onDelete }: { lien: LienParent; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 py-3">
      <Avatar name={lien.nom_complet || 'P'} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{lien.nom_complet}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400">{LIEN_LABEL[lien.lien] ?? lien.lien}</span>
          {lien.contact_principal && (
            <Badge variant="success" className="text-[10px]">Contact principal</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {lien.email && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Mail size={10} /> {lien.email}
            </span>
          )}
          {lien.telephone && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Phone size={10} /> {lien.telephone}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function ChangerClasseModal({
  eleveId, classeActuelleId, classes, onClose, onSuccess,
}: {
  eleveId: number
  classeActuelleId: number | null
  classes: Classe[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [selected, setSelected] = useState<number | null>(null)

  const mutation = useMutation({
    mutationFn: () => studentsApi.changerClasse(eleveId, selected!),
    onSuccess,
  })

  return (
    <ModalWrapper title="Changer de classe" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle classe</label>
          <select
            value={selected ?? ''}
            onChange={(e) => setSelected(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— Choisir —</option>
            {classes.filter((c) => c.id !== classeActuelleId).map((c) => (
              <option key={c.id} value={c.id} disabled={c.est_pleine}>
                {c.nom}{c.est_pleine ? ' (pleine)' : ` — ${c.nombre_eleves}/${c.capacite}`}
              </option>
            ))}
          </select>
        </div>
        {mutation.isError && <p className="text-xs text-red-500">Une erreur s'est produite.</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" loading={mutation.isPending} disabled={!selected} onClick={() => mutation.mutate()}>
            Déplacer
          </Button>
        </div>
      </div>
    </ModalWrapper>
  )
}

function AjouterParentModal({
  eleveId, onClose, onSuccess,
}: {
  eleveId: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [parentId, setParentId] = useState<number | null>(null)
  const [lien, setLien]         = useState<'pere' | 'mere' | 'tuteur'>('tuteur')
  const [principal, setPrincipal] = useState(false)

  const { data } = useQuery({
    queryKey: ['parents'],
    queryFn: () => parentsApi.list(),
  })
  const parents = data?.resultats ?? []

  const mutation = useMutation({
    mutationFn: () => liensApi.create({
      eleve: eleveId,
      parent: parentId!,
      lien,
      contact_principal: principal,
    }),
    onSuccess,
  })

  return (
    <ModalWrapper title="Lier un parent" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— Choisir un parent —</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>{p.nom_complet}</option>
            ))}
          </select>
          {parents.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Créez d'abord un compte avec le rôle "Parent" dans la gestion des utilisateurs.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lien de parenté</label>
          <select
            value={lien}
            onChange={(e) => setLien(e.target.value as 'pere' | 'mere' | 'tuteur')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="pere">Père</option>
            <option value="mere">Mère</option>
            <option value="tuteur">Tuteur / Tutrice</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={principal}
            onChange={(e) => setPrincipal(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Contact principal (notifications urgentes)
        </label>
        {mutation.isError && <p className="text-xs text-red-500">Une erreur s'est produite.</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" loading={mutation.isPending} disabled={!parentId} onClick={() => mutation.mutate()}>
            Lier
          </Button>
        </div>
      </div>
    </ModalWrapper>
  )
}

function ConfirmModal({ title, body, confirmLabel, isPending, onClose, onConfirm }: {
  title: string; body: string; confirmLabel: string
  isPending: boolean; onClose: () => void; onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-5">{body}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button variant="danger" size="sm" loading={isPending} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

function ModalWrapper({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Absences ──────────────────────────────────────────────────────────────────

function AbsencesSection({ eleveId }: { eleveId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['presences-eleve', eleveId, 'absent'],
    queryFn: () => attendanceApi.listPresences({ eleve: eleveId, statut: 'absent' } as any),
  })
  const absences = data?.resultats ?? []

  if (isLoading) return (
    <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <XCircle size={14} className="text-red-400" /> Absences
        </h2>
        <span className="text-xs text-gray-400">{absences.length} absence{absences.length > 1 ? 's' : ''}</span>
      </div>
      {absences.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Aucune absence enregistrée.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {absences.map((p) => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <XCircle size={14} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {format(new Date(p.date), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-xs text-gray-400">{p.nom_creneau ?? '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Incidents disciplinaires ──────────────────────────────────────────────────

const NIVEAU_COLORS: Record<number, string> = {
  1: 'bg-blue-50 text-blue-700 border-blue-200',
  2: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  3: 'bg-orange-50 text-orange-700 border-orange-200',
  4: 'bg-red-50 text-red-700 border-red-200',
  5: 'bg-red-600 text-white border-red-600',
}

function IncidentsSection({ eleveId }: { eleveId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['incidents-eleve', eleveId],
    queryFn: () => disciplineApi.listIncidents({ eleve: eleveId }),
  })
  const incidents = data?.resultats ?? []

  if (isLoading) return (
    <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-400" /> Incidents disciplinaires
        </h2>
        <span className="text-xs text-gray-400">{incidents.length} incident{incidents.length > 1 ? 's' : ''}</span>
      </div>
      {incidents.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Aucun incident enregistré.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {incidents.map((inc) => (
            <div key={inc.id} className="px-5 py-3 flex items-start gap-4">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold shrink-0 mt-0.5', NIVEAU_COLORS[inc.niveau])}>
                N{inc.niveau}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">{inc.categorie_label}</p>
                  <Badge variant={inc.statut === 'ouvert' ? 'warning' : 'success'} className="text-[10px]">
                    {inc.statut_label}
                  </Badge>
                  {inc.a_convocation && <Badge variant="neutral" className="text-[10px]">Convoqué</Badge>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(inc.date), 'dd MMM yyyy', { locale: fr })}
                  {inc.heure && ` à ${inc.heure.slice(0, 5)}`}
                  {inc.nom_signale_par && ` · Signalé par ${inc.nom_signale_par} (${inc.role_signale_par})`}
                </p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{inc.description}</p>
                {inc.description_autre && <p className="text-xs text-gray-400 italic">→ {inc.description_autre}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bulletin scolaire ─────────────────────────────────────────────────────────

const NOTE_COLOR = (moy: number) => {
  if (moy >= 15) return 'text-emerald-600'
  if (moy >= 10) return 'text-indigo-700'
  if (moy >=  8) return 'text-amber-600'
  return 'text-red-600'
}

function BulletinSection({ eleveId, trimestre }: { eleveId: number; trimestre: Trimestre }) {
  const { data: bulletin, isLoading, isError } = useQuery({
    queryKey: ['bulletin', eleveId, trimestre],
    queryFn: () => evaluationsApi.getBulletin(eleveId, trimestre),
    enabled: !!eleveId,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
      </div>
    )
  }

  if (isError || !bulletin) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Aucune évaluation pour ce trimestre.
      </p>
    )
  }

  if (bulletin.matieres.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Aucune note saisie pour le {trimestre}.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Récapitulatif */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-50 rounded-lg p-3 text-center">
          <TrendingUp size={14} className="text-indigo-400 mx-auto mb-1" />
          <p className={cn('text-xl font-bold', bulletin.moyenne_generale !== null ? NOTE_COLOR(bulletin.moyenne_generale) : 'text-gray-400')}>
            {bulletin.moyenne_generale !== null ? bulletin.moyenne_generale.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-gray-500">Moyenne générale</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <BookOpen size={14} className="text-gray-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-800">{bulletin.matieres.length}</p>
          <p className="text-xs text-gray-500">Matières</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <Award size={14} className="text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-amber-700">
            {bulletin.rang !== null ? `${bulletin.rang}er` : '—'}
          </p>
          <p className="text-xs text-gray-500">Rang</p>
        </div>
      </div>

      {/* Tableau des matières */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Matière</th>
              <th className="text-center text-xs font-medium text-gray-500 px-3 py-2.5">Coef.</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-2.5">Moy./20</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-2.5">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {bulletin.matieres.map((m: BulletinMatiere) => (
              <tr key={m.matiere_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{m.nom}</p>
                  <p className="text-xs text-gray-400">
                    {m.evaluations.length} éval{m.evaluations.length > 1 ? 's' : ''}
                    {m.evaluations.map((e) =>
                      ` · ${e.type === 'interrogation' ? 'Int.' : 'Dev.'} ${e.note_sur_base}`
                    ).join('')}
                  </p>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {m.coefficient}
                  </span>
                </td>
                <td className={cn('px-4 py-3 text-right font-bold', NOTE_COLOR(m.moyenne_matiere))}>
                  {m.moyenne_matiere.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 font-medium">
                  {m.points.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-600">
                TOTAL — {bulletin.total_coefficients} coefficients
              </td>
              <td className="px-4 py-3 text-right" />
              <td className="px-4 py-3 text-right font-bold text-gray-900">
                {bulletin.total_points.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-xs text-gray-500">
                Moyenne générale = {bulletin.total_points.toFixed(2)} ÷ {bulletin.total_coefficients}
              </td>
              <td className={cn('px-4 py-2 text-right text-base font-extrabold', bulletin.moyenne_generale !== null ? NOTE_COLOR(bulletin.moyenne_generale) : 'text-gray-400')}>
                {bulletin.moyenne_generale !== null ? `${bulletin.moyenne_generale.toFixed(2)}/20` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
