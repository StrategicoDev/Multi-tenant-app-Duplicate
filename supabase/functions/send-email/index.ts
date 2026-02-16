
// Supabase Edge Function - Sends custom invite emails via SMTP using nodemailer
// @ts-expect-error - npm: prefix for npm packages in Deno
import nodemailer from 'npm:nodemailer@6.9.7'

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
    const payload = await req.json()
    const { email, inviteUrl, tenantName, role } = payload

    console.log('Received payload:', { email, inviteUrl, tenantName, role })

    if (!email || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and inviteUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get SMTP settings from environment

    const smtpHost = Deno.env.get('SMTP_HOST')

    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587')
 
    const smtpUser = Deno.env.get('SMTP_USER')

    const smtpPass = Deno.env.get('SMTP_PASS')
    
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('SMTP not configured')
      return new Response(
        JSON.stringify({ error: 'SMTP not configured. Required: SMTP_HOST, SMTP_USER, SMTP_PASS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Sending invite email via SMTP to:', email)
    console.log('SMTP Config:', { host: smtpHost, port: smtpPort, user: smtpUser })

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // Use STARTTLS
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    // Send email
    const info = await transporter.sendMail({
      from: `"Strategico" <sammy@strategico.co.za>`,
      to: email,
      subject: `You've been invited to join ${tenantName}`,
      html: `
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
      `,
    })

    console.log(`✅ Invitation email sent to ${email}`, info.messageId)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: `Invitation sent to ${email}`
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
