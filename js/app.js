/**
 * TCJ Gourmet Store - Client E-Commerce & Interactive Logic
 * Location: Ujjain, Madhya Pradesh | Founder: Tapish Verma
 * Hotline: +91 62683 44816 | Instagram: @theconveniencejunction
 */

const state = {
  activeCategory: 'all',
  searchQuery: '',
  cart: [],
  wishlist: []
};

let TCJ_PHONE = '916268344816';
let FREE_DELIVERY_THRESHOLD = 799;
let FLAT_DELIVERY_FEE = 49;
let STORE_IS_OPEN = true;

function initApp() {
  initThemeManager();
  loadStorage();
  renderCategoryPills();
  renderProducts();
  updateCartUI();
  updateStoreStatus();
  syncLiveStoreData();
}

async function syncLiveStoreData() {
  try {
    const [prodRes, catRes, setRes] = await Promise.all([
      fetch('/api/products').catch(() => null),
      fetch('/api/categories').catch(() => null),
      fetch('/api/settings').catch(() => null),
    ]);

    if (setRes && setRes.ok) {
      const settings = await setRes.json();
      if (settings) {
        if (settings.conciergePhone) TCJ_PHONE = settings.conciergePhone;
        if (settings.freeDeliveryAbove !== undefined) FREE_DELIVERY_THRESHOLD = settings.freeDeliveryAbove;
        if (settings.deliveryFee !== undefined) FLAT_DELIVERY_FEE = settings.deliveryFee;
        if (settings.storeOpen !== undefined) STORE_IS_OPEN = settings.storeOpen;

        const banner = document.getElementById('announcement-banner');
        const bannerText = document.getElementById('announcement-text');
        if (banner && bannerText && settings.announcement) {
          if (settings.announcement.enabled && settings.announcement.text) {
            bannerText.textContent = settings.announcement.text;
            banner.classList.remove('hidden');
          } else {
            banner.classList.add('hidden');
          }
        }
        updateCartUI();
      }
    }

    if (catRes && catRes.ok) {
      const cats = await catRes.json();
      if (Array.isArray(cats) && cats.length > 0 && typeof TCJ_CATEGORIES !== 'undefined') {
        TCJ_CATEGORIES.length = 0;
        cats.forEach(c => TCJ_CATEGORIES.push(c));
        renderCategoryPills();
      }
    }

    if (prodRes && prodRes.ok) {
      const prods = await prodRes.json();
      if (Array.isArray(prods) && prods.length > 0 && typeof TCJ_PRODUCTS !== 'undefined') {
        TCJ_PRODUCTS.length = 0;
        prods.forEach(p => {
          TCJ_PRODUCTS.push({
            ...p,
            name: p.name || p.title,
            country: p.country || p.origin || 'Imported Exclusive',
            originalPrice: p.originalPrice || p.mrp,
            weight: p.weight || p.netWeight || '',
            inStock: p.inStock !== false,
          });
        });
        renderProducts();
      }
    }
  } catch (err) {
    console.log('Using local catalog cache');
  }
}

if (document.readyState !== 'loading') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}

function loadStorage() {
  try {
    const savedCart = localStorage.getItem('tcj_cart');
    if (savedCart) state.cart = JSON.parse(savedCart);
    const savedWish = localStorage.getItem('tcj_wishlist');
    if (savedWish) state.wishlist = JSON.parse(savedWish);
  } catch (e) {
    console.warn('Storage read error', e);
  }
}

function saveCart() {
  localStorage.setItem('tcj_cart', JSON.stringify(state.cart));
}

