import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export interface LienParent {
  id: number
  parent_id: number
  utilisateur_id: number
  nom_complet: string
  email: string
  telephone: string
  lien: 'pere' | 'mere' | 'tuteur'
  contact_principal: boolean
}

export interface LienEnfant {
  id: number
  eleve_id: number
  nom_complet: string
  matricule: string
  classe_nom: string | null
  lien: 'pere' | 'mere' | 'tuteur'
  contact_principal: boolean
}

export interface Eleve {
  id: number
  matricule: string
  prenom: string
  nom: string
  nom_complet: string
  sexe: 'M' | 'F' | ''
  date_naissance: string | null
  photo: string | null
  ecole: number
  classe: number | null
  nom_classe: string | null
  est_archive: boolean
  cree_le: string
  parents_lies?: LienParent[]
}

export interface ProfilParent {
  id: number
  utilisateur: number
  nom_complet: string
  email: string
  telephone: string
  enfants: LienEnfant[]
}

export interface CreerElevePayload {
  prenom: string
  nom: string
  sexe?: 'M' | 'F' | ''
  date_naissance?: string
  classe?: number | null
  ecole: number
}

export const studentsApi = {
  list: async (params?: {
    classe?: number
    search?: string
    est_archive?: boolean
    inclure_archives?: boolean
    page?: number
    taille_page?: number
  }) => {
    const { data } = await apiClient.get<PaginatedResponse<Eleve>>('/eleves/', { params })
    return data
  },

  get: async (id: number) => {
    const { data } = await apiClient.get<Eleve>(`/eleves/${id}/`)
    return data
  },

  create: async (payload: CreerElevePayload) => {
    const { data } = await apiClient.post<Eleve>('/eleves/', payload)
    return data
  },

  update: async (id: number, payload: Partial<CreerElevePayload>) => {
    const { data } = await apiClient.patch<Eleve>(`/eleves/${id}/`, payload)
    return data
  },

  archiver: async (id: number) => {
    const { data } = await apiClient.post<{ detail: string }>(`/eleves/${id}/archiver/`)
    return data
  },

  desarchiver: async (id: number) => {
    const { data } = await apiClient.post<{ detail: string }>(`/eleves/${id}/desarchiver/`)
    return data
  },

  exportExcel: async (params?: { classe_id?: number }) => {
    const { data } = await apiClient.get('/eleves/export_excel/', {
      params,
      responseType: 'blob',
    })
    return data as Blob
  },

  changerClasse: async (id: number, classeId: number) => {
    const { data } = await apiClient.post<{ detail: string }>(`/eleves/${id}/changer_classe/`, {
      classe_id: classeId,
    })
    return data
  },
}

export const parentsApi = {
  list: async (params?: { search?: string; page?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<ProfilParent>>('/eleves/parents/', { params })
    return data
  },

  get: async (id: number) => {
    const { data } = await apiClient.get<ProfilParent>(`/eleves/parents/${id}/`)
    return data
  },
}

export const liensApi = {
  create: async (payload: {
    eleve: number
    parent: number
    lien: 'pere' | 'mere' | 'tuteur'
    contact_principal?: boolean
  }) => {
    const { data } = await apiClient.post<LienParent>('/eleves/liens/', payload)
    return data
  },

  destroy: async (id: number) => {
    await apiClient.delete(`/eleves/liens/${id}/`)
  },
}
