from datetime import datetime
from ..extensions import db


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    # ── Columns ──
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,   
        index=True
    )
    action = db.Column(db.String(60), nullable=False)
    details = db.Column(db.String(255), default='')
    ip_address = db.Column(db.String(45), default='')   # 45 chars = IPv6 max
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'details': self.details,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<AuditLog {self.id} {self.action}>'