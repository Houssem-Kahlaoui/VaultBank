
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '✓',
        danger:  '✕',
        warning: '⚠',
        info:    'ℹ',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}



function formatDNT(amount) {
    return new Intl.NumberFormat('fr-TN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount) + ' DNT';
}

function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatDateShort(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}



/**
 
 * @param {string} defaultPage - Page par défaut si aucun hash.
 * @param {Function} onPageChange - Callback quand la page change (recharge les données).
 */
function initRouter(defaultPage, onPageChange) {
    function navigate() {
        const hash = window.location.hash.replace('#', '') || defaultPage;

        // Cacher toutes les pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        const target = document.getElementById('page-' + hash);
        if (target) {
            target.classList.add('active');
            if (onPageChange) onPageChange(hash);
        }

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.nav-link[href*="#${hash}"]`);
        if (link) link.classList.add('active');
    }

    window.addEventListener('hashchange', navigate);
    navigate();   // Appel initial
}



function initSidebar() {
    const toggle  = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const main    = document.getElementById('mainContent');

    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (main) main.classList.toggle('expanded');
        });
    }
}



function toggleNotifications() {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.toggle('open');
}



function initUserInfo() {
    const user = getUser();
    if (!user) return;

    const nameEls = document.querySelectorAll('[data-user-name]');
    nameEls.forEach(el => el.textContent = user.full_name);

    const roleEls = document.querySelectorAll('[data-user-role]');
    roleEls.forEach(el => el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1));

    const initialEls = document.querySelectorAll('[data-user-initial]');
    initialEls.forEach(el => el.textContent = user.full_name.charAt(0).toUpperCase());
}