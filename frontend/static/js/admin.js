/**
 * admin.js — Logique de l'espace administrateur.
 */

let currentUser = null;
let allUsers       = [];
let allAccounts    = [];
let allTransactions = [];
let allLogs        = [];
let currentCreditAccountId = null;

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    currentUser = requireAuth(['admin']);
    if (!currentUser) return;

    initUserInfo();
    initSidebar();
    initRouter('dashboard', onPageChange);

    document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
    document.getElementById('creditForm').addEventListener('submit', handleCredit);
});


// ═══════════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════════

const PAGE_TITLES = {
    dashboard:    'Tableau de bord',
    users:        'Utilisateurs',
    accounts:     'Comptes bancaires',
    transactions: 'Transactions',
    logs:         'Journaux d\'audit',
};

function onPageChange(page) {
    document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || 'Admin';

    if (page === 'dashboard')    loadDashboard();
    if (page === 'users')        loadUsers();
    if (page === 'accounts')     loadAccounts();
    if (page === 'transactions') loadTransactions('');
    if (page === 'logs')         loadLogs();
}


// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function loadDashboard() {
    const c = document.getElementById('dashboardContent');
    c.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const data = await api.get('/admin/dashboard');
        const s = data.stats;

        c.innerHTML = `
            <div style="margin-bottom:28px">
                <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.5px">
                    Administration système
                </h2>
                <p style="color:var(--text-muted);font-size:13px;margin-top:4px">
                    Vue globale de la plateforme VaultBank
                </p>
            </div>

            <div class="stats-grid">
                <div class="stat-card" onclick="window.location.hash='#users'">
                    <div class="stat-icon blue"><i class="bi bi-people"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${s.total_customers}</div>
                        <div class="stat-label">Clients</div>
                    </div>
                </div>
                <div class="stat-card" onclick="window.location.hash='#users'">
                    <div class="stat-icon purple"><i class="bi bi-person-badge"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${s.total_gestionnaires}</div>
                        <div class="stat-label">Gestionnaires</div>
                    </div>
                </div>
                <div class="stat-card" onclick="window.location.hash='#users'">
                    <div class="stat-icon amber"><i class="bi bi-shield-lock"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${s.total_admins}</div>
                        <div class="stat-label">Admins</div>
                    </div>
                </div>
                <div class="stat-card" onclick="window.location.hash='#accounts'">
                    <div class="stat-icon teal"><i class="bi bi-wallet2"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${s.total_accounts}</div>
                        <div class="stat-label">Comptes bancaires</div>
                    </div>
                </div>
                <div class="stat-card" onclick="window.location.hash='#transactions'">
                    <div class="stat-icon amber"><i class="bi bi-hourglass-split"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${s.pending_transactions}</div>
                        <div class="stat-label">Transactions en attente</div>
                    </div>
                </div>
                <div class="stat-card" onclick="window.location.hash='#transactions'">
                    <div class="stat-icon cyan"><i class="bi bi-check-circle"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${s.completed_transactions}</div>
                        <div class="stat-label">Transactions complétées</div>
                    </div>
                </div>
                <div class="stat-card" onclick="window.location.hash='#accounts'">
                    <div class="stat-icon teal"><i class="bi bi-person-check"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${s.active_accounts}</div>
                        <div class="stat-label">Comptes actifs</div>
                    </div>
                </div>
                <div class="stat-card" onclick="window.location.hash='#accounts'">
                    <div class="stat-icon danger"><i class="bi bi-snow2"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${s.frozen_accounts}</div>
                        <div class="stat-label">Comptes gelés</div>
                    </div>
                </div>
            </div>

            <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
                <a href="#users" style="text-decoration:none;color:inherit">
                    <div class="card" style="display:flex;gap:14px;align-items:center;cursor:pointer">
                        <div style="width:48px;height:48px;border-radius:12px;background:rgba(79,172,254,0.15);color:var(--blue);display:grid;place-items:center;font-size:20px;flex-shrink:0">
                            <i class="bi bi-people-fill"></i>
                        </div>
                        <div>
                            <div style="font-weight:700">Utilisateurs</div>
                            <div style="font-size:12px;color:var(--text-muted)">Créer, modifier, désactiver</div>
                        </div>
                        <i class="bi bi-arrow-right" style="margin-left:auto;color:var(--text-muted)"></i>
                    </div>
                </a>
                <a href="#accounts" style="text-decoration:none;color:inherit">
                    <div class="card" style="display:flex;gap:14px;align-items:center;cursor:pointer">
                        <div style="width:48px;height:48px;border-radius:12px;background:rgba(0,201,167,0.15);color:var(--teal);display:grid;place-items:center;font-size:20px;flex-shrink:0">
                            <i class="bi bi-wallet2"></i>
                        </div>
                        <div>
                            <div style="font-weight:700">Comptes</div>
                            <div style="font-size:12px;color:var(--text-muted)">Créditer, geler, gérer</div>
                        </div>
                        <i class="bi bi-arrow-right" style="margin-left:auto;color:var(--text-muted)"></i>
                    </div>
                </a>
                <a href="#transactions" style="text-decoration:none;color:inherit">
                    <div class="card" style="display:flex;gap:14px;align-items:center;cursor:pointer">
                        <div style="width:48px;height:48px;border-radius:12px;background:rgba(168,85,247,0.15);color:var(--purple);display:grid;place-items:center;font-size:20px;flex-shrink:0">
                            <i class="bi bi-arrow-left-right"></i>
                        </div>
                        <div>
                            <div style="font-weight:700">Transactions</div>
                            <div style="font-size:12px;color:var(--text-muted)">Toutes les opérations</div>
                        </div>
                        <i class="bi bi-arrow-right" style="margin-left:auto;color:var(--text-muted)"></i>
                    </div>
                </a>
                <a href="#logs" style="text-decoration:none;color:inherit">
                    <div class="card" style="display:flex;gap:14px;align-items:center;cursor:pointer">
                        <div style="width:48px;height:48px;border-radius:12px;background:rgba(245,158,11,0.15);color:var(--amber);display:grid;place-items:center;font-size:20px;flex-shrink:0">
                            <i class="bi bi-journal-text"></i>
                        </div>
                        <div>
                            <div style="font-weight:700">Journaux d'audit</div>
                            <div style="font-size:12px;color:var(--text-muted)">Traçabilité des actions</div>
                        </div>
                        <i class="bi bi-arrow-right" style="margin-left:auto;color:var(--text-muted)"></i>
                    </div>
                </a>
            </div>
        `;
    } catch (err) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


