/**
 * customer.js — Logique de l'espace client.
 */

let currentUser   = null;
let currentAccounts = [];

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // 1. Vérifie que l'utilisateur est un client connecté
    currentUser = requireAuth(['customer']);
    if (!currentUser) return;

    // 2. Init UI
    initUserInfo();
    initSidebar();
    initRouter('dashboard', onPageChange);

    // 3. Charge les données initiales
    loadNotifications();

    // 4. Bind form events
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
    document.getElementById('loanForm').addEventListener('submit', handleLoan);
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);

    // 5. Real-time account lookup on transfer form
    initTransferLookup();
});


// ═══════════════════════════════════════════════════════════════
//  ROUTER (change de page quand le hash change)
// ═══════════════════════════════════════════════════════════════

const PAGE_TITLES = {
    dashboard: 'Tableau de bord',
    accounts:  'Mes comptes',
    transfer:  'Virement',
    history:   'Historique',
    loans:     'Prêts',
    profile:   'Mon profil',
};

function onPageChange(page) {
    // Met à jour le titre de la page
    document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || 'VaultBank';

    // Charge les données propres à chaque page
    if (page === 'dashboard') loadDashboard();
    if (page === 'accounts')  loadAccounts();
    if (page === 'transfer')  loadTransferForm();
    if (page === 'history')   loadHistory();
    if (page === 'loans')     loadLoans();
    if (page === 'profile')   loadProfile();
}


// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function loadDashboard() {
    const container = document.getElementById('dashboardContent');
    container.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const data = await api.get('/customer/dashboard');
        const { user, accounts, recent_transactions, stats } = data;

        currentAccounts = accounts;

        const accountsChips = accounts.map(a => `
            <div class="hero-account-chip">
                <div class="label">${a.account_type === 'courant' ? 'Courant' : 'Épargne'}</div>
                <div class="amount">${formatDNT(a.balance)}</div>
                <div class="num">${a.account_number}</div>
            </div>
        `).join('');

        const txRows = recent_transactions.length
            ? recent_transactions.map(tx => `
                <tr>
                    <td><span class="badge badge-${tx.status}">${tx.status}</span></td>
                    <td>${tx.description || '—'}</td>
                    <td style="font-weight:700">${formatDNT(tx.amount)}</td>
                    <td class="td-muted">${formatDate(tx.created_at)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px">Aucune transaction</td></tr>';

        container.innerHTML = `
            <div class="hero-balance">
                <div class="hero-balance-label">Solde total consolidé</div>
                <div class="hero-balance-value">
                    ${new Intl.NumberFormat('fr-TN', {minimumFractionDigits:2}).format(stats.total_balance)}
                    <span class="currency"> DNT</span>
                </div>
                <div class="hero-accounts">${accountsChips}</div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="bi bi-wallet2"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.accounts_count}</div>
                        <div class="stat-label">Compte${stats.accounts_count > 1 ? 's' : ''}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon teal"><i class="bi bi-arrow-left-right"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${recent_transactions.length}</div>
                        <div class="stat-label">Transactions récentes</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon amber"><i class="bi bi-bell"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.unread_notifications}</div>
                        <div class="stat-label">Notifications non lues</div>
                    </div>
                </div>
            </div>

            <div class="quick-actions">
                <a href="#transfer" class="quick-action"><i class="bi bi-send"></i><span>Virement</span></a>
                <a href="#accounts" class="quick-action"><i class="bi bi-credit-card-2-front"></i><span>Mes comptes</span></a>
                <a href="#history"  class="quick-action"><i class="bi bi-clock-history"></i><span>Historique</span></a>
                <a href="#loans"    class="quick-action"><i class="bi bi-cash-coin"></i><span>Prêt</span></a>
                <a href="#profile"  class="quick-action"><i class="bi bi-person-gear"></i><span>Profil</span></a>
            </div>

            <div class="table-container">
                <div class="table-header">
                    <div>
                        <div class="card-title">Transactions récentes</div>
                        <div class="card-subtitle">Vos 5 dernières opérations</div>
                    </div>
                    <a href="#history" class="btn btn-ghost btn-sm">Voir tout <i class="bi bi-arrow-right"></i></a>
                </div>
                <table>
                    <thead>
                        <tr><th>Statut</th><th>Description</th><th>Montant</th><th>Date</th></tr>
                    </thead>
                    <tbody>${txRows}</tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


// ═══════════════════════════════════════════════════════════════
//  ACCOUNTS
// ═══════════════════════════════════════════════════════════════

