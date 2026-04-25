/* ═══════════════════════════════════════════════════
   LIBERTÀ CRÉATIVITÉ — ADMIN JS
   localStorage-powered, zero-data start, connected to public site form
   ═══════════════════════════════════════════════════ */
'use strict';

// ── STORAGE KEYS ──
const KEYS = {
  reservations: 'lc_reservations',
  clients: 'lc_clients',
  invoices: 'lc_invoices',
  settings: 'lc_settings',
  auth: 'lc_admin_auth'
};

// ── SERVICES MAP (for pricing & color categories) ──
const SERVICE_MAP = {
  'Location Studio — 70€':       { price: 70, cat: 'studio' },
  'Location Podcast — dès 80€':  { price: 80, cat: 'podcast' },
  'Vestiaire — 50€':             { price: 50, cat: 'studio' },
  'Événementiel Privé — 150€/h': { price: 150, cat: 'event' },
  'Événementiel Corporate — 150€/h': { price: 150, cat: 'event' },
  'Photo 30 min — 125€':         { price: 125, cat: 'photo' },
  'Photo 1h — 185€':             { price: 185, cat: 'photo' },
  'Pack 1 Caméra (Brut) — 160€': { price: 160, cat: 'podcast' },
  'Pack 1 Caméra + Montage — 300€': { price: 300, cat: 'podcast' },
  'Pack 2 Caméras (Brut) — 250€':   { price: 250, cat: 'podcast' },
  'Pack 2 Caméras + Montage — 380€': { price: 380, cat: 'podcast' },
  'Direction Artistique — dès 300€':  { price: 300, cat: 'photo' }
};

// ── HELPERS ──
function load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function loadObj(key, defaults) { try { return { ...defaults, ...JSON.parse(localStorage.getItem(key)) }; } catch { return defaults; } }
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function fmt(n) { return new Intl.NumberFormat('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type + ' visible';
  setTimeout(() => el.classList.remove('visible'), 3000);
}

// ── DEFAULT SETTINGS ──
const DEFAULT_SETTINGS = {
  studioName: 'Libertà Créativité',
  address: 'Rue du Mail 13/15, 1050 Ixelles, Bruxelles',
  email: 'libertacreativite@gmail.com',
  phone: '',
  instagram: '',
  capacity: 70,
  surface: 115,
  openDays: { lun: false, mar: true, mer: true, jeu: true, ven: true, sam: true, dim: true },
  openTime: '10:00',
  closeTime: '20:00',
  closedDates: [],
  adminUser: 'admin',
  adminPass: 'liberta2026'
};

// ── STATE ──
let currentPage = 'dashboard';
let reservations = load(KEYS.reservations);
let clients = load(KEYS.clients);
let invoices = load(KEYS.invoices);
let settings = loadObj(KEYS.settings, DEFAULT_SETTINGS);
let calMonth, calYear, calView = 'month';

// ── AUTH ──
function checkAuth() {
  const authed = sessionStorage.getItem('lc_authed');
  document.getElementById('loginOverlay').classList.toggle('hidden', authed === 'true');
}
function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value;
  const pass = document.getElementById('loginPass').value;
  if (user === settings.adminUser && pass === settings.adminPass) {
    sessionStorage.setItem('lc_authed', 'true');
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('loginError').style.display = 'none';
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}
function logout() {
  sessionStorage.removeItem('lc_authed');
  document.getElementById('loginOverlay').classList.remove('hidden');
}

// ── NAVIGATION ──
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.style.display = p.id === 'page-' + page ? '' : 'none');
  document.getElementById('topbarTitle').textContent = {
    dashboard: 'Tableau de bord',
    reservations: 'Réservations',
    clients: 'Clients',
    invoices: 'Factures',
    planning: 'Planning',
    system: 'Système'
  }[page] || 'Admin';
  // Refresh page data
  if (page === 'dashboard') renderDashboard();
  if (page === 'reservations') renderReservations();
  if (page === 'clients') renderClients();
  if (page === 'invoices') renderInvoices();
  if (page === 'planning') renderPlanning();
  if (page === 'system') renderSystem();
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ── MOBILE SIDEBAR ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

