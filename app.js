/**
 * DUNLOP PIUTANG - SENIOR-FRIENDLY APPLICATION
 * PT. Indo Bali Satya Graha
 */

// Application Constants
const APP_PASSWORD = "mihardjo";

// Global State
let piutangData = null;
let currentCategoryId = null;
let currentStoreKode = null;
let categorySortOrder = 'total-desc';
let activeCategoryFilterText = '';

// Number Formatter (Thousand separator, 0 decimals, without 'Rp' prefix)
function formatRupiah(num) {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString('id-ID');
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initPreferences();
  loadData();
  setupHashRouting();

  // Check Authentication
  if (!isAuthenticated()) {
    showLoginView();
  } else {
    onLoginSuccess(false);
  }
});

// ==========================================================================
// PREFERENCES (DEFAULT: MODE MALAM & UKURAN NORMAL)
// ==========================================================================

function initPreferences() {
  // Default font size: normal (paling kecil)
  const savedFont = localStorage.getItem('dunlop_font_size') || 'normal';
  setFontSize(savedFont);

  // Default theme: soft-dark (mode malam)
  const savedTheme = localStorage.getItem('dunlop_theme') || 'soft-dark';
  applyTheme(savedTheme);
}

function setFontSize(size) {
  document.body.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
  document.body.classList.add(`font-size-${size}`);
  
  document.getElementById('btnZoomNormal')?.classList.toggle('active', size === 'normal');
  document.getElementById('btnZoomLarge')?.classList.toggle('active', size === 'large');
  document.getElementById('btnZoomXLarge')?.classList.toggle('active', size === 'xlarge');
  
  localStorage.setItem('dunlop_font_size', size);
}

function toggleTheme() {
  const isDark = document.body.classList.contains('theme-soft-dark');
  applyTheme(isDark ? 'soft-light' : 'soft-dark');
}

function applyTheme(theme) {
  if (theme === 'soft-dark') {
    document.body.classList.remove('theme-soft-light');
    document.body.classList.add('theme-soft-dark');
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    if (icon) icon.textContent = '☀️';
    if (text) text.textContent = 'Siang';
  } else {
    document.body.classList.remove('theme-soft-dark');
    document.body.classList.add('theme-soft-light');
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    if (icon) icon.textContent = '🌙';
    if (text) text.textContent = 'Malam';
  }
  localStorage.setItem('dunlop_theme', theme);
}

// ==========================================================================
// AUTHENTICATION (PASSWORD: "mihardjo")
// ==========================================================================

function isAuthenticated() {
  return localStorage.getItem('dunlop_auth') === 'true' || sessionStorage.getItem('dunlop_auth') === 'true';
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const inputEl = document.getElementById('inputPassword');
  const errorEl = document.getElementById('loginErrorMsg');
  const rememberCheckbox = document.getElementById('rememberMeCheckbox');
  const enteredPass = (inputEl.value || '').trim();

  // Case-insensitive comparison for elderly convenience
  if (enteredPass.toLowerCase() === APP_PASSWORD.toLowerCase()) {
    // Success
    errorEl.style.display = 'none';
    inputEl.classList.remove('has-error');

    if (rememberCheckbox && rememberCheckbox.checked) {
      localStorage.setItem('dunlop_auth', 'true');
    } else {
      sessionStorage.setItem('dunlop_auth', 'true');
    }

    onLoginSuccess(true);
  } else {
    // Fail
    errorEl.style.display = 'block';
    inputEl.classList.add('has-error');
    inputEl.focus();
    inputEl.select();
  }
}

function onLoginSuccess(animate = true) {
  // Show admin & logout buttons in header
  const btnLogout = document.getElementById('btnLogout');
  const btnAdmin = document.getElementById('btnAdmin');
  if (btnLogout) btnLogout.style.display = 'inline-flex';
  if (btnAdmin) btnAdmin.style.display = 'inline-flex';

  // Hide login view
  const viewLogin = document.getElementById('viewLogin');
  if (viewLogin) viewLogin.style.display = 'none';

  // Process route
  handleInitialRoute();
}

