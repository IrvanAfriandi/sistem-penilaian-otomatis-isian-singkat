from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models.user import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields sesuai frontend
        required_fields = ['firstName', 'lastName', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} harus diisi'}), 400
        
        # Validate email format (basic)
        if '@' not in data['email']:
            return jsonify({'error': 'Format email tidak valid'}), 400
        
        # Validate password length
        if len(data['password']) < 6:
            return jsonify({'error': 'Password minimal 6 karakter'}), 400
        
        # Check if user exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email sudah digunakan'}), 400
        
        # Create new user - mapping frontend fields ke backend fields
        user = User(
            nama_depan=data['firstName'],    # Frontend -> Backend mapping
            nama_belakang=data['lastName'],
            email=data['email']
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Registrasi berhasil! Silakan login.',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email dan password harus diisi'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if user and user.check_password(data['password']):
            access_token = create_access_token(identity=str(user.id))
            return jsonify({
                'message': 'Login berhasil!',
                'access_token': access_token,
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Email atau password salah'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # For JWT, logout is handled on client side by removing token
    return jsonify({'message': 'Logout berhasil'}), 200