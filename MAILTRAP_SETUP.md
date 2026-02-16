# Mailtrap Email Setup via Supabase Edge Functions

This guide walks you through setting up email sending via Mailtrap using Supabase Edge Functions.

## Prerequisites

- Supabase CLI installed
- Supabase project created
- Mailtrap API token: `f207a474fb9630680f1087da90521f5c`

## Step 1: Install Supabase CLI

```powershell
# Install Supabase CLI (if not already installed)
npm install -g supabase
```

## Step 2: Login to Supabase

```powershell
supabase login
```

This will open a browser window to authenticate.

## Step 3: Link Your Project

```powershell
# Get your project reference from Supabase dashboard URL
# Format: https://app.supabase.com/project/<PROJECT_REF>

supabase link --project-ref <YOUR_PROJECT_REF>
```

## Step 4: Create Edge Function

```powershell
# Create the send-email Edge Function
supabase functions new send-email
```

This creates: `supabase/functions/send-email/index.ts`

## Step 5: Add Mailtrap API Token as Secret

```powershell
# Add the Mailtrap API token as a secret
supabase secrets set MAILTRAP_API_TOKEN=f207a474fb9630680f1087da90521f5c
```

Verify the secret was set:
```powershell
supabase secrets list
```

## Step 6: Deploy the Edge Function

```powershell
# Deploy the send-email function
supabase functions deploy send-email
```

## Step 7: Get the Edge Function URL

After deployment, you'll get a URL like:
```
https://<PROJECT_REF>.supabase.co/functions/v1/send-email
```

You can also find it in:
- Supabase Dashboard → Edge Functions → send-email

## Step 8: Test the Edge Function

### Test from Command Line:

```powershell
# Replace <PROJECT_REF> with your actual project reference
# Replace <ANON_KEY> with your anon key from Supabase dashboard

curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/send-email" `
  -H "Authorization: Bearer <ANON_KEY>" `
  -H "Content-Type: application/json" `
  -d '{"to":"cp@strategico.co.za","subject":"Test Email","templateType":"welcome","data":{"name":"Test User"}}'
```

### Test from Browser Console:

```javascript
const response = await fetch('https://<PROJECT_REF>.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + 'YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    to: 'cp@strategico.co.za',
    subject: 'Test Email',
    templateType: 'welcome',
    data: { name: 'Test User' }
  })
});
console.log(await response.json());
```

## Step 9: Verify in Mailtrap

1. Go to https://mailtrap.io
2. Check your inbox for the test email
3. Verify the email was delivered

## Email Templates Available

The Edge Function supports these template types:

1. **welcome** - Welcome email after registration
2. **verification** - Email verification
3. **passwordReset** - Password reset link
4. **inviteUser** - Invite new user to organization

## Using in Your Application

Update your `.env` file:
```env
VITE_SUPABASE_EDGE_FUNCTION_URL=https://<PROJECT_REF>.supabase.co/functions/v1/send-email
```

The application will automatically use the Edge Function to send emails.

## Troubleshooting

### Check Function Logs:
```powershell
supabase functions logs send-email
```

### Common Issues:

1. **"Secret not found"**
   - Run: `supabase secrets set MAILTRAP_API_TOKEN=f207a474fb9630680f1087da90521f5c`

2. **"401 Unauthorized"**
   - Check your Mailtrap API token is correct
   - Verify the secret is set: `supabase secrets list`

3. **"Function not found"**
   - Redeploy: `supabase functions deploy send-email`

4. **CORS errors**
   - The Edge Function includes CORS headers
   - Check the request origin is allowed

## Security Notes

- Never commit API tokens to git
- The Mailtrap token is stored as a Supabase secret (encrypted)
- Only authenticated requests can call the Edge Function
- Rate limiting is applied automatically by Supabase

## Next Steps

1. Customize email templates in `supabase/functions/send-email/index.ts`
2. Add more template types as needed
3. Configure webhook notifications for delivery tracking
4. Set up monitoring and alerts
