from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from config import Config
import os
from flask import send_from_directory, abort

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Enable CORS untuk frontend React
    CORS(app, origins=["http://localhost:8080"], supports_credentials=True)
    
    jwt.init_app(app)
    
    # Import models - import in correct order for relationships
    from app.models.user import User
    from app.models.kelas import Kelas
    from app.models.mata_pelajaran import MataPelajaran
    from app.models.siswa import Siswa
    from app.models.ujian import Ujian
    from app.models.soal import Soal
    from app.models.peserta_ujian import PesertaUjian
    from app.models.ekstraksi_teks import EkstraksiTeks  # New model
    from app.models.penilaian import Penilaian  # New model
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.kelas import kelas_bp
    from app.routes.mata_pelajaran import mata_pelajaran_bp
    from app.routes.siswa import siswa_bp
    from app.routes.ujian import ujian_bp
    from app.routes.ujian_detail import ujian_detail_bp
    from app.routes.ekstraksi_endpoint import ekstraksi_bp  # New blueprint
    from app.routes.penilaian_otomatis import penilaian_otomatis_bp  # Add penilaian blueprint
    # Registrasi blueprint baru
    from app.routes.peserta_detail import peserta_detail_bp
    
    app.register_blueprint(peserta_detail_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(kelas_bp, url_prefix='/api/kelas')
    app.register_blueprint(mata_pelajaran_bp, url_prefix='/api/mata-pelajaran')
    app.register_blueprint(siswa_bp, url_prefix='/api/siswa')
    app.register_blueprint(ujian_bp, url_prefix='/api/ujian')
    app.register_blueprint(ujian_detail_bp, url_prefix='/api/ujian')
    app.register_blueprint(ekstraksi_bp, url_prefix='/api')
    app.register_blueprint(penilaian_otomatis_bp, url_prefix='/api')  # Add penilaian routes
    
    # Health check endpoint
    @app.route('/api/health')
    def health():
        return {'status': 'OK', 'message': 'Server is running'}, 200
    
    # Auth check endpoint - requires authentication
    @app.route('/api/auth/check')
    @jwt_required()
    def auth_check():
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'status': 'authenticated',
                'user': user.to_dict()
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return app