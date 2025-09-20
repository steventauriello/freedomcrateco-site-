// ================================
// Freedom Crate global config
// ================================
window.FC_CONFIG = {
  // Optional: use a published Google Sheet CSV for products instead of local files.
  // Leave empty to keep using your local products.json / products.csv.
  SHEET_CSV_URL: "", // e.g. "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"

  // 🔑 Stripe (FULL Checkout) — add your TEST publishable key here
  // Looks like: pk_test_****************
  STRIPE_PUBLISHABLE_KEY: "pk_test_REPLACE_ME"
};

// ================================
// Stripe Payment Links (fill these in)
// ================================
// For small cards (from products.json)
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

// Helper: if cart has exactly 1 item and we have a link for its SKU, return it.
// Otherwise return null (so the Stripe button hides).
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