// ═══════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════
function renderDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  const todayRes = reservations.filter(r => r.date === today && r.status !== 'cancelled');
  const monthRes = reservations.filter(r => r.date && r.date.startsWith(month) && r.status !== 'cancelled');
  const monthRevenue = monthRes.reduce((s, r) => s + (r.price || 0), 0);
  // Occupation: count booked slots vs total available slots this month
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const slotsPerDay = 5; // 10-20h = 5 slots of 2h
  const openDaysCount = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth(), i + 1);
    const dayName = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][d.getDay()];
    return settings.openDays[dayName] ? 1 : 0;
  }).reduce((a, b) => a + b, 0);
  const totalSlots = openDaysCount * slotsPerDay;
  const occupation = totalSlots > 0 ? Math.round((monthRes.length / totalSlots) * 100) : 0;

  document.getElementById('statTodayRes').textContent = todayRes.length;
  document.getElementById('statMonthRes').textContent = monthRes.length;
  document.getElementById('statRevenue').textContent = fmt(monthRevenue) + ' €';
  document.getElementById('statOccupation').textContent = occupation + '%';

  // Last 5 reservations
  const last5 = [...reservations].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
  const last5El = document.getElementById('dashLastReservations');
  if (last5.length === 0) {
    last5El.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-desc">Aucune réservation</div></div>';
  } else {
    last5El.innerHTML = '<table><thead><tr><th>Client</th><th>Service</th><th>Date</th><th>Statut</th></tr></thead><tbody>' +
      last5.map(r => `<tr><td>${esc(r.firstName)} ${esc(r.lastName)}</td><td style="font-size:.78rem">${esc(r.service)}</td><td>${fmtDate(r.date)}</td><td>${statusBadge(r.status)}</td></tr>`).join('') +
      '</tbody></table>';
  }

  // Chart placeholder (simple bar chart with canvas)
  renderChart(monthRes);

  // Weekly planning preview
  renderWeekPreview();
}

function renderChart(monthRes) {
  const canvas = document.getElementById('dashChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.offsetWidth, h = canvas.offsetHeight;

  // Count reservations per month for last 6 months
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('fr-BE', { month: 'short' });
    const count = reservations.filter(r => r.date && r.date.startsWith(key) && r.status !== 'cancelled').length;
    months.push({ label, count });
  }
  const max = Math.max(...months.map(m => m.count), 1);
  const barW = Math.min(40, (w - 60) / months.length - 10);
  const chartH = h - 40;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#A89888';
  ctx.font = '10px Outfit, sans-serif';
  ctx.textAlign = 'center';

  months.forEach((m, i) => {
    const x = 40 + i * ((w - 60) / months.length) + barW / 2;
    const barH = (m.count / max) * (chartH - 20);
    // Bar
    ctx.fillStyle = m.count > 0 ? '#C49B6C' : '#E5DBD0';
    ctx.beginPath();
    ctx.roundRect(x - barW / 2, chartH - barH, barW, barH, 4);
    ctx.fill();
    // Label
    ctx.fillStyle = '#A89888';
    ctx.fillText(m.label, x, h - 10);
    // Count
    if (m.count > 0) {
      ctx.fillStyle = '#3A2C24';
      ctx.fillText(m.count, x, chartH - barH - 6);
    }
  });
}

