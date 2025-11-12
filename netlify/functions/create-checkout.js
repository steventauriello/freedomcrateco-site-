// netlify/functions/create-checkout.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/** Basic CORS so local/preview works */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

const json = (status, body) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', ...CORS },
  body: JSON.stringify(body),
});

export async function handler(event) {
  // Preflight + method guard
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')   return json(405, { error: 'Method Not Allowed' });

  try {
    // Accept either { items:[...] } or a raw [...] array
    const body  = JSON.parse(event.body || '[]');
    const items = Array.isArray(body) ? body : body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return json(400, { error: 'No items provided' });
    }

    // Helpers
    const toCents = (v) => {
      const n = Number(String(v ?? '').replace(/[^0-9.]/g, '')); // strip $ and text
      return Math.max(0, Math.round(n * 100));
    };

    // Build Stripe line items (amounts in cents, images optional)
    const line_items = items.map((i) => {
      const cents = Number.isFinite(i.unit_amount) ? Number(i.unit_amount) : toCents(i.price);
      const qty   = Math.max(1, parseInt(i.qty ?? i.quantity ?? 1, 10));
      const img   = i.image || i?.meta?.image;

      return {
        price_data: {
          currency: 'usd',
          unit_amount: cents,
          product_data: {
            name: String(i.name || 'Item') + (i.sku ? ` (SKU: ${i.sku})` : ''),
            description: i.sku ? `SKU: ${i.sku}` : undefined,
            images: img ? [img] : undefined,
            metadata: { sku: String(i.sku || '') }
          }
        },
        quantity: qty
      };
    });

    if (line_items.every(li => (li.price_data.unit_amount || 0) === 0)) {
      return json(400, { error: 'All item amounts are 0 cents. Check item prices.' });
    }

    // Derive site origin for redirects (works on Netlify prod/preview/local)
    const origin =
      event.headers.origin ||
      (event.headers.referer && new URL(event.headers.referer).origin) ||
      (event.headers.host ? `https://${event.headers.host}` : 'https://freedomcrateco.com');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      // Apple Pay / Google Pay are auto-enabled in Checkout when using 'card'
      payment_method_types: ['card', 'link'],
      allow_promotion_codes: true,
      shipping_address_collection: { allowed_countries: ['US'] },
      billing_address_collection: 'auto',
      success_url: `${origin}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/checkout.html`,
      metadata: {
        site: 'freedomcrateco',
        skus: items.map(i => i?.sku).filter(Boolean).join(',')
      }
    });

    return json(200, { url: session.url });
  } catch (err) {
    console.error('Stripe Checkout error:', err);
    return json(500, { error: 'Stripe Checkout creation failed' });
  }
}
