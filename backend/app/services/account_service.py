from ..extensions import db
from ..models.account import Account
from ..models.user import User
from . import audit_service



def get_account_by_id(account_id):
    """Return an account by ID, or None."""
    return Account.query.get(account_id)


def get_account_by_number(account_number):
    """Return an account by its account_number, or None."""
    return Account.query.filter_by(account_number=account_number).first()


def get_user_accounts(user_id):
    return (
        Account.query
        .filter_by(user_id=user_id)
        .order_by(Account.created_at.asc())
        .all()
    )


def get_all_accounts_with_users():
    return (
        Account.query
        .join(User, Account.user_id == User.id)
        .order_by(Account.created_at.desc())
        .all()
    )



def update_account_status(account_id, new_status, performer_id=None):

    if new_status not in ('active', 'frozen', 'closed'):
        return None, 'Statut invalide.'

    account = Account.query.get(account_id)
    if not account:
        return None, 'Compte introuvable.'

    old_status = account.status
    account.status = new_status
    db.session.commit()

    if performer_id:
        audit_service.log_action(
            user_id=performer_id,
            action='TOGGLE_ACCOUNT',
            details=f'Compte #{account_id} : {old_status} → {new_status}',
        )
    return account, None


def credit_account(account_id, amount, performer_id=None, description='Dépôt administratif'):

    if amount <= 0:
        return None, 'Le montant doit être positif.'

    account = Account.query.get(account_id)
    if not account:
        return None, 'Compte introuvable.'

    if account.status != 'active':
        return None, 'Impossible de créditer un compte inactif.'

    account.balance += amount
    db.session.commit()

    if performer_id:
        audit_service.log_action(
            user_id=performer_id,
            action='CREDIT_ACCOUNT',
            details=f'Compte #{account_id} (+{amount} DNT) — {description}',
        )
    return account, None