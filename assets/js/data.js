FC.loadProducts = async function(){
  const sheetUrl = (window.FC_CONFIG && window.FC_CONFIG.SHEET_CSV_URL) ? window.FC_CONFIG.SHEET_CSV_URL : 'assets/data/products.csv';
  const text = await fetch(sheetUrl, {cache:'no-store'}).then(r=>r.text());
  const rows = parseCSV(text);
  return rows.filter(r => (r.status||'').toLowerCase() === 'active').map(rowToProduct);

  function parseCSV(txt){
    const lines = txt.trim().split(/\r?\n/);
    const headers = lines.shift().split(',').map(s=>s.trim());
    return lines.map(line => {
      const cells = line.split(',').map(s=>s.trim());
      const o = {}; headers.forEach((h,i)=> o[h]=cells[i]||''); return o;
    });
  }
  function rowToProduct(r){
    return {
      id: r.sku || r.id || '',
      sku: r.sku || '',
      title: r.title || '',
      price: parseFloat(r.price || '0'),
      qty: parseInt(r.qty || '0', 10),
      image_url: r.image_url || '',
      images: r.images ? r.images.split('|') : (r.image_url ? [r.image_url] : []),
      description: r.description || '',
      tags: r.tags ? r.tags.split('|').map(s=>s.trim()) : []
    };
  }
};