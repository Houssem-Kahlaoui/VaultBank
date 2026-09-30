from datetime import datetime
from ..extensions import db


class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    from_account_id = db.Column(
        db.Integer,
        db.ForeignKey('accounts.id', ondelete='SET NULL'),
        nullable=True,   
        index=True
    )
    to_account_id = db.Column(
        db.Integer,
        db.ForeignKey('accounts.id', ondelete='SET NULL'),
        nullable=True,   
        index=True
    )
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    type = db.Column(
        db.Enum('virement', 'depot', 'retrait', name='transaction_types'),
        nullable=False
    )
    status = db.Column(
        db.Enum('pending', 'completed', 'rejected', name='transaction_status'),
        nullable=False,
        default='pending'
    )
    description = db.Column(db.String(255), default='')
    reviewed_by = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True
    )
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    from_account = db.relationship(
        'Account',
        foreign_keys=[from_account_id],
        backref='outgoing_transactions'
    )
    to_account = db.relationship(
        'Account',
        foreign_keys=[to_account_id],
        backref='incoming_transactions'
    )
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

    def to_dict(self):
        return {
            'id': self.id,
            'from_account_id': self.from_account_id,
            'to_account_id': self.to_account_id,
            'from_account_number': self.from_account.account_number if self.from_account else None,
            'to_account_number': self.to_account.account_number if self.to_account else None,
            'amount': float(self.amount),
            'type': self.type,
            'status': self.status,
            'description': self.description,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Transaction {self.id} {self.type} {self.amount} [{self.status}]>'