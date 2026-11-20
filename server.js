const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Active admin sessions in memory
const activeSessions = new Set();

// Helper: Read JSON from data folder
function readJson(fileName, fallback = []) {
  try {
    const p = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${fileName}:`, e);
    return fallback;
  }
}

// Helper: Write JSON to data folder
function writeJson(fileName, data) {
  try {
    const p = path.join(DATA_DIR, fileName);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Error writing ${fileName}:`, e);
    return false;
  }
}

// Helper: Parse request body (JSON)
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Guard against huge payloads (max 10MB)
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

// Helper: Send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token'
  });
  res.end(JSON.stringify(data));
}

// Helper: Validate Admin Token
function isAuthorized(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return activeSessions.has(token);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = decodeURI(parsedUrl.pathname);

  // ==============================================================
  // 1. REST API ENDPOINTS
  // ==============================================================

  // --- AUTHENTICATION ---
  if (reqPath === '/api/auth/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const settings = readJson('settings.json', { adminPasscode: 'tcj2026' });
    const passcode = (body.passcode || '').trim();

    if (passcode === (settings.adminPasscode || 'tcj2026')) {
      const token = `tcj_admin_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      activeSessions.add(token);
      return sendJson(res, 200, { success: true, token, user: 'Admin' });
    } else {
      return sendJson(res, 401, { success: false, error: 'Invalid admin passcode' });
    }
  }

  if (reqPath === '/api/auth/verify' && req.method === 'GET') {
    if (isAuthorized(req)) {
      return sendJson(res, 200, { valid: true, authenticated: true, user: 'Admin' });
    }
    return sendJson(res, 401, { valid: false, authenticated: false, error: 'Unauthorized session' });
  }

  if (reqPath === '/api/auth/logout' && req.method === 'POST') {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    activeSessions.delete(token);
    return sendJson(res, 200, { success: true, message: 'Logged out' });
  }

  // --- PRODUCTS API ---
  if (reqPath === '/api/products' && req.method === 'GET') {
    const products = readJson('products.json', []);
    return sendJson(res, 200, products);
  }

  if (reqPath === '/api/products' && req.method === 'POST') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = await parseBody(req);
    const prodName = (body.name || body.title || '').trim();
    if (!prodName || !body.price) {
      return sendJson(res, 400, { error: 'Product name or title and price are required' });
    }

    const products = readJson('products.json', []);
    const newId = body.id || prodName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    const newProduct = {
      id: newId,
      name: prodName,
      title: prodName,
      category: body.category || 'dubai-specials',
      price: Number(body.price),
      originalPrice: Number(body.originalPrice || body.mrp || body.price),
      mrp: Number(body.mrp || body.originalPrice || body.price),
      badge: body.badge || '✨ Gourmet Exclusive',
      weight: body.weight || body.netWeight || '100g',
      netWeight: body.netWeight || body.weight || '100g',
      country: body.country || body.origin || '🇮🇳 India',
      origin: body.origin || body.country || '🇮🇳 India',
      image: body.image || 'assets/mockup/food-dubai-chocolate.png',
      rating: Number(body.rating || 5.0),
      reviewsCount: Number(body.reviewsCount || 10),
      inStock: body.inStock !== false,
      stockQuantity: Number(body.stockQuantity || 50),
      tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',').map(t => t.trim()) : []),
      description: body.description || '',
      createdAt: new Date().toISOString()
    };

    products.unshift(newProduct);
    writeJson('products.json', products);
    return sendJson(res, 201, { success: true, product: newProduct });
  }

  if (reqPath.startsWith('/api/products/') && req.method === 'PUT') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const id = reqPath.replace('/api/products/', '');
    const body = await parseBody(req);
    const products = readJson('products.json', []);
    const idx = products.findIndex(p => p.id === id);

    if (idx === -1) return sendJson(res, 404, { error: 'Product not found' });

    const prodName = body.name || body.title || products[idx].name || products[idx].title;
    products[idx] = {
      ...products[idx],
      ...body,
      id: products[idx].id, // preserve ID
      name: prodName,
      title: prodName,
      price: Number(body.price !== undefined ? body.price : products[idx].price),
      originalPrice: Number(body.originalPrice !== undefined ? body.originalPrice : (body.mrp !== undefined ? body.mrp : products[idx].originalPrice)),
      mrp: Number(body.mrp !== undefined ? body.mrp : (body.originalPrice !== undefined ? body.originalPrice : products[idx].mrp)),
      stockQuantity: Number(body.stockQuantity !== undefined ? body.stockQuantity : products[idx].stockQuantity),
      updatedAt: new Date().toISOString()
    };

    writeJson('products.json', products);
    return sendJson(res, 200, { success: true, product: products[idx] });
  }

  if (reqPath.startsWith('/api/products/') && reqPath.endsWith('/stock') && req.method === 'PATCH') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const id = reqPath.replace('/api/products/', '').replace('/stock', '');
    const body = await parseBody(req);
    const products = readJson('products.json', []);
    const prod = products.find(p => p.id === id);

    if (!prod) return sendJson(res, 404, { error: 'Product not found' });

    if (body.inStock !== undefined) prod.inStock = Boolean(body.inStock);
    if (body.stockQuantity !== undefined) prod.stockQuantity = Number(body.stockQuantity);
    prod.updatedAt = new Date().toISOString();

    writeJson('products.json', products);
    return sendJson(res, 200, { success: true, inStock: prod.inStock, stockQuantity: prod.stockQuantity, product: prod });
  }

  if (reqPath.startsWith('/api/products/') && req.method === 'DELETE') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const id = reqPath.replace('/api/products/', '');
    let products = readJson('products.json', []);
    const initialLen = products.length;
    products = products.filter(p => p.id !== id);

    if (products.length === initialLen) {
      return sendJson(res, 404, { error: 'Product not found' });
    }

    writeJson('products.json', products);
    return sendJson(res, 200, { success: true, deletedId: id });
  }

  // --- CATEGORIES API ---
  if (reqPath === '/api/categories' && req.method === 'GET') {
    const categories = readJson('categories.json', []);
    return sendJson(res, 200, categories);
  }

  if (reqPath === '/api/categories' && req.method === 'POST') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = await parseBody(req);
    if (!body.name) return sendJson(res, 400, { error: 'Category name is required' });

    const categories = readJson('categories.json', []);
    const id = body.id || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existingIdx = categories.findIndex(c => c.id === id);

    const catObj = {
      id,
      name: body.name.trim(),
      subtitle: body.subtitle || '',
      badge: body.badge || '',
      icon: body.icon || '?',
      image: body.image || 'assets/mockup/food-dubai-chocolate.png'
    };

    if (existingIdx !== -1) {
      categories[existingIdx] = catObj;
    } else {
      categories.push(catObj);
    }

    writeJson('categories.json', categories);
    return sendJson(res, 200, { success: true, category: catObj });
  }

  if (reqPath.startsWith('/api/categories/') && req.method === 'DELETE') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const id = reqPath.replace('/api/categories/', '');
    let categories = readJson('categories.json', []);
    categories = categories.filter(c => c.id !== id);
    writeJson('categories.json', categories);
    return sendJson(res, 200, { success: true, deletedId: id });
  }

  // --- ORDERS API ---
  if (reqPath === '/api/orders' && req.method === 'GET') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const orders = readJson('orders.json', []);
    return sendJson(res, 200, orders);
  }

  if (reqPath === '/api/orders' && req.method === 'POST') {
    // Allows public logging from storefront WhatsApp checkout
    const body = await parseBody(req);
    const orders = readJson('orders.json', []);

    const newOrder = {
      id: 'TCJ-ORD-' + (1000 + orders.length + 1),
      customerName: (body.customerName || 'WhatsApp Customer').trim(),
      phone: (body.phone || '').trim(),
      address: (body.address || '').trim(),
      items: Array.isArray(body.items) ? body.items : [],
      subtotal: Number(body.subtotal || 0),
      deliveryFee: Number(body.deliveryFee || 0),
      total: Number(body.total || 0),
      status: 'Pending',
      paymentMode: body.paymentMode || 'UPI / Cash on Delivery',
      source: body.source || 'WhatsApp Checkout',
      notes: body.notes || '',
      createdAt: new Date().toISOString()
    };

    orders.unshift(newOrder);
    writeJson('orders.json', orders);
    return sendJson(res, 201, { success: true, order: newOrder });
  }

  if (reqPath.startsWith('/api/orders/') && req.method === 'PATCH') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const id = reqPath.replace('/api/orders/', '');
    const body = await parseBody(req);
    const orders = readJson('orders.json', []);
    const ord = orders.find(o => o.id === id);

    if (!ord) return sendJson(res, 404, { error: 'Order not found' });

    if (body.status) ord.status = body.status;
    if (body.notes) ord.notes = body.notes;
    ord.updatedAt = new Date().toISOString();

    writeJson('orders.json', orders);
    return sendJson(res, 200, { success: true, order: ord });
  }

  // --- STORE SETTINGS API ---
  if (reqPath === '/api/settings' && req.method === 'GET') {
    const settings = readJson('settings.json', {});
    // Hide admin passcode from public requests unless authorized
    const auth = isAuthorized(req);
    const safeSettings = { ...settings };
    if (!auth) delete safeSettings.adminPasscode;
    return sendJson(res, 200, safeSettings);
  }

  if (reqPath === '/api/settings' && req.method === 'PUT') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = await parseBody(req);
    const settings = readJson('settings.json', {});

    const updatedSettings = {
      ...settings,
      ...body,
      adminPasscode: body.adminPasscode ? body.adminPasscode.trim() : (settings.adminPasscode || 'tcj2026')
    };

    writeJson('settings.json', updatedSettings);
    return sendJson(res, 200, { success: true, settings: updatedSettings });
  }

  // --- IMAGE UPLOAD (Base64) ---
  if (reqPath === '/api/upload' && req.method === 'POST') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = await parseBody(req);
    if (!body.data || !body.name) {
      return sendJson(res, 400, { error: 'Missing image data or name' });
    }

    try {
      const mockupDir = path.join(BASE_DIR, 'assets', 'mockup');
      if (!fs.existsSync(mockupDir)) fs.mkdirSync(mockupDir, { recursive: true });

      const cleanName = body.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
      const filename = `upload-${Date.now()}-${cleanName}`;
      const targetPath = path.join(mockupDir, filename);

      const base64Data = body.data.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));

      return sendJson(res, 200, {
        success: true,
        url: `assets/mockup/${filename}`
      });
    } catch (err) {
      console.error('Upload error:', err);
      return sendJson(res, 500, { error: 'Failed to write uploaded image' });
    }
  }

  // ==============================================================
  // 2. STATIC FILE ROUTING & MEDIA STREAMING
  // ==============================================================
  let filePath = reqPath;
  if (filePath === '/') filePath = '/index.html';
  if (filePath === '/admin' || filePath === '/admin/') filePath = '/admin.html';

  const fullPath = path.join(BASE_DIR, filePath);

  // Security check to avoid path traversal
  if (!fullPath.startsWith(BASE_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const totalSize = stats.size;

    // Handle HEAD request
    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end();
    }

    // Handle HTTP Range Requests (Essential for smooth 60fps video scrub)
    const rangeHeader = req.headers.range;

    if (rangeHeader && (ext === '.mp4' || ext === '.webm')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${totalSize}`
        });
        return res.end();
      }

      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(fullPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': ext === '.mp4' ? 'no-cache' : 'public, max-age=3600'
      });

      fs.createReadStream(fullPath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`?? TCJ Gourmet Store website running at http://localhost:${PORT}`);
  console.log(`?? TCJ Admin Panel available at http://localhost:${PORT}/admin`);
});
