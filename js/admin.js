/**
 * TCJ Luxury Admin Portal Application
 * The Convenience Junction
 */

(function () {
  'use strict';

  // --- Global State ---
  const state = {
    token: localStorage.getItem('tcj_admin_token') || '',
    products: [],
    categories: [],
    orders: [],
    customers: [],
    settings: {},
    currentTab: 'overview',
    orderStatusFilter: 'all',
    deleteTarget: null, // { type: 'product'|'category', id: string, name: string }
  };

  // --- DOM Elements ---
  const el = {
    loginModal: document.getElementById('login-modal'),
    loginForm: document.getElementById('login-form'),
    passcodeInput: document.getElementById('passcode-input'),
    togglePwdBtn: document.getElementById('toggle-pwd-btn'),
    loginError: document.getElementById('login-error'),
    loginErrorText: document.getElementById('login-error-text'),
    loginBtn: document.getElementById('login-btn'),
    adminApp: document.getElementById('admin-app'),
    logoutBtn: document.getElementById('logout-btn'),
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    sidebar: document.getElementById('admin-sidebar'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    toastContainer: document.getElementById('toast-container'),

    // Top Header & Badges
    storeStatusPill: document.getElementById('store-status-pill'),
    storeStatusText: document.getElementById('store-status-text'),
    conciergePhoneDisplay: document.getElementById('concierge-phone-display'),
    badgeProductsCount: document.getElementById('badge-products-count'),
    badgeOrdersCount: document.getElementById('badge-orders-count'),
    badgeCustomersCount: document.getElementById('badge-customers-count'),
    badgeCategoriesCount: document.getElementById('badge-categories-count'),

    // Tabs & Panels
    navTabBtns: document.querySelectorAll('.nav-tab-btn'),
    tabPanels: {
      overview: document.getElementById('panel-overview'),
      products: document.getElementById('panel-products'),
      orders: document.getElementById('panel-orders'),
      customers: document.getElementById('panel-customers'),
      categories: document.getElementById('panel-categories'),
      settings: document.getElementById('panel-settings'),
    },

    // Overview Elements
    kpiTotalProducts: document.getElementById('kpi-total-products'),
    kpiInStockProducts: document.getElementById('kpi-instock-products'),
    kpiOutOfStockProducts: document.getElementById('kpi-outofstock-products'),
    kpiStockRatio: document.getElementById('kpi-stock-ratio'),
    kpiTotalOrders: document.getElementById('kpi-total-orders'),
    kpiPendingOrders: document.getElementById('kpi-pending-orders'),
    kpiOrderValue: document.getElementById('kpi-order-value'),
    overviewRecentOrders: document.getElementById('overview-recent-orders-list'),
    overviewCategoryBreakdown: document.getElementById('overview-category-breakdown'),
    overviewCategoryCount: document.getElementById('overview-category-count'),
    btnRefreshDashboard: document.getElementById('btn-refresh-dashboard'),
    btnQuickAddProd: document.getElementById('btn-quick-add-prod'),

    // Products Elements
    btnAddProduct: document.getElementById('btn-add-product'),
    prodSearchInput: document.getElementById('prod-search-input'),
    prodCategoryFilter: document.getElementById('prod-category-filter'),
    prodStockFilter: document.getElementById('prod-stock-filter'),
    prodResetFilters: document.getElementById('prod-reset-filters'),
    productsTableBody: document.getElementById('products-table-body'),
    productsCountLabel: document.getElementById('products-count-label'),

    // Orders Elements
    btnRefreshOrders: document.getElementById('btn-refresh-orders'),
    orderStatusFilterBtns: document.querySelectorAll('.order-status-filter-btn'),
    ordersCardsContainer: document.getElementById('orders-cards-container'),
    countAllOrders: document.getElementById('count-all-orders'),
    countPendingOrders: document.getElementById('count-pending-orders'),
    countContactedOrders: document.getElementById('count-contacted-orders'),
    countDispatchedOrders: document.getElementById('count-dispatched-orders'),
    countDeliveredOrders: document.getElementById('count-delivered-orders'),

    // VIP Customers Elements
    btnRefreshCustomers: document.getElementById('btn-refresh-customers'),
    statTotalVipCustomers: document.getElementById('stat-total-vip-customers'),
    statTotalVipOrders: document.getElementById('stat-total-vip-orders'),
    statTotalVipSpent: document.getElementById('stat-total-vip-spent'),
    customersListContainer: document.getElementById('customers-list-container'),

    // Categories Elements
    btnAddCategory: document.getElementById('btn-add-category'),
    categoriesGrid: document.getElementById('categories-grid'),

    // Settings Elements
    settingsForm: document.getElementById('settings-form'),
    settingStoreOpen: document.getElementById('setting-store-open'),
    settingAnnouncementEnabled: document.getElementById('setting-announcement-enabled'),
    settingAnnouncementText: document.getElementById('setting-announcement-text'),
    settingPhone: document.getElementById('setting-phone'),
    settingEmail: document.getElementById('setting-email'),
    settingFreeDelivery: document.getElementById('setting-free-delivery'),
    settingDeliveryFee: document.getElementById('setting-delivery-fee'),
    settingPasscode: document.getElementById('setting-passcode'),

    // Modals
    modalProduct: document.getElementById('modal-product'),
    modalProductTitle: document.getElementById('modal-product-title'),
    modalProductClose: document.getElementById('modal-product-close'),
    modalProductCancel: document.getElementById('modal-product-cancel'),
    productForm: document.getElementById('product-form'),
    prodFormId: document.getElementById('prod-form-id'),
    prodFormIsEdit: document.getElementById('prod-form-is-edit'),
    prodFormTitle: document.getElementById('prod-form-title'),
    prodFormCategory: document.getElementById('prod-form-category'),
    prodFormPrice: document.getElementById('prod-form-price'),
    prodFormMrp: document.getElementById('prod-form-mrp'),
    prodFormWeight: document.getElementById('prod-form-weight'),
    prodFormRating: document.getElementById('prod-form-rating'),
    prodFormOrigin: document.getElementById('prod-form-origin'),
    prodFormBadge: document.getElementById('prod-form-badge'),
    prodFormImage: document.getElementById('prod-form-image'),
    prodFormFileUpload: document.getElementById('prod-form-file-upload'),
    imagePreviewContainer: document.getElementById('image-preview-container'),
    imagePreview: document.getElementById('image-preview'),
    imagePreviewName: document.getElementById('image-preview-name'),
    prodFormDescription: document.getElementById('prod-form-description'),
    prodFormTags: document.getElementById('prod-form-tags'),
    prodFormInStock: document.getElementById('prod-form-instock'),
    modalProductBtnText: document.getElementById('modal-product-btn-text'),

    modalCategory: document.getElementById('modal-category'),
    modalCategoryClose: document.getElementById('modal-category-close'),
    modalCategoryCancel: document.getElementById('modal-category-cancel'),
    categoryForm: document.getElementById('category-form'),
    catFormId: document.getElementById('cat-form-id'),
    catFormName: document.getElementById('cat-form-name'),
    catFormIcon: document.getElementById('cat-form-icon'),
    catFormBadge: document.getElementById('cat-form-badge'),

    modalConfirm: document.getElementById('modal-confirm'),
    confirmModalText: document.getElementById('confirm-modal-text'),
    confirmModalCancel: document.getElementById('confirm-modal-cancel'),
    confirmModalProceed: document.getElementById('confirm-modal-proceed'),
  };

  // --- API Client ---
  async function api(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(state.token ? { 'x-admin-token': state.token } : {}),
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(path, { ...options, headers });
      if (res.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired or unauthorized. Please re-enter passcode.');
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${path}]:`, err);
      throw err;
    }
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-xl shadow-2xl flex items-center gap-3 border transition-all duration-300 pointer-events-auto transform translate-y-2 opacity-0 text-xs font-medium ${
      type === 'success'
        ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
        : type === 'error'
        ? 'bg-red-950/90 border-red-500/40 text-red-200'
        : 'bg-[#181513]/95 border-[#b88a44]/40 text-[#F5EBDD]'
    }`;

    const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    el.toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // --- Authentication Handlers ---
  function handleUnauthorized() {
    state.token = '';
    localStorage.removeItem('tcj_admin_token');
    el.adminApp.classList.add('hidden');
    el.loginModal.classList.remove('hidden');
    el.passcodeInput.value = '';
    el.passcodeInput.focus();
  }

  async function checkAuthOnStartup() {
    if (!state.token) {
      handleUnauthorized();
      return;
    }

    try {
      const res = await api('/api/auth/verify');
      if (res && res.authenticated) {
        showAdminApp();
      } else {
        handleUnauthorized();
      }
    } catch (e) {
      handleUnauthorized();
    }
  }

  function showAdminApp() {
    el.loginModal.classList.add('hidden');
    el.adminApp.classList.remove('hidden');
    loadAllData();
  }

  async function handleLogin(e) {
    e.preventDefault();
    const passcode = el.passcodeInput.value.trim();
    if (!passcode) return;

    el.loginBtn.disabled = true;
    el.loginBtn.innerHTML = `<span class="animate-spin inline-block mr-2">◌</span> Verifying...`;
    el.loginError.classList.add('hidden');

    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ passcode }),
      });

      if (res.token) {
        state.token = res.token;
        localStorage.setItem('tcj_admin_token', res.token);
        showAdminApp();
        showToast('Authenticated as TCJ Administrator', 'success');
      }
    } catch (err) {
      el.loginError.classList.remove('hidden');
      el.loginErrorText.textContent = err.message || 'Incorrect master passcode.';
      el.passcodeInput.classList.add('border-red-500');
      setTimeout(() => el.passcodeInput.classList.remove('border-red-500'), 2000);
    } finally {
      el.loginBtn.disabled = false;
      el.loginBtn.innerHTML = `<i data-lucide="lock" class="w-4 h-4"></i><span>Access Management Portal</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  async function handleLogout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    state.token = '';
    localStorage.removeItem('tcj_admin_token');
    handleUnauthorized();
    showToast('Signed out of admin portal', 'info');
  }

  // --- Data Loading & Synchronization ---
  async function loadAllData() {
    try {
      const [products, categories, orders, settings, customers] = await Promise.all([
        api('/api/products'),
        api('/api/categories'),
        api('/api/orders'),
        api('/api/settings'),
        api('/api/admin/customers').catch(() => []),
      ]);

      state.products = (products || []).map(p => ({
        ...p,
        title: p.title || p.name || 'Untitled Delicacy',
        name: p.name || p.title || 'Untitled Delicacy',
        origin: p.origin || p.country || 'Imported Exclusive',
        country: p.country || p.origin || 'Imported Exclusive',
        mrp: p.mrp || p.originalPrice || '',
        originalPrice: p.originalPrice || p.mrp || '',
        netWeight: p.netWeight || p.weight || '',
        weight: p.weight || p.netWeight || '',
        inStock: p.inStock !== false,
      }));
      state.categories = categories || [];
      state.orders = (orders || []).map(o => ({
        ...o,
        customerName: o.customerName || 'Gourmet Patron',
        customerPhone: o.customerPhone || o.phone || '',
        phone: o.phone || o.customerPhone || '',
        customerAddress: o.customerAddress || o.address || 'Pick-up / Store Concierge',
        address: o.address || o.customerAddress || 'Pick-up / Store Concierge',
        deliveryNotes: o.deliveryNotes || o.notes || '',
        notes: o.notes || o.deliveryNotes || '',
        total: Number(o.total || 0),
        status: o.status || 'Pending',
      }));
      state.settings = settings || {};
      state.customers = customers || [];

      renderHeaderAndPills();
      renderDashboard();
      renderProductsTable();
      renderOrdersList();
      renderCustomersList();
      renderCategoriesGrid();
      populateSettingsForm();
      populateCategoryDropdowns();

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      showToast('Error syncing data: ' + err.message, 'error');
    }
  }

  // --- Header & Pills Rendering ---
  function renderHeaderAndPills() {
    // Store Status
    const isOpen = state.settings.storeOpen !== false;
    if (isOpen) {
      el.storeStatusPill.className =
        'flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-medium';
      el.storeStatusPill.innerHTML =
        '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Store Open</span>';
    } else {
      el.storeStatusPill.className =
        'flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/30 text-red-300 text-xs font-medium';
      el.storeStatusPill.innerHTML =
        '<span class="w-2 h-2 rounded-full bg-red-400"></span><span>Orders Paused</span>';
    }

    if (state.settings.conciergePhone) {
      el.conciergePhoneDisplay.textContent = '+' + state.settings.conciergePhone.replace(/(\d{2})(\d{5})(\d{5})/, '$1 $2 $3');
    }

    // Sidebar Badges
    el.badgeProductsCount.textContent = state.products.length;
    el.badgeOrdersCount.textContent = state.orders.length;
    if (el.badgeCustomersCount) el.badgeCustomersCount.textContent = state.customers.length;
    el.badgeCategoriesCount.textContent = state.categories.length;
  }

  // --- Tab 1: Overview / Dashboard ---
  function renderDashboard() {
    const total = state.products.length;
    const inStock = state.products.filter(p => p.inStock !== false).length;
    const outOfStock = total - inStock;
    const stockRatio = total > 0 ? Math.round((inStock / total) * 100) : 100;

    const totalOrders = state.orders.length;
    const pendingOrders = state.orders.filter(o => o.status === 'Pending').length;
    const totalValue = state.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    el.kpiTotalProducts.textContent = total;
    el.kpiInStockProducts.textContent = `${inStock} in stock`;
    el.kpiOutOfStockProducts.textContent = outOfStock;
    el.kpiStockRatio.textContent = `${stockRatio}%`;
    el.kpiTotalOrders.textContent = totalOrders;
    el.kpiPendingOrders.textContent = `${pendingOrders} pending action`;
    el.kpiOrderValue.textContent = `₹${totalValue.toLocaleString('en-IN')}`;

    // Recent Inquiries (Latest 5)
    const recent = [...state.orders].slice(0, 5);
    if (recent.length === 0) {
      el.overviewRecentOrders.innerHTML = `
        <div class="py-8 text-center text-xs text-[#A49B91]">
          No orders or WhatsApp inquiries logged yet. Test checkouts from the storefront will appear here!
        </div>
      `;
    } else {
      el.overviewRecentOrders.innerHTML = recent
        .map(
          order => `
        <div class="py-3.5 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full bg-[#181513] border border-[#b88a44]/20 flex items-center justify-center text-xs font-bold text-[#b88a44] flex-shrink-0">
              ${(order.customerName || 'G')[0].toUpperCase()}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-[#F5EBDD] truncate">${escapeHtml(order.customerName || 'Gourmet Patron')}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeClass(order.status)}">${escapeHtml(order.status || 'Pending')}</span>
              </div>
              <p class="text-[11px] text-[#A49B91] truncate">
                ${order.items ? order.items.length : 0} items &bull; ₹${Number(order.total || 0).toLocaleString('en-IN')} &bull; ${formatTimestamp(order.createdAt)}
              </p>
            </div>
          </div>
          <button data-order-chat="${order.id}" class="btn-secondary-admin text-xs px-2.5 py-1.5 flex-shrink-0 hover:text-emerald-400" title="Chat on WhatsApp">
            <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
            <span class="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      `
        )
        .join('');
    }

    // Category Breakdown
    el.overviewCategoryCount.textContent = `${state.categories.length} Aisles`;
    el.overviewCategoryBreakdown.innerHTML = state.categories
      .map(cat => {
        const count = state.products.filter(p => p.category === cat.id).length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[#F5EBDD] flex items-center gap-1.5">
              <span>${cat.icon ? '' : '•'}</span>
              <span>${escapeHtml(cat.name)}</span>
            </span>
            <span class="font-mono text-[11px] text-[#A49B91]">${count} items (${pct}%)</span>
          </div>
          <div class="w-full bg-[#161412] rounded-full h-1.5 overflow-hidden">
            <div class="bg-[#b88a44] h-1.5 rounded-full" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
      })
      .join('');
  }

  // --- Tab 2: Products Catalog (CRUD) ---
  function populateCategoryDropdowns() {
    const opts = state.categories
      .map(c => `<option value="${c.id}">${c.icon || ''} ${escapeHtml(c.name)}</option>`)
      .join('');

    el.prodCategoryFilter.innerHTML = `<option value="all">All Aisles</option>${opts}`;
    el.prodFormCategory.innerHTML = opts;
  }

  function renderProductsTable() {
    const search = (el.prodSearchInput.value || '').toLowerCase().trim();
    const catFilter = el.prodCategoryFilter.value;
    const stockFilter = el.prodStockFilter.value;

    let filtered = state.products.filter(p => {
      if (search) {
        const haystack = `${p.id} ${p.title} ${p.origin} ${p.badge || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (catFilter !== 'all' && p.category !== catFilter) return false;
      if (stockFilter === 'in-stock' && p.inStock === false) return false;
      if (stockFilter === 'out-of-stock' && p.inStock !== false) return false;
      return true;
    });

    el.productsCountLabel.textContent = `Showing ${filtered.length} of ${state.products.length} delicacies`;

    if (filtered.length === 0) {
      el.productsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-[#A49B91]">
            <i data-lucide="package-x" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            <p>No delicacies match your filter criteria.</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    el.productsTableBody.innerHTML = filtered
      .map(p => {
        const isInStock = p.inStock !== false;
        const catObj = state.categories.find(c => c.id === p.category);
        const catName = catObj ? `${catObj.icon || ''} ${catObj.name}` : p.category;
        const img = p.image || 'assets/mockup/matcha-soda.png';

        return `
        <tr class="hover:bg-[#151311] transition-colors group">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-lg bg-[#181513] border border-[#b88a44]/20 overflow-hidden flex-shrink-0 flex items-center justify-center">
                <img src="${img}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'40\\' height=\\'40\\' fill=\\'%23555\\'><rect width=\\'40\\' height=\\'40\\' fill=\\'%2312100e\\'/></svg>'">
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-[#F5EBDD] truncate max-w-xs sm:max-w-md">${escapeHtml(p.title)}</div>
                <div class="text-[11px] text-[#A49B91] flex items-center gap-1.5">
                  <span class="truncate">${escapeHtml(p.origin || 'Imported')}</span>
                  ${p.netWeight ? `&bull; <span>${escapeHtml(p.netWeight)}</span>` : ''}
                </div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-[#A49B91] text-xs whitespace-nowrap">
            <span class="px-2 py-0.5 rounded-md bg-[#181513] border border-[#b88a44]/15 text-[#b88a44]">${escapeHtml(catName)}</span>
          </td>
          <td class="py-3 px-4 font-mono font-bold text-[#F5EBDD] whitespace-nowrap">
            ₹${Number(p.price || 0).toLocaleString('en-IN')}
          </td>
          <td class="py-3 px-4 font-mono text-[#706860] line-through whitespace-nowrap">
            ${p.mrp ? `₹${Number(p.mrp).toLocaleString('en-IN')}` : '-'}
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            ${
              p.badge
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#b88a44]/15 text-[#b88a44] border border-[#b88a44]/30">${escapeHtml(p.badge)}</span>`
                : '<span class="text-[#555]">-</span>'
            }
          </td>
          <td class="py-3 px-4 text-center whitespace-nowrap">
            <label class="switch">
              <input type="checkbox" data-stock-toggle="${p.id}" ${isInStock ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <div class="inline-flex items-center gap-1.5">
              <button data-edit-prod="${p.id}" class="p-1.5 text-[#A49B91] hover:text-[#b88a44] hover:bg-[#1a1715] rounded-lg transition-colors" title="Edit Delicacy">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button data-delete-prod="${p.id}" class="p-1.5 text-[#A49B91] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors" title="Delete Delicacy">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    if (window.lucide) lucide.createIcons();
  }

  // --- Product Modal Logic (Add / Edit) ---
  function openProductModal(prod = null) {
    el.productForm.reset();
    el.imagePreviewContainer.classList.add('hidden');

    if (prod) {
      // Edit Mode
      el.modalProductTitle.textContent = 'Edit Delicacy';
      el.modalProductBtnText.textContent = 'Save Changes';
      el.prodFormIsEdit.value = 'true';
      el.prodFormId.value = prod.id;
      el.prodFormTitle.value = prod.title || '';
      el.prodFormCategory.value = prod.category || (state.categories[0] ? state.categories[0].id : '');
      el.prodFormPrice.value = prod.price || '';
      el.prodFormMrp.value = prod.mrp || '';
      el.prodFormWeight.value = prod.netWeight || '';
      el.prodFormRating.value = prod.rating || 4.8;
      el.prodFormOrigin.value = prod.origin || '';
      el.prodFormBadge.value = prod.badge || '';
      el.prodFormImage.value = prod.image || '';
      el.prodFormDescription.value = prod.description || '';
      el.prodFormTags.value = (prod.tags || []).join(', ');
      el.prodFormInStock.checked = prod.inStock !== false;

      if (prod.image) {
        el.imagePreview.src = prod.image;
        el.imagePreviewName.textContent = prod.image;
        el.imagePreviewContainer.classList.remove('hidden');
      }
    } else {
      // Create Mode
      el.modalProductTitle.textContent = 'Add New Delicacy';
      el.modalProductBtnText.textContent = 'Create Delicacy';
      el.prodFormIsEdit.value = 'false';
      el.prodFormId.value = '';
      el.prodFormCategory.value = state.categories[0] ? state.categories[0].id : '';
      el.prodFormRating.value = '4.8';
      el.prodFormInStock.checked = true;
    }

    el.modalProduct.classList.remove('hidden');
    el.prodFormTitle.focus();
    if (window.lucide) lucide.createIcons();
  }

  function closeProductModal() {
    el.modalProduct.classList.add('hidden');
  }

  async function handleProductSubmit(e) {
    e.preventDefault();
    const isEdit = el.prodFormIsEdit.value === 'true';
    const title = el.prodFormTitle.value.trim();
    if (!title) return;

    let id = el.prodFormId.value.trim();
    if (!id) {
      // Auto-generate clean slug ID
      id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);
    }

    const payload = {
      id,
      title,
      name: title,
      category: el.prodFormCategory.value,
      price: Number(el.prodFormPrice.value) || 0,
      mrp: el.prodFormMrp.value ? Number(el.prodFormMrp.value) : undefined,
      originalPrice: el.prodFormMrp.value ? Number(el.prodFormMrp.value) : undefined,
      netWeight: el.prodFormWeight.value.trim() || undefined,
      weight: el.prodFormWeight.value.trim() || undefined,
      rating: Number(el.prodFormRating.value) || 4.8,
      reviewsCount: 120,
      origin: el.prodFormOrigin.value.trim() || 'Imported Exclusive',
      country: el.prodFormOrigin.value.trim() || 'Imported Exclusive',
      badge: el.prodFormBadge.value.trim() || undefined,
      image: el.prodFormImage.value.trim() || 'assets/mockup/food-dubai-chocolate.png',
      description: el.prodFormDescription.value.trim(),
      tags: el.prodFormTags.value
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      inStock: el.prodFormInStock.checked,
    };

    el.modalProductSubmit = document.getElementById('modal-product-submit');
    el.modalProductSubmit.disabled = true;

    try {
      if (isEdit) {
        await api(`/api/products/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast(`Updated "${title}"`, 'success');
      } else {
        await api('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast(`Added "${title}" to catalog`, 'success');
      }

      closeProductModal();
      await loadAllData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      el.modalProductSubmit.disabled = false;
    }
  }

  async function toggleProductStock(prodId, newStockStatus) {
    try {
      await api(`/api/products/${encodeURIComponent(prodId)}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ inStock: newStockStatus }),
      });

      // Update in-memory
      const p = state.products.find(item => item.id === prodId);
      if (p) p.inStock = newStockStatus;

      showToast(`Stock updated: ${p ? p.title : prodId} is now ${newStockStatus ? 'In Stock' : 'Sold Out'}`, 'info');
      renderDashboard();
    } catch (err) {
      showToast('Failed to update stock: ' + err.message, 'error');
      renderProductsTable(); // revert UI
    }
  }

  // --- Tab 3: Orders & Inquiries ---
  function getStatusBadgeClass(status) {
    switch (status) {
      case 'Pending':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/30';
      case 'Contacted':
        return 'bg-blue-950/60 text-blue-300 border-blue-500/30';
      case 'Dispatched':
        return 'bg-purple-950/60 text-purple-300 border-purple-500/30';
      case 'Delivered':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30';
      case 'Cancelled':
        return 'bg-red-950/60 text-red-300 border-red-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  }

  function renderOrdersList() {
    const all = state.orders;
    const pending = all.filter(o => o.status === 'Pending').length;
    const contacted = all.filter(o => o.status === 'Contacted').length;
    const dispatched = all.filter(o => o.status === 'Dispatched').length;
    const delivered = all.filter(o => o.status === 'Delivered').length;

    el.countAllOrders.textContent = all.length;
    el.countPendingOrders.textContent = pending;
    el.countContactedOrders.textContent = contacted;
    el.countDispatchedOrders.textContent = dispatched;
    el.countDeliveredOrders.textContent = delivered;

    let filtered = all;
    if (state.orderStatusFilter !== 'all') {
      filtered = all.filter(o => o.status === state.orderStatusFilter);
    }

    if (filtered.length === 0) {
      el.ordersCardsContainer.innerHTML = `
        <div class="admin-card p-12 text-center text-[#A49B91] rounded-2xl">
          <i data-lucide="shopping-bag" class="w-10 h-10 mx-auto mb-3 opacity-40 text-[#b88a44]"></i>
          <p class="font-medium">No customer inquiries found for filter: <span class="text-[#b88a44]">${state.orderStatusFilter}</span></p>
          <p class="text-xs text-[#706860] mt-1">When customers click "Proceed via WhatsApp Concierge" on the live store, orders appear here in real-time.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    el.ordersCardsContainer.innerHTML = filtered
      .map(o => {
        const items = o.items || [];
        const itemsHtml = items
          .map(
            it => `
          <div class="flex items-center justify-between text-xs py-1 border-b border-[#b88a44]/10 last:border-none">
            <span class="text-[#F5EBDD]">${it.quantity}x ${escapeHtml(it.title)}</span>
            <span class="font-mono text-[#b88a44]">₹${Number(it.price * it.quantity).toLocaleString('en-IN')}</span>
          </div>
        `
          )
          .join('');

        const cleanPhone = (o.customerPhone || '').replace(/\D/g, '');
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
          `Hello ${o.customerName || 'Valued Patron'}, this is TCJ Concierge regarding your order #${o.id}. We are reviewing your curated selection!`
        )}`;

        return `
        <div class="admin-card p-5 sm:p-6 rounded-2xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#b88a44]/15">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[#181513] border border-[#b88a44]/20 flex items-center justify-center font-bold text-[#b88a44]">
                #${(o.id || '').slice(-4).toUpperCase()}
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="font-editorial text-base font-bold text-[#F5EBDD]">${escapeHtml(o.customerName || 'Gourmet Patron')}</h4>
                  ${o.isGuest === false || o.customerId ? `
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#b88a44]/15 text-[#b88a44] border border-[#b88a44]/30 flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 inline-block mr-1 text-[#b88a44]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7l4 4 5-7 5 7 4-4v11H3V7z"/><line x1="3" y1="21" x2="21" y2="21"/></svg> VIP Member
                    </span>
                  ` : `
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 inline-block mr-1 text-amber-500 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg> Guest Order
                    </span>
                  `}
                  <span class="text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${getStatusBadgeClass(o.status)}">${escapeHtml(o.status || 'Pending')}</span>
                </div>
                <div class="text-[11px] text-[#A49B91] flex flex-wrap items-center gap-2 mt-0.5">
                  <span class="font-mono text-[#F5EBDD]">${escapeHtml(o.customerPhone || '-')}</span>
                  &bull;
                  <span>${formatTimestamp(o.createdAt)}</span>
                  &bull;
                  <span class="px-2 py-0.5 rounded bg-[#1e1914] text-[10px] text-[#b88a44] border border-[#b88a44]/20">${escapeHtml(o.paymentMode || 'UPI on Delivery')}</span>
                </div>
              </div>
            </div>

            <!-- Status Dropdown & WhatsApp Shortcut -->
            <div class="flex items-center gap-2">
              <select data-order-status-select="${o.id}" class="admin-input text-xs py-1.5 px-3 w-auto">
                <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Contacted" ${o.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                <option value="Dispatched" ${o.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
                <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>

              <a href="${waLink}" target="_blank" class="btn-gold-admin text-xs py-1.5 px-3 gap-1.5" title="Message Customer on WhatsApp">
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <!-- Items Breakdown -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2 space-y-2 bg-[#0d0c0a] p-3.5 rounded-xl border border-[#b88a44]/10">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-[#706860]">Curated Items Ordered</span>
              <div class="space-y-1">
                ${itemsHtml || '<span class="text-xs text-[#706860]">No items recorded</span>'}
              </div>
            </div>

            <div class="space-y-3 bg-[#0d0c0a] p-3.5 rounded-xl border border-[#b88a44]/10 flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-[#706860]">Delivery Address (Ujjain Doorstep)</span>
                <p class="text-xs text-[#F5EBDD] mt-1 leading-relaxed">${escapeHtml(o.customerAddress || 'Pick-up / Store Concierge')}</p>
                ${o.addressDetails && o.addressDetails.locality ? `
                  <div class="mt-1 flex items-center gap-1.5 text-[10px]">
                    <span class="px-2 py-0.5 rounded bg-[#181512] text-[#A8B77A] border border-[#A8B77A]/20"><svg class="w-3.5 h-3.5 inline-block mr-1 text-[#b88a44]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>${escapeHtml(o.addressDetails.locality)}</span>
                    ${o.addressDetails.landmark ? `<span class="text-[#A49B91]">Near ${escapeHtml(o.addressDetails.landmark)}</span>` : ''}
                  </div>
                ` : ''}
                ${o.deliveryNotes ? `<p class="text-[11px] text-amber-300/80 mt-1.5 italic">Note: "${escapeHtml(o.deliveryNotes)}"</p>` : ''}
              </div>

              <div class="pt-2 border-t border-[#b88a44]/10 flex items-center justify-between">
                <span class="text-xs text-[#A49B91]">Total Amount</span>
                <span class="font-mono font-bold text-sm text-[#b88a44]">₹${Number(o.total || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    if (window.lucide) lucide.createIcons();
  }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      await api(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      const o = state.orders.find(item => item.id === orderId);
      if (o) o.status = newStatus;

      showToast(`Order status updated to "${newStatus}"`, 'success');
      renderDashboard();
      renderOrdersList();
    } catch (err) {
      showToast('Failed to update status: ' + err.message, 'error');
    }
  }

  // --- Tab: VIP Patrons & Members ---
  function renderCustomersList() {
    if (!el.customersListContainer) return;

    const customers = state.customers || [];
    if (el.badgeCustomersCount) el.badgeCustomersCount.textContent = customers.length;
    if (el.statTotalVipCustomers) el.statTotalVipCustomers.textContent = customers.length;

    const totalPatronOrders = customers.reduce((sum, c) => sum + (c.orderCount || 0), 0);
    const totalPatronSpent = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

    if (el.statTotalVipOrders) el.statTotalVipOrders.textContent = totalPatronOrders;
    if (el.statTotalVipSpent) el.statTotalVipSpent.textContent = `₹${totalPatronSpent.toLocaleString('en-IN')}`;

    if (customers.length === 0) {
      el.customersListContainer.innerHTML = `
        <div class="admin-card p-12 text-center text-[#A49B91] rounded-2xl">
          <i data-lucide="users" class="w-10 h-10 mx-auto mb-3 opacity-40 text-[#b88a44]"></i>
          <p class="font-medium">No VIP patrons registered yet</p>
          <p class="text-xs text-[#706860] mt-1">When customers join the VIP Gourmet Club on the storefront, their accounts appear here in real-time.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    el.customersListContainer.innerHTML = customers.map(c => {
      const addrs = c.addresses || [];
      const cleanPhone = (c.phone || '').replace(/\D/g, '');
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Hello ${c.name}, greetings from TCJ Concierge! We are delighted to have you in our VIP Gourmet Club.`
      )}`;

      const addrsHtml = addrs.length > 0 ? addrs.map(a => `
        <div class="p-2.5 rounded-lg bg-[#0a0908] border border-[#b88a44]/10 text-xs">
          <span class="font-bold text-[#b88a44] text-[10px] uppercase">${escapeHtml(a.label || 'Home')}</span>
          <p class="text-[#F5EBDD] mt-0.5">${escapeHtml(a.street || '')}${a.landmark ? ', Near ' + escapeHtml(a.landmark) : ''}, ${escapeHtml(a.locality || '')}, Ujjain</p>
        </div>
      `).join('') : '<span class="text-xs text-[#706860]">No saved address</span>';

      return `
        <div class="admin-card p-5 sm:p-6 rounded-2xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#b88a44]/15">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[#1e1914] border border-[#b88a44]/30 flex items-center justify-center font-bold text-base text-[#b88a44]">
                
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-editorial text-base font-bold text-[#F5EBDD]">${escapeHtml(c.name)}</h4>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#b88a44]/20 text-[#b88a44] border border-[#b88a44]/40 font-bold">${c.id || 'VIP'}</span>
                </div>
                <div class="text-[11px] text-[#A49B91] flex flex-wrap items-center gap-2 mt-0.5">
                  <span class="font-mono text-[#F5EBDD]">+91 ${escapeHtml(c.phone)}</span>
                  ${c.email ? `&bull; <span>${escapeHtml(c.email)}</span>` : ''}
                  &bull;
                  <span>Joined ${formatTimestamp(c.createdAt)}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block">
                <span class="text-[10px] text-[#706860] uppercase block">Lifetime Value</span>
                <span class="font-mono text-xs font-bold text-[#b88a44]">₹${Number(c.totalSpent || 0).toLocaleString('en-IN')} (${c.orderCount || 0} orders)</span>
              </div>
              <a href="${waLink}" target="_blank" class="btn-gold-admin text-xs py-1.5 px-3 gap-1.5">
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                <span>WhatsApp VIP</span>
              </a>
            </div>
          </div>

          <div>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-[#706860] block mb-2">Saved Delivery Locations (Ujjain Doorstep)</span>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${addrsHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  // --- Tab 4: Categories & Aisles ---
  function renderCategoriesGrid() {
    el.categoriesGrid.innerHTML = state.categories
      .map(cat => {
        const count = state.products.filter(p => p.category === cat.id).length;
        return `
        <div class="admin-card p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <span class="text-xl text-[#b88a44]">${cat.icon || '•'}</span>
              <div>
                <h4 class="font-editorial text-lg font-bold text-[#F5EBDD]">${escapeHtml(cat.name)}</h4>
                <span class="text-[11px] font-mono text-[#b88a44]">ID: ${escapeHtml(cat.id)}</span>
              </div>
            </div>
            ${
              cat.badge
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#b88a44]/20 text-[#b88a44] border border-[#b88a44]/30">${escapeHtml(cat.badge)}</span>`
                : ''
            }
          </div>

          <div class="pt-3 border-t border-[#b88a44]/15 flex items-center justify-between text-xs">
            <span class="text-[#A49B91]">${count} delicacies active</span>
            <button data-delete-cat="${cat.id}" class="p-1.5 text-[#A49B91] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors" title="Delete Aisle">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    if (window.lucide) lucide.createIcons();
  }

  function openCategoryModal() {
    el.categoryForm.reset();
    el.modalCategory.classList.remove('hidden');
    el.catFormId.focus();
  }

  function closeCategoryModal() {
    el.modalCategory.classList.add('hidden');
  }

  async function handleCategorySubmit(e) {
    e.preventDefault();
    const id = el.catFormId.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const name = el.catFormName.value.trim();
    const icon = el.catFormIcon.value.trim() || '•';
    const badge = el.catFormBadge.value.trim() || undefined;

    if (!id || !name) return;

    try {
      await api('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ id, name, icon, badge }),
      });

      showToast(`Created aisle "${name}"`, 'success');
      closeCategoryModal();
      await loadAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // --- Tab 5: Settings ---
  function populateSettingsForm() {
    const s = state.settings;
    el.settingStoreOpen.checked = s.storeOpen !== false;
    el.settingAnnouncementEnabled.checked = s.announcement && s.announcement.enabled !== false;
    el.settingAnnouncementText.value = (s.announcement && s.announcement.text) || '';
    el.settingPhone.value = s.conciergePhone || '916268344816';
    el.settingEmail.value = s.storeEmail || '';
    el.settingFreeDelivery.value = s.freeDeliveryAbove !== undefined ? s.freeDeliveryAbove : 799;
    el.settingDeliveryFee.value = s.deliveryFee !== undefined ? s.deliveryFee : 49;
    el.settingPasscode.value = '';
  }

  async function handleSettingsSubmit(e) {
    e.preventDefault();

    const payload = {
      storeOpen: el.settingStoreOpen.checked,
      announcement: {
        enabled: el.settingAnnouncementEnabled.checked,
        text: el.settingAnnouncementText.value.trim(),
      },
      conciergePhone: el.settingPhone.value.trim().replace(/\D/g, ''),
      storeEmail: el.settingEmail.value.trim(),
      freeDeliveryAbove: Number(el.settingFreeDelivery.value) || 0,
      deliveryFee: Number(el.settingDeliveryFee.value) || 0,
    };

    const newPass = el.settingPasscode.value.trim();
    if (newPass) {
      payload.adminPasscode = newPass;
    }

    try {
      const updated = await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      state.settings = updated;
      renderHeaderAndPills();
      showToast('Store configurations saved successfully', 'success');
      el.settingPasscode.value = '';
    } catch (err) {
      showToast('Failed to save settings: ' + err.message, 'error');
    }
  }

  // --- Image Upload Handler ---
  async function handleImageFileSelection(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image file too large (Max 8MB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      try {
        showToast('Uploading image asset...', 'info');
        const res = await api('/api/upload', {
          method: 'POST',
          body: JSON.stringify({
            image: base64,
            filename: file.name,
          }),
        });

        if (res.url) {
          el.prodFormImage.value = res.url;
          el.imagePreview.src = res.url;
          el.imagePreviewName.textContent = file.name;
          el.imagePreviewContainer.classList.remove('hidden');
          showToast('Image uploaded and linked', 'success');
        }
      } catch (err) {
        showToast('Upload failed: ' + err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  }

  // --- Deletion Confirmation ---
  function promptDelete(type, id, name) {
    state.deleteTarget = { type, id, name };
    el.confirmModalText.textContent = `Are you sure you want to permanently delete ${type === 'product' ? 'delicacy' : 'aisle'} "${name}"? This action cannot be undone.`;
    el.modalConfirm.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  async function executeDelete() {
    if (!state.deleteTarget) return;
    const { type, id, name } = state.deleteTarget;
    el.modalConfirm.classList.add('hidden');

    try {
      if (type === 'product') {
        await api(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
        showToast(`Deleted delicacy "${name}"`, 'info');
      } else if (type === 'category') {
        await api(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
        showToast(`Deleted aisle "${name}"`, 'info');
      }
      state.deleteTarget = null;
      await loadAllData();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  }

  // --- Helpers ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTimestamp(isoString) {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  }

  function switchTab(tabName) {
    state.currentTab = tabName;
    el.navTabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('text-[#b88a44]', 'bg-[#b88a44]/10', 'border', 'border-[#b88a44]/30');
        btn.classList.remove('text-[#A49B91]');
      } else {
        btn.classList.remove('text-[#b88a44]', 'bg-[#b88a44]/10', 'border', 'border-[#b88a44]/30');
        btn.classList.add('text-[#A49B91]');
      }
    });

    Object.keys(el.tabPanels).forEach(key => {
      if (key === tabName) {
        el.tabPanels[key].classList.remove('hidden');
      } else {
        el.tabPanels[key].classList.add('hidden');
      }
    });

    // Close mobile sidebar if open
    el.sidebar.classList.add('-translate-x-full');
    el.sidebarBackdrop.classList.add('hidden');

    if (window.lucide) lucide.createIcons();
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Auth
    el.loginForm.addEventListener('submit', handleLogin);
    el.logoutBtn.addEventListener('click', handleLogout);
    el.togglePwdBtn.addEventListener('click', () => {
      const isPwd = el.passcodeInput.type === 'password';
      el.passcodeInput.type = isPwd ? 'text' : 'password';
      el.togglePwdBtn.innerHTML = isPwd
        ? `<i data-lucide="eye-off" class="w-5 h-5"></i>`
        : `<i data-lucide="eye" class="w-5 h-5"></i>`;
      if (window.lucide) lucide.createIcons();
    });

    // Mobile Sidebar
    el.mobileMenuToggle.addEventListener('click', () => {
      el.sidebar.classList.toggle('-translate-x-full');
      el.sidebarBackdrop.classList.toggle('hidden');
    });
    el.sidebarBackdrop.addEventListener('click', () => {
      el.sidebar.classList.add('-translate-x-full');
      el.sidebarBackdrop.classList.add('hidden');
    });

    // Navigation Tabs
    el.navTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    // Quick switch from Overview to Orders
    document.addEventListener('click', e => {
      const switchBtn = e.target.closest('[data-tab-switch]');
      if (switchBtn) {
        const target = switchBtn.getAttribute('data-tab-switch');
        if (target) switchTab(target);
      }
    });

    // Overview buttons
    el.btnRefreshDashboard.addEventListener('click', () => {
      loadAllData();
      showToast('Synced live catalog & inquiries', 'info');
    });
    el.btnQuickAddProd.addEventListener('click', () => {
      switchTab('products');
      openProductModal();
    });

    // Products Tab Actions
    el.btnAddProduct.addEventListener('click', () => openProductModal());
    el.prodSearchInput.addEventListener('input', () => renderProductsTable());
    el.prodCategoryFilter.addEventListener('change', () => renderProductsTable());
    el.prodStockFilter.addEventListener('change', () => renderProductsTable());
    el.prodResetFilters.addEventListener('click', () => {
      el.prodSearchInput.value = '';
      el.prodCategoryFilter.value = 'all';
      el.prodStockFilter.value = 'all';
      renderProductsTable();
    });

    // Product Table Delegation (Stock toggle, edit, delete)
    el.productsTableBody.addEventListener('change', e => {
      const toggle = e.target.closest('[data-stock-toggle]');
      if (toggle) {
        const prodId = toggle.getAttribute('data-stock-toggle');
        toggleProductStock(prodId, toggle.checked);
      }
    });

    el.productsTableBody.addEventListener('click', e => {
      const editBtn = e.target.closest('[data-edit-prod]');
      if (editBtn) {
        const prodId = editBtn.getAttribute('data-edit-prod');
        const prod = state.products.find(p => p.id === prodId);
        if (prod) openProductModal(prod);
        return;
      }

      const delBtn = e.target.closest('[data-delete-prod]');
      if (delBtn) {
        const prodId = delBtn.getAttribute('data-delete-prod');
        const prod = state.products.find(p => p.id === prodId);
        if (prod) promptDelete('product', prod.id, prod.title);
      }
    });

    // Product Modal
    el.modalProductClose.addEventListener('click', closeProductModal);
    el.modalProductCancel.addEventListener('click', closeProductModal);
    el.productForm.addEventListener('submit', handleProductSubmit);

    // Image Upload
    el.prodFormFileUpload.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) {
        handleImageFileSelection(e.target.files[0]);
      }
    });

    // Orders Tab Actions
    el.btnRefreshOrders.addEventListener('click', async () => {
      try {
        state.orders = (await api('/api/orders')) || [];
        renderDashboard();
        renderOrdersList();
        showToast('Orders refreshed', 'info');
      } catch (e) {
        showToast('Failed to refresh orders: ' + e.message, 'error');
      }
    });

    if (el.btnRefreshCustomers) {
      el.btnRefreshCustomers.addEventListener('click', async () => {
        try {
          state.customers = (await api('/api/admin/customers')) || [];
          renderCustomersList();
          showToast('VIP Patrons refreshed', 'info');
        } catch (e) {
          showToast('Failed to refresh patrons: ' + e.message, 'error');
        }
      });
    }

    el.orderStatusFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.orderStatusFilterBtns.forEach(b => {
          b.classList.remove('active', 'bg-[#b88a44]/20', 'text-[#b88a44]', 'border-[#b88a44]/40');
          b.classList.add('bg-[#141210]', 'text-[#A49B91]');
        });
        btn.classList.add('active', 'bg-[#b88a44]/20', 'text-[#b88a44]', 'border-[#b88a44]/40');
        btn.classList.remove('bg-[#141210]', 'text-[#A49B91]');

        state.orderStatusFilter = btn.getAttribute('data-status') || 'all';
        renderOrdersList();
      });
    });

    // Order status dropdown change delegation
    el.ordersCardsContainer.addEventListener('change', e => {
      const select = e.target.closest('[data-order-status-select]');
      if (select) {
        const orderId = select.getAttribute('data-order-status-select');
        updateOrderStatus(orderId, select.value);
      }
    });

    // Overview direct chat button
    el.overviewRecentOrders.addEventListener('click', e => {
      const chatBtn = e.target.closest('[data-order-chat]');
      if (chatBtn) {
        const orderId = chatBtn.getAttribute('data-order-chat');
        const order = state.orders.find(o => o.id === orderId);
        if (order) {
          const phone = (order.customerPhone || '').replace(/\D/g, '');
          const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
            `Hello ${order.customerName || 'Valued Patron'}, this is TCJ Concierge regarding your order #${order.id}.`
          )}`;
          window.open(waUrl, '_blank');
        }
      }
    });

    // Categories Tab Actions
    el.btnAddCategory.addEventListener('click', openCategoryModal);
    el.modalCategoryClose.addEventListener('click', closeCategoryModal);
    el.modalCategoryCancel.addEventListener('click', closeCategoryModal);
    el.categoryForm.addEventListener('submit', handleCategorySubmit);

    el.categoriesGrid.addEventListener('click', e => {
      const delBtn = e.target.closest('[data-delete-cat]');
      if (delBtn) {
        const catId = delBtn.getAttribute('data-delete-cat');
        const cat = state.categories.find(c => c.id === catId);
        if (cat) promptDelete('category', cat.id, cat.name);
      }
    });

    // Settings Submit
    el.settingsForm.addEventListener('submit', handleSettingsSubmit);

    // Delete Confirmation Modal
    el.confirmModalCancel.addEventListener('click', () => {
      el.modalConfirm.classList.add('hidden');
      state.deleteTarget = null;
    });
    el.confirmModalProceed.addEventListener('click', executeDelete);

    // Global Escape Key to close modals
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeProductModal();
        closeCategoryModal();
        el.modalConfirm.classList.add('hidden');
      }
    });
  }

  // --- Initialize App ---
  function init() {
    setupEventListeners();
    checkAuthOnStartup();
    if (window.lucide) lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
