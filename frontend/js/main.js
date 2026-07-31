// Landing page numbers are never hardcoded — every figure below is
// fetched live from the CREDIT API, which reads directly from MySQL.

function fmt(n) {
  if (n === null || n === undefined) return '–';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M+';
  if (n >= 1_000) return n.toLocaleString('en-IN') + '+';
  return n.toString();
}

async function loadPublicStats() {
  try {
    const res = await fetch('/api/public/stats');
    const data = await res.json();
    document.querySelectorAll('#publicStats [data-field]').forEach(el => {
      const key = el.dataset.field;
      if (key === 'teacherSatisfactionPct') {
        el.textContent = data[key] != null ? data[key] + '%' : '–';
      } else {
        el.textContent = fmt(data[key]);
      }
    });
  } catch (e) {
    console.error('Failed to load public stats', e);
  }
}

async function loadDemoDashboard() {
  try {
    const res = await fetch('/api/public/demo-dashboard');
    const data = await res.json();
    document.querySelectorAll('#mockStats [data-field]').forEach(el => {
      const key = el.dataset.field;
      el.textContent = fmt(data[key]);
    });

    const houseColors = { 'Blue House': '#2563eb', 'Green House': '#16a34a', 'Red House': '#dc2626', 'Yellow House': '#ca8a04' };
    const medals = ['🥇', '🥈', '🥉'];
    const houseContainer = document.getElementById('mockHouses');

    // The API can return the same house name more than once (e.g. duplicate
    // house records in the DB) and rows with 0 points. Merge by name, drop
    // the empty ones, and only show the real top houses on the homepage.
    const merged = {};
    (data.houses || []).forEach(h => {
      const pts = Number(h.total_points) || 0;
      merged[h.name] = (merged[h.name] || 0) + pts;
    });
    const ranked = Object.entries(merged)
      .map(([name, total_points]) => ({ name, total_points }))
      .filter(h => h.total_points > 0)
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 4);

    if (ranked.length) {
      const maxPts = ranked[0].total_points;
      houseContainer.innerHTML = ranked.map((h, i) => `
        <div class="house-row">
          <span class="house-rank">${medals[i] || (i + 1)}</span>
          <span class="house-dot" style="background:${houseColors[h.name] || '#999'}"></span>
          <span class="name">${h.name}</span>
          <span class="house-bar-track"><span class="house-bar-fill" style="width:${Math.max(8, (h.total_points / maxPts) * 100)}%;background:${houseColors[h.name] || '#999'}"></span></span>
          <span class="pts">${h.total_points.toLocaleString('en-IN')}</span>
        </div>`).join('');
    } else {
      houseContainer.innerHTML = '<div class="mock-empty">No house points recorded yet</div>';
    }
  } catch (e) {
    console.error('Failed to load demo dashboard preview', e);
  }
}

loadPublicStats();
loadDemoDashboard();

// ---------- Lead capture modal (Book a Live Demo / Start 45-Day Free Pilot) ----------
const leadModal = document.getElementById('leadModal');
const leadForm = document.getElementById('leadForm');
const leadMsg = document.getElementById('leadMsg');
let leadModalMode = 'demo'; // 'demo' | 'pilot'

function openLeadModal(mode) {
  leadModalMode = mode;
  leadMsg.textContent = '';
  leadMsg.className = 'lead-msg';
  leadForm.reset();
  leadForm.style.display = 'block';
  if (mode === 'demo') {
    document.getElementById('leadModalTitle').textContent = 'Book a Live Demo';
    document.getElementById('leadModalSub').textContent = "Tell us a bit about your school and we'll get in touch to schedule your demo.";
  } else {
    document.getElementById('leadModalTitle').textContent = 'Start 45-Day Free Pilot';
    document.getElementById('leadModalSub').textContent = "Apply for the free pilot program and our team will reach out with next steps.";
  }
  leadModal.classList.add('open');
}
function closeLeadModal() { leadModal.classList.remove('open'); }

