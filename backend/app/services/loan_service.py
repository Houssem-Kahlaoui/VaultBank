"""
Loan service — handle customer loan requests and manager decisions.
"""
from datetime import datetime
from decimal import Decimal
from ..extensions import db
from ..models.loan import LoanRequest
from ..models.account import Account
from . import audit_service
from . import notification_service


def create_loan_request(user_id, amount, duration_months, purpose=''):
    """
    Create a new loan request from a customer.
    """
    # Convert amount to Decimal
    try:
        amount = Decimal(str(amount))
    except Exception:
        return None, 'Montant invalide.'

    # Validations
    if amount <= 0:
        return None, 'Le montant doit être positif.'
    if duration_months <= 0:
        return None, 'La durée doit être positive.'
    if amount < Decimal('10000'):
        return None, 'Le montant minimum est de 10 000 DNT.'
    if amount > Decimal('10000000'):
        return None, 'Le montant maximum est de 10 000 000 DNT.'

    loan = LoanRequest(
        user_id=user_id,
        amount=amount,
        duration_months=duration_months,
        purpose=purpose,
        status='pending',
    )
    db.session.add(loan)
    db.session.commit()

    notification_service.create_notification(
        user_id=user_id,
        title='Demande de prêt soumise',
        message=f'Votre demande de {float(amount):.2f} DNT a bien été reçue.',
    )

    audit_service.log_action(
        user_id=user_id,
        action='LOAN_REQUEST',
        details=f'{amount} DNT sur {duration_months} mois',
    )
    return loan, None


def approve_loan(loan_id, manager_id, comment=''):
    """
    Approve a loan and credit the customer's main account.
    """
    loan = LoanRequest.query.get(loan_id)
    if not loan:
        return None, 'Demande introuvable.'

    if loan.status != 'pending':
        return None, 'Cette demande a déjà été traitée.'

    # Find customer's main account (first courant)
    account = (
        Account.query
        .filter_by(user_id=loan.user_id, account_type='courant')
        .order_by(Account.created_at.asc())
        .first()
    )
    if not account:
        return None, 'Aucun compte courant trouvé pour ce client.'

    try:
        account.balance = account.balance + loan.amount
        loan.status = 'approved'
        loan.reviewed_by = manager_id
        loan.reviewed_at = datetime.utcnow()
        loan.comment = comment
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return None, f'Erreur lors de l\'approbation : {str(e)}'

    notification_service.create_notification(
        user_id=loan.user_id,
        title='Prêt approuvé !',
        message=f'Félicitations ! Votre prêt de {float(loan.amount):.2f} DNT a été approuvé et crédité.',
    )

    audit_service.log_action(
        user_id=manager_id,
        action='APPROVE_LOAN',
        details=f'Prêt #{loan_id}',
    )
    return loan, None


def reject_loan(loan_id, manager_id, comment=''):
    """
    Reject a loan request.
    """
    loan = LoanRequest.query.get(loan_id)
    if not loan:
        return None, 'Demande introuvable.'

    if loan.status != 'pending':
        return None, 'Cette demande a déjà été traitée.'

    loan.status = 'rejected'
    loan.reviewed_by = manager_id
    loan.reviewed_at = datetime.utcnow()
    loan.comment = comment
    db.session.commit()

    notification_service.create_notification(
        user_id=loan.user_id,
        title='Demande de prêt refusée',
        message=f'Votre demande de {float(loan.amount):.2f} DNT a été refusée. {comment}',
    )

    audit_service.log_action(
        user_id=manager_id,
        action='REJECT_LOAN',
        details=f'Prêt #{loan_id} : {comment}',
    )
    return loan, None


def get_user_loans(user_id):
    """Return all loan requests from a user, newest first."""
    return (
        LoanRequest.query
        .filter_by(user_id=user_id)
        .order_by(LoanRequest.created_at.desc())
        .all()
    )


def get_all_loans():
    """Return all loan requests (manager view)."""
    return LoanRequest.query.order_by(LoanRequest.created_at.desc()).all()


def get_loan_by_id(loan_id):
    """Return a loan request by ID, or None."""
    return LoanRequest.query.get(loan_id)