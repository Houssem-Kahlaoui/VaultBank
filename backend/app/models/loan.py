from datetime import datetime
from ..extensions import db


class LoanRequest(db.Model):
    __tablename__ = 'loan_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    duration_months = db.Column(db.Integer, nullable=False)
    purpose = db.Column(db.String(255), default='')
    status = db.Column(
        db.Enum('pending', 'approved', 'rejected', name='loan_status'),
        nullable=False,
        default='pending'
    )
    reviewed_by = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True
    )
    comment = db.Column(db.String(255), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount': float(self.amount),
            'duration_months': self.duration_months,
            'purpose': self.purpose,
            'status': self.status,
            'reviewed_by': self.reviewed_by,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
        }

    def __repr__(self):
        return f'<LoanRequest {self.id} {self.amount} [{self.status}]>'