async function loadAccounts() {
    const container = document.getElementById('accountsContent');
    container.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const { accounts } = await api.get('/customer/accounts');
        currentAccounts = accounts;

        if (!accounts.length) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-wallet2"></i><p>Aucun compte.</p></div>';
            return;
        }

        container.innerHTML = `<div class="grid-2">${accounts.map(acc => `
            <div class="account-card ${acc.account_type === 'epargne' ? 'type-epargne' : ''}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                    <div>
                        <div class="account-type-label">${acc.account_type === 'courant' ? 'Compte Courant' : 'Compte Épargne'}</div>
                        <div style="margin-top:6px">
                            <span class="badge badge-${acc.status}">${acc.status}</span>
                        </div>
                    </div>
                    <div style="width:44px;height:44px;border-radius:12px;
                        background:${acc.account_type === 'courant' ? 'rgba(79,172,254,0.15)' : 'rgba(0,201,167,0.15)'};
                        display:grid;place-items:center;font-size:20px;
                        color:${acc.account_type === 'courant' ? 'var(--blue)' : 'var(--teal)'}">
                        <i class="bi bi-${acc.account_type === 'courant' ? 'credit-card-2-front' : 'piggy-bank'}"></i>
                    </div>
                </div>
                <div class="account-balance">
                    ${new Intl.NumberFormat('fr-TN', {minimumFractionDigits:2}).format(acc.balance)}
                    <span class="currency"> DNT</span>
                </div>
                <div class="divider"></div>
                <div style="display:flex;align-items:center;gap:8px">
                    <div>
                        <div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Numéro de compte</div>
                        <span class="acc-number">${acc.account_number}</span>
                    </div>
                    <button onclick="copyToClipboard('${acc.account_number}')" class="btn-icon" style="margin-left:auto">
                        <i class="bi bi-copy"></i>
                    </button>
                </div>
            </div>
        `).join('')}</div>`;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


// ═══════════════════════════════════════════════════════════════
//  TRANSFER
// ═══════════════════════════════════════════════════════════════

async function loadTransferForm() {
    if (!currentAccounts.length) {
        try {
            const { accounts } = await api.get('/customer/accounts');
            currentAccounts = accounts;
        } catch { return; }
    }

    const select = document.getElementById('from_account_id');
    const activeAccounts = currentAccounts.filter(a => a.status === 'active');

    select.innerHTML = '<option value="">-- Sélectionner --</option>' +
        activeAccounts.map(a => `
            <option value="${a.id}" data-balance="${a.balance}">
                ${a.account_type === 'courant' ? 'Courant' : 'Épargne'} — ${a.account_number} — ${formatDNT(a.balance)}
            </option>
        `).join('');

    select.addEventListener('change', () => {
        const opt = select.selectedOptions[0];
        const hint = document.getElementById('balanceHint');
        if (opt && opt.dataset.balance) {
            hint.textContent = `Solde disponible : ${formatDNT(opt.dataset.balance)}`;
            hint.style.color = 'var(--teal)';
        } else {
            hint.textContent = '';
        }
    });
}

let lookupTimer = null;
function initTransferLookup() {
    const input = document.getElementById('to_account_number');
    const info  = document.getElementById('lookupInfo');

    input.addEventListener('input', () => {
        clearTimeout(lookupTimer);
        info.innerHTML = '';
        const val = input.value.trim();
        if (val.length < 5) return;

        lookupTimer = setTimeout(async () => {
            try {
                const data = await api.get(`/customer/lookup/${encodeURIComponent(val)}`);
                if (data.found) {
                    info.innerHTML = `<div style="background:rgba(0,201,167,0.1);border:1px solid rgba(0,201,167,0.25);
                        border-radius:8px;padding:10px 14px;margin-top:8px;font-size:13px;color:var(--teal)">
                        <i class="bi bi-check-circle"></i> <strong>${data.owner}</strong> — ${data.type}
                    </div>`;
                } else {
                    info.innerHTML = `<div style="background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.25);
                        border-radius:8px;padding:10px 14px;margin-top:8px;font-size:13px;color:var(--danger)">
                        <i class="bi bi-x-circle"></i> Compte introuvable
                    </div>`;
                }
            } catch {}
        }, 500);
    });
}

