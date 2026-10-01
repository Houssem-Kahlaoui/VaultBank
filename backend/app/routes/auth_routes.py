"""
Auth routes — /api/auth/*
Handles register, login, refresh, current user, change password.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    create_access_token,
)
from ..services import auth_service, user_service, audit_service
from ..utils.decorators import get_current_user
from ..schemas.auth_schema import (
    RegisterSchema,
    LoginSchema,
    ChangePasswordSchema,
    validate_schema,
)


auth_bp = Blueprint('auth', __name__)


# ──────────────────────── POST /api/auth/register ────────────────────────

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new customer account."""
    data = request.get_json() or {}
    clean, err = validate_schema(RegisterSchema, data)
    if err:
        return jsonify({'error': err}), 400

    user, err = auth_service.register_user(
        full_name=clean['full_name'],
        email=clean['email'],
        password=clean['password'],
        phone=clean.get('phone', ''),
        address=clean.get('address', ''),
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Compte créé avec succès.',
        'user': user.to_dict(),
    }), 201


# ──────────────────────── POST /api/auth/login ────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate a user and return JWT tokens."""
    data = request.get_json() or {}
    clean, err = validate_schema(LoginSchema, data)
    if err:
        return jsonify({'error': err}), 400

    user, err = auth_service.authenticate(clean['email'], clean['password'])
    if err:
        return jsonify({'error': err}), 401

    tokens = auth_service.generate_tokens(user)

    audit_service.log_action(
        user_id=user.id,
        action='LOGIN',
        details='Connexion réussie',
        ip_address=request.remote_addr or '',
    )

    return jsonify({
        'message': f'Bienvenue, {user.full_name} !',
        'user': user.to_dict(),
        'access_token': tokens['access_token'],
        'refresh_token': tokens['refresh_token'],
    }), 200


# ──────────────────────── POST /api/auth/refresh ────────────────────────

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Exchange a valid refresh token for a new access token."""
    user_id = get_jwt_identity()
    user = user_service.get_user_by_id(int(user_id))
    if not user or not user.is_active:
        return jsonify({'error': 'Utilisateur invalide ou désactivé.'}), 401

    new_access = create_access_token(
        identity=str(user.id),
        additional_claims={
            'role': user.role,
            'email': user.email,
            'full_name': user.full_name,
        },
    )
    return jsonify({'access_token': new_access}), 200


# ──────────────────────── GET /api/auth/me ────────────────────────

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Return the currently authenticated user's info."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Utilisateur introuvable.'}), 404
    return jsonify({'user': user.to_dict()}), 200


# ──────────────────────── POST /api/auth/change-password ────────────────────────

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change the current user's password."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Utilisateur introuvable.'}), 404

    data = request.get_json() or {}
    clean, err = validate_schema(ChangePasswordSchema, data)
    if err:
        return jsonify({'error': err}), 400

    success, err = user_service.change_password(
        user_id=user.id,
        current_password=clean['current_password'],
        new_password=clean['new_password'],
    )
    if not success:
        return jsonify({'error': err}), 400

    return jsonify({'message': 'Mot de passe mis à jour avec succès.'}), 200