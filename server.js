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
// Active customer sessions in memory (token -> customerId)
const activeCustomerSessions = new Map();

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token, x-customer-token'
  });
  res.end(JSON.stringify(data));
}

// Helper: Validate Admin Token
function isAuthorized(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return activeSessions.has(token);
}

// Helper: Get Authenticated Customer from Token
function getCustomerSession(req) {
  const authHeader = req.headers['authorization'] || req.headers['x-customer-token'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const customerId = activeCustomerSessions.get(token);
  if (!customerId) return null;
  const customers = readJson('customers.json', []);
  const cust = customers.find(c => c.id === customerId);
  return cust || null;
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token, x-customer-token'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = decodeURI(parsedUrl.pathname);

  // ==============================================================
  // 1. REST API ENDPOINTS
  // ==============================================================

  // --- ADMIN AUTHENTICATION ---
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

  // --- CUSTOMER / STOREFRONT AUTHENTICATION ---
  if (reqPath === '/api/customer/signup' && req.method === 'POST') {
    const body = await parseBody(req);
    const name = (body.name || '').trim();
    const phone = (body.phone || '').trim().replace(/\D/g, '').slice(-10);
    const password = (body.password || '').trim();

    if (!name || !phone || !password) {
      return sendJson(res, 400, { error: 'Full Name, 10-digit mobile number, and password are required' });
    }

    const customers = readJson('customers.json', []);
    if (customers.some(c => c.phone === phone)) {
      return sendJson(res, 400, { error: 'An account with this mobile number already exists. Please sign in.' });
    }

    const customerId = 'CUST-' + (1000 + customers.length + 1);
    const addresses = [];
    if (body.address) {
      addresses.push({
        id: 'addr-1',
        label: 'Home',
        street: body.address.trim(),
        landmark: (body.landmark || '').trim(),
        locality: (body.locality || 'Freeganj').trim(),
        city: 'Ujjain',
        pincode: (body.pincode || '456001').trim(),
        isDefault: true
      });
    }

    const newCust = {
      id: customerId,
      name,
      phone,
      email: (body.email || '').trim().toLowerCase(),
      password,
      vipTier: 'Gourmet Connoisseur',
      addresses,
      createdAt: new Date().toISOString()
    };

    customers.unshift(newCust);
    writeJson('customers.json', customers);

    const token = `tcj_cust_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    activeCustomerSessions.set(token, newCust.id);

    const safeCust = { ...newCust };
    delete safeCust.password;

    return sendJson(res, 201, { success: true, token, customer: safeCust });
  }

  if (reqPath === '/api/customer/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const identifier = (body.identifier || body.phone || body.email || '').trim();
    const password = (body.password || '').trim();

    if (!identifier || !password) {
      return sendJson(res, 400, { error: 'Phone/Email and password are required' });
    }

    const cleanPhone = identifier.replace(/\D/g, '').slice(-10);
    const customers = readJson('customers.json', []);

    const cust = customers.find(c => 
      (cleanPhone && c.phone === cleanPhone) || 
      (c.email && c.email.toLowerCase() === identifier.toLowerCase())
    );

    if (!cust || cust.password !== password) {
      return sendJson(res, 401, { error: 'Invalid mobile/email or password' });
    }

    const token = `tcj_cust_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    activeCustomerSessions.set(token, cust.id);

    const safeCust = { ...cust };
    delete safeCust.password;

    return sendJson(res, 200, { success: true, token, customer: safeCust });
  }

  if (reqPath === '/api/customer/me' && req.method === 'GET') {
    const cust = getCustomerSession(req);
    if (!cust) return sendJson(res, 401, { error: 'Unauthorized customer session' });

    const safeCust = { ...cust };
    delete safeCust.password;
    return sendJson(res, 200, { success: true, customer: safeCust });
  }

  if (reqPath === '/api/customer/profile' && req.method === 'PUT') {
    const cust = getCustomerSession(req);
    if (!cust) return sendJson(res, 401, { error: 'Unauthorized customer session' });

    const body = await parseBody(req);
    const customers = readJson('customers.json', []);
    const idx = customers.findIndex(c => c.id === cust.id);
    if (idx === -1) return sendJson(res, 404, { error: 'Customer not found' });

    if (body.name) customers[idx].name = body.name.trim();
    if (body.email !== undefined) customers[idx].email = body.email.trim().toLowerCase();
    if (Array.isArray(body.addresses)) customers[idx].addresses = body.addresses;
    if (body.newAddress) {
      customers[idx].addresses = customers[idx].addresses || [];
      customers[idx].addresses.push({
        id: 'addr-' + Date.now().toString(36),
        label: body.newAddress.label || 'Home',
        street: body.newAddress.street || body.newAddress.address || '',
        landmark: body.newAddress.landmark || '',
        locality: body.newAddress.locality || 'Freeganj',
        city: 'Ujjain',
        pincode: body.newAddress.pincode || '456001',
        isDefault: Boolean(body.newAddress.isDefault)
      });
    }

    writeJson('customers.json', customers);
    const safeCust = { ...customers[idx] };
    delete safeCust.password;
    return sendJson(res, 200, { success: true, customer: safeCust });
  }

  if (reqPath === '/api/customer/orders' && req.method === 'GET') {
    const cust = getCustomerSession(req);
    if (!cust) return sendJson(res, 401, { error: 'Unauthorized customer session' });

    const orders = readJson('orders.json', []);
    const userOrders = orders.filter(o => 
      (o.customerId && o.customerId === cust.id) || 
      (o.phone && o.phone.replace(/\D/g, '').slice(-10) === cust.phone)
    );

    return sendJson(res, 200, { success: true, orders: userOrders });
  }

  if (reqPath === '/api/customer/logout' && req.method === 'POST') {
    const authHeader = req.headers['authorization'] || req.headers['x-customer-token'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    activeCustomerSessions.delete(token);
    return sendJson(res, 200, { success: true, message: 'Customer signed out' });
  }

  // --- ADMIN CUSTOMERS API ---
  if (reqPath === '/api/admin/customers' && req.method === 'GET') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized' });
    const customers = readJson('customers.json', []);
    const orders = readJson('orders.json', []);
    // Sanitize customer records (hide passwords) and compute order stats
    const safeCustomers = customers.map(c => {
      const { password, ...safe } = c;
      const custOrders = orders.filter(o => 
        (o.customerId && o.customerId === c.id) || 
        (o.phone && o.phone.replace(/\D/g, '').slice(-10) === c.phone)
      );
      return {
        ...safe,
        orderCount: custOrders.length,
        totalSpent: custOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
      };
    });
    return sendJson(res, 200, safeCustomers);
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
    // Allows logging from storefront guest checkout or VIP member checkout
    const body = await parseBody(req);
    const orders = readJson('orders.json', []);

    // Detect logged-in customer session if token present
    const loggedInCustomer = getCustomerSession(req);
    const customerId = body.customerId || (loggedInCustomer ? loggedInCustomer.id : null);
    const isGuest = body.isGuest !== undefined ? Boolean(body.isGuest) : (customerId ? false : true);

    const address = (body.address || 
      (body.addressDetails ? `${body.addressDetails.street || ''}${body.addressDetails.landmark ? ', Near ' + body.addressDetails.landmark : ''}${body.addressDetails.locality ? ', ' + body.addressDetails.locality : ''}, Ujjain` : '') ||
      'Pick-up / Store Concierge').trim();

    const newOrder = {
      id: 'TCJ-ORD-' + (1000 + orders.length + 1),
      customerName: (body.customerName || (loggedInCustomer ? loggedInCustomer.name : 'Gourmet Patron')).trim(),
      phone: (body.phone || (loggedInCustomer ? loggedInCustomer.phone : '')).trim(),
      address: address,
      addressDetails: body.addressDetails || null,
      items: Array.isArray(body.items) ? body.items : [],
      subtotal: Number(body.subtotal || 0),
      deliveryFee: Number(body.deliveryFee || 0),
      total: Number(body.total || 0),
      status: 'Pending',
      paymentMode: body.paymentMode || body.paymentMethod || 'UPI on Delivery',
      isGuest: isGuest,
      customerId: customerId,
      source: body.source || (isGuest ? 'Guest Checkout (No Login)' : 'VIP Member Checkout'),
      notes: (body.notes || body.deliveryNotes || '').trim(),
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
        'Cache-Control': (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json') ? 'no-cache, no-store, must-revalidate' : 'public, max-age=86400'
      });

      fs.createReadStream(fullPath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`?? TCJ Gourmet Store website running at http://localhost:${PORT}`);
  console.log(`?? TCJ Admin Panel available at http://localhost:${PORT}/admin`);
});