function showLoginView() {
  // Hide all panels
  document.getElementById('viewLogin').style.display = 'flex';
  document.getElementById('viewDashboard').style.display = 'none';
  document.getElementById('viewCategory').style.display = 'none';
  document.getElementById('viewStore').style.display = 'none';

  // Hide sticky bar, admin & logout
  updateStickyBar(false);
  const btnLogout = document.getElementById('btnLogout');
  const btnAdmin = document.getElementById('btnAdmin');
  if (btnLogout) btnLogout.style.display = 'none';
  if (btnAdmin) btnAdmin.style.display = 'none';

  const inputEl = document.getElementById('inputPassword');
  if (inputEl) {
    inputEl.value = '';
    inputEl.classList.remove('has-error');
    inputEl.focus();
  }
  const errorEl = document.getElementById('loginErrorMsg');
  if (errorEl) errorEl.style.display = 'none';
}

function handleLogout() {
  if (confirm('Apakah Anda ingin keluar dan mengunci layar?')) {
    localStorage.removeItem('dunlop_auth');
    sessionStorage.removeItem('dunlop_auth');
    window.location.hash = '';
    showLoginView();
  }
}

function togglePasswordVisibility() {
  const inputEl = document.getElementById('inputPassword');
  const btnEl = document.getElementById('btnTogglePassword');
  if (!inputEl) return;

  if (inputEl.type === 'password') {
    inputEl.type = 'text';
    btnEl.textContent = '🙈';
    btnEl.title = 'Sembunyikan Kata Sandi';
  } else {
    inputEl.type = 'password';
    btnEl.textContent = '👁️';
    btnEl.title = 'Lihat Kata Sandi';
  }
}

// ==========================================================================
// DATA LOADING
// ==========================================================================

function loadData() {
  // 1. Check local storage first (for custom uploaded monthly data)
  const localDb = localStorage.getItem('dunlop_custom_data');
  if (localDb) {
    try {
      piutangData = JSON.parse(localDb);
      console.log('Loaded custom data from localStorage');
      renderDashboard();
      if (isAuthenticated()) handleInitialRoute();
      return;
    } catch (e) {
      console.error('Error parsing local storage data', e);
    }
  }

  // 2. Check window.PIUTANG_DATA (embedded fallback via data.js)
  if (window.PIUTANG_DATA) {
    piutangData = window.PIUTANG_DATA;
    console.log('Loaded data from window.PIUTANG_DATA');
    renderDashboard();
    if (isAuthenticated()) handleInitialRoute();
    return;
  }

  // 3. Fallback to fetch data.json
  fetch('data.json')
    .then(res => res.json())
    .then(data => {
      piutangData = data;
      renderDashboard();
      if (isAuthenticated()) handleInitialRoute();
    })
    .catch(err => {
      console.error('Could not load data.json', err);
    });
}

// ==========================================================================
// ROUTING & NAVIGATION (EXACT BACK BUTTON & ROUTE GUARD)
// ==========================================================================

function setupHashRouting() {
  window.addEventListener('hashchange', () => {
    if (!isAuthenticated()) {
      showLoginView();
      return;
    }
    processHashRoute(window.location.hash);
  });
}

function handleInitialRoute() {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }
  if (window.location.hash) {
    processHashRoute(window.location.hash);
  } else {
    showDashboardView();
  }
}

function processHashRoute(hash) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  if (!hash || hash === '#' || hash === '#/' || hash === '#dashboard') {
    showDashboardView(false);
    return;
  }

  const parts = hash.replace(/^#\/?/, '').split('/');
  const route = parts[0];

  if (route === 'category') {
    const catId = parts[1];
    showCategoryView(catId, false);
  } else if (route === 'store') {
    const storeParam = parts[1] || '';
    const [kode, queryStr] = storeParam.split('?');
    const urlParams = new URLSearchParams(queryStr || '');
    const fromCat = urlParams.get('cat') || null;
    showStoreDetailView(kode, fromCat, false);
  }
}

function navigateTo(hash, pushState = true) {
  if (pushState) {
    window.location.hash = hash;
  } else {
    window.location.replace(hash);
  }
}

function navigateBack() {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  if (currentStoreKode) {
    if (currentCategoryId) {
      navigateTo(`#/category/${currentCategoryId}`);
    } else {
      navigateTo('#/');
    }
  } else if (currentCategoryId) {
    navigateTo('#/');
  } else {
    navigateTo('#/');
  }
}

