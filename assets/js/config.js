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
  label: "HOLIDAY SALE — 15% Off All Ammo Boxes!",

  // ❌ Don't use a fixed end date for normal sales
  // endsAt: "",              // leave this blank or remove it

  // ✅ Use “how many days from start”
  autoExpireDays: 4,          // sale lasts 4 days

  _activatedAt: null          // let the code set this on first load
};


// ================================
// Ensure promo has a timestamp if turned on
// ================================
window.FC_initPromoTimestamp = function () {
  const cfg = window.FC_PROMO;

  if (cfg.active) {
    // If promo just turned on and no timestamp exists → set it
    if (!cfg._activatedAt) {
      cfg._activatedAt = new Date().toISOString();
    }
  } else {
    // If promo is OFF → clear timestamp
    cfg._activatedAt = null;
  }
};

// ================================
// Check if promo should be active *right now*
// ================================
window.FC_isPromoActiveNow = function () {
  const cfg = window.FC_PROMO;

  // Manual switch OFF → always OFF
  if (!cfg.active) return false;

  const now = new Date();

  // ✅ If a fixed end date is set, use that
  if (cfg.endsAt) {
    const end = new Date(cfg.endsAt);
    return now < end;
  }

  // 🔙 Fallback: old autoExpireDays logic if no endsAt
  if (!cfg._activatedAt) {
    cfg._activatedAt = new Date().toISOString();
    return true;
  }

  const activatedAt = new Date(cfg._activatedAt);
  const msSince = now - activatedAt;
  const msLimit = cfg.autoExpireDays * 24 * 60 * 60 * 1000;

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

// Run timestamp initializer
window.FC_initPromoTimestamp();

// Notify page scripts
window.dispatchEvent(new CustomEvent('fc:promo-updated'));
