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