function saveWishlist() {
  localStorage.setItem('tcj_wishlist', JSON.stringify(state.wishlist));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RENDER CATEGORY PILLS & BENTO SECTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderCategoryPills() {
  const container = document.getElementById('category-filter-pills');
  if (!container || typeof TCJ_CATEGORIES === 'undefined') return;

  container.innerHTML = TCJ_CATEGORIES.map(cat => {
    const isActive = state.activeCategory === cat.id;
    return `
      <button 
        onclick="setCategory('${cat.id}')"
        class="px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
          isActive 
            ? 'bg-gradient-to-r from-[#D6A65B] to-[#B88536] text-[#080808] font-bold shadow-lg shadow-[#D6A65B]/20 scale-105' 
            : 'bg-[#151312] text-[#A49B91] hover:text-[#F5EBDD] hover:bg-[#1f1b19] border border-[#D6A65B]/15'
        }"
      >
        <span>${cat.icon}</span>
        <span>${cat.name}</span>
      </button>
    `;
  }).join('');
}

function setCategory(catId) {
  state.activeCategory = catId;
  renderCategoryPills();
  renderProducts();

  // Smooth scroll down to products section if clicked from bento
  const prodSec = document.getElementById('collection-section');
  if (prodSec) {
    const yOffset = -90;
    const y = prodSec.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RENDER PRODUCTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderProducts() {
  const container = document.getElementById('products-grid');
  const countLabel = document.getElementById('products-count-label');
  if (!container || typeof TCJ_PRODUCTS === 'undefined') return;

  let filtered = TCJ_PRODUCTS;

  // Filter by category
  if (state.activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === state.activeCategory);
  }

  // Filter by search query
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  if (countLabel) {
    countLabel.textContent = `Showing ${filtered.length} viral delicacies`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[#151312] border border-[#D6A65B]/20 flex items-center justify-center text-2xl">
          🔍
        </div>
        <h3 class="font-editorial text-xl text-[#F5EBDD]">No Flavours Found</h3>
        <p class="text-sm text-[#A49B91] mt-1">Try another search keyword or select a different category.</p>
        <button 
          onclick="setCategory('all'); clearSearch();" 
          class="mt-4 px-5 py-2 rounded-full btn-gold text-xs font-bold"
        >
          View All Creations
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(prod => {
    return `
      <div class="product-card-3d card-3d-wrap">
        <div class="card-3d-inner luxury-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full relative group">
          
          <!-- Top Badges & Origin -->
            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              prod.inStock === false
                ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                : 'bg-[#32180F] text-[#D6A65B] border border-[#D6A65B]/30'
            }">
              ${prod.inStock === false ? 'Sold Out' : prod.badge}
            </span>
            <span class="text-[11px] font-medium text-[#A49B91] flex items-center gap-1">
              ${prod.country}
            </span>
          </div>

          <!-- Product Image with Floating Glow -->
          <div 
            onclick="openProductModal('${prod.id}')"
            class="relative w-full aspect-square rounded-xl bg-[#0c0b0a] border border-[#D6A65B]/10 overflow-hidden flex items-center justify-center p-4 cursor-pointer group-hover:border-[#D6A65B]/30 transition-all"
          >
            <div class="absolute inset-0 bg-radial from-[#D6A65B]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img 
              src="${prod.image}" 
              alt="${prod.name}" 
              loading="lazy" 
              class="max-h-full max-w-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] group-hover:scale-108 transition-transform duration-500 ${prod.inStock === false ? 'grayscale opacity-60' : ''}" 
            />
          </div>

          <!-- Product Details -->
          <div class="mt-4 flex-grow flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs text-[#D6A65B]">★★★★★</span>
                <span class="text-[11px] font-semibold text-[#F5EBDD]">${prod.rating}</span>
                <span class="text-[11px] text-[#706860]">(${prod.reviewsCount})</span>
              </div>
              <h3 
                onclick="openProductModal('${prod.id}')"
                class="font-editorial text-base sm:text-lg font-bold text-[#F5EBDD] leading-snug cursor-pointer hover:text-[#D6A65B] transition-colors line-clamp-2"
              >
                ${prod.name}
              </h3>
              <p class="text-xs text-[#A49B91] mt-1.5 line-clamp-2 leading-relaxed">
                ${prod.description}
              </p>
            </div>

            <!-- Tags -->
            <div class="flex flex-wrap gap-1.5 mt-3">
              ${(prod.tags || []).slice(0, 2).map(tag => `
                <span class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#1B100D] text-[#A8B77A] border border-[#A8B77A]/20">
                  ${tag}
                </span>
              `).join('')}
            </div>

            <!-- Pricing and CTAs -->
            <div class="mt-5 pt-4 border-t border-[#D6A65B]/15 flex items-center justify-between gap-2">
              <div>
                <span class="font-mono text-xl sm:text-2xl font-bold text-[#D6A65B]">₹${prod.price}</span>
                ${prod.originalPrice ? `<span class="font-mono text-xs text-[#706860] line-through ml-1.5">₹${prod.originalPrice}</span>` : ''}
              </div>

              <div class="flex items-center gap-1.5">
                ${prod.inStock !== false ? `
                  <button 
                    onclick="addToCart('${prod.id}')"
                    class="btn-gold px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
                    aria-label="Add to cart"
                  >
                    <span>Bag</span>
                    <span class="text-sm">+</span>
                  </button>
                ` : `
                  <button 
                    disabled
                    class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-[#1b1816] text-[#706860] border border-[#2b2724] cursor-not-allowed"
                    title="Currently Sold Out"
                  >
                    Sold Out
                  </button>
                `}
                <button 
                  onclick="orderSingleItemWhatsApp('${prod.name}', ${prod.price})"
                  class="p-2 rounded-xl bg-[#1B100D] hover:bg-[#251511] text-[#A8B77A] border border-[#A8B77A]/30 transition-all hover:scale-105"
                  title="Direct WhatsApp Order"
                  aria-label="WhatsApp Order"
                >
                  💬
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;
  }).join('');

  if (typeof window.attach3DTiltListeners === 'function') {
    window.attach3DTiltListeners();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CART CONTROLLER & SUB-TOTAL LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function addToCart(productId) {
  const prod = TCJ_PRODUCTS.find(p => p.id === productId);
  if (!prod) return;

  if (prod.inStock === false) {
    showToast(`${prod.name} is currently sold out`);
    return;
  }

  const existing = state.cart.find(i => i.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ id: productId, quantity: 1 });
  }

  saveCart();
  updateCartUI();
  showToast(`Added ${prod.name} to your bag`);
}

function updateCartQuantity(productId, delta) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.id !== productId);
  }

  saveCart();
  updateCartUI();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  saveCart();
  updateCartUI();
  showToast('Item removed from bag');
}

function updateCartUI() {
  const countBadges = document.querySelectorAll('.cart-count-badge');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal-price');
  const deliveryEl = document.getElementById('cart-delivery-fee');
  const grandTotalEl = document.getElementById('cart-grand-total');
  const freeShippingBar = document.getElementById('free-shipping-progress');
  const freeShippingText = document.getElementById('free-shipping-text');
  const emptyState = document.getElementById('cart-empty-state');
  const footerEl = document.getElementById('cart-drawer-footer');

  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  countBadges.forEach(b => {
    b.textContent = totalItems;
    if (totalItems > 0) {
      b.classList.remove('hidden');
    } else {
      b.classList.add('hidden');
    }
  });

  if (!cartItemsContainer) return;

  if (state.cart.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (footerEl) footerEl.classList.add('hidden');
    cartItemsContainer.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (footerEl) footerEl.classList.remove('hidden');

  let subtotal = 0;

  cartItemsContainer.innerHTML = state.cart.map(item => {
    const prod = TCJ_PRODUCTS.find(p => p.id === item.id);
    if (!prod) return '';

    const lineTotal = prod.price * item.quantity;
    subtotal += lineTotal;

    return `
      <div class="flex items-center gap-3 p-3.5 rounded-xl bg-[#111111] border border-[#D6A65B]/15 mb-3">
        <img 
          src="${prod.image}" 
          alt="${prod.name}" 
          class="w-16 h-16 object-contain rounded-lg bg-[#080808] p-1 border border-[#D6A65B]/10 flex-shrink-0"
        />
        <div class="flex-grow min-w-0">
          <h4 class="font-editorial text-xs sm:text-sm font-bold text-[#F5EBDD] truncate leading-tight">${prod.name}</h4>
          <span class="text-[11px] text-[#A49B91]">${prod.weight} • ${prod.country}</span>
          <div class="font-mono text-xs font-bold text-[#D6A65B] mt-1">₹${prod.price}</div>
        </div>
        <div class="flex flex-col items-end gap-1 flex-shrink-0">
          <div class="flex items-center gap-1.5 bg-[#1B100D] px-2 py-1 rounded-lg border border-[#D6A65B]/20">
            <button onclick="updateCartQuantity('${item.id}', -1)" class="text-xs text-[#A49B91] hover:text-white px-1 font-bold">−</button>
            <span class="font-mono text-xs font-bold text-[#F5EBDD] px-1">${item.quantity}</span>
            <button onclick="updateCartQuantity('${item.id}', 1)" class="text-xs text-[#A49B91] hover:text-white px-1 font-bold">+</button>
          </div>
          <button onclick="removeFromCart('${item.id}')" class="text-[10px] text-[#706860] hover:text-rose-400 transition-colors mt-0.5">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join('');

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : FLAT_DELIVERY_FEE;
  const grandTotal = subtotal + deliveryFee;

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (deliveryEl) deliveryEl.textContent = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`;
  if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal}`;

  if (freeShippingBar && freeShippingText) {
    const pct = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));
    freeShippingBar.style.width = `${pct}%`;
    if (subtotal >= FREE_DELIVERY_THRESHOLD) {
      freeShippingText.innerHTML = `<span class="text-[#A8B77A] font-bold">✨ Unlocked FREE Ujjain Doorstep Delivery!</span>`;
    } else {
      const remaining = FREE_DELIVERY_THRESHOLD - subtotal;
      freeShippingText.innerHTML = `Add <span class="font-bold text-[#D6A65B]">₹${remaining}</span> more for <span class="text-[#A8B77A]">FREE Delivery</span> in Ujjain`;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WHATSAPP CHECKOUT GENERATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function checkoutWhatsApp() {
  if (state.cart.length === 0) {
    showToast('Your bag is currently empty');
    return;
  }

  let subtotal = 0;
  let itemsList = '';
  const orderItems = [];

  state.cart.forEach(item => {
    const prod = TCJ_PRODUCTS.find(p => p.id === item.id);
    if (prod) {
      const linePrice = prod.price * item.quantity;
      subtotal += linePrice;
      itemsList += `• ${item.quantity}x ${prod.name} (${prod.weight || ''}) — ₹${linePrice}\n`;
      orderItems.push({
        id: prod.id,
        title: prod.name,
        price: prod.price,
        quantity: item.quantity,
      });
    }
  });

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : FLAT_DELIVERY_FEE;
  const grandTotal = subtotal + deliveryFee;

  // Asynchronously log inquiry into TCJ Admin Tracker
  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'WhatsApp Patron',
        items: orderItems,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        total: grandTotal,
        source: 'Storefront Bag Checkout',
      }),
    }).catch(() => {});
  } catch (e) {}

  const message = 
    `*TCJ GOURMET STORE — ORDER REQUEST* 🍫📦\n` +
    `Hello Tapish! I would like to order the following from TCJ Ujjain:\n\n` +
    `*ITEMS ORDERED:*\n${itemsList}\n` +
    `*Subtotal:* ₹${subtotal}\n` +
    `*Ujjain Delivery:* ${deliveryFee === 0 ? 'FREE (Orders above ₹' + FREE_DELIVERY_THRESHOLD + ')' : '₹' + FLAT_DELIVERY_FEE}\n` +
    `*GRAND TOTAL:* ₹${grandTotal}\n\n` +
    `📍 *My Ujjain Delivery Address / Location:*\n` +
    `[Please type your complete address or share live location]\n\n` +
    `*Payment Mode:* UPI / Cash on Delivery`;

  const waUrl = `https://wa.me/${TCJ_PHONE}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

function orderSingleItemWhatsApp(productName, price) {
  // Asynchronously log 1-click inquiry into TCJ Admin Tracker
  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'WhatsApp Patron',
        items: [{ title: productName, price, quantity: 1 }],
        subtotal: price,
        deliveryFee: 0,
        total: price,
        source: 'Instant 1-Click WhatsApp',
      }),
    }).catch(() => {});
  } catch (e) {}

  const message = 
    `*TCJ GOURMET STORE — INSTANT REQUEST* 🍫✨\n` +
    `Hello Tapish! I'd like to order:\n` +
    `• 1x ${productName} (₹${price})\n\n` +
    `Please confirm instant availability & delivery time in Ujjain!`;

  const waUrl = `https://wa.me/${TCJ_PHONE}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRODUCT QUICK VIEW MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openProductModal(productId) {
  const prod = TCJ_PRODUCTS.find(p => p.id === productId);
  if (!prod) return;

  const modal = document.getElementById('product-modal');
  const body = document.getElementById('product-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div class="flex items-center justify-center p-8 bg-[#0c0b0a] rounded-2xl border border-[#D6A65B]/20">
        <img src="${prod.image}" alt="${prod.name}" class="max-h-64 w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]" />
      </div>

      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2.5 py-0.5 rounded-full bg-[#32180F] text-[#D6A65B] text-xs font-bold uppercase border border-[#D6A65B]/30">
            ${prod.badge}
          </span>
          <span class="text-xs text-[#A49B91] font-medium">${prod.country} • ${prod.weight}</span>
        </div>

        <h3 class="font-editorial text-xl sm:text-2xl font-bold text-[#F5EBDD] leading-tight">
          ${prod.name}
        </h3>

        <div class="flex items-center gap-2 my-2 text-xs font-semibold">
          <span class="text-[#D6A65B]">★★★★★</span>
          <span class="text-[#F5EBDD]">${prod.rating}</span>
          <span class="text-[#706860]">(${prod.reviewsCount}+ verified foodies)</span>
        </div>

        <p class="text-xs sm:text-sm text-[#A49B91] leading-relaxed my-3 font-normal">
          ${prod.description}
        </p>

        <!-- Tags -->
        <div class="flex flex-wrap gap-1.5 my-3">
          ${(prod.tags || []).map(t => `
            <span class="px-2.5 py-1 rounded-md bg-[#1B100D] text-[#A8B77A] text-[11px] font-medium border border-[#A8B77A]/20">
              ✓ ${t}
            </span>
          `).join('')}
        </div>

        <!-- Pricing & Action -->
        <div class="pt-4 border-t border-[#D6A65B]/15 flex items-center justify-between gap-3 mt-4">
          <div>
            <span class="font-mono text-2xl font-bold text-[#D6A65B]">₹${prod.price}</span>
            ${prod.originalPrice ? `<span class="font-mono text-sm text-[#706860] line-through ml-2">₹${prod.originalPrice}</span>` : ''}
          </div>

          <div class="flex items-center gap-2">
            <button 
              onclick="addToCart('${prod.id}'); closeProductModal();" 
              class="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold"
            >
              Add to Bag 🛒
            </button>
            <button 
              onclick="orderSingleItemWhatsApp('${prod.name}', ${prod.price})" 
              class="px-4 py-2.5 rounded-xl bg-[#1B100D] hover:bg-[#251511] text-[#A8B77A] font-bold text-xs border border-[#A8B77A]/30 transition-all"
            >
              WhatsApp 💬
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.classList.add('hidden');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DRAWERS & SEARCH CONTROLLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toggleCartDrawer(open) {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (!drawer || !backdrop) return;

  if (open) {
    backdrop.classList.remove('hidden');
    setTimeout(() => {
      drawer.classList.remove('translate-x-full');
      backdrop.classList.remove('opacity-0');
    }, 10);
  } else {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('opacity-0');
    setTimeout(() => backdrop.classList.add('hidden'), 300);
  }
}

function toggleNavDrawer(open) {
  const drawer = document.getElementById('nav-drawer');
  const backdrop = document.getElementById('nav-backdrop');
  if (!drawer || !backdrop) return;

  if (open) {
    backdrop.classList.remove('hidden');
    setTimeout(() => {
      drawer.classList.remove('-translate-x-full');
      backdrop.classList.remove('opacity-0');
    }, 10);
  } else {
    drawer.classList.add('-translate-x-full');
    backdrop.classList.add('opacity-0');
    setTimeout(() => backdrop.classList.add('hidden'), 300);
  }
}

function toggleSearch(open) {
  const modal = document.getElementById('search-modal');
  if (!modal) return;
  if (open) {
    modal.classList.remove('hidden');
    const input = document.getElementById('mobile-search-input');
    if (input) setTimeout(() => input.focus(), 100);
  } else {
    modal.classList.add('hidden');
  }
}

function handleSearch(val) {
  state.searchQuery = val;
  renderProducts();
}

function clearSearch() {
  state.searchQuery = '';
  const input = document.getElementById('mobile-search-input');
  if (input) input.value = '';
  renderProducts();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOAST NOTIFICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'bg-[#151312] text-[#F5EBDD] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 mb-2 transform translate-y-3 opacity-0 transition-all duration-300 border border-[#D6A65B]/30';
  toast.innerHTML = `<span class="text-[#D6A65B]">✨</span><span>${msg}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('translate-y-3', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORE HOURS & LIVE STATUS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function updateStoreStatus() {
  const badge = document.getElementById('store-status-badge');
  if (!badge) return;

  const now = new Date();
  const day = now.getDay(); // 0 is Sun, 1 is Mon
  const hours = now.getHours();
  const mins = now.getMinutes();
  const currentTime = hours + mins / 60;

  // Tue (2) to Sun (0) : 12:00 (12) to 22:30 (22.5). Mon (1) Closed
  const isOpen = (day !== 1) && (currentTime >= 12 && currentTime < 22.5);

  if (isOpen) {
    badge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
      <span class="w-2 h-2 rounded-full bg-emerald-500 absolute"></span>
      <span class="text-[#A8B77A] font-bold text-xs ml-3">Store Open Now • Delivers in 25–45 Mins</span>
    `;
  } else {
    badge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-amber-400"></span>
      <span class="text-[#D6A65B] font-bold text-xs">Opens at 12 PM • Pre-Orders Active</span>
    `;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIDEO AUDIO TOGGLE (HERO SECTION)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toggleHeroAudio() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('hero-video-desktop') 
    : document.getElementById('hero-video-mobile');
  const btn = document.getElementById('hero-sound-toggle-btn');
  if (!vid || !btn) return;

  vid.muted = !vid.muted;
  btn.innerHTML = vid.muted 
    ? `<span class="text-xs">🔇 Sound Muted</span>`
    : `<span class="text-xs text-[#D6A65B]">🔊 Sound On</span>`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIDEO CONTROLS (DRINKS SPECIAL SECTION)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toggleDrinksAudio() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('drinks-video-desktop') 
    : document.getElementById('drinks-video-mobile');
  const btn = document.getElementById('drinks-sound-toggle-btn');
  if (!vid || !btn) return;

  vid.muted = !vid.muted;
  btn.innerHTML = vid.muted 
    ? `<span class="text-xs">🔇 Sound Muted</span>`
    : `<span class="text-xs text-sky-400">🔊 Sound On</span>`;
}

function toggleDrinksPlay() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('drinks-video-desktop') 
    : document.getElementById('drinks-video-mobile');
  const btn = document.getElementById('drinks-play-toggle-btn');
  if (!vid || !btn) return;

  if (vid.paused) {
    vid.play();
    btn.innerHTML = `<span class="text-xs text-sky-400">⏸ Pause</span>`;
  } else {
    vid.pause();
    btn.innerHTML = `<span class="text-xs">▶ Play Video</span>`;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIDEO CONTROLS (SNACKS SPECIAL SECTION)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toggleSnacksAudio() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('snacks-video-desktop') 
    : document.getElementById('snacks-video-mobile');
  const btn = document.getElementById('snacks-sound-toggle-btn');
  if (!vid || !btn) return;

  vid.muted = !vid.muted;
  btn.innerHTML = vid.muted 
    ? `<span class="text-xs">🔇 Sound Muted</span>`
    : `<span class="text-xs text-orange-400">🔊 Sound On</span>`;
}

function toggleSnacksPlay() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('snacks-video-desktop') 
    : document.getElementById('snacks-video-mobile');
  const btn = document.getElementById('snacks-play-toggle-btn');
  if (!vid || !btn) return;

  if (vid.paused) {
    vid.play();
    btn.innerHTML = `<span class="text-xs text-orange-400">⏸ Pause</span>`;
  } else {
    vid.pause();
    btn.innerHTML = `<span class="text-xs">▶ Play Video</span>`;
  }
}

function toggleCandyAudio() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('candy-video-desktop') 
    : document.getElementById('candy-video-mobile');
  const btn = document.getElementById('candy-sound-toggle-btn');
  if (!vid || !btn) return;

  vid.muted = !vid.muted;
  btn.innerHTML = vid.muted 
    ? `<span class="text-xs">🔇 Sound Muted</span>` 
    : `<span class="text-xs text-pink-400">🔊 Sound On</span>`;
}

function toggleCandyPlay() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('candy-video-desktop') 
    : document.getElementById('candy-video-mobile');
  const btn = document.getElementById('candy-play-toggle-btn');
  if (!vid || !btn) return;

  if (vid.paused) {
    vid.play();
    btn.innerHTML = `<span class="text-xs text-pink-400">⏸ Pause</span>`;
  } else {
    vid.pause();
    btn.innerHTML = `<span class="text-xs">▶ Play Video</span>`;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THEME MANAGER (LUXURY LIGHT / DARK THEME)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initThemeManager() {
  let savedTheme = localStorage.getItem('tcj_theme');
  if (!savedTheme || savedTheme === 'light') {
    savedTheme = 'dark';
    try { localStorage.setItem('tcj_theme', 'dark'); } catch (e) {}
  }
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  if (isLight) {
    document.documentElement.classList.add('light-theme');
    document.body.classList.add('light-theme');
    document.body.classList.remove('bg-[#080808]', 'text-[#F5EBDD]');
    document.body.classList.add('bg-[#FAF8F5]', 'text-[#1A1615]');
  } else {
    document.documentElement.classList.remove('light-theme');
    document.body.classList.remove('light-theme');
    document.body.classList.remove('bg-[#FAF8F5]', 'text-[#1A1615]');
    document.body.classList.add('bg-[#080808]', 'text-[#F5EBDD]');
  }

  // Update theme toggle icons
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.textContent = isLight ? '🌙' : '☀️';
  }
  const mobIcon = document.getElementById('mobile-theme-icon');
  if (mobIcon) {
    mobIcon.textContent = isLight ? '🌙 Dark Mode' : '☀️ Light Mode';
  }

  try {
    localStorage.setItem('tcj_theme', theme);
  } catch (e) {}
}

function toggleTheme() {
  const isCurrentLight = document.documentElement.classList.contains('light-theme');
  const newTheme = isCurrentLight ? 'dark' : 'light';
  applyTheme(newTheme);
}


