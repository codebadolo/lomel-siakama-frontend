import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export interface Creneau {
  id: number
  jour_semaine: number
  jour_label: string
  heure_debut: string
  heure_fin: string
  matiere: number
  nom_matiere: string
  enseignant: number
  nom_enseignant: string
  classe: number
  nom_classe: string
}

export interface Presence {
  id: number
  eleve: number
  nom_eleve: string
  creneau: number
  nom_creneau: string
  date: string
  statut: 'present' | 'absent' | 'retard'
  heure_arrivee: string | null
}

export type StatutPresence = 'present' | 'absent' | 'retard'

export interface RapportRow {
  eleve: number
  eleve__nom: string
  eleve__prenom: string
  eleve__matricule: string
  eleve__classe__nom: string
  total: number
  presents: number
  absents: number
  retards: number
  taux_presence: number
  taux_absenteisme: number
}

export interface RapportAssiduite {
  stats_globales: {
    total: number
    presents: number
    absents: number
    retards: number
    taux_presence: number
    taux_absenteisme: number
  }
  par_eleve: RapportRow[]
  filtres: Record<string, string | null>
}

export const attendanceApi = {
  listCreneaux: async (params?: { classe?: number; jour_semaine?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<Creneau>>('/emploi-du-temps/', { params })
    return data
  },

  listPresences: async (params?: {
    creneau?: number
    date?: string
    eleve?: number
    'creneau__classe'?: number
  }) => {
    const { data } = await apiClient.get<PaginatedResponse<Presence>>('/presences/', { params })
    return data
  },

  deleteCreneau: async (id: number) => {
    await apiClient.delete(`/emploi-du-temps/${id}/`)
  },

  saisieGroupee: async (payload: {
    creneau_id: number
    date: string
    presences: Array<{
      eleve_id: number
      statut: StatutPresence
      heure_arrivee?: string
    }>
  }) => {
    const { data } = await apiClient.post('/presences/saisie-groupee/', payload)
    return data
  },

  getRapport: async (params: {
    date_debut?: string
    date_fin?: string
    classe_id?: number
    statut?: string
  }) => {
    const { data } = await apiClient.get<RapportAssiduite>('/presences/rapport/', { params })
    return data
  },
}
