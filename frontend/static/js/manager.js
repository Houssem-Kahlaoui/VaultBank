/**
 * manager.js — Logique de l'espace gestionnaire.
 */

let currentUser = null;
let allLoans    = [];
let allAccounts = [];
let currentRejectTransferId = null;
let currentRejectLoanId     = null;

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    currentUser = requireAuth(['gestionnaire']);
    if (!currentUser) return;

    initUserInfo();
    initSidebar();
    initRouter('dashboard', onPageChange);

    const rejectForm = document.getElementById('rejectForm');
    if (rejectForm) rejectForm.addEventListener('submit', handleRejectTransfer);

    const rejectLoanForm = document.getElementById('rejectLoanForm');
    if (rejectLoanForm) rejectLoanForm.addEventListener('submit', handleRejectLoan);
});


// ═══════════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════════

const PAGE_TITLES = {
    dashboard: 'Tableau de bord',
    transfers: 'Virements en attente',
    loans:     'Demandes de prêts',
    accounts:  'Comptes clients',
};

function onPageChange(page) {
    document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || 'Gestionnaire';

    if (page === 'dashboard') loadDashboard();
    if (page === 'transfers') loadPendingTransfers();
    if (page === 'loans')     loadLoans();
    if (page === 'accounts')  loadAccounts();
}


// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function loadDashboard() {
    const c = document.getElementById('dashboardContent');
    c.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const data = await api.get('/manager/dashboard');
        const { stats } = data;

        updateBadge('pendingTransfersBadge', stats.pending_transfers_count);
        updateBadge('pendingLoansBadge',     stats.pending_loans_count);

        c.innerHTML = `
            <div style="margin-bottom:28px">
                <h2 style="font-size:24px;font-weight:800;letter-spacing:-0.5px">
                    Bonjour, ${currentUser.full_name.split(' ')[0]} 👋
                </h2>
                <p style="color:var(--text-muted);font-size:13px;margin-top:4px">
                    Gérez les opérations en attente et les comptes clients
                </p>
            </div>

            <div class="stats-grid">
                <div class="stat-card" onclick="window.location.hash='#transfers'">
                    <div class="stat-icon amber"><i class="bi bi-hourglass-split"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.pending_transfers_count}</div>
                        <div class="stat-label">Virements en attente</div>
                    </div>
                </div>
                <div class="stat-card" onclick="window.location.hash='#loans'">
                    <div class="stat-icon purple"><i class="bi bi-cash-stack"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${stats.pending_loans_count}</div>
                        <div class="stat-label">Prêts en attente</div>
                    </div>
                </div>
            </div>

            <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
                <a href="#transfers" style="text-decoration:none;color:inherit">
                    <div class="card" style="display:flex;gap:16px;align-items:center;cursor:pointer">
                        <div style="width:52px;height:52px;border-radius:14px;background:rgba(245,158,11,0.15);color:var(--amber);display:grid;place-items:center;font-size:24px;flex-shrink:0">
                            <i class="bi bi-hourglass-split"></i>
                        </div>
                        <div>
                            <div style="font-size:16px;font-weight:700">Virements en attente</div>
                            <div style="font-size:13px;color:var(--text-muted);margin-top:3px">
                                ${stats.pending_transfers_count} opération${stats.pending_transfers_count !== 1 ? 's' : ''} à traiter
                            </div>
                        </div>
                        <i class="bi bi-chevron-right" style="margin-left:auto;color:var(--text-muted)"></i>
                    </div>
                </a>
                <a href="#loans" style="text-decoration:none;color:inherit">
                    <div class="card" style="display:flex;gap:16px;align-items:center;cursor:pointer">
                        <div style="width:52px;height:52px;border-radius:14px;background:rgba(168,85,247,0.15);color:var(--purple);display:grid;place-items:center;font-size:24px;flex-shrink:0">
                            <i class="bi bi-cash-stack"></i>
                        </div>
                        <div>
                            <div style="font-size:16px;font-weight:700">Demandes de prêts</div>
                            <div style="font-size:13px;color:var(--text-muted);margin-top:3px">
                                ${stats.pending_loans_count} demande${stats.pending_loans_count !== 1 ? 's' : ''} à examiner
                            </div>
                        </div>
                        <i class="bi bi-chevron-right" style="margin-left:auto;color:var(--text-muted)"></i>
                    </div>
                </a>
            </div>
        `;
    } catch (err) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


// ═══════════════════════════════════════════════════════════════
//  PENDING TRANSFERS
// ═══════════════════════════════════════════════════════════════

