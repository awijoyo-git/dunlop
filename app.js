/**
 * DUNLOP PIUTANG - SENIOR-FRIENDLY APPLICATION
 * PT. Indo Bali Satya Graha
 */

// Global State
let piutangData = null;
let vaultDecryptedData = null;
let currentCategoryId = null;
let currentStoreKode = null;
let categorySortOrder = 'total-desc';
let activeCategoryFilterText = '';

// Inactivity Auto-Lock (15 Minutes)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
let inactivityTimer = null;

// Safe Storage Helpers (Defensive protection against disabled cookies / private browsing exceptions)
function getSafeStorage(type, key) {
  try {
    const store = type === 'local' ? window.localStorage : window.sessionStorage;
    return store ? store.getItem(key) : null;
  } catch (e) {
    return null;
  }
}

function setSafeStorage(type, key, value) {
  try {
    const store = type === 'local' ? window.localStorage : window.sessionStorage;
    if (store) store.setItem(key, String(value));
  } catch (e) {
    // Ignore
  }
}

function removeSafeStorage(type, key) {
  try {
    const store = type === 'local' ? window.localStorage : window.sessionStorage;
    if (store) store.removeItem(key);
  } catch (e) {
    // Ignore
  }
}

// Number Formatter (Thousand separator, 0 decimals, without 'Rp' prefix)
function formatRupiah(num) {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString('id-ID');
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

async function startApp() {
  initPreferences();
  setupHashRouting();

  // 1. Check if session credentials exist in sessionStorage
  const cachedPass = getSafeStorage('session', 'dunlop_session_pass');
  if (cachedPass) {
    try {
      if (window.ENCRYPTED_VAULT) {
        const decrypted = await decryptVaultWithPassword(cachedPass);
        if (decrypted) {
          vaultDecryptedData = decrypted;
          loadData();
          onLoginSuccess(false);
          startInactivityTracking();
          return;
        }
      } else {
        loadData();
        onLoginSuccess(false);
        startInactivityTracking();
        return;
      }
    } catch (e) {
      console.warn('Auto-unlock session failed:', e);
    }
  }

  // 2. Fallback check when vault is not used (local development)
  if (!window.ENCRYPTED_VAULT && isAuthenticated()) {
    loadData();
    onLoginSuccess(false);
    startInactivityTracking();
    return;
  }

  // 3. Otherwise show login view
  showLoginView();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
}

// ==========================================================================
// PREFERENCES (DEFAULT: MODE MALAM & UKURAN NORMAL)
// ==========================================================================

function initPreferences() {
  // Default font size: normal (paling kecil)
  const savedFont = getSafeStorage('local', 'dunlop_font_size') || 'normal';
  setFontSize(savedFont);

  // Default theme: soft-dark (mode malam)
  const savedTheme = getSafeStorage('local', 'dunlop_theme') || 'soft-dark';
  applyTheme(savedTheme);

  // Check saved header collapse state
  const savedCollapsed = getSafeStorage('local', 'dunlop_header_collapsed') === 'true';
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

  setSafeStorage('local', 'dunlop_header_collapsed', isCollapsed ? 'true' : 'false');
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
  
  setSafeStorage('local', 'dunlop_font_size', size);
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
  setSafeStorage('local', 'dunlop_theme', theme);
}

// ==========================================================================
// CRYPTOGRAPHY & AUTHENTICATION (AES-256-GCM + PBKDF2)
// ==========================================================================

function hexToUint8Array(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function base64ToUint8Array(b64) {
  if (typeof atob === 'function') {
    const binStr = atob(b64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  throw new Error('Decoder base64 tidak tersedia.');
}

async function decryptVaultWithPassword(password) {
  if (!window.ENCRYPTED_VAULT) return null;
  const subtle = (window.crypto && window.crypto.subtle) || (typeof require !== 'undefined' ? require('crypto').subtle : null);
  if (!subtle) {
    throw new Error('Web Crypto API tidak didukung pada browser ini.');
  }

  const vault = window.ENCRYPTED_VAULT;
  const enc = new TextEncoder();
  const passKey = await subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const salt = hexToUint8Array(vault.salt);
  const iv = hexToUint8Array(vault.iv);
  const ciphertext = base64ToUint8Array(vault.data);

  const aesKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: vault.iterations,
      hash: 'SHA-256'
    },
    passKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuf = await subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    ciphertext
  );

  const decStr = new TextDecoder().decode(decryptedBuf);
  return JSON.parse(decStr);
}

function isAuthenticated() {
  return !!vaultDecryptedData || getSafeStorage('local', 'dunlop_auth') === 'true' || getSafeStorage('session', 'dunlop_auth') === 'true';
}

async function handleLoginSubmit(event) {
  if (event && event.preventDefault) event.preventDefault();
  const inputEl = document.getElementById('inputPassword');
  const errorEl = document.getElementById('loginErrorMsg');
  const rememberCheckbox = document.getElementById('rememberMeCheckbox');
  const submitBtn = event && event.target && event.target.querySelector ? event.target.querySelector('button[type="submit"]') : document.querySelector('.btn-login-submit');
  const enteredPass = (inputEl ? inputEl.value : '').trim();

  if (!enteredPass) return;

  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>MEMBUKA DATA...</span><span class="submit-arrow">⏳</span>';
  }

  try {
    let success = false;

    if (window.ENCRYPTED_VAULT) {
      // Cryptographically verify & decrypt in memory
      const decrypted = await decryptVaultWithPassword(enteredPass);
      if (decrypted) {
        vaultDecryptedData = decrypted;
        window.vaultDecryptedData = decrypted;
        success = true;
      }
    } else {
      // If vault is still downloading or absent
      if (typeof window.ENCRYPTED_VAULT === 'undefined' && typeof window.PIUTANG_DATA === 'undefined') {
        if (errorEl) {
          errorEl.textContent = '⏳ Sedang menyiapkan brankas data, silakan tunggu sebentar lalu coba kembali.';
          errorEl.style.display = 'block';
        }
        return;
      }

      // Fallback if encrypted vault is absent
      if (enteredPass.toLowerCase() === 'mihardjo') {
        success = true;
      }
    }

    if (success) {
      if (errorEl) errorEl.style.display = 'none';
      if (inputEl) inputEl.classList.remove('has-error');

      setSafeStorage('session', 'dunlop_auth', 'true');
      setSafeStorage('session', 'dunlop_session_pass', enteredPass);

      if (rememberCheckbox && rememberCheckbox.checked) {
        setSafeStorage('local', 'dunlop_auth', 'true');
      } else {
        removeSafeStorage('local', 'dunlop_auth');
      }

      loadData();
      onLoginSuccess(true);
      startInactivityTracking();
    } else {
      throw new Error('Kata sandi salah.');
    }
  } catch (err) {
    console.warn('Login attempt failed:', err);
    if (errorEl) {
      errorEl.textContent = '⚠️ Kata sandi salah! Silakan coba ketik ulang dengan benar.';
      errorEl.style.display = 'block';
    }
    if (inputEl) {
      inputEl.classList.add('has-error');
      inputEl.focus();
      inputEl.select();
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    lockAppDueToInactivity();
  }, INACTIVITY_TIMEOUT_MS);
}

function lockAppDueToInactivity() {
  vaultDecryptedData = null;
  window.vaultDecryptedData = null;
  invoiceHistoryMasterCache = null;
  removeSafeStorage('session', 'dunlop_session_pass');
  removeSafeStorage('session', 'dunlop_auth');
  removeSafeStorage('local', 'dunlop_auth');
  showLoginView();
  const errorEl = document.getElementById('loginErrorMsg');
  if (errorEl) {
    errorEl.textContent = '⏱️ Sesi otomatis terkunci setelah 15 menit tanpa aktivitas. Silakan masuk kembali.';
    errorEl.style.display = 'block';
  }
}

function startInactivityTracking() {
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
}

function onLoginSuccess(animate = true) {
  // Show admin & logout buttons in header
  const btnLogout = document.getElementById('btnLogout');
  const btnAdmin = document.getElementById('btnAdmin');
  if (btnLogout) btnLogout.style.display = 'inline-flex';
  if (btnAdmin) btnAdmin.style.display = 'inline-flex';

  // Restore saved header collapse state
  const savedCollapsed = getSafeStorage('local', 'dunlop_header_collapsed') === 'true';
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
  if (confirm('Apakah Anda ingin keluar dan mengunci data?')) {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    vaultDecryptedData = null;
    window.vaultDecryptedData = null;
    invoiceHistoryMasterCache = null;
    removeSafeStorage('session', 'dunlop_auth');
    removeSafeStorage('session', 'dunlop_session_pass');
    removeSafeStorage('local', 'dunlop_auth');
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
// DATA LOADING & MULTI-PERIOD SUPPORT (9 PERIODS: JAN - SEP 2026)
// ==========================================================================

let activePeriodKey = getSafeStorage('local', 'dunlop_active_period') || '2026-09';
let activeBlThreshold = Number(getSafeStorage('local', 'dunlop_bl_threshold')) || 90; // Default: > 90 hari (options: 60, 90, 120, 365)

function isInvoiceMacet(inv, threshold = activeBlThreshold) {
  if (!inv) return false;
  if (threshold === 60) {
    return inv.catId === '61_90' || inv.catId === '91_120' || inv.catId === '121_365' || inv.catId === 'gt365' || inv.catId === 'gt120' || (typeof inv.umurHari === 'number' && inv.umurHari > 60);
  }
  if (threshold === 90) {
    return inv.catId === '91_120' || inv.catId === '121_365' || inv.catId === 'gt365' || inv.catId === 'gt120' || (typeof inv.umurHari === 'number' && inv.umurHari > 90);
  }
  if (threshold === 120) {
    return inv.catId === '121_365' || inv.catId === 'gt365' || inv.catId === 'gt120' || (typeof inv.umurHari === 'number' && inv.umurHari > 120);
  }
  if (threshold === 365) {
    return inv.catId === 'gt365' || (typeof inv.umurHari === 'number' && inv.umurHari > 365);
  }
  return inv.catId === 'gt365' || (typeof inv.umurHari === 'number' && inv.umurHari > threshold);
}

function isCategoryMacet(catId, threshold = activeBlThreshold) {
  if (threshold === 60) {
    return catId === '61_90' || catId === '91_120' || catId === '121_365' || catId === 'gt365' || catId === 'gt120';
  }
  if (threshold === 90) {
    return catId === '91_120' || catId === '121_365' || catId === 'gt365' || catId === 'gt120';
  }
  if (threshold === 120) {
    return catId === '121_365' || catId === 'gt365' || catId === 'gt120';
  }
  if (threshold === 365) {
    return catId === 'gt365';
  }
  return catId === 'gt365' || catId === '121_365' || catId === 'gt120';
}

function normalizePeriodCategories(data) {
  if (!data || !data.stores) return data;
  if (data.categories && data.categories['121_365'] && data.categories['gt365']) return data;

  const newCatSummary = {
    'lt30':    data.categories?.['lt30'] || { id: 'lt30', label: '< 30 Hari', sublabel: 'Usia 0 - 30 hari', total: 0, invoiceCount: 0, stores: [] },
    '31_60':   data.categories?.['31_60'] || { id: '31_60', label: '31 - 60 Hari', sublabel: 'Usia 31 - 60 hari', total: 0, invoiceCount: 0, stores: [] },
    '61_90':   data.categories?.['61_90'] || { id: '61_90', label: '61 - 90 Hari', sublabel: 'Usia 61 - 90 hari', total: 0, invoiceCount: 0, stores: [] },
    '91_120':  data.categories?.['91_120'] || { id: '91_120', label: '91 - 120 Hari', sublabel: 'Usia 91 - 120 hari', total: 0, invoiceCount: 0, stores: [] },
    '121_365': { id: '121_365', label: '121 - 365 Hari', sublabel: 'Usia 121 - 365 hari (4 - 12 Bulan)', total: 0, invoiceCount: 0, stores: [] },
    'gt365':   { id: 'gt365',   label: '> 365 Hari', sublabel: 'Usia lebih dari 1 tahun (> 365 Hari)', total: 0, invoiceCount: 0, stores: [] }
  };

  data.stores.forEach(s => {
    if (!s.categories) s.categories = {};
    s.categories['121_365'] = { id: '121_365', label: '121 - 365 Hari', total: 0, minAge: 99999, maxAge: 0, invoices: [] };
    s.categories['gt365'] = { id: 'gt365', label: '> 365 Hari', total: 0, minAge: 99999, maxAge: 0, invoices: [] };

    (s.invoices || []).forEach(inv => {
      if (inv.catId === 'gt120' || inv.catId === '121_365' || inv.catId === 'gt365' || (inv.bOver120 > 0) || (inv.umurHari > 120)) {
        if (inv.umurHari > 365) {
          inv.catId = 'gt365';
          inv.catLabel = '> 365 Hari';
          const c = s.categories['gt365'];
          c.total += inv.jumlah;
          if (inv.umurHari < c.minAge) c.minAge = inv.umurHari;
          if (inv.umurHari > c.maxAge) c.maxAge = inv.umurHari;
          c.invoices.push(inv);
        } else {
          inv.catId = '121_365';
          inv.catLabel = '121 - 365 Hari';
          const c = s.categories['121_365'];
          c.total += inv.jumlah;
          if (inv.umurHari < c.minAge) c.minAge = inv.umurHari;
          if (inv.umurHari > c.maxAge) c.maxAge = inv.umurHari;
          c.invoices.push(inv);
        }
      }
    });

    ['121_365', 'gt365'].forEach(cid => {
      const c = s.categories[cid];
      if (c.invoices.length === 0) c.minAge = 0;
    });
  });

  ['121_365', 'gt365'].forEach(cid => {
    const cSum = newCatSummary[cid];
    data.stores.forEach(s => {
      const sc = s.categories[cid];
      if (sc && sc.total > 0) {
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
    cSum.stores.sort((a, b) => b.total - a.total);
  });

  newCatSummary['gt120'] = {
    id: 'gt120',
    label: '> 120 Hari (Total)',
    total: newCatSummary['121_365'].total + newCatSummary['gt365'].total,
    invoiceCount: newCatSummary['121_365'].invoiceCount + newCatSummary['gt365'].invoiceCount,
    stores: []
  };

  data.categories = newCatSummary;
  return data;
}

function getPeriodData(key) {
  // 1. In-memory decrypted AES-256 vault (Primary)
  const vData = vaultDecryptedData || (typeof window !== 'undefined' ? window.vaultDecryptedData : null);
  if (vData && vData[key]) {
    return normalizePeriodCategories(vData[key]);
  }

  // 2. Global script dataset fallbacks
  let res = null;
  if (key === '2026-09' && window.PIUTANG_DATA) res = window.PIUTANG_DATA;
  else if (key === '2026-08' && window.PIUTANG_DATA_AGS2026) res = window.PIUTANG_DATA_AGS2026;
  else if (key === '2026-07' && window.PIUTANG_DATA_JUL2026) res = window.PIUTANG_DATA_JUL2026;
  else if (key === '2026-06' && window.PIUTANG_DATA_JUN2026) res = window.PIUTANG_DATA_JUN2026;
  else if (key === '2026-05' && window.PIUTANG_DATA_MEI2026) res = window.PIUTANG_DATA_MEI2026;
  else if (key === '2026-04' && window.PIUTANG_DATA_APR2026) res = window.PIUTANG_DATA_APR2026;
  else if (key === '2026-03' && window.PIUTANG_DATA_MAR2026) res = window.PIUTANG_DATA_MAR2026;
  else if (key === '2026-02' && window.PIUTANG_DATA_FEB2026) res = window.PIUTANG_DATA_FEB2026;
  else if (key === '2026-01' && window.PIUTANG_DATA_JAN2026) res = window.PIUTANG_DATA_JAN2026;
  else if (window.PIUTANG_DATA) res = window.PIUTANG_DATA;

  if (res) return normalizePeriodCategories(res);
  return null;
}

function getPreviousPeriodData(key) {
  if (key === '2026-09') return getPeriodData('2026-08');
  if (key === '2026-08') return getPeriodData('2026-07');
  if (key === '2026-07') return getPeriodData('2026-06');
  if (key === '2026-06') return getPeriodData('2026-05');
  if (key === '2026-05') return getPeriodData('2026-04');
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

  // Collect all available official and custom datasets in chronological sequence
  const periods = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  periods.forEach(p => {
    const ds = getPeriodData(p);
    if (ds && ds.stores && ds.stores.length > 0) {
      datasets.push(ds);
    }
  });

  const localDb = getSafeStorage('local', 'dunlop_custom_data');
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
  const blSelect = document.getElementById('selectBlThreshold');
  if (blSelect) blSelect.value = String(activeBlThreshold);
  const blInline = document.getElementById('blInlineThreshold');
  if (blInline) blInline.value = String(activeBlThreshold);

  // 1. Check local storage first (for custom uploaded monthly data)
  const localDb = getSafeStorage('local', 'dunlop_custom_data');
  if (localDb) {
    try {
      piutangData = JSON.parse(localDb);
      console.log('Loaded custom data from storage');
      renderDashboard();
      if (isAuthenticated()) handleInitialRoute();
      return;
    } catch (e) {
      console.error('Error parsing storage data', e);
    }
  }

  // 2. Load based on activePeriodKey (2026-01 through 2026-09)
  const pData = getPeriodData(activePeriodKey);
  if (pData) {
    piutangData = pData;
    renderDashboard();
    if (isAuthenticated()) handleInitialRoute();
    return;
  }

  // 3. Fallback to fetch data.json if available
  if (typeof fetch === 'function') {
    fetch('data.json')
      .then(res => res.json())
      .then(data => {
        piutangData = data;
        renderDashboard();
        if (isAuthenticated()) handleInitialRoute();
      })
      .catch(err => {
        // Silently ignore if data.json is omitted for security
      });
  }
}

function handleAppPeriodChange(periodKey) {
  activePeriodKey = periodKey;
  setSafeStorage('local', 'dunlop_active_period', periodKey);
  removeSafeStorage('local', 'dunlop_custom_data');
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
  } else if (currentCategoryId === 'health') {
    renderHealthDashboard();
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
    let catId = parts[1];
    if (catId === 'gt120') catId = '121_365';
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
  } else if (route === 'health' || route === 'kesehatan') {
    showHealthView(false);
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
    } else if (currentCategoryId === 'health') {
      showHealthView(true);
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
  const views = ['viewLogin', 'viewDashboard', 'viewCategory', 'viewStore', 'viewBlacklist', 'viewPayment', 'viewOwner', 'viewHealth'];
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
    { key: '121_365', label: '121 - 365 Hari' },
    { key: 'gt365', label: '> 365 Hari' }
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
  const btnNavBL = document.getElementById('btnNavBL');
  if (btnNavBL) btnNavBL.textContent = `⛔ Data BL (${blStores.length})`;

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
    else if (catId === '121_365' || catId === 'gt120') catTagClass = 'tag-darkred';
    else if (catId === 'gt365') catTagClass = 'tag-maroon';
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

  const allInvoices = store.invoices || [];
  const macetInvoices = allInvoices.filter(i => isInvoiceMacet(i));
  const macetTotal = macetInvoices.reduce((sum, i) => sum + i.jumlah, 0);
  const newInvoices = allInvoices.filter(i => !isInvoiceMacet(i));
  const newInvoicesCount = newInvoices.length;
  const hasMacet = macetTotal > 0;
  const isBL = hasMacet && newInvoicesCount > 0;

  const order = ['lt30', '31_60', '61_90', '91_120', '121_365', 'gt365', 'gt120'];
  const catStyles = {
    'lt30':    { tag: '< 30 HARI',      class: 'tag-green' },
    '31_60':   { tag: '31 - 60 HARI',   class: 'tag-blue' },
    '61_90':   { tag: '61 - 90 HARI',   class: 'tag-orange' },
    '91_120':  { tag: '91 - 120 HARI',  class: 'tag-rose' },
    '121_365': { tag: '121 - 365 HARI', class: 'tag-darkred' },
    'gt365':   { tag: '> 365 HARI',     class: 'tag-maroon' },
    'gt120':   { tag: '121 - 365 HARI', class: 'tag-darkred' }
  };

  let html = '';

  // Calculate cicilan stats for this store
  let storeCicilanCount = 0;
  let storeCicilanTotalPaid = 0;
  let storeCicilanTotalAwal = 0;
  allInvoices.forEach(inv => {
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
            PERINGATAN AUDIT: TOKO DATA BL (PELANGGARAN BLACKLIST &gt; ${activeBlThreshold} HARI)
          </div>
          <div style="font-size:0.9em; line-height:1.4;">
            Toko ini memiliki tunggakan macet &gt; ${activeBlThreshold} hari sebesar <strong>${formatRupiah(macetTotal)}</strong> (${macetInvoices.length} nota), namun <strong>masih diterbitkan ${newInvoicesCount} nota tagihan baru</strong>!
          </div>
        </div>
      </div>
    `;
  }

  // Action bar to collapse / expand all bucket groups
  html += `
    <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0 10px; flex-wrap: wrap; gap: 8px;">
      <span style="font-size: 0.85em; color: var(--text-muted); font-weight: 600;">
        Rincian Per Kelompok Usia (Periode &lt; 30 dan 31-60 default tertutup):
      </span>
      <div style="display: flex; gap: 8px;">
        <button type="button" class="btn-secondary" onclick="toggleAllStoreBuckets(true)" style="padding: 5px 12px; font-size: 0.8em; font-weight: 700;">
          ▼ Buka Semua
        </button>
        <button type="button" class="btn-secondary" onclick="toggleAllStoreBuckets(false)" style="padding: 5px 12px; font-size: 0.8em; font-weight: 700;">
          ▲ Tutup Semua
        </button>
      </div>
    </div>
  `;

  order.forEach(catId => {
    const bucket = store.categories[catId];
    if (!bucket || bucket.invoices.length === 0) return;

    const style = catStyles[catId];
    const invoices = bucket.invoices;
    const isMacetCat = isCategoryMacet(catId);

    // Collapsed rule: < 30 and 31-60 are default collapsed
    const isDefaultCollapsed = (catId === 'lt30' || catId === '31_60');
    const listDisplayClass = isDefaultCollapsed ? 'is-collapsed' : '';
    const chevronChar = isDefaultCollapsed ? '▼' : '▲';
    const chevronText = isDefaultCollapsed ? 'Buka Nota' : 'Tutup Nota';

    html += `
      <div class="bucket-group">
        <div class="bucket-header" onclick="toggleStoreBucketAccordion('${catId}')" style="cursor: pointer; user-select: none;" title="Ketuk untuk buka/tutup daftar nota">
          <div class="bucket-title-wrap">
            <span class="bucket-tag ${style.class}">${style.tag}</span>
            <span style="font-weight:700; color:var(--text-muted);">${invoices.length} Nota</span>
            <span class="bucket-toggle-indicator" id="bucketToggle_${catId}" style="font-size: 0.8em; color: var(--color-cyan); font-weight: 700; margin-left: 8px; padding: 2px 8px; border-radius: 4px; background: rgba(56, 189, 248, 0.1);">
              <span id="bucketChevron_${catId}">${chevronChar}</span> ${chevronText}
            </span>
          </div>
          <div class="bucket-subtotal">${formatRupiah(bucket.total)}</div>
        </div>

        <div class="bucket-invoices-list ${listDisplayClass}" id="bucketList_${catId}">
          ${invoices.map((inv) => {
            let invFlag = '';
            if (isMacetCat) {
              invFlag = `<span class="invoice-gt120-badge">⚠️ Tunggakan Macet &gt; ${activeBlThreshold}H</span>`;
            } else if (hasMacet) {
              invFlag = `<span class="invoice-bl-badge">⛔ Diterbitkan Saat Masih Macet &gt; ${activeBlThreshold}H</span>`;
            }

            const cicilan = getInvoiceCicilanInfo(store.kode, inv);
            let cicilanHtml = '';
            let cicilanSubText = '';
            if (cicilan) {
              cicilanSubText = `
                <div class="invoice-cicilan-subtext" style="font-size: 0.82em; color: #10b981; font-weight: 700; margin-top: 3px; font-family: var(--font-mono);">
                  ${formatRupiah(cicilan.totalAwal)} dicicil ${formatRupiah(cicilan.sudahDicicil)}
                </div>
              `;
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

            // Suppress duplicate day count in ket if it matches days (e.g. "123hari" or "123 hari")
            const isKetDays = inv.ket && /^\d+\s*hari$/i.test(inv.ket.trim());
            const showKet = inv.ket && !isKetDays;

            return `
              <div class="invoice-item">
                <div class="invoice-row-main">
                  <span class="invoice-amount">${formatRupiah(inv.jumlah)}</span>
                  <span class="invoice-age-badge">⏳ ${inv.umurHari} hari</span>
                </div>
                <div class="invoice-row-sub">
                  <span class="invoice-meta-date">Nota #${inv.noNota} • Tgl: ${inv.tanggalNota}</span>
                  ${showKet ? `<span class="invoice-ket">${inv.ket}</span>` : ''}
                </div>
                ${cicilanSubText}
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

function toggleStoreBucketAccordion(catId) {
  const list = document.getElementById(`bucketList_${catId}`);
  const chevron = document.getElementById(`bucketChevron_${catId}`);
  const toggle = document.getElementById(`bucketToggle_${catId}`);
  if (!list) return;

  const isCollapsed = list.classList.toggle('is-collapsed');
  if (chevron) chevron.textContent = isCollapsed ? '▼' : '▲';
  if (toggle) {
    toggle.innerHTML = isCollapsed
      ? `<span id="bucketChevron_${catId}">▼</span> Buka Nota`
      : `<span id="bucketChevron_${catId}">▲</span> Tutup Nota`;
  }
}

function toggleAllStoreBuckets(expand) {
  const lists = document.querySelectorAll('.bucket-invoices-list');
  lists.forEach(list => {
    list.classList.toggle('is-collapsed', !expand);
    const catId = list.id.replace('bucketList_', '');
    const chevron = document.getElementById(`bucketChevron_${catId}`);
    const toggle = document.getElementById(`bucketToggle_${catId}`);
    if (chevron) chevron.textContent = expand ? '▲' : '▼';
    if (toggle) {
      toggle.innerHTML = expand
        ? `<span id="bucketChevron_${catId}">▲</span> Tutup Nota`
        : `<span id="bucketChevron_${catId}">▼</span> Buka Nota`;
    }
  });
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
    const origData = getPeriodData('2026-09');
    if (origData) {
      piutangData = origData;
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
        else if (bOver > 0) {
          if (ageDays > 365) {
            catId = 'gt365';
            catLabel = '> 365 Hari';
          } else {
            catId = '121_365';
            catLabel = '121 - 365 Hari';
          }
        }

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
          'lt30':    { id: 'lt30',    label: '< 30 Hari',      total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          '31_60':   { id: '31_60',   label: '31 - 60 Hari',   total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          '61_90':   { id: '61_90',   label: '61 - 90 Hari',   total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          '91_120':  { id: '91_120',  label: '91 - 120 Hari',  total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          '121_365': { id: '121_365', label: '121 - 365 Hari', total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          'gt365':   { id: 'gt365',   label: '> 365 Hari',     total: 0, minAge: 99999, maxAge: 0, invoices: [] }
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
    if (c) {
      c.total += inv.jumlah;
      if (inv.umurHari < c.minAge) c.minAge = inv.umurHari;
      if (inv.umurHari > c.maxAge) c.maxAge = inv.umurHari;
      c.invoices.push(inv);
    }
  });

  Object.values(storeMap).forEach(s => {
    Object.values(s.categories).forEach(c => {
      if (c.invoices.length === 0) c.minAge = 0;
    });
  });

  const catSummary = {
    'lt30':    { id: 'lt30',    label: '< 30 Hari',      sublabel: 'Usia 0 - 30 hari',         total: 0, invoiceCount: 0, stores: [] },
    '31_60':   { id: '31_60',   label: '31 - 60 Hari',   sublabel: 'Usia 31 - 60 hari',        total: 0, invoiceCount: 0, stores: [] },
    '61_90':   { id: '61_90',   label: '61 - 90 Hari',   sublabel: 'Usia 61 - 90 hari',        total: 0, invoiceCount: 0, stores: [] },
    '91_120':  { id: '91_120',  label: '91 - 120 Hari',  sublabel: 'Usia 91 - 120 hari',       total: 0, invoiceCount: 0, stores: [] },
    '121_365': { id: '121_365', label: '121 - 365 Hari', sublabel: 'Usia 121 - 365 hari (4-12 bln)', total: 0, invoiceCount: 0, stores: [] },
    'gt365':   { id: 'gt365',   label: '> 365 Hari',     sublabel: 'Usia lebih dari 1 tahun',   total: 0, invoiceCount: 0, stores: [] }
  };

  Object.values(storeMap).forEach(s => {
    ['lt30', '31_60', '61_90', '91_120', '121_365', 'gt365'].forEach(catId => {
      const sc = s.categories[catId];
      if (sc && sc.total > 0) {
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
    const allInvoices = s.invoices || [];
    const macetInvoices = allInvoices.filter(i => isInvoiceMacet(i));
    const macetTotal = macetInvoices.reduce((sum, i) => sum + i.jumlah, 0);
    if (macetTotal <= 0) return;

    // Invoices issued while store has > threshold days overdue
    const newInvoices = allInvoices.filter(i => !isInvoiceMacet(i));
    const newTotal = newInvoices.reduce((sum, i) => sum + i.jumlah, 0);

    if (newInvoices.length > 0) {
      const ages = macetInvoices.map(i => i.umurHari || 0);
      blStores.push({
        kode: s.kode,
        namaToko: s.namaToko,
        macetTotal: macetTotal,
        macetCount: macetInvoices.length,
        macetMinAge: ages.length > 0 ? Math.min(...ages) : activeBlThreshold,
        macetMaxAge: ages.length > 0 ? Math.max(...ages) : activeBlThreshold,
        macetInvoices: macetInvoices,
        newTotal: newTotal,
        newCount: newInvoices.length,
        newInvoices: newInvoices,
        totalPiutang: s.totalPiutang
      });
    }
  });

  return blStores;
}

function handleBlThresholdChange(newThreshold) {
  activeBlThreshold = Number(newThreshold) || 90;
  setSafeStorage('local', 'dunlop_bl_threshold', String(activeBlThreshold));

  const headerSelect = document.getElementById('selectBlThreshold');
  if (headerSelect) headerSelect.value = String(activeBlThreshold);
  const inlineSelect = document.getElementById('blInlineThreshold');
  if (inlineSelect) inlineSelect.value = String(activeBlThreshold);

  renderDashboard();

  if (currentCategoryId === 'blacklist') {
    renderBlacklist();
  }

  if (currentStoreKode) {
    const store = (piutangData.stores || []).find(s => s.kode === currentStoreKode);
    if (store) renderStoreBucketGroups(store);
  }

  if (currentCategoryId && currentCategoryId !== 'blacklist' && currentCategoryId !== 'payment') {
    applyCategoryFilterAndSort();
  }
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

  // Update dynamic threshold labels
  const blBannerTitle = document.getElementById('blBannerTitle');
  if (blBannerTitle) blBannerTitle.innerHTML = `Daftar Toko &amp; Nota Terbit Saat Ada Piutang &gt; ${activeBlThreshold} Hari`;
  const blStatMacetLabel = document.getElementById('blStatMacetLabel');
  if (blStatMacetLabel) blStatMacetLabel.textContent = `Tunggakan Macet (> ${activeBlThreshold}H):`;
  const blStatSubMacet = document.getElementById('blStatSubMacet');
  if (blStatSubMacet) blStatSubMacet.textContent = `Ada tunggakan macet > ${activeBlThreshold}H`;
  const blGuideText = document.getElementById('blGuideText');
  if (blGuideText) {
    blGuideText.innerHTML = `<strong>Catatan Audit Direksi:</strong> Sesuai kebijakan kredit, toko yang masih memiliki piutang macet &gt; ${activeBlThreshold} hari seharusnya di-blacklist dari penerbitan nota baru sampai tunggakan diselesaikan.`;
  }
  const inlineSelect = document.getElementById('blInlineThreshold');
  if (inlineSelect) inlineSelect.value = String(activeBlThreshold);
  const headerSelect = document.getElementById('selectBlThreshold');
  if (headerSelect) headerSelect.value = String(activeBlThreshold);

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
            <span class="bl-box-title">Tunggakan Macet (&gt; ${activeBlThreshold} Hari):</span>
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
                  ${cicilan ? `
                    <div style="font-size: 0.82em; color: #10b981; font-weight: 700; margin-top: 2px; font-family: var(--font-mono);">
                      ${formatRupiah(cicilan.totalAwal)} dicicil ${formatRupiah(cicilan.sudahDicicil)}
                    </div>
                  ` : ''}
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
            ⛔ Tunggakan Macet &gt; ${activeBlThreshold} Hari Penyebab Blacklist (${s.macetCount} Nota):
          </div>
          <div class="bl-invoices-subgrid">
            ${s.macetInvoices.map(inv => {
              const cicilan = getInvoiceCicilanInfo(s.kode, inv);
              const isKetDays = inv.ket && /^\d+\s*hari$/i.test(inv.ket.trim());
              const ketSuffix = (inv.ket && !isKetDays) ? ' • ' + inv.ket : '';
              return `
              <div class="bl-invoice-row">
                <div class="bl-inv-left">
                  <span class="bl-inv-no">#${inv.noNota} • Tgl: ${inv.tanggalNota}</span>
                  ${cicilan ? `
                    <div style="font-size: 0.82em; color: #10b981; font-weight: 700; margin-top: 2px; font-family: var(--font-mono);">
                      ${formatRupiah(cicilan.totalAwal)} dicicil ${formatRupiah(cicilan.sudahDicicil)}
                    </div>
                  ` : ''}
                  <span class="bl-inv-date">Usia ${inv.umurHari} hari${ketSuffix}</span>
                  ${cicilan ? `
                    <div class="bl-inv-cicilan-badge">
                      💳 Dicicil: <strong class="text-success">+ ${formatRupiah(cicilan.sudahDicicil)}</strong> dari awal <strong>${formatRupiah(cicilan.totalAwal)}</strong> (${cicilan.persen}%) • Sisa: <strong>${formatRupiah(inv.jumlah)}</strong>
                    </div>
                  ` : ''}
                </div>
                <div class="bl-inv-right">
                  <span class="bl-inv-amount text-danger">${formatRupiah(inv.jumlah)}</span>
                  <span class="bl-inv-tag bl-tag-macet">Macet &gt; ${activeBlThreshold}H</span>
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

  const metaEl = document.getElementById('payStoresCountMeta');
  if (metaEl) {
    metaEl.textContent = `${filteredStores.length} Toko • Default Collapsed (Klik untuk Buka/Tutup)`;
  }

  container.innerHTML = filteredStores.map((s, index) => {
    // If active search text, open by default so search matches are visible, otherwise collapsed
    const isAutoOpen = Boolean(activePaymentFilterText && activePaymentFilterText.trim().length > 0);
    const openClass = isAutoOpen ? 'is-open' : '';
    const chevronChar = isAutoOpen ? '▲' : '▼';
    const indicatorText = isAutoOpen ? 'Sembunyikan Nota' : `Tampilkan ${s.invoices.length} Nota`;

    return `
      <article class="payment-store-card">
        <div class="pay-card-header" onclick="togglePaymentStoreAccordion('${s.kode}')" style="cursor: pointer;" title="Ketuk untuk buka/tutup rincian nota">
          <div style="flex: 1; min-width: 200px;">
            <div class="pay-store-name">${index + 1}. ${s.namaToko}</div>
            <div style="font-size: 0.85em; color: var(--text-muted); font-weight: 600; margin-top: 2px;">
              Kode Toko: ${s.kode} • ${s.invoices.length} Nota Terbayar
            </div>
            <button type="button" class="btn-subtle-link" onclick="event.stopPropagation(); openStoreDetail('${s.kode}', 'payment')" style="font-size: 0.8em; color: var(--color-cyan); background: none; border: none; padding: 0; margin-top: 4px; cursor: pointer; text-decoration: underline;" title="Lihat kartu rincian penuh toko">
              Lihat Rincian Toko →
            </button>
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center;">
            <div style="font-size: 0.8em; color: var(--text-muted); font-weight: 700;">TOTAL DIBAYAR:</div>
            <div class="pay-store-total">+ ${formatRupiah(s.totalPaid)}</div>
            <div class="pay-accordion-indicator" id="payIndicator_${s.kode}" style="font-size: 0.8em; color: var(--color-cyan); font-weight: 700; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px;">
              <span id="payChevron_${s.kode}">${chevronChar}</span> ${indicatorText}
            </div>
          </div>
        </div>

        <div class="pay-invoices-sublist ${openClass}" id="payDrawer_${s.kode}" data-count="${s.invoices.length}">
          ${s.invoices.map(inv => {
            const badgeClass = inv.status === 'Lunas' ? 'badge-lunas' : 'badge-sebagian';
            const cicilan = getInvoiceCicilanInfo(s.kode, { noNota: inv.noNota, tanggalNota: inv.tanggalNota, jumlah: inv.currAmount });
            const totalAwal = (cicilan && cicilan.totalAwal > inv.prevAmount) ? cicilan.totalAwal : inv.prevAmount;
            const sudahDicicilTotal = totalAwal - inv.currAmount;
            const persenTotal = totalAwal > 0 ? ((sudahDicicilTotal / totalAwal) * 100).toFixed(1) : '0.0';

            let cicilanSmallText = '';
            let cicilanExtra = '';
            if (inv.status !== 'Lunas' && totalAwal > 0) {
              cicilanSmallText = `
                <div style="font-size: 0.82em; color: #10b981; font-weight: 700; margin-top: 2px; font-family: var(--font-mono);">
                  ${formatRupiah(totalAwal)} dicicil ${formatRupiah(sudahDicicilTotal)}
                </div>
              `;
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
                  ${cicilanSmallText}
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

function togglePaymentStoreAccordion(kode) {
  const drawer = document.getElementById(`payDrawer_${kode}`);
  const chevron = document.getElementById(`payChevron_${kode}`);
  const indicator = document.getElementById(`payIndicator_${kode}`);
  if (!drawer) return;

  const isOpen = drawer.classList.contains('is-open');
  drawer.classList.toggle('is-open', !isOpen);
  const count = drawer.dataset.count || '';
  if (chevron) {
    chevron.textContent = isOpen ? '▼' : '▲';
  }
  if (indicator) {
    indicator.innerHTML = isOpen
      ? `<span id="payChevron_${kode}">▼</span> Tampilkan ${count} Nota`
      : `<span id="payChevron_${kode}">▲</span> Sembunyikan Nota`;
  }
}

function toggleAllPaymentStores(expand) {
  const drawers = document.querySelectorAll('.pay-invoices-sublist');
  drawers.forEach(drawer => {
    drawer.classList.toggle('is-open', expand);
    const kode = drawer.id.replace('payDrawer_', '');
    const chevron = document.getElementById(`payChevron_${kode}`);
    const indicator = document.getElementById(`payIndicator_${kode}`);
    const count = drawer.dataset.count || '';
    if (chevron) chevron.textContent = expand ? '▲' : '▼';
    if (indicator) {
      indicator.innerHTML = expand
        ? `<span id="payChevron_${kode}">▲</span> Sembunyikan Nota`
        : `<span id="payChevron_${kode}">▼</span> Tampilkan ${count} Nota`;
    }
  });
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
  ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'].forEach(k => {
    const ds = getPeriodData(k);
    if (ds && ds.stores) storeDatasets.push(ds);
  });
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
      const val121365 = c.agingValues?.['121_365'] || 0;
      const valGt365 = c.agingValues?.gt365 || 0;
      const valGt120 = c.agingValues?.gt120 || (val121365 + valGt365);
      const totVal = (c.agingValues?.lt30 || 0) + (c.agingValues?.['31_60'] || 0) + (c.agingValues?.['61_90'] || 0) + (c.agingValues?.['91_120'] || 0) + valGt120;
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
          '121_365': val121365 || valGt120,
          gt365: valGt365,
          gt120: valGt120,
          total: totVal
        },
        agingStores: {
          lt30: c.agingStores?.lt30 || 0,
          '31_60': c.agingStores?.['31_60'] || 0,
          '61_90': c.agingStores?.['61_90'] || 0,
          '91_120': c.agingStores?.['91_120'] || 0,
          '121_365': c.agingStores?.['121_365'] || c.agingStores?.gt120 || 0,
          gt365: c.agingStores?.gt365 || 0,
          gt120: c.agingStores?.gt120 || 0
        },
        momGrowth: 0
      });
      return;
    }

    // Official monthly snapshot via getPeriodData (Jan through Sep 2026)
    const pData = getPeriodData(key);
    if (pData && pData.categories && pData.meta) {
      const cats = pData.categories;
      const omzetVal = cats.lt30?.total || 0;
      const activeStores = cats.lt30?.stores?.length || (pData.stores ? pData.stores.length : 0);
      const invCount = cats.lt30?.invoiceCount || (pData.meta?.totalInvoices || 0);

      const v121365 = cats['121_365']?.total || 0;
      const vGt365 = cats.gt365?.total || 0;
      const vGt120 = cats.gt120?.total || (v121365 + vGt365);

      const s121365 = cats['121_365']?.stores?.length || 0;
      const sGt365 = cats.gt365?.stores?.length || 0;
      const sGt120 = cats.gt120?.stores?.length || (s121365 + sGt365);

      history.push({
        key,
        shortLabel,
        fullLabel,
        year,
        monthNum,
        omzet: omzetVal,
        activeStoresCount: activeStores,
        invoiceCount: invCount,
        agingValues: {
          lt30: cats.lt30?.total || 0,
          '31_60': cats['31_60']?.total || 0,
          '61_90': cats['61_90']?.total || 0,
          '91_120': cats['91_120']?.total || 0,
          '121_365': v121365 || vGt120,
          gt365: vGt365,
          gt120: vGt120,
          total: pData.meta?.grandTotal || 0
        },
        agingStores: {
          lt30: cats.lt30?.stores?.length || 0,
          '31_60': cats['31_60']?.stores?.length || 0,
          '61_90': cats['61_90']?.stores?.length || 0,
          '91_120': cats['91_120']?.stores?.length || 0,
          '121_365': s121365 || sGt120,
          gt365: sGt365,
          gt120: sGt120
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
    const val121365 = { sum: 0, stores: new Set() };
    const valGt365 = { sum: 0, stores: new Set() };
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
        } else if (ageDays <= 365) {
          val121365.sum += inv.jumlah;
          val121365.stores.add(inv.kode);
          valGt120.sum += inv.jumlah;
          valGt120.stores.add(inv.kode);
        } else {
          valGt365.sum += inv.jumlah;
          valGt365.stores.add(inv.kode);
          valGt120.sum += inv.jumlah;
          valGt120.stores.add(inv.kode);
        }
      }
    });

    const totalPiutangMonth = valLt30.sum + val3160.sum + val6190.sum + val91120.sum + val121365.sum + valGt365.sum;

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
        '121_365': val121365.sum,
        gt365: valGt365.sum,
        gt120: valGt120.sum,
        total: totalPiutangMonth
      },
      agingStores: {
        lt30: valLt30.stores.size,
        '31_60': val3160.stores.size,
        '61_90': val6190.stores.size,
        '91_120': val91120.stores.size,
        '121_365': val121365.stores.size,
        gt365: valGt365.stores.size,
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
      maxVal = Math.max(maxVal, d.agingValues.lt30, d.agingValues['31_60'], d.agingValues['61_90'], d.agingValues['91_120'], d.agingValues['121_365'] || 0, d.agingValues.gt365 || 0);
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
    '121_365': '#dc2626',
    gt365: '#881337',
    gt120: '#dc2626'
  };

  let barsSvg = '';

  dataList.forEach((d, i) => {
    const xCenter = padLeft + (i + 0.5) * colSlotW;

    if (mode === 'stacked') {
      const barX = xCenter - colW / 2;
      let currY = padTop + plotH;
      const cats = ['gt365', '121_365', '91_120', '61_90', '31_60', 'lt30'];

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
      const groupCats = ['lt30', '31_60', '61_90', '91_120', '121_365', 'gt365'];
      const subBarW = Math.max(3, (colW / 6) - 2);
      const groupTotalW = subBarW * 6 + 5 * 2;
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
    maxStores = Math.max(maxStores, d.agingStores.lt30, d.agingStores['31_60'], d.agingStores['61_90'], d.agingStores['91_120'], d.agingStores['121_365'] || 0, d.agingStores.gt365 || 0);
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
    '121_365': '#dc2626',
    gt365: '#881337',
    gt120: '#dc2626'
  };

  let barsSvg = '';
  const cats = ['lt30', '31_60', '61_90', '91_120', '121_365', 'gt365'];

  dataList.forEach((d, i) => {
    const xCenter = padLeft + (i + 0.5) * colSlotW;
    const subBarW = Math.max(4, Math.min(16, (colSlotW * 0.75) / 6 - 2));
    const groupW = subBarW * 6 + 5 * 2;
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
  const padTop = 55;
  const padBottom = 45;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const n = dataList.length;
  const colSlotW = plotW / n;
  const colW = Math.max(20, Math.min(60, colSlotW * 0.55));

  const maxVal = Math.max(1000000, Math.max(...dataList.map(d => d.omzet || 0)) * 1.35);

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

    // Place nominal value inside top of bar if tall enough, else right above bar
    const labelInside = barH >= 30;
    const valY = labelInside ? (barY + 18) : (barY - 8);
    const valColor = labelInside ? '#ffffff' : 'var(--text-main)';

    barsSvg += `
      <rect x="${barX}" y="${barY}" width="${colW}" height="${barH}" fill="url(#omzetGrad)" rx="6" ry="6">
        <title>${d.fullLabel}: Omzet ${formatRupiah(d.omzet)} (${d.invoiceCount} Nota)</title>
      </rect>
      <text x="${xCenter}" y="${valY}" font-family="var(--font-mono)" font-size="12" font-weight="800" fill="${valColor}" text-anchor="middle">
        ${formatShortRupiah(d.omzet)}
      </text>
    `;

    if (i > 0 && d.momGrowth !== 0) {
      const isPos = d.momGrowth > 0;
      const sign = isPos ? '+' : '';
      const badgeText = `${sign}${d.momGrowth.toFixed(1).replace('.', ',')}%`;
      const badgeColor = isPos ? '#10b981' : '#ef4444';
      const badgeBg = isPos ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      const badgeY = labelInside ? (barY - 26) : (barY - 32);

      barsSvg += `
        <rect x="${xCenter - 27}" y="${badgeY}" width="54" height="18" rx="5" fill="${badgeBg}" stroke="${badgeColor}" stroke-width="1.2" />
        <text x="${xCenter}" y="${badgeY + 13}" font-family="var(--font-sans)" font-size="10" font-weight="800" fill="${badgeColor}" text-anchor="middle">${badgeText}</text>
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
          <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.85"/>
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
  const padTop = 50;
  const padBottom = 45;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const n = dataList.length;
  const colSlotW = plotW / n;
  const colW = Math.max(20, Math.min(56, colSlotW * 0.55));

  const maxStores = Math.max(10, Math.ceil(Math.max(...dataList.map(d => d.activeStoresCount || 0)) * 1.35));
  const maxAvgOrder = Math.max(1, Math.max(...dataList.map(d => (d.activeStoresCount > 0 ? d.omzet / d.activeStoresCount : 0)))) * 1.35;

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

    const labelInside = barH >= 26;
    const valY = labelInside ? (barY + 18) : (barY - 8);
    const valColor = labelInside ? '#ffffff' : '#c084fc';

    barsSvg += `
      <rect x="${barX}" y="${barY}" width="${colW}" height="${barH}" fill="#a855f7" opacity="0.88" rx="5" ry="5">
        <title>${d.fullLabel}: ${d.activeStoresCount} Toko Bertransaksi</title>
      </rect>
      <text x="${xCenter}" y="${valY}" font-family="var(--font-mono)" font-size="12" font-weight="800" fill="${valColor}" text-anchor="middle">
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
        <text x="${p.x}" y="${p.y - 9}" font-family="var(--font-mono)" font-size="11" font-weight="800" fill="#10b981" text-anchor="middle">
          ${formatShortRupiah(p.avgVal)}
        </text>
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

function formatTableMilyar(val) {
  if (isNaN(val) || val === null || val === undefined || val === 0) return '0M';
  const num = Number(val);
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  const inM = (Math.floor(abs / 1e6) / 1000).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + 'M';
  return sign + inM;
}

function renderTableAgingValue(dataList) {
  const container = document.getElementById('tableAgingValue');
  if (!container || !dataList || dataList.length === 0) return;

  const cats = [
    { key: 'lt30', label: '< 30 Hari' },
    { key: '31_60', label: '31 - 60 Hari' },
    { key: '61_90', label: '61 - 90 Hari' },
    { key: '91_120', label: '91 - 120 Hari' },
    { key: '121_365', label: '121 - 365 Hari' },
    { key: 'gt365', label: '> 365 Hari' }
  ];

  let headerHtml = '<th class="col-sticky-freeze">Kelompok Usia</th>';
  dataList.forEach(d => {
    headerHtml += `<th style="text-align:right;">${d.shortLabel}</th>`;
  });

  let bodyHtml = '';
  cats.forEach(c => {
    bodyHtml += `<tr><td class="col-label col-sticky-freeze">${c.label}</td>`;
    dataList.forEach(d => {
      const val = d.agingValues[c.key] || 0;
      bodyHtml += `<td style="text-align:right;" title="${formatRupiah(val)}">${formatTableMilyar(val)}</td>`;
    });
    bodyHtml += `</tr>`;
  });

  bodyHtml += `<tr class="row-total"><td class="col-label col-sticky-freeze">Total Piutang</td>`;
  dataList.forEach(d => {
    bodyHtml += `<td style="text-align:right;" title="${formatRupiah(d.agingValues.total)}">${formatTableMilyar(d.agingValues.total)}</td>`;
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
    { key: 'lt30', label: '< 30 Hari' },
    { key: '31_60', label: '31 - 60 Hari' },
    { key: '61_90', label: '61 - 90 Hari' },
    { key: '91_120', label: '91 - 120 Hari' },
    { key: '121_365', label: '121 - 365 Hari' },
    { key: 'gt365', label: '> 365 Hari' }
  ];

  let headerHtml = '<th class="col-sticky-freeze">Kelompok Usia</th>';
  dataList.forEach(d => {
    headerHtml += `<th style="text-align:right;">${d.shortLabel}</th>`;
  });

  let bodyHtml = '';
  cats.forEach(c => {
    bodyHtml += `<tr><td class="col-label col-sticky-freeze">${c.label}</td>`;
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

  const lt30 = parseFloat(document.getElementById('inputPeriodLt30')?.value) || 0;
  const b3160 = parseFloat(document.getElementById('inputPeriod3160')?.value) || 0;
  const b6190 = parseFloat(document.getElementById('inputPeriod6190')?.value) || 0;
  const b91120 = parseFloat(document.getElementById('inputPeriod91120')?.value) || 0;
  const b121365 = parseFloat(document.getElementById('inputPeriod121365')?.value) || parseFloat(document.getElementById('inputPeriodGt120')?.value) || 0;
  const gt365 = parseFloat(document.getElementById('inputPeriodGt365')?.value) || 0;
  const gt120 = b121365 + gt365;

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
      '121_365': b121365,
      gt365,
      gt120
    },
    agingStores: {
      lt30: Math.round(activeStoresCount * 0.95),
      '31_60': Math.round(activeStoresCount * 0.9),
      '61_90': Math.round(activeStoresCount * 0.7),
      '91_120': Math.round(activeStoresCount * 0.35),
      '121_365': Math.round(activeStoresCount * 0.18),
      gt365: Math.round(activeStoresCount * 0.08),
      gt120: Math.round(activeStoresCount * 0.25)
    }
  };

  setSafeStorage('local', 'dunlop_owner_custom_periods', JSON.stringify(customPeriods));
  closeOwnerPeriodModal();

  initOwnerPeriodDropdowns();
  setOwnerPeriodPreset('all');
  alert(`Data periode ${key} berhasil disimpan dan dimasukkan ke grafik!`);
}

// ==========================================================================
// VIEW 7: MODUL KESEHATAN PERUSAHAAN (HPP, GAJI, OPERASIONAL & SUNK COST)
// ==========================================================================

const HEALTH_MONTHS = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-09'];

const HEALTH_FINANCIAL_DATA = {
  '2025-12': {
    monthKey: '2025-12',
    monthLabel: 'Desember 2025',
    pendapatanKotor: 4905558273,
    potonganPenjualan: 139130929,
    pendapatanBersih: 4766427344,
    hpp: 4554304152,
    labaKotor: 212123192,
    gajiPegawai: 113513500,
    karyawanLainnya: 7151639,
    konsumsi: 408000,
    totalBiayaStaff: 121073139,
    biayaOperasional: 145079676,
    labaOperasional: 67043516,
    labaBersih: 55238033,
    yearly: {
      pendapatanBersih: 64612185094,
      hpp: 56792094752,
      labaKotor: 7820090342,
      gajiPegawai: 1099857350,
      totalBiayaStaff: 1188339826,
      biayaOperasional: 1869207560,
      labaOperasional: 5950882782,
      labaBersih: 5329354078.53
    },
    sunkCost: {
      penyusutan: 3315636,
      pajakPph25: 39541420,
      pbb: 0,
      thr: 28256000,
      entertainment: 0,
      sumbanganUpacara: 1764000,
      potonganPenjualan: 139130929,
      servisPemeliharaan: 4235000,
      transport: 7915000,
      administrasiBank: 466100,
      bungaPinjamanMihardjo: 34845848,
      totalSunk: 259469969
    },
    notes: [
      {
        type: 'success',
        title: 'Penutupan Tahun 2025 Laba Bersih Positif (+Rp 55,2 Jt)',
        desc: 'Bulan Desember 2025 membukukan laba bersih Rp 55.238.033 (+1,16%) dengan omzet bersih Rp 4,77 Miliar dan laba operasional Rp 67,0 Jt.'
      },
      {
        type: 'warning',
        title: 'Beban Musiman THR Hari Raya Natal',
        desc: 'Beban gaji naik menjadi Rp 113,5 Jt (2,38% dari omzet) akibat pencairan THR Natal karyawan sebesar Rp 28.256.000 pada tanggal 13 Desember 2025.'
      },
      {
        type: 'info',
        title: 'Audit Tahun Penuh 2025: Laba Bersih Rekor Rp 5,33 Miliar',
        desc: 'Secara kumulatif setahun penuh 2025, PT Indobali Satya Graha mencetak laba bersih Rp 5.329.354.078,53 (margin 8,25%) dengan omzet Rp 64,61 Miliar.'
      }
    ]
  },
  '2026-01': {
    monthKey: '2026-01',
    monthLabel: 'Januari 2026',
    pendapatanKotor: 4660479286,
    potonganPenjualan: 201593816,
    pendapatanBersih: 4458885470,
    hpp: 4348524465,
    labaKotor: 110361005,
    gajiPegawai: 90994000,
    karyawanLainnya: 7589138,
    konsumsi: 373000,
    totalBiayaStaff: 98956138,
    biayaOperasional: 132356503,
    labaOperasional: -21995498,
    labaBersih: -417291661,
    yearly: {
      pendapatanBersih: 4458885470,
      hpp: 4348524465,
      labaKotor: 110361005,
      gajiPegawai: 90994000,
      totalBiayaStaff: 98956138,
      biayaOperasional: 132356503,
      labaOperasional: -21995498,
      labaBersih: -417291661
    },
    sunkCost: {
      penyusutan: 3315636,
      pajakPph25: 39541420,
      pbb: 0,
      pph21Pegawai: 106984765,
      pph21Honor: 288000000,
      entertainment: 3097093,
      sumbanganUpacara: 847000,
      thr: 0,
      potonganPenjualan: 201593816,
      servisPemeliharaan: 14504000,
      transport: 7299000,
      administrasiBank: 195500,
      totalSunk: 463784414
    },
    notes: [
      {
        type: 'danger',
        title: 'Beban Pajak PPh 21 Tahunan & Honorarium Menekan Laba Bersih',
        desc: 'Januari mencatatkan rugi bersih -Rp 417,3 Jt akibat pelunasan PPh 21 Pegawai (Rp 107,0 Jt) dan PPh 21 Honorarium (Rp 288,0 Jt).'
      },
      {
        type: 'warning',
        title: 'Margin Laba Kotor Sangat Tipis (2,48%)',
        desc: 'HPP menyerap 97,52% pendapatan bersih. Potongan diskon penjualan mencapai Rp 201,6 Jt (4,32% dari penjualan kotor).'
      }
    ]
  },
  '2026-02': {
    monthKey: '2026-02',
    monthLabel: 'Februari 2026',
    pendapatanKotor: 5896479742,
    potonganPenjualan: -222260,
    pendapatanBersih: 5896702002,
    hpp: 5627046291,
    labaKotor: 269655711,
    gajiPegawai: 91140000,
    karyawanLainnya: 7589138,
    konsumsi: 290000,
    totalBiayaStaff: 99019138,
    biayaOperasional: 619613674,
    labaOperasional: -349957963,
    labaBersih: -381270177.63,
    yearly: {
      pendapatanBersih: 10355587472,
      hpp: 9975570756,
      labaKotor: 380016716,
      gajiPegawai: 182134000,
      totalBiayaStaff: 197975276,
      biayaOperasional: 751970177,
      labaOperasional: -371953461,
      labaBersih: -798561838.63
    },
    sunkCost: {
      penyusutan: 3201053,
      pajakPph25: 39541420,
      pbb: 0,
      bonusTahunan: 497318482,
      entertainment: 0,
      sumbanganUpacara: 4474500,
      thr: 0,
      potonganPenjualan: 0,
      servisPemeliharaan: 5792500,
      transport: 6760000,
      administrasiBank: 28260940.63,
      totalSunk: 585348896
    },
    notes: [
      {
        type: 'danger',
        title: 'Lonjakan Beban Operasional: Bonus Tahunan Rp 497,3 Jt',
        desc: 'Beban operasional membengkak ke Rp 619,6 Jt (10,51% omzet) dipicu bonus tahunan karyawan Rp 497,3 Jt, menyebabkan rugi operasional -Rp 350 Jt.'
      },
      {
        type: 'info',
        title: 'Peningkatan Penjualan & Margin Kotor (4,57%)',
        desc: 'Penjualan bersih naik signifikan menjadi Rp 5,90 Miliar dengan laba kotor Rp 269,7 Jt (HPP 95,43%).'
      }
    ]
  },
  '2026-03': {
    monthKey: '2026-03',
    monthLabel: 'Maret 2026',
    pendapatanKotor: 5865351130,
    potonganPenjualan: 9775,
    pendapatanBersih: 5865341355,
    hpp: 5575979567,
    labaKotor: 289361788,
    gajiPegawai: 109786000,
    karyawanLainnya: 7589138,
    konsumsi: 510000,
    totalBiayaStaff: 117885138,
    biayaOperasional: 172121836,
    labaOperasional: 117239952,
    labaBersih: 104838696,
    yearly: {
      pendapatanBersih: 16220928827,
      hpp: 15551550323,
      labaKotor: 669378504,
      gajiPegawai: 291920000,
      totalBiayaStaff: 315860414,
      biayaOperasional: 924092013,
      labaOperasional: -254713509,
      labaBersih: -693723142.63
    },
    sunkCost: {
      penyusutan: 3201053,
      pajakPph25: 39541420,
      pbb: 0,
      thr: 11760000,
      asuransi: 11894710,
      entertainment: 4067250,
      sumbanganUpacara: 9778160,
      potonganPenjualan: 9775,
      servisPemeliharaan: 9203500,
      transport: 8018000,
      administrasiBank: 441400,
      totalSunk: 97915268
    },
    notes: [
      {
        type: 'success',
        title: 'Pembalikan Menjadi Laba Positif (+Rp 104,8 Jt)',
        desc: 'Maret membukukan titik balik profitabilitas pertama tahun ini dengan laba bersih Rp 104,8 Jt (+1,79%) dan laba operasional Rp 117,2 Jt.'
      },
      {
        type: 'info',
        title: 'Beban THR Idul Fitri',
        desc: 'Beban gaji naik menjadi Rp 109,8 Jt akibat pembayaran THR keagamaan sebesar Rp 11,76 Jt.'
      }
    ]
  },
  '2026-04': {
    monthKey: '2026-04',
    monthLabel: 'April 2026',
    pendapatanKotor: 7267999410,
    potonganPenjualan: -82535,
    pendapatanBersih: 7268081945,
    hpp: 6916274813,
    labaKotor: 351807132,
    gajiPegawai: 90580000,
    karyawanLainnya: 7589138,
    konsumsi: 751500,
    totalBiayaStaff: 98920638,
    biayaOperasional: 124323642,
    labaOperasional: 227483490,
    labaBersih: 201670556,
    yearly: {
      pendapatanBersih: 23489010772,
      hpp: 22467825136,
      labaKotor: 1021185636,
      gajiPegawai: 382500000,
      totalBiayaStaff: 414781052,
      biayaOperasional: 1048415655,
      labaOperasional: -27230019,
      labaBersih: -492052586.63
    },
    sunkCost: {
      penyusutan: 3201053,
      pajakPph25: 39541420,
      pajakPph29: 6062583,
      pbb: 0,
      entertainment: 0,
      sumbanganUpacara: 2736000,
      thr: 0,
      potonganPenjualan: 0,
      servisPemeliharaan: 7931525,
      transport: 7268000,
      administrasiBank: 451400,
      totalSunk: 67191981
    },
    notes: [
      {
        type: 'success',
        title: 'Rekor Penjualan & Profit Tertinggi (+Rp 201,7 Jt)',
        desc: 'April mencatat omzet tertinggi Rp 7,27 Miliar dengan laba kotor Rp 351,8 Jt dan laba bersih rekor Rp 201,7 Jt (+2,77%).'
      },
      {
        type: 'success',
        title: 'Efisiensi Operasional Paling Optimal (1,71%)',
        desc: 'Beban operasional hanya 1,71% dari omzet, rasio terendah sepanjang tahun.'
      }
    ]
  },
  '2026-05': {
    monthKey: '2026-05',
    monthLabel: 'Mei 2026',
    pendapatanKotor: 5673466322,
    potonganPenjualan: 9259,
    pendapatanBersih: 5673457063,
    hpp: 5426299229,
    labaKotor: 247157834,
    gajiPegawai: 91446000,
    karyawanLainnya: 7589138,
    konsumsi: 469000,
    totalBiayaStaff: 99504138,
    biayaOperasional: 122827584,
    labaOperasional: 124330250,
    labaBersih: 99025287,
    yearly: {
      pendapatanBersih: 29162467835,
      hpp: 27894124365,
      labaKotor: 1268343470,
      gajiPegawai: 473946000,
      totalBiayaStaff: 514285190,
      biayaOperasional: 1171243239,
      labaOperasional: 97100231,
      labaBersih: -393027299.63
    },
    sunkCost: {
      penyusutan: 3201053,
      pajakPph25: 39758179,
      pbb: 0,
      entertainment: 3619926,
      sumbanganUpacara: 2051250,
      thr: 0,
      potonganPenjualan: 9259,
      servisPemeliharaan: 2063000,
      transport: 7495640,
      administrasiBank: 140400,
      totalSunk: 48630408
    },
    notes: [
      {
        type: 'success',
        title: 'Bulan Paling Sehat & Laba Positif (+Rp 99 Jt)',
        desc: 'Mei 2026 mencetak laba bersih Rp 99.025.287 (+1,75%). Rasio HPP terkendali di 95,64% dan potongan penjualan (diskon) sangat minim (hanya Rp 9.259).'
      },
      {
        type: 'info',
        title: 'Beban Operasional Sangat Hemat (2,17%)',
        desc: 'Beban operasional bulanan hanya 2,17% dari omzet, jauh di bawah rata-rata tahunan (4,02%). Biaya entertainment dan pemeliharaan terkendali baik.'
      }
    ]
  },
  '2026-06': {
    monthKey: '2026-06',
    monthLabel: 'Juni 2026',
    pendapatanKotor: 5750635242,
    potonganPenjualan: 57397271,
    pendapatanBersih: 5693237971,
    hpp: 5543073502,
    labaKotor: 150164469,
    gajiPegawai: 132624000,
    karyawanLainnya: 7764132,
    konsumsi: 472000,
    totalBiayaStaff: 140860132,
    biayaOperasional: 194363975,
    labaOperasional: -44199506,
    labaBersih: -72410025.51,
    yearly: {
      pendapatanBersih: 34855705806,
      hpp: 33437197867,
      labaKotor: 1418507939,
      gajiPegawai: 606570000,
      totalBiayaStaff: 655145322,
      biayaOperasional: 1365607214,
      labaOperasional: 52900725,
      labaBersih: -465437325.14
    },
    sunkCost: {
      penyusutan: 3201053,
      pajakPph25: 39756859,
      pbb: 12550720,
      entertainment: 16324138,
      sumbanganUpacara: 675000,
      thr: 41310000,
      potonganPenjualan: 57397271,
      servisPemeliharaan: 8092500,
      transport: 7908616,
      administrasiBank: 408848.51,
      totalSunk: 179296541
    },
    notes: [
      {
        type: 'warning',
        title: 'Lonjakan Beban Gaji (2,33%): THR Galungan & Kuningan',
        desc: 'Rasio beban gaji melonjak ke 2,33% (+0,59% di atas benchmark tahunan 1,74%). Dipicu oleh pembayaran THR Galungan & Kuningan sebesar Rp 41.310.000 pada 10 Juni.'
      },
      {
        type: 'warning',
        title: 'Beban Musiman Ganda: PBB Tahunan & Entertainment Tamu',
        desc: 'Biaya operasional membengkak +58% menjadi Rp 194,4 Jt (3,41% dari omzet) akibat pelunasan PBB setahun penuh Rp 12.550.720 dan lonjakan entertainment tamu Rp 16.324.138.'
      },
      {
        type: 'danger',
        title: 'Pembalikan Menjadi Rugi Bersih (-Rp 72,4 Jt)',
        desc: 'HPP mulai naik ke 97,36% sementara beban operasional membengkak, membalikkan kinerja perusahaan menjadi rugi operasional -Rp 44,2 Jt dan rugi bersih -Rp 72,4 Jt.'
      }
    ]
  },
  '2026-07': {
    monthKey: '2026-07',
    monthLabel: 'Juli 2026',
    pendapatanKotor: 5342346360,
    potonganPenjualan: 189554134,
    pendapatanBersih: 5152792226,
    hpp: 5128828952,
    labaKotor: 23963274,
    gajiPegawai: 91367000,
    karyawanLainnya: 7939126,
    konsumsi: 372000,
    totalBiayaStaff: 99678126,
    biayaOperasional: 119997932,
    labaOperasional: -96034658,
    labaBersih: -116035806.32,
    yearly: {
      pendapatanBersih: 40008498032,
      hpp: 38566026819,
      labaKotor: 1442471213,
      gajiPegawai: 697937000,
      totalBiayaStaff: 754823448,
      biayaOperasional: 1485605146,
      labaOperasional: -43133933,
      labaBersih: -581473131.46
    },
    sunkCost: {
      penyusutan: 3201053,
      pajakPph25: 39763879,
      pbb: 0,
      entertainment: 0,
      sumbanganUpacara: 1700500,
      thr: 0,
      potonganPenjualan: 189554134,
      servisPemeliharaan: 3492500,
      transport: 6692000,
      administrasiBank: 452412.32,
      bungaPinjamanMihardjo: 20215143,
      totalSunk: 264419209
    },
    notes: [
      {
        type: 'danger',
        title: 'KRITIS: Rasio HPP 99,53% (Jauh di Atas Median)',
        desc: 'HPP menyedot 99,53% omzet bersih (+3,13% di atas data tahunan 96,40%). Laba kotor tersisa hanya Rp 23,96 Jt (0,47%) dari omzet Rp 5,15 Miliar.'
      },
      {
        type: 'danger',
        title: 'Anomali Potongan Penjualan (Diskon) Meledak 3,7%',
        desc: 'Diskon penjualan melonjak 3x lipat menjadi Rp 189.554.134. Concession ini menjadi pemicu kehancuran laba kotor tanpa menghasilkan kenaikan volume omzet.'
      },
      {
        type: 'danger',
        title: 'Rugi Bersih Terbesar Tahun Ini (-Rp 116 Juta)',
        desc: 'Meskipun operasional sudah ditekan sangat efisien (2,33%), laba kotor Rp 23,9 Jt tidak mampu menutup gaji pokok Rp 91,4 Jt, menyebabkan rugi bersih terdalam -Rp 116,0 Jt.'
      }
    ]
  },
  '2026-09': {
    monthKey: '2026-09',
    monthLabel: 'September 2026',
    pendapatanKotor: 5713872370,
    potonganPenjualan: -201430,
    pendapatanBersih: 5714073800,
    hpp: 5476470439,
    labaKotor: 237603361,
    gajiPegawai: 91211000,
    karyawanLainnya: 7939126,
    konsumsi: 508000,
    totalBiayaStaff: 99658126,
    biayaOperasional: 141362157.43,
    labaOperasional: 96241203.57,
    labaBersih: 78718357.42,
    yearly: {
      pendapatanBersih: 52943509113,
      hpp: 50195675246,
      labaKotor: 2747833867,
      gajiPegawai: 881043000,
      totalBiayaStaff: 954706700,
      biayaOperasional: 1748582950.43,
      labaOperasional: 999250916.57,
      labaBersih: 428957677.96
    },
    sunkCost: {
      penyusutan: 3201053,
      pajakPph25: 39752379,
      pbb: 0,
      entertainment: 8802880,
      sumbanganUpacara: 1011500,
      thr: 0,
      potonganPenjualan: 0,
      servisPemeliharaan: 2929000,
      transport: 7593000,
      administrasiBank: 207991.15,
      totalSunk: 63497803.15
    },
    notes: [
      {
        type: 'success',
        title: 'Laba Bersih Stabil Positif (+Rp 78,7 Jt)',
        desc: 'September membukukan omzet bersih Rp 5,71 Miliar dengan laba bersih positif Rp 78,7 Jt (+1,38%) dan laba operasional Rp 96,2 Jt.'
      },
      {
        type: 'info',
        title: 'Akumulasi Kinerja Tahunan Positif (+Rp 429 Jt)',
        desc: 'Secara kumulatif s.d. September 2026, perusahaan mencetak laba bersih Rp 428,96 Jt dengan total omzet bersih Rp 52,94 Miliar.'
      }
    ]
  }
};

let activeHealthPeriod = 'all'; // '2026-01', '2026-02', ..., 'all'
let activeHealthChartMode = 'all'; // 'all', 'omzet', 'gross', 'net'
let activeHealthInvMovementMode = 'qty'; // 'qty' or 'val'
let healthInvSearchText = '';
let healthInvFilter = 'all'; // 'all', 'sold', 'profit_high', 'loss', 'slow'
let healthInvSortCol = 'labaRugiTotal';
let healthInvSortAsc = false;

function openHealthDashboard(updateUrl = true) {
  showHealthView(updateUrl);
}

function showHealthView(updateUrl = true) {
  if (!isAuthenticated()) {
    showLoginView();
    return;
  }

  currentCategoryId = 'health';
  currentStoreKode = null;

  hideAllViews();
  const healthPanel = document.getElementById('viewHealth');
  if (healthPanel) healthPanel.style.display = 'flex';

  updateStickyBar(true, '← KEMBALI KE DASHBOARD', 'Dashboard > Kesehatan Perusahaan');
  renderHealthDashboard();

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (updateUrl) {
    navigateTo('#/health', false);
  }
}

function setHealthPeriod(periodKey) {
  activeHealthPeriod = periodKey;
  renderHealthDashboard();
}

function setHealthChartMode(mode) {
  activeHealthChartMode = mode;
  ['all', 'omzet', 'gross', 'net'].forEach(m => {
    const btn = document.getElementById(`btnHealthMode${m.charAt(0).toUpperCase() + m.slice(1)}`);
    if (btn) {
      if (m === mode) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  const titleEl = document.getElementById('healthFinancialChartTitle');
  const subEl = document.getElementById('healthFinancialChartSubtitle');
  if (titleEl && subEl) {
    if (mode === 'all') {
      titleEl.innerHTML = '📊 1. Grafik Tren &amp; Komparasi: Omzet, Laba Kotor &amp; Laba Bersih';
      subEl.textContent = 'Evaluasi komparatif 3 pilar kinerja finansial secara berdampingan (Desember 2025 - September 2026)';
    } else if (mode === 'omzet') {
      titleEl.innerHTML = '💰 1. Grafik Tren Penjualan: Omzet Bersih &amp; Potongan Diskon';
      subEl.textContent = 'Perkembangan realisasi omzet bersih bulanan dan lonjakan diskon/potongan penjualan';
    } else if (mode === 'gross') {
      titleEl.innerHTML = '📦 1. Grafik Tren Laba Kotor (Gross Profit) &amp; Margin %';
      subEl.textContent = 'Dinamika margin laba kotor terhadap fluktuasi HPP dan diskon harga';
    } else if (mode === 'net') {
      titleEl.innerHTML = '📈 1. Grafik Tren Laba / (Rugi) Bersih &amp; Net Margin %';
      subEl.textContent = 'Dinamika surplus dan defisit bulanan terhadap garis impas (Zero-Line)';
    }
  }

  renderSvgHealthFinancials();
}

function renderHealthDashboard() {
  // 1. Update Period Selector Pills
  const pills = [...HEALTH_MONTHS, 'all'];
  pills.forEach(p => {
    const btn = document.getElementById(`pillHealth_${p}`);
    if (btn) {
      if (p === activeHealthPeriod) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  const headerSummary = document.getElementById('healthPeriodHeaderSummary');
  if (headerSummary) {
    if (activeHealthPeriod === 'all') {
      headerSummary.textContent = `Mode: Komparasi ${HEALTH_MONTHS.length} Bulan (Desember 2025 - September 2026)`;
    } else {
      const d = HEALTH_FINANCIAL_DATA[activeHealthPeriod];
      headerSummary.textContent = `Mode: Periode Tunggal ${d ? d.monthLabel : activeHealthPeriod}`;
    }
  }

  // 2. Render Top 4 Summary Cards (Omzet, Laba Kotor, Laba Bersih, Rasio Biaya)
  renderHealthTopMetrics();

  // 3. Render Financial Trends & Comparisons Chart
  renderSvgHealthFinancials();

  // 4. Render SVG Ratios Chart
  renderSvgHealthRatios();

  // 5. Render Financial P&L and Ratios Table
  renderTableHealthFinancials();

  // 6. Render Inventory Movement (Stok Awal, Beli, Jual, Stok Akhir)
  renderHealthInventoryMovement();

  // 7. Render Product Profitability & Laba per Pcs Table
  renderHealthInventoryProductTable();

  // 8. Render Sunk Cost Dashboard
  renderHealthSunkDashboard();

  // 9. Render Executive Notes & Anomaly Alerts
  renderHealthExecutiveNotes();
}

function renderHealthTopMetrics() {
  const container = document.getElementById('healthTopMetricsGrid');
  if (!container) return;

  if (activeHealthPeriod !== 'all' && HEALTH_FINANCIAL_DATA[activeHealthPeriod]) {
    const d = HEALTH_FINANCIAL_DATA[activeHealthPeriod];
    const grossMarginPct = (d.labaKotor / d.pendapatanBersih) * 100;
    const netMarginPct = (d.labaBersih / d.pendapatanBersih) * 100;
    const hppPct = (d.hpp / d.pendapatanBersih) * 100;
    const salaryPct = (d.gajiPegawai / d.pendapatanBersih) * 100;
    const opexPct = (d.biayaOperasional / d.pendapatanBersih) * 100;

    // Dynamic MoM calculation
    const idx = HEALTH_MONTHS.indexOf(d.monthKey);
    const prevKey = idx > 0 ? HEALTH_MONTHS[idx - 1] : null;
    const prev = prevKey ? HEALTH_FINANCIAL_DATA[prevKey] : null;

    let omzetMomBadge = '✅ BULAN BASIS';
    let omzetMomText = 'Titik awal pembanding periode';
    let grossMomText = `Gross margin ${grossMarginPct.toFixed(2).replace('.', ',')}%`;
    let netMomText = d.labaBersih >= 0 ? 'Mencatat surplus laba bersih' : 'Mencatat defisit operasional';

    if (prev) {
      const omzetDiff = d.pendapatanBersih - prev.pendapatanBersih;
      const omzetPct = (omzetDiff / prev.pendapatanBersih) * 100;
      const grossDiff = d.labaKotor - prev.labaKotor;
      const netDiff = d.labaBersih - prev.labaBersih;

      omzetMomBadge = omzetDiff >= 0 ? `📈 NAIK +${omzetPct.toFixed(2).replace('.', ',')}%` : `🔻 TURUN ${omzetPct.toFixed(2).replace('.', ',')}%`;
      omzetMomText = `${omzetDiff >= 0 ? '+' : ''}${formatShortRupiah(omzetDiff)} vs ${prev.monthLabel}`;
      grossMomText = `${grossDiff >= 0 ? '+' : ''}${formatShortRupiah(grossDiff)} vs ${prev.monthLabel}`;
      netMomText = `${netDiff >= 0 ? '+' : ''}${formatShortRupiah(netDiff)} vs ${prev.monthLabel}`;
    }

    const grossStatus = grossMarginPct < 1.0 ? 'status-danger' : grossMarginPct < 3.0 ? 'status-warning' : 'status-safe';
    const grossBadgeClass = grossMarginPct < 1.0 ? 'badge-status-danger' : grossMarginPct < 3.0 ? 'badge-status-warning' : 'badge-status-safe';
    const grossBadgeText = grossMarginPct < 1.0 ? `🚨 KRITIS (${grossMarginPct.toFixed(2).replace('.', ',')}%` : grossMarginPct < 3.0 ? '⚠️ WASPADA' : '✅ NORMAL';

    const netStatus = d.labaBersih >= 0 ? 'status-safe' : 'status-danger';
    const netBadgeClass = d.labaBersih >= 0 ? 'badge-status-safe' : 'badge-status-danger';
    const netBadgeText = d.labaBersih >= 0 ? '✅ SURPLUS' : '🚨 DEFISIT';

    const ratioStatus = hppPct > 98 ? 'status-danger' : (salaryPct > 2.0 || hppPct > 96.5) ? 'status-warning' : 'status-safe';
    const ratioBadgeClass = hppPct > 98 ? 'badge-status-danger' : (salaryPct > 2.0 || hppPct > 96.5) ? 'badge-status-warning' : 'badge-status-safe';
    const ratioBadgeText = hppPct > 98 ? `🚨 HPP ${hppPct.toFixed(1).replace('.', ',')}%` : salaryPct > 2.0 ? '⚠️ GAJI TINGGI' : '✅ EFISIEN';

    container.innerHTML = `
      <!-- Card 1: Omzet Penjualan -->
      <div class="health-metric-card status-safe">
        <div class="health-metric-card-header">
          <span class="health-metric-title">💰 1. Omzet Bersih Bulan Ini</span>
          <span class="health-metric-badge badge-status-safe">${omzetMomBadge}</span>
        </div>
        <div class="health-metric-main-value" style="color: #0284c7;">
          ${formatRupiah(d.pendapatanBersih)}
        </div>
        <div class="health-metric-subrow">
          <span>Penjualan Kotor:</span>
          <span class="health-metric-nominal">${formatRupiah(d.pendapatanKotor)}</span>
        </div>
        <div class="health-metric-subrow">
          <span>Potongan/Diskon:</span>
          <strong style="color: ${d.potonganPenjualan > 50000000 ? '#ef4444' : 'var(--text-main)'};">
            ${formatRupiah(d.potonganPenjualan)} (${((d.potonganPenjualan / d.pendapatanKotor) * 100).toFixed(2).replace('.', ',')}%)
          </strong>
        </div>
      </div>

      <!-- Card 2: Laba Kotor -->
      <div class="health-metric-card ${grossStatus}">
        <div class="health-metric-card-header">
          <span class="health-metric-title">📦 2. Laba Kotor &amp; Margin</span>
          <span class="health-metric-badge ${grossBadgeClass}">${grossBadgeText}</span>
        </div>
        <div class="health-metric-main-value ${grossMarginPct < 1.0 ? 'text-danger' : grossMarginPct < 3.0 ? 'text-warning' : 'text-success'}">
          ${formatRupiah(d.labaKotor)}
        </div>
        <div class="health-metric-subrow">
          <span>Gross Margin:</span>
          <strong class="health-metric-nominal" style="color: ${grossMarginPct < 1.0 ? '#ef4444' : grossMarginPct < 3.0 ? '#f59e0b' : '#10b981'};">
            ${grossMarginPct.toFixed(2).replace('.', ',')}%
          </strong>
        </div>
        <div class="health-metric-subrow">
          <span>Dinamika MoM:</span>
          <span style="font-weight: 600;">${grossMomText}</span>
        </div>
      </div>

      <!-- Card 3: Laba / (Rugi) Bersih -->
      <div class="health-metric-card ${netStatus}">
        <div class="health-metric-card-header">
          <span class="health-metric-title">📈 3. Laba / (Rugi) Bersih</span>
          <span class="health-metric-badge ${netBadgeClass}">${netBadgeText}</span>
        </div>
        <div class="health-metric-main-value ${d.labaBersih >= 0 ? 'text-success' : 'text-danger'}">
          ${formatRupiah(d.labaBersih)}
        </div>
        <div class="health-metric-subrow">
          <span>Net Profit Margin:</span>
          <strong style="color: ${d.labaBersih >= 0 ? '#10b981' : '#ef4444'};">
            ${netMarginPct >= 0 ? '+' : ''}${netMarginPct.toFixed(2).replace('.', ',')}%
          </strong>
        </div>
        <div class="health-metric-subrow">
          <span>Performa Periode:</span>
          <span style="font-weight: 600;">${netMomText}</span>
        </div>
      </div>

      <!-- Card 4: Rasio Biaya Utama -->
      <div class="health-metric-card ${ratioStatus}">
        <div class="health-metric-card-header">
          <span class="health-metric-title">🩺 4. Rasio Struktur Biaya</span>
          <span class="health-metric-badge ${ratioBadgeClass}">${ratioBadgeText}</span>
        </div>
        <div class="health-metric-main-value" style="color: ${hppPct > 98 ? '#ef4444' : '#0284c7'};">
          HPP: ${hppPct.toFixed(2).replace('.', ',')}%
        </div>
        <div class="health-metric-subrow">
          <span>Gaji Pegawai:</span>
          <strong class="health-metric-nominal" style="color: ${salaryPct > 2.0 ? '#f59e0b' : 'var(--text-main)'};">
            ${salaryPct.toFixed(2).replace('.', ',')}% (${formatRupiah(d.gajiPegawai)})
          </strong>
        </div>
        <div class="health-metric-subrow">
          <span>Biaya Operasional:</span>
          <strong class="health-metric-nominal" style="color: #10b981;">
            ${opexPct.toFixed(2).replace('.', ',')}% (${formatRupiah(d.biayaOperasional)})
          </strong>
        </div>
      </div>
    `;
  } else {
    // Mode 'all': Multi-Month Cumulative Totals & Weighted Ratios
    const totalOmzet = HEALTH_MONTHS.reduce((sum, k) => sum + HEALTH_FINANCIAL_DATA[k].pendapatanBersih, 0);
    const totalKotor = HEALTH_MONTHS.reduce((sum, k) => sum + HEALTH_FINANCIAL_DATA[k].pendapatanKotor, 0);
    const totalDiskon = HEALTH_MONTHS.reduce((sum, k) => sum + HEALTH_FINANCIAL_DATA[k].potonganPenjualan, 0);
    const totalGross = HEALTH_MONTHS.reduce((sum, k) => sum + HEALTH_FINANCIAL_DATA[k].labaKotor, 0);
    const totalNet = HEALTH_MONTHS.reduce((sum, k) => sum + HEALTH_FINANCIAL_DATA[k].labaBersih, 0);
    const avgGrossMargin = (totalGross / totalOmzet) * 100;
    const avgNetMargin = (totalNet / totalOmzet) * 100;
    const avgHppPct = (HEALTH_MONTHS.reduce((sum, k) => sum + HEALTH_FINANCIAL_DATA[k].hpp, 0) / totalOmzet) * 100;
    const avgSalaryPct = (HEALTH_MONTHS.reduce((sum, k) => sum + HEALTH_FINANCIAL_DATA[k].gajiPegawai, 0) / totalOmzet) * 100;
    const avgOpexPct = (HEALTH_MONTHS.reduce((sum, k) => sum + HEALTH_FINANCIAL_DATA[k].biayaOperasional, 0) / totalOmzet) * 100;

    container.innerHTML = `
      <!-- Card 1: Total Omzet Multi-Bulan -->
      <div class="health-metric-card status-safe">
        <div class="health-metric-card-header">
          <span class="health-metric-title">💰 1. Total Omzet Bersih</span>
          <span class="health-metric-badge badge-status-safe">${HEALTH_MONTHS.length} Bulan Aktif</span>
        </div>
        <div class="health-metric-main-value" style="color: #0284c7;">
          ${formatRupiah(totalOmzet)}
        </div>
        <div class="health-metric-subrow">
          <span>Rata-rata Bulanan:</span>
          <span class="health-metric-nominal">${formatShortRupiah(totalOmzet / HEALTH_MONTHS.length)} / bln</span>
        </div>
        <div class="health-metric-subrow">
          <span>Total Diskon/Potongan:</span>
          <strong style="color: #ef4444;">${formatRupiah(totalDiskon)}</strong>
        </div>
      </div>

      <!-- Card 2: Total Laba Kotor Multi-Bulan -->
      <div class="health-metric-card status-warning">
        <div class="health-metric-card-header">
          <span class="health-metric-title">📦 2. Total Laba Kotor</span>
          <span class="health-metric-badge badge-status-warning">Margin: ${avgGrossMargin.toFixed(2).replace('.', ',')}%</span>
        </div>
        <div class="health-metric-main-value text-warning">
          ${formatRupiah(totalGross)}
        </div>
        <div class="health-metric-subrow">
          <span>Rata-rata Bulanan:</span>
          <span class="health-metric-nominal">${formatShortRupiah(totalGross / HEALTH_MONTHS.length)} / bln</span>
        </div>
        <div class="health-metric-subrow">
          <span>Bulan Tertinggi:</span>
          <span style="font-weight: 700; color: #10b981;">April (Rp 351,8 Jt)</span>
        </div>
      </div>

      <!-- Card 3: Akumulasi Laba / Rugi Bersih -->
      <div class="health-metric-card ${totalNet >= 0 ? 'status-safe' : 'status-danger'}">
        <div class="health-metric-card-header">
          <span class="health-metric-title">📈 3. Akumulasi Laba / Rugi</span>
          <span class="health-metric-badge ${totalNet >= 0 ? 'badge-status-safe' : 'badge-status-danger'}">
            ${totalNet >= 0 ? '✅ SURPLUS KUMULATIF' : '🚨 DEFISIT KUMULATIF'}
          </span>
        </div>
        <div class="health-metric-main-value ${totalNet >= 0 ? 'text-success' : 'text-danger'}">
          ${formatRupiah(totalNet)}
        </div>
        <div class="health-metric-subrow">
          <span>Net Profit Margin:</span>
          <strong style="color: ${totalNet >= 0 ? '#10b981' : '#ef4444'};">
            ${totalNet >= 0 ? '+' : ''}${avgNetMargin.toFixed(2).replace('.', ',')}%
          </strong>
        </div>
        <div class="health-metric-subrow">
          <span>Bulan Profit vs Rugi:</span>
          <span style="font-weight: 700;">4 Bulan Surplus | 4 Bulan Defisit</span>
        </div>
      </div>

      <!-- Card 4: Rasio Biaya Utama Multi-Bulan -->
      <div class="health-metric-card status-warning">
        <div class="health-metric-card-header">
          <span class="health-metric-title">🩺 4. Rata-rata Rasio Biaya</span>
          <span class="health-metric-badge badge-status-warning">Tolok Ukur ${HEALTH_MONTHS.length} Bulan</span>
        </div>
        <div class="health-metric-main-value" style="color: #0284c7;">
          HPP: ${avgHppPct.toFixed(1).replace('.', ',')}%
        </div>
        <div class="health-metric-subrow">
          <span>Beban Gaji Rata-rata:</span>
          <span class="health-metric-nominal">${avgSalaryPct.toFixed(2).replace('.', ',')}% dari Omzet</span>
        </div>
        <div class="health-metric-subrow">
          <span>Beban Opex Rata-rata:</span>
          <span class="health-metric-nominal text-success">${avgOpexPct.toFixed(2).replace('.', ',')}% (Terkendali)</span>
        </div>
      </div>
    `;
  }
}

function renderSvgHealthFinancials() {
  const container = document.getElementById('svgHealthFinancialContainer');
  const chipsContainer = document.getElementById('healthChartChipsRow');
  if (!container) return;

  const months = HEALTH_MONTHS;
  const data = months.map(k => HEALTH_FINANCIAL_DATA[k]);
  const curr = (activeHealthPeriod !== 'all' && HEALTH_FINANCIAL_DATA[activeHealthPeriod]) ? HEALTH_FINANCIAL_DATA[activeHealthPeriod] : null;

  // Render 3 Interactive Quick Chips
  if (chipsContainer) {
    const totalOmzetAll = data.reduce((sum, d) => sum + d.pendapatanBersih, 0);
    const totalGrossAll = data.reduce((sum, d) => sum + d.labaKotor, 0);
    const totalNetAll = data.reduce((sum, d) => sum + d.labaBersih, 0);

    const omzetChipVal = curr ? formatRupiah(curr.pendapatanBersih) : formatRupiah(totalOmzetAll);
    const omzetChipDesc = curr ? `Penjualan bersih (${curr.monthLabel})` : `Total ${data.length} bulan • Rata-rata ${formatShortRupiah(totalOmzetAll / data.length)}/bln`;

    const grossChipVal = curr ? formatRupiah(curr.labaKotor) : formatRupiah(totalGrossAll);
    const grossMargin = curr ? ((curr.labaKotor / curr.pendapatanBersih) * 100).toFixed(2).replace('.', ',') + '%' : ((totalGrossAll / totalOmzetAll) * 100).toFixed(2).replace('.', ',') + '% (Rata-rata)';
    const grossChipDesc = curr ? `Gross Margin: ${grossMargin}` : `Margin Rata-rata ${grossMargin} • Puncak April Rp 351M`;

    const netChipVal = curr ? formatRupiah(curr.labaBersih) : formatRupiah(totalNetAll);
    const netChipDesc = curr ? (curr.labaBersih >= 0 ? 'Surplus laba bersih periode' : 'Defisit operasional periode') : `Akumulasi ${data.length} bulan: ${totalNetAll >= 0 ? '+' : ''}${formatShortRupiah(totalNetAll)}`;

    chipsContainer.innerHTML = `
      <div class="health-chip-card ${activeHealthChartMode === 'omzet' ? 'active' : ''}" onclick="setHealthChartMode('omzet')" title="Ketuk untuk melihat grafik tren omzet penjualan">
        <div class="health-chip-header">
          <span>💰 OMZET PENJUALAN</span>
          <span style="color:#0284c7;">➔ Lihat Tren</span>
        </div>
        <div class="health-chip-val" style="color:#0284c7;">${omzetChipVal}</div>
        <div class="health-chip-desc">
          <span>${omzetChipDesc}</span>
          <span style="font-weight:800; color:#10b981;">${curr ? curr.monthLabel : `${data.length} Bulan`}</span>
        </div>
      </div>

      <div class="health-chip-card ${activeHealthChartMode === 'gross' ? 'active' : ''}" onclick="setHealthChartMode('gross')" title="Ketuk untuk melihat grafik tren laba kotor & margin">
        <div class="health-chip-header">
          <span>📦 LABA KOTOR &amp; MARGIN</span>
          <span style="color:#f59e0b;">➔ Lihat Tren</span>
        </div>
        <div class="health-chip-val" style="color:#f59e0b;">${grossChipVal}</div>
        <div class="health-chip-desc">
          <span>${grossChipDesc}</span>
          <span style="font-weight:800; color:#f59e0b;">Margin: ${grossMargin}</span>
        </div>
      </div>

      <div class="health-chip-card ${activeHealthChartMode === 'net' ? 'active' : ''}" onclick="setHealthChartMode('net')" title="Ketuk untuk melihat grafik tren laba bersih & surplus/defisit">
        <div class="health-chip-header">
          <span>📈 LABA / (RUGI) BERSIH</span>
          <span style="color:${(curr ? curr.labaBersih : totalNetAll) >= 0 ? '#10b981' : '#ef4444'};">➔ Lihat Tren</span>
        </div>
        <div class="health-chip-val" style="color:${(curr ? curr.labaBersih : totalNetAll) >= 0 ? '#10b981' : '#ef4444'};">${netChipVal}</div>
        <div class="health-chip-desc">
          <span>${netChipDesc}</span>
          <span style="font-weight:800; color:${(curr ? curr.labaBersih : totalNetAll) >= 0 ? '#10b981' : '#ef4444'};">
            ${(curr ? curr.labaBersih : totalNetAll) >= 0 ? 'Surplus' : 'Defisit'}
          </span>
        </div>
      </div>
    `;
  }

  // Render SVG Chart based on activeHealthChartMode
  const w = 960;
  const h = 360;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 45;
  const padBottom = 55;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  let svgHtml = '';

  if (activeHealthChartMode === 'all') {
    // Mode all: 3 Grouped Bars per month (Omzet, Laba Kotor, Laba Bersih)
    const slotW = plotW / data.length;
    const barW = Math.max(14, Math.min(22, slotW * 0.22));

    let gridLines = '';
    for (let s = 0; s <= 4; s++) {
      const yPos = padTop + (s / 4) * plotH;
      gridLines += `
        <line x1="${padLeft}" y1="${yPos}" x2="${w - padRight}" y2="${yPos}" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3,3" />
      `;
    }

    // Zero-axis for Net Profit
    const zeroY = padTop + plotH * 0.75;
    gridLines += `
      <line x1="${padLeft}" y1="${zeroY}" x2="${w - padRight}" y2="${zeroY}" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.2" />
      <text x="${padLeft - 8}" y="${zeroY + 4}" font-family="var(--font-mono)" font-size="10" font-weight="700" fill="var(--text-muted)" text-anchor="end">Rp 0</text>
    `;

    const maxOmzet = Math.max(...data.map(d => d.pendapatanBersih)) * 1.1;
    const maxGross = Math.max(...data.map(d => d.labaKotor)) * 1.15;
    const maxNet = Math.max(...data.map(d => Math.abs(d.labaBersih))) * 1.15;

    let groupsSvg = '';
    data.forEach((d, i) => {
      const groupCenter = padLeft + (i + 0.5) * slotW;
      const isSelected = (activeHealthPeriod === d.monthKey);

      // 1. Omzet Bar
      const omzetH = Math.max(10, (d.pendapatanBersih / maxOmzet) * (plotH * 0.90));
      const omzetY = padTop + plotH - omzetH;
      const omzetX = groupCenter - barW * 1.55;

      // 2. Laba Kotor Bar
      const grossMarginPct = (d.labaKotor / d.pendapatanBersih) * 100;
      const grossH = Math.max(8, (d.labaKotor / maxGross) * (plotH * 0.70));
      const grossY = padTop + plotH - grossH;
      const grossX = groupCenter - barW * 0.5;
      const grossColor = grossMarginPct < 1.0 ? '#ef4444' : grossMarginPct < 3.0 ? '#f59e0b' : '#10b981';

      // 3. Laba Bersih Bar (around zero line)
      const netMarginPct = (d.labaBersih / d.pendapatanBersih) * 100;
      let netY = zeroY;
      let netH = 0;
      let netColor = '#10b981';
      if (d.labaBersih >= 0) {
        netH = Math.max(10, (d.labaBersih / maxNet) * (plotH * 0.38));
        netY = zeroY - netH;
        netColor = '#10b981';
      } else {
        netH = Math.max(10, (Math.abs(d.labaBersih) / maxNet) * (plotH * 0.22));
        netY = zeroY;
        netColor = '#ef4444';
      }
      const netX = groupCenter + barW * 0.55;

      let auraBg = '';
      if (isSelected) {
        auraBg = `
          <rect x="${groupCenter - slotW * 0.46}" y="${padTop - 8}" width="${slotW * 0.92}" height="${plotH + 16}" rx="8" fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,4" />
          <text x="${groupCenter}" y="${padTop + 4}" font-family="var(--font-sans)" font-size="8.5" font-weight="800" fill="#38bdf8" text-anchor="middle">★ AKTIF</text>
        `;
      }

      const shortLabel = d.monthLabel.replace(' 2026', '').substring(0, 3);

      groupsSvg += `
        ${auraBg}
        <!-- Bar Omzet -->
        <rect x="${omzetX}" y="${omzetY}" width="${barW}" height="${omzetH}" fill="url(#finBlueGrad)" rx="3">
          <title>${d.monthLabel} Omzet Bersih: ${formatRupiah(d.pendapatanBersih)}</title>
        </rect>
        <text x="${omzetX + barW / 2}" y="${omzetY - 4}" font-family="var(--font-mono)" font-size="8.5" font-weight="800" fill="#0284c7" text-anchor="middle">
          ${formatShortRupiah(d.pendapatanBersih)}
        </text>

        <!-- Bar Laba Kotor -->
        <rect x="${grossX}" y="${grossY}" width="${barW}" height="${grossH}" fill="${grossColor}" rx="3">
          <title>${d.monthLabel} Laba Kotor: ${formatRupiah(d.labaKotor)} (${grossMarginPct.toFixed(2)}%)</title>
        </rect>
        <text x="${grossX + barW / 2}" y="${grossY - 4}" font-family="var(--font-mono)" font-size="8" font-weight="800" fill="${grossColor}" text-anchor="middle">
          ${formatShortRupiah(d.labaKotor)}
        </text>

        <!-- Bar Laba Bersih -->
        <rect x="${netX}" y="${netY}" width="${barW}" height="${netH}" fill="${netColor}" rx="3">
          <title>${d.monthLabel} Laba Bersih: ${formatRupiah(d.labaBersih)} (${netMarginPct.toFixed(2)}%)</title>
        </rect>
        <text x="${netX + barW / 2}" y="${d.labaBersih >= 0 ? netY - 4 : netY + netH + 10}" font-family="var(--font-mono)" font-size="8" font-weight="800" fill="${netColor}" text-anchor="middle">
          ${formatShortRupiah(d.labaBersih)}
        </text>

        <!-- Month Label -->
        <text x="${groupCenter}" y="${h - 15}" font-family="var(--font-sans)" font-size="11.5" font-weight="800" fill="var(--text-main)" text-anchor="middle">
          ${shortLabel}
        </text>
      `;
    });

    // Legend
    const legend = `
      <g transform="translate(${padLeft + 10}, 16)">
        <rect x="0" y="0" width="14" height="10" rx="2" fill="#0284c7" />
        <text x="18" y="9" font-family="var(--font-sans)" font-size="11" font-weight="700" fill="var(--text-main)">Omzet Bersih</text>

        <rect x="120" y="0" width="14" height="10" rx="2" fill="#10b981" />
        <text x="138" y="9" font-family="var(--font-sans)" font-size="11" font-weight="700" fill="var(--text-main)">Laba Kotor</text>

        <rect x="235" y="0" width="14" height="10" rx="2" fill="#ef4444" />
        <text x="253" y="9" font-family="var(--font-sans)" font-size="11" font-weight="700" fill="var(--text-main)">Laba / Rugi Bersih</text>
      </g>
    `;

    svgHtml = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="finBlueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0284c7"/>
          </linearGradient>
        </defs>
        ${gridLines}
        ${groupsSvg}
        ${legend}
      </svg>
    `;
  } else if (activeHealthChartMode === 'omzet') {
    // Mode omzet: Dedicated Trendline & Comparison for Net Omzet
    const slotW = plotW / data.length;
    const barW = Math.max(20, Math.min(42, slotW * 0.45));
    const maxOmzet = Math.max(...data.map(d => d.pendapatanBersih + Math.max(0, d.potonganPenjualan))) * 1.15;

    let gridLines = '';
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const val = (maxOmzet / steps) * s;
      const yPos = padTop + plotH - (s / steps) * plotH;
      gridLines += `
        <line x1="${padLeft}" y1="${yPos}" x2="${w - padRight}" y2="${yPos}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />
        <text x="${padLeft - 10}" y="${yPos + 4}" font-family="var(--font-mono)" font-size="10" font-weight="700" fill="var(--text-muted)" text-anchor="end">${formatShortRupiah(val)}</text>
      `;
    }

    const points = [];
    let barsSvg = '';

    data.forEach((d, i) => {
      const xCenter = padLeft + (i + 0.5) * slotW;
      const barH = (d.pendapatanBersih / maxOmzet) * plotH;
      const barY = padTop + plotH - barH;
      const barX = xCenter - barW / 2;

      points.push({ x: xCenter, y: barY, val: d.pendapatanBersih, label: d.monthLabel });

      const diskonH = Math.max(3, (Math.max(0, d.potonganPenjualan) / maxOmzet) * plotH);
      const diskonY = barY - diskonH;
      const isSelected = (activeHealthPeriod === d.monthKey);
      const shortLabel = d.monthLabel.replace(' 2026', '').substring(0, 3);

      barsSvg += `
        ${isSelected ? `<rect x="${xCenter - slotW * 0.44}" y="${padTop - 8}" width="${slotW * 0.88}" height="${plotH + 16}" rx="8" fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,4" />` : ''}

        <!-- Omzet Bar -->
        <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="url(#finOmzetGrad)" rx="4">
          <title>${d.monthLabel} Omzet Bersih: ${formatRupiah(d.pendapatanBersih)}</title>
        </rect>

        ${d.potonganPenjualan > 10000000 ? `
          <!-- Diskon Segment -->
          <rect x="${barX}" y="${diskonY}" width="${barW}" height="${diskonH}" fill="#f97316" rx="2">
            <title>Diskon/Potongan: ${formatRupiah(d.potonganPenjualan)}</title>
          </rect>
          <text x="${xCenter}" y="${diskonY - 4}" font-family="var(--font-sans)" font-size="8.5" font-weight="800" fill="#f97316" text-anchor="middle">Diskon ${formatShortRupiah(d.potonganPenjualan)}</text>
        ` : ''}

        <text x="${xCenter}" y="${barY - 6}" font-family="var(--font-mono)" font-size="10" font-weight="800" fill="#0284c7" text-anchor="middle">
          ${formatShortRupiah(d.pendapatanBersih)}
        </text>

        <text x="${xCenter}" y="${h - 15}" font-family="var(--font-sans)" font-size="12" font-weight="800" fill="var(--text-main)" text-anchor="middle">
          ${shortLabel}
        </text>
      `;
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let p = 1; p < points.length; p++) {
      pathD += ` L ${points[p].x} ${points[p].y}`;
    }

    const trendlineSvg = `
      <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${points.map(pt => `
        <circle cx="${pt.x}" cy="${pt.y}" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="2.5" />
      `).join('')}
    `;

    svgHtml = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="finOmzetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
        </defs>
        ${gridLines}
        ${barsSvg}
        ${trendlineSvg}
      </svg>
    `;
  } else if (activeHealthChartMode === 'gross') {
    // Mode gross: Dedicated Gross Profit & Margin % Trend
    const slotW = plotW / data.length;
    const barW = Math.max(20, Math.min(42, slotW * 0.45));
    const maxGross = Math.max(...data.map(d => d.labaKotor)) * 1.25;

    let gridLines = '';
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const val = (maxGross / steps) * s;
      const yPos = padTop + plotH - (s / steps) * plotH;
      gridLines += `
        <line x1="${padLeft}" y1="${yPos}" x2="${w - padRight}" y2="${yPos}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />
        <text x="${padLeft - 10}" y="${yPos + 4}" font-family="var(--font-mono)" font-size="10" font-weight="700" fill="var(--text-muted)" text-anchor="end">${formatShortRupiah(val)}</text>
      `;
    }

    const points = [];
    let barsSvg = '';

    data.forEach((d, i) => {
      const xCenter = padLeft + (i + 0.5) * slotW;
      const barH = Math.max(10, (d.labaKotor / maxGross) * plotH);
      const barY = padTop + plotH - barH;
      const barX = xCenter - barW / 2;

      const grossMarginPct = (d.labaKotor / d.pendapatanBersih) * 100;
      const isCritical = (grossMarginPct < 1.0);
      const isWarning = (grossMarginPct < 3.0);
      const barColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

      points.push({ x: xCenter, y: barY, margin: grossMarginPct });
      const isSelected = (activeHealthPeriod === d.monthKey);
      const shortLabel = d.monthLabel.replace(' 2026', '').substring(0, 3);

      barsSvg += `
        ${isSelected ? `<rect x="${xCenter - slotW * 0.44}" y="${padTop - 8}" width="${slotW * 0.88}" height="${plotH + 16}" rx="8" fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,4" />` : ''}

        <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="${barColor}" rx="4">
          <title>${d.monthLabel} Laba Kotor: ${formatRupiah(d.labaKotor)} (Margin: ${grossMarginPct.toFixed(2)}%)</title>
        </rect>

        <text x="${xCenter}" y="${barY - 20}" font-family="var(--font-mono)" font-size="10" font-weight="800" fill="${barColor}" text-anchor="middle">
          ${formatShortRupiah(d.labaKotor)}
        </text>

        <!-- Margin Badge -->
        <rect x="${xCenter - 34}" y="${barY - 16}" width="68" height="14" rx="3" fill="${isCritical ? '#fee2e2' : isWarning ? '#ffedd5' : '#dcfce7'}" />
        <text x="${xCenter}" y="${barY - 5}" font-family="var(--font-mono)" font-size="9" font-weight="800" fill="${barColor}" text-anchor="middle">
          ${grossMarginPct.toFixed(2).replace('.', ',')}%
        </text>

        <text x="${xCenter}" y="${h - 15}" font-family="var(--font-sans)" font-size="12" font-weight="800" fill="var(--text-main)" text-anchor="middle">
          ${shortLabel}
        </text>
      `;
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let p = 1; p < points.length; p++) {
      pathD += ` L ${points[p].x} ${points[p].y}`;
    }

    const trendlineSvg = `
      <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="4,4" />
      ${points.map(pt => `
        <circle cx="${pt.x}" cy="${pt.y}" r="4.5" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
      `).join('')}
    `;

    svgHtml = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
        ${gridLines}
        ${barsSvg}
        ${trendlineSvg}
      </svg>
    `;
  } else if (activeHealthChartMode === 'net') {
    // Mode net: Dedicated Net Profit/Loss with Zero-Line
    const slotW = plotW / data.length;
    const barW = Math.max(20, Math.min(42, slotW * 0.45));
    const maxNet = Math.max(...data.map(d => Math.abs(d.labaBersih))) * 1.25;
    const zeroY = padTop + plotH * 0.52;

    let gridLines = '';
    gridLines += `
      <line x1="${padLeft}" y1="${padTop}" x2="${w - padRight}" y2="${padTop}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />
      <text x="${padLeft - 10}" y="${padTop + 4}" font-family="var(--font-mono)" font-size="10" font-weight="700" fill="#10b981" text-anchor="end">+${formatShortRupiah(maxNet)}</text>

      <line x1="${padLeft}" y1="${zeroY}" x2="${w - padRight}" y2="${zeroY}" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" />
      <text x="${padLeft - 10}" y="${zeroY + 4}" font-family="var(--font-mono)" font-size="10" font-weight="800" fill="var(--text-main)" text-anchor="end">Rp 0</text>

      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${w - padRight}" y2="${padTop + plotH}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />
      <text x="${padLeft - 10}" y="${padTop + plotH + 4}" font-family="var(--font-mono)" font-size="10" font-weight="700" fill="#ef4444" text-anchor="end">-${formatShortRupiah(maxNet)}</text>
    `;

    let barsSvg = '';
    const points = [];

    data.forEach((d, i) => {
      const xCenter = padLeft + (i + 0.5) * slotW;
      const barX = xCenter - barW / 2;
      const isPositive = (d.labaBersih >= 0);
      const isSelected = (activeHealthPeriod === d.monthKey);
      const shortLabel = d.monthLabel.replace(' 2026', '').substring(0, 3);

      let barH = Math.max(8, (Math.abs(d.labaBersih) / maxNet) * (plotH * 0.44));
      let barY = isPositive ? (zeroY - barH) : zeroY;
      const barColor = isPositive ? '#10b981' : '#ef4444';

      points.push({ x: xCenter, y: isPositive ? barY : (zeroY + barH) });

      barsSvg += `
        ${isSelected ? `<rect x="${xCenter - slotW * 0.44}" y="${padTop - 8}" width="${slotW * 0.88}" height="${plotH + 16}" rx="8" fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,4" />` : ''}

        <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="${barColor}" rx="4">
          <title>${d.monthLabel} Laba Bersih: ${formatRupiah(d.labaBersih)}</title>
        </rect>

        <text x="${xCenter}" y="${isPositive ? (barY - 6) : (barY + barH + 12)}" font-family="var(--font-mono)" font-size="10" font-weight="800" fill="${barColor}" text-anchor="middle">
          ${formatShortRupiah(d.labaBersih)}
        </text>

        <text x="${xCenter}" y="${h - 15}" font-family="var(--font-sans)" font-size="12" font-weight="800" fill="var(--text-main)" text-anchor="middle">
          ${shortLabel}
        </text>
      `;
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let p = 1; p < points.length; p++) {
      pathD += ` L ${points[p].x} ${points[p].y}`;
    }

    const lineSvg = `
      <path d="${pathD}" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6" />
    `;

    svgHtml = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
        ${gridLines}
        ${barsSvg}
        ${lineSvg}
      </svg>
    `;
  }

  container.innerHTML = svgHtml;
}

function renderSvgHealthRatios() {
  const container = document.getElementById('svgHealthRatioContainer');
  if (!container) return;

  const w = 960;
  const h = 340;
  const padLeft = 65;
  const padRight = 35;
  const padTop = 45;
  const padBottom = 55;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const months = HEALTH_MONTHS;
  const data = months.map(k => HEALTH_FINANCIAL_DATA[k]);

  const groupCount = data.length;
  const slotW = plotW / groupCount;
  const barW = Math.max(14, Math.min(26, slotW * 0.26));

  let gridSvg = '';
  const ySteps = 5;
  for (let s = 0; s <= ySteps; s++) {
    const val = (100 / ySteps) * s;
    const yPos = padTop + plotH - (s / ySteps) * plotH;
    gridSvg += `
      <line x1="${padLeft}" y1="${yPos}" x2="${w - padRight}" y2="${yPos}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />
      <text x="${padLeft - 8}" y="${yPos + 4}" font-family="var(--font-mono)" font-size="11" font-weight="700" fill="var(--text-muted)" text-anchor="end">${val}%</text>
    `;
  }

  // Benchmark line: HPP 96%
  const yHppBench = padTop + plotH - (96.0 / 100) * plotH;
  gridSvg += `
    <line x1="${padLeft}" y1="${yHppBench}" x2="${w - padRight}" y2="${yHppBench}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5,4" />
    <text x="${w - padRight}" y="${yHppBench - 6}" font-family="var(--font-sans)" font-size="10" font-weight="800" fill="#ef4444" text-anchor="end">Benchmark HPP: ~96,0%</text>
  `;

  let barsSvg = '';
  data.forEach((d, i) => {
    const groupCenter = padLeft + (i + 0.5) * slotW;

    const hppPct = (d.hpp / d.pendapatanBersih) * 100;
    const salaryPct = (d.gajiPegawai / d.pendapatanBersih) * 100;
    const opexPct = (d.biayaOperasional / d.pendapatanBersih) * 100;

    // Bar 1: HPP
    const hppH = (hppPct / 100) * plotH;
    const hppY = padTop + plotH - hppH;
    const hppX = groupCenter - barW * 1.55;

    // Bar 2: Gaji
    const salaryH = Math.max(8, (salaryPct / 100) * plotH);
    const salaryY = padTop + plotH - salaryH;
    const salaryX = groupCenter - barW * 0.5;

    // Bar 3: Opex
    const opexH = Math.max(10, (opexPct / 100) * plotH);
    const opexY = padTop + plotH - opexH;
    const opexX = groupCenter + barW * 0.55;

    const isHighHpp = hppPct > 98;
    const isHighSalary = salaryPct > 2.0;
    const shortLabel = d.monthLabel.replace(' 2026', '').substring(0, 3);

    barsSvg += `
      <!-- HPP Bar -->
      <rect x="${hppX}" y="${hppY}" width="${barW}" height="${hppH}" fill="${isHighHpp ? 'url(#hppDangerGrad)' : 'url(#hppGrad)'}" rx="3">
        <title>${d.monthLabel} HPP: ${hppPct.toFixed(2)}% (${formatRupiah(d.hpp)})</title>
      </rect>
      <text x="${hppX + barW / 2}" y="${hppY + 14}" font-family="var(--font-mono)" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle">
        ${hppPct.toFixed(1).replace('.', ',')}%
      </text>

      <!-- Gaji Bar -->
      <rect x="${salaryX}" y="${salaryY}" width="${barW}" height="${salaryH}" fill="${isHighSalary ? '#f59e0b' : '#fb923c'}" rx="3">
        <title>${d.monthLabel} Gaji: ${salaryPct.toFixed(2)}% (${formatRupiah(d.gajiPegawai)})</title>
      </rect>
      <text x="${salaryX + barW / 2}" y="${salaryY - 5}" font-family="var(--font-mono)" font-size="9" font-weight="800" fill="#f59e0b" text-anchor="middle">
        ${salaryPct.toFixed(1).replace('.', ',')}%
      </text>

      <!-- Opex Bar -->
      <rect x="${opexX}" y="${opexY}" width="${barW}" height="${opexH}" fill="#10b981" rx="3">
        <title>${d.monthLabel} Opex: ${opexPct.toFixed(2)}% (${formatRupiah(d.biayaOperasional)})</title>
      </rect>
      <text x="${opexX + barW / 2}" y="${opexY - 5}" font-family="var(--font-mono)" font-size="9" font-weight="800" fill="#10b981" text-anchor="middle">
        ${opexPct.toFixed(1).replace('.', ',')}%
      </text>

      <!-- Month Label -->
      <text x="${groupCenter}" y="${h - 18}" font-family="var(--font-sans)" font-size="12" font-weight="800" fill="var(--text-main)" text-anchor="middle">
        ${shortLabel}
      </text>
    `;
  });

  const legendSvg = `
    <g transform="translate(${padLeft + 10}, 16)">
      <rect x="0" y="0" width="14" height="10" rx="2" fill="#0284c7" />
      <text x="18" y="9" font-family="var(--font-sans)" font-size="11" font-weight="700" fill="var(--text-main)">HPP / Omzet</text>

      <rect x="110" y="0" width="14" height="10" rx="2" fill="#f59e0b" />
      <text x="128" y="9" font-family="var(--font-sans)" font-size="11" font-weight="700" fill="var(--text-main)">Gaji / Omzet</text>

      <rect x="220" y="0" width="14" height="10" rx="2" fill="#10b981" />
      <text x="238" y="9" font-family="var(--font-sans)" font-size="11" font-weight="700" fill="var(--text-main)">Beban Opex / Omzet</text>
    </g>
  `;

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="hppGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
        <linearGradient id="hppDangerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f87171"/>
          <stop offset="100%" stop-color="#dc2626"/>
        </linearGradient>
      </defs>
      ${gridSvg}
      ${barsSvg}
      ${legendSvg}
    </svg>
  `;
}

function renderTableHealthFinancials() {
  const container = document.getElementById('tableHealthFinancials');
  if (!container) return;

  const months = HEALTH_MONTHS;
  const mData = months.map(k => HEALTH_FINANCIAL_DATA[k]);

  let rows = [
    { label: 'Pendapatan Penjualan Kotor', key: 'pendapatanKotor', format: 'rp' },
    { label: 'Potongan Penjualan (Diskon)', key: 'potonganPenjualan', format: 'rp_neg' },
    { label: 'Pendapatan Bersih (Net Omzet)', key: 'pendapatanBersih', format: 'rp_bold' },
    { label: 'Harga Pokok Penjualan (HPP)', key: 'hpp', format: 'rp' },
    { label: '👉 Persentase HPP terhadap Omzet', key: 'hpp_pct', format: 'pct_hpp', highlight: true },
    { label: 'Laba Kotor Perusahaan', key: 'labaKotor', format: 'rp' },
    { label: '👉 Margin Laba Kotor (%)', key: 'gross_margin_pct', format: 'pct_margin' },
    { label: 'Biaya Gaji Pegawai (Akun 5201)', key: 'gajiPegawai', format: 'rp' },
    { label: '👉 Persentase Gaji terhadap Omzet', key: 'gaji_pct', format: 'pct_gaji', highlight: true },
    { label: 'Total Biaya Staff (Gaji+BPJS+Makan)', key: 'totalBiayaStaff', format: 'rp' },
    { label: 'Total Biaya Operasional (Opex)', key: 'biayaOperasional', format: 'rp' },
    { label: '👉 Persentase Opex terhadap Omzet', key: 'opex_pct', format: 'pct_opex', highlight: true },
    { label: 'Laba (Rugi) Operasional', key: 'labaOperasional', format: 'rp_colored' },
    { label: 'Laba (Rugi) Bersih Periode', key: 'labaBersih', format: 'rp_colored_bold', highlight: true }
  ];

  let headerHtml = `
    <tr>
      <th class="col-sticky-freeze">Komponen Keuangan</th>
      ${mData.map(d => `<th style="text-align:right;">${d.monthLabel}</th>`).join('')}
      <th style="text-align:center;">Evaluasi &amp; Catatan Median</th>
    </tr>
  `;

  let bodyHtml = rows.map(r => {
    let cellsHtml = '';

    mData.forEach(d => {
      let cellVal = '';

      if (r.key === 'hpp_pct') {
        const mPct = (d.hpp / d.pendapatanBersih) * 100;
        const isSpike = mPct > 98;
        cellVal = `<span style="font-weight:800; color:${isSpike ? '#ef4444' : '#10b981'};">${mPct.toFixed(2).replace('.', ',')}%</span>`;
      } else if (r.key === 'gross_margin_pct') {
        const mPct = (d.labaKotor / d.pendapatanBersih) * 100;
        cellVal = `<span style="font-weight:800; color:${mPct < 1.0 ? '#ef4444' : mPct < 3.0 ? '#f59e0b' : '#10b981'};">${mPct.toFixed(2).replace('.', ',')}%</span>`;
      } else if (r.key === 'gaji_pct') {
        const mPct = (d.gajiPegawai / d.pendapatanBersih) * 100;
        cellVal = `<span style="font-weight:800; color:${mPct > 2.0 ? '#f59e0b' : 'inherit'};">${mPct.toFixed(2).replace('.', ',')}%</span>`;
      } else if (r.key === 'opex_pct') {
        const mPct = (d.biayaOperasional / d.pendapatanBersih) * 100;
        cellVal = `<span style="font-weight:800; color:${mPct > 5.0 ? '#ef4444' : '#10b981'};">${mPct.toFixed(2).replace('.', ',')}%</span>`;
      } else {
        const mRaw = d[r.key];
        if (r.format === 'rp_colored' || r.format === 'rp_colored_bold') {
          const mColor = mRaw >= 0 ? '#10b981' : '#ef4444';
          cellVal = `<span style="color:${mColor}; font-weight:700;">${formatRupiah(mRaw)}</span>`;
        } else if (r.format === 'rp_neg') {
          cellVal = `<span style="color:${mRaw > 0 ? '#ef4444' : 'inherit'};">${mRaw > 0 ? '-' : ''} ${formatRupiah(Math.abs(mRaw))}</span>`;
        } else {
          cellVal = formatRupiah(mRaw);
        }
      }

      cellsHtml += `<td style="text-align:right;">${cellVal}</td>`;
    });

    let evalCol = '';
    if (r.key === 'hpp_pct') {
      evalCol = `<span style="color:#ef4444; font-weight:800;">🚨 Juli 99,5% (Paling Kritis)</span>`;
    } else if (r.key === 'gaji_pct') {
      evalCol = `<span style="color:#f59e0b; font-weight:800;">⚠️ Juni 2,33% (Ada THR Galungan)</span>`;
    } else if (r.key === 'opex_pct') {
      evalCol = `<span style="color:#ef4444; font-weight:800;">⚠️ Feb 10,5% (Bonus Tahunan)</span>`;
    } else if (r.key === 'labaBersih') {
      evalCol = `<span style="color:#10b981; font-weight:800;">⭐ Rekor April (+Rp 201M)</span>`;
    } else {
      evalCol = `<span style="color:var(--text-muted);">-</span>`;
    }

    const rowClass = r.highlight ? 'style="background: rgba(56, 189, 248, 0.04);"' : '';

    return `
      <tr ${rowClass}>
        <td class="col-label col-sticky-freeze">${r.label}</td>
        ${cellsHtml}
        <td style="text-align:center; font-size:0.8rem;">${evalCol}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table class="chart-data-table">
      <thead>${headerHtml}</thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

/* ==========================================================================
   MODUL KESEHATAN PERUSAHAAN: MUTASI PERSEDIAAN & LABA RUGI PER PCS TIAP BARANG
   ========================================================================== */

function setHealthInventoryMovementMode(mode) {
  activeHealthInvMovementMode = mode;
  const btnQty = document.getElementById('btnInvModeQty');
  const btnVal = document.getElementById('btnInvModeVal');
  if (btnQty && btnVal) {
    if (mode === 'qty') {
      btnQty.classList.add('active');
      btnVal.classList.remove('active');
    } else {
      btnVal.classList.add('active');
      btnQty.classList.remove('active');
    }
  }
  renderHealthInventoryMovement();
}

function onHealthInvSearchChange(val) {
  healthInvSearchText = val || '';
  renderHealthInventoryProductTable();
}

function onHealthInvFilterChange(val) {
  healthInvFilter = val || 'all';
  const filterSelect = document.getElementById('healthInvFilterSelect');
  if (filterSelect && filterSelect.value !== healthInvFilter) {
    filterSelect.value = healthInvFilter;
  }
  renderHealthInventoryProductTable();
}

function sortHealthInventoryProducts(col) {
  if (healthInvSortCol === col) {
    healthInvSortAsc = !healthInvSortAsc;
  } else {
    healthInvSortCol = col;
    healthInvSortAsc = col === 'nama';
  }
  renderHealthInventoryProductTable();
}

function renderHealthInventoryMovement() {
  if (typeof HEALTH_INVENTORY_DATA === 'undefined') return;
  const periodData = HEALTH_INVENTORY_DATA[activeHealthPeriod];
  if (!periodData) return;

  // 1. Render 4 Stock Movement KPI Cards
  const stockGrid = document.getElementById('healthStockMetricsGrid');
  if (stockGrid) {
    const s = periodData.summary;
    const isAll = activeHealthPeriod === 'all';
    const periodLabel = isAll ? `Komparasi ${HEALTH_MONTHS.length} Bulan (Jan - Sep 2026)` : (HEALTH_FINANCIAL_DATA[activeHealthPeriod]?.monthLabel || activeHealthPeriod);

    stockGrid.innerHTML = `
      <div class="health-metric-card status-safe">
        <div class="health-metric-card-header">
          <span class="health-metric-title">📦 STOK AWAL</span>
          <span class="health-metric-badge badge-safe">${isAll ? '1 Des 2025' : periodLabel}</span>
        </div>
        <div class="health-metric-main-value" style="color: #3b82f6;">${s.stokAwalQty.toLocaleString('id-ID')} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">pcs</span></div>
        <div class="health-metric-subrow">
          <span>Nilai Aset:</span>
          <span class="health-metric-nominal">Rp ${s.stokAwalNilai.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div class="health-metric-card status-safe">
        <div class="health-metric-card-header">
          <span class="health-metric-title">🛒 PEMBELIAN (RESTOCK)</span>
          <span class="health-metric-badge badge-info">${isAll ? `Total ${HEALTH_MONTHS.length} Bulan` : periodLabel}</span>
        </div>
        <div class="health-metric-main-value" style="color: #06b6d4;">${s.beliQty.toLocaleString('id-ID')} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">pcs</span></div>
        <div class="health-metric-subrow">
          <span>Total Pembelian:</span>
          <span class="health-metric-nominal">Rp ${s.beliNilai.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div class="health-metric-card status-safe">
        <div class="health-metric-card-header">
          <span class="health-metric-title">💰 PENJUALAN (OMZET)</span>
          <span class="health-metric-badge badge-safe">${isAll ? `Total ${HEALTH_MONTHS.length} Bulan` : periodLabel}</span>
        </div>
        <div class="health-metric-main-value" style="color: #10b981;">${s.jualQty.toLocaleString('id-ID')} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">pcs</span></div>
        <div class="health-metric-subrow">
          <span>Total Omzet:</span>
          <span class="health-metric-nominal">Rp ${s.jualNilai.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div class="health-metric-card status-safe">
        <div class="health-metric-card-header">
          <span class="health-metric-title">🏁 STOK AKHIR</span>
          <span class="health-metric-badge badge-purple">${isAll ? '30 Sep 2026' : periodLabel}</span>
        </div>
        <div class="health-metric-main-value" style="color: #a855f7;">${s.stokAkhirQty.toLocaleString('id-ID')} <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">pcs</span></div>
        <div class="health-metric-subrow">
          <span>Nilai Akhir:</span>
          <span class="health-metric-nominal">Rp ${s.stokAkhirNilai.toLocaleString('id-ID')}</span>
        </div>
      </div>
    `;
  }

  // 2. Render SVG Stock Movement Chart
  const svgContainer = document.getElementById('svgHealthStockContainer');
  if (svgContainer) {
    svgContainer.innerHTML = renderSvgHealthStockMovement();
  }

  // 3. Render Comparative Analysis Box
  const analysisContainer = document.getElementById('healthInvComparativeAnalysis');
  if (analysisContainer) {
    analysisContainer.innerHTML = renderHealthInvComparativeAnalysis();
  }
}

function renderSvgHealthStockMovement() {
  const isQty = activeHealthInvMovementMode === 'qty';
  const months = HEALTH_MONTHS;

  const seriesData = months.map(m => {
    const s = HEALTH_INVENTORY_DATA[m].summary;
    return {
      monthKey: m,
      monthLabel: HEALTH_FINANCIAL_DATA[m].monthLabel,
      stokAwal: isQty ? s.stokAwalQty : s.stokAwalNilai,
      beli: isQty ? s.beliQty : s.beliNilai,
      jual: isQty ? s.jualQty : s.jualNilai,
      stokAkhir: isQty ? s.stokAkhirQty : s.stokAkhirNilai,
      s
    };
  });

  const maxVal = Math.max(
    ...seriesData.flatMap(d => [d.stokAwal, d.beli, d.jual, d.stokAkhir])
  ) * 1.15;

  const width = 960;
  const height = 310;
  const padLeft = 85;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 50;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  let gridSvg = '';
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const yVal = (maxVal / steps) * i;
    const yPos = padTop + chartH - (yVal / maxVal) * chartH;
    const label = isQty ? Math.round(yVal).toLocaleString('id-ID') : formatShortRupiah(yVal);
    gridSvg += `
      <line x1="${padLeft}" y1="${yPos}" x2="${width - padRight}" y2="${yPos}" stroke="var(--border-color)" stroke-dasharray="3,3" opacity="0.6" />
      <text x="${padLeft - 10}" y="${yPos + 4}" fill="var(--text-muted)" font-size="10" font-family="JetBrains Mono, monospace" text-anchor="end">${label}</text>
    `;
  }

  const groupW = chartW / months.length;
  const barW = Math.min(22, (groupW * 0.75) / 4);
  const barGap = 3;
  const colors = {
    stokAwal: '#3b82f6',
    beli: '#06b6d4',
    jual: '#10b981',
    stokAkhir: '#a855f7'
  };

  let barsSvg = '';
  const trendPoints = [];

  seriesData.forEach((d, gIdx) => {
    const groupCenter = padLeft + gIdx * groupW + groupW / 2;
    const startX = groupCenter - (4 * barW + 3 * barGap) / 2;

    const bars = [
      { key: 'stokAwal', val: d.stokAwal, label: 'Stok Awal', color: colors.stokAwal },
      { key: 'beli', val: d.beli, label: 'Pembelian', color: colors.beli },
      { key: 'jual', val: d.jual, label: 'Penjualan', color: colors.jual },
      { key: 'stokAkhir', val: d.stokAkhir, label: 'Stok Akhir', color: colors.stokAkhir }
    ];

    bars.forEach((b, bIdx) => {
      const bx = startX + bIdx * (barW + barGap);
      const bH = (b.val / maxVal) * chartH;
      const by = padTop + chartH - bH;
      const valFmt = isQty ? b.val.toLocaleString('id-ID') : formatShortRupiah(b.val);

      if (b.key === 'stokAkhir') {
        trendPoints.push({ x: bx + barW / 2, y: by, valFmt });
      }

      barsSvg += `
        <rect x="${bx}" y="${by}" width="${barW}" height="${bH}" fill="${b.color}" rx="2">
          <title>${d.monthLabel} - ${b.label}: ${valFmt}</title>
        </rect>
      `;
    });

    const shortLabel = d.monthLabel.replace(' 2026', '').substring(0, 3);
    barsSvg += `
      <text x="${groupCenter}" y="${padTop + chartH + 20}" fill="var(--text-main)" font-size="11" font-weight="700" text-anchor="middle">${shortLabel}</text>
    `;
  });

  let trendlineSvg = '';
  if (trendPoints.length > 1) {
    let pathD = `M ${trendPoints[0].x} ${trendPoints[0].y}`;
    for (let i = 1; i < trendPoints.length; i++) {
      pathD += ` L ${trendPoints[i].x} ${trendPoints[i].y}`;
    }
    trendlineSvg = `
      <path d="${pathD}" fill="none" stroke="#a855f7" stroke-width="2" stroke-dasharray="3,3" />
      ${trendPoints.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#a855f7" stroke="#ffffff" stroke-width="1.5" />
      `).join('')}
    `;
  }

  const legendSvg = `
    <g transform="translate(${padLeft + 10}, 12)">
      <rect x="0" y="0" width="12" height="10" rx="2" fill="${colors.stokAwal}"/>
      <text x="16" y="9" font-size="10.5" fill="var(--text-main)" font-weight="700">Stok Awal</text>
      <rect x="100" y="0" width="12" height="10" rx="2" fill="${colors.beli}"/>
      <text x="116" y="9" font-size="10.5" fill="var(--text-main)" font-weight="700">Pembelian</text>
      <rect x="200" y="0" width="12" height="10" rx="2" fill="${colors.jual}"/>
      <text x="216" y="9" font-size="10.5" fill="var(--text-main)" font-weight="700">Penjualan</text>
      <rect x="300" y="0" width="12" height="10" rx="2" fill="${colors.stokAkhir}"/>
      <text x="316" y="9" font-size="10.5" fill="var(--text-main)" font-weight="700">Stok Akhir</text>
    </g>
  `;

  return `
    <svg viewBox="0 0 ${width} ${height}" width="100%" preserveAspectRatio="xMidYMid meet">
      ${gridSvg}
      ${barsSvg}
      ${trendlineSvg}
      ${legendSvg}
    </svg>
  `;
}

function renderHealthInvComparativeAnalysis() {
  const isAll = activeHealthPeriod === 'all';
  const data = HEALTH_INVENTORY_DATA[activeHealthPeriod];
  if (!data) return '';

  if (isAll) {
    return `
      <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
        <span>🔍 Analisa Komparatif Mutasi Persediaan ${HEALTH_MONTHS.length} Bulan (Desember 2025 - September 2026)</span>
        <span class="badge-purple" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 999px;">Cross-Month Audit</span>
      </div>
      <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px;">
        Evaluasi korelasi siklus restock pembelian, perputaran persediaan (turnover), serta komparasi laba kotor per pcs antar seluruh periode.
      </p>

      <div class="health-inv-analysis-grid">
        <!-- Card 1: Dinamika Arus & Restock Masif -->
        <div class="health-inv-analysis-card theme-warning">
          <div class="health-inv-card-title">
            <span>📦 Siklus Restock &amp; Penumpukan Persediaan</span>
          </div>
          <p class="health-inv-card-text">
            Persediaan dibuka per 1 Desember 2025 sebesar <strong>14.671 pcs (Rp 10,83 M)</strong>, melandai ke <strong>12.203 pcs (Rp 9,14 M)</strong> di akhir Desember dan berlanjut ke awal tahun 2026 dan memuncak di Maret pada <strong>15.529 pcs (Rp 12,08 M)</strong>.
            Penjualan tertinggi terjadi pada <strong>April 2026 (8.090 pcs / Rp 7,27 M)</strong>. Setelah melandai di Juni (10.298 pcs), terjadi restock agresif di Juli (+65% ke 7.838 pcs).
            Hingga akhir September, stok stabil di <strong>13.577 pcs (Rp 11,43 Miliar)</strong>.
          </p>
        </div>

        <!-- Card 2: Tren Laba Rugi per Pcs -->
        <div class="health-inv-analysis-card theme-danger">
          <div class="health-inv-card-title">
            <span>📉 Dinamika Laba Rata-rata per Pcs</span>
          </div>
          <p class="health-inv-card-text">
            Laba kotor rata-rata per ban tertinggi terjadi pada <strong>Januari (Rp 60.916/pcs)</strong> dan <strong>April (Rp 43.476/pcs)</strong>.
            Titik terendah tercatat pada <strong>September (Rp 35.004/pcs)</strong> dan <strong>Juni (Rp 30.654/pcs)</strong> akibat diskon tajam serta erosi margin SKU premium.
          </p>
        </div>

        <!-- Card 3: Top Profit Contributor -->
        <div class="health-inv-analysis-card theme-success">
          <div class="health-inv-card-title">
            <span>⭐ Motor Penggerak Profit Utama</span>
          </div>
          <p class="health-inv-card-text">
            SKU penyumbang profit konsisten volume tinggi:
            <br>• <strong>185/65R15 88S EC</strong>: Kontributor konsisten margin &gt; 6% per ban.
            <br>• <strong>7.50-16 14PR DR2</strong>: Tulang punggung volume penjualan ban niaga/truk.
            <br>• <strong>205/65R16 95H EC</strong>: Profit konsisten &gt; Rp 50.000/pcs.
          </p>
        </div>

        <!-- Card 4: Bleeding & Loss-Making Warning -->
        <div class="health-inv-analysis-card theme-danger">
          <div class="health-inv-card-title">
            <span>⚠️ Alarm Kerugian SKU Margin Minus</span>
          </div>
          <p class="health-inv-card-text">
            Terdeteksi tipe ban premium yang dijual di bawah harga perolehan (margin minus):
            <br>• <strong>235/50R18 97W SP</strong>: Defisit kumulatif tertinggi &gt; Rp 31 Juta.
            <br>• <strong>225 50 18 SPMAX0</strong> &amp; <strong>235 55*18 AT5</strong>: Dijual dengan kerugian rata-rata &gt; Rp 600.000/pcs.
          </p>
        </div>
      </div>
    `;
  }

  // Single Month View
  const s = data.summary;
  const periodLabel = HEALTH_FINANCIAL_DATA[activeHealthPeriod]?.monthLabel || activeHealthPeriod;
  const lossItems = data.items.filter(it => it.jualQty > 0 && it.labaRugiTotal < 0);
  const totalLoss = lossItems.reduce((a, b) => a + b.labaRugiTotal, 0);

  return `
    <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
      <span>🔍 Evaluasi Mutasi Persediaan Periode ${periodLabel}</span>
      <span class="badge-safe" style="font-size: 0.72rem; padding: 2px 8px; border-radius: 999px;">Laba Rata-rata: Rp ${s.labaRugiPerPcsAvg.toLocaleString('id-ID')}/pcs (${s.marginPctAvg}%)</span>
    </div>
    <div class="health-inv-analysis-grid">
      <div class="health-inv-analysis-card theme-purple">
        <div class="health-inv-card-title">Arus Stok &amp; Likuiditas ${periodLabel}</div>
        <p class="health-inv-card-text">
          Stok awal <strong>${s.stokAwalQty.toLocaleString('id-ID')} pcs (Rp ${formatShortRupiah(s.stokAwalNilai)})</strong>, pembelian masuk <strong>${s.beliQty.toLocaleString('id-ID')} pcs (Rp ${formatShortRupiah(s.beliNilai)})</strong>, penjualan keluar <strong>${s.jualQty.toLocaleString('id-ID')} pcs (Rp ${formatShortRupiah(s.jualNilai)})</strong>, menyisakan persediaan akhir <strong>${s.stokAkhirQty.toLocaleString('id-ID')} pcs (Rp ${formatShortRupiah(s.stokAkhirNilai)})</strong>.
        </p>
      </div>
      <div class="health-inv-analysis-card ${lossItems.length > 0 ? 'theme-danger' : 'theme-success'}">
        <div class="health-inv-card-title">Audit SKU Margin Minus (${lossItems.length} Tipe)</div>
        <p class="health-inv-card-text">
          ${lossItems.length > 0 ? `Terdapat <strong>${lossItems.length} SKU</strong> yang dijual di bawah HPP dengan kerugian total <strong>Rp ${Math.abs(totalLoss).toLocaleString('id-ID')}</strong>. Tipe ban yang paling menekan profit: <strong>${lossItems[0].nama}</strong> (rugi Rp ${lossItems[0].labaRugiTotal.toLocaleString('id-ID')}, rugi Rp ${lossItems[0].labaRugiPerPcs.toLocaleString('id-ID')}/pcs).` : 'Seluruh SKU yang terjual menghasilkan laba kotor positif di atas HPP.'}
        </p>
      </div>
    </div>
  `;
}

function renderHealthInventoryProductTable() {
  if (typeof HEALTH_INVENTORY_DATA === 'undefined') return;
  const data = HEALTH_INVENTORY_DATA[activeHealthPeriod];
  if (!data || !data.items) return;

  const chipsContainer = document.getElementById('healthInvProductChipsRow');
  const tableContainer = document.getElementById('tableHealthInventoryProducts');
  if (!chipsContainer || !tableContainer) return;

  let filtered = [...data.items];

  // Search filter
  if (healthInvSearchText.trim()) {
    const q = healthInvSearchText.toLowerCase().trim();
    filtered = filtered.filter(it => it.nama.toLowerCase().includes(q));
  }

  // Quick filter
  if (healthInvFilter === 'sold') {
    filtered = filtered.filter(it => it.jualQty > 0);
  } else if (healthInvFilter === 'profit_high') {
    filtered = filtered.filter(it => it.jualQty > 0 && it.labaRugiPerPcs >= 45000);
  } else if (healthInvFilter === 'loss') {
    filtered = filtered.filter(it => it.jualQty > 0 && it.labaRugiTotal < 0);
  } else if (healthInvFilter === 'slow') {
    filtered = filtered.filter(it => it.jualQty === 0 && it.stokAkhirQty > 0);
  }

  // Sorting
  filtered.sort((a, b) => {
    let vA = a[healthInvSortCol];
    let vB = b[healthInvSortCol];
    if (typeof vA === 'string') {
      return healthInvSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return healthInvSortAsc ? vA - vB : vB - vA;
  });

  // Calculate chip counts
  const totalSku = data.items.length;
  const soldSku = data.items.filter(it => it.jualQty > 0).length;
  const highProfitSku = data.items.filter(it => it.jualQty > 0 && it.labaRugiPerPcs >= 45000).length;
  const lossSku = data.items.filter(it => it.jualQty > 0 && it.labaRugiTotal < 0).length;
  const slowSku = data.items.filter(it => it.jualQty === 0 && it.stokAkhirQty > 0).length;

  chipsContainer.innerHTML = `
    <div class="health-chip-card ${healthInvFilter === 'all' ? 'active' : ''}" onclick="onHealthInvFilterChange('all')">
      <div class="health-chip-header">📦 TOTAL TIPE BAN</div>
      <div class="health-chip-val" style="color: var(--text-main);">${totalSku}</div>
      <div class="health-chip-desc">Semua varian SKU</div>
    </div>
    <div class="health-chip-card ${healthInvFilter === 'sold' ? 'active' : ''}" onclick="onHealthInvFilterChange('sold')">
      <div class="health-chip-header">🛒 BAN TERJUAL</div>
      <div class="health-chip-val" style="color: #10b981;">${soldSku}</div>
      <div class="health-chip-desc">Ada transaksi jual</div>
    </div>
    <div class="health-chip-card ${healthInvFilter === 'profit_high' ? 'active' : ''}" onclick="onHealthInvFilterChange('profit_high')">
      <div class="health-chip-header">⭐ UNTUNG TINGGI</div>
      <div class="health-chip-val" style="color: #3b82f6;">${highProfitSku}</div>
      <div class="health-chip-desc">&ge; Rp 45.000 / pcs</div>
    </div>
    <div class="health-chip-card ${healthInvFilter === 'loss' ? 'active' : ''}" onclick="onHealthInvFilterChange('loss')">
      <div class="health-chip-header">⚠️ MARGIN MINUS / RUGI</div>
      <div class="health-chip-val" style="color: #ef4444;">${lossSku}</div>
      <div class="health-chip-desc">Dijual di bawah HPP</div>
    </div>
    <div class="health-chip-card ${healthInvFilter === 'slow' ? 'active' : ''}" onclick="onHealthInvFilterChange('slow')">
      <div class="health-chip-header">💤 SLOW MOVING</div>
      <div class="health-chip-val" style="color: #94a3b8;">${slowSku}</div>
      <div class="health-chip-desc">Ada stok, 0 terjual</div>
    </div>
  `;

  const sortIcon = (col) => {
    if (healthInvSortCol !== col) return '↕';
    return healthInvSortAsc ? '▲' : '▼';
  };

  const rowsHtml = filtered.map((it, idx) => {
    const isLoss = it.jualQty > 0 && it.labaRugiTotal < 0;
    const isHigh = it.jualQty > 0 && it.labaRugiPerPcs >= 45000;
    const isSlow = it.jualQty === 0 && it.stokAkhirQty > 0;

    let statusBadge = '';
    if (isLoss) {
      statusBadge = '<span class="badge-status-danger" style="font-size: 0.72rem; padding: 2px 6px;">Margin Minus</span>';
    } else if (isHigh) {
      statusBadge = '<span class="badge-status-safe" style="font-size: 0.72rem; padding: 2px 6px;">Profit Tinggi</span>';
    } else if (isSlow) {
      statusBadge = '<span class="badge-status-neutral" style="font-size: 0.72rem; padding: 2px 6px;">Slow Moving</span>';
    } else if (it.jualQty > 0) {
      statusBadge = '<span class="badge-status-safe" style="font-size: 0.72rem; padding: 2px 6px;">Normal</span>';
    } else {
      statusBadge = '<span class="badge-status-neutral" style="font-size: 0.72rem; padding: 2px 6px;">Nol</span>';
    }

    const profitColor = it.labaRugiTotal > 0 ? '#10b981' : it.labaRugiTotal < 0 ? '#ef4444' : 'var(--text-muted)';
    const marginColor = it.marginPct > 0 ? '#10b981' : it.marginPct < 0 ? '#ef4444' : 'var(--text-muted)';

    return `
      <tr class="${isLoss ? 'row-alert-danger' : ''}">
        <td class="col-sticky-freeze" style="font-weight: 700; color: var(--text-main);">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span>${it.nama}</span>
            ${statusBadge}
          </div>
        </td>
        <td style="text-align: right;">${it.stokAwalQty.toLocaleString('id-ID')}</td>
        <td style="text-align: right;">${it.beliQty.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-weight: 700; color: #0284c7;">${it.jualQty.toLocaleString('id-ID')}</td>
        <td style="text-align: right; font-weight: 700;">${it.stokAkhirQty.toLocaleString('id-ID')}</td>
        <td style="text-align: right;">${it.jualQty > 0 ? formatRupiah(it.penjualan) : '-'}</td>
        <td style="text-align: right;">${it.jualQty > 0 ? formatRupiah(it.hargaPokok) : '-'}</td>
        <td style="text-align: right; font-weight: 800; color: ${profitColor};">
          ${it.jualQty > 0 ? formatRupiah(it.labaRugiTotal) : '-'}
        </td>
        <td style="text-align: right; font-weight: 800; color: ${profitColor};">
          ${it.jualQty > 0 ? formatRupiah(it.labaRugiPerPcs) : '-'}
        </td>
        <td style="text-align: right; font-weight: 700; color: ${marginColor};">
          ${it.jualQty > 0 ? it.marginPct.toFixed(2).replace('.', ',') + '%' : '-'}
        </td>
      </tr>
    `;
  }).join('');

  tableContainer.innerHTML = `
    <div class="table-responsive" style="max-height: 520px; overflow-y: auto;">
      <table class="chart-data-table">
        <thead>
          <tr>
            <th class="col-sticky-freeze" onclick="sortHealthInventoryProducts('nama')" style="cursor: pointer;">
              Tipe Barang / Nama Ban ${sortIcon('nama')}
            </th>
            <th style="text-align: right; cursor: pointer;" onclick="sortHealthInventoryProducts('stokAwalQty')">
              Stok Awal ${sortIcon('stokAwalQty')}
            </th>
            <th style="text-align: right; cursor: pointer;" onclick="sortHealthInventoryProducts('beliQty')">
              Pembelian ${sortIcon('beliQty')}
            </th>
            <th style="text-align: right; cursor: pointer;" onclick="sortHealthInventoryProducts('jualQty')">
              Penjualan ${sortIcon('jualQty')}
            </th>
            <th style="text-align: right; cursor: pointer;" onclick="sortHealthInventoryProducts('stokAkhirQty')">
              Stok Akhir ${sortIcon('stokAkhirQty')}
            </th>
            <th style="text-align: right; cursor: pointer;" onclick="sortHealthInventoryProducts('penjualan')">
              Nilai Penjualan ${sortIcon('penjualan')}
            </th>
            <th style="text-align: right; cursor: pointer;" onclick="sortHealthInventoryProducts('hargaPokok')">
              HPP (Beli) ${sortIcon('hargaPokok')}
            </th>
            <th style="text-align: right; cursor: pointer;" onclick="sortHealthInventoryProducts('labaRugiTotal')">
              Total Laba / (Rugi) ${sortIcon('labaRugiTotal')}
            </th>
            <th style="text-align: right; cursor: pointer;" onclick="sortHealthInventoryProducts('labaRugiPerPcs')">
              Laba / (Rugi) per Pcs ${sortIcon('labaRugiPerPcs')}
            </th>
            <th style="text-align: right; cursor: pointer;" onclick="sortHealthInventoryProducts('marginPct')">
              Margin % ${sortIcon('marginPct')}
            </th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">Tidak ada barang yang cocok dengan filter.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderHealthSunkDashboard() {
  const container = document.getElementById('healthSunkDashboard');
  if (!container) return;

  const months = HEALTH_MONTHS;
  const mData = months.map(k => HEALTH_FINANCIAL_DATA[k]);

  container.innerHTML = `
    <div class="chart-header">
      <div>
        <h3 class="chart-title">⚓ 6. Dashboard Sunk Cost (Biaya Tenggelam &amp; Pengeluaran Non-Recoverable)</h3>
        <p class="chart-subtitle">Pemantauan biaya yang sudah keluar dan tidak dapat ditarik kembali terlepas dari keputusan masa depan</p>
      </div>
    </div>

    <!-- Sunk Cost Key Highlights Grid -->
    <div class="health-sunk-grid">
      <div class="sunk-item-box">
        <span class="sunk-item-label">🏢 Akumulasi Penyusutan Aset</span>
        <div class="sunk-item-val">Rp 1.616.848.376</div>
        <span class="sunk-item-desc">Rutin ~Rp 3.201.053/bulan (Bangunan &amp; Inventaris Kantor)</span>
      </div>

      <div class="sunk-item-box">
        <span class="sunk-item-label">🎉 Bonus Tahunan Karyawan (Februari)</span>
        <div class="sunk-item-val">Rp 497.318.482</div>
        <span class="sunk-item-desc">Pengeluaran bonus prestasi dibayarkan penuh di bulan Februari</span>
      </div>

      <div class="sunk-item-box">
        <span class="sunk-item-label">🏛️ Pajak PPh 21 Tahunan &amp; Honor (Januari)</span>
        <div class="sunk-item-val">Rp 394.984.765</div>
        <span class="sunk-item-desc">Pelunasan PPh 21 Pegawai (Rp 107M) &amp; Honorarium (Rp 288M)</span>
      </div>

      <div class="sunk-item-box">
        <span class="sunk-item-label">🏷️ Puncak Potongan Penjualan (Juli)</span>
        <div class="sunk-item-val">Rp 189.554.134</div>
        <span class="sunk-item-desc">Margin concession diskon yang menghabiskan laba kotor di Juli</span>
      </div>

      <div class="sunk-item-box">
        <span class="sunk-item-label">🎉 THR Karyawan (Maret &amp; Juni)</span>
        <div class="sunk-item-val">Rp 53.070.000</div>
        <span class="sunk-item-desc">THR Idul Fitri (Maret Rp 11,8M) &amp; Galungan-Kuningan (Juni Rp 41,3M)</span>
      </div>

      <div class="sunk-item-box">
        <span class="sunk-item-label">⚖️ Titipan Bunga Pinjaman Mihardjo</span>
        <div class="sunk-item-val">Rp 2.288.034.822</div>
        <span class="sunk-item-desc">Beban bunga titipan modal kerja BCA Kredit 1122</span>
      </div>
    </div>

    <!-- Sunk Cost Monthly Comparison Table -->
    <div class="chart-table-wrap" style="margin-top: 10px;">
      <h4 class="table-title">📊 Rincian Komponen Sunk Cost per Bulan (Desember 2025 - September 2026):</h4>
      <div class="table-responsive">
        <table class="chart-data-table">
          <thead>
            <tr>
              <th class="col-sticky-freeze">Kategori Sunk Cost</th>
              ${mData.map(d => `<th style="text-align:right;">${d.monthLabel}</th>`).join('')}
              <th style="text-align:left;">Sifat Biaya</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="col-label col-sticky-freeze">Penyusutan Aktiva Tetap (Depresiasi)</td>
              ${mData.map(d => `<td style="text-align:right;">${formatRupiah(d.sunkCost.penyusutan || 0)}</td>`).join('')}
              <td>Non-cash rutin fasilitas gedung &amp; kantor</td>
            </tr>
            <tr>
              <td class="col-label col-sticky-freeze">Pajak Penghasilan (PPh 25 Setoran Kas)</td>
              ${mData.map(d => `<td style="text-align:right;">${formatRupiah(d.sunkCost.pajakPph25 || 0)}</td>`).join('')}
              <td>Kewajiban negara (~Rp 39,5 Jt/bln)</td>
            </tr>
            <tr>
              <td class="col-label col-sticky-freeze">Bonus Tahunan Karyawan</td>
              ${mData.map(d => `<td style="text-align:right;${(d.sunkCost.bonusTahunan || 0) > 0 ? ' font-weight:700; color:#ef4444;' : ''}">${formatRupiah(d.sunkCost.bonusTahunan || 0)}</td>`).join('')}
              <td>Bonus prestasi tahunan (Februari)</td>
            </tr>
            <tr>
              <td class="col-label col-sticky-freeze">PPh 21 Pegawai &amp; Honorarium</td>
              ${mData.map(d => `<td style="text-align:right;${((d.sunkCost.pph21Pegawai || 0) + (d.sunkCost.pph21Honor || 0)) > 0 ? ' font-weight:700; color:#ef4444;' : ''}">${formatRupiah((d.sunkCost.pph21Pegawai || 0) + (d.sunkCost.pph21Honor || 0))}</td>`).join('')}
              <td>Pelunasan pajak tahunan (Januari)</td>
            </tr>
            <tr>
              <td class="col-label col-sticky-freeze">Pajak Bumi &amp; Bangunan (PBB)</td>
              ${mData.map(d => `<td style="text-align:right;${(d.sunkCost.pbb || 0) > 0 ? ' font-weight:700; color:#ef4444;' : ''}">${formatRupiah(d.sunkCost.pbb || 0)}</td>`).join('')}
              <td>PBB lunas setahun di bulan Juni</td>
            </tr>
            <tr>
              <td class="col-label col-sticky-freeze">THR Karyawan (Idul Fitri &amp; Galungan)</td>
              ${mData.map(d => `<td style="text-align:right;${(d.sunkCost.thr || 0) > 0 ? ' font-weight:700; color:#f59e0b;' : ''}">${formatRupiah(d.sunkCost.thr || 0)}</td>`).join('')}
              <td>Beban keagamaan Maret &amp; Juni</td>
            </tr>
            <tr>
              <td class="col-label col-sticky-freeze">Jamuan Tamu &amp; Entertainment</td>
              ${mData.map(d => `<td style="text-align:right;">${formatRupiah(d.sunkCost.entertainment || 0)}</td>`).join('')}
              <td>Jamuan supplier &amp; mitra kerja</td>
            </tr>
            <tr>
              <td class="col-label col-sticky-freeze">Sumbangan Upacara, Canang &amp; Daksina</td>
              ${mData.map(d => `<td style="text-align:right;">${formatRupiah(d.sunkCost.sumbanganUpacara || 0)}</td>`).join('')}
              <td>Ritual keagamaan lokal bulanan</td>
            </tr>
            <tr>
              <td class="col-label col-sticky-freeze">Potongan Penjualan (Diskon Nota)</td>
              ${mData.map(d => `<td style="text-align:right;${(d.potonganPenjualan || 0) > 50000000 ? ' font-weight:800; color:#ef4444;' : ''}">${formatRupiah(Math.max(0, d.potonganPenjualan || 0))}</td>`).join('')}
              <td>Margin concession pengorbanan laba</td>
            </tr>
            <tr class="row-total">
              <td class="col-label col-sticky-freeze">Total Sunk Cost Teridentifikasi</td>
              ${mData.map(d => `<td style="text-align:right; font-weight:800;">${formatRupiah(d.sunkCost.totalSunk || 0)}</td>`).join('')}
              <td style="font-weight:700;">Pengeluaran non-recoverable</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderHealthExecutiveNotes() {
  const container = document.getElementById('healthExecutiveNotes');
  if (!container) return;

  container.innerHTML = `
    <div class="chart-header">
      <div>
        <h3 class="chart-title">💡 7. Papan Catatan Audit &amp; Peringatan Anomali Keuangan</h3>
        <p class="chart-subtitle">Indikasi deviasi rasio bulanan terhadap median tahunan serta temuan kunci keuangan</p>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 6px;">
      <!-- Alert 1: HPP Spike -->
      <div class="health-note-callout note-danger">
        <div style="font-weight: 800; font-size: 0.95rem; color: #ef4444;">
          🚨 ALARM KRITIS: Rasio HPP Bulan Juli 2026 Mencapai 99,53% (Jauh di Atas Median)
        </div>
        <div style="font-size: 0.88rem; line-height: 1.45; color: var(--text-main);">
          Pada bulan Juli 2026, persentase HPP melonjak tajam ke <strong>99,53%</strong>, berada di atas benchmark tahunan (96,40%).
          Laba kotor perusahaan tersisa hanya <strong>Rp 23.963.274 (0,47%)</strong> dari total omzet bersih Rp 5,15 Miliar akibat lonjakan <strong>potongan penjualan (diskon) sebesar Rp 189.554.134 (3,68%)</strong>.
        </div>
      </div>

      <!-- Alert 2: Gaji & THR Spike -->
      <div class="health-note-callout note-warning">
        <div style="font-weight: 800; font-size: 0.95rem; color: #f59e0b;">
          ⚠️ ANOMALI GAJI: Beban Gaji Bulan Juni 2026 Naik Menjadi 2,33% (+34% di Atas Rata-rata)
        </div>
        <div style="font-size: 0.88rem; line-height: 1.45; color: var(--text-main);">
          Beban gaji melonjak menjadi <strong>Rp 132.624.000 (2,33%)</strong> di Juni dipicu pembayaran <strong>THR Galungan &amp; Kuningan sebesar Rp 41.310.000</strong>. Sebelumnya di Maret juga terdapat pembayaran THR Idul Fitri Rp 11.760.000.
        </div>
      </div>

      <!-- Alert 3: Bonus Tahunan Februari -->
      <div class="health-note-callout note-danger">
        <div style="font-weight: 800; font-size: 0.95rem; color: #ef4444;">
          ⚠️ LONJAKAN OPEX FEBRUARI: Bonus Tahunan Karyawan Rp 497,3 Juta
        </div>
        <div style="font-size: 0.88rem; line-height: 1.45; color: var(--text-main);">
          Total biaya operasional bulan Februari melonjak ke <strong>Rp 619.613.674 (10,51% omzet)</strong> akibat pembagian bonus tahunan prestasi karyawan sebesar <strong>Rp 497.318.482</strong>, menyebabkan defisit operasional bulanan sebesar -Rp 350 Juta.
        </div>
      </div>

      <!-- Alert 4: Rekor April & Efisiensi Mei -->
      <div class="health-note-callout note-success">
        <div style="font-weight: 800; font-size: 0.95rem; color: #10b981;">
          💡 TOLOK UKUR IDEAL: Rekor April (+Rp 201M) &amp; Efisiensi Mei (+Rp 99M)
        </div>
        <div style="font-size: 0.88rem; line-height: 1.45; color: var(--text-main);">
          Bulan April mencatatkan rekor omzet tertinggi sepanjang tahun (<strong>Rp 7,27 Miliar</strong>) dengan laba bersih rekor <strong>Rp 201.670.556 (+2,77%)</strong>. Bulan Mei melengkapi dengan struktur operasional paling hemat di mana opex ditekan ke <strong>2,17%</strong> dan mencetak laba bersih <strong>Rp 99.025.287</strong>.
        </div>
      </div>

      <!-- Alert 5: Likuiditas & Arus Kas Pemilik -->
      <div class="health-note-callout note-info">
        <div style="font-weight: 800; font-size: 0.95rem; color: #38bdf8;">
          🏦 ARUS KAS &amp; PINJAMAN PEMILIK: Ketergantungan Modal Kerja pada Bpk. Mihardjo
        </div>
        <div style="font-size: 0.88rem; line-height: 1.45; color: var(--text-main);">
          Rekening BCA Kredit 1122 menunjukkan perputaran pinjaman modal kerja dari Bpk. Mihardjo dalam miliaran rupiah untuk menjembatani pelunasan tagihan pabrik saat piutang toko belum cair. Akumulasi titipan bunga pinjaman Mihardjo mencapai <strong>Rp 2.288.034.822</strong> di neraca.
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// EXPLICIT GLOBAL BINDINGS (Guarantees inline HTML handlers work everywhere)
// ==========================================================================
if (typeof window !== 'undefined') {
  window.handleLoginSubmit = handleLoginSubmit;
  window.togglePasswordVisibility = togglePasswordVisibility;
  window.handleLogout = handleLogout;
  window.toggleTheme = toggleTheme;
  window.setFontSize = setFontSize;
  window.toggleHeaderCollapse = toggleHeaderCollapse;
  window.toggleFullscreen = toggleFullscreen;
  window.openCategory = openCategory;
  window.openStoreDetail = openStoreDetail;
  window.openBlacklistView = openBlacklistView;
  window.openPaymentView = openPaymentView;
  window.openOwnerDashboard = openOwnerDashboard;
  window.navigateBack = navigateBack;
  window.handleAppPeriodChange = handleAppPeriodChange;
  window.handleGlobalSearch = handleGlobalSearch;
  window.clearGlobalSearch = clearGlobalSearch;
  window.filterCategoryStores = filterCategoryStores;
  window.sortCategoryStores = sortCategoryStores;
  window.filterBLStores = filterBLStores;
  window.sortBLStores = sortBLStores;
  window.handleBlThresholdChange = handleBlThresholdChange;
  window.toggleStoreBucketAccordion = toggleStoreBucketAccordion;
  window.toggleAllStoreBuckets = toggleAllStoreBuckets;
  window.filterPayments = filterPayments;
  window.filterPaymentsByStatus = filterPaymentsByStatus;
  window.togglePaymentStoreAccordion = togglePaymentStoreAccordion;
  window.toggleAllPaymentStores = toggleAllPaymentStores;
  window.setOwnerPeriodPreset = setOwnerPeriodPreset;
  window.handleOwnerCustomRangeChange = handleOwnerCustomRangeChange;
  window.openOwnerPeriodModal = openOwnerPeriodModal;
  window.closeOwnerPeriodModal = closeOwnerPeriodModal;
  window.closeOwnerPeriodModalOnBackdrop = closeOwnerPeriodModalOnBackdrop;
  window.setAgingValueChartMode = setAgingValueChartMode;
  window.handleSaveOwnerCustomPeriod = handleSaveOwnerCustomPeriod;
  window.closeModalOnBackdrop = closeModalOnBackdrop;
  window.openUpdateModal = openUpdateModal;
  window.closeUpdateModal = closeUpdateModal;
  window.handleJsonFileUpload = handleJsonFileUpload;
  window.parseRawOcrTextarea = parseRawOcrTextarea;
  window.downloadCurrentJson = downloadCurrentJson;
  window.restoreOriginalData = restoreOriginalData;
  window.openHealthDashboard = openHealthDashboard;
  window.setHealthPeriod = setHealthPeriod;
  window.setHealthChartMode = setHealthChartMode;
  window.setHealthInventoryMovementMode = setHealthInventoryMovementMode;
  window.onHealthInvSearchChange = onHealthInvSearchChange;
  window.onHealthInvFilterChange = onHealthInvFilterChange;
  window.sortHealthInventoryProducts = sortHealthInventoryProducts;
}
