from datetime import datetime
from ..extensions import db


class Account(db.Model):
    __tablename__ = 'accounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    account_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    account_type = db.Column(
        db.Enum('courant', 'epargne', name='account_types'),
        nullable=False,
        default='courant'
    )
    balance = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)
    currency = db.Column(db.String(5), nullable=False, default='DNT')
    status = db.Column(
        db.Enum('active', 'frozen', 'closed', name='account_status'),
        nullable=False,
        default='active'
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account_number': self.account_number,
            'account_type': self.account_type,
            'balance': float(self.balance),   
            'currency': self.currency,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Account {self.account_number} ({self.account_type})>'