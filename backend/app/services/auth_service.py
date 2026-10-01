from flask_jwt_extended import create_access_token, create_refresh_token
from ..extensions import db
from ..models.user import User
from ..models.account import Account
from ..models.notification import Notification
from . import audit_service




def _generate_account_number():
    import random
    import string
    while True:
        number = 'TN' + ''.join(random.choices(string.digits, k=12))
        exists = Account.query.filter_by(account_number=number).first()
        if not exists:
            return number


def register_user(full_name, email, password, phone='', address=''):

    # Check for duplicate email
    if User.query.filter_by(email=email).first():
        return None, 'Cet email est déjà utilisé.'

    # Create user
    user = User(
        full_name=full_name,
        email=email,
        role='customer',
        phone=phone,
        address=address,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()   # Get user.id before commit

    # Create default 'courant' account
    account = Account(
        user_id=user.id,
        account_number=_generate_account_number(),
        account_type='courant',
        balance=0.00,
    )
    db.session.add(account)

    # Welcome notification
    notification = Notification(
        user_id=user.id,
        title='Bienvenue sur VaultBank !',
        message=f'Votre compte courant {account.account_number} a été créé avec succès.',
    )
    db.session.add(notification)

    # Commit everything atomically
    db.session.commit()

    # Audit log
    audit_service.log_action(
        user_id=user.id,
        action='REGISTER',
        details=f'Nouvel utilisateur: {email}',
    )

    return user, None


def authenticate(email, password):

    user = User.query.filter_by(email=email).first()

    if not user:
        return None, 'Email ou mot de passe incorrect.'

    if not user.check_password(password):
        return None, 'Email ou mot de passe incorrect.'

    if not user.is_active:
        return None, 'Votre compte est désactivé. Contactez un administrateur.'

    return user, None


def generate_tokens(user):

    additional_claims = {
        'role': user.role,
        'email': user.email,
        'full_name': user.full_name,
    }
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims,
    )
    refresh_token = create_refresh_token(
        identity=str(user.id),
        additional_claims=additional_claims,
    )
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
    }