function updateStickyBar(visible, backLabel, breadcrumb) {
  const bar = document.getElementById('stickyNavBar');
  const label = document.getElementById('backButtonLabel');
  const bread = document.getElementById('breadcrumbText');

  if (visible) {
    bar.style.display = 'flex';
    label.textContent = backLabel || 'KEMBALI';
    bread.textContent = breadcrumb || '';
  } else {
    bar.style.display = 'none';
  }
}

// ==========================================================================
// VIEW 1: DASHBOARD
// ==========================================================================

function showDashboardView(updateUrl = true) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  currentCategoryId = null;
  currentStoreKode = null;

  document.getElementById('viewLogin').style.display = 'none';
  document.getElementById('viewDashboard').style.display = 'flex';
  document.getElementById('viewCategory').style.display = 'none';
  document.getElementById('viewStore').style.display = 'none';

  updateStickyBar(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (updateUrl && window.location.hash !== '#/') {
    window.location.hash = '#/';
  }
}

function renderDashboard() {
  if (!piutangData) return;

  const meta = piutangData.meta || {};
  const cats = piutangData.categories || {};
  const grandTotal = meta.grandTotal || 0;

  // Headers
  if (meta.company) document.getElementById('headerCompanyTitle').textContent = meta.company;
  if (meta.period) document.getElementById('headerPeriodTitle').textContent = `Laporan Piutang • Per ${meta.period}`;

  // Grand Total Card
  document.getElementById('dashboardGrandTotal').textContent = formatRupiah(grandTotal);
  document.getElementById('dashboardTotalStores').textContent = meta.totalStores || (piutangData.stores?.length || 0);
  document.getElementById('dashboardTotalInvoices').textContent = (meta.totalInvoices || 0).toLocaleString('id-ID');

  const catKeys = [
    { key: 'lt30', label: '< 30 Hari' },
    { key: '31_60', label: '31 - 60 Hari' },
    { key: '61_90', label: '61 - 90 Hari' },
    { key: '91_120', label: '91 - 120 Hari' },
    { key: 'gt120', label: '> 120 Hari' }
  ];

  catKeys.forEach(({ key, label }) => {
    const cat = cats[key] || {};
    const catTotal = cat.total || 0;
    const pct = grandTotal > 0 ? (catTotal / grandTotal) * 100 : 0;
    const pctFormatted = pct.toFixed(1).replace('.', ',') + '%';

    // 1. Text Total & Store/Invoice Meta
    const totalEl = document.getElementById(`catTotal_${key}`);
    const metaEl = document.getElementById(`catMeta_${key}`);
    if (totalEl) totalEl.textContent = formatRupiah(catTotal);
    if (metaEl) metaEl.textContent = `${cat.stores?.length || 0} Toko • ${(cat.invoiceCount || 0).toLocaleString('id-ID')} Nota`;

    // 2. Percentage Badges on Category Cards
    const catPctEl = document.getElementById(`catPct_${key}`);
    if (catPctEl) catPctEl.textContent = pctFormatted;

    // 3. Progress Bar inside Category Cards
    const catProgEl = document.getElementById(`catProgressBar_${key}`);
    if (catProgEl) catProgEl.style.width = `${pct.toFixed(2)}%`;

    // 4. Distribution Stacked Bar
    const segBarEl = document.getElementById(`segBar_${key}`);
    if (segBarEl) {
      segBarEl.style.width = `${pct.toFixed(2)}%`;
      segBarEl.textContent = pctFormatted;
      segBarEl.title = `${label}: ${pctFormatted} (${formatRupiah(catTotal)})`;
    }

    // 5. Distribution Legend Badge
    const distPctEl = document.getElementById(`distPct_${key}`);
    if (distPctEl) distPctEl.textContent = pctFormatted;
  });
}

