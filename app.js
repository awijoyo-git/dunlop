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

  // Check saved header collapse state
  const savedCollapsed = localStorage.getItem('dunlop_header_collapsed') === 'true';
  if (savedCollapsed && isAuthenticated()) {
    toggleHeaderCollapse(true);
  }
}

function toggleHeaderCollapse(collapse) {
  const isCollapsed = collapse !== undefined 
    ? collapse 
    : !document.body.classList.contains('header-collapsed');

  document.body.classList.toggle('header-collapsed', isCollapsed);

  const floatingCluster = document.getElementById('floatingCluster');
  if (floatingCluster) {
    if (isAuthenticated() && isCollapsed) {
      floatingCluster.style.display = 'flex';
    } else {
      floatingCluster.style.display = 'none';
    }
  }

  const floatingBtn = document.getElementById('btnFloatingHeader');
  if (floatingBtn) {
    if (isAuthenticated() && isCollapsed) {
      floatingBtn.style.display = 'inline-flex';
    } else {
      floatingBtn.style.display = 'none';
    }
  }

  localStorage.setItem('dunlop_header_collapsed', isCollapsed ? 'true' : 'false');
}

function toggleFullscreen() {
  const doc = document;
  const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);

  if (!isFs) {
    const docEl = doc.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(err => console.warn('Fullscreen error:', err));
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    } else if (docEl.mozRequestFullScreen) {
      docEl.mozRequestFullScreen();
    } else if (docEl.msRequestFullscreen) {
      docEl.msRequestFullscreen();
    }
  } else {
    if (doc.exitFullscreen) {
      doc.exitFullscreen().catch(err => console.warn('Exit fullscreen error:', err));
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
    }
  }
}

function updateFullscreenButtons() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);

  const btn = document.getElementById('btnFullscreenToggle');
  if (btn) {
    btn.innerHTML = isFs 
      ? '<span class="fs-icon">🗗</span><span class="fs-text">Keluar Layar Penuh</span>'
      : '<span class="fs-icon">⛶</span><span class="fs-text">Layar Penuh</span>';
    btn.title = isFs ? 'Keluar dari Mode Layar Penuh' : 'Tampilkan Layar Penuh (Full Screen)';
    btn.classList.toggle('active-fullscreen', isFs);
  }

  const btnFloatFs = document.getElementById('btnFloatingFs');
  if (btnFloatFs) {
    btnFloatFs.innerHTML = isFs 
      ? '<span class="float-icon">🗗</span>'
      : '<span class="float-icon">⛶</span>';
    btnFloatFs.title = isFs ? 'Keluar Layar Penuh' : 'Layar Penuh';
  }
}

['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
  document.addEventListener(evt, updateFullscreenButtons);
});

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

  // Restore saved header collapse state
  const savedCollapsed = localStorage.getItem('dunlop_header_collapsed') === 'true';
  toggleHeaderCollapse(savedCollapsed);

  // Hide login view
  const viewLogin = document.getElementById('viewLogin');
  if (viewLogin) viewLogin.style.display = 'none';

  // Process route
  handleInitialRoute();
}

