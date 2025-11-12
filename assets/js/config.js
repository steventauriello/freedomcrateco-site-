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
  active: false,                // 👈 turn ON or OFF
  percentOff: 10,              // 👈 discount percentage
  label: "Veterans Day — 10% Off All Ammo Boxes!"  // 👈 optional label
};

// Optional helper: apply discount safely
window.FC_applyPromo = function(price){
  const cfg = window.FC_PROMO;
  if (!cfg || !cfg.active) return Number(price || 0);
  const base = Number(price || 0);
  const discounted = base - (base * (cfg.percentOff / 100));
  return Math.round(discounted * 100) / 100; // keep 2 decimals
};
