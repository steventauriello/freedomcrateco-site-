// ================================
// Freedom Crate global config
// ================================
window.FC_CONFIG = {
  // Optional: use a published Google Sheet CSV for products instead of local files.
  // Leave empty to keep using your local products.json / products.csv.
  SHEET_CSV_URL: "", // e.g. "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"

  // 🔑 Stripe (FULL Checkout)
  // Add your **PUBLISHABLE KEY** here (the one that starts with pk_).
  // You can find it in your Stripe Dashboard → Developers → API keys → “Publishable key”.
  // Example:
  //   pk_test_12345...   ← for test mode
  //   pk_live_12345...   ← for live mode
  STRIPE_PUBLISHABLE_KEY: "pk_live_51S9PZqEmmlf61EAwcsMG0ejlBQGIjvXuOkibMlDQzQFL5YVSCuFSXFRCm9pvCeWFt7TgyDGlSMjNsCfIBDf0tEAA009SJyqR0o"
};

// ================================
// Stripe Payment Links (fill these in if you use Payment Links)
// ================================
window.STRIPE_LINKS = {
  "FC-FOOTLOCKER":  "",  // e.g. "https://buy.stripe.com/xxxx_footlocker"
  "FC-RB-300":      "",
  "FC-RB-1000":     "",
  "FC-RM-400":      "",
  "FC-CLASSIC":     "",

  // RM400 featured options (index.html) — package + hardware
  "RM400-BASE-STN":  "",
  "RM400-BASE-BLK":  "",
  "RM400-ARMOR-STN": "",
  "RM400-ARMOR-BLK": "",
  "RM400-BG-STN":    "",
  "RM400-BG-BLK":    "",

  // Classic Branch Collection (index.html) — branch + hardware
  "classic-blank-stainless":      "",
  "classic-blank-black":          "",
  "classic-army-stainless":       "",
  "classic-army-black":           "",
  "classic-marines-stainless":    "",
  "classic-marines-black":        "",
  "classic-navy-stainless":       "",
  "classic-navy-black":           "",
  "classic-airforce-stainless":   "",
  "classic-airforce-black":       "",
  "classic-coastguard-stainless": "",
  "classic-coastguard-black":     ""
};

// ================================
// Helper: get Stripe Payment Link for single-item cart
// ================================
window.getStripeLinkForCart = function(cartItems){
  try{
    const items = Array.isArray(cartItems) ? cartItems : [];
    if (items.length !== 1) return null;
    const sku = String(items[0].sku || '').trim();
    if (!sku) return null;
    const link = window.STRIPE_LINKS[sku] || window.STRIPE_LINKS[sku.toUpperCase()] || null;
    return (link && /^https?:\/\//i.test(link)) ? link : null;
  }catch(_){
    return null;
  }
};

// ================================
// Sitewide Promo / Discount Config
// ================================
window.FC_PROMO = {
  active: true,               // turn sale on/off
  percentOff: 15,             // how much off
  label: "12 DAYS OF CHRISTMAS — 15% Off Sitewide",

  // ONE global end moment for everyone
  // Ends at 11:59:59 PM Eastern on Christmas Day
  endsAt: "2025-12-26T04:59:59.000Z"
};


// ================================
// Ensure promo has a timestamp if turned on (PERSISTED)
// ================================
window.FC_initPromoTimestamp = function () {
  const cfg = window.FC_PROMO;
  const KEY = "fcc_promo_activatedAt_v1";

  if (cfg.active) {
    // Try to reuse a saved timestamp so refresh doesn't reset the countdown
    let stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}

    if (stored) {
      cfg._activatedAt = stored;
      return;
    }

    // First activation: set + persist
    cfg._activatedAt = cfg._activatedAt || new Date().toISOString();
    try { localStorage.setItem(KEY, cfg._activatedAt); } catch (e) {}
  } else {
    // Promo OFF: clear timestamp everywhere
    cfg._activatedAt = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
  }
};

