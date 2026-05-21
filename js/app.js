/* ==========================================================================
   Infostealer Tracking Dashboard - Application Controller
   ========================================================================== */

// Global State
let dataState = {
  summary: null,
  victims: [],
  groups: {},
  sec8k: [],
  filteredVictims: [],
  currentPage: 1,
  pageSize: 12,
  sortBy: 'discovered',
  sortOrder: 'desc',
  activeCharts: {}
};

// Colors Matching Our styles.css Theme
const CHART_COLORS = {
  green: '#10b981',
  red: '#ef4444',
  blue: '#3b82f6',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  gray: '#64748b',
  palette: [
    '#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f43f5e', '#a855f7'
  ]
};

// Document Elements
const el = {
  pageTitle: document.getElementById('page-title'),
  pageSubtitle: document.getElementById('page-subtitle'),
  navItems: document.querySelectorAll('.nav-item'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // KPIs
  kpiDomains: document.getElementById('kpi-domains'),
  kpiEmployees: document.getElementById('kpi-employees'),
  kpiUsers: document.getElementById('kpi-users'),
  kpiFamilies: document.getElementById('kpi-families'),
  
  // Table Controls
  victimSearch: document.getElementById('victim-search'),
  filterGroup: document.getElementById('filter-group'),
  filterSector: document.getElementById('filter-sector'),
  filterCountry: document.getElementById('filter-country'),
  filterStealer: document.getElementById('filter-stealer'),
  
  // Table elements
  victimsTable: document.getElementById('victims-table'),
  victimsTbody: document.getElementById('victims-tbody'),
  paginationInfo: document.getElementById('pagination-info'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  
  // SEC Feed
  secContainer: document.getElementById('sec-filings-container'),
  
  // Group Intel
  groupCorrelationContainer: document.getElementById('group-correlation-container'),
  
  // Drawer
  drawerOverlay: document.getElementById('detail-drawer-overlay'),
  drawer: document.getElementById('detail-drawer'),
  drawerTitle: document.getElementById('drawer-title'),
  drawerBody: document.getElementById('drawer-body'),
  btnCloseDrawer: document.getElementById('btn-close-drawer')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupTableEventListeners();
  setupDrawerEventListeners();
  
  const loaded = await loadData();
  if (loaded) {
    populateKPIs();
    populateFilters();
    renderDashboardCharts();
    updateVictimsTable();
    renderSECFeed();
    renderGroupCorrelation();
  }
});

// Setup Sidebar Navigation
function setupNavigation() {
  el.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      
      // Update sidebar active class
      el.navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      // Update title text depending on active tab
      if (tabId === 'dashboard') {
        el.pageTitle.innerText = 'Threat Dashboard';
        el.pageSubtitle.innerText = 'Historical overview of infostealer credential compromise linked to ransomware incidents.';
      } else if (tabId === 'victims') {
        el.pageTitle.innerText = 'Ransomware Victims & Stealer Intel';
        el.pageSubtitle.innerText = 'Correlated table displaying victims and credential-leak metrics.';
      } else if (tabId === 'sec8k') {
        el.pageTitle.innerText = 'SEC 8-K Regulatory Disclosures';
        el.pageSubtitle.innerText = 'Corporate disclosures of material cybersecurity incidents compiled from EDGAR.';
      } else if (tabId === 'groupintel') {
        el.pageTitle.innerText = 'Ransomware Group Profiles';
        el.pageSubtitle.innerText = 'Attack vector patterns, TTPs, and infostealer usage rankings per group.';
      }
      
      // Toggle visibility of panels
      el.tabContents.forEach(content => {
        if (content.id === tabId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });
}

// Fetch JSON Datasets Async
async function loadData() {
  try {
    const cacheBuster = `?t=${Date.now()}`;
    const urls = {
      summary: `data/summary.json${cacheBuster}`,
      victims: `data/victims.json${cacheBuster}`,
      groups: `data/groups.json${cacheBuster}`,
      sec8k: `data/sec8k.json${cacheBuster}`
    };
    
    // Fetch all files concurrently
    const [summaryRes, victimsRes, groupsRes, sec8kRes] = await Promise.all(
      Object.values(urls).map(url => 
        fetch(url)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status} calling ${url}`);
            return res.json();
          })
          .catch(err => {
            console.warn(`Data load error: ${err.message}`);
            return null; // Return null on error so other files can still load
          })
      )
    );
    
    dataState.summary = summaryRes;
    dataState.victims = victimsRes || [];
    dataState.groups = groupsRes || {};
    dataState.sec8k = sec8kRes || [];
    dataState.filteredVictims = [...dataState.victims];
    
    if (!summaryRes && dataState.victims.length === 0) {
      showErrorUI("No data available. Run the mock script or check API config.");
      return false;
    }
    
    return true;
  } catch (e) {
    showErrorUI(`CRITICAL ERROR LOADING SYSTEM FEEDS: ${e.message}`);
    return false;
  }
}

// Show error inside panels
function showErrorUI(message) {
  el.tabContents.forEach(tab => {
    tab.innerHTML = `
      <div class="info-alert" style="background: rgba(239, 68, 68, 0.05); border-color: var(--color-red);">
        <i class="fa-solid fa-triangle-exclamation info-alert-icon" style="color: var(--color-red);"></i>
        <div class="info-alert-text">
          <h4 style="color: var(--color-red);">System Loading Failure</h4>
          <p>${message}</p>
        </div>
      </div>
    `;
  });
}

// Populates metrics values
function populateKPIs() {
  if (!dataState.summary) return;
  const totals = dataState.summary.totals;
  
  el.kpiDomains.innerText = (totals.domains_tracked || 0).toLocaleString();
  el.kpiEmployees.innerText = (totals.employees_exposed || 0).toLocaleString();
  el.kpiUsers.innerText = (totals.users_exposed || 0).toLocaleString();
  el.kpiFamilies.innerText = (totals.stealer_families_count || 0).toLocaleString();
}

// Build dropdown selections
function populateFilters() {
  const groups = new Set();
  const sectors = new Set();
  const countries = new Set();
  
  dataState.victims.forEach(v => {
    if (v.group) groups.add(v.group);
    if (v.activity) sectors.add(v.activity);
    if (v.country) countries.add(v.country);
  });
  
  // Sort and populate Options
  Array.from(groups).sort().forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.innerText = g;
    el.filterGroup.appendChild(opt);
  });
  
  Array.from(sectors).sort().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.innerText = s;
    el.filterSector.appendChild(opt);
  });
  
  Array.from(countries).sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.innerText = c;
    el.filterCountry.appendChild(opt);
  });
}

// Render Dashboard Chart.js
function renderDashboardCharts() {
  if (!dataState.summary) return;
  const s = dataState.summary;
  
  // Clean past chart instances to avoid redraw issues
  Object.values(dataState.activeCharts).forEach(c => c.destroy());
  
  // 1. Families Donut
  const famCtx = document.getElementById('chart-families').getContext('2d');
  const topFamilies = s.families.slice(0, 7);
  const otherFamCount = s.families.slice(7).reduce((acc, f) => acc + f.count, 0);
  
  const famLabels = topFamilies.map(f => f.name);
  const famData = topFamilies.map(f => f.count);
  if (otherFamCount > 0) {
    famLabels.push('Other');
    famData.push(otherFamCount);
  }
  
  dataState.activeCharts.families = new Chart(famCtx, {
    type: 'doughnut',
    data: {
      labels: famLabels,
      datasets: [{
        data: famData,
        backgroundColor: CHART_COLORS.palette,
        borderWidth: 1,
        borderColor: '#12172a'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { size: 10, family: 'Inter' } }
        }
      }
    }
  });
  
  // 2. Monthly Trend Line
  const monCtx = document.getElementById('chart-monthly').getContext('2d');
  dataState.activeCharts.monthly = new Chart(monCtx, {
    type: 'line',
    data: {
      labels: s.monthly.map(m => m.month),
      datasets: [{
        label: 'Infections Registered',
        data: s.monthly.map(m => m.count),
        borderColor: CHART_COLORS.green,
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: CHART_COLORS.green
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#94a3b8' } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
  
  // 3. Sectors Horizontal Bar
  const secCtx = document.getElementById('chart-sectors').getContext('2d');
  const topSectors = s.sectors.slice(0, 8);
  dataState.activeCharts.sectors = new Chart(secCtx, {
    type: 'bar',
    data: {
      labels: topSectors.map(sec => sec.name),
      datasets: [{
        data: topSectors.map(sec => sec.count),
        backgroundColor: CHART_COLORS.palette.slice(1, 9),
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
  
  // 4. Countries Chart
  const cntCtx = document.getElementById('chart-countries').getContext('2d');
  const topCountries = s.countries.slice(0, 10);
  dataState.activeCharts.countries = new Chart(cntCtx, {
    type: 'bar',
    data: {
      labels: topCountries.map(c => c.name),
      datasets: [{
        data: topCountries.map(c => c.count),
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: CHART_COLORS.blue,
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#94a3b8' } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Victims table filtering
function filterVictims() {
  const query = el.victimSearch.value.toLowerCase().trim();
  const group = el.filterGroup.value;
  const sector = el.filterSector.value;
  const country = el.filterCountry.value;
  const stealerVal = el.filterStealer.value;
  
  dataState.filteredVictims = dataState.victims.filter(v => {
    // Search matching
    const nameMatch = v.victim && v.victim.toLowerCase().includes(query);
    const domainMatch = v.website && v.website.toLowerCase().includes(query);
    if (query && !nameMatch && !domainMatch) return false;
    
    // Dropdown matching
    if (group && v.group !== group) return false;
    if (sector && v.activity !== sector) return false;
    if (country && v.country !== country) return false;
    
    // Stealer status matching
    if (stealerVal) {
      const hasStealer = v.infostealer && (v.infostealer.employees > 0 || v.infostealer.users > 0 || Object.keys(v.infostealer.infostealer_stats || {}).length > 0);
      if (stealerVal === 'has_stealer' && !hasStealer) return false;
      if (stealerVal === 'no_stealer' && hasStealer) return false;
    }
    
    return true;
  });
  
  // Sort list
  sortVictimsData();
  
  dataState.currentPage = 1; // Reset to page 1 on filter
  updateVictimsTable();
}

// Table Sort Logic
function sortVictimsData() {
  const col = dataState.sortBy;
  const ord = dataState.sortOrder === 'asc' ? 1 : -1;
  
  dataState.filteredVictims.sort((a, b) => {
    let valA, valB;
    
    if (col === 'victim') {
      valA = (a.victim || '').toLowerCase();
      valB = (b.victim || '').toLowerCase();
    } else if (col === 'group') {
      valA = (a.group || '').toLowerCase();
      valB = (b.group || '').toLowerCase();
    } else if (col === 'activity') {
      valA = (a.activity || '').toLowerCase();
      valB = (b.activity || '').toLowerCase();
    } else if (col === 'country') {
      valA = (a.country || '').toLowerCase();
      valB = (b.country || '').toLowerCase();
    } else if (col === 'employees') {
      valA = a.infostealer?.employees || 0;
      valB = b.infostealer?.employees || 0;
    } else if (col === 'users') {
      valA = a.infostealer?.users || 0;
      valB = b.infostealer?.users || 0;
    } else if (col === 'discovered') {
      valA = a.discovered || '';
      valB = b.discovered || '';
    } else {
      return 0;
    }
    
    if (valA < valB) return -1 * ord;
    if (valA > valB) return 1 * ord;
    return 0;
  });
}

// Refresh table entries
function updateVictimsTable() {
  const start = (dataState.currentPage - 1) * dataState.pageSize;
  const end = start + dataState.pageSize;
  const pageItems = dataState.filteredVictims.slice(start, end);
  
  el.victimsTbody.innerHTML = '';
  
  if (pageItems.length === 0) {
    el.victimsTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
          No matching records found.
        </td>
      </tr>
    `;
    el.paginationInfo.innerText = "Showing 0 to 0 of 0 entries";
    el.btnPrev.disabled = true;
    el.btnNext.disabled = true;
    return;
  }
  
  pageItems.forEach(v => {
    const is = v.infostealer || {};
    const employees = is.employees || 0;
    const users = is.users || 0;
    const hasStealer = employees > 0 || users > 0 || Object.keys(is.infostealer_stats || {}).length > 0;
    
    const empCell = employees > 0 ? `<span class="exposure-count critical">${employees.toLocaleString()}</span>` : '<span style="color: var(--text-muted);">—</span>';
    const userCell = users > 0 ? `<span class="exposure-count blue">${users.toLocaleString()}</span>` : '<span style="color: var(--text-muted);">—</span>';
    
    const discDate = v.discovered ? v.discovered.substring(0, 10) : '—';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="company-cell">
          <span class="company-name">${v.victim || 'Unknown'}</span>
          <span class="company-domain">${v.website || 'No website'}</span>
        </div>
      </td>
      <td><span class="badge group">${v.group || 'Unknown'}</span></td>
      <td>${v.activity || 'Unknown'}</td>
      <td><span class="badge country">${v.country || '??'}</span></td>
      <td style="text-align: right;">${empCell}</td>
      <td style="text-align: right;">${userCell}</td>
      <td style="text-align: right; font-family: var(--font-mono); font-size: 0.8rem;">${discDate}</td>
      <td style="text-align: center;">
        <button class="btn-action open-details" data-id="${v.id}">
          <i class="fa-solid fa-angles-right"></i>
        </button>
      </td>
    `;
    el.victimsTbody.appendChild(tr);
  });
  
  // Update footer text
  const total = dataState.filteredVictims.length;
  const currentEnd = Math.min(end, total);
  el.paginationInfo.innerText = `Showing ${total === 0 ? 0 : start + 1} to ${currentEnd} of ${total} entries`;
  
  // Enable/disable page buttons
  el.btnPrev.disabled = dataState.currentPage === 1;
  el.btnNext.disabled = end >= total;
}

// Render SEC Disclosures Feed
function renderSECFeed() {
  el.secContainer.innerHTML = '';
  
  if (dataState.sec8k.length === 0) {
    el.secContainer.innerHTML = `
      <div style="text-align: center; padding: 4rem; color: var(--text-muted);">
        <i class="fa-solid fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block;"></i>
        No SEC Form 8-K filings tracked.
      </div>
    `;
    return;
  }
  
  dataState.sec8k.forEach(f => {
    const card = document.createElement('div');
    card.className = 'sec-card';
    
    const badgeClass = f.item_type && f.item_type.includes('1.05') ? 'item105' : 'item801';
    
    card.innerHTML = `
      <div class="sec-card-header">
        <div class="sec-card-title">
          <h3>${f.company_name}</h3>
          <span class="badge sec-badge ${badgeClass}">${f.item_type || 'Disclosure'}</span>
        </div>
        <div class="sec-meta">
          <span>CIK: ${f.cik || '—'}</span>
          <span>Ticker: ${f.ticker || '—'}</span>
          <span>Filed: ${f.filing_date || '—'}</span>
        </div>
      </div>
      <div class="sec-description">
        ${f.description || 'Details regarding the cybersecurity event can be reviewed via EDGAR documentation link below.'}
      </div>
      <a href="${f.url}" target="_blank" class="btn-sec-link">
        <i class="fa-solid fa-square-arrow-up-right"></i> View Official SEC EDGAR Filing
      </a>
    `;
    el.secContainer.appendChild(card);
  });
}

// Render Group Intel correlation bars
function renderGroupCorrelation() {
  el.groupCorrelationContainer.innerHTML = '';
  
  if (!dataState.summary || !dataState.summary.groups_pct) {
    el.groupCorrelationContainer.innerHTML = `<p style="color: var(--text-muted);">No group correlation statistics available.</p>`;
    return;
  }
  
  const groupsPct = dataState.summary.groups_pct;
  
  groupsPct.forEach((g, idx) => {
    const pctVal = g.percent.toFixed(1);
    
    const row = document.createElement('div');
    row.className = 'group-rank-row';
    row.innerHTML = `
      <div class="rank-number">#${idx + 1}</div>
      <div class="group-profile-link show-group-drawer" data-group="${g.group}">
        ${g.group}
      </div>
      <div class="bar-progress-container">
        <div class="bar-progress" style="width: ${pctVal}%;"></div>
      </div>
      <div class="ratio-value">
        ${g.stealer_victims} / ${g.total_victims} victims
      </div>
      <div class="percentage-value">
        ${pctVal}%
      </div>
    `;
    el.groupCorrelationContainer.appendChild(row);
  });
}

// Setup Event Listeners
function setupTableEventListeners() {
  // Filters and search input
  el.victimSearch.addEventListener('input', filterVictims);
  el.filterGroup.addEventListener('change', filterVictims);
  el.filterSector.addEventListener('change', filterVictims);
  el.filterCountry.addEventListener('change', filterVictims);
  el.filterStealer.addEventListener('change', filterVictims);
  
  // Pagination navigation clicks
  el.btnPrev.addEventListener('click', () => {
    if (dataState.currentPage > 1) {
      dataState.currentPage--;
      updateVictimsTable();
    }
  });
  
  el.btnNext.addEventListener('click', () => {
    const total = dataState.filteredVictims.length;
    if (dataState.currentPage * dataState.pageSize < total) {
      dataState.currentPage++;
      updateVictimsTable();
    }
  });
  
  // Sorting triggers
  const ths = el.victimsTable.querySelectorAll('thead th[data-sort]');
  ths.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (dataState.sortBy === col) {
        dataState.sortOrder = dataState.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        dataState.sortBy = col;
        dataState.sortOrder = 'desc'; // Default to desc on first click
      }
      
      // Update arrows UI
      ths.forEach(h => {
        const icon = h.querySelector('i');
        icon.className = 'fa-solid fa-sort';
      });
      
      const activeIcon = th.querySelector('i');
      activeIcon.className = dataState.sortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
      
      sortVictimsData();
      updateVictimsTable();
    });
  });
  
  // Row action click for victim details
  el.victimsTbody.addEventListener('click', e => {
    const btn = e.target.closest('.open-details');
    if (btn) {
      const victimId = btn.getAttribute('data-id');
      openVictimDrawer(victimId);
    }
  });
  
  // Link clicks on Group Intel tab
  el.groupCorrelationContainer.addEventListener('click', e => {
    const link = e.target.closest('.show-group-drawer');
    if (link) {
      const groupName = link.getAttribute('data-group');
      openGroupDrawer(groupName);
    }
  });
}

function setupDrawerEventListeners() {
  const closeDrawer = () => {
    el.drawerOverlay.classList.remove('open');
  };
  
  el.btnCloseDrawer.addEventListener('click', closeDrawer);
  el.drawerOverlay.addEventListener('click', closeDrawer);
}

// Drawer: Render details about a single victim
function openVictimDrawer(victimId) {
  const v = dataState.victims.find(x => x.id === victimId);
  if (!v) return;
  
  el.drawerTitle.innerText = v.victim || "Victim Profile";
  
  const is = v.infostealer || {};
  const employees = is.employees || 0;
  const users = is.users || 0;
  const thirdparties = is.thirdparties || 0;
  const hasStealer = employees > 0 || users > 0 || thirdparties > 0;
  
  // Check if we have additional ransomware group profile data loaded
  const groupProfile = dataState.groups[v.group] || null;
  
  let contentHtml = `
    <!-- Target Overview -->
    <div class="drawer-section">
      <div class="drawer-section-title"><i class="fa-solid fa-circle-info"></i>Overview</div>
      <div class="drawer-metadata-list">
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Corporate Domain</span>
          <span class="drawer-metadata-val mono">${v.website || 'No website'}</span>
        </div>
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Attributed Ransomware</span>
          <span class="drawer-metadata-val"><span class="badge group">${v.group || 'Unknown'}</span></span>
        </div>
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Victim Industry</span>
          <span class="drawer-metadata-val">${v.activity || 'Unknown'}</span>
        </div>
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Registered Country</span>
          <span class="drawer-metadata-val"><span class="badge country">${v.country || '??'}</span></span>
        </div>
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Discovered Date</span>
          <span class="drawer-metadata-val">${v.discovered ? v.discovered.replace('T', ' ').replace('Z', ' UTC') : '—'}</span>
        </div>
      </div>
    </div>
    
    <!-- Infostealer Compromise Details -->
    <div class="drawer-section">
      <div class="drawer-section-title"><i class="fa-solid fa-virus-covid"></i>Credential Exposure footprint</div>
  `;
  
  if (hasStealer) {
    contentHtml += `
      <div class="drawer-kpi-grid">
        <div class="drawer-kpi-box">
          <div class="drawer-kpi-value red">${employees.toLocaleString()}</div>
          <div class="drawer-kpi-label">Employees</div>
        </div>
        <div class="drawer-kpi-box">
          <div class="drawer-kpi-value blue">${users.toLocaleString()}</div>
          <div class="drawer-kpi-label">Users / Logins</div>
        </div>
        <div class="drawer-kpi-box">
          <div class="drawer-kpi-value amber">${thirdparties.toLocaleString()}</div>
          <div class="drawer-kpi-label">3rd Parties</div>
        </div>
      </div>
      
      <div class="drawer-metadata-list" style="margin-bottom: 1.5rem;">
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Exposed Corporate URLs</span>
          <span class="drawer-metadata-val">${(is.employees_url || 0).toLocaleString()} URLs</span>
        </div>
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Customer URL Exposures</span>
          <span class="drawer-metadata-val">${(is.users_url || 0).toLocaleString()} URLs</span>
        </div>
      </div>
      
      <!-- Stealer family chart inside drawer -->
      <div class="drawer-section-title" style="font-size: 0.75rem;"><i class="fa-solid fa-chart-pie"></i>Exposure Distribution</div>
      <div class="chart-container" style="height: 180px;">
        <canvas id="drawer-family-chart"></canvas>
      </div>
    `;
  } else {
    contentHtml += `
      <div style="padding: 1.5rem; text-align: center; background: rgba(0, 0, 0, 0.15); border-radius: 8px; border: 1px dashed var(--card-border);">
        <i class="fa-solid fa-shield-halved" style="font-size: 1.75rem; color: var(--color-green); margin-bottom: 0.5rem; display: block;"></i>
        <p style="font-size: 0.82rem; color: var(--text-secondary);">No credential compromise logs tracked for this domain prior to publication.</p>
      </div>
    `;
  }
  
  contentHtml += `
    </div>
    
    <!-- Ransomware Group Profile Details -->
    <div class="drawer-section">
      <div class="drawer-section-title"><i class="fa-solid fa-skull"></i>Ransom Group profile: ${v.group}</div>
  `;
  
  if (groupProfile) {
    contentHtml += `
      <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
        ${groupProfile.description || 'No descriptive profile available for this group.'}
      </p>
      
      <div class="drawer-metadata-list" style="margin-bottom: 1rem;">
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">First Seen Active</span>
          <span class="drawer-metadata-val">${groupProfile.firstseen ? groupProfile.firstseen.substring(0, 10) : 'Unknown'}</span>
        </div>
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Last Seen Active</span>
          <span class="drawer-metadata-val">${groupProfile.lastseen ? groupProfile.lastseen.substring(0, 10) : 'Active'}</span>
        </div>
        ${groupProfile.locations && groupProfile.locations.length > 0 ? `
          <div class="drawer-metadata-row">
            <span class="drawer-metadata-label">Onion Address</span>
            <span class="drawer-metadata-val mono" style="font-size: 0.72rem; word-break: break-all;">${groupProfile.locations[0].url}</span>
          </div>
        ` : ''}
      </div>
      
      ${groupProfile.ttps && groupProfile.ttps.length > 0 ? `
        <div style="margin-bottom: 1rem;">
          <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Exploitation TTPs</h4>
          <div class="drawer-list-tags">
            ${groupProfile.ttps.map(t => `<span class="drawer-tag">${t}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      ${groupProfile.vulnerabilities && groupProfile.vulnerabilities.length > 0 ? `
        <div style="margin-bottom: 1rem;">
          <h4 style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Associated CVEs</h4>
          <div class="drawer-list-tags">
            ${groupProfile.vulnerabilities.map(cve => `<span class="drawer-tag" style="border-color: rgba(239, 68, 68, 0.2); color: var(--color-red);">${cve}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;
  } else {
    contentHtml += `
      <p style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">No further threat intelligence profile loaded for this group.</p>
    `;
  }
  
  contentHtml += `
    </div>
    
    <!-- Action buttons -->
    <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
      <a href="${v.permalink}" target="_blank" class="btn-sec-link" style="flex-grow: 1; justify-content: center; background: rgba(255, 255, 255, 0.05); padding: 0.65rem; border-radius: 6px; border: 1px solid var(--card-border);">
        <i class="fa-solid fa-up-right-from-square"></i> Open in Ransomware.live
      </a>
      ${v.press ? `
        <a href="${v.press}" target="_blank" class="btn-sec-link" style="flex-grow: 1; justify-content: center; background: rgba(16, 185, 129, 0.1); padding: 0.65rem; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.25);">
          <i class="fa-solid fa-newspaper"></i> Press Coverage
        </a>
      ` : ''}
    </div>
  `;
  
  el.drawerBody.innerHTML = contentHtml;
  
  // Render doughnut chart inside drawer if victim has stealer data
  if (hasStealer) {
    setTimeout(() => {
      const dCtx = document.getElementById('drawer-family-chart').getContext('2d');
      const stats = is.infostealer_stats || {};
      
      new Chart(dCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(stats),
          datasets: [{
            data: Object.values(stats),
            backgroundColor: CHART_COLORS.palette,
            borderWidth: 1,
            borderColor: '#0d1222'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#94a3b8', font: { size: 9, family: 'Inter' } }
            }
          }
        }
      });
    }, 50);
  }
  
  // Open the drawer UI panel
  el.drawerOverlay.classList.add('open');
}

// Drawer: Open details directly about a group (from correlation rows)
function openGroupDrawer(groupName) {
  el.drawerTitle.innerText = `Ransomware Group Profile: ${groupName}`;
  const groupProfile = dataState.groups[groupName] || null;
  
  let contentHtml = `
    <!-- Ransomware Group Profile Details -->
    <div class="drawer-section">
      <div class="drawer-section-title"><i class="fa-solid fa-skull"></i>Ransom Group profile: ${groupName}</div>
  `;
  
  if (groupProfile) {
    contentHtml += `
      <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1.25rem;">
        ${groupProfile.description || 'No descriptive profile available for this group.'}
      </p>
      
      <div class="drawer-metadata-list" style="margin-bottom: 1.5rem;">
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">First Seen Active</span>
          <span class="drawer-metadata-val">${groupProfile.firstseen ? groupProfile.firstseen.substring(0, 10) : 'Unknown'}</span>
        </div>
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Last Seen Active</span>
          <span class="drawer-metadata-val">${groupProfile.lastseen ? groupProfile.lastseen.substring(0, 10) : 'Active'}</span>
        </div>
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Total Correlated Victims</span>
          <span class="drawer-metadata-val" style="font-weight: 700;">${groupProfile.victims || 0} victims</span>
        </div>
        ${groupProfile.locations && groupProfile.locations.length > 0 ? `
          <div class="drawer-metadata-row">
            <span class="drawer-metadata-label">Primary Onion URL</span>
            <span class="drawer-metadata-val mono" style="font-size: 0.72rem; word-break: break-all;">${groupProfile.locations[0].url}</span>
          </div>
        ` : ''}
      </div>
      
      ${groupProfile.ttps && groupProfile.ttps.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.80rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.25rem;">Attack Vectors & TTPs</h4>
          <div class="drawer-list-tags">
            ${groupProfile.ttps.map(t => `<span class="drawer-tag">${t}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      ${groupProfile.vulnerabilities && groupProfile.vulnerabilities.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.80rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.25rem;">Associated CVE Exploits</h4>
          <div class="drawer-list-tags">
            ${groupProfile.vulnerabilities.map(cve => `<span class="drawer-tag" style="border-color: rgba(239, 68, 68, 0.2); color: var(--color-red);">${cve}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      ${groupProfile.tools && groupProfile.tools.length > 0 ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.80rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.25rem;">Tools & Software Used</h4>
          <div class="drawer-list-tags">
            ${groupProfile.tools.map(tool => `<span class="drawer-tag">${tool}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="drawer-metadata-list">
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Negotiations Chat Logs</span>
          <span class="drawer-metadata-val">${groupProfile.has_negotiations ? `<span style="color: var(--color-green); font-weight: 600;">Yes (${groupProfile.negotiation_count} chats)</span>` : 'None Available'}</span>
        </div>
        <div class="drawer-metadata-row">
          <span class="drawer-metadata-label">Leaked Ransom Notes</span>
          <span class="drawer-metadata-val">${groupProfile.has_ransomnote ? `<span style="color: var(--color-blue); font-weight: 600;">Yes (${groupProfile.ransomnotes_count} notes)</span>` : 'None Available'}</span>
        </div>
      </div>
    `;
  } else {
    contentHtml += `
      <p style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">No further threat intelligence profile loaded for this group.</p>
    `;
  }
  
  contentHtml += `
    </div>
    
    <!-- Action buttons -->
    <div style="display: flex; gap: 0.75rem; margin-top: 2rem;">
      <a href="https://www.ransomware.live/group/${groupName.toLowerCase()}" target="_blank" class="btn-sec-link" style="flex-grow: 1; justify-content: center; background: rgba(255, 255, 255, 0.05); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--card-border); font-weight: 600;">
        <i class="fa-solid fa-up-right-from-square"></i> View Group page on Ransomware.live
      </a>
    </div>
  `;
  
  el.drawerBody.innerHTML = contentHtml;
  el.drawerOverlay.classList.add('open');
}
