/**
 * DUNLOP PIUTANG - SENIOR-FRIENDLY APPLICATION
 * PT. Indo Bali Satya Graha
 */

// Global State
let piutangData = null;
let currentCategoryId = null;
let currentStoreKode = null;
let navigationHistory = [];
let categorySortOrder = 'total-desc';
let activeCategoryFilterText = '';

// Number Formatter for Indonesian Rupiah
const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
});

function formatRupiah(num) {
  if (isNaN(num) || num === null || num === undefined) return 'Rp 0';
  return rupiahFormatter.format(num);
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initPreferences();
  loadData();
  setupHashRouting();
});

function initPreferences() {
  // Font Size
  const savedFont = localStorage.getItem('dunlop_font_size') || 'large'; // Default 'large' for elderly
  setFontSize(savedFont);

  // Theme
  const savedTheme = localStorage.getItem('dunlop_theme') || 'soft-light';
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
    document.getElementById('themeIcon').textContent = '☀️';
    document.getElementById('themeText').textContent = 'Siang';
  } else {
    document.body.classList.remove('theme-soft-dark');
    document.body.classList.add('theme-soft-light');
    document.getElementById('themeIcon').textContent = '🌙';
    document.getElementById('themeText').textContent = 'Malam';
  }
  localStorage.setItem('dunlop_theme', theme);
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
      handleInitialRoute();
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
    handleInitialRoute();
    return;
  }

  // 3. Fallback to fetch data.json
  fetch('data.json')
    .then(res => res.json())
    .then(data => {
      piutangData = data;
      renderDashboard();
      handleInitialRoute();
    })
    .catch(err => {
      console.error('Could not load data.json', err);
      alert('Gagal memuat data piutang. Silakan refresh atau upload data.');
    });
}

// ==========================================================================
// ROUTING & NAVIGATION (EXACT BACK BUTTON)
// ==========================================================================

function setupHashRouting() {
  window.addEventListener('hashchange', () => {
    processHashRoute(window.location.hash);
  });
}

function handleInitialRoute() {
  if (window.location.hash) {
    processHashRoute(window.location.hash);
  } else {
    showDashboardView();
  }
}

