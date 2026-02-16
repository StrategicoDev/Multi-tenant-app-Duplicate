// Supabase Edge Function for sending emails via Mailtrap
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { to, subject, text, html } = await req.json();

    // Validate input
    if (!to || !subject || (!text && !html)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: to, subject, and either text or html',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get Mailtrap API token from environment
    const mailtrapToken = Deno.env.get('MAILTRAP_API_TOKEN');
    if (!mailtrapToken) {
      throw new Error('MAILTRAP_API_TOKEN not configured');
    }

    // Prepare email payload
    const emailPayload: any = {
      from: {
        email: 'hello@strategico.co.za',
        name: 'Multi-Tenant App',
      },
      to: [{ email: to }],
      subject: subject,
      category: 'Application Email',
    };

    if (text) emailPayload.text = text;
    if (html) emailPayload.html = html;

    // Send email via Mailtrap API
    const response = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mailtrapToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Mailtrap API error:', result);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send email',
          details: result,
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