// ═══════════════════════════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════════════════════════

async function loadUsers() {
    const c = document.getElementById('usersContent');
    c.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const data = await api.get('/admin/users');
        allUsers = data.users;
        document.getElementById('usersCount').textContent = `${data.count} utilisateur(s)`;
        renderUsers(allUsers);
    } catch (err) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


function renderUsers(users) {
    const c = document.getElementById('usersContent');
    if (!users.length) {
        c.innerHTML = '<div class="empty-state"><i class="bi bi-people"></i><p>Aucun utilisateur.</p></div>';
        return;
    }

    c.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>#</th><th>Utilisateur</th><th>Email</th><th>Rôle</th>
                    <th>Téléphone</th><th>Statut</th><th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                    <tr class="user-row">
                        <td class="td-muted">${u.id}</td>
                        <td>
                            <div style="display:flex;align-items:center;gap:10px">
                                <div style="width:32px;height:32px;border-radius:50%;
                                    background:linear-gradient(135deg,
                                        ${u.role === 'admin' ? 'var(--amber)' : u.role === 'gestionnaire' ? 'var(--purple)' : 'var(--blue)'},
                                        ${u.role === 'admin' ? '#fbbf24' : u.role === 'gestionnaire' ? 'var(--blue)' : 'var(--cyan)'});
                                    display:grid;place-items:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0">
                                    ${u.full_name.charAt(0).toUpperCase()}
                                </div>
                                <span style="font-weight:600">${u.full_name}</span>
                            </div>
                        </td>
                        <td class="td-muted">${u.email}</td>
                        <td><span class="badge badge-${u.role}">${u.role}</span></td>
                        <td class="td-muted">${u.phone || '—'}</td>
                        <td>
                            <span class="badge badge-${u.is_active ? 'active' : 'closed'}">
                                ${u.is_active ? 'Actif' : 'Inactif'}
                            </span>
                        </td>
                        <td>
                            <div style="display:flex;gap:6px">
                                ${u.id !== currentUser.id ? `
                                    <button class="btn-icon btn-sm" title="${u.is_active ? 'Désactiver' : 'Activer'}"
                                            onclick="toggleUser(${u.id}, ${u.is_active})">
                                        <i class="bi bi-person-${u.is_active ? 'dash' : 'check'}"
                                           style="color:${u.is_active ? 'var(--amber)' : 'var(--teal)'}"></i>
                                    </button>
                                    <button class="btn-icon btn-sm" title="Supprimer"
                                            onclick="deleteUser(${u.id}, '${u.full_name.replace(/'/g, "\\'")}')">
                                        <i class="bi bi-trash3" style="color:var(--danger)"></i>
                                    </button>
                                ` : '<span class="td-muted" style="font-size:11px">Vous</span>'}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}


function filterUsers(q) {
    q = q.toLowerCase();
    const filtered = allUsers.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
    renderUsers(filtered);
}


