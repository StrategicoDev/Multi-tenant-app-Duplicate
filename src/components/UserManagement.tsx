import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User, UserRole } from '../types/auth'

interface UserManagementProps {
  tenantId: string
  currentUserId: string
  currentUserRole: UserRole
}

interface UserWithProfile extends User {
  canEdit: boolean
}

export default function UserManagement({ tenantId, currentUserId, currentUserRole }: UserManagementProps) {
  const [users, setUsers] = useState<UserWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [tenantId])

  const getRolePrecedence = (role: UserRole): number => {
    switch (role) {
      case 'owner':
        return 1
      case 'admin':
        return 2
      case 'member':
        return 3
      default:
        return 4
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)

      if (error) throw error

      // Determine which users can be edited based on current user's role
      const usersWithPermissions = (data || []).map((user: User) => ({
        ...user,
        canEdit: canEditUser(user, currentUserId, currentUserRole),
      }))

      // Sort by role precedence (Owner > Admin > Member), then by created_at
      const sortedUsers = usersWithPermissions.sort((a, b) => {
        const roleDiff = getRolePrecedence(a.role) - getRolePrecedence(b.role)
        if (roleDiff !== 0) return roleDiff
        // If same role, sort by created date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setUsers(sortedUsers)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const canEditUser = (targetUser: User, currentId: string, currentRole: UserRole): boolean => {
    // Cannot edit yourself
    if (targetUser.id === currentId) return false
    
    // Owner and Admin can edit everyone except themselves
    if (currentRole === 'owner' || currentRole === 'admin') return true
    
    return false
  }

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return
    }

    setUpdatingUserId(userId)
    setError('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      // Update local state and re-sort by role precedence
      const updatedUsers = users.map(u => 
        u.id === userId 
          ? { ...u, role: newRole, canEdit: canEditUser({ ...u, role: newRole }, currentUserId, currentUserRole) }
          : u
      )

      // Re-sort after role change
      const sortedUsers = updatedUsers.sort((a, b) => {
        const roleDiff = getRolePrecedence(a.role) - getRolePrecedence(b.role)
        if (roleDiff !== 0) return roleDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setUsers(sortedUsers)
      alert('User role updated successfully!')
    } catch (error: any) {
      console.error('Error updating user role:', error)
      setError('Failed to update user role: ' + error.message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const removeUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from the organization?`)) {
      return
    }

    setUpdatingUserId(userId)
    setError('')

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setUsers(users.filter(u => u.id !== userId))
      alert('User removed successfully!')
    } catch (error: any) {
      console.error('Error removing user:', error)
      setError('Failed to remove user: ' + error.message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'member':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Team Members
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage roles and permissions for your team members
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className={user.id === currentUserId ? 'bg-indigo-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.email}
                          {user.id === currentUserId && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.canEdit && updatingUserId !== user.id ? (
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                        className="text-sm rounded-full px-3 py-1 font-semibold border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        disabled={updatingUserId === user.id}
                      >
                        {(currentUserRole === 'owner' || currentUserRole === 'admin') && <option value="owner">Owner</option>}
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    ) : (
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.canEdit && (
                      <button
                        onClick={() => removeUser(user.id, user.email)}
                        disabled={updatingUserId === user.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {updatingUserId === user.id ? 'Processing...' : 'Remove'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          <strong>Total users:</strong> {users.length}
          {' • '}
          <strong>Owners:</strong> {users.filter(u => u.role === 'owner').length}
          {' • '}
          <strong>Admins:</strong> {users.filter(u => u.role === 'admin').length}
          {' • '}
          <strong>Members:</strong> {users.filter(u => u.role === 'member').length}
        </div>
      </div>
    </div>
  )
}
