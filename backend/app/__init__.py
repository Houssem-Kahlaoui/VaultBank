from flask import Flask, jsonify
from .config import Config
from .extensions import db, migrate, jwt, cors


def create_app():
    app = Flask(__name__)

    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config['FRONTEND_URL']}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    from .routes import auth_bp, customer_bp, manager_bp
    app.register_blueprint(auth_bp,     url_prefix='/api/auth')
    app.register_blueprint(customer_bp, url_prefix='/api/customer')
    app.register_blueprint(manager_bp,  url_prefix='/api/manager')

    @app.route('/api/health')
    def health():
        return jsonify({
            'status': 'ok',
            'service': 'VaultBank API',
            'version': '1.0.0',
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({'error': 'Missing or invalid token', 'details': reason}), 401

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({'error': 'Invalid token', 'details': reason}), 422

    @jwt.revoked_token_loader
    def revoked_token(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has been revoked'}), 401

    return app