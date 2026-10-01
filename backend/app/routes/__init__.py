from .auth_routes import auth_bp
from .customer_routes import customer_bp
from .manager_routes import manager_bp


__all__ = [
    'auth_bp',
    'customer_bp',
    'manager_bp',
]