async function handleTransfer(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Envoi...';

    const body = {
        from_account_id: parseInt(document.getElementById('from_account_id').value),
        to_account_number: document.getElementById('to_account_number').value.trim(),
        amount: parseFloat(document.getElementById('amount').value),
        description: document.getElementById('description').value.trim(),
    };

    try {
        await api.post('/customer/transfer', body);
        showToast('Virement soumis pour validation !', 'success');
        e.target.reset();
        document.getElementById('lookupInfo').innerHTML = '';
        document.getElementById('balanceHint').textContent = '';
        setTimeout(() => window.location.hash = '#history', 800);
    } catch (err) {
        showToast(err.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = original;
    }
}


// ═══════════════════════════════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════════════════════════════

async function loadHistory() {
    const container = document.getElementById('historyContent');
    container.innerHTML = '<div class="loading">Chargement...</div>';

    const type   = document.getElementById('filterType').value;
    const status = document.getElementById('filterStatus').value;
    const params = new URLSearchParams();
    if (type)   params.append('type', type);
    if (status) params.append('status', status);

    try {
        const data = await api.get(`/customer/transactions?${params}`);
        const tx = data.transactions;

        document.getElementById('historyCount').textContent = `${data.pagination.total} transaction(s)`;

        if (!tx.length) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>Aucune transaction.</p></div>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr><th>Statut</th><th>Type</th><th>Description</th><th>Montant</th><th>Date</th></tr>
                </thead>
                <tbody>
                    ${tx.map(t => `
                        <tr>
                            <td><span class="badge badge-${t.status}">${t.status}</span></td>
                            <td>${t.type}</td>
                            <td>${t.description || '—'}</td>
                            <td style="font-weight:700">${formatDNT(t.amount)}</td>
                            <td class="td-muted">${formatDate(t.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


// ═══════════════════════════════════════════════════════════════
//  LOANS
// ═══════════════════════════════════════════════════════════════

async function loadLoans() {
    const container = document.getElementById('loansContent');
    container.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const { loans } = await api.get('/customer/loans');

        if (!loans.length) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-cash-coin"></i><p>Aucune demande de prêt.</p></div>';
            return;
        }

        container.innerHTML = loans.map(l => `
            <div class="loan-card" style="border-left:3px solid ${
                l.status === 'approved' ? 'var(--teal)' :
                l.status === 'rejected' ? 'var(--danger)' : 'var(--amber)'
            }">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
                    <div>
                        <div style="margin-bottom:8px">
                            <span class="badge badge-${l.status}">${l.status}</span>
                            <span style="font-size:12px;color:var(--text-muted);margin-left:8px">#${l.id}</span>
                        </div>
                        <div style="font-size:24px;font-weight:800">${new Intl.NumberFormat('fr-TN').format(l.amount)} DNT</div>
                        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">
                            Sur ${l.duration_months} mois — ${new Intl.NumberFormat('fr-TN', {maximumFractionDigits:0}).format(l.amount / l.duration_months)} DNT/mois
                        </div>
                    </div>
                    <div style="font-size:12px;color:var(--text-muted);text-align:right">
                        <div><i class="bi bi-calendar3"></i> ${formatDateShort(l.created_at)}</div>
                    </div>
                </div>
                ${l.purpose ? `<div style="margin-top:12px;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:13px;color:var(--text-muted)"><i class="bi bi-chat-left-text"></i> ${l.purpose}</div>` : ''}
                ${l.comment ? `<div style="margin-top:8px;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:13px;color:var(--text-muted)"><i class="bi bi-person-badge"></i> ${l.comment}</div>` : ''}
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}

async function handleLoan(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;

    try {
        await api.post('/customer/loans', {
            amount: parseFloat(document.getElementById('loan_amount').value),
            duration_months: parseInt(document.getElementById('loan_duration').value),
            purpose: document.getElementById('loan_purpose').value.trim(),
        });
        showToast('Demande de prêt soumise !', 'success');
        closeModal('loanModal');
        e.target.reset();
        loadLoans();
    } catch (err) {
        showToast(err.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}


// ═══════════════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════════════

async function loadProfile() {
    try {
        const { user } = await api.get('/auth/me');
        document.getElementById('profile_full_name').value = user.full_name;
        document.getElementById('profile_email').value = user.email;
        document.getElementById('profile_phone').value = user.phone || '';
        document.getElementById('profile_address').value = user.address || '';
    } catch {}
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    try {
        await api.put('/customer/profile', {
            full_name: document.getElementById('profile_full_name').value.trim(),
            phone: document.getElementById('profile_phone').value.trim(),
            address: document.getElementById('profile_address').value.trim(),
        });
        showToast('Profil mis à jour !', 'success');

        // Update localStorage
        const u = getUser();
        u.full_name = document.getElementById('profile_full_name').value.trim();
        setUser(u);
        initUserInfo();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    try {
        await api.post('/auth/change-password', {
            current_password: document.getElementById('current_password').value,
            new_password: document.getElementById('new_password').value,
        });
        showToast('Mot de passe modifié !', 'success');
        e.target.reset();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


// ═══════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

async function loadNotifications() {
    try {
        const data = await api.get('/customer/notifications');
        const badge = document.getElementById('notifCount');
        if (data.unread_count > 0) {
            badge.textContent = data.unread_count;
            badge.style.display = 'grid';
        } else {
            badge.style.display = 'none';
        }

        const list = document.getElementById('notifList');
        if (!data.notifications.length) {
            list.innerHTML = '<div class="empty-state" style="padding:40px 20px"><i class="bi bi-bell-slash"></i><p>Aucune notification</p></div>';
            return;
        }

        list.innerHTML = data.notifications.map(n => `
            <div class="notif-item">
                <div class="notif-title">${n.title}</div>
                <div class="notif-msg">${n.message}</div>
                <div class="notif-time"><i class="bi bi-clock"></i> ${formatDate(n.created_at)}</div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Notif error:', err);
    }
}


// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copié !', 'success');
    });
}