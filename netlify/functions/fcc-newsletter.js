// netlify/functions/fcc-newsletter.js

const ALLOW_ORIGINS = [
  'https://freedomcrateco.com',
  'https://www.freedomcrateco.com',
  'http://localhost:8888',
  'http://localhost:3000'
];

const respond = (status, body, origin) => ({
  statusCode: status,
  headers: {
    'Access-Control-Allow-Origin': origin || '*',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  const origin = ALLOW_ORIGINS.includes(event.headers.origin)
    ? event.headers.origin
    : ALLOW_ORIGINS[0];

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { ok: false, error: 'Method Not Allowed' }, origin);
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[fcc-newsletter] Missing Supabase env vars');
    return respond(500, { ok: false, error: 'Server misconfigured' }, origin);
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { ok: false, error: 'Invalid request body' }, origin);
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const firstName = String(payload.first_name || '').trim() || null;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return respond(400, { ok: false, error: 'Please enter a valid email address.' }, origin);
  }

  const record = {
    email,
    first_name: firstName,
    status: 'subscribed',
    source: String(payload.source || 'homepage-footer').trim(),
    updated_at: new Date().toISOString(),
    user_agent: event.headers['user-agent'] || null,
    ip_addr: (event.headers['x-forwarded-for'] || '').split(',')[0] || null
  };

  try {
    const url = `${SUPABASE_URL}/rest/v1/newsletter_subscribers?on_conflict=email`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify([record])
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[fcc-newsletter] Supabase error:', res.status, data);
      return respond(500, { ok: false, error: 'Database insert failed' }, origin);
    }

    return respond(200, {
      ok: true,
      message: 'Welcome to Freedom News.'
    }, origin);
  } catch (err) {
    console.error('[fcc-newsletter] Exception:', err);
    return respond(500, { ok: false, error: 'Server exception' }, origin);
  }
};