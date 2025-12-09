// netlify/functions/fcc-giveaway.js
const ALLOW_ORIGINS = [
  'https://freedomcrateco.com',
  'https://www.freedomcrateco.com',
  'https://finalsaluteproject.org',
  'https://www.finalsaluteproject.org',
  'http://localhost:8888'
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

  // Preflight
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

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    CLOUDFLARE_TURNSTILE_SECRET
  } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CLOUDFLARE_TURNSTILE_SECRET) {
    console.error('[fcc-giveaway] Missing env vars');
    return respond(500, { ok: false, error: 'Server misconfigured' }, origin);
  }

  // Parse body (JSON or x-www-form-urlencoded)
  let payload = {};
  try {
    const ct = event.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      payload = JSON.parse(event.body || '{}');
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      payload = Object.fromEntries(new URLSearchParams(event.body || ''));
    } else {
      payload = JSON.parse(event.body || '{}');
    }
  } catch {
    return respond(400, { ok: false, error: 'Invalid request body' }, origin);
  }

  // --- Cloudflare Turnstile verification ---
  const token = payload['cf-turnstile-response'];

  if (!token) {
    return respond(400, {
      ok: false,
      error: 'Human verification token missing'
    }, origin);
  }

  try {
    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: new URLSearchParams({
          secret: CLOUDFLARE_TURNSTILE_SECRET,
          response: token
        })
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      console.error('[fcc-giveaway] Turnstile failed:', verifyData);
      return respond(400, {
        ok: false,
        error: 'Human verification failed'
      }, origin);
    }
  } catch (err) {
    console.error('[fcc-giveaway] Turnstile verify error:', err);
    return respond(500, {
      ok: false,
      error: 'Error verifying human challenge'
    }, origin);
  }
  // --- End Turnstile verification ---

  const email = String(payload.email || '').trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return respond(400, { ok: false, error: 'Valid email required' }, origin);
  }

  // Map your form fields -> table columns
  const notesParts = [];
  if (payload.years) notesParts.push(`Years/Rank: ${payload.years}`);
  if (payload.story) notesParts.push(`Story: ${payload.story}`);
  const notes = notesParts.join(' | ') || null;

  const record = {
    email,
    full_name: (payload.fullName || '').toString().trim() || null,
    phone: (payload.phone || '').toString().trim() || null,
    branch: (payload.branch || '').toString().trim() || null,
    is_veteran: true,
    notes,
    // will use `source` if present, else `source_site`, else fallback
    source:
      (payload.source || payload.source_site || '').toString().trim() ||
      'freedomcrateco.com/monthly-box',
    user_agent: event.headers['user-agent'] || null,
    ip_addr: (event.headers['x-forwarded-for'] || '').split(',')[0] || null
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/giveaway_signups`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify([record])
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[fcc-giveaway] Supabase error:', res.status, data);
      return respond(500, { ok: false, error: 'Database insert failed' }, origin);
    }

    return respond(200, { ok: true }, origin);
  } catch (err) {
    console.error('[fcc-giveaway] Exception:', err);
    return respond(500, { ok: false, error: 'Server exception' }, origin);
  }
};
