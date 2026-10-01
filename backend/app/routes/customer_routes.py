from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..services import (
    account_service,
    transaction_service,
    loan_service,
    notification_service,
    user_service,
)
from ..utils.decorators import get_current_user, role_required
from ..schemas import (
    TransferSchema,
    LoanRequestSchema,
    UpdateProfileSchema,
    validate_schema,
)


customer_bp = Blueprint('customer', __name__)




@customer_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@role_required('customer')
def dashboard():

    user = get_current_user()
    accounts = account_service.get_user_accounts(user.id)
    recent_tx = transaction_service.get_user_transactions(user.id, limit=5)
    unread_count = notification_service.get_unread_count(user.id)
    total_balance = sum(float(a.balance) for a in accounts)

    return jsonify({
        'user': user.to_dict(),
        'accounts': [a.to_dict() for a in accounts],
        'recent_transactions': [t.to_dict() for t in recent_tx],
        'stats': {
            'total_balance': total_balance,
            'accounts_count': len(accounts),
            'unread_notifications': unread_count,
        },
    }), 200



@customer_bp.route('/accounts', methods=['GET'])
@jwt_required()
@role_required('customer')
def list_accounts():
    user = get_current_user()
    accounts = account_service.get_user_accounts(user.id)
    return jsonify({
        'accounts': [a.to_dict() for a in accounts],
    }), 200



@customer_bp.route('/transfer', methods=['POST'])
@jwt_required()
@role_required('customer')
def create_transfer():
    user = get_current_user()
    data = request.get_json() or {}
    clean, err = validate_schema(TransferSchema, data)
    if err:
        return jsonify({'error': err}), 400

    tx, err = transaction_service.create_transfer(
        from_account_id=clean['from_account_id'],
        to_account_number=clean['to_account_number'],
        amount=clean['amount'],
        user_id=user.id,
        description=clean.get('description', ''),
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Virement soumis. En attente de validation par un gestionnaire.',
        'transaction': tx.to_dict(),
    }), 201


@customer_bp.route('/lookup/<account_number>', methods=['GET'])
@jwt_required()
@role_required('customer')
def lookup_account(account_number):

    account = account_service.get_account_by_number(account_number)
    if not account or account.status != 'active':
        return jsonify({'found': False}), 200

    owner = account.owner
    return jsonify({
        'found': True,
        'owner': owner.full_name if owner else 'Inconnu',
        'type': account.account_type,
    }), 200



@customer_bp.route('/transactions', methods=['GET'])
@jwt_required()
@role_required('customer')
def list_transactions():

    user = get_current_user()

    tx_type = request.args.get('type') or None
    status = request.args.get('status') or None

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    per_page = min(per_page, 100)  # Cap to avoid abuse

    all_tx = transaction_service.get_user_transactions(
        user_id=user.id,
        tx_type=tx_type,
        status=status,
    )

    total = len(all_tx)
    start = (page - 1) * per_page
    end = start + per_page
    page_tx = all_tx[start:end]
    total_pages = max(1, (total + per_page - 1) // per_page)

    return jsonify({
        'transactions': [t.to_dict() for t in page_tx],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': total_pages,
        },
    }), 200



@customer_bp.route('/loans', methods=['GET'])
@jwt_required()
@role_required('customer')
def list_loans():
    user = get_current_user()
    loans = loan_service.get_user_loans(user.id)
    return jsonify({
        'loans': [l.to_dict() for l in loans],
    }), 200


@customer_bp.route('/loans', methods=['POST'])
@jwt_required()
@role_required('customer')
def create_loan():
    user = get_current_user()
    data = request.get_json() or {}
    clean, err = validate_schema(LoanRequestSchema, data)
    if err:
        return jsonify({'error': err}), 400

    loan, err = loan_service.create_loan_request(
        user_id=user.id,
        amount=clean['amount'],
        duration_months=clean['duration_months'],
        purpose=clean.get('purpose', ''),
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Demande de prêt soumise avec succès.',
        'loan': loan.to_dict(),
    }), 201



@customer_bp.route('/notifications', methods=['GET'])
@jwt_required()
@role_required('customer')
def list_notifications():
    user = get_current_user()
    notifications = notification_service.get_unread_notifications(user.id)
    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': len(notifications),
    }), 200


@customer_bp.route('/notifications/read', methods=['POST'])
@jwt_required()
@role_required('customer')
def mark_notifications_read():
    user = get_current_user()
    notification_service.mark_all_as_read(user.id)
    return jsonify({'message': 'Notifications marquées comme lues.'}), 200



@customer_bp.route('/profile', methods=['PUT'])
@jwt_required()
@role_required('customer')
def update_profile():
    user = get_current_user()
    data = request.get_json() or {}
    clean, err = validate_schema(UpdateProfileSchema, data)
    if err:
        return jsonify({'error': err}), 400

    updated, err = user_service.update_profile(
        user_id=user.id,
        full_name=clean.get('full_name'),
        phone=clean.get('phone'),
        address=clean.get('address'),
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Profil mis à jour.',
        'user': updated.to_dict(),
    }), 200