function renderWeekPreview() {
  const el = document.getElementById('dashWeekPreview');
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayRes = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled');
    days.push({ label: d.toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric' }), res: dayRes, isToday: dateStr === now.toISOString().slice(0, 10) });
  }
  if (reservations.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-desc">Planning vide cette semaine</div></div>';
    return;
  }
  el.innerHTML = days.map(d => `<div style="padding:.5rem;border-bottom:1px solid var(--border);${d.isToday ? 'background:rgba(196,155,108,.05)' : ''}">
    <div style="font-size:.72rem;color:${d.isToday ? 'var(--accent)' : 'var(--text-muted)'};font-weight:${d.isToday ? '600' : '400'};margin-bottom:.3rem">${d.label}</div>
    ${d.res.length === 0 ? '<span style="font-size:.72rem;color:var(--text-muted)">—</span>' : d.res.map(r => `<div class="cal-event cat-${getCategory(r.service)}" style="font-size:.58rem;margin-bottom:2px">${esc(r.slot || '')} ${esc(r.service).substring(0, 25)}</div>`).join('')}
  </div>`).join('');
}

// ═══════════════════════════════════════════════════
// RESERVATIONS
// ═══════════════════════════════════════════════════
let resFilter = 'all', resSearch = '';

function renderReservations() {
  let list = [...reservations];
  if (resFilter !== 'all') list = list.filter(r => r.status === resFilter);
  if (resSearch) {
    const q = resSearch.toLowerCase();
    list = list.filter(r => `${r.firstName} ${r.lastName} ${r.service} ${r.email}`.toLowerCase().includes(q));
  }
  list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const tbody = document.getElementById('reservationsBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Aucune réservation</div><div class="empty-desc">${resFilter !== 'all' ? 'Aucune réservation avec ce statut.' : 'Les réservations du site apparaîtront ici.'}</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(r => `<tr>
    <td style="font-size:.72rem;color:var(--text-muted)">${r.id.slice(-6).toUpperCase()}</td>
    <td><strong>${esc(r.firstName)} ${esc(r.lastName)}</strong><br><span style="font-size:.72rem;color:var(--text-muted)">${esc(r.email)}</span></td>
    <td style="font-size:.78rem">${esc(r.service)}</td>
    <td>${fmtDate(r.date)}</td>
    <td>${esc(r.slot || '—')}</td>
    <td style="font-weight:600">${r.price ? fmt(r.price) + ' €' : '—'}</td>
    <td>${statusBadge(r.status)}</td>
    <td>
      <div style="display:flex;gap:.3rem;flex-wrap:wrap">
        ${r.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="updateResStatus('${r.id}','confirmed')">✓</button>` : ''}
        ${r.status !== 'cancelled' ? `<button class="btn btn-danger btn-sm" onclick="updateResStatus('${r.id}','cancelled')">✕</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="deleteReservation('${r.id}')">🗑</button>
      </div>
    </td>
  </tr>`).join('');
}

function updateResStatus(id, status) {
  const r = reservations.find(r => r.id === id);
  if (r) {
    r.status = status;
    save(KEYS.reservations, reservations);
    renderReservations();
    toast(status === 'confirmed' ? 'Réservation confirmée' : 'Réservation annulée', status === 'confirmed' ? 'success' : 'error');
  }
}

function deleteReservation(id) {
  if (!confirm('Supprimer cette réservation ?')) return;
  reservations = reservations.filter(r => r.id !== id);
  save(KEYS.reservations, reservations);
  renderReservations();
  toast('Réservation supprimée');
}

function openNewReservation() { openModal('modalReservation'); }
function saveNewReservation(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const service = fd.get('service');
  const info = SERVICE_MAP[service] || { price: 0, cat: 'studio' };
  const res = {
    id: genId(),
    firstName: fd.get('firstName'),
    lastName: fd.get('lastName'),
    email: fd.get('email'),
    phone: fd.get('phone') || '',
    service,
    date: fd.get('date'),
    slot: fd.get('slot'),
    message: fd.get('message') || '',
    price: info.price,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };
  reservations.push(res);
  save(KEYS.reservations, reservations);
  upsertClient(res);
  closeModal('modalReservation');
  e.target.reset();
  navigate('reservations');
  toast('Réservation ajoutée');
}

function exportReservationsCSV() {
  if (reservations.length === 0) { toast('Aucune donnée à exporter', 'error'); return; }
  const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Service', 'Date', 'Créneau', 'Prix', 'Statut'];
  const rows = reservations.map(r => [r.id, r.firstName, r.lastName, r.email, r.service, r.date, r.slot, r.price, r.status]);
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  downloadFile(csv, 'reservations.csv', 'text/csv');
  toast('Export CSV téléchargé');
}

// ═══════════════════════════════════════════════════
// CLIENTS
// ═══════════════════════════════════════════════════
let clientSearch = '';

function renderClients() {
  // Build client list from reservations
  rebuildClients();
  let list = [...clients];
  if (clientSearch) {
    const q = clientSearch.toLowerCase();
    list = list.filter(c => `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q));
  }
  const tbody = document.getElementById('clientsBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">Aucun client enregistré</div><div class="empty-desc">Les clients apparaîtront après la première réservation.</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(c => `<tr style="cursor:pointer" onclick="showClientDetail('${c.email}')">
    <td><strong>${esc(c.lastName)}</strong></td>
    <td>${esc(c.firstName)}</td>
    <td>${esc(c.email)}</td>
    <td>${esc(c.phone || '—')}</td>
    <td style="text-align:center">${c.resCount}</td>
    <td>${fmtDate(c.lastDate)}</td>
  </tr>`).join('');
}

function rebuildClients() {
  const map = {};
  reservations.forEach(r => {
    const key = r.email.toLowerCase();
    if (!map[key]) map[key] = { firstName: r.firstName, lastName: r.lastName, email: r.email, phone: r.phone || '', resCount: 0, lastDate: '' };
    map[key].resCount++;
    if (!map[key].lastDate || r.date > map[key].lastDate) map[key].lastDate = r.date;
    if (r.phone) map[key].phone = r.phone;
  });
  clients = Object.values(map);
  save(KEYS.clients, clients);
}

function upsertClient(res) {
  rebuildClients();
}

function showClientDetail(email) {
  const c = clients.find(c => c.email.toLowerCase() === email.toLowerCase());
  if (!c) return;
  const clientRes = reservations.filter(r => r.email.toLowerCase() === email.toLowerCase()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = clientRes.reduce((s, r) => s + (r.price || 0), 0);

  document.getElementById('modalClientContent').innerHTML = `
    <div style="margin-bottom:1.5rem">
      <h3 style="font-family:var(--font-heading);font-size:1.3rem">${esc(c.firstName)} ${esc(c.lastName)}</h3>
      <p style="color:var(--text-secondary);font-size:.85rem">${esc(c.email)} ${c.phone ? '· ' + esc(c.phone) : ''}</p>
      <p style="color:var(--text-muted);font-size:.8rem;margin-top:.3rem">${c.resCount} réservation(s) · Total: ${fmt(total)} €</p>
    </div>
    <table><thead><tr><th>Service</th><th>Date</th><th>Prix</th><th>Statut</th></tr></thead><tbody>
    ${clientRes.map(r => `<tr><td style="font-size:.78rem">${esc(r.service)}</td><td>${fmtDate(r.date)}</td><td>${r.price ? fmt(r.price) + ' €' : '—'}</td><td>${statusBadge(r.status)}</td></tr>`).join('')}
    </tbody></table>`;
  openModal('modalClient');
}

// ═══════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════
function renderInvoices() {
  const tbody = document.getElementById('invoicesBody');
  if (invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-title">Aucune facture</div><div class="empty-desc">Créez votre première facture.</div></div></td></tr>`;
    document.getElementById('invoiceMonthTotal').textContent = '0,00 €';
    return;
  }
  const sorted = [...invoices].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  tbody.innerHTML = sorted.map(inv => `<tr>
    <td style="font-weight:500">${esc(inv.number)}</td>
    <td>${esc(inv.clientName)}</td>
    <td style="font-weight:600">${fmt(inv.amount)} €</td>
    <td>${fmtDate(inv.date)}</td>
    <td>${inv.paid ? '<span class="badge badge-paid">Payée</span>' : '<span class="badge badge-pending">En attente</span>'}</td>
    <td>
      <div style="display:flex;gap:.3rem">
        ${!inv.paid ? `<button class="btn btn-success btn-sm" onclick="markInvoicePaid('${inv.id}')">✓ Payée</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="viewInvoice('${inv.id}')">👁</button>
        <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${inv.id}')">🗑</button>
      </div>
    </td>
  </tr>`).join('');
  const month = new Date().toISOString().slice(0, 7);
  const monthTotal = invoices.filter(i => i.date && i.date.startsWith(month)).reduce((s, i) => s + i.amount, 0);
  document.getElementById('invoiceMonthTotal').textContent = fmt(monthTotal) + ' €';
}

function openNewInvoice() {
  const resOpts = reservations.filter(r => r.status === 'confirmed').map(r =>
    `<option value="${r.id}">${esc(r.firstName)} ${esc(r.lastName)} — ${esc(r.service)} (${fmt(r.price || 0)} €)</option>`
  ).join('');
  document.getElementById('invoiceResSelect').innerHTML = '<option value="">Sélectionner une réservation</option>' + resOpts;
  openModal('modalInvoice');
}

function saveNewInvoice(e) {
  e.preventDefault();
  const resId = document.getElementById('invoiceResSelect').value;
  const res = reservations.find(r => r.id === resId);
  if (!res) { toast('Sélectionnez une réservation', 'error'); return; }
  const inv = {
    id: genId(),
    number: 'LC-' + (invoices.length + 1).toString().padStart(4, '0'),
    reservationId: res.id,
    clientName: `${res.firstName} ${res.lastName}`,
    clientEmail: res.email,
    service: res.service,
    amount: res.price || 0,
    date: new Date().toISOString().slice(0, 10),
    paid: false
  };
  invoices.push(inv);
  save(KEYS.invoices, invoices);
  closeModal('modalInvoice');
  navigate('invoices');
  toast('Facture créée');
}

function markInvoicePaid(id) {
  const inv = invoices.find(i => i.id === id);
  if (inv) { inv.paid = true; save(KEYS.invoices, invoices); renderInvoices(); toast('Facture marquée payée'); }
}

function deleteInvoice(id) {
  if (!confirm('Supprimer cette facture ?')) return;
  invoices = invoices.filter(i => i.id !== id);
  save(KEYS.invoices, invoices);
  renderInvoices();
  toast('Facture supprimée');
}

function viewInvoice(id) {
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;
  document.getElementById('invoiceViewContent').innerHTML = `
    <div class="invoice-preview">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem">
        <div><h2 style="font-family:var(--font-heading);color:var(--text)">Libertà <span style="color:var(--accent)">Créativité</span></h2>
        <p style="font-size:.8rem;color:var(--text-muted)">Rue du Mail 13/15, 1050 Ixelles<br>libertacreativite@gmail.com</p></div>
        <div style="text-align:right"><div style="font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--accent)">Facture</div>
        <div style="font-family:var(--font-heading);font-size:1.3rem">${esc(inv.number)}</div>
        <div style="font-size:.8rem;color:var(--text-muted)">${fmtDate(inv.date)}</div></div>
      </div>
      <div style="margin-bottom:1.5rem"><div style="font-size:.6rem;letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:.3rem">Client</div>
      <div style="font-size:.9rem">${esc(inv.clientName)}</div>
      <div style="font-size:.8rem;color:var(--text-muted)">${esc(inv.clientEmail)}</div></div>
      <table class="invoice-table"><thead><tr><th>Service</th><th>Montant</th></tr></thead>
      <tbody><tr><td>${esc(inv.service)}</td><td>${fmt(inv.amount)} €</td></tr></tbody></table>
      <div class="invoice-total">Total : ${fmt(inv.amount)} €</div>
      <div style="text-align:center;margin-top:1.5rem">
        <button class="btn btn-primary" onclick="printInvoice()">Imprimer / PDF</button>
      </div>
    </div>`;
  openModal('modalInvoiceView');
}

function printInvoice() {
  const content = document.getElementById('invoiceViewContent').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Facture</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>body{font-family:'Outfit',sans-serif;padding:2rem;color:#3A2C24}h2{font-family:'Cormorant Garamond',serif}table{width:100%;border-collapse:collapse}th,td{padding:.6rem;text-align:left;border-bottom:1px solid #E5DBD0;font-size:.85rem}th{font-size:.65rem;letter-spacing:2px;text-transform:uppercase;color:#C49B6C}.invoice-total{text-align:right;font-family:'Cormorant Garamond',serif;font-size:1.6rem;color:#C49B6C;margin-top:1rem}button{display:none}</style>
  </head><body>${content}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

function exportInvoicesCSV() {
  if (invoices.length === 0) { toast('Aucune donnée', 'error'); return; }
  const headers = ['N°', 'Client', 'Montant', 'Date', 'Statut'];
  const rows = invoices.map(i => [i.number, i.clientName, i.amount, i.date, i.paid ? 'Payée' : 'En attente']);
  downloadFile([headers.join(';'), ...rows.map(r => r.join(';'))].join('\n'), 'factures.csv', 'text/csv');
  toast('Export CSV téléchargé');
}

// ═══════════════════════════════════════════════════
// PLANNING
// ═══════════════════════════════════════════════════
function renderPlanning() {
  const now = new Date();
  if (!calMonth && calMonth !== 0) { calMonth = now.getMonth(); calYear = now.getFullYear(); }
  document.getElementById('calPeriod').textContent =
    new Date(calYear, calMonth).toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' });

  document.querySelectorAll('.cal-view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === calView));

  if (calView === 'month') renderMonthView();
  else renderWeekView();
}

function renderMonthView() {
  const grid = document.getElementById('calGrid');
  const firstDay = new Date(calYear, calMonth, 1);
  let startDay = firstDay.getDay() - 1; if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  let html = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => `<div class="cal-day-header">${d}</div>`).join('');

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    html += `<div class="cal-cell other-month"><div class="day-num">${prevDays - i}</div></div>`;
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const dayRes = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled');
    html += `<div class="cal-cell${isToday ? ' today' : ''}" onclick="showDayDetail('${dateStr}')">
      <div class="day-num">${d}</div>
      ${dayRes.slice(0, 3).map(r => `<div class="cal-event cat-${getCategory(r.service)}" title="${esc(r.firstName)} ${esc(r.lastName)} — ${esc(r.service)}">${esc(r.slot || '')} ${esc(r.service).substring(0, 18)}</div>`).join('')}
      ${dayRes.length > 3 ? `<div style="font-size:.55rem;color:var(--text-muted)">+${dayRes.length - 3} autres</div>` : ''}
    </div>`;
  }
  // Fill remaining cells
  const totalCells = startDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-cell other-month"><div class="day-num">${i}</div></div>`;
  }

  grid.innerHTML = html;
  grid.className = 'cal-month-grid';
}

