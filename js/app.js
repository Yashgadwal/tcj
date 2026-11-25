/**
 * TCJ Gourmet Store - Client E-Commerce & Interactive Logic
 * Location: Ujjain, Madhya Pradesh | Founder: Tapish Verma
 * Hotline: +91 62683 44816 | Instagram: @theconveniencejunction
 */

const state = {
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  inStockOnly: false,
  cart: [],
  wishlist: [],
  customer: null,
  customerToken: localStorage.getItem('tcj_customer_token') || '',
  checkoutMode: 'guest',
  returnToCheckoutAfterAuth: false,
  customerOrders: []
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
  initCustomerAuth();
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
            ? 'bg-[#173c2d] text-white font-bold shadow-md shadow-[#173c2d]/20 scale-105' 
            : 'bg-[#fffdf8] text-[#574F47] hover:text-[#173c2d] hover:bg-[#f7f1e8] border border-[#eadcc8]'
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

  if (typeof renderProductsTableView === 'function') {
    renderProductsTableView();
  }
}

function setSortBy(val) {
  state.sortBy = val;
  renderProducts();
  if (typeof renderProductsTableView === 'function') {
    renderProductsTableView();
  }
}

function setInStockFilter(checked) {
  state.inStockOnly = Boolean(checked);
  renderProducts();
  if (typeof renderProductsTableView === 'function') {
    renderProductsTableView();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RENDER PRODUCTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderProducts() {
  const container = document.getElementById('products-grid');
  const countLabel = document.getElementById('products-count-label');
  if (!container || typeof TCJ_PRODUCTS === 'undefined') return;

  let filtered = [...TCJ_PRODUCTS];

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
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (p.variants && p.variants.some(v => v.name.toLowerCase().includes(q)))
    );
  }

  // Filter by stock
  if (state.inStockOnly) {
    filtered = filtered.filter(p => p.inStock !== false);
  }

  // Sorting
  if (state.sortBy === 'price-low') {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (state.sortBy === 'price-high') {
    filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (state.sortBy === 'rating') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (state.sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (countLabel) {
    countLabel.textContent = `Showing ${filtered.length} viral delicacies`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f7f1e8] border border-[#eadcc8] flex items-center justify-center text-[#173c2d]">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
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
    const hasVariants = prod.variants && prod.variants.length > 0;
    const defaultVariant = hasVariants ? prod.variants[0] : null;
    const currentPrice = defaultVariant ? defaultVariant.price : prod.price;
    const currentMRP = defaultVariant ? defaultVariant.mrp : prod.originalPrice;
    const currentImage = defaultVariant ? defaultVariant.image : prod.image;
    const currentWeight = defaultVariant ? (defaultVariant.weight || prod.weight) : prod.weight;

    return `
      <div class="product-card-3d card-3d-wrap" id="product-card-${prod.id}" data-product-id="${prod.id}" data-selected-variant="${defaultVariant ? defaultVariant.id : ''}">
        <div class="card-3d-inner group bg-white rounded-2xl border border-[#eadcc8] hover:border-[#b88a44] p-5 sm:p-6 flex flex-col justify-between h-full relative transition-all duration-300 shadow-xs hover:shadow-md">
          
          <!-- Top Badges & Origin -->
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              prod.inStock === false
                ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                : 'bg-[#173c2d]/10 text-[#173c2d] border border-[#173c2d]/20'
            }">
              ${prod.inStock === false ? 'Sold Out' : prod.badge}
            </span>
            <span class="text-[11px] font-semibold text-[#6b6b6b] flex items-center gap-1">
              ${prod.country}
            </span>
          </div>

          <!-- Product Image with Clean Ivory Surface -->
          <div 
            onclick="openProductModal('${prod.id}', document.getElementById('product-card-${prod.id}')?.dataset?.selectedVariant)"
            class="relative w-full aspect-square rounded-xl bg-[#fffdf8] border border-[#eadcc8]/60 overflow-hidden flex items-center justify-center p-4 cursor-pointer group-hover:border-[#b88a44]/50 transition-colors"
          >
            <img 
              src="${currentImage}" 
              alt="${prod.name}" 
              loading="lazy" 
              class="product-card-img max-h-full max-w-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300 ${prod.inStock === false ? 'grayscale opacity-60' : ''}" 
            />
          </div>

          <!-- Product Details -->
          <div class="mt-4 flex-grow flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="inline-flex items-center text-[#b88a44]"><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>
                <span class="text-[11px] font-semibold text-[#173c2d]">${prod.rating}</span>
                <span class="text-[11px] text-[#8c827a]">(${prod.reviewsCount})</span>
              </div>
              <h3 
                onclick="openProductModal('${prod.id}', document.getElementById('product-card-${prod.id}')?.dataset?.selectedVariant)"
                class="font-editorial text-base sm:text-lg font-bold text-[#173c2d] leading-snug cursor-pointer hover:text-[#b88a44] transition-colors line-clamp-2"
              >
                ${prod.name}
              </h3>
              <p class="text-xs text-[#6b6b6b] mt-1.5 line-clamp-2 leading-relaxed">
                ${prod.description}
              </p>

              <!-- Variants Selector Pills (Cards) -->
              ${hasVariants ? `
                <div class="mt-3 pt-2.5 border-t border-[#eadcc8]/60">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-[#b88a44]">Options (${prod.variants.length}):</span>
                    <span class="text-[10px] text-[#6b6b6b] font-medium card-variant-weight">${currentWeight || ''}</span>
                  </div>
                  <div class="card-variant-pills flex flex-wrap gap-1.5">
                    ${prod.variants.map((v, vIdx) => {
                      const isSelected = vIdx === 0;
                      return `
                        <button 
                          type="button"
                          onclick="selectCardVariant('${prod.id}', '${v.id}', this, event)"
                          data-variant-id="${v.id}"
                          data-price="${v.price}"
                          data-mrp="${v.mrp}"
                          data-image="${v.image}"
                          data-weight="${v.weight || ''}"
                          class="variant-pill text-[11px] px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-[#173c2d] text-white font-bold shadow-xs'
                              : 'bg-[#f7f1e8] text-[#574F47] hover:text-[#173c2d] hover:bg-[#eadcc8]/60 border border-[#eadcc8]'
                          }"
                        >
                          ${v.name}
                        </button>
                      `;
                    }).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Tags -->
            <div class="flex flex-wrap gap-1.5 mt-3">
              ${(prod.tags || []).slice(0, 2).map(tag => `
                <span class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#f7f1e8] text-[#173c2d] border border-[#eadcc8]">
                  ${tag}
                </span>
              `).join('')}
            </div>

            <!-- Pricing and CTAs -->
            <div class="mt-4 pt-3 border-t border-[#eadcc8]/60 flex items-center justify-between gap-2">
              <div class="flex items-baseline gap-1.5">
                <span class="product-card-price font-mono text-xl sm:text-2xl font-bold text-[#173c2d]">₹${currentPrice}</span>
                ${currentMRP ? `<span class="product-card-mrp font-mono text-xs text-[#8c827a] line-through ml-1.5">₹${currentMRP}</span>` : ''}
              </div>

              <div class="flex items-center gap-1.5">
                ${prod.inStock !== false ? `
                  <button 
                    onclick="buyNowSingleProduct('${prod.id}', '${defaultVariant ? defaultVariant.id : ''}')"
                    class="btn-card-buynow btn-green flex items-center justify-center gap-1 py-2 px-3 sm:px-3.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-md active:scale-95"
                    aria-label="Buy Now"
                    title="Buy Now with Instant Guest or VIP Member Checkout"
                  >
                    <span class="inline-flex items-center gap-1"><svg class="w-3.5 h-3.5 inline-block fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg><span>Buy Now</span></span>
                  </button>
                  <button 
                    onclick="addToCart('${prod.id}', 1, '${defaultVariant ? defaultVariant.id : ''}')"
                    class="btn-card-addbag btn-secondary flex items-center justify-center gap-1 py-2 px-2.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95"
                    title="Add to Shopping Bag"
                    aria-label="Add to cart"
                  >
                    <span class="inline-flex items-center gap-1"><svg class="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg><span>Bag</span></span>
                  </button>
                ` : `
                  <button 
                    disabled
                    class="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-[#f7f1e8] text-[#8c827a] border border-[#eadcc8] cursor-not-allowed"
                    title="Currently Sold Out"
                  >
                    Sold Out
                  </button>
                `}
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
// DYNAMIC CARD VARIANT PICKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function selectCardVariant(productId, variantId, btnEl, event) {
  if (event) {
    event.stopPropagation();
  }
  const prod = (typeof TCJ_PRODUCTS !== 'undefined' ? TCJ_PRODUCTS : []).find(p => p.id === productId);
  if (!prod || !prod.variants) return;

  const variant = prod.variants.find(v => v.id === variantId);
  if (!variant) return;

  const cardWrap = document.getElementById('product-card-' + productId) || (btnEl ? btnEl.closest('.product-card-3d') : null);
  if (!cardWrap) return;

  cardWrap.dataset.selectedVariant = variantId;

  const imgEl = cardWrap.querySelector('.product-card-img');
  if (imgEl && variant.image) {
    imgEl.src = variant.image;
  }

  const priceEl = cardWrap.querySelector('.product-card-price');
  if (priceEl && variant.price !== undefined) {
    priceEl.textContent = '₹' + variant.price;
  }

  const mrpEl = cardWrap.querySelector('.product-card-mrp');
  if (mrpEl && variant.mrp) {
    mrpEl.textContent = '₹' + variant.mrp;
  }

  const weightEl = cardWrap.querySelector('.card-variant-weight');
  if (weightEl) {
    weightEl.textContent = variant.weight || prod.weight || '';
  }

  const buyBtn = cardWrap.querySelector('.btn-card-buynow');
  if (buyBtn) {
    buyBtn.setAttribute('onclick', `buyNowSingleProduct('${productId}', '${variantId}')`);
  }

  const bagBtn = cardWrap.querySelector('.btn-card-addbag');
  if (bagBtn) {
    bagBtn.setAttribute('onclick', `addToCart('${productId}', 1, '${variantId}')`);
  }

  const pillContainer = cardWrap.querySelector('.card-variant-pills');
  if (pillContainer) {
    pillContainer.querySelectorAll('.variant-pill').forEach(p => {
      p.className = 'variant-pill text-[11px] px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer bg-[#f7f1e8] text-[#574F47] hover:text-[#173c2d] hover:bg-[#eadcc8]/60 border border-[#eadcc8]';
    });
    if (btnEl) {
      btnEl.className = 'variant-pill text-[11px] px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer bg-[#173c2d] text-white font-bold shadow-xs';
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INSTANT BUY NOW (DIRECT TO DUAL CHECKOUT MODAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buyNowSingleProduct(productId, variantId) {
  const prod = (typeof TCJ_PRODUCTS !== 'undefined' ? TCJ_PRODUCTS : []).find(p => p.id === productId);
  if (!prod) {
    showToast('Product not found in catalog');
    return;
  }

  if (prod.inStock === false) {
    showToast(`${prod.name} is currently sold out`);
    return;
  }

  // Resolve variant if not supplied
  if (!variantId && prod.variants && prod.variants.length > 0) {
    const card = document.getElementById('product-card-' + productId);
    variantId = (card && card.dataset.selectedVariant) || prod.defaultVariantId || prod.variants[0].id;
  }

  // Add or increment item in cart keyed by variant
  addToCart(productId, 1, variantId, true);

  // Close overlays
  closeProductModal();
  toggleCartDrawer(false);

  // Directly open dual checkout modal
  openCheckoutModal();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CART CONTROLLER & SUB-TOTAL LOGIC (WITH VARIANTS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function addToCart(productId, quantity = 1, variantId = null, skipToast = false) {
  const prod = (typeof TCJ_PRODUCTS !== 'undefined' ? TCJ_PRODUCTS : []).find(p => p.id === productId);
  if (!prod) return;

  if (prod.inStock === false) {
    showToast(`${prod.name} is currently sold out`);
    return;
  }

  // Resolve variant if not supplied
  if (!variantId && prod.variants && prod.variants.length > 0) {
    const card = document.getElementById('product-card-' + productId);
    variantId = (card && card.dataset.selectedVariant) || prod.defaultVariantId || prod.variants[0].id;
  }

  const itemKey = variantId ? `${productId}__${variantId}` : productId;
  const existing = state.cart.find(i => (i.key || (i.variantId ? `${i.id}__${i.variantId}` : i.id)) === itemKey);

  const addQty = Number(quantity) || 1;
  if (existing) {
    existing.quantity += addQty;
  } else {
    state.cart.push({
      key: itemKey,
      id: productId,
      variantId: variantId || null,
      quantity: addQty
    });
  }

  saveCart();
  updateCartUI();

  if (!skipToast) {
    const variantObj = (prod.variants && variantId) ? prod.variants.find(v => v.id === variantId) : null;
    const variantLabel = variantObj ? ` (${variantObj.name})` : '';
    showToast(`Added ${prod.name}${variantLabel} to your bag`);
  }
}

function updateCartQuantity(itemKey, delta) {
  const item = state.cart.find(i => (i.key || (i.variantId ? `${i.id}__${i.variantId}` : i.id)) === itemKey);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => (i.key || (i.variantId ? `${i.id}__${i.variantId}` : i.id)) !== itemKey);
  }

  saveCart();
  updateCartUI();
}

function removeFromCart(itemKey) {
  state.cart = state.cart.filter(i => (i.key || (i.variantId ? `${i.id}__${i.variantId}` : i.id)) !== itemKey);
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
    const prod = (typeof TCJ_PRODUCTS !== 'undefined' ? TCJ_PRODUCTS : []).find(p => p.id === item.id);
    if (!prod) return '';

    const variant = (prod.variants && item.variantId) 
      ? prod.variants.find(v => v.id === item.variantId) 
      : null;

    const itemPrice = variant ? variant.price : prod.price;
    const itemImage = (variant && variant.image) ? variant.image : prod.image;
    const itemWeight = (variant && variant.weight) ? variant.weight : prod.weight;
    const itemKey = item.key || (item.variantId ? `${item.id}__${item.variantId}` : item.id);
    const lineTotal = itemPrice * item.quantity;
    subtotal += lineTotal;

    return `
      <div class="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-[#eadcc8] mb-3 shadow-xs">
        <img 
          src="${itemImage}" 
          alt="${prod.name}" 
          class="w-16 h-16 object-contain rounded-lg bg-[#fffdf8] p-1 border border-[#eadcc8]/60 flex-shrink-0"
        />
        <div class="flex-grow min-w-0">
          <h4 class="font-editorial text-xs sm:text-sm font-bold text-[#173c2d] truncate leading-tight">${prod.name}</h4>
          ${variant ? `<span class="inline-block text-[11px] font-semibold text-[#b88a44]">${variant.name}</span>` : ''}
          <div class="text-[11px] text-[#6b6b6b]">${itemWeight ? itemWeight + ' • ' : ''}${prod.country}</div>
          <div class="font-mono text-xs font-bold text-[#173c2d] mt-1">₹${itemPrice}</div>
        </div>
        <div class="flex flex-col items-end gap-1 flex-shrink-0">
          <div class="flex items-center gap-1.5 bg-[#f7f1e8] px-2 py-1 rounded-lg border border-[#eadcc8]">
            <button onclick="updateCartQuantity('${itemKey}', -1)" class="text-xs text-[#173c2d] hover:text-[#b88a44] px-1 font-bold">−</button>
            <span class="font-mono text-xs font-bold text-[#173c2d] px-1">${item.quantity}</span>
            <button onclick="updateCartQuantity('${itemKey}', 1)" class="text-xs text-[#173c2d] hover:text-[#b88a44] px-1 font-bold">+</button>
          </div>
          <button onclick="removeFromCart('${itemKey}')" class="text-[10px] text-[#8c827a] hover:text-rose-500 transition-colors mt-0.5 font-medium">
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
      freeShippingText.innerHTML = `<span class="text-[#A8B77A] font-bold inline-flex items-center gap-1.5"><svg class="w-3.5 h-3.5 text-[#b88a44] inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg><span>Unlocked FREE Ujjain Doorstep Delivery!</span></span>`;
    } else {
      const remaining = FREE_DELIVERY_THRESHOLD - subtotal;
      freeShippingText.innerHTML = `Add <span class="font-bold text-[#b88a44]">₹${remaining}</span> more for <span class="text-[#A8B77A]">FREE Delivery</span> in Ujjain`;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CUSTOMER AUTHENTICATION (VIP CLUB & PROFILE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function initCustomerAuth() {
  const token = state.customerToken;
  if (!token) {
    renderAccountButton();
    return;
  }

  try {
    const res = await fetch('/api/customer/me', {
      headers: { 'x-customer-token': token }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.customer) {
        state.customer = data.customer;
      }
    } else {
      state.customer = null;
      state.customerToken = '';
      localStorage.removeItem('tcj_customer_token');
    }
  } catch (e) {
    // Offline or network error
  }
  renderAccountButton();
}

function renderAccountButton() {
  const btn = document.getElementById('account-btn');
  const icon = document.getElementById('account-btn-icon');
  const label = document.getElementById('account-btn-label');
  if (!btn || !icon || !label) return;

  if (state.customer) {
    const firstName = state.customer.name.split(' ')[0] || 'VIP';
    icon.innerHTML = '<svg class="w-4 h-4 inline-block text-[#b88a44]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7l4 4 5-7 5 7 4-4v11H3V7z"/><line x1="3" y1="21" x2="21" y2="21"/></svg>';
    label.textContent = `Hi, ${firstName}`;
    btn.classList.add('border-[#b88a44]', 'bg-[#f7f1e8]');
  } else {
    icon.innerHTML = '<svg class="w-4 h-4 inline-block text-[#b88a44]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>';
    label.textContent = 'VIP / Sign In';
    btn.classList.remove('border-[#b88a44]', 'bg-[#f7f1e8]');
  }
}

function handleAccountClick() {
  if (state.customer) {
    toggleAccountDrawer(true);
    loadCustomerOrders();
  } else {
    toggleCustomerAuthModal(true);
  }
}

function toggleCustomerAuthModal(open) {
  const modal = document.getElementById('customer-auth-modal');
  if (!modal) return;
  if (open) {
    modal.classList.remove('hidden');
    switchAuthTab('login');
  } else {
    modal.classList.add('hidden');
  }
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const formLogin = document.getElementById('customer-login-form');
  const formSignup = document.getElementById('customer-signup-form');
  const title = document.getElementById('auth-modal-title');
  if (!tabLogin || !tabSignup || !formLogin || !formSignup) return;

  if (tab === 'login') {
    tabLogin.className = 'py-2 text-xs font-bold rounded-lg transition-all text-[#fffdf8] bg-[#173c2d] shadow-sm';
    tabSignup.className = 'py-2 text-xs font-bold rounded-lg transition-all text-[#6b6b6b] hover:text-[#173c2d]';
    formLogin.classList.remove('hidden');
    formSignup.classList.add('hidden');
    if (title) title.textContent = 'Welcome Back to TCJ';
  } else {
    tabSignup.className = 'py-2 text-xs font-bold rounded-lg transition-all text-[#fffdf8] bg-[#173c2d] shadow-sm';
    tabLogin.className = 'py-2 text-xs font-bold rounded-lg transition-all text-[#6b6b6b] hover:text-[#173c2d]';
    formSignup.classList.remove('hidden');
    formLogin.classList.add('hidden');
    if (title) title.textContent = 'Join the VIP Gourmet Club';
  }
}

async function handleCustomerLoginSubmit(e) {
  e.preventDefault();
  const idInput = document.getElementById('login-identifier');
  const pwdInput = document.getElementById('login-password');
  const errBox = document.getElementById('login-form-error');
  const submitBtn = document.getElementById('btn-login-submit');

  const identifier = idInput.value.trim();
  const password = pwdInput.value.trim();
  if (!identifier || !password) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';
  if (errBox) errBox.classList.add('hidden');

  try {
    const res = await fetch('/api/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sign in');

    state.customer = data.customer;
    state.customerToken = data.token;
    localStorage.setItem('tcj_customer_token', data.token);

    toggleCustomerAuthModal(false);
    renderAccountButton();
    showToast(`Welcome back, ${data.customer.name}!`);

    // If customer was trying to checkout, resume checkout flow
    if (state.returnToCheckoutAfterAuth) {
      state.returnToCheckoutAfterAuth = false;
      openCheckoutModal();
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In to VIP Account';
  }
}

async function handleCustomerSignupSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const phone = document.getElementById('signup-phone').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  const address = document.getElementById('signup-address').value.trim();
  const locality = document.getElementById('signup-locality').value;
  const landmark = document.getElementById('signup-landmark').value.trim();
  const errBox = document.getElementById('signup-form-error');
  const submitBtn = document.getElementById('btn-signup-submit');

  if (!name || !phone || !password || !address) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Account...';
  if (errBox) errBox.classList.add('hidden');

  try {
    const res = await fetch('/api/customer/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, password, address, locality, landmark })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    state.customer = data.customer;
    state.customerToken = data.token;
    localStorage.setItem('tcj_customer_token', data.token);

    toggleCustomerAuthModal(false);
    renderAccountButton();
    showToast(`Welcome to TCJ VIP Club, ${data.customer.name}!`);

    if (state.returnToCheckoutAfterAuth) {
      state.returnToCheckoutAfterAuth = false;
      openCheckoutModal();
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create VIP Account & Save Address';
  }
}

function continueAsGuestFromAuth() {
  toggleCustomerAuthModal(false);
  state.returnToCheckoutAfterAuth = false;
  if (state.cart.length > 0) {
    openCheckoutModal();
    selectCheckoutMode('guest');
  } else {
    showToast('Add a treat to your bag first or tap Buy Now on any product!');
  }
}

function handleCustomerLogout() {
  fetch('/api/customer/logout', {
    method: 'POST',
    headers: { 'x-customer-token': state.customerToken }
  }).catch(() => {});

  state.customer = null;
  state.customerToken = '';
  localStorage.removeItem('tcj_customer_token');
  toggleAccountDrawer(false);
  renderAccountButton();
  showToast('Signed out of VIP account');
}

function toggleAccountDrawer(open) {
  const drawer = document.getElementById('account-drawer');
  const backdrop = document.getElementById('account-backdrop');
  if (!drawer || !backdrop) return;

  if (open) {
    if (state.customer) {
      const nameEl = document.getElementById('drawer-cust-name');
      const phoneEl = document.getElementById('drawer-cust-phone');
      const addrCard = document.getElementById('drawer-address-card');
      if (nameEl) nameEl.textContent = state.customer.name;
      if (phoneEl) phoneEl.textContent = `+91 ${state.customer.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}`;
      if (addrCard) {
        const defAddr = (state.customer.addresses && state.customer.addresses[0]);
        if (defAddr) {
          addrCard.innerHTML = `
            <div class="font-semibold text-[#b88a44] flex items-center gap-1.5">
              <span class="inline-flex"><svg class="w-4 h-4 text-[#b88a44] inline-block" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span><span>${defAddr.label || 'Home'} (${defAddr.locality || 'Freeganj'})</span>
            </div>
            <div class="text-[#1a1a1a] mt-0.5">${defAddr.street || ''}</div>
            ${defAddr.landmark ? `<div class="text-[#6b6b6b] text-[11px]">Landmark: Near ${defAddr.landmark}</div>` : ''}
          `;
        } else {
          addrCard.innerHTML = `<span class="text-[#8c827a]">No address saved yet.</span>`;
        }
      }
    }

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

async function loadCustomerOrders() {
  const container = document.getElementById('drawer-orders-list');
  const countEl = document.getElementById('drawer-orders-count');
  if (!container) return;

  if (!state.customerToken) {
    container.innerHTML = `<div class="py-6 text-center text-xs text-[#8c827a]">Please sign in to view past orders.</div>`;
    return;
  }

  container.innerHTML = `<div class="py-6 text-center text-xs text-[#574F47]">Loading your gourmet orders...</div>`;

  try {
    const res = await fetch('/api/customer/orders', {
      headers: { 'x-customer-token': state.customerToken }
    });
    if (!res.ok) throw new Error('Failed to load orders');
    const data = await res.json();
    const orders = data.orders || [];
    state.customerOrders = orders;

    if (countEl) countEl.textContent = `${orders.length} Orders`;

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="py-8 text-center text-xs text-[#8c827a] border border-[#eadcc8] rounded-xl bg-[#fffdf8] p-4">
          <svg class="w-8 h-8 text-[#b88a44] mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          No orders logged yet. Check out viral snacks from the collection!
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(ord => {
      const items = ord.items || [];
      const waLink = `https://wa.me/${TCJ_PHONE}?text=${encodeURIComponent(
        `Hello Tapish! I'd like an update on my TCJ order #${ord.id}.`
      )}`;

      const statusBadgeClass = ord.status === 'Delivered' 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : ord.status === 'Dispatched'
        ? 'bg-purple-50 text-purple-700 border-purple-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

      return `
        <div class="p-3.5 rounded-xl bg-white border border-[#eadcc8] space-y-2 text-xs shadow-xs">
          <div class="flex items-center justify-between">
            <span class="font-mono font-bold text-[#b88a44]">${ord.id}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full border ${statusBadgeClass}">${ord.status || 'Pending'}</span>
          </div>
          <div class="text-[11px] text-[#574F47]">
            ${items.map(it => `${it.quantity}x ${it.title}`).join(', ')}
          </div>
          <div class="pt-2 border-t border-[#eadcc8] flex items-center justify-between">
            <span class="font-mono font-bold text-[#173c2d]">₹${ord.total}</span>
            <a href="${waLink}" target="_blank" class="text-[11px] text-[#173c2d] hover:text-[#b88a44] font-semibold flex items-center gap-1">
              <span class="inline-flex items-center gap-1.5"><span>Track via WhatsApp</span><svg class="w-4 h-4 inline-block fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg></span>
            </a>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div class="py-4 text-center text-xs text-rose-600">Failed to load order history.</div>`;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DUAL CHECKOUT CONTROLLER (GUEST VS VIP MEMBER)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Your bag is currently empty');
    return;
  }

  // Calculate pricing
  let subtotal = 0;
  state.cart.forEach(item => {
    const prod = TCJ_PRODUCTS.find(p => p.id === item.id);
    if (prod) subtotal += (prod.price * item.quantity);
  });
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : FLAT_DELIVERY_FEE;
  const grandTotal = subtotal + deliveryFee;

  // Update modal figures
  const countLabel = document.getElementById('checkout-choice-count');
  const choiceTotal = document.getElementById('checkout-choice-total');
  const formSub = document.getElementById('form-subtotal');
  const formFee = document.getElementById('form-delivery-fee');
  const formGrand = document.getElementById('form-grand-total');

  if (countLabel) countLabel.textContent = `${state.cart.reduce((s, i) => s + i.quantity, 0)} items`;
  if (choiceTotal) choiceTotal.textContent = `₹${grandTotal}`;
  if (formSub) formSub.textContent = `₹${subtotal}`;
  if (formFee) formFee.textContent = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`;
  if (formGrand) formGrand.textContent = `₹${grandTotal}`;

  // If already logged in: bypass choice screen and directly open member checkout form
  const modal = document.getElementById('checkout-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  if (state.customer) {
    selectCheckoutMode('member');
  } else {
    // Show choice view
    const choiceView = document.getElementById('checkout-choice-view');
    const formView = document.getElementById('checkout-form-view');
    if (choiceView) choiceView.classList.remove('hidden');
    if (formView) formView.classList.add('hidden');
  }
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.classList.add('hidden');
}

function selectCheckoutMode(mode) {
  state.checkoutMode = mode;
  const choiceView = document.getElementById('checkout-choice-view');
  const formView = document.getElementById('checkout-form-view');
  const badgeMode = document.getElementById('checkout-badge-mode');
  const memberContainer = document.getElementById('member-saved-address-container');
  const btnBack = document.getElementById('btn-back-to-choice');

  const nameInput = document.getElementById('order-cust-name');
  const phoneInput = document.getElementById('order-cust-phone');

  if (mode === 'member') {
    if (!state.customer) {
      // Prompt sign in first
      state.returnToCheckoutAfterAuth = true;
      closeCheckoutModal();
      toggleCustomerAuthModal(true);
      return;
    }

    if (badgeMode) {
      badgeMode.textContent = 'VIP Member Checkout';
      badgeMode.className = 'text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#b88a44]/20 text-[#b88a44] border border-[#b88a44]/40';
    }

    if (memberContainer) {
      memberContainer.classList.remove('hidden');
      const nameTag = document.getElementById('member-name-tag');
      if (nameTag) nameTag.textContent = state.customer.name;

      const sel = document.getElementById('member-address-select');
      if (sel) {
        const addrs = state.customer.addresses || [];
        if (addrs.length > 0) {
          sel.innerHTML = addrs.map((a, idx) => `
            <option value="${idx}">${a.label || 'Home'} - ${a.street}, ${a.locality}</option>
          `).join('');
          handleSavedAddressSelect(0);
        } else {
          sel.innerHTML = `<option value="-1">Enter New Delivery Address</option>`;
        }
      }
    }

    if (nameInput) nameInput.value = state.customer.name || '';
    if (phoneInput) phoneInput.value = state.customer.phone || '';

  } else {
    // Guest Mode
    if (badgeMode) {
      badgeMode.textContent = 'Guest Checkout (No Login)';
      badgeMode.className = 'text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30';
    }
    if (memberContainer) memberContainer.classList.add('hidden');
  }

  if (choiceView) choiceView.classList.add('hidden');
  if (formView) formView.classList.remove('hidden');
  if (btnBack) btnBack.classList.toggle('hidden', Boolean(state.customer));
}

function handleSavedAddressSelect(index) {
  if (!state.customer || !state.customer.addresses) return;
  const idx = Number(index);
  const addr = state.customer.addresses[idx];
  if (!addr) return;

  const streetInput = document.getElementById('order-cust-street');
  const localityInput = document.getElementById('order-cust-locality');
  const landmarkInput = document.getElementById('order-cust-landmark');

  if (streetInput) streetInput.value = addr.street || '';
  if (landmarkInput) landmarkInput.value = addr.landmark || '';
  if (localityInput && addr.locality) localityInput.value = addr.locality;
}

function backToCheckoutChoice() {
  const choiceView = document.getElementById('checkout-choice-view');
  const formView = document.getElementById('checkout-form-view');
  if (choiceView) choiceView.classList.remove('hidden');
  if (formView) formView.classList.add('hidden');
}

async function handleCheckoutFormSubmit(e) {
  e.preventDefault();
  if (state.cart.length === 0) return;

  const nameInput = document.getElementById('order-cust-name');
  const phoneInput = document.getElementById('order-cust-phone');
  const streetInput = document.getElementById('order-cust-street');
  const localityInput = document.getElementById('order-cust-locality');
  const landmarkInput = document.getElementById('order-cust-landmark');
  const notesInput = document.getElementById('order-cust-notes');
  const submitBtn = document.getElementById('btn-submit-order');

  const name = nameInput.value.trim();
  const rawPhone = phoneInput.value.trim().replace(/\D/g, '').slice(-10);
  const street = streetInput.value.trim();
  const locality = localityInput.value;
  const landmark = landmarkInput.value.trim();
  const notes = notesInput.value.trim();

  const paymentRadio = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentRadio ? paymentRadio.value : 'UPI on Delivery';

  if (!name || rawPhone.length < 10 || !street) {
    showToast('Please provide your name, 10-digit WhatsApp phone, and address');
    return;
  }

  // Calculate totals
  let subtotal = 0;
  let itemsList = '';
  const orderItems = [];

  state.cart.forEach(item => {
    const prod = (typeof TCJ_PRODUCTS !== 'undefined' ? TCJ_PRODUCTS : []).find(p => p.id === item.id);
    if (prod) {
      const variant = (prod.variants && item.variantId) ? prod.variants.find(v => v.id === item.variantId) : null;
      const itemPrice = variant ? variant.price : prod.price;
      const itemWeight = (variant && variant.weight) ? variant.weight : (prod.weight || '');
      const variantName = variant ? variant.name : '';
      const linePrice = itemPrice * item.quantity;
      subtotal += linePrice;

      const variantDisplay = variantName ? ` (${variantName})` : '';
      itemsList += `• ${item.quantity}x ${prod.name}${variantDisplay}${itemWeight ? ' [' + itemWeight + ']' : ''} — ₹${linePrice}\n`;
      orderItems.push({
        id: prod.id,
        variantId: item.variantId || null,
        variantName: variantName || null,
        title: prod.name + (variantName ? ` - ${variantName}` : ''),
        price: itemPrice,
        quantity: item.quantity,
        weight: itemWeight
      });
    }
  });

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : FLAT_DELIVERY_FEE;
  const grandTotal = subtotal + deliveryFee;
  const fullAddress = `${street}${landmark ? ', Near ' + landmark : ''}, ${locality}, Ujjain`;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="animate-spin mr-2">◌</span> Preparing Order...`;

  try {
    const orderPayload = {
      customerName: name,
      phone: rawPhone,
      address: fullAddress,
      addressDetails: {
        street,
        locality,
        landmark,
        fullAddress
      },
      items: orderItems,
      subtotal,
      deliveryFee,
      total: grandTotal,
      paymentMethod,
      isGuest: state.checkoutMode === 'guest',
      customerId: state.customer ? state.customer.id : null,
      notes: notes,
      source: state.checkoutMode === 'guest' ? 'Guest Checkout (No Login)' : 'VIP Member Checkout'
    };

    const headers = { 'Content-Type': 'application/json' };
    if (state.customerToken) headers['x-customer-token'] = state.customerToken;

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(orderPayload)
    });
    const data = await res.json();
    const orderId = (data.order && data.order.id) || ('TCJ-ORD-' + Date.now().toString().slice(-4));

    // Clear cart
    state.cart = [];
    saveCart();
    updateCartUI();
    closeCheckoutModal();
    toggleCartDrawer(false);

    // Format WhatsApp message
    const waMessage = 
      `*TCJ GOURMET STORE — NEW ORDER*\n` +
      `*Order ID:* #${orderId}\n` +
      `*Customer:* ${name} (+91 ${rawPhone})\n` +
      `*Checkout Type:* ${state.checkoutMode === 'guest' ? 'Guest Checkout' : 'VIP Club Member'}\n\n` +
      `*ITEMS ORDERED:*\n${itemsList}\n` +
      `*Subtotal:* ₹${subtotal}\n` +
      `*Ujjain Delivery:* ${deliveryFee === 0 ? 'FREE (Orders above ₹' + FREE_DELIVERY_THRESHOLD + ')' : '₹' + FLAT_DELIVERY_FEE}\n` +
      `*GRAND TOTAL:* ₹${grandTotal}\n\n` +
      `*DELIVERY ADDRESS (UJJAIN):*\n` +
      `${fullAddress}\n` +
      (notes ? `*Delivery Instructions:* "${notes}"\n` : '') +
      `*Payment Mode:* ${paymentMethod}\n\n` +
      `Please confirm my doorstep delivery (25–45 mins)!`;

    const waUrl = `https://wa.me/${TCJ_PHONE}?text=${encodeURIComponent(waMessage)}`;

    // Show order success modal
    const succModal = document.getElementById('order-success-modal');
    const succId = document.getElementById('success-order-id');
    const succTotal = document.getElementById('success-order-total');
    const succAddr = document.getElementById('success-order-address');
    const succLink = document.getElementById('success-whatsapp-link');

    if (succId) succId.textContent = orderId;
    if (succTotal) succTotal.textContent = `₹${grandTotal} (${paymentMethod})`;
    if (succAddr) succAddr.textContent = fullAddress;
    if (succLink) succLink.href = waUrl;

    if (succModal) succModal.classList.remove('hidden');

    // Automatically trigger WhatsApp window
    window.open(waUrl, '_blank');

    showToast(`Order #${orderId} confirmed!`, 'success');

  } catch (err) {
    showToast('Order creation failed: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span class="inline-flex items-center gap-2"><span>CONFIRM &amp; ORDER ON WHATSAPP</span><svg class="w-4 h-4 inline-block fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg></span>`;
  }
}

function closeOrderSuccessModal() {
  const modal = document.getElementById('order-success-modal');
  if (modal) modal.classList.add('hidden');
}

function openAccountFromSuccess() {
  closeOrderSuccessModal();
  if (state.customer) {
    toggleAccountDrawer(true);
    loadCustomerOrders();
  } else {
    toggleCustomerAuthModal(true);
  }
}

function orderSingleItemWhatsApp(productName, price, variantName = '') {
  // Asynchronously log 1-click inquiry into TCJ Admin Tracker
  const displayTitle = productName + (variantName ? ` (${variantName})` : '');
  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: state.customer ? state.customer.name : 'WhatsApp Patron',
        customerId: state.customer ? state.customer.id : null,
        phone: state.customer ? state.customer.phone : '',
        address: state.customer && state.customer.addresses && state.customer.addresses[0] ? state.customer.addresses[0].street + ', ' + state.customer.addresses[0].locality + ', Ujjain' : 'Instant 1-Click Inquiry',
        items: [{ title: displayTitle, price, quantity: 1, variantName: variantName || null }],
        subtotal: price,
        deliveryFee: 0,
        total: price,
        source: 'Instant 1-Click WhatsApp',
      }),
    }).catch(() => {});
  } catch (e) {}

  const message = 
    `*TCJ GOURMET STORE — INSTANT REQUEST*\n` +
    `Hello Tapish! I'd like to order:\n` +
    `• 1x ${displayTitle} (₹${price})\n\n` +
    (state.customer ? `*Customer:* ${state.customer.name} (VIP Member)\n` : '') +
    `Please confirm instant availability & delivery time in Ujjain!`;

  const waUrl = `https://wa.me/${TCJ_PHONE}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRODUCT QUICK VIEW MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openProductModal(productId, selectedVariantId = null) {
  const prod = (typeof TCJ_PRODUCTS !== 'undefined' ? TCJ_PRODUCTS : []).find(p => p.id === productId);
  if (!prod) return;

  const modal = document.getElementById('product-modal');
  const body = document.getElementById('product-modal-body');
  if (!modal || !body) return;

  const hasVariants = prod.variants && prod.variants.length > 0;
  const activeVariant = hasVariants 
    ? ((selectedVariantId && prod.variants.find(v => v.id === selectedVariantId)) || prod.variants[0])
    : null;

  const currentPrice = activeVariant ? activeVariant.price : prod.price;
  const currentMRP = activeVariant ? activeVariant.mrp : prod.originalPrice;
  const currentImage = activeVariant ? activeVariant.image : prod.image;
  const currentWeight = activeVariant ? (activeVariant.weight || prod.weight) : prod.weight;

  body.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div class="flex items-center justify-center p-8 bg-[#fffdf8] rounded-2xl border border-[#eadcc8]/60">
        <img id="modal-product-img" src="${currentImage}" alt="${prod.name}" class="max-h-64 w-auto object-contain drop-shadow-md" />
      </div>

      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="px-2.5 py-0.5 rounded-full bg-[#173c2d]/10 text-[#173c2d] text-xs font-bold uppercase border border-[#173c2d]/20">
            ${prod.badge}
          </span>
          <span id="modal-product-weight" class="text-xs text-[#6b6b6b] font-medium">${prod.country}${currentWeight ? ' • ' + currentWeight : ''}</span>
        </div>

        <h3 class="font-editorial text-xl sm:text-2xl font-bold text-[#173c2d] leading-tight">
          ${prod.name}
        </h3>

        <div class="flex items-center gap-2 my-2 text-xs font-semibold">
          <span class="inline-flex items-center text-[#b88a44]"><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></span>
          <span class="text-[#173c2d]">${prod.rating}</span>
          <span class="text-[#8c827a]">(${prod.reviewsCount}+ verified foodies)</span>
        </div>

        <p class="text-xs sm:text-sm text-[#574F47] leading-relaxed my-3 font-normal">
          ${prod.description}
        </p>

        <!-- Variants Selector (Modal) -->
        ${hasVariants ? `
          <div class="my-3 pt-3 border-t border-[#eadcc8]/60">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-[#b88a44]">Select Flavor / Option:</span>
              <span id="modal-variant-name-badge" class="text-xs font-semibold text-[#173c2d]">${activeVariant.name}</span>
            </div>
            <div id="modal-variant-options" class="flex flex-wrap gap-2">
              ${prod.variants.map(v => {
                const isSelected = v.id === activeVariant.id;
                return `
                  <button
                    type="button"
                    onclick="selectModalVariant('${prod.id}', '${v.id}', this)"
                    data-variant-id="${v.id}"
                    class="modal-variant-btn px-3 py-1.5 rounded-xl text-xs transition-all ${
                      isSelected
                        ? 'bg-[#173c2d] text-white font-bold shadow-sm ring-2 ring-[#b88a44]/50'
                        : 'bg-[#f7f1e8] text-[#574F47] hover:text-[#173c2d] border border-[#eadcc8]'
                    }"
                  >
                    ${v.name}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Tags -->
        <div class="flex flex-wrap gap-1.5 my-3">
          ${(prod.tags || []).map(t => `
            <span class="px-2.5 py-1 rounded-md bg-[#f7f1e8] text-[#173c2d] text-[11px] font-medium border border-[#eadcc8]">
              <span class="inline-flex items-center mr-1"><svg class="w-3.5 h-3.5 inline-block text-emerald-600 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>${t}
            </span>
          `).join('')}
        </div>

        <!-- Pricing & Action -->
        <div class="pt-4 border-t border-[#eadcc8]/60 flex items-center justify-between gap-3 mt-4">
          <div class="flex items-baseline gap-1.5">
            <span id="modal-product-price" class="font-mono text-2xl font-bold text-[#173c2d]">₹${currentPrice}</span>
            ${currentMRP ? `<span id="modal-product-mrp" class="font-mono text-sm text-[#8c827a] line-through ml-2">₹${currentMRP}</span>` : ''}
          </div>

          <div class="flex items-center gap-2">
            <button 
              id="modal-btn-buynow"
              onclick="buyNowSingleProduct('${prod.id}', '${activeVariant ? activeVariant.id : ''}'); closeProductModal();" 
              class="btn-green px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span class="inline-flex items-center gap-1"><svg class="w-3.5 h-3.5 inline-block fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg><span>Buy Now</span></span>
            </button>
            <button 
              id="modal-btn-addbag"
              onclick="addToCart('${prod.id}', 1, '${activeVariant ? activeVariant.id : ''}'); closeProductModal();" 
              class="btn-secondary px-4 py-2.5 rounded-xl font-bold text-xs border border-[#eadcc8] hover:border-[#b88a44] transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span class="inline-flex items-center gap-1"><svg class="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg><span>Add to Bag</span></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function selectModalVariant(productId, variantId, btnEl) {
  const prod = (typeof TCJ_PRODUCTS !== 'undefined' ? TCJ_PRODUCTS : []).find(p => p.id === productId);
  if (!prod || !prod.variants) return;

  const variant = prod.variants.find(v => v.id === variantId);
  if (!variant) return;

  const modal = document.getElementById('product-modal');
  if (!modal) return;

  const imgEl = modal.querySelector('#modal-product-img');
  if (imgEl && variant.image) imgEl.src = variant.image;

  const priceEl = modal.querySelector('#modal-product-price');
  if (priceEl && variant.price !== undefined) priceEl.textContent = '₹' + variant.price;

  const mrpEl = modal.querySelector('#modal-product-mrp');
  if (mrpEl && variant.mrp) mrpEl.textContent = '₹' + variant.mrp;

  const weightEl = modal.querySelector('#modal-product-weight');
  if (weightEl) weightEl.textContent = `${prod.country}${variant.weight ? ' • ' + variant.weight : ''}`;

  const badgeEl = modal.querySelector('#modal-variant-name-badge');
  if (badgeEl) badgeEl.textContent = variant.name;

  const buyBtn = modal.querySelector('#modal-btn-buynow');
  if (buyBtn) {
    buyBtn.setAttribute('onclick', `buyNowSingleProduct('${productId}', '${variantId}'); closeProductModal();`);
  }

  const bagBtn = modal.querySelector('#modal-btn-addbag');
  if (bagBtn) {
    bagBtn.setAttribute('onclick', `addToCart('${productId}', 1, '${variantId}'); closeProductModal();`);
  }

  const optionsContainer = modal.querySelector('#modal-variant-options');
  if (optionsContainer) {
    optionsContainer.querySelectorAll('.modal-variant-btn').forEach(btn => {
      btn.className = 'modal-variant-btn px-3 py-1.5 rounded-xl text-xs transition-all bg-[#f7f1e8] text-[#574F47] hover:text-[#173c2d] border border-[#eadcc8]';
    });
    if (btnEl) {
      btnEl.className = 'modal-variant-btn px-3 py-1.5 rounded-xl text-xs transition-all bg-[#173c2d] text-white font-bold shadow-sm ring-2 ring-[#b88a44]/50';
    }
  }
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
  toast.className = 'bg-[#173c2d] text-[#fffdf8] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 mb-2 transform translate-y-3 opacity-0 transition-all duration-300 border border-[#b88a44]/40 pointer-events-auto';
  toast.innerHTML = `<span class="text-[#b88a44] inline-flex items-center mr-1.5"><svg class="w-3.5 h-3.5 text-[#b88a44] inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg></span><span>${msg}</span>`;

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
      <span class="text-[#b88a44] font-bold text-xs">Opens at 12 PM • Pre-Orders Active</span>
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
    ? `<span class="text-xs inline-flex items-center"><svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Sound Muted</span>`
    : `<span class="text-xs text-[#b88a44] inline-flex items-center"><svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Sound On</span>`;
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
    ? `<span class="text-xs inline-flex items-center"><svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Sound Muted</span>`
    : `<span class="text-xs text-sky-400 inline-flex items-center"><svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Sound On</span>`;
}

function toggleDrinksPlay() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('drinks-video-desktop') 
    : document.getElementById('drinks-video-mobile');
  const btn = document.getElementById('drinks-play-toggle-btn');
  if (!vid || !btn) return;

  if (vid.paused) {
    vid.play();
    btn.innerHTML = `<span class="text-xs text-sky-400 inline-flex items-center"><svg class="w-3 h-3 inline mr-1 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause</span>`;
  } else {
    vid.pause();
    btn.innerHTML = `<span class="text-xs inline-flex items-center"><svg class="w-3 h-3 inline mr-1 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play Video</span>`;
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
    ? `<span class="text-xs inline-flex items-center"><svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Sound Muted</span>`
    : `<span class="text-xs text-orange-400 inline-flex items-center"><svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Sound On</span>`;
}

function toggleSnacksPlay() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('snacks-video-desktop') 
    : document.getElementById('snacks-video-mobile');
  const btn = document.getElementById('snacks-play-toggle-btn');
  if (!vid || !btn) return;

  if (vid.paused) {
    vid.play();
    btn.innerHTML = `<span class="text-xs text-orange-400 inline-flex items-center"><svg class="w-3 h-3 inline mr-1 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause</span>`;
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
    ? `<span class="text-xs inline-flex items-center"><svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Sound Muted</span>` 
    : `<span class="text-xs text-pink-400 inline-flex items-center"><svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Sound On</span>`;
}

function toggleCandyPlay() {
  const vid = window.innerWidth >= 768 
    ? document.getElementById('candy-video-desktop') 
    : document.getElementById('candy-video-mobile');
  const btn = document.getElementById('candy-play-toggle-btn');
  if (!vid || !btn) return;

  if (vid.paused) {
    vid.play();
    btn.innerHTML = `<span class="text-xs text-pink-400 inline-flex items-center"><svg class="w-3 h-3 inline mr-1 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause</span>`;
  } else {
    vid.pause();
    btn.innerHTML = `<span class="text-xs">▶ Play Video</span>`;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THEME MANAGER (PERMANENT LIGHT LUXURY THEME)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initThemeManager() {
  applyLightTheme();
}

function applyLightTheme() {
  document.documentElement.classList.add('light-theme');
  document.documentElement.classList.remove('dark-theme');
  document.body.classList.add('light-theme');
  document.body.classList.remove('dark-theme', 'bg-[#080808]', 'text-[#F5EBDD]', 'bg-[#0a1a13]', 'text-[#fffdf8]');
  document.body.classList.add('bg-[#fffdf8]', 'text-[#1a1a1a]');
  try {
    localStorage.setItem('tcj_theme', 'light');
  } catch (e) {}
}

function applyTheme(theme) {
  applyLightTheme();
}

function toggleTheme() {
  // Website is strictly light mode only
  applyLightTheme();
}


