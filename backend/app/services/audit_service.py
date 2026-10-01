from ..extensions import db
from ..models.audit_log import AuditLog


def log_action(user_id, action, details='', ip_address=''):
    log = AuditLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip_address or '',
    )
    db.session.add(log)
    db.session.commit()
    return log


def get_recent_logs(limit=300):
    return (
        AuditLog.query
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
def get_admin_stats():
    from ..models.user import User
    from ..models.account import Account
    from ..models.transaction import Transaction
    from ..models.loan import LoanRequest

    return {
        'total_customers': User.query.filter_by(role='customer').count(),
        'total_gestionnaires': User.query.filter_by(role='gestionnaire').count(),
        'total_admins': User.query.filter_by(role='admin').count(),
        'total_accounts': Account.query.count(),
        'active_accounts': Account.query.filter_by(status='active').count(),
        'frozen_accounts': Account.query.filter_by(status='frozen').count(),
        'pending_transactions': Transaction.query.filter_by(status='pending').count(),
        'completed_transactions': Transaction.query.filter_by(status='completed').count(),
        'pending_loans': LoanRequest.query.filter_by(status='pending').count(),
    }