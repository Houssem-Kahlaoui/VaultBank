from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..services import (
    user_service,
    account_service,
    transaction_service,
    audit_service,
)
from ..utils.decorators import get_current_user, role_required
from ..schemas import (
    CreateUserSchema,
    CreditAccountSchema,
    validate_schema,
)


admin_bp = Blueprint('admin', __name__)



@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@role_required('admin')
def dashboard():
    admin = get_current_user()
    stats = audit_service.get_admin_stats()

    return jsonify({
        'user': admin.to_dict(),
        'stats': stats,
    }), 200



@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@role_required('admin')
def list_users():
    users = user_service.get_all_users()
    return jsonify({
        'users': [u.to_dict() for u in users],
        'count': len(users),
    }), 200


@admin_bp.route('/users', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_user():
    admin = get_current_user()
    data = request.get_json() or {}
    clean, err = validate_schema(CreateUserSchema, data)
    if err:
        return jsonify({'error': err}), 400

    user, err = user_service.create_user(
        full_name=clean['full_name'],
        email=clean['email'],
        password=clean['password'],
        role=clean['role'],
        phone=clean.get('phone', ''),
        address=clean.get('address', ''),
    )
    if err:
        return jsonify({'error': err}), 400

    audit_service.log_action(
        user_id=admin.id,
        action='CREATE_USER',
        details=f'{user.email} [{user.role}]',
    )
    return jsonify({
        'message': f'Utilisateur {user.full_name} créé.',
        'user': user.to_dict(),
    }), 201


@admin_bp.route('/users/<int:user_id>/toggle', methods=['PUT'])
@jwt_required()
@role_required('admin')
def toggle_user(user_id):
    admin = get_current_user()

    if user_id == admin.id:
        return jsonify({'error': 'Vous ne pouvez pas modifier votre propre statut.'}), 400

    user, new_status, err = user_service.toggle_user_status(user_id, admin.id)
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': f'Utilisateur {"activé" if new_status else "désactivé"}.',
        'user': user.to_dict(),
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_user(user_id):
    admin = get_current_user()

    if user_id == admin.id:
        return jsonify({'error': 'Vous ne pouvez pas supprimer votre propre compte.'}), 400

    success, err = user_service.delete_user(user_id, admin.id)
    if not success:
        return jsonify({'error': err}), 400

    return jsonify({'message': 'Utilisateur supprimé.'}), 200


@admin_bp.route('/accounts', methods=['GET'])
@jwt_required()
@role_required('admin')
def list_accounts():
    accounts = account_service.get_all_accounts_with_users()

    result = []
    for acc in accounts:
        data = acc.to_dict()
        data['owner_name'] = acc.owner.full_name if acc.owner else None
        data['owner_email'] = acc.owner.email if acc.owner else None
        result.append(data)

    return jsonify({
        'accounts': result,
        'count': len(result),
    }), 200


@admin_bp.route('/accounts/<int:acc_id>/freeze', methods=['POST'])
@jwt_required()
@role_required('admin')
def freeze_account(acc_id):
    admin = get_current_user()

    account = account_service.get_account_by_id(acc_id)
    if not account:
        return jsonify({'error': 'Compte introuvable.'}), 404

    if account.status == 'closed':
        return jsonify({'error': 'Impossible de modifier un compte fermé.'}), 400

    new_status = 'frozen' if account.status == 'active' else 'active'
    account, err = account_service.update_account_status(
        account_id=acc_id,
        new_status=new_status,
        performer_id=admin.id,
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': f'Compte {"gelé" if new_status == "frozen" else "activé"}.',
        'account': account.to_dict(),
    }), 200


@admin_bp.route('/accounts/<int:acc_id>/credit', methods=['POST'])
@jwt_required()
@role_required('admin')
def credit_account(acc_id):
    admin = get_current_user()
    data = request.get_json() or {}
    clean, err = validate_schema(CreditAccountSchema, data)
    if err:
        return jsonify({'error': err}), 400

    account, err = account_service.credit_account(
        account_id=acc_id,
        amount=clean['amount'],
        performer_id=admin.id,
        description=clean.get('description', 'Dépôt administratif'),
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': f'{clean["amount"]:.2f} DNT crédités.',
        'account': account.to_dict(),
    }), 200



@admin_bp.route('/transactions', methods=['GET'])
@jwt_required()
@role_required('admin')
def list_transactions():
    status = request.args.get('status') or None
    transactions = transaction_service.get_all_transactions(status=status)

    return jsonify({
        'transactions': [t.to_dict() for t in transactions],
        'count': len(transactions),
    }), 200



@admin_bp.route('/logs', methods=['GET'])
@jwt_required()
@role_required('admin')
def list_logs():
    limit = request.args.get('limit', 300, type=int)
    limit = min(limit, 1000)   # Cap

    logs = audit_service.get_recent_logs(limit=limit)

    return jsonify({
        'logs': [log.to_dict() for log in logs],
        'count': len(logs),
    }), 200