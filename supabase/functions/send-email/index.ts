/// <reference types="https://deno.land/x/types/index.d.ts" />

// Supabase Edge Function - Sends custom invite emails via Mailtrap API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}


Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Edge function called, headers:', req.headers.get('Authorization') ? 'Auth header present' : 'No auth header')
    
    const payload = await req.json()
    const { email, inviteUrl, tenantName, role, type = 'invitation' } = payload

    console.log('Received payload:', { email, inviteUrl, tenantName, role, type })

    if (!email || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and inviteUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Mailtrap API token from environment
    const mailtrapApiToken = Deno.env.get('MAILTRAP_API_TOKEN')
    
    if (!mailtrapApiToken) {
      console.error('Mailtrap API token not configured')
      return new Response(
        JSON.stringify({ error: 'Mailtrap API token not configured. Required: MAILTRAP_API_TOKEN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Sending ${type} email via Mailtrap API to:`, email)

    // Prepare email content based on type
    let emailSubject: string
    let emailHtml: string

    if (type === 'verification') {
      emailSubject = 'Verify your email address'
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Strategico!</h2>
          <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
          <p>Click the button below to verify your email:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${inviteUrl}">${inviteUrl}</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            If you didn't sign up for this account, you can safely ignore this email.
          </p>
        </div>
      `
    } else {
      // Invitation email
      emailSubject = `You've been invited to join ${tenantName}`
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited!</h2>
          <p>You've been invited to join <strong>${tenantName}</strong> as a <strong>${role}</strong>.</p>
          <p>Click the button below to accept the invitation:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${inviteUrl}">${inviteUrl}</a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `
    }

    // Send email via Mailtrap API
    const mailtrapResponse = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailtrapApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: {
          email: 'sammy@strategico.co.za',
          name: 'Strategico'
        },
        to: [
          {
            email: email
          }
        ],
        subject: emailSubject,
        html: emailHtml,
      }),
    })

    if (!mailtrapResponse.ok) {
      const errorText = await mailtrapResponse.text()
      console.error('Mailtrap API error:', errorText)
      throw new Error(`Mailtrap API error: ${mailtrapResponse.status} - ${errorText}`)
    }

    const result = await mailtrapResponse.json()

    console.log(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} email sent to ${email}`)
    console.log(`   Message ID: ${result.message_id || 'N/A'}`)
    console.log(`   Timestamp: ${new Date().toISOString()}`)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} email sent to ${email}`,
        messageId: result.message_id || 'N/A',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
