# Quick Start: Deploy Mailtrap Email Edge Function

Follow these steps **in order** to set up email sending via Mailtrap.

## Step 1: Install Supabase CLI

Open PowerShell and run:

```powershell
npm install -g supabase
```

## Step 2: Login to Supabase

```powershell
supabase login
```

A browser window will open - log in to your Supabase account.

## Step 3: Get Your Project Reference

1. Go to https://app.supabase.com
2. Open your project
3. Copy the **Project Reference** from the URL or Settings
   - URL format: `https://app.supabase.com/project/YOUR_PROJECT_REF`

## Step 4: Link Your Local Project

```powershell
# Navigate to your project directory
cd d:\Multi-tenant-app

# Link to your Supabase project (replace with your actual project ref)
supabase link --project-ref YOUR_PROJECT_REF
```

## Step 5: Set the Mailtrap API Token Secret

```powershell
supabase secrets set MAILTRAP_API_TOKEN=f207a474fb9630680f1087da90521f5c
```

Verify it was set:

```powershell
supabase secrets list
```

You should see `MAILTRAP_API_TOKEN` in the list.

## Step 6: Deploy the Edge Function

```powershell
supabase functions deploy send-email
```

Wait for deployment to complete. You'll see output like:

```
Deploying function send-email (project ref: your-project-ref)
Function deployed successfully!
Function URL: https://your-project-ref.supabase.co/functions/v1/send-email
```

## Step 7: Copy the Function URL

After deployment, copy the function URL and update your `.env` file:

```env
VITE_SUPABASE_EDGE_FUNCTION_URL=https://your-project-ref.supabase.co/functions/v1/send-email
```

## Step 8: Test the Function

### Option A: Test via Postman/Insomnia

1. Method: `POST`
2. URL: `https://your-project-ref.supabase.co/functions/v1/send-email`
3. Headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_ANON_KEY`
4. Body (JSON):
```json
{
  "to": "cp@strategico.co.za",
  "subject": "Test Email",
  "templateType": "welcome",
  "data": {
    "name": "Test User"
  }
}
```

### Option B: Test via PowerShell

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_ANON_KEY"
}

$body = @{
    to = "cp@strategico.co.za"
    subject = "Test Email"
    templateType = "welcome"
    data = @{
        name = "Test User"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-project-ref.supabase.co/functions/v1/send-email" -Method Post -Headers $headers -Body $body
```

## Step 9: Verify Email Delivery

1. Check Mailtrap inbox at https://mailtrap.io
2. Look for the test email
3. If you don't see it, check the Edge Function logs

## Check Logs

If something goes wrong:

```powershell
supabase functions logs send-email
```

## Common Issues

### "Secret not found"
**Solution:** Run Step 5 again to set the secret.

### "Function not found"
**Solution:** Run Step 6 again to deploy.

### "401 Unauthorized from Mailtrap"
**Solution:** Verify your Mailtrap API token is correct.

### CORS errors in browser
**Solution:** The function already includes CORS headers. Make sure you're including the `Authorization` header.

## Next Steps

✅ Edge Function deployed  
✅ Mailtrap configured  
✅ Email sending works  

Now you can integrate email sending into your application:
- Welcome emails after registration
- Email verification links
- Password reset emails
- User invitation emails

See `MAILTRAP_SETUP.md` for detailed usage examples.
