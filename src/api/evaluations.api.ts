import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export type Trimestre = 'T1' | 'T2' | 'T3'

export interface Matiere {
  id: number
  nom: string
  coefficient: string
  ecole: number
}

export interface Evaluation {
  id: number
  titre: string
  date: string
  trimestre: Trimestre
  matiere: number
  nom_matiere: string
  classe: number
  nom_classe: string
  ecole: number
  type_evaluation: 'devoir' | 'composition' | 'examen' | 'interrogation'
  type_label: string
  coefficient: string
  note_maximale: string
}

export interface Note {
  id: number
  evaluation: number
  eleve: number
  nom_eleve: string
  note: string
  note_sur_20: number | null
  commentaire: string
}

export interface BulletinMatiere {
  matiere_id: number
  nom: string
  coefficient: number
  evaluations: Array<{
    evaluation_id: number
    titre: string
    type: string
    poids_interne: number
    note: string
    note_sur_base: number
    note_maximale: string
    date: string
  }>
  moyenne_matiere: number
  points: number
  appreciation?: string  // Primaire uniquement (Excellent, Très Bien…)
}

export interface Bulletin {
  eleve: {
    id: number
    nom_complet: string
    matricule: string
    classe_nom: string | null
    niveau?: string
  }
  trimestre: Trimestre
  annee_scolaire: string | null
  est_primaire: boolean
  base_notation: 10 | 20
  matieres: BulletinMatiere[]
  moyenne_generale: number | null
  total_points: number
  total_coefficients: number
  rang: number | null
  mention: string | null  // Excellent, Très Bien, Bien, Assez Bien, Passable, Insuffisant
}

export const evaluationsApi = {
  listMatieres: async () => {
    const { data } = await apiClient.get<PaginatedResponse<Matiere>>('/matieres/', { params: { taille_page: 100 } })
    return data
  },

  createMatiere: async (payload: { nom: string; coefficient: string; ecole: number }) => {
    const { data } = await apiClient.post<Matiere>('/matieres/', payload)
    return data
  },

  updateMatiere: async (id: number, payload: Partial<{ nom: string; coefficient: string }>) => {
    const { data } = await apiClient.patch<Matiere>(`/matieres/${id}/`, payload)
    return data
  },

  deleteMatiere: async (id: number) => {
    await apiClient.delete(`/matieres/${id}/`)
  },

  list: async (params?: {
    classe?: number
    matiere?: number
    type_evaluation?: string
    trimestre?: Trimestre | ''
    page?: number
  }) => {
    const { data } = await apiClient.get<PaginatedResponse<Evaluation>>('/evaluations/', { params })
    return data
  },

  create: async (payload: {
    titre: string
    date: string
    trimestre: Trimestre
    matiere: number
    classe: number
    ecole: number
    type_evaluation: string
    coefficient: string
    note_maximale: string
  }) => {
    const { data } = await apiClient.post<Evaluation>('/evaluations/', payload)
    return data
  },

  delete: async (id: number) => {
    await apiClient.delete(`/evaluations/${id}/`)
  },

  listNotes: async (params?: { evaluation?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<Note>>('/evaluations/notes/', { params })
    return data
  },

  saisieGroupee: async (payload: {
    evaluation_id: number
    notes: Array<{ eleve_id: number; note: number | null; commentaire?: string }>
  }) => {
    const { data } = await apiClient.post('/evaluations/saisie-groupee/', payload)
    return data
  },

  getMoyennes: async (eleveId: number, trimestre?: Trimestre) => {
    const { data } = await apiClient.get('/evaluations/notes/moyennes/', {
      params: { eleve_id: eleveId, trimestre },
    })
    return data
  },

  getBulletin: async (eleveId: number, trimestre: Trimestre) => {
    const { data } = await apiClient.get<Bulletin>('/evaluations/notes/bulletin/', {
      params: { eleve_id: eleveId, trimestre },
    })
    return data
  },
}
