import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export type Categorie = 'expulsion' | 'manque_de_respect' | 'violence' | 'triche' | 'perturbation' | 'autre'
export type NiveauIncident = 1 | 2 | 3 | 4 | 5

export interface Incident {
  id: number
  eleve: number
  nom_eleve: string
  nom_classe: string | null
  signale_par: number | null
  nom_signale_par: string | null
  role_signale_par: string | null
  date: string
  heure: string | null
  categorie: Categorie
  categorie_label: string
  niveau: NiveauIncident
  niveau_label: string
  description: string
  description_autre: string
  statut: 'ouvert' | 'clos'
  statut_label: string
  cree_le: string
  a_convocation: boolean
}

export interface Convocation {
  id: number
  incident: number
  nom_eleve: string
  categorie_label: string
  niveau: NiveauIncident
  date_incident: string
  cree_par: number | null
  nom_cree_par: string | null
  genere_le: string
  envoye_le: string | null
  traite_le: string | null
  est_envoyee: boolean
  est_traitee: boolean
  notes: string
}

export interface CreateIncidentPayload {
  eleve: number
  date: string
  heure?: string
  categorie: Categorie
  niveau: NiveauIncident
  description: string
  description_autre?: string
}

export const disciplineApi = {
  listIncidents: async (params?: {
    categorie?: string
    niveau?: number
    statut?: string
    eleve?: number
    'eleve__classe'?: number
    page?: number
  }) => {
    const { data } = await apiClient.get<PaginatedResponse<Incident>>('/discipline/incidents/', { params })
    return data
  },

  createIncident: async (payload: CreateIncidentPayload) => {
    const { data } = await apiClient.post<Incident>('/discipline/incidents/', payload)
    return data
  },

  cloturerIncident: async (id: number) => {
    const { data } = await apiClient.post<Incident>(`/discipline/incidents/${id}/cloturer/`)
    return data
  },

  listConvocations: async (params?: { page?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<Convocation>>('/discipline/convocations/', { params })
    return data
  },

  createConvocation: async (payload: { incident: number; notes?: string }) => {
    const { data } = await apiClient.post<Convocation>('/discipline/convocations/', payload)
    return data
  },

  genererPdfConvocation: async (id: number) => {
    const { data } = await apiClient.get(`/discipline/convocations/${id}/generer_pdf/`, {
      responseType: 'blob',
    })
    return data as Blob
  },

  marquerEnvoyee: async (id: number) => {
    const { data } = await apiClient.post<Convocation>(`/discipline/convocations/${id}/marquer_envoyee/`)
    return data
  },

  marquerTraitee: async (id: number) => {
    const { data } = await apiClient.post<Convocation>(`/discipline/convocations/${id}/marquer_traitee/`)
    return data
  },
}
