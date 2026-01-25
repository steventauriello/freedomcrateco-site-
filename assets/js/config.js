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

  // ================================
  // Sitewide Promo (GLOBAL SALE)
  // ================================
  // NOTE:
  // - This is for automatic sitewide promos (banner + price slashes).
  // - Coupons are separate and can stack unless you block stacking.
  window.FC_PROMO = window.FC_PROMO || {
    active: false, // turn sale on/off
    percentOff: 15,
    label: "12 DAYS OF CHRISTMAS — 15% Off Sitewide",

    // ONE global end moment for everyone (ISO string).
    // Example: Ends at 11:59:59 PM Eastern on Christmas Day
    endsAt: "2025-12-26T04:59:59.000Z"

    // Optional alt mode:
    // autoExpireDays: 12,
    // _activatedAt: null
  };

  // Ensure promo has a timestamp if turned on (PERSISTED)
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

  // Check if promo should be active right now
  window.FC_isPromoActiveNow = function () {
    const cfg = window.FC_PROMO;
    if (!cfg || !cfg.active) return false;

    const now = new Date();

    // Fixed end date mode
    if (cfg.endsAt) {
      const end = new Date(cfg.endsAt);
      return now < end;
    }

    // Auto-expire mode
    const days = Number(cfg.autoExpireDays || 0);
    if (!days) return true;

    if (!cfg._activatedAt) return true;

    const activatedAt = new Date(cfg._activatedAt);
    const msSince = now - activatedAt;
    const msLimit = days * 24 * 60 * 60 * 1000;

    return msSince <= msLimit;
  };

  // Apply promo discount (respects auto-expire)
  window.FC_applyPromo = function (price) {
    const base = Number(price || 0);

    if (!window.FC_isPromoActiveNow()) return base;

    const cfg = window.FC_PROMO;
    const discounted = base - (base * (cfg.percentOff / 100));

    return Math.round(discounted * 100) / 100;
  };

  // If you ever switch to auto-expire promos, enable this:
  // window.FC_initPromoTimestamp();

  // Notify page scripts that promo config exists/changed
  try {
    window.dispatchEvent(new CustomEvent("fc:promo-updated"));
  } catch (e) {}

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