async function loadPendingTransfers() {
    const c = document.getElementById('transfersContent');
    c.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const data = await api.get('/manager/transfers');
        document.getElementById('pendingCount').textContent = `${data.count} opération(s) à traiter`;
        updateBadge('pendingTransfersBadge', data.count);

        if (!data.transfers.length) {
            c.innerHTML = `<div class="empty-state" style="min-height:360px;display:grid;place-items:center">
                <div>
                    <i class="bi bi-check2-all" style="font-size:64px;color:var(--teal);margin-bottom:16px"></i>
                    <p style="font-size:18px;font-weight:700">Aucun virement en attente</p>
                    <p style="font-size:13px;margin-top:8px;color:var(--text-muted)">Toutes les opérations ont été traitées.</p>
                </div>
            </div>`;
            return;
        }

        c.innerHTML = data.transfers.map(tx => `
            <div class="pending-card">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:16px">
                    <div>
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                            <span class="badge badge-pending"><i class="bi bi-hourglass-split"></i> En attente</span>
                            <span style="font-size:12px;color:var(--text-muted)">Transaction #${tx.id}</span>
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div class="pending-amount">${formatDNT(tx.amount)}</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
                            <i class="bi bi-clock"></i> ${formatDate(tx.created_at)}
                        </div>
                    </div>
                </div>

                <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
                    <div class="account-box">
                        <div class="label">COMPTE SOURCE</div>
                        <div class="acc-number">${tx.from_account_number || '—'}</div>
                    </div>
                    <div class="account-box">
                        <div class="label">COMPTE DESTINATAIRE</div>
                        <div class="acc-number">${tx.to_account_number || '—'}</div>
                    </div>
                </div>

                ${tx.description ? `<div style="font-size:13px;color:var(--text-muted);padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:16px"><i class="bi bi-chat-left-text"></i> ${tx.description}</div>` : ''}

                <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <button class="btn btn-success" style="flex:1;min-width:120px;justify-content:center" onclick="approveTransfer(${tx.id})">
                        <i class="bi bi-check-lg"></i> Approuver
                    </button>
                    <button class="btn btn-danger" style="flex:1;min-width:120px;justify-content:center" onclick="openRejectModal(${tx.id}, ${tx.amount})">
                        <i class="bi bi-x-lg"></i> Rejeter
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}


async function approveTransfer(id) {
    const ok = await askConfirm(
        `Approuver et exécuter le virement #${id} ?`,
        { title: 'Approuver le virement', confirmText: 'Approuver', danger: false }
    );
    if (!ok) return;

    try {
        await api.post(`/manager/transfers/${id}/approve`);
        showToast('Virement approuvé et exécuté !', 'success');
        loadPendingTransfers();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


function openRejectModal(id, amount) {
    currentRejectTransferId = id;
    document.getElementById('rejectModalInfo').textContent = `Rejeter le virement #${id} d'un montant de ${formatDNT(amount)} ?`;
    document.getElementById('rejectComment').value = '';
    openModal('rejectModal');
}


async function handleRejectTransfer(e) {
    e.preventDefault();
    try {
        await api.post(`/manager/transfers/${currentRejectTransferId}/reject`, {
            comment: document.getElementById('rejectComment').value.trim(),
        });
        showToast('Virement rejeté.', 'warning');
        closeModal('rejectModal');
        loadPendingTransfers();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


// ═══════════════════════════════════════════════════════════════
//  LOANS
// ═══════════════════════════════════════════════════════════════

async function loadLoans() {
    const c = document.getElementById('loansContent');
    c.innerHTML = '<div class="loading">Chargement...</div>';

    try {
        const data = await api.get('/manager/loans');
        allLoans = data.loans;

        const pending = allLoans.filter(l => l.status === 'pending').length;
        document.getElementById('loansCount').textContent = `${pending} demande(s) en attente`;
        updateBadge('pendingLoansBadge', pending);

        renderLoans('all');
    } catch (err) {
        c.innerHTML = `<div class="empty-state"><i class="bi bi-x-circle"></i><p>${err.message}</p></div>`;
    }
}

function filterLoans(filter, btn) {
    document.querySelectorAll('.loan-filter').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-ghost');
    });
    btn.classList.add('active', 'btn-primary');
    btn.classList.remove('btn-ghost');
    renderLoans(filter);
}

function renderLoans(filter) {
    const c = document.getElementById('loansContent');
    const list = filter === 'all' ? allLoans : allLoans.filter(l => l.status === filter);

    if (!list.length) {
        c.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>Aucune demande.</p></div>';
        return;
    }

    c.innerHTML = list.map(l => `
        <div class="loan-card" style="border-left:3px solid ${
            l.status === 'approved' ? 'var(--teal)' :
            l.status === 'rejected' ? 'var(--danger)' : 'var(--amber)'
        }">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:16px">
                <div>
                    <div style="margin-bottom:8px">
                        <span class="badge badge-${l.status}">${l.status}</span>
                        <span style="font-size:12px;color:var(--text-muted);margin-left:8px">#${l.id}</span>
                    </div>
                    <div style="font-size:16px;font-weight:700">Client #${l.user_id}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:28px;font-weight:900;letter-spacing:-1px">${new Intl.NumberFormat('fr-TN').format(l.amount)} DNT</div>
                    <div style="font-size:13px;color:var(--text-muted)">${l.duration_months} mois — ${new Intl.NumberFormat('fr-TN', {maximumFractionDigits:0}).format(l.amount / l.duration_months)} DNT/mois</div>
                </div>
            </div>

            ${l.purpose ? `<div style="font-size:13px;color:var(--text-muted);padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:14px"><i class="bi bi-chat-left-text"></i> <strong>Objet :</strong> ${l.purpose}</div>` : ''}

            ${l.comment ? `<div style="font-size:13px;color:var(--text-muted);padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:14px"><i class="bi bi-chat-quote"></i> <strong>Commentaire :</strong> ${l.comment}</div>` : ''}

            ${l.status === 'pending' ? `
                <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <button class="btn btn-success" style="flex:1;min-width:120px;justify-content:center" onclick="approveLoan(${l.id})">
                        <i class="bi bi-check-lg"></i> Approuver
                    </button>
                    <button class="btn btn-danger" style="flex:1;min-width:120px;justify-content:center" onclick="openRejectLoanModal(${l.id}, ${l.amount})">
                        <i class="bi bi-x-lg"></i> Refuser
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}


async function approveLoan(id) {
    const ok = await askConfirm(
        `Approuver le prêt #${id} ? Le montant sera crédité sur le compte du client.`,
        { title: 'Approuver le prêt', confirmText: 'Approuver', danger: false }
    );
    if (!ok) return;

    try {
        await api.post(`/manager/loans/${id}/approve`, { comment: '' });
        showToast('Prêt approuvé et crédité !', 'success');
        loadLoans();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


function openRejectLoanModal(id, amount) {
    currentRejectLoanId = id;
    document.getElementById('rejectLoanInfo').textContent = `Refuser la demande de prêt #${id} d'un montant de ${formatDNT(amount)} ?`;
    document.getElementById('rejectLoanComment').value = '';
    openModal('rejectLoanModal');
}


async function handleRejectLoan(e) {
    e.preventDefault();
    try {
        await api.post(`/manager/loans/${currentRejectLoanId}/reject`, {
            comment: document.getElementById('rejectLoanComment').value.trim(),
        });
        showToast('Demande de prêt refusée.', 'warning');
        closeModal('rejectLoanModal');
        loadLoans();
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
        const data = await api.get('/manager/accounts');
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
                            ${a.status !== 'closed' ? `
                                <button class="btn btn-sm ${a.status === 'active' ? 'btn-ghost' : 'btn-success'}"
                                        onclick="toggleAccount(${a.id}, '${a.status}')">
                                    <i class="bi bi-${a.status === 'active' ? 'snow2' : 'check-circle'}"></i>
                                    ${a.status === 'active' ? 'Geler' : 'Activer'}
                                </button>
                            ` : '<span class="td-muted">Fermé</span>'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}


async function toggleAccount(id, currentStatus) {
    const action = currentStatus === 'active' ? 'geler' : 'activer';
    const ok = await askConfirm(
        `Voulez-vous ${action} ce compte ?`,
        {
            title: currentStatus === 'active' ? 'Geler le compte' : 'Activer le compte',
            confirmText: currentStatus === 'active' ? 'Geler' : 'Activer',
            danger: currentStatus === 'active',
        }
    );
    if (!ok) return;

    try {
        await api.post(`/manager/accounts/${id}/freeze`);
        showToast(`Compte ${currentStatus === 'active' ? 'gelé' : 'activé'}.`, 'success');
        loadAccounts();
    } catch (err) {
        showToast(err.message, 'danger');
    }
}


function filterAccounts(q) {
    q = q.toLowerCase();
    renderAccounts(allAccounts.filter(a =>
        (a.owner_name || '').toLowerCase().includes(q) ||
        (a.owner_email || '').toLowerCase().includes(q) ||
        (a.account_number || '').toLowerCase().includes(q)
    ));
}


// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════

function updateBadge(id, count) {
    const badge = document.getElementById(id);
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}