function openCreateUserModal() {
    document.getElementById('createUserForm').reset();
    openModal('createUserModal');
}


async function handleCreateUser(e) {
    e.preventDefault();
    try {
        await api.post('/admin/users', {
            full_name: document.getElementById('new_full_name').value.trim(),
            email:     document.getElementById('new_email').value.trim(),
            password:  document.getElementById('new_password').value,
            role:      document.getElementById('new_role').value,
            phone:     document.getElementById('new_phone').value.trim(),
            address:   '',
        });
        showToast('Utilisateur créé avec succès !', 'success');
        closeModal('createUserModal');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


async function toggleUser(id, isActive) {
    const action = isActive ? 'désactiver' : 'activer';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} cet utilisateur ?`)) return;
    try {
        await api.put(`/admin/users/${id}/toggle`);
        showToast(`Utilisateur ${action === 'désactiver' ? 'désactivé' : 'activé'}.`, 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


async function deleteUser(id, name) {
    if (!confirm(`Supprimer définitivement ${name} ? Cette action est irréversible.`)) return;
    try {
        await api.delete(`/admin/users/${id}`);
        showToast('Utilisateur supprimé.', 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


// ═══════════════════════════════════════════════════════════════
//  ACCOUNTS
// ═══════════════════════════════════════════════════════════════

async function loadAccounts() {
    const c = document.getElementById('accountsContent');
    c.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const data = await api.get('/admin/accounts');
        allAccounts = data.accounts;
        document.getElementById('accountsCount').textContent = `${data.count} compte(s)`;
        renderAccounts(allAccounts);
    } catch (err) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


function renderAccounts(accounts) {
    const c = document.getElementById('accountsContent');
    if (!accounts.length) {
        c.innerHTML = '<div class="empty-state"><i class="bi bi-wallet2"></i><p>Aucun compte.</p></div>';
        return;
    }

    c.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>#</th><th>Titulaire</th><th>N° Compte</th><th>Type</th>
                    <th>Solde</th><th>Statut</th><th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${accounts.map(a => `
                    <tr class="acc-row">
                        <td class="td-muted">${a.id}</td>
                        <td>
                            <div style="font-weight:600">${a.owner_name || '—'}</div>
                            <div class="td-muted">${a.owner_email || ''}</div>
                        </td>
                        <td><span class="acc-number">${a.account_number}</span></td>
                        <td>
                            <span class="badge badge-${a.account_type === 'courant' ? 'customer' : 'completed'}">
                                ${a.account_type === 'courant' ? 'Courant' : 'Épargne'}
                            </span>
                        </td>
                        <td style="font-weight:700">${formatDNT(a.balance)}</td>
                        <td><span class="badge badge-${a.status}">${a.status}</span></td>
                        <td>
                            <div style="display:flex;gap:6px;flex-wrap:wrap">
                                <button class="btn btn-sm btn-success" onclick="openCreditModal(${a.id}, '${a.account_number}', ${a.balance})">
                                    <i class="bi bi-plus-circle"></i> Créditer
                                </button>
                                ${a.status !== 'closed' ? `
                                    <button class="btn btn-sm ${a.status === 'active' ? 'btn-ghost' : 'btn-success'}"
                                            onclick="toggleAccount(${a.id}, '${a.status}')">
                                        <i class="bi bi-${a.status === 'active' ? 'snow2' : 'check-circle'}"></i>
                                        ${a.status === 'active' ? 'Geler' : 'Activer'}
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}


function filterAccounts(q) {
    q = q.toLowerCase();
    const filtered = allAccounts.filter(a =>
        (a.owner_name || '').toLowerCase().includes(q) ||
        (a.owner_email || '').toLowerCase().includes(q) ||
        (a.account_number || '').toLowerCase().includes(q)
    );
    renderAccounts(filtered);
}


function openCreditModal(id, accNum, balance) {
    currentCreditAccountId = id;
    document.getElementById('creditModalInfo').innerHTML =
        `Compte <span class="acc-number">${accNum}</span><br>
         Solde actuel : <strong>${formatDNT(balance)}</strong>`;
    document.getElementById('creditForm').reset();
    document.getElementById('credit_description').value = 'Dépôt administratif';
    openModal('creditModal');
}


async function handleCredit(e) {
    e.preventDefault();
    try {
        await api.post(`/admin/accounts/${currentCreditAccountId}/credit`, {
            amount:      parseFloat(document.getElementById('credit_amount').value),
            description: document.getElementById('credit_description').value.trim(),
        });
        showToast('Compte crédité avec succès !', 'success');
        closeModal('creditModal');
        loadAccounts();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


async function toggleAccount(id, currentStatus) {
    const action = currentStatus === 'active' ? 'geler' : 'activer';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ce compte ?`)) return;
    try {
        await api.post(`/admin/accounts/${id}/freeze`);
        showToast(`Compte ${currentStatus === 'active' ? 'gelé' : 'activé'}.`, 'success');
        loadAccounts();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


// ═══════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ═══════════════════════════════════════════════════════════════

async function loadTransactions(status = '') {
    const c = document.getElementById('transactionsContent');
    c.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const params = status ? `?status=${status}` : '';
        const data = await api.get(`/admin/transactions${params}`);
        allTransactions = data.transactions;
        document.getElementById('transactionsCount').textContent =
            `${data.count} transaction(s)${status ? ` — ${status}` : ''}`;

        if (!data.transactions.length) {
            c.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>Aucune transaction.</p></div>';
            return;
        }

        c.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th><th>Type</th><th>De</th><th>Vers</th>
                        <th>Montant</th><th>Statut</th><th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.transactions.map(t => `
                        <tr>
                            <td class="td-muted">#${t.id}</td>
                            <td><span class="badge badge-${t.type === 'virement' ? 'customer' : t.type === 'depot' ? 'completed' : 'rejected'}">${t.type}</span></td>
                            <td><span class="acc-number" style="font-size:11px">${t.from_account_number || '—'}</span></td>
                            <td><span class="acc-number" style="font-size:11px">${t.to_account_number || '—'}</span></td>
                            <td style="font-weight:700">${formatDNT(t.amount)}</td>
                            <td><span class="badge badge-${t.status}">${t.status}</span></td>
                            <td class="td-muted" style="font-size:12px">${formatDate(t.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


function filterTx(status, btn) {
    document.querySelectorAll('.tx-filter').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-ghost');
    });
    btn.classList.add('active', 'btn-primary');
    btn.classList.remove('btn-ghost');
    loadTransactions(status);
}


// ═══════════════════════════════════════════════════════════════
//  LOGS
// ═══════════════════════════════════════════════════════════════

async function loadLogs() {
    const c = document.getElementById('logsContent');
    c.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const data = await api.get('/admin/logs');
        allLogs = data.logs;
        document.getElementById('logsCount').textContent = `${data.count} entrée(s)`;
        renderLogs(allLogs);
    } catch (err) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


const ACTION_COLORS = {
    LOGIN: 'var(--teal)', LOGOUT: 'var(--text-muted)',
    APPROVE_TRANSFER: 'var(--teal)', REJECT_TRANSFER: 'var(--danger)',
    APPROVE_LOAN: 'var(--teal)', REJECT_LOAN: 'var(--danger)',
    CREATE_USER: 'var(--blue)', DELETE_USER: 'var(--danger)',
    ACTIVATE_USER: 'var(--teal)', DEACTIVATE_USER: 'var(--amber)',
    CREDIT_ACCOUNT: 'var(--teal)', TOGGLE_ACCOUNT: 'var(--blue)',
    TRANSFER_REQUEST: 'var(--blue)', REGISTER: 'var(--purple)',
};

function renderLogs(logs) {
    const c = document.getElementById('logsContent');
    if (!logs.length) {
        c.innerHTML = '<div class="empty-state"><i class="bi bi-journal-x"></i><p>Aucun journal.</p></div>';
        return;
    }

    c.innerHTML = `
        <table>
            <thead>
                <tr><th>#</th><th>Action</th><th>Utilisateur</th><th>Détails</th><th>IP</th><th>Date</th></tr>
            </thead>
            <tbody>
                ${logs.map(l => `
                    <tr class="log-row">
                        <td class="td-muted">${l.id}</td>
                        <td>
                            <span class="action-badge" style="color:${ACTION_COLORS[l.action] || 'var(--text-muted)'};
                                border-color:${ACTION_COLORS[l.action] || 'var(--border)'}55">
                                ${l.action.replace(/_/g, ' ')}
                            </span>
                        </td>
                        <td>
                            ${l.user_id ? `<span style="font-weight:600">User #${l.user_id}</span>` : '<span class="td-muted">Système</span>'}
                        </td>
                        <td class="td-muted" style="font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                            ${l.details || '—'}
                        </td>
                        <td>
                            <code style="font-size:11px;color:var(--text-muted);background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:6px">
                                ${l.ip_address || '—'}
                            </code>
                        </td>
                        <td class="td-muted" style="font-size:12px;white-space:nowrap">${formatDate(l.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}


function filterLogs(q) {
    q = q.toLowerCase();
    const filtered = allLogs.filter(l =>
        (l.action || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q) ||
        (l.ip_address || '').toLowerCase().includes(q)
    );
    renderLogs(filtered);
}