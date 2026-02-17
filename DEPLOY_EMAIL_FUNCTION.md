# Deploy Email Invitation Function

Your invitation system is already coded to send emails! Follow these steps to deploy it.

## Current Status

✅ Edge function exists: `supabase/functions/send-email/index.ts`
✅ Code in OwnerDashboard already calls the function
❌ Edge function needs to be deployed
❌ SMTP secrets need to be configured

## Quick Setup Steps

### 1. Set SMTP Secrets

Based on your Mailtrap credentials, run these commands in PowerShell:

```powershell
# Navigate to your project directory
cd d:\Multi-tenant-app

# Set SMTP credentials as Supabase secrets
supabase secrets set SMTP_HOST=live.smtp.mailtrap.io
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=api
supabase secrets set SMTP_PASS=f207a474fb9630680f1087da90521f5c
```

### 2. Deploy the Edge Function

```powershell
# Deploy the send-email function
supabase functions deploy send-email
```

### 3. Test the Invitation System

1. Go to your application as an Owner
2. Navigate to the "Invite Users" section
3. Enter an email address and role
4. Click "Send Invitation"
5. Check the invited user's email inbox (or Mailtrap inbox for testing)

## How It Works

When you create an invitation:

1. A record is created in the `invitations` table with a unique token
2. The `send-email` edge function is called with:
   - Email address
   - Invitation URL (with token)
   - Tenant name
   - Role
3. The function sends a formatted email via SMTP through Mailtrap
4. The user receives the email and clicks the link
5. They're redirected to `/accept-invite?token=...` to complete registration

## Email Template

The invitation email includes:
- Personalized greeting with tenant name and role
- "Accept Invitation" button
- Plain text link as backup
- 7-day expiration notice

## Troubleshooting

### If emails don't send:

1. **Check function is deployed:**
   ```powershell
   supabase functions list
   ```

2. **Check secrets are set:**
   ```powershell
   supabase secrets list
   ```

3. **Check function logs:**
   - Go to Supabase Dashboard
   - Navigate to Edge Functions
   - Click on `send-email`
   - View logs for errors

4. **Test the function directly:**
   ```powershell
   supabase functions invoke send-email --body '{
     "email": "test@example.com",
     "inviteUrl": "https://your-app.com/accept-invite?token=test123",
     "tenantName": "Test Org",
     "role": "member"
   }'
   ```

### Common Issues:

- **"SMTP not configured" error**: Secrets not set properly
- **No email received**: Check Mailtrap inbox at https://mailtrap.io
- **Function not found**: Edge function not deployed
- **CORS errors**: Normal for browser preflight requests, check actual POST response

## Email Content Example

```
Subject: You've been invited to join [Tenant Name]

You've been invited!

You've been invited to join [Tenant Name] as a [role].

Click the button below to accept the invitation:

[Accept Invitation Button]

Or copy and paste this link into your browser:
https://your-app.com/accept-invite?token=abc123...

This invitation will expire in 7 days. If you didn't expect 
this invitation, you can safely ignore this email.
```

## Verification

After deployment, your OwnerDashboard invitation flow will:
- ✅ Create invitation in database
- ✅ Send email automatically
- ✅ Show success message
- ✅ Display link as fallback (if email fails)

The user receives a professional email and clicks to accept!
