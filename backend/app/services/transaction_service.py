"""
Transaction service — handle money transfers between accounts.
"""
from datetime import datetime
from decimal import Decimal
from ..extensions import db
from ..models.account import Account
from ..models.transaction import Transaction
from . import audit_service
from . import notification_service


# ──────────────────────── Create ────────────────────────

def create_transfer(from_account_id, to_account_number, amount, user_id, description=''):
    """
    Create a pending transfer request from a customer.
    """
    # Convert amount to Decimal
    try:
        amount = Decimal(str(amount))
    except Exception:
        return None, 'Montant invalide.'

    if amount <= 0:
        return None, 'Montant invalide.'

    # Validate source account
    from_account = Account.query.get(from_account_id)
    if not from_account or from_account.user_id != user_id:
        return None, 'Compte source invalide.'

    if from_account.status != 'active':
        return None, 'Ce compte est gelé ou fermé.'

    # Check sufficient balance (Decimal comparison)
    if from_account.balance < amount:
        return None, 'Solde insuffisant.'

    # Validate destination
    to_account = Account.query.filter_by(account_number=to_account_number).first()
    if not to_account:
        return None, 'Compte destinataire introuvable.'

    if to_account.status != 'active':
        return None, 'Le compte destinataire est inactif.'

    if to_account.id == from_account.id:
        return None, 'Vous ne pouvez pas virer vers le même compte.'

    # Create pending transaction
    tx = Transaction(
        from_account_id=from_account.id,
        to_account_id=to_account.id,
        amount=amount,
        type='virement',
        status='pending',
        description=description,
    )
    db.session.add(tx)
    db.session.commit()

    # Notify sender
    notification_service.create_notification(
        user_id=user_id,
        title='Virement en attente',
        message=f'Votre virement de {amount:.2f} DNT est en cours de validation.',
    )

    audit_service.log_action(
        user_id=user_id,
        action='TRANSFER_REQUEST',
        details=f'{amount} DNT → {to_account_number}',
    )
    return tx, None


# ──────────────────────── Manager actions ────────────────────────

def approve_transfer(tx_id, manager_id):
    """
    Approve a pending transfer. Executes the money movement.
    """
    tx = Transaction.query.get(tx_id)
    if not tx:
        return None, 'Transaction introuvable.'

    if tx.status != 'pending':
        return None, 'Cette transaction a déjà été traitée.'

    from_account = Account.query.get(tx.from_account_id)
    to_account = Account.query.get(tx.to_account_id)

    if not from_account or not to_account:
        return None, 'Compte source ou destination introuvable.'

    # Re-check balance (Decimal comparison)
    if from_account.balance < tx.amount:
        return None, 'Solde insuffisant dans le compte source.'

    # Execute transfer — atomic
    try:
        from_account.balance = from_account.balance - tx.amount
        to_account.balance = to_account.balance + tx.amount
        tx.status = 'completed'
        tx.reviewed_by = manager_id
        tx.reviewed_at = datetime.utcnow()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return None, f'Erreur lors du virement : {str(e)}'

    # Notify both parties
    notification_service.create_notification(
        user_id=from_account.user_id,
        title='Virement approuvé',
        message=f'Votre virement de {float(tx.amount):.2f} DNT a été exécuté avec succès.',
    )
    notification_service.create_notification(
        user_id=to_account.user_id,
        title='Virement reçu',
        message=f'Vous avez reçu {float(tx.amount):.2f} DNT.',
    )

    audit_service.log_action(
        user_id=manager_id,
        action='APPROVE_TRANSFER',
        details=f'Transaction #{tx_id}',
    )
    return tx, None


def reject_transfer(tx_id, manager_id, comment=''):
    """
    Reject a pending transfer.
    """
    tx = Transaction.query.get(tx_id)
    if not tx:
        return None, 'Transaction introuvable.'

    if tx.status != 'pending':
        return None, 'Cette transaction a déjà été traitée.'

    tx.status = 'rejected'
    tx.reviewed_by = manager_id
    tx.reviewed_at = datetime.utcnow()
    if comment:
        tx.description = f'{tx.description} | Rejeté : {comment}'.strip(' |')
    db.session.commit()

    # Notify sender
    from_account = Account.query.get(tx.from_account_id)
    if from_account:
        notification_service.create_notification(
            user_id=from_account.user_id,
            title='Virement rejeté',
            message=f'Virement de {float(tx.amount):.2f} DNT rejeté. {comment}',
        )

    audit_service.log_action(
        user_id=manager_id,
        action='REJECT_TRANSFER',
        details=f'Transaction #{tx_id} : {comment}',
    )
    return tx, None


# ──────────────────────── Read ────────────────────────

def get_pending_transfers():
    """Return all pending transactions."""
    return (
        Transaction.query
        .filter_by(status='pending')
        .order_by(Transaction.created_at.desc())
        .all()
    )


def get_user_transactions(user_id, tx_type=None, status=None, limit=None):
    """
    Return all transactions involving any account of this user.
    """
    account_ids = [a.id for a in Account.query.filter_by(user_id=user_id).all()]
    if not account_ids:
        return []

    query = Transaction.query.filter(
        db.or_(
            Transaction.from_account_id.in_(account_ids),
            Transaction.to_account_id.in_(account_ids),
        )
    )

    if tx_type:
        query = query.filter(Transaction.type == tx_type)
    if status:
        query = query.filter(Transaction.status == status)

    query = query.order_by(Transaction.created_at.desc())
    if limit:
        query = query.limit(limit)

    return query.all()


def get_all_transactions(status=None):
    """Return all transactions (admin view)."""
    query = Transaction.query
    if status:
        query = query.filter(Transaction.status == status)
    return query.order_by(Transaction.created_at.desc()).all()


def get_transaction_by_id(tx_id):
    """Return a transaction by ID, or None."""
    return Transaction.query.get(tx_id)