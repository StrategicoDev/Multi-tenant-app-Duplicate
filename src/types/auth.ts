export type UserRole = 'owner' | 'admin' | 'member'

export interface Tenant {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  role: UserRole
  created_at: string
}

export interface AuthState {
  user: User | null
  tenant: Tenant | null
  loading: boolean
}
