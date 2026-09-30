from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum('customer', 'gestionnaire', 'admin', name='user_roles'),
        nullable=False,
        default='customer'
    )
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    phone = db.Column(db.String(30), default='')
    address = db.Column(db.String(255), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    accounts = db.relationship(
        'Account',
        backref='owner',
        lazy=True,
        cascade='all, delete-orphan'
    )
    notifications = db.relationship(
        'Notification',
        backref='user',
        lazy=True,
        cascade='all, delete-orphan'
    )
    loan_requests = db.relationship(
        'LoanRequest',
        backref='user',
        lazy=True,
        foreign_keys='LoanRequest.user_id'
    )

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'phone': self.phone,
            'address': self.address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_sensitive:
            data['password_hash'] = self.password_hash
        return data

    def __repr__(self):
        return f'<User {self.id} {self.email} [{self.role}]>'