document.getElementById('heroBookDemoBtn')?.addEventListener('click', () => openLeadModal('demo'));
document.getElementById('heroStartPilotBtn')?.addEventListener('click', () => openLeadModal('pilot'));
document.getElementById('navBookDemoBtn')?.addEventListener('click', () => openLeadModal('demo'));
document.getElementById('pilotSectionBtn')?.addEventListener('click', () => openLeadModal('pilot'));
document.getElementById('ctaBookDemoBtn')?.addEventListener('click', () => openLeadModal('demo'));
document.getElementById('ctaStartPilotBtn')?.addEventListener('click', () => openLeadModal('pilot'));
document.getElementById('leadModalClose')?.addEventListener('click', closeLeadModal);
leadModal?.addEventListener('click', e => { if (e.target === leadModal) closeLeadModal(); });

leadForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    full_name: document.getElementById('leadName').value.trim(),
    phone: document.getElementById('leadPhone').value.trim(),
    email: document.getElementById('leadEmail').value.trim(),
    organization_name: document.getElementById('leadOrg').value.trim(),
    address: document.getElementById('leadAddress').value.trim()
  };
  const endpoint = leadModalMode === 'demo' ? '/api/public/demo-request' : '/api/public/pilot-request';
  try {
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed');
    leadMsg.textContent = "Thanks! We've received your request and will contact you shortly.";
    leadMsg.className = 'lead-msg success';
    leadForm.style.display = 'none';
    setTimeout(closeLeadModal, 2500);
  } catch (err) {
    leadMsg.textContent = err.message;
    leadMsg.className = 'lead-msg error';
  }
});

// ---------- Role benefit tabs ----------
document.querySelectorAll('.role-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.role-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.role-panel[data-role-panel="${tab.dataset.role}"]`)?.classList.add('active');
  });
});

// ---------- Reward marketplace (live sample from the demo school) ----------
async function loadRewardSamples() {
  const grid = document.getElementById('rewardGrid');
  if (!grid) return;
  const emojiFor = (name) => {
    const n = name.toLowerCase();
    if (n.includes('breakfast') || n.includes('pizza') || n.includes('food')) return '🍕';
    if (n.includes('library') || n.includes('book')) return '📚';
    if (n.includes('sport')) return '🏅';
    if (n.includes('merch') || n.includes('t-shirt')) return '👕';
    if (n.includes('coupon') || n.includes('voucher')) return '🎟️';
    if (n.includes('movie')) return '🎬';
    if (n.includes('certificate')) return '📜';
    if (n.includes('house')) return '🏠';
    return '🎁';
  };
  try {
    const res = await fetch('/api/public/reward-samples');
    const rewards = await res.json();
    if (!rewards.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1;">No sample rewards configured yet.</div>';
      return;
    }
    grid.innerHTML = rewards.map(r => `
      <div class="reward-card">
        <div class="reward-emoji">${emojiFor(r.name)}</div>
        <div><div class="rname">${r.name}</div><div class="rpts">${r.points_required} pts</div></div>
      </div>`).join('');
  } catch (e) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;">Could not load rewards right now.</div>';
  }
}
loadRewardSamples();

// ---------- Pricing (live from DB, editable without redeploying) ----------
async function loadPricing() {
  const grid = document.getElementById('pricingGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/public/pricing');
    const plans = await res.json();
    grid.innerHTML = plans.map(p => `
      <div class="price-card ${p.highlighted ? 'highlighted' : ''}">
        <h3>${p.name}</h3>
        <div class="price">${p.price}</div>
        <div class="note">${p.note || ''}</div>
        <ul>${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
        <button class="btn ${p.highlighted ? 'btn-primary' : 'btn-outline'}" onclick="openLeadModal('demo')">Book a Demo</button>
      </div>`).join('');
  } catch (e) {
    grid.innerHTML = '<div class="empty">Could not load pricing right now.</div>';
  }
}
loadPricing();
