import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import UserManagement from '../../components/UserManagement'
import { supabase } from '../../lib/supabase'
import type { Invitation } from '../../types/auth'

export default function OwnerDashboard() {
  const { user, tenant } = useAuth()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(true)

  useEffect(() => {
    fetchInvitations()
  }, [tenant?.id])

  const fetchInvitations = async () => {
    if (!tenant?.id) return
    
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setInvitations(data || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
    } finally {
      setLoadingInvitations(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteMessage('')

    try {
      // Generate a secure token
      const token = crypto.randomUUID()
      
      // Create invitation
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
          tenant_id: tenant?.id,
          email: inviteEmail,
          role: inviteRole,
          invited_by: user?.id,
          token,
        })

      if (inviteError) throw inviteError

      // Send invitation email via edge function
      const inviteUrl = `${window.location.origin}/accept-invite?token=${token}`
      
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          email: inviteEmail,
          inviteUrl: inviteUrl,
          tenantName: tenant?.name || 'the organization',
          role: inviteRole,
        },
      })

      console.log('Email function response:', { emailData, emailError })

      if (emailError) {
        console.error('Email sending failed:', emailError)
        // Still show success for invitation creation
        setInviteMessage(`Invitation created! Share this link: ${inviteUrl}`)
      } else {
        setInviteMessage('Invitation sent successfully!')
      }

      setInviteEmail('')
      setInviteRole('member')
      fetchInvitations()
    } catch (error: any) {
      console.error('Error inviting user:', error)
      setInviteMessage('Failed to send invitation: ' + error.message)
    } finally {
      setInviting(false)
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error
      fetchInvitations()
    } catch (error) {
      console.error('Error canceling invitation:', error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.email}
          </p>
          <p className="text-sm text-gray-500">
            Organization: {tenant?.name}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Users Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">245</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Monthly Revenue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">$12,450</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Active Tenants Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Tenants
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">42</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invite Users Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invite Team Members</h2>
          
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="invite-email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="colleague@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={inviting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
              
              {inviteMessage && (
                <p className={`text-sm ${inviteMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                  {inviteMessage}
                </p>
              )}
            </div>
          </form>

          {/* Pending Invitations */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Pending Invitations</h3>
            
            {loadingInvitations ? (
              <p className="text-sm text-gray-500">Loading invitations...</p>
            ) : invitations.filter(i => i.status === 'pending').length === 0 ? (
              <p className="text-sm text-gray-500">No pending invitations</p>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Sent</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Expires</th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {invitations.filter(i => i.status === 'pending').map((invitation) => (
                      <tr key={invitation.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{invitation.email}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">{invitation.role}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => cancelInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* User Management Section */}
        {user && tenant && (
          <UserManagement 
            tenantId={tenant.id}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        )}

        {/* Owner Privileges Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Owner Access & Capabilities</h2>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              As the Owner, you have complete control over your organization's tenant.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Full access to all organization settings and configuration</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Manage all users within your tenant (Admins and Members)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Billing and subscription management for your organization</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Complete analytics and reporting across all tenant activities</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Security policies and compliance configuration</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Data export and backup management</span>
              </li>
            </ul>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Tenant Isolation</h3>
              <p className="text-sm text-blue-800">
                Your organization operates in a dedicated tenant. All data, users, and settings 
                are completely isolated from other tenants in the system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
