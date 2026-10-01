from ..extensions import db
from ..models.user import User
from ..models.account import Account
from . import audit_service
from .auth_service import _generate_account_number


def get_all_users():
    return User.query.order_by(User.created_at.desc()).all()


def get_user_by_id(user_id):
    return User.query.get(user_id)


def get_user_by_email(email):
    return User.query.filter_by(email=email).first()


def create_user(full_name, email, password, role='customer', phone='', address=''):

    if User.query.filter_by(email=email).first():
        return None, 'Cet email est déjà utilisé.'

    user = User(
        full_name=full_name,
        email=email,
        role=role,
        phone=phone,
        address=address,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    # Customers get an automatic account
    if role == 'customer':
        account = Account(
            user_id=user.id,
            account_number=_generate_account_number(),
            account_type='courant',
            balance=0.00,
        )
        db.session.add(account)

    db.session.commit()
    return user, None


def toggle_user_status(user_id, admin_id):

    user = User.query.get(user_id)
    if not user:
        return None, None, 'Utilisateur introuvable.'

    user.is_active = not user.is_active

    # Sync account status
    if user.is_active:
        Account.query.filter_by(user_id=user.id, status='frozen').update({'status': 'active'})
    else:
        Account.query.filter_by(user_id=user.id, status='active').update({'status': 'frozen'})

    db.session.commit()

    audit_service.log_action(
        user_id=admin_id,
        action='ACTIVATE_USER' if user.is_active else 'DEACTIVATE_USER',
        details=f'User #{user_id} ({user.email})',
    )

    return user, user.is_active, None


def update_profile(user_id, full_name=None, phone=None, address=None):
    user = User.query.get(user_id)
    if not user:
        return None, 'Utilisateur introuvable.'

    if full_name is not None:
        user.full_name = full_name
    if phone is not None:
        user.phone = phone
    if address is not None:
        user.address = address

    db.session.commit()
    return user, None


def change_password(user_id, current_password, new_password):

    user = User.query.get(user_id)
    if not user:
        return False, 'Utilisateur introuvable.'

    if not user.check_password(current_password):
        return False, 'Mot de passe actuel incorrect.'

    if len(new_password) < 6:
        return False, 'Le nouveau mot de passe doit contenir au moins 6 caractères.'

    user.set_password(new_password)
    db.session.commit()

    audit_service.log_action(
        user_id=user.id,
        action='CHANGE_PASSWORD',
        details='Mot de passe modifié',
    )
    return True, None


def delete_user(user_id, admin_id):

    user = User.query.get(user_id)
    if not user:
        return False, 'Utilisateur introuvable.'

    # Prevent deleting the last admin (safety)
    if user.role == 'admin':
        admin_count = User.query.filter_by(role='admin').count()
        if admin_count <= 1:
            return False, 'Impossible de supprimer le dernier administrateur.'

    email = user.email
    db.session.delete(user)   
    db.session.commit()

    audit_service.log_action(
        user_id=admin_id,
        action='DELETE_USER',
        details=f'User #{user_id} ({email})',
    )
    return True, None