// Global Search
function handleGlobalSearch(query) {
  const container = document.getElementById('globalSearchResults');
  const btnClear = document.getElementById('btnClearSearch');
  
  if (!query || query.trim() === '') {
    container.innerHTML = '';
    btnClear.style.display = 'none';
    return;
  }

  btnClear.style.display = 'block';
  const q = query.trim().toLowerCase();

  const matches = (piutangData.stores || []).filter(s => 
    s.namaToko.toLowerCase().includes(q) || s.kode.includes(q)
  );

  if (matches.length === 0) {
    container.innerHTML = `<div style="padding:14px; text-align:center; color:var(--text-muted); font-weight:700;">Tidak ditemukan toko dengan kata kunci "${query}".</div>`;
    return;
  }

  container.innerHTML = matches.slice(0, 15).map(s => `
    <div class="search-result-item" onclick="openStoreDetail('${s.kode}')">
      <div>
        <div class="search-result-store">${s.namaToko}</div>
        <div style="font-size:0.85em; color:var(--text-muted); font-weight:600;">Kode: ${s.kode} • ${s.invoiceCount} Nota</div>
      </div>
      <div style="text-align:right;">
        <div class="search-result-amount">${formatRupiah(s.totalPiutang)}</div>
        <div style="font-size:0.85em; color:var(--color-brand-primary); font-weight:800;">Buka Toko →</div>
      </div>
    </div>
  `).join('');
}

function clearGlobalSearch() {
  document.getElementById('globalStoreSearch').value = '';
  handleGlobalSearch('');
}

// ==========================================================================
// VIEW 2: CATEGORY STORE LIST (5 CATEGORIES)
// ==========================================================================

function openCategory(catId) {
  navigateTo(`#/category/${catId}`);
}

function showCategoryView(catId, updateUrl = true) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  currentCategoryId = catId;
  currentStoreKode = null;
  activeCategoryFilterText = '';

  document.getElementById('viewLogin').style.display = 'none';
  document.getElementById('viewDashboard').style.display = 'none';
  document.getElementById('viewCategory').style.display = 'flex';
  document.getElementById('viewStore').style.display = 'none';

  let catTitle = '';
  let catTagClass = 'tag-green';
  let catTotal = 0;
  let catSubinfo = '';
  let catPctStr = '';
  let storesList = [];
  const grandTotal = piutangData.meta?.grandTotal || 0;

  if (catId === 'all') {
    catTitle = 'Semua Toko Terdaftar';
    catTagClass = 'tag-blue';
    catTotal = grandTotal;
    catPctStr = '100%';
    catSubinfo = 'Daftar seluruh 82 toko piutang';
    storesList = (piutangData.stores || []).map(s => ({
      kode: s.kode,
      namaToko: s.namaToko,
      total: s.totalPiutang,
      invoiceCount: s.invoiceCount,
      minAge: Math.min(...s.invoices.map(i => i.umurHari || 0)),
      maxAge: Math.max(...s.invoices.map(i => i.umurHari || 0))
    }));
  } else {
    const catData = piutangData.categories[catId] || {};
    catTitle = catData.label || 'Kategori Piutang';
    catTotal = catData.total || 0;
    const pct = grandTotal > 0 ? (catTotal / grandTotal) * 100 : 0;
    catPctStr = pct.toFixed(1).replace('.', ',') + '%';
    catSubinfo = `${catData.sublabel || ''} • Porsi: ${catPctStr} dari Total Piutang`;
    storesList = catData.stores || [];

    if (catId === 'lt30') catTagClass = 'tag-green';
    else if (catId === '31_60') catTagClass = 'tag-blue';
    else if (catId === '61_90') catTagClass = 'tag-orange';
    else if (catId === '91_120') catTagClass = 'tag-rose';
    else if (catId === 'gt120') catTagClass = 'tag-darkred';
  }

  // Render Banner
  const tagEl = document.getElementById('categoryBannerTag');
  tagEl.textContent = catId === 'all' ? 'SEMUA TOKO' : catTitle.toUpperCase();
  tagEl.className = `banner-tag ${catTagClass}`;

  const pctBadgeEl = document.getElementById('categoryBannerPct');
  if (pctBadgeEl) {
    pctBadgeEl.textContent = catPctStr;
  }

  document.getElementById('categoryStoreCount').textContent = `${storesList.length} Toko`;
  document.getElementById('categoryBannerTitle').textContent = `Daftar Toko (${catTitle})`;
  document.getElementById('categoryBannerTotal').textContent = formatRupiah(catTotal);
  document.getElementById('categoryBannerSubinfo').textContent = catSubinfo;

  const searchInput = document.getElementById('catSearchInput');
  if (searchInput) searchInput.value = '';

  renderCategoryStoresList(storesList);

  updateStickyBar(true, '← KEMBALI KE DASHBOARD', `Dashboard > Kategori ${catTitle}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (updateUrl) {
    navigateTo(`#/category/${catId}`, false);
  }
}

