// netlify/functions/fcc-review.js

// Allowed origins (same as your giveaway function)
const ALLOW_ORIGINS = [
  'https://freedomcrateco.com',
  'https://www.freedomcrateco.com',
  'https://finalsaluteproject.org',
  'https://www.finalsaluteproject.org',
  'http://localhost:8888',
  'http://localhost:3000'
];

// Simple helper to create JSON responses
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

  // Handle CORS preflight
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
    console.error('[fcc-review] Missing Supabase environment vars.');
    return respond(500, { ok: false, error: 'Server misconfigured' }, origin);
  }

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
    return respond(400, { ok: false, error: 'Invalid JSON or form data' }, origin);
  }

  const name = (payload.name || '').toString().trim() || null;
  const email = (payload.email || '').toString().trim().toLowerCase() || null;
  const product = (payload.product || '').toString().trim() || null;
  const text = (payload.text || '').toString().trim();
  const ratingNum = Number(payload.rating || 0);
  const photoUrl = (payload.photo_url || '').toString().trim() || null;
  const siteSource =
    (payload.site_source || payload.source || 'freedomcrateco.com/reviews').toString().trim();

  // Required fields
  if (!text || !ratingNum || ratingNum < 1 || ratingNum > 5) {
    return respond(
      400,
      { ok: false, error: 'Rating (1–5) and review text are required.' },
      origin
    );
  }

  const record = {
    name,
    email,
    product,
    rating: ratingNum,
    text,
    photo_url: photoUrl,
    site_source: siteSource,
    is_approved: false, // You manually approve inside Supabase
    user_agent: event.headers['user-agent'] || null,
    ip_addr: (event.headers['x-forwarded-for'] || '').split(',')[0] || null
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/product_reviews`, {
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
      console.error('[fcc-review] Supabase error:', res.status, data);
      return respond(500, { ok: false, error: 'Database insert failed' }, origin);
    }

    return respond(200, { ok: true }, origin);
  } catch (err) {
    console.error('[fcc-review] Exception:', err);
    return respond(500, { ok: false, error: 'Server exception' }, origin);
  }
};
