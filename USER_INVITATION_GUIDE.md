# User Invitation System

## Overview

The invitation system allows **Owners and Admins** to invite new team members to their tenant via email. Invited users receive a link to accept the invitation and create their account with the specified role.

## Features

- **Email-based invitations** - Send invites to any email address
- **Role assignment** - Invite users as Admin or Member
- **Automatic tenant linking** - Invited users are automatically added to the inviter's tenant
- **Expiration** - Invitations expire after 7 days
- **Status tracking** - View pending invitations and cancel them if needed

## Database Setup

**Run this SQL in Supabase Dashboard → SQL Editor:**

Apply the updated [supabase-setup.sql](supabase-setup.sql) which includes:
- `invitations` table
- Row Level Security (RLS) policies for invitations
- Updated `handle_new_user()` trigger to detect and process invitations

## How It Works

### 1. Owner Sends Invitation

1. Owner logs into dashboard
2. In the "Invite Team Members" section:
   - Enter the invitee's email address
   - Select role (Admin or Member)
   - Click "Send Invitation"
3. An invitation record is created in the `invitations` table
4. An email is sent to the invitee with an acceptance link

### 2. Invitee Receives Email

The invitation email contains:
- Organization name
- Role they're being invited as
- Accept invitation button/link
- Expiration notice (7 days)

### 3. Invitee Accepts Invitation

1. Click the link in the email
2. Lands on `/accept-invite?token=...` page
3. Sees invitation details (organization, role, email)
4. Sets a password
5. Clicks "Accept & Create Account"

### 4. Account Creation

When the invitee accepts:
- A new user account is created in Supabase Auth
- The `handle_new_user()` trigger detects the invitation
- User is added to the tenant with the invited role
- Invitation status is marked as "accepted"
- Invitee receives email verification
- After verification, user can log in

## UI Components

### Owner Dashboard (src/pages/dashboards/OwnerDashboard.tsx)

**Invite Form:**
- Email input
- Role dropdown (Admin/Member)
- Send button

**Pending Invitations Table:**
- Shows all pending invitations
- Columns: Email, Role, Sent Date, Expiration Date
- Cancel button for each invitation

### Accept Invite Page (src/pages/AcceptInvite.tsx)

**Displays:**
- Organization name
- Role being invited as
- Invitee's email

**Form:**
- Password input
- Confirm password input
- Accept button

**Validation:**
- Checks if invitation exists
- Checks if invitation is expired
- Validates token

## Database Schema

### Invitations Table

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES auth.users ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  accepted_at TIMESTAMP WITH TIME ZONE
);
```

### RLS Policies

**Owners and Admins can:**
- View invitations for their tenant
- Create new invitations
- Update invitation status
- Delete/cancel invitations

**Security:**
- Invitations are tenant-scoped
- Only accessible to authorized users in that tenant
- Tokens are randomly generated UUIDs

## Email Integration

Uses the Supabase Edge Function `send-email` to send invitation emails via Mailtrap.

**Email includes:**
- Subject: "Invitation to join [Organization Name]"
- HTML formatted message
- Accept invitation button
- Expiration notice
- Fallback plain link

## Invitation Flow Logic

### Database Trigger (handle_new_user)

```
1. New user signs up via invitation link
2. Email gets verified
3. Trigger executes
4. Checks if user's email has a pending, non-expired invitation
5. If invitation found:
   - Add user to invited tenant
   - Use invited role
   - Skip normal tenant creation
6. If no invitation:
   - Follow normal registration flow (check for existing tenant)
```

## API Endpoints

### Create Invitation

```typescript
const { error } = await supabase
  .from('invitations')
  .insert({
    tenant_id: tenant.id,
    email: 'user@example.com',
    role: 'admin',
    invited_by: currentUser.id,
    token: crypto.randomUUID(),
  })
