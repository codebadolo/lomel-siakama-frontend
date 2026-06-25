import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export interface Notification {
  id: number
  type_notification: 'absence' | 'retard' | 'rappel_paiement' | 'annonce' | 'reponse_message' | 'convocation'
  titre: string
  contenu: string
  est_lue: boolean
  cree_le: string
}

export const notificationsApi = {
  list: async (params?: {
    type_notification?: string
    est_lue?: boolean
    page?: number
    taille_page?: number
  }) => {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>('/notifications/', { params })
    return data
  },

  nonLues: async () => {
    const { data } = await apiClient.get<{ count: number; resultats: Notification[] }>('/notifications/non-lues/')
    return data
  },

  marquerLue: async (id: number) => {
    await apiClient.post(`/notifications/${id}/marquer_lue/`)
  },

  toutMarquerLu: async () => {
    await apiClient.post('/notifications/tout_marquer_lu/')
  },
}