function processHashRoute(hash) {
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
  if (currentStoreKode) {
    // If in Store detail, go back to previous category or all-stores or dashboard
    if (currentCategoryId) {
      navigateTo(`#/category/${currentCategoryId}`);
    } else {
      navigateTo('#/');
    }
  } else if (currentCategoryId) {
    // If in Category view, go back to dashboard
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
  currentCategoryId = null;
  currentStoreKode = null;

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

  // Headers
  if (meta.company) document.getElementById('headerCompanyTitle').textContent = meta.company;
  if (meta.period) document.getElementById('headerPeriodTitle').textContent = `Laporan Piutang • Per ${meta.period}`;

  // Grand Total Card
  document.getElementById('dashboardGrandTotal').textContent = formatRupiah(meta.grandTotal || 0);
  document.getElementById('dashboardTotalStores').textContent = meta.totalStores || (piutangData.stores?.length || 0);
  document.getElementById('dashboardTotalInvoices').textContent = (meta.totalInvoices || 0).toLocaleString('id-ID');

  // Category Totals & Metas
  // < 30 Hari
  const c30 = cats['lt30'] || {};
  document.getElementById('catTotal_lt30').textContent = formatRupiah(c30.total || 0);
  document.getElementById('catMeta_lt30').textContent = `${c30.stores?.length || 0} Toko • ${(c30.invoiceCount || 0).toLocaleString('id-ID')} Nota`;

  // 31 - 60 Hari
  const c60 = cats['31_60'] || {};
  document.getElementById('catTotal_31_60').textContent = formatRupiah(c60.total || 0);
  document.getElementById('catMeta_31_60').textContent = `${c60.stores?.length || 0} Toko • ${(c60.invoiceCount || 0).toLocaleString('id-ID')} Nota`;

  // 61 - 90 Hari
  const c90 = cats['61_90'] || {};
  document.getElementById('catTotal_61_90').textContent = formatRupiah(c90.total || 0);
  document.getElementById('catMeta_61_90').textContent = `${c90.stores?.length || 0} Toko • ${(c90.invoiceCount || 0).toLocaleString('id-ID')} Nota`;

  // > 90 Hari
  const cGt90 = cats['gt90'] || {};
  document.getElementById('catTotal_gt90').textContent = formatRupiah(cGt90.total || 0);
  document.getElementById('catMeta_gt90').textContent = `${cGt90.stores?.length || 0} Toko • ${(cGt90.invoiceCount || 0).toLocaleString('id-ID')} Nota`;

  if (cGt90.breakdown) {
    document.getElementById('catBreakdown_gt90').innerHTML = `
      <span>91 - 120 hr: ${formatRupiah(cGt90.breakdown.b91_120 || 0)}</span>
      <span>&gt; 120 hr: ${formatRupiah(cGt90.breakdown.bOver120 || 0)}</span>
    `;
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
// VIEW 2: CATEGORY STORE LIST
// ==========================================================================

function openCategory(catId) {
  navigateTo(`#/category/${catId}`);
}

function showCategoryView(catId, updateUrl = true) {
  currentCategoryId = catId;
  currentStoreKode = null;
  activeCategoryFilterText = '';

  document.getElementById('viewDashboard').style.display = 'none';
  document.getElementById('viewCategory').style.display = 'flex';
  document.getElementById('viewStore').style.display = 'none';

  // Setup Sticky Header
  let catTitle = '';
  let catTagClass = 'tag-green';
  let catTotal = 0;
  let catSubinfo = '';
  let storesList = [];

  if (catId === 'all') {
    catTitle = 'Semua Toko Terdaftar';
    catTagClass = 'tag-blue';
    catTotal = piutangData.meta?.grandTotal || 0;
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
    catSubinfo = catData.sublabel || '';
    storesList = catData.stores || [];

    if (catId === 'lt30') catTagClass = 'tag-green';
    else if (catId === '31_60') catTagClass = 'tag-blue';
    else if (catId === '61_90') catTagClass = 'tag-orange';
    else if (catId === 'gt90') catTagClass = 'tag-red';
  }

  // Render Banner
  const tagEl = document.getElementById('categoryBannerTag');
  tagEl.textContent = catId === 'all' ? 'SEMUA TOKO' : catTitle.toUpperCase();
  tagEl.className = `banner-tag ${catTagClass}`;

  document.getElementById('categoryStoreCount').textContent = `${storesList.length} Toko`;
  document.getElementById('categoryBannerTitle').textContent = `Daftar Toko (${catTitle})`;
  document.getElementById('categoryBannerTotal').textContent = formatRupiah(catTotal);
  document.getElementById('categoryBannerSubinfo').textContent = catSubinfo;

  // Clear search input
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
// VIEW 3: STORE DETAIL
// ==========================================================================

function openStoreDetail(kode, fromCat) {
  let hash = `#/store/${kode}`;
  if (fromCat) {
    hash += `?cat=${fromCat}`;
  }
  navigateTo(hash);
}

function showStoreDetailView(kode, fromCat, updateUrl = true) {
  currentStoreKode = kode;
  if (fromCat) currentCategoryId = fromCat;

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

  // Render Category Groups for this Store
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

  const order = ['lt30', '31_60', '61_90', 'gt90'];
  const catStyles = {
    'lt30': { tag: '< 30 HARI', class: 'tag-green' },
    '31_60': { tag: '31 - 60 HARI', class: 'tag-blue' },
    '61_90': { tag: '61 - 90 HARI', class: 'tag-orange' },
    'gt90':  { tag: '> 90 HARI', class: 'tag-red' }
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
          ${invoices.map((inv, idx) => `
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

// Option 1: Upload JSON file
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

// Option 2: Parse Raw OCR Text
function parseRawOcrTextarea() {
  const text = document.getElementById('rawOcrTextarea').value;
  if (!text || text.trim().length === 0) {
    showUpdateStatus('Teks OCR masih kosong. Silakan tempel teks OCR laporan.', false);
    return;
  }

  try {
    const parsedDb = parseOcrString(text);
    if (!parsedDb || parsedDb.stores.length === 0) {
      throw new Error('Tidak ada data nota atau toko yang berhasil diparsing. Pastikan teks berisi format kolom laporan piutang.');
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

// Client-Side OCR Parser
function parseOcrString(text) {
  const lines = text.split(/\r?\n/);
  
  // Try to detect report date
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

        // calculate age days
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
        let catLabel = '< 30 hari';
        if (b30 > 0) { catId = 'lt30'; catLabel = '< 30 hari'; }
        else if (b60 > 0) { catId = '31_60'; catLabel = '31 - 60 hari'; }
        else if (b90 > 0) { catId = '61_90'; catLabel = '61 - 90 hari'; }
        else if (b120 > 0 || bOver > 0) { catId = 'gt90'; catLabel = '> 90 hari'; }

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

  // Group stores
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
          'lt30': { id: 'lt30', label: '< 30 hari', total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          '31_60': { id: '31_60', label: '31 - 60 hari', total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          '61_90': { id: '61_90', label: '61 - 90 hari', total: 0, minAge: 99999, maxAge: 0, invoices: [] },
          'gt90':  { id: 'gt90',  label: '> 90 hari',  total: 0, minAge: 99999, maxAge: 0, invoices: [], breakdown: { b91_120: 0, bOver120: 0 } }
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

    if (inv.catId === 'gt90') {
      if (inv.b120 > 0) c.breakdown.b91_120 += inv.b120;
      if (inv.bOver120 > 0) c.breakdown.bOver120 += inv.bOver120;
    }
  });

  // Fix minAge for empty categories
  Object.values(storeMap).forEach(s => {
    Object.values(s.categories).forEach(c => {
      if (c.invoices.length === 0) c.minAge = 0;
    });
  });

  // Categories summary
  const catSummary = {
    'lt30': { id: 'lt30', label: '< 30 hari', sublabel: 'Usia 0 - 30 hari', total: 0, invoiceCount: 0, stores: [] },
    '31_60': { id: '31_60', label: '31 - 60 hari', sublabel: 'Usia 31 - 60 hari', total: 0, invoiceCount: 0, stores: [] },
    '61_90': { id: '61_90', label: '61 - 90 hari', sublabel: 'Usia 61 - 90 hari', total: 0, invoiceCount: 0, stores: [] },
    'gt90':  { id: 'gt90',  label: '> 90 hari',  sublabel: 'Usia lebih dari 90 hari', total: 0, invoiceCount: 0, breakdown: { b91_120: 0, bOver120: 0 }, stores: [] }
  };

  Object.values(storeMap).forEach(s => {
    ['lt30', '31_60', '61_90', 'gt90'].forEach(catId => {
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
        if (catId === 'gt90') {
          cSum.breakdown.b91_120 += sc.breakdown.b91_120;
          cSum.breakdown.bOver120 += sc.breakdown.bOver120;
        }
      }
    });
  });

  // Sort
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