```

### Fetch Pending Invitations

```typescript
const { data } = await supabase
  .from('invitations')
  .select('*')
  .eq('tenant_id', tenant.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
```

### Cancel Invitation

```typescript
const { error } = await supabase
  .from('invitations')
  .delete()
  .eq('id', invitationId)
```

### Accept Invitation

```typescript
// 1. Verify invitation
const { data } = await supabase
  .from('invitations')
  .select('*, tenants(name)')
  .eq('token', token)
  .eq('status', 'pending')
  .single()

// 2. Sign up user
await supabase.auth.signUp({
  email: invitation.email,
  password,
  options: {
    data: {
      role: invitation.role,
      tenant_id: invitation.tenant_id,
    },
  },
})

// 3. Mark as accepted
await supabase
  .from('invitations')
  .update({ 
    status: 'accepted',
    accepted_at: new Date().toISOString() 
  })
  .eq('id', invitation.id)
```

## Testing

### Test Invitation Flow

1. **Create invitation:**
   - Log in as Owner
   - Go to dashboard
   - Enter email: `test@example.com`
   - Role: Admin
   - Click "Send Invitation"

2. **Check Mailtrap inbox:**
   - Go to https://mailtrap.io
   - Find invitation email
   - Verify content and formatting

3. **Accept invitation:**
   - Click link in email
   - Should land on `/accept-invite?token=...`
   - See organization name and role
   - Set password
   - Click "Accept & Create Account"

4. **Verify account created:**
   - Check email for verification
   - Click verification link
   - Should log in automatically
   - Check Supabase Dashboard → Authentication → Users
   - Verify user has correct tenant_id and role

5. **Check invitation updated:**
   - Supabase Dashboard → Table Editor → invitations
   - Invitation status should be "accepted"
   - accepted_at should be set

## Permissions

### Who Can Invite Users?

- **Owner**: Can invite Admins and Members
- **Admin**: Can invite Admins and Members
- **Member**: Cannot invite users

### Role Restrictions

- Cannot invite users as "Owner"
- Owner dropdown only shows Admin and Member
- Prevents multiple owners per tenant

## Security Considerations

- **Tokens**: Randomly generated UUIDs, not predictable
- **Expiration**: 7-day limit prevents indefinite access
- **Email verification**: Users must verify email before full access
- **RLS policies**: Tenant-scoped access prevents cross-tenant data leaks
- **One-time use**: Invitations marked as accepted after signup

## Future Enhancements

Potential improvements:
- Resend invitation emails
- Custom invitation messages
- Bulk invitations
- Invitation templates
- Analytics (acceptance rate, time to accept)
- Automatic reminder emails before expiration
- Custom expiration periods
- Invitation revocation with notification

## Troubleshooting

### Invitation Email Not Received

1. Check Mailtrap inbox (development)
2. Verify Edge Function is deployed
3. Check Supabase logs: `supabase functions logs send-email`
4. Verify SMTP configuration in Supabase Dashboard

### Accept Link Shows "Invalid Invitation"

1. Check if invitation expired (7 days)
2. Verify token matches in database
3. Check invitation status is "pending"
4. Ensure invitation hasn't been deleted

### User Not Added to Tenant

1. Verify user completed email verification
2. Check database trigger is active
3 Look for errors in Supabase logs
4. Ensure invitation record exists before signup

### Cannot Cancel Invitation

1. Verify user has Owner or Admin role
2. Check RLS policies are active
3. Ensure invitation belongs to user's tenant

## Related Files

- [src/pages/dashboards/OwnerDashboard.tsx](src/pages/dashboards/OwnerDashboard.tsx) - Invite UI
- [src/pages/AcceptInvite.tsx](src/pages/AcceptInvite.tsx) - Accept page
- [src/types/auth.ts](src/types/auth.ts) - Invitation type
- [supabase-setup.sql](supabase-setup.sql) - Database schema
- [src/App.tsx](src/App.tsx) - Routing