function renderCategoryStoresList(stores) {
  const container = document.getElementById('categoryStoreList');
  if (!container) return;

  if (!stores || stores.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; background: var(--bg-card); border-radius: 12px; border: 2px dashed var(--border-color);">
        <p style="font-size: 1.1em; font-weight: 700; color: var(--text-muted);">Tidak ada toko yang sesuai.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = stores.map((s, index) => {
    let ageStr = '';
    if (s.minAge === s.maxAge) {
      ageStr = `${s.minAge} hari`;
    } else {
      ageStr = `${s.minAge} - ${s.maxAge} hari`;
    }

    return `
      <article class="store-card" onclick="openStoreDetail('${s.kode}', '${currentCategoryId}')">
        <div class="store-card-header">
          <div class="store-card-name">${index + 1}. ${s.namaToko}</div>
          <span class="store-card-code">${s.kode}</span>
        </div>
        <div class="store-card-middle">
          <div class="store-card-amount">${formatRupiah(s.total)}</div>
          <div class="store-card-age">⏱️ Usia: <strong>${ageStr}</strong></div>
        </div>
        <div class="store-card-footer">
          <span class="store-card-invoices">📄 ${s.invoiceCount} Nota Tagihan</span>
          <span class="btn-detail-link">Lihat Nota Toko →</span>
        </div>
      </article>
    `;
  }).join('');
}

function filterCategoryStores(query) {
  activeCategoryFilterText = query.trim().toLowerCase();
  applyCategoryFilterAndSort();
}

function sortCategoryStores(sortVal) {
  categorySortOrder = sortVal;
  applyCategoryFilterAndSort();
}

function applyCategoryFilterAndSort() {
  if (!currentCategoryId || !piutangData) return;

  let rawList = [];
  if (currentCategoryId === 'all') {
    rawList = (piutangData.stores || []).map(s => ({
      kode: s.kode,
      namaToko: s.namaToko,
      total: s.totalPiutang,
      invoiceCount: s.invoiceCount,
      minAge: Math.min(...s.invoices.map(i => i.umurHari || 0)),
      maxAge: Math.max(...s.invoices.map(i => i.umurHari || 0))
    }));
  } else {
    rawList = (piutangData.categories[currentCategoryId]?.stores || []);
  }

  // Filter
  let filtered = rawList;
  if (activeCategoryFilterText) {
    filtered = rawList.filter(s => 
      s.namaToko.toLowerCase().includes(activeCategoryFilterText) || 
      s.kode.includes(activeCategoryFilterText)
    );
  }

  // Sort
  filtered.sort((a, b) => {
    if (categorySortOrder === 'total-desc') return b.total - a.total;
    if (categorySortOrder === 'name-asc') return a.namaToko.localeCompare(b.namaToko);
    if (categorySortOrder === 'age-desc') return b.maxAge - a.maxAge;
    if (categorySortOrder === 'count-desc') return b.invoiceCount - a.invoiceCount;
    return 0;
  });

  renderCategoryStoresList(filtered);
}

// ==========================================================================
// VIEW 3: STORE DETAIL (5 CATEGORY GROUPS)
// ==========================================================================

function openStoreDetail(kode, fromCat) {
  let hash = `#/store/${kode}`;
  if (fromCat) {
    hash += `?cat=${fromCat}`;
  }
  navigateTo(hash);
}

function showStoreDetailView(kode, fromCat, updateUrl = true) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  currentStoreKode = kode;
  if (fromCat) currentCategoryId = fromCat;

  document.getElementById('viewLogin').style.display = 'none';
  document.getElementById('viewDashboard').style.display = 'none';
  document.getElementById('viewCategory').style.display = 'none';
  document.getElementById('viewStore').style.display = 'flex';

  const store = (piutangData.stores || []).find(s => s.kode === kode);
  if (!store) {
    alert('Toko tidak ditemukan!');
    navigateBack();
    return;
  }

  // Header
  document.getElementById('storeDetailCode').textContent = `KODE TOKO: ${store.kode}`;
  document.getElementById('storeDetailName').textContent = store.namaToko;
  document.getElementById('storeDetailTotal').textContent = formatRupiah(store.totalPiutang);
  document.getElementById('storeDetailMeta').textContent = `Total ${store.invoiceCount} Nota Tagihan`;

  // Render 5 Category Groups for this Store
  renderStoreBucketGroups(store);

  // Sticky Back Bar
  const backLabel = currentCategoryId ? '← KEMBALI KE DAFTAR TOKO' : '← KEMBALI KE DASHBOARD';
  const breadcrumb = currentCategoryId 
    ? `Kategori > ${store.namaToko}`
    : `Dashboard > ${store.namaToko}`;
  updateStickyBar(true, backLabel, breadcrumb);

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (updateUrl) {
    let hash = `#/store/${kode}`;
    if (currentCategoryId) hash += `?cat=${currentCategoryId}`;
    navigateTo(hash, false);
  }
}