function renderWeekView() {
  const grid = document.getElementById('calGrid');
  // Get current week based on calYear/calMonth
  const now = new Date(calYear, calMonth, new Date().getDate());
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() || 7) + 1);

  const hours = ['10:00', '12:00', '14:00', '16:00', '18:00'];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  let html = '<div class="cal-week-header"></div>';
  days.forEach(d => {
    html += `<div class="cal-week-header">${d.toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric' })}</div>`;
  });

  hours.forEach(h => {
    html += `<div class="cal-week-time">${h}</div>`;
    days.forEach(d => {
      const dateStr = d.toISOString().slice(0, 10);
      const slotRes = reservations.filter(r => r.date === dateStr && r.slot && r.slot.startsWith(h) && r.status !== 'cancelled');
      html += `<div class="cal-week-cell">${slotRes.map(r => `<div class="cal-event cat-${getCategory(r.service)}" style="margin:2px">${esc(r.service).substring(0, 15)}</div>`).join('')}</div>`;
    });
  });

  grid.innerHTML = html;
  grid.className = 'cal-week-grid';
}

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderPlanning(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderPlanning(); }
function setCalView(v) { calView = v; renderPlanning(); }

function showDayDetail(dateStr) {
  const dayRes = reservations.filter(r => r.date === dateStr).sort((a, b) => (a.slot || '').localeCompare(b.slot || ''));
  const label = new Date(dateStr + 'T12:00').toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('modalDayContent').innerHTML = `
    <h3 style="font-family:var(--font-heading);text-transform:capitalize;margin-bottom:1rem">${label}</h3>
    ${dayRes.length === 0 ? '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-desc">Aucune réservation ce jour</div></div>' :
    `<table><thead><tr><th>Créneau</th><th>Client</th><th>Service</th><th>Statut</th></tr></thead><tbody>
    ${dayRes.map(r => `<tr><td>${esc(r.slot || '—')}</td><td>${esc(r.firstName)} ${esc(r.lastName)}</td><td style="font-size:.78rem">${esc(r.service)}</td><td>${statusBadge(r.status)}</td></tr>`).join('')}
    </tbody></table>`}`;
  openModal('modalDay');
}

