// ---------- Auth guard (admin only — teacher/student login is not used here) ----------
const token = localStorage.getItem('credit_token');
const userRaw = localStorage.getItem('credit_user');
if (!token || !userRaw) window.location.href = '/login.html';
const currentUser = JSON.parse(userRaw || '{}');

if (currentUser.role !== 'admin') {
  localStorage.removeItem('credit_token');
  localStorage.removeItem('credit_user');
  alert('This dashboard is for admin accounts only.');
  window.location.href = '/login.html';
}

document.getElementById('userName').textContent = currentUser.name || currentUser.email;
document.getElementById('userInitial').textContent = (currentUser.name || '?').charAt(0).toUpperCase();
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('credit_token');
  localStorage.removeItem('credit_user');
  window.location.href = '/login.html';
});

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (res.status === 401) { localStorage.clear(); window.location.href = '/login.html'; return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const content = document.getElementById('viewContent');
const titleEl = document.getElementById('viewTitle');

document.querySelectorAll('.side-item').forEach(item => {
  item.addEventListener('click', () => setView(item.dataset.view));
});

function setView(view) {
  document.querySelectorAll('.side-item').forEach(i => i.classList.toggle('active', i.dataset.view === view));
  const titles = { dashboard: 'Dashboard', leadsmessages: 'Leads & Messages' };
  titleEl.textContent = titles[view] || 'Dashboard';
  content.innerHTML = '<div class="empty">Loading…</div>';
  (view === 'leadsmessages' ? renderLeadsMessages : renderDashboard)();
  localStorage.setItem('credit_last_view', view);
}

function esc(s) { return (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtDateTime(d) { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

// ---------- Dashboard: how many Demo bookings, Pilot applications, Messages ----------
async function renderDashboard() {
  try {
    const [leadSummary, msgSummary, demoRequests, pilotRequests, messages] = await Promise.all([
      api('/leads/summary'), api('/messages/summary'),
      api('/leads/demo-requests'), api('/leads/pilot-requests'), api('/messages')
    ]);

    const recent = [
      ...demoRequests.map(r => ({ type: 'Demo Booking', name: r.full_name, org: r.organization_name, created_at: r.created_at })),
      ...pilotRequests.map(r => ({ type: 'Pilot Application', name: r.full_name, org: r.organization_name, created_at: r.created_at })),
      ...messages.map(m => ({ type: 'Message', name: m.contact_person, org: m.school_name, created_at: m.created_at }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

    // ---- Status Report: how many records sit in each status, across all 3 sources ----
    const STATUS_CHART_COLORS = { new: '#2563eb', contacted: '#ca8a04', converted: '#16a34a', resolved: '#16a34a', rejected: '#dc2626' };
    const allRecords = [...demoRequests, ...pilotRequests, ...messages];
    const statusCounts = {};
    ALL_STATUSES.forEach(s => { statusCounts[s] = 0; });
    allRecords.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
    const statusTotal = allRecords.length || 1;
    const maxStatusCount = Math.max(1, ...Object.values(statusCounts));
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

    content.innerHTML = `
      <div class="stat-cards">
        <div class="stat-card">
          <div class="label">Book a Live Demo</div>
          <div class="value">${leadSummary.totalDemo}</div>
          <div class="delta">${leadSummary.newDemo} new</div>
        </div>
        <div class="stat-card">
          <div class="label">45-Day Free Pilot</div>
          <div class="value">${leadSummary.totalPilot}</div>
          <div class="delta">${leadSummary.newPilot} new</div>
        </div>
        <div class="stat-card">
          <div class="label">Contact Messages</div>
          <div class="value">${msgSummary.totalMessages}</div>
          <div class="delta">${msgSummary.newMessages} new</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <h3>Recent Submissions</h3>
          ${recent.length ? `<table><thead><tr><th>Type</th><th>Name</th><th>Organization</th><th>Submitted</th></tr></thead><tbody>
            ${recent.map(r => `<tr><td>${esc(r.type)}</td><td>${esc(r.name)}</td><td>${esc(r.org)}</td><td>${fmtDateTime(r.created_at)}</td></tr>`).join('')}
          </tbody></table>` : '<div class="empty">Nothing submitted yet.</div>'}
        </div>
        <div class="panel">
          <h3>Status Report <span class="panel-sub">${statusTotal} total</span></h3>
          ${ALL_STATUSES.map(s => `
            <div class="status-bar-row">
              <span class="status-bar-label"><span class="status-dot" style="background:${STATUS_CHART_COLORS[s]}"></span>${cap(s)}</span>
              <div class="status-bar-track"><div class="status-bar-fill" style="width:${(statusCounts[s] / maxStatusCount * 100) || 0}%;background:${STATUS_CHART_COLORS[s]}"></div></div>
              <span class="status-bar-count">${statusCounts[s]}</span>
            </div>`).join('')}
        </div>
      </div>`;
  } catch (e) {
    content.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

// ---------- Leads & Messages: combined, filterable by name / organization / status ----------
const STATUS_OPTIONS_BY_TYPE = {
  demo: ['new', 'contacted', 'converted', 'rejected'],
  pilot: ['new', 'contacted', 'converted', 'rejected'],
  message: ['new', 'contacted', 'resolved']
};
const ALL_STATUSES = ['new', 'contacted', 'converted', 'resolved', 'rejected'];
const statusPillClass = s => (s === 'converted' || s === 'resolved') ? 'green' : s === 'rejected' ? 'red' : 'yellow';

let combinedRows = []; // cached, re-filtered client-side

async function renderLeadsMessages() {
  try {
    const [demoRequests, pilotRequests, messages] = await Promise.all([
      api('/leads/demo-requests'), api('/leads/pilot-requests'), api('/messages')
    ]);

    combinedRows = [
      ...demoRequests.map(r => ({
        id: r.id, type: 'demo', typeLabel: 'Demo Booking',
        name: r.full_name, org: r.organization_name, email: r.email, phone: r.phone,
        detail: r.address, status: r.status, created_at: r.created_at
      })),
      ...pilotRequests.map(r => ({
        id: r.id, type: 'pilot', typeLabel: 'Pilot Application',
        name: r.full_name, org: r.organization_name, email: r.email, phone: r.phone,
        detail: r.address, status: r.status, created_at: r.created_at
      })),
      ...messages.map(m => ({
        id: m.id, type: 'message', typeLabel: 'Message',
        name: m.contact_person, org: m.school_name, email: m.email, phone: m.phone,
        detail: m.message || '—', status: m.status, created_at: m.created_at
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    content.innerHTML = `
      <div class="toolbar">
        <input type="text" id="filterName" placeholder="Filter by name...">
        <input type="text" id="filterOrg" placeholder="Filter by organization...">
        <select id="filterStatus">
          <option value="">All statuses</option>
          ${ALL_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <select id="filterType">
          <option value="">All types</option>
          <option value="demo">Demo Booking</option>
          <option value="pilot">Pilot Application</option>
          <option value="message">Message</option>
        </select>
        <button class="btn btn-outline small-btn" id="clearFiltersBtn">Clear Filters</button>
      </div>
      <div class="panel"><div id="combinedTableWrap"></div></div>`;

    ['filterName', 'filterOrg', 'filterStatus', 'filterType'].forEach(id => {
      document.getElementById(id).addEventListener('input', drawCombinedTable);
      document.getElementById(id).addEventListener('change', drawCombinedTable);
    });
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
      document.getElementById('filterName').value = '';
      document.getElementById('filterOrg').value = '';
      document.getElementById('filterStatus').value = '';
      document.getElementById('filterType').value = '';
      drawCombinedTable();
    });

    drawCombinedTable();
  } catch (e) {
    content.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

function drawCombinedTable() {
  const nameFilter = (document.getElementById('filterName')?.value || '').toLowerCase().trim();
  const orgFilter = (document.getElementById('filterOrg')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filterStatus')?.value || '';
  const typeFilter = document.getElementById('filterType')?.value || '';

  const rows = combinedRows.filter(r =>
    (!nameFilter || (r.name || '').toLowerCase().includes(nameFilter)) &&
    (!orgFilter || (r.org || '').toLowerCase().includes(orgFilter)) &&
    (!statusFilter || r.status === statusFilter) &&
    (!typeFilter || r.type === typeFilter)
  );

  const wrap = document.getElementById('combinedTableWrap');
  if (!wrap) return;
  wrap.innerHTML = rows.length ? `<div style="overflow-x:auto;"><table><thead><tr>
      <th>Type</th><th>Name</th><th>Organization</th><th>Email</th><th>Phone</th><th>Details</th><th>Submitted</th><th>Status</th>
    </tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td><span class="pill ${r.type === 'message' ? 'yellow' : 'green'}">${esc(r.typeLabel)}</span></td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.org)}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.phone)}</td>
        <td style="max-width:220px;white-space:normal;" title="${esc(r.detail)}">${esc((r.detail || '').slice(0, 60))}${(r.detail || '').length > 60 ? '…' : ''}</td>
        <td>${fmtDate(r.created_at)}</td>
        <td>
          <select onchange="updateRowStatus('${r.type}', ${r.id}, this.value)" style="padding:5px 8px;border-radius:6px;border:1px solid var(--line);font-size:12.5px;">
            ${STATUS_OPTIONS_BY_TYPE[r.type].map(s => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <span class="pill ${statusPillClass(r.status)}" style="margin-left:6px;">${esc(r.status)}</span>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`
    : '<div class="empty">No submissions match these filters.</div>';
}

window.updateRowStatus = async function (type, id, status) {
  const endpoint = type === 'demo' ? `/leads/demo-requests/${id}/status`
    : type === 'pilot' ? `/leads/pilot-requests/${id}/status`
    : `/messages/${id}/status`;
  try {
    await api(endpoint, { method: 'PUT', body: JSON.stringify({ status }) });
    const row = combinedRows.find(r => r.type === type && r.id === id);
    if (row) row.status = status;
    drawCombinedTable();
  } catch (e) { alert(e.message); }
};

// ---------- Init ----------
setView(localStorage.getItem('credit_last_view') || 'dashboard');
