from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..services import (
    account_service,
    transaction_service,
    loan_service,
)
from ..utils.decorators import get_current_user, role_required
from ..schemas import ApproveSchema, RejectSchema, validate_schema


manager_bp = Blueprint('manager', __name__)



@manager_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@role_required('gestionnaire')
def dashboard():

    user = get_current_user()

    pending_transfers = transaction_service.get_pending_transfers()
    pending_loans = [l for l in loan_service.get_all_loans() if l.status == 'pending']

    return jsonify({
        'user': user.to_dict(),
        'stats': {
            'pending_transfers_count': len(pending_transfers),
            'pending_loans_count': len(pending_loans),
        },
    }), 200


@manager_bp.route('/transfers', methods=['GET'])
@jwt_required()
@role_required('gestionnaire')
def list_pending_transfers():
    transfers = transaction_service.get_pending_transfers()
    return jsonify({
        'transfers': [t.to_dict() for t in transfers],
        'count': len(transfers),
    }), 200


@manager_bp.route('/transfers/<int:tx_id>/approve', methods=['POST'])
@jwt_required()
@role_required('gestionnaire')
def approve_transfer(tx_id):
    manager = get_current_user()

    tx, err = transaction_service.approve_transfer(tx_id, manager.id)
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Virement approuvé et exécuté.',
        'transaction': tx.to_dict(),
    }), 200


@manager_bp.route('/transfers/<int:tx_id>/reject', methods=['POST'])
@jwt_required()
@role_required('gestionnaire')
def reject_transfer(tx_id):
    manager = get_current_user()

    data = request.get_json() or {}
    clean, err = validate_schema(RejectSchema, data)
    if err:
        return jsonify({'error': err}), 400

    tx, err = transaction_service.reject_transfer(
        tx_id=tx_id,
        manager_id=manager.id,
        comment=clean['comment'],
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Virement rejeté.',
        'transaction': tx.to_dict(),
    }), 200



@manager_bp.route('/loans', methods=['GET'])
@jwt_required()
@role_required('gestionnaire')
def list_loans():
    status = request.args.get('status') or None
    loans = loan_service.get_all_loans()

    if status:
        loans = [l for l in loans if l.status == status]

    return jsonify({
        'loans': [l.to_dict() for l in loans],
        'count': len(loans),
    }), 200


@manager_bp.route('/loans/<int:loan_id>/approve', methods=['POST'])
@jwt_required()
@role_required('gestionnaire')
def approve_loan(loan_id):
    manager = get_current_user()

    data = request.get_json() or {}
    clean, err = validate_schema(ApproveSchema, data)
    if err:
        return jsonify({'error': err}), 400

    loan, err = loan_service.approve_loan(
        loan_id=loan_id,
        manager_id=manager.id,
        comment=clean.get('comment', ''),
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Prêt approuvé et montant crédité.',
        'loan': loan.to_dict(),
    }), 200


@manager_bp.route('/loans/<int:loan_id>/reject', methods=['POST'])
@jwt_required()
@role_required('gestionnaire')
def reject_loan(loan_id):
    manager = get_current_user()

    data = request.get_json() or {}
    clean, err = validate_schema(RejectSchema, data)
    if err:
        return jsonify({'error': err}), 400

    loan, err = loan_service.reject_loan(
        loan_id=loan_id,
        manager_id=manager.id,
        comment=clean['comment'],
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': 'Demande de prêt rejetée.',
        'loan': loan.to_dict(),
    }), 200



@manager_bp.route('/accounts', methods=['GET'])
@jwt_required()
@role_required('gestionnaire')
def list_accounts():
    accounts = account_service.get_all_accounts_with_users()

    # Build response with owner name (from join)
    result = []
    for acc in accounts:
        data = acc.to_dict()
        # `owner` backref gives us the User
        data['owner_name'] = acc.owner.full_name if acc.owner else None
        data['owner_email'] = acc.owner.email if acc.owner else None
        result.append(data)

    return jsonify({
        'accounts': result,
        'count': len(result),
    }), 200


@manager_bp.route('/accounts/<int:acc_id>/freeze', methods=['POST'])
@jwt_required()
@role_required('gestionnaire')
def toggle_account_status(acc_id):
    manager = get_current_user()

    account = account_service.get_account_by_id(acc_id)
    if not account:
        return jsonify({'error': 'Compte introuvable.'}), 404

    if account.status == 'closed':
        return jsonify({'error': 'Impossible de modifier un compte fermé.'}), 400

    new_status = 'frozen' if account.status == 'active' else 'active'
    account, err = account_service.update_account_status(
        account_id=acc_id,
        new_status=new_status,
        performer_id=manager.id,
    )
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': f'Compte {"gelé" if new_status == "frozen" else "activé"}.',
        'account': account.to_dict(),
    }), 200