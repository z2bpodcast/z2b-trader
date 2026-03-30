// ═══════════════════════════════════════════════
// Z2B — SAVE PUSH SUBSCRIPTION ENDPOINT
// Called by the browser when user enables bell
// ═══════════════════════════════════════════════

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { subscription, action } = body;

    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: 'Invalid subscription' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // In production, store subscriptions in Vercel KV or Supabase
    // For now, we confirm receipt and log
    console.log(`Push subscription ${action || 'saved'}:`, subscription.endpoint.substring(0, 50) + '...');

    return new Response(JSON.stringify({
      status: 'ok',
      message: `Subscription ${action || 'saved'} successfully`,
      endpoint: subscription.endpoint.substring(0, 30) + '...',
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', details: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
