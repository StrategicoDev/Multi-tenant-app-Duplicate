# Email Verification Server Configuration

## Production Supabase Setup

To ensure email verification works on your production Supabase instance, follow these steps:

### 1. Configure Email Authentication Settings

1. Go to https://soekhmeytdgmbvaardev.supabase.co
2. Navigate to **Authentication** → **Settings**
3. Scroll to **Email Auth** section

**Required Settings:**
- ✅ **Enable email confirmations**: ON
- ✅ **Enable email provider**: ON
- ✅ **Confirm email**: ON

### 2. Configure SMTP Settings (Mailtrap)

1. In the same **Authentication** → **Settings** page
2. Scroll to **SMTP Settings**
3. Click **Enable Custom SMTP**

**Enter these values:**
```
Sender email: hello@strategico.co.za
Sender name: Multi-Tenant App
Host: live.smtp.mailtrap.io
Port: 587
Username: api
Password: f207a474fb9630680f1087da90521f5c
```

4. Click **Save**

### 3. Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Click on **Confirm signup** template

**Verify the template contains:**
```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email address</a></p>
```

**Important:** The `{{ .ConfirmationURL }}` must be present for email verification to work.

### 4. Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add your site URL (e.g., `http://localhost:5173` for development)
3. Add redirect URLs:
   - `http://localhost:5173/verify-email`
   - `http://localhost:5173/dashboard`
   - Add production URLs when deployed

### 5. Test Email Verification

**Test the complete flow:**

1. Register a new user
2. Check Mailtrap inbox at https://mailtrap.io
3. Click the verification link in the email
4. User should be automatically logged in and redirected to dashboard

### 6. Verify Database Trigger

The database trigger `handle_new_user()` creates the user profile and tenant ONLY after email verification.

**Check if trigger is active:**

1. Go to **Database** → **Extensions** → **SQL Editor**
2. Run:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

If empty, run the complete [supabase-setup.sql](supabase-setup.sql) file.

### Common Issues

**Issue: "Email not confirmed" error on login**
- **Cause:** User hasn't clicked verification link
- **Fix:** Check Mailtrap inbox, resend verification email

**Issue: "Error confirming user"**
- **Cause:** Database trigger failing
- **Fix:** Check trigger is deployed, check logs in SQL Editor

**Issue: Emails not sending**
- **Cause:** SMTP not configured or invalid credentials
- **Fix:** Verify SMTP settings in Authentication → Settings

**Issue: Verification link redirects to login instead of auto-login**
- **Cause:** Redirect URL mismatch
- **Fix:** Ensure redirect URLs match exactly in URL Configuration

### View Logs

**Check authentication logs:**
1. Go to **Logs** → **Auth Logs**
2. Filter by event type: `user_confirmation`
3. Look for errors in the log details

**Check function logs (for edge function):**
```powershell
supabase functions logs send-email
```

### Health Check

Run this SQL to verify your setup:

```sql
-- Check if email confirmations are required
SELECT * FROM auth.config WHERE parameter = 'enable_confirmations';

-- Check existing unverified users
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email_confirmed_at IS NULL;

-- Check if trigger exists
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

All checks should pass for email verification to work properly.
