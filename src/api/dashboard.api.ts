import { apiClient } from './client'
import type { MessagePreview, PaginatedResponse } from '@/types'

export const dashboardApi = {
  getRecentMessages: async (): Promise<MessagePreview[]> => {
    const { data } = await apiClient.get<PaginatedResponse<MessagePreview>>(
      '/communication/messages/?ordering=-cree_le&taille_page=5'
    )
    return data.resultats
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<{ count: number }>('/notifications/non-lues/')
    return data.count
  },
}
