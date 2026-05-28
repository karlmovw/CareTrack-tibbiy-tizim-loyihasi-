/**
 * CareTrack Clinic — Auth & Role-Based Access Control
 */

// ── ROL KONFIGURATSIYASI ──
const ROLES = {
  admin: {
    label: 'Administrator',
    icon:  'bi-shield-fill-check',
    color: '#0f6cbd',
    blocked:   [],
    canDelete: true,
    canCreate: true,
    canEdit:   true,
  },
  clinician: {
    label: 'Klinitsist',
    icon:  'bi-person-badge-fill',
    color: '#059669',
    blocked:   ['doctors', 'hisobotlar', 'settings'],
    canDelete: false,
    canCreate: false,
    canEdit:   true,
  },
  receptionist: {
    label: 'Qabulxona xodimi',
    icon:  'bi-person-workspace',
    color: '#d97706',
    blocked:   ['diagnoses', 'hisobotlar', 'settings'],
    canDelete: false,
    canCreate: true,
    canEdit:   false,
  }
};

function getRole() {
  const role = localStorage.getItem('userRole');
  if (!role) {
    window.location.href = 'index.html';
    return 'receptionist';
  }
  // Noma'lum rol — xavfsiz: login sahifasiga qaytaramiz
  if (!ROLES[role]) {
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
    return 'receptionist';
  }
  return role;
}
function getConfig() { return ROLES[getRole()] || ROLES.receptionist; }
function getPage()   { return window.location.pathname.split('/').pop() || 'index.html'; }

// ── SAHIFAGA KIRISH TEKSHIRUVI ──
function checkAccess() {
  const page   = getPage();
  const config = getConfig();

  if (page === 'index.html' || page === '') return true;

  // keyword asosida — .html bo'lsa ham bo'lmasa ham ishlaydi
  const isBlocked = config.blocked.some(keyword => page.includes(keyword));
  if (isBlocked) {
    applyRoleToSidebar();
    showAccessDenied();
    return false;
  }
  return true;
}

// ── SIDEBAR MENYUSINI ROSTLASH ──
function applyRoleToSidebar() {
  const role   = getRole();
  const config = getConfig();

  if (role === 'admin') {
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    if (userName) userName.textContent = localStorage.getItem('userName') || 'Admin';
    if (userRole) userRole.textContent = config.label;
    return;
  }

  // keyword asosida nav linklarni yashir — Netlify da ham ishlaydi
  config.blocked.forEach(keyword => {
    document.querySelectorAll('a.nav-item').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.includes(keyword)) link.style.display = 'none';
    });
  });

  const userName = document.querySelector('.user-name');
  const userRole = document.querySelector('.user-role');
  if (userName) userName.textContent = localStorage.getItem('userName') || 'Foydalanuvchi';
  if (userRole) userRole.textContent = config.label;
}

// ── SAHIFA ELEMENTLARINI ROSTLASH ──
function applyRoleToPage() {
  const role   = getRole();
  const config = getConfig();
  const page   = getPage();

  if (role === 'admin') return;

  if (!config.canDelete) {
    document.querySelectorAll(
      '.btn-delete, .btn-del, .action-btn.danger, [onclick*="openDelete"], [onclick*="confirmDelete"]'
    ).forEach(el => el.style.display = 'none');
  }

  if (role === 'clinician') {
    if (!page.includes('diagnoses') && !page.includes('patient-profile')) {
      document.querySelectorAll('.btn-add, .btn-add-diag')
        .forEach(el => el.style.display = 'none');
    }
  }

  if (role === 'receptionist') {
    document.querySelectorAll(
      '.btn-edit, [onclick*="openEdit"], .action-btn:not(.danger)'
    ).forEach(el => el.style.display = 'none');

    if (!page.includes('patients')) {
      document.querySelectorAll('.btn-add').forEach(el => el.style.display = 'none');
    }

    if (page.includes('doctors')) {
      document.querySelectorAll(
        '.btn-add, [onclick*="openModal"], .action-btn, .tahrirlash, .ochirish'
      ).forEach(el => el.style.display = 'none');
      document.querySelectorAll('button, a').forEach(el => {
        if (el.textContent.includes("Shifokor qo'shish") || 
            el.textContent.includes("Tahrirlash") || 
            el.textContent.includes("O'chirish")) {
          el.style.display = 'none';
        }
      });
    }
  }
}

// ── ROL BADGE (topbarda) ──
function showRoleBadge() {
  if (document.getElementById('roleBadge')) return;
  const config = getConfig();
  const topbarRight = document.querySelector('.topbar-right');
  if (!topbarRight) return;

  const badge = document.createElement('div');
  badge.id = 'roleBadge';
  badge.style.cssText = `
    display:flex; align-items:center; gap:6px;
    padding:6px 14px; border-radius:20px;
    background:${config.color}18;
    border:1.5px solid ${config.color}40;
    font-size:12px; font-weight:700;
    color:${config.color};
    white-space:nowrap;
  `;
  badge.innerHTML = `<i class="bi ${config.icon}"></i> ${config.label}`;
  topbarRight.insertBefore(badge, topbarRight.firstChild);
}

// ── KIRISH TAQIQLANGAN ──
function showAccessDenied() {
  const config = getConfig();

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed; top:0; left:260px; right:0; bottom:0;
    background:#f4f7fb; z-index:9999;
    display:flex; align-items:center; justify-content:center;
    font-family:'Plus Jakarta Sans', sans-serif;
  `;
  overlay.innerHTML = `
    <div style="
      background:white; border-radius:20px; padding:48px 40px;
      text-align:center; max-width:420px; width:90%;
      box-shadow:0 8px 32px rgba(0,0,0,0.08);
      border:1px solid #e2e8f0;
    ">
      <div style="
        width:72px; height:72px; background:#fee2e2; border-radius:20px;
        display:flex; align-items:center; justify-content:center;
        margin:0 auto 20px;
      ">
        <i class="bi bi-lock-fill" style="font-size:32px; color:#ef4444;"></i>
      </div>
      <div style="font-size:22px; font-weight:800; color:#1e293b; margin-bottom:10px;">
        Kirish taqiqlangan
      </div>
      <div style="font-size:14px; color:#64748b; margin-bottom:28px; line-height:1.6;">
        Sizning rolingiz (<strong>${config.label}</strong>)<br>bu sahifaga kirishga ruxsat bermaydi.
      </div>
      <a href="dashboard.html" style="
        display:inline-flex; align-items:center; gap:8px;
        padding:12px 24px; border-radius:12px;
        background:linear-gradient(135deg, #0f6cbd, #0a4f9c);
        color:white; text-decoration:none;
        font-size:14px; font-weight:700;
        box-shadow:0 4px 12px rgba(15,108,189,0.3);
      ">
        <i class="bi bi-arrow-left"></i> Dashboard ga qaytish
      </a>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ── LOGOUT ──
function logout() {
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

function bindLogoutButton() {
  document.querySelectorAll('a[href="index.html"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });
}

// ── ASOSIY ──
function initAuth() {
  const ok = checkAccess();
  if (!ok) return;

  applyRoleToSidebar();
  applyRoleToPage();
  showRoleBadge();
  bindLogoutButton();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}