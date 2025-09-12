diff --git a/assets/js/data.js b/assets/js/data.js
index 5fc96ad2e532f6dd1de732b35e48cfd6030c500b..13e7d9ad1b6bea64d6ce8a3c6edca222f362eb16 100644
--- a/assets/js/data.js
+++ b/assets/js/data.js
@@ -42,51 +42,51 @@ window.FC = window.FC || {};
       }
     } catch (e) {
       console.warn('products.json not found or invalid, trying CSV…', e);
     }
 
     // Fallback to CSV
     try {
       const r = await fetch('assets/data/products.csv', { cache: 'no-store' });
       if (!r.ok) throw new Error('CSV not found');
       const text = await r.text();
       const map = csvToProducts(text);
       normalizeProducts(map);
       window.PRODUCTS = map;
       return Object.values(map);
     } catch (e) {
       console.error('Failed to load products.csv', e);
       window.PRODUCTS = {};
       return [];
     }
   }
 
   // expose the loader under FC as catalog.js expects
   FC.loadProducts = loadProducts;
 
   // ---- normalization + CSV helpers ----
-  const PLACEHOLDER = 'assets/img/placeholder.png';
+  const PLACEHOLDER = 'assets/img/blank.jpg';
   function ensureImagePath(src) {
     const s = (src || '').trim();
     if (!s) return PLACEHOLDER;
     if (/^https?:\/\//i.test(s)) return s;          // absolute URL
     if (s.startsWith('assets/')) return s;          // already under assets/
     return 'assets/img/' + s.replace(/^\/+/, '');   // bare filename -> assets/img/filename
   }
 
   function normalizeProducts(map) {
     for (const [sku, p] of Object.entries(map || {})) {
       p.sku   = sku;
       p.title = p.title ?? sku;
       p.price = Number(p.price || 0);
       p.qty   = parseInt(p.qty ?? 0, 10) || 0;
       // prefer your real images; fix/commonize the path; fallback to placeholder
       p.image_url = ensureImagePath(p.image_url || p.image || p.img || '');
       p.status = p.status || 'active';
       if (typeof p.tags === 'string') {
         p.tags = p.tags.split(/[|,]/).map(s => s.trim()).filter(Boolean);
       }
     }
   }
 
   // Lightweight CSV → map keyed by sku (expects: status,title,sku,price,qty,image_url,images,tags,description)
   function csvToProducts(csv) {