// ═══════════════════════════════════════════════════
// SYSTEM
// ═══════════════════════════════════════════════════
function renderSystem() {
  document.getElementById('sysStudioName').value = settings.studioName;
  document.getElementById('sysAddress').value = settings.address;
  document.getElementById('sysEmail').value = settings.email;
  document.getElementById('sysPhone').value = settings.phone;
  document.getElementById('sysInstagram').value = settings.instagram;
  document.getElementById('sysCapacity').value = settings.capacity;
  document.getElementById('sysSurface').value = settings.surface;
  document.getElementById('sysOpenTime').value = settings.openTime;
  document.getElementById('sysCloseTime').value = settings.closeTime;
  document.getElementById('sysAdminUser').value = settings.adminUser;
  ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].forEach(d => {
    document.getElementById('day-' + d).checked = settings.openDays[d];
  });
}

function saveSystem() {
  settings.studioName = document.getElementById('sysStudioName').value;
  settings.address = document.getElementById('sysAddress').value;
  settings.email = document.getElementById('sysEmail').value;
  settings.phone = document.getElementById('sysPhone').value;
  settings.instagram = document.getElementById('sysInstagram').value;
  settings.capacity = parseInt(document.getElementById('sysCapacity').value) || 70;
  settings.surface = parseInt(document.getElementById('sysSurface').value) || 115;
  settings.openTime = document.getElementById('sysOpenTime').value;
  settings.closeTime = document.getElementById('sysCloseTime').value;
  settings.adminUser = document.getElementById('sysAdminUser').value;
  ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].forEach(d => {
    settings.openDays[d] = document.getElementById('day-' + d).checked;
  });
  save(KEYS.settings, settings);
  toast('Paramètres sauvegardés');
}

