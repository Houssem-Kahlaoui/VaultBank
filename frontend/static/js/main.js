/**
 * main.js — Utilitaires partagés du frontend.
 */

// ═══════════════ TOASTS ═══════════════

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


// ═══════════════ FORMATAGE ═══════════════

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


// ═══════════════ ROUTER ═══════════════

function initRouter(defaultPage, onPageChange) {
    function navigate() {
        const hash = window.location.hash.replace('#', '') || defaultPage;

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
    navigate();
}


// ═══════════════ SIDEBAR ═══════════════

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


// ═══════════════ NOTIFICATIONS ═══════════════

function toggleNotifications() {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.toggle('open');
}


// ═══════════════ USER INFO ═══════════════

function initUserInfo() {
    const user = getUser();
    if (!user) return;

    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.full_name);
    document.querySelectorAll('[data-user-role]').forEach(el =>
        el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1));
    document.querySelectorAll('[data-user-initial]').forEach(el =>
        el.textContent = user.full_name.charAt(0).toUpperCase());
}


// ═══════════════ MODAL HELPERS ═══════════════

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

// Fermer quand on clique sur l'overlay (fond sombre)
document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
});

// Fermer avec la touche Échap
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open')
            .forEach(m => m.classList.remove('open'));
    }
});


// ═══════════════ CONFIRM MODAL ═══════════════

let _confirmResolve = null;

/**
 * Affiche un modal de confirmation et retourne une Promise<boolean>.
 * Usage:
 *   if (await askConfirm('Supprimer cet utilisateur ?')) { ... }
 */
function askConfirm(message, options = {}) {
    return new Promise((resolve) => {
        _confirmResolve = resolve;

        document.getElementById('confirmTitle').textContent   = options.title || 'Confirmation';
        document.getElementById('confirmMessage').textContent = message;

        const btn = document.getElementById('confirmYesBtn');
        btn.textContent = options.confirmText || 'Confirmer';

        const isDanger = options.danger !== false;  // danger par défaut

        // Style du bouton principal
        btn.className = 'btn ' + (isDanger ? 'btn-danger' : 'btn-success');
        btn.style.minWidth = '100px';
        btn.style.justifyContent = 'center';

        // Style de l'icône du haut
        const iconWrap = document.getElementById('confirmIconWrap');
        const icon     = document.getElementById('confirmIcon');
        if (isDanger) {
            iconWrap.style.background = 'rgba(255,71,87,0.15)';
            iconWrap.style.color = 'var(--danger)';
            icon.className = 'bi bi-exclamation-triangle';
        } else {
            iconWrap.style.background = 'rgba(0,201,167,0.15)';
            iconWrap.style.color = 'var(--teal)';
            icon.className = 'bi bi-check-circle';
        }

        openModal('confirmModal');
    });
}

function confirmYes() {
    closeModal('confirmModal');
    if (_confirmResolve) {
        _confirmResolve(true);
        _confirmResolve = null;
    }
}

function confirmNo() {
    closeModal('confirmModal');
    if (_confirmResolve) {
        _confirmResolve(false);
        _confirmResolve = null;
    }
}