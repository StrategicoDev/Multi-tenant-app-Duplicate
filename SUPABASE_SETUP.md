# Supabase Setup Guide

## Quick Setup for Development

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready

### 2. Disable Email Confirmation (Development Only)
For faster development, you can disable email confirmation:

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Click on **Email** provider
3. Scroll down to **Email Confirmation**
4. **Uncheck** "Enable email confirmations"
5. Click **Save**

> ⚠️ **Important**: Re-enable email confirmation before going to production!

### 3. Get API Credentials
1. Go to **Project Settings** → **API**
2. Copy your:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**

### 4. Update .env File
Edit the `.env` file in your project root:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Run Database Migration
1. Go to **SQL Editor** in Supabase dashboard
2. Copy the entire contents of `supabase-setup.sql`
3. Paste into the SQL Editor
4. Click **Run**

This will create:
- `tenants` table
- `profiles` table
- Row Level Security policies
- Triggers for automatic user/tenant creation

### 6. Restart Your Dev Server
```bash
npm run dev
```

## For Production

### Enable Email Verification
1. Go to **Authentication** → **Providers** → **Email**
2. **Check** "Enable email confirmations"
3. Save settings

**Email Templates:**
Supabase provides default email templates that work out of the box:
- **Confirm signup**: Automatically sent when users register
- **Reset Password**: Automatically sent when users request password reset

The application uses Supabase's built-in email system - no custom email configuration needed!

### Optional: Customize Email Templates
If you want to brand your emails:
1. Go to **Authentication** → **Email Templates**
2. Edit the templates (optional):
   - **Confirm signup**: Customize the verification email
   - **Reset Password**: Customize the password reset email
3. Use these default template variables:
   - `{{ .ConfirmationURL }}` - Email verification link
   - `{{ .Token }}` - Confirmation token
   - `{{ .TokenHash }}` - Token hash
   - `{{ .SiteURL }}` - Your site URL

## Testing the Setup

### Test First User Registration (Owner)
1. Go to `http://localhost:3000/register`
2. Fill in:
   - Organization Name (e.g., "My Company")
   - Email
   - Password
   - Role is automatically set to "Owner"
3. Click **Sign up**

**With Email Confirmation Disabled:**
- You can login immediately as the Owner

**With Email Confirmation Enabled:**
- Check your email for verification link
- Click the link to verify
- Then you can login as the Owner

### Test Second User Registration (Should Be Blocked)
1. Try to register another user at `/register`
2. You should see an error: "This system already has an organization. New signups are not allowed. Please contact your organization owner for access."

**Single-Tenant Enforcement:**
- Only the first verified user can create the organization
- All subsequent signups are automatically blocked
- This enforces the single-tenant requirement

### Verify Database
Go to **Table Editor** in Supabase and check:
- `tenants` table should have **exactly one** organization (created by first user)
- `profiles` table should have the first user with `role = 'owner'`
- Attempting to signup a second user should fail at the database level

### Test Single-Tenant Enforcement
1. First signup creates tenant successfully
2. Second signup attempt is blocked with error message
3. Check database - only one tenant should exist
4. Check **Logs** → **Postgres Logs** to see the enforcement trigger working

## Email System

This application uses **Supabase's built-in email system** - no custom configuration required!

### What's Included:
- ✅ Email confirmation on signup (can be enabled/disabled)
- ✅ Password reset emails
- ✅ Default email templates provided by Supabase
- ✅ Emails sent from Supabase's email service

### What's NOT Used:
- ❌ No custom SMTP configuration
- ❌ No Edge Functions for email
- ❌ No third-party email services
- ❌ No custom invite systems

### How It Works:
1. **User Registration**: `supabase.auth.signUp()` automatically sends confirmation email if enabled
2. **Password Reset**: `supabase.auth.resetPasswordForEmail()` automatically sends reset email
3. **Email Templates**: Supabase provides default templates (can be customized in dashboard)



### "Email not confirmed" Error
- **Development**: Disable email confirmation (see step 2 above)
- **Production**: User must click verification link in email

### Rate Limit Errors (429 Too Many Requests)
Supabase has rate limits to prevent abuse:
- **Free Tier**: Limited signup/login requests per hour
- **Solution**: Wait a few minutes before trying again
- **For Development**: Use different email addresses for testing
- **For Production**: Consider upgrading Supabase plan if needed

Rate limits typically reset within 1-5 minutes.

### No Email Received
- Check spam folder
- Verify email confirmation is enabled in Supabase dashboard
- Supabase's default email service may have sending limits on free tier
- For free tier: Emails sent from `noreply@mail.app.supabase.io`
- Check **Logs** → **Auth Logs** in Supabase for email sending status

### Database Errors
- Make sure you ran the `supabase-setup.sql` script
- Check **Table Editor** to verify tables exist
- Check **Logs** → **Postgres Logs** for detailed errors

### Login Fails After Signup
- Verify `.env` file has correct credentials
- Restart dev server after changing `.env`
- Check browser console for errors
- Verify user exists in **Authentication** → **Users**

## Security Notes

⚠️ **Important Security Settings:**

1. **Row Level Security (RLS)**: Enabled on both tables
2. **Tenant Isolation**: Users can only see data from their tenant
3. **Role-Based Access**: Policies enforce Owner/Admin/Member permissions
4. **Email Verification**: Should be enabled in production
5. **Password Requirements**: Min 6 characters (can be increased in Supabase auth settings)

## Next Steps

After successful setup:
1. Test user registration and login
2. Verify role-based routing works (Owner/Admin/Member pages)
3. Test password reset flow
4. Verify tenant isolation (create multiple users/tenants)
5. Enable email confirmation before deploying to production
