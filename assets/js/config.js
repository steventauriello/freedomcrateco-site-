// ================================
// Freedom Crate global config
// ================================
(function () {
  "use strict";

  // ------------------------------
  // Core config (Stripe key + optional product sheet)
  // ------------------------------
  window.FC_CONFIG = window.FC_CONFIG || {
    // Optional: use a published Google Sheet CSV for products instead of local files.
    // Leave empty to keep using your local products.json / products.csv.
    SHEET_CSV_URL: "",

    // 🔑 Stripe (FULL Checkout)
    STRIPE_PUBLISHABLE_KEY: "pk_live_51S9PZqEmmlf61EAwcsMG0ejlBQGIjvXuOkibMlDQzQFL5YVSCuFSXFRCm9pvCeWFt7TgyDGlSMjNsCfIBDf0tEAA009SJyqR0o"
  };

  // ------------------------------
  // Stripe Payment Links (optional, only used for single-item cart shortcuts)
  // ------------------------------
  window.STRIPE_LINKS = window.STRIPE_LINKS || {
    "FC-FOOTLOCKER":  "",
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

  // Helper: get Stripe Payment Link for single-item cart
  window.getStripeLinkForCart = function (cartItems) {
    try {
      const items = Array.isArray(cartItems) ? cartItems : [];
      if (items.length !== 1) return null;

      const sku = String(items[0].sku || "").trim();
      if (!sku) return null;

      const link =
        window.STRIPE_LINKS[sku] ||
        window.STRIPE_LINKS[String(sku).toUpperCase()] ||
        null;

      return link && /^https?:\/\//i.test(link) ? link : null;
    } catch (_) {
      return null;
    }
  };

 /* =========================
   Freedom Crate Co. PROMOS
   ========================= */

/**
 * Global sale toggle (sitewide sale mode).
 * If you want a timed sale, set startsAt / endsAt (ISO strings).
 * If you want manual only, leave startsAt/endsAt null and just set active:true/false.
 */
window.FC_PROMO = {
  active: false,                 // 🔥 master switch
  percentOff: 15,               // ✅ 15% OFF
  code: null,                   // auto-applies, no code required
  label: "15% Off Sitewide",
  startsAt: null,
  endsAt: null,

  bannerText: "15% Off Sitewide — Limited Time"
};

/** Returns true if the global promo is currently active (including time window). */
window.FC_isPromoActive = function FC_isPromoActive() {
  const p = window.FC_PROMO;
  if (!p || !p.active) return false;

  const now = Date.now();

  if (p.startsAt) {
    const start = Date.parse(p.startsAt);
    if (!Number.isNaN(start) && now < start) return false;
  }

  if (p.endsAt) {
    const end = Date.parse(p.endsAt);
    if (!Number.isNaN(end) && now > end) return false;
  }

  return true;
};
// ======================================================
// Back-compat helpers (used by catalog.js + product cards)
// ======================================================

// Alias used by newer scripts
window.FC_isPromoActiveNow = window.FC_isPromoActive;

// Apply ONLY the sitewide percentOff promo
// (no coupons, no stacking)
window.FC_applyPromo = function FC_applyPromo(price) {
  const base = Number(price || 0);
  if (!window.FC_isPromoActiveNow()) return base;

  const p = window.FC_PROMO || {};
  const pct = Number(p.percentOff || 0);
  if (!pct) return base;

  const discounted = base * (1 - pct / 100);
  return Math.round(discounted * 100) / 100;
};


/**
 * Optional: promo-code layer (your checkout promo input uses these)
 * - If FC_PROMO.code is set, the user must enter it to activate the promo.
 * - If FC_PROMO.code is null, the promo can auto-apply when FC_PROMO.active is true.
 */
window.FC_getActiveCoupon = function FC_getActiveCoupon() {
  try {
    const raw = localStorage.getItem("fc_active_coupon");
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

window.FC_setActiveCoupon = function FC_setActiveCoupon(codeOrNull) {
  // Clear
  if (!codeOrNull) {
    localStorage.removeItem("fc_active_coupon");
    return null;
  }

  const raw = String(codeOrNull).trim().toUpperCase();
  if (!raw) {
    localStorage.removeItem("fc_active_coupon");
    return null;
  }

  // If you want the global promo to require a code:
  // - set FC_PROMO.code = "CRATE10" (for example)
  // - then only that code activates the sitewide percentOff
  const p = window.FC_PROMO;

  if (p && p.code && raw !== String(p.code).toUpperCase()) {
    // invalid
    return null;
  }

  // Store a normalized coupon object
  const coupon = {
    code: raw,
    percentOff: (p && p.percentOff) ? Number(p.percentOff) : 0,
    label: (p && p.label) ? p.label : `${raw} applied`,
    type: "percent"
  };

  try {
    localStorage.setItem("fc_active_coupon", JSON.stringify(coupon));
  } catch (_) {}

  return coupon;
};

/** Internal: is the promo allowed right now (active + time window)? */
function FC_promoAllowedNow() {
  return window.FC_isPromoActive();
}

/** Internal: should promo apply automatically, or only with a code? */
function FC_shouldApplyPromo() {
  const p = window.FC_PROMO;
  if (!FC_promoAllowedNow()) return false;

  // If promo requires a code, only apply when that code is stored as active coupon
  if (p && p.code) {
    const c = window.FC_getActiveCoupon && window.FC_getActiveCoupon();
    return !!(c && c.code && String(c.code).toUpperCase() === String(p.code).toUpperCase());
  }

  // Otherwise, auto-apply when promo is active
  return true;
}

/** Apply % off to a number (safe). */
function FC_applyPercentOff(value, percentOff) {
  const n = Number(value || 0);
  const pct = Number(percentOff || 0);
  if (!n || pct <= 0) return n;
  const discounted = n * (1 - pct / 100);
  return Math.max(0, discounted);
}

/**
 * ✅ MAIN: apply ALL discounts to a cart total (used by checkout/cart/PayPal total).
 * Right now you only have global percent-off; later you can stack additional rules here.
 */
window.FC_applyAllDiscounts = function FC_applyAllDiscounts(total) {
  let out = Number(total || 0);

  if (FC_shouldApplyPromo()) {
    out = FC_applyPercentOff(out, window.FC_PROMO.percentOff);
  }

  return out;
};

/**
 * ✅ NEW: apply discounts to a SINGLE unit price (for “was/now” UI)
 * This is what your product cards + cart line items should use to show the sale price.
 */
window.FC_applyDiscountsToUnitPrice = function FC_applyDiscountsToUnitPrice(unitPrice) {
  let out = Number(unitPrice || 0);

  if (FC_shouldApplyPromo()) {
    out = FC_applyPercentOff(out, window.FC_PROMO.percentOff);
  }

  return out;
};

/** Convenience for rendering “sale messaging” text anywhere. */
window.FC_getPromoLabel = function FC_getPromoLabel() {
  if (!FC_shouldApplyPromo()) return "";
  const p = window.FC_PROMO;
  return p && p.label ? p.label : `${p.percentOff}% off`;
};

/** Convenience: banner text. */
window.FC_getPromoBannerText = function FC_getPromoBannerText() {
  if (!FC_shouldApplyPromo()) return "";
  const p = window.FC_PROMO;
  return p && p.bannerText ? p.bannerText : window.FC_getPromoLabel();
};


  // ================================
  // Coupon system (stacked on top of FC_PROMO unless blocked)
  // ================================
  // Codes are case-insensitive.
  // You can add as many as you want here.
  window.FC_COUPONS = window.FC_COUPONS || {
    FREEDOM1776: {
      code: "FREEDOM1776",
      percentOff: 15,
      label: "Freedom 1776 — 15% off your cart",
      maxUses: 50
    },

    FAMILY2026: {
      code: "FAMILY2026",
      percentOff: 35,
      label: "FAMILY2026 — 35% off your cart",
      maxUses: null
    },

    CRATE10: {
      code: "CRATE10",
      percentOff: 10,
      label: "Returning Customer — 10% off your next order",
      maxUses: null
    }
  };

  (function couponStorageLayer() {
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
        try { localStorage.removeItem(KEY); } catch (e) {}
        return null;
      }

      const def = window.FC_COUPONS[String(code).trim().toUpperCase()];
      if (!def) return null;

      try { localStorage.setItem(KEY, JSON.stringify({ code: def.code })); } catch (e) {}
      return { code: def.code, percentOff: def.percentOff, label: def.label || def.code };
    }

    // Public helpers
    window.FC_getActiveCoupon = function () {
      return readActive();
    };

    window.FC_setActiveCoupon = function (code) {
      const coupon = writeActive(code || null);
      try {
        window.dispatchEvent(new CustomEvent("fc:coupon-updated", { detail: coupon }));
      } catch (e) {}
      return coupon;
    };

    // Apply global promo then coupon (with non-stacking rules)
    window.FC_applyAllDiscounts = function (rawPrice) {
      let price = Number(rawPrice || 0);

      const coupon = readActive();
      const couponCode = coupon?.code ? String(coupon.code).toUpperCase() : "";

      // Example non-stacking rule:
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

})();