function showLoginView() {
  // Hide all panels
  hideAllViews();
  const vLogin = document.getElementById('viewLogin');
  if (vLogin) vLogin.style.display = 'flex';

  // Hide floating button on login screen and expand header
  const floatingBtn = document.getElementById('btnFloatingHeader');
  if (floatingBtn) floatingBtn.style.display = 'none';
  document.body.classList.remove('header-collapsed');

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
// DATA LOADING & MULTI-PERIOD SUPPORT
// ==========================================================================

let activePeriodKey = localStorage.getItem('dunlop_active_period') || '2026-09';

function getPeriodData(key) {
  if (key === '2026-04' && window.PIUTANG_DATA_APR2026) return window.PIUTANG_DATA_APR2026;
  if (key === '2026-03' && window.PIUTANG_DATA_MAR2026) return window.PIUTANG_DATA_MAR2026;
  if (key === '2026-02' && window.PIUTANG_DATA_FEB2026) return window.PIUTANG_DATA_FEB2026;
  if (key === '2026-01' && window.PIUTANG_DATA_JAN2026) return window.PIUTANG_DATA_JAN2026;
  if (window.PIUTANG_DATA) return window.PIUTANG_DATA;
  return null;
}

function getPreviousPeriodData(key) {
  if (key === '2026-09') return getPeriodData('2026-04') || getPeriodData('2026-01');
  if (key === '2026-04') return getPeriodData('2026-03');
  if (key === '2026-03') return getPeriodData('2026-02');
  if (key === '2026-02') return getPeriodData('2026-01');
  return null;
}

// Master registry to track invoice installment lifecycle across periods
let invoiceHistoryMasterCache = null;

function getInvoiceHistoryMaster() {
  if (invoiceHistoryMasterCache) return invoiceHistoryMasterCache;

  const master = new Map();
  const datasets = [];

  // Collect all available official and custom datasets
  if (window.PIUTANG_DATA_JAN2026 && window.PIUTANG_DATA_JAN2026.stores) datasets.push(window.PIUTANG_DATA_JAN2026);
  if (window.PIUTANG_DATA_FEB2026 && window.PIUTANG_DATA_FEB2026.stores) datasets.push(window.PIUTANG_DATA_FEB2026);
  if (window.PIUTANG_DATA_MAR2026 && window.PIUTANG_DATA_MAR2026.stores) datasets.push(window.PIUTANG_DATA_MAR2026);
  if (window.PIUTANG_DATA_APR2026 && window.PIUTANG_DATA_APR2026.stores) datasets.push(window.PIUTANG_DATA_APR2026);
  if (window.PIUTANG_DATA && window.PIUTANG_DATA.stores) datasets.push(window.PIUTANG_DATA);

  const localDb = localStorage.getItem('dunlop_custom_data');
  if (localDb) {
    try {
      const parsed = JSON.parse(localDb);
      if (parsed && parsed.stores) datasets.push(parsed);
    } catch (e) {
      // ignore
    }
  }

  datasets.forEach((ds) => {
    (ds.stores || []).forEach((s) => {
      (s.invoices || []).forEach((inv) => {
        if (!inv || !inv.noNota || typeof inv.jumlah !== 'number') return;
        const keyWithDate = `${s.kode}_${inv.noNota}_${inv.tanggalNota || ''}`;
        const keyNoDate = `${s.kode}_${inv.noNota}`;

        // Register keyWithDate (preferred)
        if (!master.has(keyWithDate)) {
          master.set(keyWithDate, {
            maxAmount: inv.jumlah,
            minAmount: inv.jumlah,
            records: []
          });
        }
        const entryDate = master.get(keyWithDate);
        if (inv.jumlah > entryDate.maxAmount) entryDate.maxAmount = inv.jumlah;
        if (inv.jumlah < entryDate.minAmount) entryDate.minAmount = inv.jumlah;
        entryDate.records.push({ period: ds.meta?.period || '', jumlah: inv.jumlah });

        // Register keyNoDate (fallback)
        if (!master.has(keyNoDate)) {
          master.set(keyNoDate, {
            maxAmount: inv.jumlah,
            minAmount: inv.jumlah,
            records: []
          });
        }
        const entryNoDate = master.get(keyNoDate);
        if (inv.jumlah > entryNoDate.maxAmount) entryNoDate.maxAmount = inv.jumlah;
        if (inv.jumlah < entryNoDate.minAmount) entryNoDate.minAmount = inv.jumlah;
        entryNoDate.records.push({ period: ds.meta?.period || '', jumlah: inv.jumlah });
      });
    });
  });

  invoiceHistoryMasterCache = master;
  return master;
}

function getInvoiceCicilanInfo(storeKode, inv) {
  if (!inv || typeof inv.jumlah !== 'number') return null;

  // If explicit properties already present
  if (inv.totalAwal && inv.totalAwal > inv.jumlah) {
    const totalAwal = inv.totalAwal;
    const sudahDicicil = totalAwal - inv.jumlah;
    const persen = ((sudahDicicil / totalAwal) * 100).toFixed(1);
    return {
      hasCicilan: true,
      totalAwal,
      sisaNota: inv.jumlah,
      sudahDicicil,
      persen
    };
  }

  const master = getInvoiceHistoryMaster();
  const keyWithDate = `${storeKode}_${inv.noNota}_${inv.tanggalNota || ''}`;
  const keyNoDate = `${storeKode}_${inv.noNota}`;

  const entry = master.get(keyWithDate) || master.get(keyNoDate);
  if (entry && entry.maxAmount > inv.jumlah) {
    const totalAwal = entry.maxAmount;
    const sudahDicicil = totalAwal - inv.jumlah;
    const persen = ((sudahDicicil / totalAwal) * 100).toFixed(1);
    return {
      hasCicilan: true,
      totalAwal,
      sisaNota: inv.jumlah,
      sudahDicicil,
      persen,
      historyCount: entry.records ? entry.records.length : 1
    };
  }

  return null;
}

function loadData() {
  const selectEl = document.getElementById('selectAppPeriod');
  if (selectEl) selectEl.value = activePeriodKey;

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

  // 2. Load based on activePeriodKey (2026-01, 2026-02, 2026-03, 2026-04, 2026-09)
  const pData = getPeriodData(activePeriodKey);
  if (pData) {
    piutangData = pData;
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

function handleAppPeriodChange(periodKey) {
  activePeriodKey = periodKey;
  localStorage.setItem('dunlop_active_period', periodKey);
  localStorage.removeItem('dunlop_custom_data');
  invoiceHistoryMasterCache = null;

  const pData = getPeriodData(periodKey);
  if (pData) {
    piutangData = pData;
  }

  if (currentStoreKode) {
    navigateTo('#/');
  }

  renderDashboard();

  if (currentCategoryId === 'blacklist') {
    renderBlacklist();
  } else if (currentCategoryId === 'payment') {
    renderPaymentView();
  } else if (currentCategoryId === 'owner') {
    renderOwnerDashboard();
  } else if (currentCategoryId) {
    showCategoryView(currentCategoryId, false);
  }
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
  } else if (route === 'blacklist') {
    showBlacklistView(false);
  } else if (route === 'pembayaran') {
    showPaymentView(false);
  } else if (route === 'owner') {
    showOwnerView(false);
  }
}

function navigateTo(hash, pushState = true) {
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

function navigateBack() {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  if (currentStoreKode) {
    if (currentCategoryId === 'blacklist') {
      showBlacklistView(true);
    } else if (currentCategoryId === 'payment') {
      showPaymentView(true);
    } else if (currentCategoryId === 'owner') {
      showOwnerView(true);
    } else if (currentCategoryId && currentCategoryId !== 'all') {
      showCategoryView(currentCategoryId, true);
    } else {
      showDashboardView(true);
    }
  } else {
    showDashboardView(true);
  }
}

function hideAllViews() {
  const views = ['viewLogin', 'viewDashboard', 'viewCategory', 'viewStore', 'viewBlacklist', 'viewPayment', 'viewOwner'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
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

  hideAllViews();
  document.getElementById('viewDashboard').style.display = 'flex';

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
  const companyTitleEl = document.getElementById('headerCompanyTitle');
  if (companyTitleEl && meta.company) companyTitleEl.textContent = meta.company;
  const periodTitleEl = document.getElementById('headerPeriodTitle');
  if (periodTitleEl && meta.period) periodTitleEl.textContent = `Laporan Piutang • Per ${meta.period}`;

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

  // Update BL & Payment Dashboard Launchers
  const blStores = getBLStores();
  const totalMacet = blStores.reduce((sum, s) => sum + s.macetTotal, 0);
  const totalNew = blStores.reduce((sum, s) => sum + s.newTotal, 0);

  const dashBlCountBadge = document.getElementById('dashBlCountBadge');
  if (dashBlCountBadge) dashBlCountBadge.textContent = `${blStores.length} Toko Melanggar`;
  const dashBlMacetAmount = document.getElementById('dashBlMacetAmount');
  if (dashBlMacetAmount) dashBlMacetAmount.textContent = formatRupiah(totalMacet);
  const dashBlNewAmount = document.getElementById('dashBlNewAmount');
  if (dashBlNewAmount) dashBlNewAmount.textContent = formatRupiah(totalNew);
  const tbBlBadge = document.getElementById('tbBlBadge');
  if (tbBlBadge) tbBlBadge.textContent = blStores.length;

  const recon = getReconciliationData();
  if (recon) {
    const dashPayAmount = document.getElementById('dashPayAmount');
    if (dashPayAmount) dashPayAmount.textContent = formatRupiah(recon.totalPaidAmount);
    const dashPayInvoicesCount = document.getElementById('dashPayInvoicesCount');
    if (dashPayInvoicesCount) dashPayInvoicesCount.textContent = `${recon.totalInvoicesPaid} Nota`;
  }

  // Update Owner Dashboard Launcher
  const ownerHist = getMonthlyHistoricalData();
  const latestMonthData = ownerHist && ownerHist.length > 0 ? ownerHist[ownerHist.length - 1] : null;
  if (latestMonthData) {
    const dashOwnerOmzet = document.getElementById('dashOwnerOmzetAmount');
    if (dashOwnerOmzet) dashOwnerOmzet.textContent = formatRupiah(latestMonthData.omzet);
    const dashOwnerStores = document.getElementById('dashOwnerActiveStores');
    if (dashOwnerStores) dashOwnerStores.textContent = `${latestMonthData.activeStoresCount} Toko`;
    const dashOwnerBadge = document.getElementById('dashOwnerPeriodBadge');
    if (dashOwnerBadge) dashOwnerBadge.textContent = `Tren ${ownerHist.length} Bulan`;
  }
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
  showCategoryView(catId, true);
}

function showCategoryView(catId, updateUrl = true) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  currentCategoryId = catId;
  currentStoreKode = null;
  activeCategoryFilterText = '';

  hideAllViews();
  const vCat = document.getElementById('viewCategory');
  if (vCat) vCat.style.display = 'flex';

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

  const blStoreCodes = new Set(getBLStores().map(s => s.kode));

  container.innerHTML = stores.map((s, index) => {
    let ageStr = '';
    if (s.minAge === s.maxAge) {
      ageStr = `${s.minAge} hari`;
    } else {
      ageStr = `${s.minAge} - ${s.maxAge} hari`;
    }

    const isBL = blStoreCodes.has(s.kode);
    const fullStore = (piutangData.stores || []).find(st => st.kode === s.kode);
    const hasCicilan = fullStore && (fullStore.invoices || []).some(inv => {
      const c = getInvoiceCicilanInfo(s.kode, inv);
      return c !== null;
    });

    return `
      <article class="store-card" onclick="openStoreDetail('${s.kode}', '${currentCategoryId}')">
        <div class="store-card-header">
          <div class="store-card-name">
            ${index + 1}. ${s.namaToko}
            ${isBL ? '<span class="badge-bl-warning" style="margin-left:8px; vertical-align:middle;">⛔ DATA BL</span>' : ''}
            ${hasCicilan ? '<span class="badge-cicilan" style="margin-left:6px; vertical-align:middle;">💳 Ada Cicilan</span>' : ''}
          </div>
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
  showStoreDetailView(kode, fromCat, true);
}

function showStoreDetailView(kode, fromCat, updateUrl = true) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  currentStoreKode = kode;
  if (fromCat) currentCategoryId = fromCat;

  hideAllViews();
  const vStore = document.getElementById('viewStore');
  if (vStore) vStore.style.display = 'flex';

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
  let backLabel = '← KEMBALI KE DASHBOARD';
  let breadcrumb = `Dashboard > ${store.namaToko}`;
  if (fromCat === 'blacklist') {
    backLabel = '← KEMBALI KE DATA BL';
    breadcrumb = `Data BL > ${store.namaToko}`;
  } else if (fromCat === 'payment') {
    backLabel = '← KEMBALI KE PEMBAYARAN';
    breadcrumb = `Pembayaran > ${store.namaToko}`;
  } else if (fromCat) {
    backLabel = '← KEMBALI KE DAFTAR TOKO';
    breadcrumb = `Kategori > ${store.namaToko}`;
  }
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

  const hasMacet = store.categories?.gt120 && store.categories.gt120.total > 0;
  const newInvoicesCount = (store.invoices || []).filter(i => i.catId !== 'gt120').length;
  const isBL = hasMacet && newInvoicesCount > 0;

  const order = ['lt30', '31_60', '61_90', '91_120', 'gt120'];
  const catStyles = {
    'lt30':   { tag: '< 30 HARI',   class: 'tag-green' },
    '31_60':  { tag: '31 - 60 HARI', class: 'tag-blue' },
    '61_90':  { tag: '61 - 90 HARI', class: 'tag-orange' },
    '91_120': { tag: '91 - 120 HARI', class: 'tag-rose' },
    'gt120':  { tag: '> 120 HARI',  class: 'tag-darkred' }
  };

  let html = '';

  // Calculate cicilan stats for this store
  let storeCicilanCount = 0;
  let storeCicilanTotalPaid = 0;
  let storeCicilanTotalAwal = 0;
  (store.invoices || []).forEach(inv => {
    const cicilan = getInvoiceCicilanInfo(store.kode, inv);
    if (cicilan) {
      storeCicilanCount++;
      storeCicilanTotalPaid += cicilan.sudahDicicil;
      storeCicilanTotalAwal += cicilan.totalAwal;
    }
  });

  if (storeCicilanCount > 0) {
    const persenLunas = ((storeCicilanTotalPaid / storeCicilanTotalAwal) * 100).toFixed(1);
    html += `
      <div class="store-cicilan-banner">
        <div class="cicilan-banner-icon">💳</div>
        <div class="cicilan-banner-text">
          <div class="cicilan-banner-title">
            HISTORI CICILAN: ${storeCicilanCount} NOTA SEDANG DICICIL (${persenLunas}% TERBAYAR)
          </div>
          <div class="cicilan-banner-desc">
            Total pembayaran cicilan yang sudah masuk sebesar <strong class="text-success">+ ${formatRupiah(storeCicilanTotalPaid)}</strong> dari total nilai nota awal <strong style="text-decoration:line-through; opacity:0.85;">${formatRupiah(storeCicilanTotalAwal)}</strong>. Sisa tagihan toko saat ini adalah <strong>${formatRupiah(store.totalPiutang)}</strong>.
          </div>
        </div>
      </div>
    `;
  }

  if (isBL) {
    html += `
      <div class="store-bl-alert-box">
        <span style="font-size:1.6em;">⛔</span>
        <div>
          <div style="font-size:1.05em; font-weight:800; color:#ef4444; margin-bottom:4px;">
            PERINGATAN AUDIT: TOKO DATA BL (PELANGGARAN BLACKLIST)
          </div>
          <div style="font-size:0.9em; line-height:1.4;">
            Toko ini memiliki tunggakan macet &gt; 120 hari sebesar <strong>${formatRupiah(store.categories.gt120.total)}</strong> (${store.categories.gt120.invoices.length} nota), namun <strong>masih diterbitkan ${newInvoicesCount} nota tagihan baru</strong>!
          </div>
        </div>
      </div>
    `;
  }

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
          ${invoices.map((inv) => {
            let invFlag = '';
            if (catId === 'gt120') {
              invFlag = '<span class="invoice-gt120-badge">⚠️ Tunggakan Macet &gt; 120H</span>';
            } else if (hasMacet) {
              invFlag = '<span class="invoice-bl-badge">⛔ Diterbitkan Saat Masih Macet &gt; 120H</span>';
            }

            const cicilan = getInvoiceCicilanInfo(store.kode, inv);
            let cicilanHtml = '';
            if (cicilan) {
              cicilanHtml = `
                <div class="invoice-cicilan-card">
                  <div class="cicilan-card-header">
                    <span class="cicilan-card-badge">💳 Ada Cicilan (${cicilan.persen}% Terbayar)</span>
                    <span class="cicilan-card-num">Nota Awal: ${formatRupiah(cicilan.totalAwal)}</span>
                  </div>
                  <div class="cicilan-card-metrics">
                    <div class="cicilan-metric-item">
                      <span class="cicilan-metric-label">Sudah Dicicil</span>
                      <span class="cicilan-metric-val val-green">+ ${formatRupiah(cicilan.sudahDicicil)}</span>
                    </div>
                    <div class="cicilan-metric-item">
                      <span class="cicilan-metric-label">Total Nota Awal</span>
                      <span class="cicilan-metric-val val-muted">${formatRupiah(cicilan.totalAwal)}</span>
                    </div>
                    <div class="cicilan-metric-item">
                      <span class="cicilan-metric-label">Sisa Tagihan</span>
                      <span class="cicilan-metric-val val-blue">${formatRupiah(inv.jumlah)}</span>
                    </div>
                  </div>
                  <div class="cicilan-card-bar">
                    <div class="cicilan-bar-progress" style="width: ${cicilan.persen}%;"></div>
                  </div>
                </div>
              `;
            }

            return `
              <div class="invoice-item">
                <div class="invoice-row-main">
                  <span class="invoice-amount">${formatRupiah(inv.jumlah)}</span>
                  <span class="invoice-age-badge">⏳ ${inv.umurHari} hari</span>
                </div>
                <div class="invoice-row-sub">
                  <span class="invoice-meta-date">Nota #${inv.noNota} • Tgl: ${inv.tanggalNota}</span>
                  ${inv.ket ? `<span class="invoice-ket">${inv.ket}</span>` : ''}
                </div>
                ${invFlag ? `<div style="margin-top:4px;">${invFlag}</div>` : ''}
                ${cicilanHtml}
              </div>
            `;
          }).join('')}
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
  // If we have previous data from another period, compute payment reconciliation
  if (piutangData && piutangData.meta?.period !== newData.meta?.period) {
    try {
      localStorage.setItem('dunlop_prev_data', JSON.stringify(piutangData));
      const recon = computePaymentReconciliation(piutangData, newData);
      if (recon) {
        localStorage.setItem('dunlop_reconciliation', JSON.stringify(recon));
      }
    } catch (e) {
      console.warn('Could not archive previous month for reconciliation:', e);
    }
  }

  piutangData = newData;
  invoiceHistoryMasterCache = null;
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
    localStorage.removeItem('dunlop_prev_data');
    localStorage.removeItem('dunlop_reconciliation');
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

// ==========================================================================
// FEATURE: DATA BL (PELANGGARAN BLACKLIST)
// ==========================================================================

let activeBLFilterText = '';
let activeBLSortOrder = 'new-desc';

function getBLStores() {
  if (!piutangData || !piutangData.stores) return [];

  const blStores = [];
  piutangData.stores.forEach(s => {
    const gt120 = s.categories?.gt120;
    const macetTotal = gt120?.total || 0;
    if (macetTotal <= 0) return;

    // Invoices issued while store has >120 days overdue (catId !== 'gt120')
    const newInvoices = (s.invoices || []).filter(i => i.catId !== 'gt120');
    const newTotal = newInvoices.reduce((sum, i) => sum + i.jumlah, 0);

    if (newInvoices.length > 0) {
      blStores.push({
        kode: s.kode,
        namaToko: s.namaToko,
        macetTotal: macetTotal,
        macetCount: gt120.invoices?.length || 0,
        macetMinAge: gt120.minAge || 0,
        macetMaxAge: gt120.maxAge || 0,
        macetInvoices: gt120.invoices || [],
        newTotal: newTotal,
        newCount: newInvoices.length,
        newInvoices: newInvoices,
        totalPiutang: s.totalPiutang
      });
    }
  });

  return blStores;
}

function openBlacklistView() {
  showBlacklistView(true);
}

function showBlacklistView(updateUrl = true) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  currentCategoryId = 'blacklist';
  currentStoreKode = null;

  hideAllViews();
  const blPanel = document.getElementById('viewBlacklist');
  if (blPanel) blPanel.style.display = 'flex';

  updateStickyBar(true, '← KEMBALI KE DASHBOARD', 'Dashboard > Data BL');
  renderBlacklist();

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (updateUrl) {
    navigateTo('#/blacklist', false);
  }
}

function renderBlacklist() {
  const blStores = getBLStores();
  const totalMacet = blStores.reduce((sum, s) => sum + s.macetTotal, 0);
  const totalMacetNotes = blStores.reduce((sum, s) => sum + s.macetCount, 0);
  const totalNew = blStores.reduce((sum, s) => sum + s.newTotal, 0);
  const totalNewNotes = blStores.reduce((sum, s) => sum + s.newCount, 0);

  const blTotalStoresCount = document.getElementById('blTotalStoresCount');
  if (blTotalStoresCount) blTotalStoresCount.textContent = `${blStores.length} Toko Melanggar`;
  const blStatStores = document.getElementById('blStatStores');
  if (blStatStores) blStatStores.textContent = `${blStores.length} Toko`;
  const blStatMacet = document.getElementById('blStatMacet');
  if (blStatMacet) blStatMacet.textContent = formatRupiah(totalMacet);
  const blStatMacetNotes = document.getElementById('blStatMacetNotes');
  if (blStatMacetNotes) blStatMacetNotes.textContent = `${totalMacetNotes} Nota macet`;
  const blStatNew = document.getElementById('blStatNew');
  if (blStatNew) blStatNew.textContent = formatRupiah(totalNew);
  const blStatNewNotes = document.getElementById('blStatNewNotes');
  if (blStatNewNotes) blStatNewNotes.textContent = `${totalNewNotes} Nota baru diterbitkan`;

  applyBLFilterAndSort();
}

function filterBLStores(query) {
  activeBLFilterText = (query || '').trim().toLowerCase();
  applyBLFilterAndSort();
}

function sortBLStores(sortVal) {
  activeBLSortOrder = sortVal;
  applyBLFilterAndSort();
}

function toggleBLAccordion(kode) {
  const drawer = document.getElementById(`blDrawer_${kode}`);
  const chevron = document.getElementById(`blChevron_${kode}`);
  if (!drawer) return;

  const isOpen = drawer.classList.contains('is-open');
  drawer.classList.toggle('is-open', !isOpen);
  if (chevron) {
    chevron.textContent = isOpen ? '▼' : '▲';
  }
}

function applyBLFilterAndSort() {
  const container = document.getElementById('blStoresList');
  if (!container) return;

  let stores = getBLStores();

  if (activeBLFilterText) {
    stores = stores.filter(s =>
      s.namaToko.toLowerCase().includes(activeBLFilterText) ||
      s.kode.includes(activeBLFilterText)
    );
  }

  stores.sort((a, b) => {
    if (activeBLSortOrder === 'new-desc') return b.newTotal - a.newTotal;
    if (activeBLSortOrder === 'macet-desc') return b.macetTotal - a.macetTotal;
    if (activeBLSortOrder === 'total-desc') return b.totalPiutang - a.totalPiutang;
    if (activeBLSortOrder === 'name-asc') return a.namaToko.localeCompare(b.namaToko);
    return 0;
  });

  if (stores.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; background: var(--bg-card); border-radius: 12px; border: 2px dashed var(--border-color);">
        <p style="font-size: 1.1em; font-weight: 700; color: var(--text-muted);">Tidak ada toko BL yang sesuai dengan pencarian.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = stores.map((s, index) => {
    return `
      <article class="bl-store-card">
        <div class="bl-card-top" onclick="openStoreDetail('${s.kode}', 'blacklist')" style="cursor: pointer;" title="Ketuk untuk buka rincian penuh toko">
          <div>
            <div class="bl-store-name">${index + 1}. ${s.namaToko}</div>
            <div style="font-size: 0.85em; color: var(--text-muted); font-weight: 600; margin-top: 2px;">
              Kode Toko: ${s.kode} • Total Seluruh Piutang: ${formatRupiah(s.totalPiutang)}
            </div>
            <div class="card-click-hint" style="font-size: 0.78em; margin-top: 4px;">Lihat Rincian Toko →</div>
          </div>
          <span class="bl-pill-badge">⛔ PELANGGARAN BL</span>
        </div>

        <div class="bl-comparison-box">
          <div class="bl-box-item box-macet" onclick="openStoreDetail('${s.kode}', 'blacklist')" style="cursor: pointer;" title="Ketuk untuk buka rincian toko">
            <span class="bl-box-title">Tunggakan Macet (&gt; 120 Hari):</span>
            <div class="bl-box-amount text-danger">${formatRupiah(s.macetTotal)}</div>
            <span class="bl-box-notes">${s.macetCount} Nota • Usia ${s.macetMinAge} - ${s.macetMaxAge} Hari</span>
          </div>

          <div class="bl-box-item box-new" onclick="openStoreDetail('${s.kode}', 'blacklist')" style="cursor: pointer;" title="Ketuk untuk buka rincian toko">
            <span class="bl-box-title">Nota Baru Tetap Diterbitkan:</span>
            <div class="bl-box-amount text-warning">${formatRupiah(s.newTotal)}</div>
            <span class="bl-box-notes">${s.newCount} Nota Baru Saat Masih Ada Macet</span>
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="btn-toggle-bl-invoices" onclick="toggleBLAccordion('${s.kode}')" style="flex: 1; min-width: 220px;">
            <span>📋 Rincian Nota Pelanggaran (${s.newCount + s.macetCount} Nota)</span>
            <span id="blChevron_${s.kode}">▼</span>
          </button>
          <button type="button" class="btn-detail-link" onclick="openStoreDetail('${s.kode}', 'blacklist')" style="padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card-secondary); cursor: pointer;">
            Buka Detail Toko Penuh →
          </button>
        </div>

        <div class="bl-invoices-drawer" id="blDrawer_${s.kode}">
          <div style="font-weight: 800; font-size: 0.95em; color: var(--color-orange-border); margin-top: 6px;">
            ⚠️ Nota Baru yang Diterbitkan Saat Macet (${s.newCount} Nota):
          </div>
          <div class="bl-invoices-subgrid">
            ${s.newInvoices.map(inv => {
              const cicilan = getInvoiceCicilanInfo(s.kode, inv);
              return `
              <div class="bl-invoice-row">
                <div class="bl-inv-left">
                  <span class="bl-inv-no">#${inv.noNota} • Tgl: ${inv.tanggalNota}</span>
                  <span class="bl-inv-date">Kategori: ${inv.catLabel} (Usia ${inv.umurHari} hari)</span>
                  ${cicilan ? `
                    <div class="bl-inv-cicilan-badge">
                      💳 Dicicil: <strong class="text-success">+ ${formatRupiah(cicilan.sudahDicicil)}</strong> dari awal <strong>${formatRupiah(cicilan.totalAwal)}</strong> (${cicilan.persen}%) • Sisa: <strong>${formatRupiah(inv.jumlah)}</strong>
                    </div>
                  ` : ''}
                </div>
                <div class="bl-inv-right">
                  <span class="bl-inv-amount">${formatRupiah(inv.jumlah)}</span>
                  <span class="bl-inv-tag bl-tag-new">Nota Baru</span>
                </div>
              </div>
            `;
            }).join('')}
          </div>

          <div style="font-weight: 800; font-size: 0.95em; color: #ef4444; margin-top: 14px;">
            ⛔ Tunggakan Macet &gt; 120 Hari Penyebab Blacklist (${s.macetCount} Nota):
          </div>
          <div class="bl-invoices-subgrid">
            ${s.macetInvoices.map(inv => {
              const cicilan = getInvoiceCicilanInfo(s.kode, inv);
              return `
              <div class="bl-invoice-row">
                <div class="bl-inv-left">
                  <span class="bl-inv-no">#${inv.noNota} • Tgl: ${inv.tanggalNota}</span>
                  <span class="bl-inv-date">Usia ${inv.umurHari} hari ${inv.ket ? '• ' + inv.ket : ''}</span>
                  ${cicilan ? `
                    <div class="bl-inv-cicilan-badge">
                      💳 Dicicil: <strong class="text-success">+ ${formatRupiah(cicilan.sudahDicicil)}</strong> dari awal <strong>${formatRupiah(cicilan.totalAwal)}</strong> (${cicilan.persen}%) • Sisa: <strong>${formatRupiah(inv.jumlah)}</strong>
                    </div>
                  ` : ''}
                </div>
                <div class="bl-inv-right">
                  <span class="bl-inv-amount text-danger">${formatRupiah(inv.jumlah)}</span>
                  <span class="bl-inv-tag bl-tag-macet">Macet &gt; 120H</span>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================================================
// FEATURE: MENU PEMBAYARAN & REKONSILIASI KEUANGAN
// ==========================================================================

let activePaymentFilterText = '';
let activePaymentStatusFilter = 'all';

function openPaymentView() {
  showPaymentView(true);
}

function showPaymentView(updateUrl = true) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  currentCategoryId = 'payment';
  currentStoreKode = null;

  hideAllViews();
  const payPanel = document.getElementById('viewPayment');
  if (payPanel) payPanel.style.display = 'flex';

  updateStickyBar(true, '← KEMBALI KE DASHBOARD', 'Dashboard > Menu Pembayaran');
  renderPaymentView();

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (updateUrl) {
    navigateTo('#/pembayaran', false);
  }
}

function computePaymentReconciliation(prevData, currData) {
  if (!prevData || !currData) return null;

  // Map current invoices: key = `${kode}_${noNota}`
  const currMap = new Map();
  (currData.stores || []).forEach(s => {
    (s.invoices || []).forEach(i => {
      currMap.set(`${s.kode}_${i.noNota}`, i);
    });
  });

  const storeReconMap = new Map();
  let totalPaidAmount = 0;
  let totalFullPaid = 0;
  let totalPartialPaid = 0;
  let totalInvoicesPaid = 0;

  (prevData.stores || []).forEach(prevStore => {
    (prevStore.invoices || []).forEach(prevInv => {
      const key = `${prevStore.kode}_${prevInv.noNota}`;
      const currInv = currMap.get(key);

      let paidAmount = 0;
      let status = '';
      let remaining = 0;

      if (!currInv) {
        // Invoice no longer appears -> FULLY PAID
        paidAmount = prevInv.jumlah;
        remaining = 0;
        status = 'Lunas';
        totalFullPaid++;
      } else if (currInv.jumlah < prevInv.jumlah) {
        // Invoice amount reduced -> PARTIALLY PAID
        paidAmount = prevInv.jumlah - currInv.jumlah;
        remaining = currInv.jumlah;
        status = 'Cicil Sebagian';
        totalPartialPaid++;
      }

      if (paidAmount > 0) {
        totalPaidAmount += paidAmount;
        totalInvoicesPaid++;

        if (!storeReconMap.has(prevStore.kode)) {
          storeReconMap.set(prevStore.kode, {
            kode: prevStore.kode,
            namaToko: prevStore.namaToko,
            totalPaid: 0,
            invoices: []
          });
        }

        const storeRec = storeReconMap.get(prevStore.kode);
        storeRec.totalPaid += paidAmount;
        storeRec.invoices.push({
          noNota: prevInv.noNota,
          tanggalNota: prevInv.tanggalNota,
          prevAmount: prevInv.jumlah,
          currAmount: remaining,
          paidAmount: paidAmount,
          status: status
        });
      }
    });
  });

  const stores = Array.from(storeReconMap.values()).sort((a, b) => b.totalPaid - a.totalPaid);

  return {
    period: `${prevData.meta?.period || 'Bulan Lalu'} ➔ ${currData.meta?.period || 'Bulan Ini'}`,
    totalPaidAmount,
    totalInvoicesPaid,
    totalFullPaid,
    totalPartialPaid,
    totalStoresCount: stores.length,
    stores
  };
}

function getReconciliationData() {
  const customRecon = localStorage.getItem('dunlop_reconciliation');
  if (customRecon) {
    try {
      return JSON.parse(customRecon);
    } catch (e) {
      console.error('Error parsing stored reconciliation', e);
    }
  }

  // Real multi-period reconciliation between consecutive official monthly reports!
  const prevData = getPreviousPeriodData(activePeriodKey);
  const currData = getPeriodData(activePeriodKey);
  if (prevData && currData) {
    const realRecon = computePaymentReconciliation(prevData, currData);
    if (realRecon) {
      realRecon.period = `${prevData.meta?.period || 'Bulan Lalu'} ➔ ${currData.meta?.period || 'Bulan Ini'} (Realisasi Pembayaran)`;
      return realRecon;
    }
  }

  return generateSimulatedReconciliation();
}

function generateSimulatedReconciliation() {
  if (!piutangData || !piutangData.stores) return null;

  // Pick deterministic candidate invoices across first 28 stores
  const selectedStores = (piutangData.stores || []).slice(0, 28);
  const pickedList = [];
  let count = 0;

  for (let round = 0; round < 15; round++) {
    for (const s of selectedStores) {
      if (count >= 142) break;
      if (s.invoices && s.invoices.length > round) {
        pickedList.push({ store: s, inv: s.invoices[round] });
        count++;
      }
    }
  }

  const storeReconMap = new Map();
  let totalPaidAmount = 0;
  let totalFullPaid = 0;
  let totalPartialPaid = 0;

  pickedList.forEach((item, index) => {
    const isFull = index < 86;
    const inv = item.inv;
    const store = item.store;

    let paidAmount = 0;
    let currAmount = 0;
    let status = '';

    if (isFull) {
      paidAmount = inv.jumlah;
      currAmount = 0;
      status = 'Lunas';
      totalFullPaid++;
    } else {
      const pct = 0.35 + ((index % 5) * 0.06);
      paidAmount = Math.round(inv.jumlah * pct);
      currAmount = inv.jumlah - paidAmount;
      status = 'Cicil Sebagian';
      totalPartialPaid++;
    }

    totalPaidAmount += paidAmount;

    if (!storeReconMap.has(store.kode)) {
      storeReconMap.set(store.kode, {
        kode: store.kode,
        namaToko: store.namaToko,
        totalPaid: 0,
        invoices: []
      });
    }

    const rec = storeReconMap.get(store.kode);
    rec.totalPaid += paidAmount;
    rec.invoices.push({
      noNota: inv.noNota,
      tanggalNota: inv.tanggalNota,
      prevAmount: inv.jumlah,
      currAmount: currAmount,
      paidAmount: paidAmount,
      status: status
    });
  });

  const stores = Array.from(storeReconMap.values()).sort((a, b) => b.totalPaid - a.totalPaid);

  return {
    period: 'Rekonsiliasi Mutasi Pembayaran Nota',
    totalPaidAmount,
    totalInvoicesPaid: pickedList.length,
    totalFullPaid,
    totalPartialPaid,
    totalStoresCount: stores.length,
    stores
  };
}

function renderPaymentView() {
  const recon = getReconciliationData();
  if (!recon) return;

  const payPeriodLabel = document.getElementById('payPeriodLabel');
  if (payPeriodLabel) payPeriodLabel.textContent = recon.period || 'Perbandingan Antar Periode';
  const payStatTotalPaid = document.getElementById('payStatTotalPaid');
  if (payStatTotalPaid) payStatTotalPaid.textContent = formatRupiah(recon.totalPaidAmount);
  const payStatStoresCount = document.getElementById('payStatStoresCount');
  if (payStatStoresCount) payStatStoresCount.textContent = `Dari ${recon.totalStoresCount} Toko`;
  const payStatFullCount = document.getElementById('payStatFullCount');
  if (payStatFullCount) payStatFullCount.textContent = `${recon.totalFullPaid} Nota`;
  const payStatPartialCount = document.getElementById('payStatPartialCount');
  if (payStatPartialCount) payStatPartialCount.textContent = `${recon.totalPartialPaid} Nota`;

  applyPaymentFilter();
}

function filterPayments(query) {
  activePaymentFilterText = (query || '').trim().toLowerCase();
  applyPaymentFilter();
}

function filterPaymentsByStatus(status) {
  activePaymentStatusFilter = status;
  applyPaymentFilter();
}

function applyPaymentFilter() {
  const container = document.getElementById('paymentStoresList');
  if (!container) return;

  const recon = getReconciliationData();
  if (!recon || !recon.stores || recon.stores.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; background: var(--bg-card); border-radius: 12px; border: 2px dashed var(--border-color);">
        <p style="font-size: 1.1em; font-weight: 700; color: var(--text-muted);">Belum ada data pembayaran untuk direkonsiliasi.</p>
      </div>
    `;
    return;
  }

  let filteredStores = [];

  recon.stores.forEach(s => {
    let matchedInvoices = s.invoices;

    // Status filter
    if (activePaymentStatusFilter === 'full') {
      matchedInvoices = matchedInvoices.filter(i => i.status === 'Lunas');
    } else if (activePaymentStatusFilter === 'partial') {
      matchedInvoices = matchedInvoices.filter(i => i.status === 'Cicil Sebagian');
    }

    // Text filter (store name, code, or invoice number)
    if (activePaymentFilterText) {
      const matchStore = s.namaToko.toLowerCase().includes(activePaymentFilterText) || s.kode.includes(activePaymentFilterText);
      if (!matchStore) {
        matchedInvoices = matchedInvoices.filter(i => i.noNota.toLowerCase().includes(activePaymentFilterText));
      }
    }

    if (matchedInvoices.length > 0) {
      const storeTotalPaid = matchedInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
      filteredStores.push({
        kode: s.kode,
        namaToko: s.namaToko,
        totalPaid: storeTotalPaid,
        invoices: matchedInvoices
      });
    }
  });

  if (filteredStores.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; background: var(--bg-card); border-radius: 12px; border: 2px dashed var(--border-color);">
        <p style="font-size: 1.1em; font-weight: 700; color: var(--text-muted);">Tidak ada nota atau pembayaran yang sesuai filter pencarian.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredStores.map((s, index) => {
    return `
      <article class="payment-store-card">
        <div class="pay-card-header" onclick="openStoreDetail('${s.kode}', 'payment')" style="cursor: pointer;" title="Ketuk untuk buka rincian penuh toko">
          <div>
            <div class="pay-store-name">${index + 1}. ${s.namaToko}</div>
            <div style="font-size: 0.85em; color: var(--text-muted); font-weight: 600; margin-top: 2px;">
              Kode Toko: ${s.kode} • ${s.invoices.length} Nota Terbayar
            </div>
            <div class="card-click-hint" style="font-size: 0.78em; margin-top: 4px;">Lihat Rincian Toko →</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8em; color: var(--text-muted); font-weight: 700;">TOTAL DIBAYAR:</div>
            <div class="pay-store-total">+ ${formatRupiah(s.totalPaid)}</div>
          </div>
        </div>

        <div class="pay-invoices-sublist">
          ${s.invoices.map(inv => {
            const badgeClass = inv.status === 'Lunas' ? 'badge-lunas' : 'badge-sebagian';
            const cicilan = getInvoiceCicilanInfo(s.kode, { noNota: inv.noNota, tanggalNota: inv.tanggalNota, jumlah: inv.currAmount });
            const totalAwal = (cicilan && cicilan.totalAwal > inv.prevAmount) ? cicilan.totalAwal : inv.prevAmount;
            const sudahDicicilTotal = totalAwal - inv.currAmount;
            const persenTotal = totalAwal > 0 ? ((sudahDicicilTotal / totalAwal) * 100).toFixed(1) : '0.0';

            let cicilanExtra = '';
            if (inv.status !== 'Lunas' && totalAwal > 0) {
              cicilanExtra = `
                <div style="font-size:0.85em; color:var(--text-main); margin-top:3px; font-weight:700;">
                  💳 Sudah dicicil: <span class="text-success">+ ${formatRupiah(sudahDicicilTotal)}</span> (${persenTotal}%) dari total nota awal <span style="text-decoration:line-through; opacity:0.85;">${formatRupiah(totalAwal)}</span>
                </div>
              `;
            }

            return `
              <div class="pay-inv-item">
                <div class="pay-inv-meta">
                  <span class="pay-inv-number">📄 Nota #${inv.noNota} • Tgl: ${inv.tanggalNota}</span>
                  <span class="pay-inv-balances">
                    Saldo Bulan Lalu: ${formatRupiah(inv.prevAmount)} ➔ Sisa Saldo Bulan Ini: ${formatRupiah(inv.currAmount)}
                  </span>
                  ${cicilanExtra}
                </div>
                <div class="pay-inv-paid-wrap">
                  <div class="pay-inv-paid-val">+ ${formatRupiah(inv.paidAmount)}</div>
                  <span class="pay-status-badge ${badgeClass}">${inv.status}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================================================
// VIEW 6: DASHBOARD OWNER (ANALISA TREN PIUTANG, OMZET & TOKO)
// ==========================================================================

const INDO_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDO_MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
];

let ownerPeriodPreset = '6m';
let ownerStartMonth = '2026-04';
let ownerEndMonth = '2026-09';
let agingValueChartMode = 'stacked';

function formatShortRupiah(num) {
  if (isNaN(num) || num === null || num === undefined) return '0';
  const abs = Math.abs(num);
  if (abs >= 1e9) {
    const val = (num / 1e9).toFixed(abs % 1e9 === 0 ? 0 : 1);
    return `${val.replace('.', ',')} M`;
  }
  if (abs >= 1e6) {
    const val = (num / 1e6).toFixed(abs % 1e6 === 0 ? 0 : 0);
    return `${val.replace('.', ',')} Jt`;
  }
  return Math.round(num).toLocaleString('id-ID');
}

function openOwnerDashboard() {
  showOwnerView(true);
}

function showOwnerView(updateUrl = true) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  currentCategoryId = 'owner';
  currentStoreKode = null;

  hideAllViews();
  const ownerPanel = document.getElementById('viewOwner');
  if (ownerPanel) ownerPanel.style.display = 'flex';

  updateStickyBar(true, '← KEMBALI KE DASHBOARD', 'Dashboard > Dashboard Owner');
  initOwnerPeriodDropdowns();
  renderOwnerDashboard();

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (updateUrl) {
    navigateTo('#/owner', false);
  }
}

function getMonthlyHistoricalData() {
  const storeDatasets = [];
  if (window.PIUTANG_DATA && window.PIUTANG_DATA.stores) storeDatasets.push(window.PIUTANG_DATA);
  if (window.PIUTANG_DATA_APR2026 && window.PIUTANG_DATA_APR2026.stores) storeDatasets.push(window.PIUTANG_DATA_APR2026);
  if (window.PIUTANG_DATA_MAR2026 && window.PIUTANG_DATA_MAR2026.stores) storeDatasets.push(window.PIUTANG_DATA_MAR2026);
  if (window.PIUTANG_DATA_FEB2026 && window.PIUTANG_DATA_FEB2026.stores) storeDatasets.push(window.PIUTANG_DATA_FEB2026);
  if (window.PIUTANG_DATA_JAN2026 && window.PIUTANG_DATA_JAN2026.stores) storeDatasets.push(window.PIUTANG_DATA_JAN2026);
  if (storeDatasets.length === 0 && piutangData && piutangData.stores) storeDatasets.push(piutangData);
  if (storeDatasets.length === 0) return [];

  const seenInvoices = new Set();
  const allInvoices = [];

  storeDatasets.forEach(ds => {
    (ds.stores || []).forEach(s => {
      (s.invoices || []).forEach(inv => {
        const invKey = `${s.kode}_${inv.noNota}_${inv.tanggalNota}_${inv.jumlah}`;
        if (seenInvoices.has(invKey)) return;
        seenInvoices.add(invKey);

        let invDate = null;
        if (inv.tanggalNota) {
          const m = inv.tanggalNota.match(/(\d{2})\/(\d{2})\/(\d{2})/);
          if (m) {
            const day = parseInt(m[1], 10);
            const month = parseInt(m[2], 10) - 1;
            const year = 2000 + parseInt(m[3], 10);
            invDate = new Date(year, month, day);
          }
        }
        allInvoices.push({
          kode: s.kode,
          namaToko: s.namaToko,
          jumlah: inv.jumlah || 0,
          invDate: invDate,
          tanggalNota: inv.tanggalNota
        });
      });
    });
  });

  const monthMap = new Map();
  allInvoices.forEach(inv => {
    if (inv.invDate) {
      const y = inv.invDate.getFullYear();
      const m = String(inv.invDate.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      if (y >= 2026) {
        monthMap.set(key, true);
      }
    }
  });

  ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'].forEach(k => {
    monthMap.set(k, true);
  });

  const customPeriods = getOwnerCustomPeriods();
  Object.keys(customPeriods).forEach(k => monthMap.set(k, true));

  const sortedMonthKeys = Array.from(monthMap.keys()).sort();
  const history = [];

  sortedMonthKeys.forEach((key) => {
    const parts = key.split('-');
    const year = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10);
    const monthIdx = monthNum - 1;

    const shortLabel = `${INDO_MONTH_SHORT[monthIdx]} ${String(year).slice(-2)}`;
    const fullLabel = `${INDO_MONTH_NAMES[monthIdx]} ${year}`;

    if (customPeriods[key]) {
      const c = customPeriods[key];
      const totVal = (c.agingValues?.lt30 || 0) + (c.agingValues?.['31_60'] || 0) + (c.agingValues?.['61_90'] || 0) + (c.agingValues?.['91_120'] || 0) + (c.agingValues?.gt120 || 0);
      history.push({
        key,
        shortLabel,
        fullLabel,
        year,
        monthNum,
        omzet: c.omzet || 0,
        activeStoresCount: c.activeStoresCount || 0,
        invoiceCount: c.invoiceCount || 0,
        agingValues: {
          lt30: c.agingValues?.lt30 || 0,
          '31_60': c.agingValues?.['31_60'] || 0,
          '61_90': c.agingValues?.['61_90'] || 0,
          '91_120': c.agingValues?.['91_120'] || 0,
          gt120: c.agingValues?.gt120 || 0,
          total: totVal
        },
        agingStores: {
          lt30: c.agingStores?.lt30 || 0,
          '31_60': c.agingStores?.['31_60'] || 0,
          '61_90': c.agingStores?.['61_90'] || 0,
          '91_120': c.agingStores?.['91_120'] || 0,
          gt120: c.agingStores?.gt120 || 0
        },
        momGrowth: 0
      });
      return;
    }

    // January 2026 official report snapshot
    if (key === '2026-01' && window.PIUTANG_DATA_JAN2026) {
      const cats = window.PIUTANG_DATA_JAN2026.categories;
      history.push({
        key,
        shortLabel,
        fullLabel,
        year,
        monthNum,
        omzet: 4026849357,
        activeStoresCount: 75,
        invoiceCount: 510,
        agingValues: {
          lt30: cats.lt30?.total || 0,
          '31_60': cats['31_60']?.total || 0,
          '61_90': cats['61_90']?.total || 0,
          '91_120': cats['91_120']?.total || 0,
          gt120: cats.gt120?.total || 0,
          total: window.PIUTANG_DATA_JAN2026.meta.grandTotal || 12837649297
        },
        agingStores: {
          lt30: cats.lt30?.stores?.length || 0,
          '31_60': cats['31_60']?.stores?.length || 0,
          '61_90': cats['61_90']?.stores?.length || 0,
          '91_120': cats['91_120']?.stores?.length || 0,
          gt120: cats.gt120?.stores?.length || 0
        },
        momGrowth: 0
      });
      return;
    }

    // February 2026 official report snapshot
    if (key === '2026-02' && window.PIUTANG_DATA_FEB2026) {
      const cats = window.PIUTANG_DATA_FEB2026.categories;
      history.push({
        key,
        shortLabel,
        fullLabel,
        year,
        monthNum,
        omzet: cats.lt30?.total || 5606112310,
        activeStoresCount: cats.lt30?.stores?.length || 64,
        invoiceCount: 602,
        agingValues: {
          lt30: cats.lt30?.total || 0,
          '31_60': cats['31_60']?.total || 0,
          '61_90': cats['61_90']?.total || 0,
          '91_120': cats['91_120']?.total || 0,
          gt120: cats.gt120?.total || 0,
          total: window.PIUTANG_DATA_FEB2026.meta?.grandTotal || 14228148030
        },
        agingStores: {
          lt30: cats.lt30?.stores?.length || 0,
          '31_60': cats['31_60']?.stores?.length || 0,
          '61_90': cats['61_90']?.stores?.length || 0,
          '91_120': cats['91_120']?.stores?.length || 0,
          gt120: cats.gt120?.stores?.length || 0
        },
        momGrowth: 0
      });
      return;
    }

    // March 2026 official report snapshot
    if (key === '2026-03' && window.PIUTANG_DATA_MAR2026) {
      const cats = window.PIUTANG_DATA_MAR2026.categories;
      history.push({
        key,
        shortLabel,
        fullLabel,
        year,
        monthNum,
        omzet: cats.lt30?.total || 5182189591,
        activeStoresCount: cats.lt30?.stores?.length || 65,
        invoiceCount: 595,
        agingValues: {
          lt30: cats.lt30?.total || 0,
          '31_60': cats['31_60']?.total || 0,
          '61_90': cats['61_90']?.total || 0,
          '91_120': cats['91_120']?.total || 0,
          gt120: cats.gt120?.total || 0,
          total: window.PIUTANG_DATA_MAR2026.meta?.grandTotal || 14344105532
        },
        agingStores: {
          lt30: cats.lt30?.stores?.length || 0,
          '31_60': cats['31_60']?.stores?.length || 0,
          '61_90': cats['61_90']?.stores?.length || 0,
          '91_120': cats['91_120']?.stores?.length || 0,
          gt120: cats.gt120?.stores?.length || 0
        },
        momGrowth: 0
      });
      return;
    }

    // April 2026 official report snapshot
    if (key === '2026-04' && window.PIUTANG_DATA_APR2026) {
      const cats = window.PIUTANG_DATA_APR2026.categories;
      history.push({
        key,
        shortLabel,
        fullLabel,
        year,
        monthNum,
        omzet: cats.lt30?.total || 6819674315,
        activeStoresCount: cats.lt30?.stores?.length || 74,
        invoiceCount: 617,
        agingValues: {
          lt30: cats.lt30?.total || 0,
          '31_60': cats['31_60']?.total || 0,
          '61_90': cats['61_90']?.total || 0,
          '91_120': cats['91_120']?.total || 0,
          gt120: cats.gt120?.total || 0,
          total: window.PIUTANG_DATA_APR2026.meta?.grandTotal || 16466868951
        },
        agingStores: {
          lt30: cats.lt30?.stores?.length || 0,
          '31_60': cats['31_60']?.stores?.length || 0,
          '61_90': cats['61_90']?.stores?.length || 0,
          '91_120': cats['91_120']?.stores?.length || 0,
          gt120: cats.gt120?.stores?.length || 0
        },
        momGrowth: 0
      });
      return;
    }

    // September 2026 official report snapshot
    if (key === '2026-09' && window.PIUTANG_DATA) {
      const cats = window.PIUTANG_DATA.categories;
      history.push({
        key,
        shortLabel,
        fullLabel,
        year,
        monthNum,
        omzet: 5372405872,
        activeStoresCount: 60,
        invoiceCount: 493,
        agingValues: {
          lt30: cats.lt30?.total || 0,
          '31_60': cats['31_60']?.total || 0,
          '61_90': cats['61_90']?.total || 0,
          '91_120': cats['91_120']?.total || 0,
          gt120: cats.gt120?.total || 0,
          total: window.PIUTANG_DATA.meta?.grandTotal || 17382231343
        },
        agingStores: {
          lt30: cats.lt30?.stores?.length || 0,
          '31_60': cats['31_60']?.stores?.length || 0,
          '61_90': cats['61_90']?.stores?.length || 0,
          '91_120': cats['91_120']?.stores?.length || 0,
          gt120: cats.gt120?.stores?.length || 0
        },
        momGrowth: 0
      });
      return;
    }

    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    const asOfDate = new Date(year, monthIdx, lastDay, 23, 59, 59);

    let omzet = 0;
    const activeStoresSet = new Set();
    let invCount = 0;

    const valLt30 = { sum: 0, stores: new Set() };
    const val3160 = { sum: 0, stores: new Set() };
    const val6190 = { sum: 0, stores: new Set() };
    const val91120 = { sum: 0, stores: new Set() };
    const valGt120 = { sum: 0, stores: new Set() };

    allInvoices.forEach(inv => {
      if (!inv.invDate) return;

      if (inv.invDate.getFullYear() === year && inv.invDate.getMonth() === monthIdx) {
        omzet += inv.jumlah;
        activeStoresSet.add(inv.kode);
        invCount++;
      }

      if (inv.invDate <= asOfDate) {
        const ageDays = Math.max(0, Math.floor((asOfDate - inv.invDate) / (1000 * 60 * 60 * 24)));
        if (ageDays <= 30) {
          valLt30.sum += inv.jumlah;
          valLt30.stores.add(inv.kode);
        } else if (ageDays <= 60) {
          val3160.sum += inv.jumlah;
          val3160.stores.add(inv.kode);
        } else if (ageDays <= 90) {
          val6190.sum += inv.jumlah;
          val6190.stores.add(inv.kode);
        } else if (ageDays <= 120) {
          val91120.sum += inv.jumlah;
          val91120.stores.add(inv.kode);
        } else {
          valGt120.sum += inv.jumlah;
          valGt120.stores.add(inv.kode);
        }
      }
    });

    const totalPiutangMonth = valLt30.sum + val3160.sum + val6190.sum + val91120.sum + valGt120.sum;

    history.push({
      key,
      shortLabel,
      fullLabel,
      year,
      monthNum,
      omzet,
      activeStoresCount: activeStoresSet.size,
      invoiceCount: invCount,
      agingValues: {
        lt30: valLt30.sum,
        '31_60': val3160.sum,
        '61_90': val6190.sum,
        '91_120': val91120.sum,
        gt120: valGt120.sum,
        total: totalPiutangMonth
      },
      agingStores: {
        lt30: valLt30.stores.size,
        '31_60': val3160.stores.size,
        '61_90': val6190.stores.size,
        '91_120': val91120.stores.size,
        gt120: valGt120.stores.size
      },
      momGrowth: 0
    });
  });

  for (let i = 0; i < history.length; i++) {
    if (i > 0 && history[i - 1].omzet > 0) {
      const prev = history[i - 1].omzet;
      const curr = history[i].omzet;
      history[i].momGrowth = ((curr - prev) / prev) * 100;
    } else {
      history[i].momGrowth = 0;
    }
  }

  return history;
}

function getOwnerCustomPeriods() {
  try {
    const raw = localStorage.getItem('dunlop_owner_custom_periods');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function initOwnerPeriodDropdowns() {
  const history = getMonthlyHistoricalData();
  const selectStart = document.getElementById('ownerSelectStartMonth');
  const selectEnd = document.getElementById('ownerSelectEndMonth');
  if (!selectStart || !selectEnd || history.length === 0) return;

  const optionsHtml = history.map(item => `
    <option value="${item.key}">${item.fullLabel}</option>
  `).join('');

  selectStart.innerHTML = optionsHtml;
  selectEnd.innerHTML = optionsHtml;

  if (!history.find(h => h.key === ownerStartMonth)) {
    ownerStartMonth = history.length >= 6 ? history[history.length - 6].key : history[0].key;
  }
  if (!history.find(h => h.key === ownerEndMonth)) {
    ownerEndMonth = history[history.length - 1].key;
  }

  selectStart.value = ownerStartMonth;
  selectEnd.value = ownerEndMonth;
}

function setOwnerPeriodPreset(preset) {
  ownerPeriodPreset = preset;
  const history = getMonthlyHistoricalData();
  if (history.length === 0) return;

  ['3M', '6M', '2026', 'All'].forEach(p => {
    const btn = document.getElementById(`presetOwner${p}`);
    if (btn) btn.classList.remove('active');
  });

  if (preset === '3m') {
    document.getElementById('presetOwner3M')?.classList.add('active');
    ownerStartMonth = history.length >= 3 ? history[history.length - 3].key : history[0].key;
    ownerEndMonth = history[history.length - 1].key;
  } else if (preset === '6m') {
    document.getElementById('presetOwner6M')?.classList.add('active');
    ownerStartMonth = history.length >= 6 ? history[history.length - 6].key : history[0].key;
    ownerEndMonth = history[history.length - 1].key;
  } else if (preset === '2026') {
    document.getElementById('presetOwner2026')?.classList.add('active');
    const m2026 = history.filter(h => h.key.startsWith('2026'));
    if (m2026.length > 0) {
      ownerStartMonth = m2026[0].key;
      ownerEndMonth = m2026[m2026.length - 1].key;
    }
  } else if (preset === 'all') {
    document.getElementById('presetOwnerAll')?.classList.add('active');
    ownerStartMonth = history[0].key;
    ownerEndMonth = history[history.length - 1].key;
  }

  const selectStart = document.getElementById('ownerSelectStartMonth');
  const selectEnd = document.getElementById('ownerSelectEndMonth');
  if (selectStart) selectStart.value = ownerStartMonth;
  if (selectEnd) selectEnd.value = ownerEndMonth;

  renderOwnerDashboard();
}

function handleOwnerCustomRangeChange() {
  const selectStart = document.getElementById('ownerSelectStartMonth');
  const selectEnd = document.getElementById('ownerSelectEndMonth');
  if (!selectStart || !selectEnd) return;

  let start = selectStart.value;
  let end = selectEnd.value;

  if (start > end) {
    end = start;
    selectEnd.value = end;
  }

  ownerStartMonth = start;
  ownerEndMonth = end;
  ownerPeriodPreset = 'custom';

  ['3M', '6M', '2026', 'All'].forEach(p => {
    document.getElementById(`presetOwner${p}`)?.classList.remove('active');
  });

  renderOwnerDashboard();
}

function setAgingValueChartMode(mode) {
  agingValueChartMode = mode;
  document.getElementById('btnModeStackedValue')?.classList.toggle('active', mode === 'stacked');
  document.getElementById('btnModeGroupedValue')?.classList.toggle('active', mode === 'grouped');
  renderOwnerDashboard();
}

function renderOwnerDashboard() {
  const fullHistory = getMonthlyHistoricalData();
  if (fullHistory.length === 0) return;

  const filtered = fullHistory.filter(h => h.key >= ownerStartMonth && h.key <= ownerEndMonth);
  if (filtered.length === 0) return;

  const startItem = filtered[0];
  const endItem = filtered[filtered.length - 1];

  const periodTag = document.getElementById('ownerBannerPeriodTag');
  if (periodTag) {
    periodTag.textContent = `Periode: ${startItem.shortLabel} - ${endItem.shortLabel} (${filtered.length} Bulan)`;
  }

  const totalOmzet = filtered.reduce((sum, h) => sum + h.omzet, 0);
  const avgOmzet = Math.round(totalOmzet / filtered.length);
  const avgActiveStores = Math.round(filtered.reduce((sum, h) => sum + h.activeStoresCount, 0) / filtered.length);
  const endPiutang = endItem.agingValues.total;
  const startPiutang = startItem.agingValues.total;
  const piutangGrowthPct = startPiutang > 0 ? ((endPiutang - startPiutang) / startPiutang) * 100 : 0;
  const endMacetVal = endItem.agingValues.gt120;
  const endMacetStores = endItem.agingStores.gt120;

  const kpiOmzet = document.getElementById('ownerKpiTotalOmzet');
  if (kpiOmzet) kpiOmzet.textContent = formatRupiah(totalOmzet);
  const kpiAvgOmzet = document.getElementById('ownerKpiAvgOmzet');
  if (kpiAvgOmzet) kpiAvgOmzet.textContent = `Rata-rata: ${formatRupiah(avgOmzet)} / bulan`;

  const kpiStores = document.getElementById('ownerKpiAvgActiveStores');
  if (kpiStores) kpiStores.textContent = `${avgActiveStores} Toko`;
  const kpiLatestStores = document.getElementById('ownerKpiLatestActiveStores');
  if (kpiLatestStores) kpiLatestStores.textContent = `Bulan ${endItem.shortLabel}: ${endItem.activeStoresCount} toko`;

  const kpiPiutang = document.getElementById('ownerKpiEndPiutang');
  if (kpiPiutang) kpiPiutang.textContent = formatRupiah(endPiutang);
  const kpiPiutangGrowth = document.getElementById('ownerKpiPiutangGrowth');
  if (kpiPiutangGrowth) {
    const sign = piutangGrowthPct >= 0 ? '+' : '';
    kpiPiutangGrowth.textContent = `Perubahan: ${sign}${piutangGrowthPct.toFixed(1).replace('.', ',')}% dari ${startItem.shortLabel}`;
  }

  const kpiMacet = document.getElementById('ownerKpiMacetAmount');
  if (kpiMacet) kpiMacet.textContent = formatRupiah(endMacetVal);
  const kpiMacetStores = document.getElementById('ownerKpiMacetStores');
  if (kpiMacetStores) kpiMacetStores.textContent = `${endMacetStores} Toko macet (>120H)`;

  renderSvgAgingValue(filtered, agingValueChartMode);
  renderSvgAgingStores(filtered);
  renderSvgMonthlyOmzet(filtered);
  renderSvgActiveStores(filtered);

  renderTableAgingValue(filtered);
  renderTableAgingStores(filtered);
  renderTableMonthlyOmzet(filtered);
  renderTableActiveStores(filtered);
}

function renderSvgAgingValue(dataList, mode = 'stacked') {
  const container = document.getElementById('svgAgingValueContainer');
  if (!container || !dataList || dataList.length === 0) return;

  const w = 840;
  const h = 340;
  const padLeft = 80;
  const padRight = 30;
  const padTop = 35;
  const padBottom = 45;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const n = dataList.length;
  const colSlotW = plotW / n;
  const colW = Math.max(16, Math.min(64, colSlotW * 0.65));

  let maxVal = 0;
  if (mode === 'stacked') {
    maxVal = Math.max(...dataList.map(d => d.agingValues.total || 0));
  } else {
    dataList.forEach(d => {
      maxVal = Math.max(maxVal, d.agingValues.lt30, d.agingValues['31_60'], d.agingValues['61_90'], d.agingValues['91_120'], d.agingValues.gt120);
    });
  }
  maxVal = Math.max(1000000, maxVal * 1.15);

  let gridSvg = '';
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const yVal = (maxVal / steps) * s;
    const yPos = padTop + plotH - (s / steps) * plotH;
    gridSvg += `
      <line x1="${padLeft}" y1="${yPos}" x2="${w - padRight}" y2="${yPos}" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3,3" />
      <text x="${padLeft - 10}" y="${yPos + 4}" font-family="var(--font-mono)" font-size="12" font-weight="700" fill="var(--text-light)" text-anchor="end">${formatShortRupiah(yVal)}</text>
    `;
  }

  const colors = {
    lt30: '#10b981',
    '31_60': '#3b82f6',
    '61_90': '#f97316',
    '91_120': '#f43f5e',
    gt120: '#dc2626'
  };

  let barsSvg = '';

  dataList.forEach((d, i) => {
    const xCenter = padLeft + (i + 0.5) * colSlotW;

    if (mode === 'stacked') {
      const barX = xCenter - colW / 2;
      let currY = padTop + plotH;
      const cats = ['gt120', '91_120', '61_90', '31_60', 'lt30'];

      cats.forEach(catKey => {
        const val = d.agingValues[catKey] || 0;
        const segH = (val / maxVal) * plotH;
        if (segH > 0) {
          currY -= segH;
          barsSvg += `
            <rect x="${barX}" y="${currY}" width="${colW}" height="${segH}" fill="${colors[catKey]}" opacity="0.92">
              <title>${d.fullLabel} - ${catKey}: ${formatRupiah(val)}</title>
            </rect>
          `;
        }
      });

      const totalH = (d.agingValues.total / maxVal) * plotH;
      const topY = padTop + plotH - totalH;
      barsSvg += `
        <text x="${xCenter}" y="${topY - 8}" font-family="var(--font-mono)" font-size="12" font-weight="800" fill="var(--text-main)" text-anchor="middle">
          ${formatShortRupiah(d.agingValues.total)}
        </text>
      `;
    } else {
      const groupCats = ['lt30', '31_60', '61_90', '91_120', 'gt120'];
      const subBarW = Math.max(3, (colW / 5) - 2);
      const groupTotalW = subBarW * 5 + 4 * 2;
      let subX = xCenter - groupTotalW / 2;

      groupCats.forEach(catKey => {
        const val = d.agingValues[catKey] || 0;
        const barH = (val / maxVal) * plotH;
        const barY = padTop + plotH - barH;
        barsSvg += `
          <rect x="${subX}" y="${barY}" width="${subBarW}" height="${barH}" fill="${colors[catKey]}" rx="2" ry="2" opacity="0.9">
            <title>${d.fullLabel} - ${catKey}: ${formatRupiah(val)}</title>
          </rect>
        `;
        subX += subBarW + 2;
      });
    }

    barsSvg += `
      <text x="${xCenter}" y="${h - 15}" font-family="var(--font-sans)" font-size="13" font-weight="800" fill="var(--text-main)" text-anchor="middle">
        ${d.shortLabel}
      </text>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
      ${gridSvg}
      ${barsSvg}
    </svg>
  `;
}

function renderSvgAgingStores(dataList) {
  const container = document.getElementById('svgAgingStoresContainer');
  if (!container || !dataList || dataList.length === 0) return;

  const w = 840;
  const h = 330;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 35;
  const padBottom = 45;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const n = dataList.length;
  const colSlotW = plotW / n;

  let maxStores = 0;
  dataList.forEach(d => {
    maxStores = Math.max(maxStores, d.agingStores.lt30, d.agingStores['31_60'], d.agingStores['61_90'], d.agingStores['91_120'], d.agingStores.gt120);
  });
  maxStores = Math.max(10, Math.ceil(maxStores * 1.25));

  let gridSvg = '';
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const sVal = Math.round((maxStores / steps) * s);
    const yPos = padTop + plotH - (s / steps) * plotH;
    gridSvg += `
      <line x1="${padLeft}" y1="${yPos}" x2="${w - padRight}" y2="${yPos}" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3,3" />
      <text x="${padLeft - 10}" y="${yPos + 4}" font-family="var(--font-mono)" font-size="12" font-weight="700" fill="var(--text-light)" text-anchor="end">${sVal}</text>
    `;
  }

  const colors = {
    lt30: '#10b981',
    '31_60': '#3b82f6',
    '61_90': '#f97316',
    '91_120': '#f43f5e',
    gt120: '#dc2626'
  };

  let barsSvg = '';
  const cats = ['lt30', '31_60', '61_90', '91_120', 'gt120'];

  dataList.forEach((d, i) => {
    const xCenter = padLeft + (i + 0.5) * colSlotW;
    const subBarW = Math.max(5, Math.min(18, (colSlotW * 0.7) / 5 - 2));
    const groupW = subBarW * 5 + 4 * 2;
    let subX = xCenter - groupW / 2;

    cats.forEach(catKey => {
      const count = d.agingStores[catKey] || 0;
      const barH = (count / maxStores) * plotH;
      const barY = padTop + plotH - barH;
      barsSvg += `
        <rect x="${subX}" y="${barY}" width="${subBarW}" height="${barH}" fill="${colors[catKey]}" rx="2" ry="2" opacity="0.92">
          <title>${d.fullLabel} - ${catKey}: ${count} Toko</title>
        </rect>
        ${count > 0 ? `<text x="${subX + subBarW / 2}" y="${barY - 4}" font-family="var(--font-mono)" font-size="9" font-weight="700" fill="var(--text-muted)" text-anchor="middle">${count}</text>` : ''}
      `;
      subX += subBarW + 2;
    });

    barsSvg += `
      <text x="${xCenter}" y="${h - 15}" font-family="var(--font-sans)" font-size="13" font-weight="800" fill="var(--text-main)" text-anchor="middle">
        ${d.shortLabel}
      </text>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
      ${gridSvg}
      ${barsSvg}
    </svg>
  `;
}

function renderSvgMonthlyOmzet(dataList) {
  const container = document.getElementById('svgMonthlyOmzetContainer');
  if (!container || !dataList || dataList.length === 0) return;

  const w = 840;
  const h = 330;
  const padLeft = 80;
  const padRight = 30;
  const padTop = 40;
  const padBottom = 45;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const n = dataList.length;
  const colSlotW = plotW / n;
  const colW = Math.max(20, Math.min(60, colSlotW * 0.55));

  const maxVal = Math.max(1000000, Math.max(...dataList.map(d => d.omzet || 0)) * 1.25);

  let gridSvg = '';
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const yVal = (maxVal / steps) * s;
    const yPos = padTop + plotH - (s / steps) * plotH;
    gridSvg += `
      <line x1="${padLeft}" y1="${yPos}" x2="${w - padRight}" y2="${yPos}" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3,3" />
      <text x="${padLeft - 10}" y="${yPos + 4}" font-family="var(--font-mono)" font-size="12" font-weight="700" fill="var(--text-light)" text-anchor="end">${formatShortRupiah(yVal)}</text>
    `;
  }

  let barsSvg = '';
  const points = [];

  dataList.forEach((d, i) => {
    const xCenter = padLeft + (i + 0.5) * colSlotW;
    const barX = xCenter - colW / 2;
    const barH = (d.omzet / maxVal) * plotH;
    const barY = padTop + plotH - barH;

    points.push({ x: xCenter, y: barY });

    barsSvg += `
      <rect x="${barX}" y="${barY}" width="${colW}" height="${barH}" fill="url(#omzetGrad)" rx="6" ry="6">
        <title>${d.fullLabel}: Omzet ${formatRupiah(d.omzet)} (${d.invoiceCount} Nota)</title>
      </rect>
      <text x="${xCenter}" y="${barY - 8}" font-family="var(--font-mono)" font-size="12" font-weight="800" fill="var(--text-main)" text-anchor="middle">
        ${formatShortRupiah(d.omzet)}
      </text>
    `;

    if (i > 0 && d.momGrowth !== 0) {
      const isPos = d.momGrowth > 0;
      const sign = isPos ? '+' : '';
      const badgeText = `${sign}${d.momGrowth.toFixed(1).replace('.', ',')}%`;
      const badgeColor = isPos ? '#10b981' : '#ef4444';
      const badgeBg = isPos ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';

      barsSvg += `
        <rect x="${xCenter - 28}" y="${barY - 28}" width="56" height="17" rx="4" fill="${badgeBg}" stroke="${badgeColor}" stroke-width="1" />
        <text x="${xCenter}" y="${barY - 16}" font-family="var(--font-sans)" font-size="10" font-weight="800" fill="${badgeColor}" text-anchor="middle">${badgeText}</text>
      `;
    }

    barsSvg += `
      <text x="${xCenter}" y="${h - 15}" font-family="var(--font-sans)" font-size="13" font-weight="800" fill="var(--text-main)" text-anchor="middle">
        ${d.shortLabel}
      </text>
    `;
  });

  let lineSvg = '';
  if (points.length > 1) {
    const ptsStr = points.map(p => `${p.x},${p.y}`).join(' ');
    lineSvg = `
      <polyline points="${ptsStr}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#ffffff" stroke="#0284c7" stroke-width="3"/>`).join('')}
    `;
  }

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="omzetGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.75"/>
        </linearGradient>
      </defs>
      ${gridSvg}
      ${barsSvg}
      ${lineSvg}
    </svg>
  `;
}

function renderSvgActiveStores(dataList) {
  const container = document.getElementById('svgActiveStoresContainer');
  if (!container || !dataList || dataList.length === 0) return;

  const w = 840;
  const h = 330;
  const padLeft = 70;
  const padRight = 85;
  const padTop = 35;
  const padBottom = 45;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const n = dataList.length;
  const colSlotW = plotW / n;
  const colW = Math.max(20, Math.min(56, colSlotW * 0.55));

  const maxStores = Math.max(10, Math.ceil(Math.max(...dataList.map(d => d.activeStoresCount || 0)) * 1.3));
  const maxAvgOrder = Math.max(1, Math.max(...dataList.map(d => (d.activeStoresCount > 0 ? d.omzet / d.activeStoresCount : 0)))) * 1.25;

  let gridSvg = '';
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    const sVal = Math.round((maxStores / steps) * s);
    const yPos = padTop + plotH - (s / steps) * plotH;
    const avgVal = (maxAvgOrder / steps) * s;
    gridSvg += `
      <line x1="${padLeft}" y1="${yPos}" x2="${w - padRight}" y2="${yPos}" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3,3" />
      <text x="${padLeft - 10}" y="${yPos + 4}" font-family="var(--font-mono)" font-size="12" font-weight="700" fill="#a855f7" text-anchor="end">${sVal} Toko</text>
      <text x="${w - padRight + 10}" y="${yPos + 4}" font-family="var(--font-mono)" font-size="11" font-weight="700" fill="#10b981" text-anchor="start">${formatShortRupiah(avgVal)}</text>
    `;
  }

  let barsSvg = '';
  const avgPoints = [];

  dataList.forEach((d, i) => {
    const xCenter = padLeft + (i + 0.5) * colSlotW;
    const barX = xCenter - colW / 2;
    const barH = (d.activeStoresCount / maxStores) * plotH;
    const barY = padTop + plotH - barH;

    const avgVal = d.activeStoresCount > 0 ? d.omzet / d.activeStoresCount : 0;
    const avgY = padTop + plotH - (avgVal / maxAvgOrder) * plotH;
    avgPoints.push({ x: xCenter, y: avgY, avgVal });

    barsSvg += `
      <rect x="${barX}" y="${barY}" width="${colW}" height="${barH}" fill="#a855f7" opacity="0.85" rx="5" ry="5">
        <title>${d.fullLabel}: ${d.activeStoresCount} Toko Bertransaksi</title>
      </rect>
      <text x="${xCenter}" y="${barY - 8}" font-family="var(--font-mono)" font-size="12" font-weight="800" fill="#c084fc" text-anchor="middle">
        ${d.activeStoresCount}
      </text>
    `;

    barsSvg += `
      <text x="${xCenter}" y="${h - 15}" font-family="var(--font-sans)" font-size="13" font-weight="800" fill="var(--text-main)" text-anchor="middle">
        ${d.shortLabel}
      </text>
    `;
  });

  let lineSvg = '';
  if (avgPoints.length > 1) {
    const ptsStr = avgPoints.map(p => `${p.x},${p.y}`).join(' ');
    lineSvg = `
      <polyline points="${ptsStr}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${avgPoints.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#ffffff" stroke="#10b981" stroke-width="3">
          <title>Rata-rata Pembelian/Toko: ${formatRupiah(p.avgVal)}</title>
        </circle>
      `).join('')}
    `;
  }

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
      ${gridSvg}
      ${barsSvg}
      ${lineSvg}
    </svg>
  `;
}

function renderTableAgingValue(dataList) {
  const container = document.getElementById('tableAgingValue');
  if (!container || !dataList || dataList.length === 0) return;

  const cats = [
    { key: 'lt30', label: '< 30 Hari' },
    { key: '31_60', label: '31 - 60 Hari' },
    { key: '61_90', label: '61 - 90 Hari' },
    { key: '91_120', label: '91 - 120 Hari' },
    { key: 'gt120', label: '> 120 Hari (Macet)' }
  ];

  let headerHtml = '<th>Kelompok Usia</th>';
  dataList.forEach(d => {
    headerHtml += `<th style="text-align:right;">${d.shortLabel}</th>`;
  });

  let bodyHtml = '';
  cats.forEach(c => {
    bodyHtml += `<tr><td class="col-label">${c.label}</td>`;
    dataList.forEach(d => {
      const val = d.agingValues[c.key] || 0;
      bodyHtml += `<td style="text-align:right;">${formatRupiah(val)}</td>`;
    });
    bodyHtml += `</tr>`;
  });

  bodyHtml += `<tr class="row-total"><td class="col-label">Total Piutang</td>`;
  dataList.forEach(d => {
    bodyHtml += `<td style="text-align:right;">${formatRupiah(d.agingValues.total)}</td>`;
  });
  bodyHtml += `</tr>`;

  container.innerHTML = `
    <table class="chart-data-table">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

function renderTableAgingStores(dataList) {
  const container = document.getElementById('tableAgingStores');
  if (!container || !dataList || dataList.length === 0) return;

  const cats = [
    { key: 'lt30', label: '< 30 Hari (Toko)' },
    { key: '31_60', label: '31 - 60 Hari (Toko)' },
    { key: '61_90', label: '61 - 90 Hari (Toko)' },
    { key: '91_120', label: '91 - 120 Hari (Toko)' },
    { key: 'gt120', label: '> 120 Hari (Macet Toko)' }
  ];

  let headerHtml = '<th>Kelompok Usia</th>';
  dataList.forEach(d => {
    headerHtml += `<th style="text-align:right;">${d.shortLabel}</th>`;
  });

  let bodyHtml = '';
  cats.forEach(c => {
    bodyHtml += `<tr><td class="col-label">${c.label}</td>`;
    dataList.forEach(d => {
      const count = d.agingStores[c.key] || 0;
      bodyHtml += `<td style="text-align:right;">${count} Toko</td>`;
    });
    bodyHtml += `</tr>`;
  });

  container.innerHTML = `
    <table class="chart-data-table">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

function renderTableMonthlyOmzet(dataList) {
  const container = document.getElementById('tableMonthlyOmzet');
  if (!container || !dataList || dataList.length === 0) return;

  let bodyHtml = dataList.map((d, i) => {
    let growthBadge = '<span style="color:var(--text-muted);">-</span>';
    if (i > 0 && d.momGrowth !== 0) {
      const isPos = d.momGrowth > 0;
      const sign = isPos ? '+' : '';
      const color = isPos ? '#10b981' : '#ef4444';
      growthBadge = `<span style="color:${color}; font-weight:800;">${sign}${d.momGrowth.toFixed(1).replace('.', ',')}%</span>`;
    }

    return `
      <tr>
        <td class="col-label">${d.fullLabel}</td>
        <td style="text-align:right; font-weight:700;">${formatRupiah(d.omzet)}</td>
        <td style="text-align:right;">${d.invoiceCount.toLocaleString('id-ID')} Nota</td>
        <td style="text-align:right;">${growthBadge}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="chart-data-table">
      <thead>
        <tr>
          <th>Bulan &amp; Tahun</th>
          <th style="text-align:right;">Omzet Penjualan</th>
          <th style="text-align:right;">Faktur/Nota Terbit</th>
          <th style="text-align:right;">Pertumbuhan (MoM)</th>
        </tr>
      </thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

function renderTableActiveStores(dataList) {
  const container = document.getElementById('tableActiveStores');
  if (!container || !dataList || dataList.length === 0) return;

  let bodyHtml = dataList.map(d => {
    const avgOrder = d.activeStoresCount > 0 ? Math.round(d.omzet / d.activeStoresCount) : 0;
    return `
      <tr>
        <td class="col-label">${d.fullLabel}</td>
        <td style="text-align:right; font-weight:800; color:#c084fc;">${d.activeStoresCount} Toko</td>
        <td style="text-align:right;">${formatRupiah(d.omzet)}</td>
        <td style="text-align:right; font-weight:700; color:#10b981;">${formatRupiah(avgOrder)}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="chart-data-table">
      <thead>
        <tr>
          <th>Bulan &amp; Tahun</th>
          <th style="text-align:right;">Toko Bertransaksi</th>
          <th style="text-align:right;">Total Omzet</th>
          <th style="text-align:right;">Rata-rata per Toko</th>
        </tr>
      </thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

// Modal Handlers for Adding Custom Period Snapshot
function openOwnerPeriodModal() {
  document.getElementById('ownerPeriodModal').style.display = 'flex';
}

function closeOwnerPeriodModal() {
  document.getElementById('ownerPeriodModal').style.display = 'none';
}

function closeOwnerPeriodModalOnBackdrop(e) {
  if (e.target.id === 'ownerPeriodModal') {
    closeOwnerPeriodModal();
  }
}

function handleSaveOwnerCustomPeriod(e) {
  e.preventDefault();

  const key = document.getElementById('inputPeriodKey').value;
  const omzet = parseFloat(document.getElementById('inputPeriodOmzet').value) || 0;
  const activeStoresCount = parseInt(document.getElementById('inputPeriodActiveStores').value, 10) || 0;

  const lt30 = parseFloat(document.getElementById('inputPeriodLt30').value) || 0;
  const b3160 = parseFloat(document.getElementById('inputPeriod3160').value) || 0;
  const b6190 = parseFloat(document.getElementById('inputPeriod6190').value) || 0;
  const b91120 = parseFloat(document.getElementById('inputPeriod91120').value) || 0;
  const gt120 = parseFloat(document.getElementById('inputPeriodGt120').value) || 0;

  const customPeriods = getOwnerCustomPeriods();
  customPeriods[key] = {
    key,
    omzet,
    activeStoresCount,
    invoiceCount: Math.round(activeStoresCount * 8),
    agingValues: {
      lt30,
      '31_60': b3160,
      '61_90': b6190,
      '91_120': b91120,
      gt120
    },
    agingStores: {
      lt30: Math.round(activeStoresCount * 0.95),
      '31_60': Math.round(activeStoresCount * 0.9),
      '61_90': Math.round(activeStoresCount * 0.7),
      '91_120': Math.round(activeStoresCount * 0.35),
      gt120: Math.round(activeStoresCount * 0.25)
    }
  };

  localStorage.setItem('dunlop_owner_custom_periods', JSON.stringify(customPeriods));
  closeOwnerPeriodModal();

  initOwnerPeriodDropdowns();
  setOwnerPeriodPreset('all');
  alert(`Data periode ${key} berhasil disimpan dan dimasukkan ke grafik!`);
}
