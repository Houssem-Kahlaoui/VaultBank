from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from ..models.user import User


def get_current_user():

    try:
        user_id = get_jwt_identity()
        if user_id is None:
            return None
        return User.query.get(int(user_id))
    except Exception:
        return None


def role_required(*allowed_roles):

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()

            claims = get_jwt()
            role = claims.get('role')

            if role not in allowed_roles:
                return jsonify({
                    'error': 'Accès non autorisé.',
                    'your_role': role,
                    'required_roles': list(allowed_roles),
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def active_user_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = get_current_user()

        if not user:
            return jsonify({'error': 'Utilisateur introuvable.'}), 404

        if not user.is_active:
            return jsonify({'error': 'Compte désactivé.'}), 403

        return fn(*args, **kwargs)
    return wrapper