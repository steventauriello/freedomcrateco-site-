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
  active: false,               // turn sale on/off
  percentOff: 15,              // how much off
  label: "15% Off Sitewide",

  // OPTIONAL: fixed end moment (recommended for real sales)
  // endsAt: "2025-12-26T04:59:59.000Z"

  // OPTIONAL: auto-expire mode (days from activation)
  // autoExpireDays: 12
};

// ================================
// Ensure promo has a timestamp if turned on (PERSISTED)
// (used only if you choose autoExpireDays mode)
// ================================
window.FC_initPromoTimestamp = function () {
  const cfg = window.FC_PROMO;
  const KEY = "fcc_promo_activatedAt_v1";

  if (cfg.active) {
    let stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}

    if (stored) {
      cfg._activatedAt = stored;
      return;
    }

    cfg._activatedAt = cfg._activatedAt || new Date().toISOString();
    try { localStorage.setItem(KEY, cfg._activatedAt); } catch (e) {}
  } else {
    cfg._activatedAt = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
  }
};

// ================================
// Check if promo should be active *right now*
// (fixed-end OR auto-expire OR manual-on)
// ================================
window.FC_isPromoActiveNow = function () {
  const cfg = window.FC_PROMO;
  if (!cfg || !cfg.active) return false; // ✅ correct toggle behavior

  const now = new Date();

  // Fixed end date mode
  if (cfg.endsAt) {
    const end = new Date(cfg.endsAt);
    return now < end;
  }

  // Auto-expire mode (N days from activation)
  const days = Number(cfg.autoExpireDays || 0);
  if (days > 0) {
    if (!cfg._activatedAt) return true;
    const activatedAt = new Date(cfg._activatedAt);
    const msSince = now - activatedAt;
    const msLimit = days * 24 * 60 * 60 * 1000;
    return msSince <= msLimit;
  }

  // Manual mode: active === true and no end rules
  return true;
};

// ================================
// Apply promo discount (respects expiration logic)
// ================================
window.FC_applyPromo = function (price) {
  const base = Number(price || 0);
  if (!window.FC_isPromoActiveNow()) return base;

  const cfg = window.FC_PROMO;
  const discounted = base - (base * (cfg.percentOff / 100));
  return Math.round(discounted * 100) / 100;
};

// Notify page scripts
window.dispatchEvent(new CustomEvent('fc:promo-updated'));


// ---------------------------------------------------------------------------
// Simple coupon system (STACKS on top of FC_PROMO)
// ---------------------------------------------------------------------------
window.FC_COUPONS = {
  FREEDOM1776: {
    code: "FREEDOM1776",
    percentOff: 15,
    label: "Freedom 1776 — 15% off your cart",
    maxUses: 50
  },

  CRATE10: {
    code: "CRATE10",
    percentOff: 10,
    label: "CRATE10 — 10% off your cart",
    maxUses: null
  },

  FAMILY2026: {
    code: "FAMILY2026",
    percentOff: 35,
    label: "family2026 — 35% off your cart",
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
      const def = window.FC_COUPONS[String(parsed.code).toUpperCase()];
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
    const def = window.FC_COUPONS[String(code).toUpperCase()];
    if (!def) return null;
    localStorage.setItem(KEY, JSON.stringify({ code: def.code }));
    return { code: def.code, percentOff: def.percentOff, label: def.label || def.code };
  }

  window.FC_getActiveCoupon = function () {
    return readActive();
  };

  window.FC_setActiveCoupon = function (code) {
    const coupon = writeActive(code || null);
    window.dispatchEvent(new CustomEvent("fc:coupon-updated", { detail: coupon }));
    return coupon;
  };

  // ✅ Live-style stacking: promo first, then coupon on top
  window.FC_applyAllDiscounts = function (rawPrice) {
    let price = Number(rawPrice || 0);

    // 1) Sitewide promo first
    if (typeof window.FC_applyPromo === "function") {
      price = window.FC_applyPromo(price);
    }

    // 2) Coupon stacks on top
    const coupon = readActive();
    if (coupon && coupon.percentOff) {
      const pct = Math.max(0, Math.min(100, Number(coupon.percentOff) || 0));
      price = price - (price * pct / 100);
    }

    return Math.round(price * 100) / 100;
  };
})();