function changePassword() {
  const p = document.getElementById('sysNewPass').value;
  if (p.length < 4) { toast('Mot de passe trop court', 'error'); return; }
  settings.adminPass = p;
  save(KEYS.settings, settings);
  document.getElementById('sysNewPass').value = '';
  toast('Mot de passe modifié');
}

function exportData() {
  const data = { reservations, clients, invoices, settings, exportedAt: new Date().toISOString() };
  downloadFile(JSON.stringify(data, null, 2), 'liberta-backup.json', 'application/json');
  toast('Données exportées');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.reservations) { reservations = data.reservations; save(KEYS.reservations, reservations); }
        if (data.clients) { clients = data.clients; save(KEYS.clients, clients); }
        if (data.invoices) { invoices = data.invoices; save(KEYS.invoices, invoices); }
        if (data.settings) { settings = { ...DEFAULT_SETTINGS, ...data.settings }; save(KEYS.settings, settings); }
        toast('Données importées avec succès');
        navigate(currentPage);
      } catch { toast('Fichier invalide', 'error'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════
function getCategory(service) {
  if (!service) return 'studio';
  const s = service.toLowerCase();
  if (s.includes('événementiel') || s.includes('corporate') || s.includes('privé')) return 'event';
  if (s.includes('photo') || s.includes('direction')) return 'photo';
  if (s.includes('podcast') || s.includes('caméra') || s.includes('vidéo') || s.includes('montage')) return 'podcast';
  return 'studio';
}

function statusBadge(status) {
  const map = { pending: ['En attente', 'badge-pending'], confirmed: ['Confirmée', 'badge-confirmed'], cancelled: ['Annulée', 'badge-cancelled'] };
  const [label, cls] = map[status] || ['—', ''];
  return `<span class="badge ${cls}">${label}</span>`;
}

function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Listen for storage changes (real-time sync with public site) ──
window.addEventListener('storage', (e) => {
  if (e.key === KEYS.reservations) {
    reservations = load(KEYS.reservations);
    if (currentPage === 'dashboard') renderDashboard();
    if (currentPage === 'reservations') renderReservations();
    if (currentPage === 'planning') renderPlanning();
    toast('Nouvelle réservation reçue !');
  }
});

// ── Periodic check for new reservations (same-tab fallback) ──
let lastResCount = reservations.length;
setInterval(() => {
  const fresh = load(KEYS.reservations);
  if (fresh.length !== lastResCount) {
    reservations = fresh;
    lastResCount = fresh.length;
    if (currentPage === 'dashboard') renderDashboard();
    if (currentPage === 'reservations') renderReservations();
    if (currentPage === 'planning') renderPlanning();
  }
}, 3000);

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  navigate('dashboard');
});
