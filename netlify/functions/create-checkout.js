// netlify/functions/create-checkout.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ------------------------------
// ✅ PROMO + COUPON RULES (server authoritative)
// ------------------------------

// Sitewide promo (match your FC_PROMO)
const SITEWIDE_PROMO = {
  active: false,            // 🔥 master switch (set true when running the sale)
  percentOff: 15,           // e.g. 15% off
  startsAt: null,           // e.g. "2026-01-24T00:00:00-05:00" or null
  endsAt: null              // e.g. "2026-02-01T23:59:59-05:00" or null
};

// Coupon codes (match your FC_COUPONS)
const COUPONS = {
  FREEDOM1776: { label: "Freedom 1776", percentOff: 15 },
  FAMILY2026:  { label: "Family 2026", percentOff: 35 },
  CRATE10:     { label: "Returning Customer", percentOff: 10 }
};

// Non-stacking rule: CRATE10 blocks sitewide promo
function blocksSitewidePromo(couponCodeUpper) {
  return couponCodeUpper === "CRATE10";
}

// ------------------------------
// CORS
// ------------------------------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

const json = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...CORS },
  body: JSON.stringify(body)
});

// ------------------------------
// Helpers
// ------------------------------
function promoAllowedNow() {
  if (!SITEWIDE_PROMO.active) return false;

  const now = Date.now();

  if (SITEWIDE_PROMO.startsAt) {
    const start = Date.parse(SITEWIDE_PROMO.startsAt);
    if (!Number.isNaN(start) && now < start) return false;
  }

  if (SITEWIDE_PROMO.endsAt) {
    const end = Date.parse(SITEWIDE_PROMO.endsAt);
    if (!Number.isNaN(end) && now > end) return false;
  }

  return true;
}

function clampPercent(p) {
  const n = Number(p || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function toCents(v) {
  // Accepts 49.99, "49.99", "$49.99", etc.
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

function applyPercentOffCents(cents, percentOff) {
  const pct = clampPercent(percentOff);
  if (pct <= 0) return cents;
  const out = Math.round(cents * (1 - pct / 100));
  return Math.max(0, out);
}

// ------------------------------
// Handler
// ------------------------------
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  try {
    const body = JSON.parse(event.body || "{}");

    const items = Array.isArray(body.items) ? body.items : (Array.isArray(body) ? body : []);
    if (!Array.isArray(items) || items.length === 0) {
      return json(400, { error: "No items provided" });
    }

    // Read coupon code from request
    const rawCouponCode = String(body.couponCode || body.coupon?.code || "").trim();
    const couponCode = rawCouponCode.toUpperCase();

    const couponDef = couponCode ? COUPONS[couponCode] : null;
    const couponPercent = couponDef ? clampPercent(couponDef.percentOff) : 0;

    // Decide whether sitewide promo applies
    const sitewideAllowed = promoAllowedNow();
    const sitewideBlocked = blocksSitewidePromo(couponCode);
    const sitewidePercent = (sitewideAllowed && !sitewideBlocked) ? clampPercent(SITEWIDE_PROMO.percentOff) : 0;

    // Build Stripe line items
    const line_items = items.map((i) => {
      const rawUnitCents = Number.isFinite(i.unit_amount)
        ? Math.max(0, Math.round(Number(i.unit_amount)))
        : toCents(i.price);

      // Apply sitewide promo first, then coupon (matches your config.js flow)
      let unitCents = rawUnitCents;
      if (sitewidePercent > 0) unitCents = applyPercentOffCents(unitCents, sitewidePercent);
      if (couponPercent > 0)   unitCents = applyPercentOffCents(unitCents, couponPercent);

      const qty = Math.max(1, parseInt(i.qty ?? i.quantity ?? 1, 10));
      const img = i.image || i?.meta?.image;

      return {
        price_data: {
          currency: "usd",
          unit_amount: unitCents,
          product_data: {
            name: String(i.name || "Item") + (i.sku ? ` (SKU: ${i.sku})` : ""),
            description: i.sku ? `SKU: ${i.sku}` : undefined,
            images: img ? [img] : undefined,
            metadata: {
              sku: String(i.sku || ""),
              ...(sitewidePercent > 0 ? { sitewide_percent: String(sitewidePercent) } : {}),
              ...(couponCode ? { coupon_code: couponCode } : {}),
              ...(couponPercent > 0 ? { coupon_percent: String(couponPercent) } : {})
            }
          }
        },
        quantity: qty
      };
    });

    // Guard: don’t allow a $0 checkout
    const allZero = line_items.every(li => (li.price_data.unit_amount || 0) === 0);
    if (allZero) {
      return json(400, { error: "All item amounts are 0 cents. Check item prices / discounts." });
    }

    // Determine origin
    const origin =
      event.headers.origin ||
      (event.headers.referer && new URL(event.headers.referer).origin) ||
      (event.headers.host ? `https://${event.headers.host}` : "https://freedomcrateco.com");

    const metadata = {
      site: "freedomcrateco",
      skus: items.map(i => i?.sku).filter(Boolean).join(","),
      ...(sitewidePercent > 0 ? { sitewide_percent: String(sitewidePercent) } : {}),
      ...(couponCode ? { coupon_code: couponCode } : {}),
      ...(couponPercent > 0 ? { coupon_percent: String(couponPercent) } : {})
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      payment_method_types: ["card", "link"],
      allow_promotion_codes: false, // ✅ turn OFF to avoid double-discount confusion
      shipping_address_collection: { allowed_countries: ["US"] },
      billing_address_collection: "auto",
      success_url: `${origin}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout.html`,
      metadata
    });

    return json(200, { url: session.url });
  } catch (err) {
    console.error("Stripe Checkout error:", err);
    return json(500, { error: "Stripe Checkout creation failed" });
  }
}
