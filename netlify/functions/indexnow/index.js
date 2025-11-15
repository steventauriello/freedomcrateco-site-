// netlify/functions/indexnow/index.js

// IndexNow endpoint
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

// Your site details
const BASE_URL = 'https://freedomcrateco.com';
const HOST = 'freedomcrateco.com';

// The key you generated in Bing / IndexNow
const INDEXNOW_KEY = '9cfb578c089c461ba4fb1e9ce69cd15b';

// Where that key file lives (the .txt file you put at the root)
const KEY_LOCATION = `${BASE_URL}/${INDEXNOW_KEY}.txt`;

// Default URLs we want to ping on every successful deploy
const DEFAULT_PATHS = [
  '/',                       // home
  '/about.html',
  '/branch-collection.html',
  '/product.html',           // main product template
  '/gallery.html',
  '/reviews.html',
  '/giveaway.html',
  '/transparency.html',
  '/contact.html',
  '/privacy.html',
  '/shop.html'
];

exports.handler = async (event) => {
  try {
    // Try to read a custom urlList from the request body (optional)
    let urlList = [];

    try {
      if (event.body) {
        const data = JSON.parse(event.body);
        if (Array.isArray(data.urlList)) {
          urlList = data.urlList;
        }
      }
    } catch (err) {
      // If Netlify sends some other JSON, just ignore and fall back to defaults
      console.log('Could not parse body, using default URL list:', err.message);
    }

    // If caller didn’t send a list, use our default important pages
    if (!urlList.length) {
      urlList = DEFAULT_PATHS.map((path) => {
        if (!path.startsWith('/')) path = '/' + path;
        return BASE_URL + path;
      });
    } else {
      // Normalize any custom URLs to full absolute URLs
      urlList = urlList.map((u) => {
        if (u.startsWith('http://') || u.startsWith('https://')) return u;
        if (!u.startsWith('/')) u = '/' + u;
        return BASE_URL + u;
      });
    }

    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList
    };

    console.log('Sending IndexNow payload:', JSON.stringify(payload, null, 2));

    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log('IndexNow response status:', res.status, 'body:', text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: res.ok,
        status: res.status,
        urlCount: urlList.length
      })
    };
  } catch (err) {
    console.error('IndexNow function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: err.message
      })
    };
  }
};
