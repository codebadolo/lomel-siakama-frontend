export type Role = 'admin' | 'enseignant' | 'parent' | 'promoteur' | 'surveillant'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  nom_complet: string
  role: Role
  telephone: string
  photo_profil: string | null
  ecole: number | null
  is_active: boolean
  cree_le: string
  modifie_le: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface PaginatedResponse<T> {
  total: number
  pages: number
  page_courante: number
  suivant: string | null
  precedent: string | null
  resultats: T[]
}

export interface MessagePreview {
  id: number
  nom_expediteur: string
  objet: string
  statut: 'en_attente' | 'repondu' | 'clos'
  statut_label: string
  cree_le: string
  nb_reponses: number
}
