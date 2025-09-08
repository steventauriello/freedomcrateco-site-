// netlify/functions/inventory.js
// REST-ish inventory service using Netlify Blobs.
// GET  /api/inventory              -> { map of sku -> qty }
// GET  /api/inventory?sku=FC-123   -> { sku, qty }
// POST /api/inventory  body: { op:"decrement", items:[{sku,qty}] }
//      returns { ok:true, updated:{sku:qty,...} } or 409 on insufficient stock
// POST /api/inventory  body: { op:"set", items:[{sku,qty}] }  (admin only)
//   send header:  x-inventory-admin: <INVENTORY_ADMIN_TOKEN>

import { getStore } from '@netlify/blobs';

const store = getStore('inventory');           // bucket name
const KEY   = 'qty';                            // single JSON doc

function json(status, data) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,x-inventory-admin',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(data),
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {});
  }

  // always have a map object
  const read = async () => (await store.get(KEY, { type: 'json' })) || {};
  const write = async (map) => { await store.setJSON(KEY, map); return map; };

  if (event.httpMethod === 'GET') {
    const map = await read();
    const sku = event.queryStringParameters?.sku;
    if (sku) return json(200, { sku, qty: Number(map[sku] ?? 0) });
    return json(200, map);
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return json(400, { ok:false, error:'Invalid JSON' }); }

    const op = String(body.op || '').toLowerCase();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!op || !items.length) {
      return json(400, { ok:false, error:'Missing op or items[]' });
    }

    // Admin-only operations
    if (op === 'set') {
      const token = event.headers['x-inventory-admin'];
      if (!token || token !== process.env.INVENTORY_ADMIN_TOKEN) {
        return json(401, { ok:false, error:'Unauthorized' });
      }
      const map = await read();
      for (const { sku, qty } of items) {
        if (!sku) continue;
        map[sku] = Math.max(0, Number(qty || 0));
      }
      await write(map);
      return json(200, { ok:true, updated: map });
    }

    // Public decrement (used after a successful payment/capture)
    if (op === 'decrement') {
      const map = await read();

      // Validate availability
      const missing = [];
      for (const { sku, qty } of items) {
        const need = Number(qty || 0);
        if (!sku || need <= 0) continue;
        const have = Number(map[sku] ?? 0);
        if (have < need) missing.push({ sku, have, need });
      }
      if (missing.length) {
        return json(409, { ok:false, error:'Insufficient stock', missing });
      }

      // Apply decrement
      for (const { sku, qty } of items) {
        if (!sku) continue;
        const n = Number(qty || 0);
        if (n > 0) map[sku] = Math.max(0, Number(map[sku] ?? 0) - n);
      }
      await write(map);

      // Return only changed entries
      const updated = {};
      for (const { sku } of items) updated[sku] = Number(map[sku] ?? 0);
      return json(200, { ok:true, updated });
    }

    return json(400, { ok:false, error:`Unknown op "${op}"` });
  }

  return json(405, { ok:false, error:'Method not allowed' });
}