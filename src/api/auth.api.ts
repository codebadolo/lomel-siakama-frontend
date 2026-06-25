import { apiClient } from './client'
import type { AuthTokens, User, LoginCredentials } from '@/types'

export const authApi = {
  login: async (creds: LoginCredentials): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/connexion/', {
      email:    creds.email,
      password: creds.password,
    })
    return data
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/moi/')
    return data
  },
}