// ================================
// Check if promo should be active *right now*
// ================================
window.FC_isPromoActiveNow = function () {
  const cfg = window.FC_PROMO;
  if (!cfg || !cfg.active) return false;

  const now = new Date();

  // Fixed end date mode
  if (cfg.endsAt) {
    const end = new Date(cfg.endsAt);
    return now < end;
  }

  // Auto-expire mode (12 days from activation)
  const days = Number(cfg.autoExpireDays || 0);
  if (!days) return true; // no duration set = treat as on

  // IMPORTANT: do NOT set _activatedAt here (no resets!)
  if (!cfg._activatedAt) return true; // banner can show; countdown code should hide if missing

  const activatedAt = new Date(cfg._activatedAt);
  const msSince = now - activatedAt;
  const msLimit = days * 24 * 60 * 60 * 1000;

  return msSince <= msLimit;
};

// ================================
// Apply promo discount (respects auto-expire)
// ================================
window.FC_applyPromo = function (price) {
  const base = Number(price || 0);

  // Do not discount if promo expired or inactive
  if (!window.FC_isPromoActiveNow()) {
    return base;
  }

  const cfg = window.FC_PROMO;
  const discounted = base - (base * (cfg.percentOff / 100));

  return Math.round(discounted * 100) / 100;
};

// window.FC_initPromoTimestamp(); // not used for fixed-end sales

// Notify page scripts
window.dispatchEvent(new CustomEvent('fc:promo-updated'));

// ---------------------------------------------------------------------------
// Simple coupon system (stacked on top of FC_PROMO)
// ---------------------------------------------------------------------------

// Hard-coded coupon definitions for now.
// Codes are case-insensitive.
window.FC_COUPONS = {
  FREEDOM1776: {
    code: "FREEDOM1776",
    percentOff: 15,
    label: "Freedom 1776 — 15% off your cart",
    maxUses: 50
  },

  FAMILY2026: {
    code: "FAMILY2026",
    percentOff: 35,
    label: "family2026 — 35% off your cart",
    maxUses: null       // unlimited usage unless you want a cap
  },

CRATE10: {
  code: "CRATE10",
  percentOff: 10,
  label: "Returning Customer — 10% off your next order",
  maxUses: null
}
};


(function () {
  const KEY = "fcc_coupon_v1";

  function readActive() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.code) return null;
      const def = window.FC_COUPONS[String(parsed.code).trim().toUpperCase()];
      if (!def) return null;
      return { code: def.code, percentOff: def.percentOff, label: def.label || def.code };
    } catch (err) {
      console.warn("[FC] Failed to read coupon from storage", err);
      return null;
    }
  }

  function writeActive(code) {
    if (!code) {
      localStorage.removeItem(KEY);
      return null;
    }
    const def = window.FC_COUPONS[String(code).trim().toUpperCase()];
    if (!def) return null;
    localStorage.setItem(KEY, JSON.stringify({ code: def.code }));
    return { code: def.code, percentOff: def.percentOff, label: def.label || def.code };
  }

  // Public helpers
  window.FC_getActiveCoupon = function () {
    return readActive();
  };

  // Set or clear coupon. Returns the active coupon object or null.
  window.FC_setActiveCoupon = function (code) {
    const coupon = writeActive(code || null);
    window.dispatchEvent(new CustomEvent("fc:coupon-updated", { detail: coupon }));
    return coupon;
  };

  // Apply global promo *then* coupon (for product cards, etc).
 window.FC_applyAllDiscounts = function (rawPrice) {
  let price = Number(rawPrice || 0);

  const coupon = readActive();
  const couponCode = coupon?.code ? String(coupon.code).toUpperCase() : "";

  // CRATE10 must NOT stack with sitewide promo
  const blockSitewidePromo = (couponCode === "CRATE10");

  // Apply sitewide promo only if allowed
  if (!blockSitewidePromo && typeof window.FC_applyPromo === "function") {
    price = window.FC_applyPromo(price);
  }

  // Apply coupon
  if (coupon && coupon.percentOff) {
    const pct = Math.max(0, Math.min(100, Number(coupon.percentOff) || 0));
    price = price - (price * pct / 100);
  }

  return Math.round(price * 100) / 100;
};
})();