function renderStoreBucketGroups(store) {
  const container = document.getElementById('storeBucketsList');
  if (!container) return;

  const order = ['lt30', '31_60', '61_90', '91_120', 'gt120'];
  const catStyles = {
    'lt30':   { tag: '< 30 HARI',   class: 'tag-green' },
    '31_60':  { tag: '31 - 60 HARI', class: 'tag-blue' },
    '61_90':  { tag: '61 - 90 HARI', class: 'tag-orange' },
    '91_120': { tag: '91 - 120 HARI', class: 'tag-rose' },
    'gt120':  { tag: '> 120 HARI',  class: 'tag-darkred' }
  };

  let html = '';

  order.forEach(catId => {
    const bucket = store.categories[catId];
    if (!bucket || bucket.invoices.length === 0) return;

    const style = catStyles[catId];
    const invoices = bucket.invoices;

    html += `
      <div class="bucket-group">
        <div class="bucket-header">
          <div class="bucket-title-wrap">
            <span class="bucket-tag ${style.class}">${style.tag}</span>
            <span style="font-weight:700; color:var(--text-muted);">${invoices.length} Nota</span>
          </div>
          <div class="bucket-subtotal">${formatRupiah(bucket.total)}</div>
        </div>

        <div class="bucket-invoices-list">
          ${invoices.map((inv) => `
            <div class="invoice-item">
              <div class="invoice-row-main">
                <span class="invoice-amount">${formatRupiah(inv.jumlah)}</span>
                <span class="invoice-age-badge">⏳ ${inv.umurHari} hari</span>
              </div>
              <div class="invoice-row-sub">
                <span class="invoice-meta-date">Nota #${inv.noNota} • Tgl: ${inv.tanggalNota}</span>
                ${inv.ket ? `<span class="invoice-ket">${inv.ket}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ==========================================================================
// VIEW 4: MONTHLY UPDATE & OCR CLIENT-SIDE PARSER
// ==========================================================================

function openUpdateModal() {
  document.getElementById('updateModal').style.display = 'flex';
  const msg = document.getElementById('updateStatusMsg');
  if (msg) msg.style.display = 'none';
}

function closeUpdateModal() {
  document.getElementById('updateModal').style.display = 'none';
}

function closeModalOnBackdrop(e) {
  if (e.target.id === 'updateModal') {
    closeUpdateModal();
  }
}

function handleJsonFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.meta || !data.categories || !data.stores) {
        throw new Error('Format JSON tidak sesuai struktur piutang.');
      }
      applyNewData(data, 'File JSON berhasil dimuat dan diperbarui!');
    } catch (err) {
      showUpdateStatus(`Gagal membaca file: ${err.message}`, false);
    }
  };
  reader.readAsText(file);
}

function parseRawOcrTextarea() {
  const text = document.getElementById('rawOcrTextarea').value;
  if (!text || text.trim().length === 0) {
    showUpdateStatus('Teks OCR masih kosong. Silakan tempel teks OCR laporan.', false);
    return;
  }

  try {
    const parsedDb = parseOcrString(text);
    if (!parsedDb || parsedDb.stores.length === 0) {
      throw new Error('Tidak ada data nota atau toko yang berhasil diparsing. Pastikan format teks laporan sesuai.');
    }
    applyNewData(parsedDb, `Berhasil memproses ${parsedDb.meta.totalStores} Toko & ${parsedDb.meta.totalInvoices} Nota!`);
  } catch (err) {
    showUpdateStatus(`Gagal memproses teks: ${err.message}`, false);
  }
}

function applyNewData(newData, successMsg) {
  piutangData = newData;
  localStorage.setItem('dunlop_custom_data', JSON.stringify(newData));
  renderDashboard();
  showUpdateStatus(successMsg, true);
  setTimeout(() => {
    closeUpdateModal();
    showDashboardView();
  }, 1500);
}

function showUpdateStatus(msg, isSuccess) {
  const el = document.getElementById('updateStatusMsg');
  el.textContent = msg;
  el.className = `update-status-msg ${isSuccess ? 'success' : 'error'}`;
  el.style.display = 'block';
}

function downloadCurrentJson() {
  if (!piutangData) return;
  const jsonStr = JSON.stringify(piutangData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `piutang_${piutangData.meta?.periodDate || 'data'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function restoreOriginalData() {
  if (confirm('Apakah Anda ingin memulihkan ke data asli awal (30 September 2026)?')) {
    localStorage.removeItem('dunlop_custom_data');
    if (window.PIUTANG_DATA) {
      piutangData = window.PIUTANG_DATA;
      renderDashboard();
      showUpdateStatus('Data berhasil dipulihkan ke versi awal!', true);
      setTimeout(() => {
        closeUpdateModal();
        showDashboardView();
      }, 1000);
    } else {
      location.reload();
    }
  }
}

// Client-Side OCR Parser for 5 exact categories
function parseOcrString(text) {
  const lines = text.split(/\r?\n/);
  
  let reportDate = new Date();
  let periodText = 'September 2026';
  for (const l of lines) {
    const m = l.match(/Per\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
    if (m) {
      periodText = m[1];
      break;
    }
  }

  const invoices = [];

  function parseNumber(s) {
    if (!s) return 0;
    const clean = s.trim().replace(/\./g, '').replace(/,/g, '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.round(val);
  }

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line || line.startsWith('==') || line.startsWith('--') || line.startsWith('Kode') || line.startsWith('Grand Total') || line.startsWith('PT.')) {
      return;
    }

    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{2})/);
    if (!dateMatch) return;

    const dateStr = dateMatch[1];
    const parts = line.split(/\s+/);
    const dateIdx = parts.indexOf(dateStr);

    if (dateIdx >= 2) {
      const kode = parts[0];
      const noNota = parts[dateIdx - 1];
      const namaParts = parts.slice(1, dateIdx - 1);
      const namaToko = namaParts.join(' ') || `TOKO ${kode}`;

      const rem = parts.slice(dateIdx + 1);
      if (rem.length >= 6) {
        const b30 = parseNumber(rem[0]);
        const b60 = parseNumber(rem[1]);
        const b90 = parseNumber(rem[2]);
        const b120 = parseNumber(rem[3]);
        const bOver = parseNumber(rem[4]);
        const jumlah = parseNumber(rem[5]);

        let ket = rem.slice(6).join(' ');

        let ageDays = 0;
        const dParts = dateStr.split('/');
        if (dParts.length === 3) {
          const day = parseInt(dParts[0], 10);
          const month = parseInt(dParts[1], 10) - 1;
          const year = 2000 + parseInt(dParts[2], 10);
          const invDate = new Date(year, month, day);
          ageDays = Math.max(0, Math.round((reportDate - invDate) / (1000 * 60 * 60 * 24)));
        }

        const mHari = ket.match(/(\d+)\s*hari/i);
        if (mHari) {
          ageDays = parseInt(mHari[1], 10);
        }

        let catId = 'lt30';
        let catLabel = '< 30 Hari';
        if (b30 > 0) { catId = 'lt30'; catLabel = '< 30 Hari'; }
        else if (b60 > 0) { catId = '31_60'; catLabel = '31 - 60 Hari'; }
        else if (b90 > 0) { catId = '61_90'; catLabel = '61 - 90 Hari'; }
        else if (b120 > 0) { catId = '91_120'; catLabel = '91 - 120 Hari'; }
        else if (bOver > 0) { catId = 'gt120'; catLabel = '> 120 Hari'; }

        invoices.push({
          kode,
          namaToko,
          noNota,
          tanggalNota: dateStr,
          umurHari: ageDays,
          b30, b60, b90, b120, bOver120: bOver,
          jumlah,
          ket,
          catId,
          catLabel
        });
      }
    }
  });

  const storeMap = {};
  invoices.forEach(inv => {
    if (!storeMap[inv.kode]) {
      storeMap[inv.kode] = {
        kode: inv.kode,
        namaToko: inv.namaToko,
        totalPiutang: 0,
        invoiceCount: 0,
        invoices: [],
        categories: {
          'lt30':   { id: 'lt30',   label: '< 30 Hari',   total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          '31_60':  { id: '31_60',  label: '31 - 60 Hari', total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          '61_90':  { id: '61_90',  label: '61 - 90 Hari', total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          '91_120': { id: '91_120', label: '91 - 120 Hari', total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          'gt120':  { id: 'gt120',  label: '> 120 Hari',  total: 0, minAge: 99999, maxAge: 0, invoices: [] }
        }
      };
    }

    const s = storeMap[inv.kode];
    if (s.namaToko.startsWith('TOKO ') && !inv.namaToko.startsWith('TOKO ')) {
      s.namaToko = inv.namaToko;
    }

    s.totalPiutang += inv.jumlah;
    s.invoiceCount++;
    s.invoices.push(inv);

    const c = s.categories[inv.catId];
    c.total += inv.jumlah;
    if (inv.umurHari < c.minAge) c.minAge = inv.umurHari;
    if (inv.umurHari > c.maxAge) c.maxAge = inv.umurHari;
    c.invoices.push(inv);
  });

  Object.values(storeMap).forEach(s => {
    Object.values(s.categories).forEach(c => {
      if (c.invoices.length === 0) c.minAge = 0;
    });
  });

  const catSummary = {
    'lt30':   { id: 'lt30',   label: '< 30 Hari',   sublabel: 'Usia 0 - 30 hari',   total: 0, invoiceCount: 0, stores: [] },
    '31_60':  { id: '31_60',  label: '31 - 60 Hari', sublabel: 'Usia 31 - 60 hari',  total: 0, invoiceCount: 0, stores: [] },
    '61_90':  { id: '61_90',  label: '61 - 90 Hari', sublabel: 'Usia 61 - 90 hari',  total: 0, invoiceCount: 0, stores: [] },
    '91_120': { id: '91_120', label: '91 - 120 Hari', sublabel: 'Usia 91 - 120 hari', total: 0, invoiceCount: 0, stores: [] },
    'gt120':  { id: 'gt120',  label: '> 120 Hari',  sublabel: 'Usia lebih dari 120 hari', total: 0, invoiceCount: 0, stores: [] }
  };

  Object.values(storeMap).forEach(s => {
    ['lt30', '31_60', '61_90', '91_120', 'gt120'].forEach(catId => {
      const sc = s.categories[catId];
      if (sc.total > 0) {
        const cSum = catSummary[catId];
        cSum.total += sc.total;
        cSum.invoiceCount += sc.invoices.length;
        cSum.stores.push({
          kode: s.kode,
          namaToko: s.namaToko,
          total: sc.total,
          invoiceCount: sc.invoices.length,
          minAge: sc.minAge,
          maxAge: sc.maxAge
        });
      }
    });
  });

  Object.values(catSummary).forEach(c => {
    c.stores.sort((a, b) => b.total - a.total);
  });

  const storesList = Object.values(storeMap).sort((a, b) => b.totalPiutang - a.totalPiutang);
  const grandTotal = invoices.reduce((sum, i) => sum + i.jumlah, 0);

  return {
    meta: {
      company: 'PT. INDO BALI SATYA GRAHA',
      address: 'Jl. Gatot Subroto Barat Denpasar',
      period: periodText,
      grandTotal,
      totalInvoices: invoices.length,
      totalStores: storesList.length
    },
    categories: catSummary,
    stores: storesList
  };
}
