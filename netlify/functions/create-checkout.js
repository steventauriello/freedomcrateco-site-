// netlify/functions/create-checkout.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/** Basic CORS so local/preview works */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...CORS },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')   return json(405, { error: 'Method Not Allowed' });

  try {
    const { items } = JSON.parse(event.body || '{}');
    if (!Array.isArray(items) || !items.length) {
      return json(400, { error: 'No items provided' });
    }

    // Build Stripe line items (amounts in cents)
    const toCents = (v) => {
      const n = Number(String(v ?? '').replace(/[^0-9.]/g, '')); // strip $ and text
      return Math.max(0, Math.round(n * 100));
    };

    const line_items = items.map(i => {
      const cents = Number.isFinite(i.unit_amount)
        ? Number(i.unit_amount)            // already integer cents
        : toCents(i.price);                // derive from price

      const qty = Math.max(1, parseInt(i.qty ?? i.quantity ?? 1, 10));

      return {
        price_data: {
          currency: 'usd',
          unit_amount: cents,
          product_data: {
            name: String(i.name || 'Item'),
            metadata: { sku: String(i.sku || '') }
          }
        },
        quantity: qty
      };
    });

    if (line_items.every(li => (li.price_data.unit_amount || 0) === 0)) {
      return json(400, { error: 'All item amounts are 0 cents. Check item prices.' });
    }

    // Derive site origin for redirects (works on Netlify)
    const origin =
      event.headers.origin ||
      (event.headers.referer && new URL(event.headers.referer).origin) ||
      `https://${event.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      payment_method_types: ['card', 'link'], // Apple Pay / Google Pay auto via Checkout
      shipping_address_collection: { allowed_countries: ['US'] },
      allow_promotion_codes: true,
      success_url: `${origin}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout.html`,
      metadata: { site: 'freedomcrateco', skus: items.map(i=>i.sku).filter(Boolean).join(',') }
    });

    return json(200, { url: session.url });
  } catch (err) {
    console.error('Stripe create session error:', err);
    return json(500, { error: 'Stripe Checkout creation failed' });
  }
}