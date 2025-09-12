# kelas.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.kelas import Kelas
from app.models.siswa import Siswa
from sqlalchemy import func, text

kelas_bp = Blueprint('kelas', __name__)

@kelas_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_kelas():
    """Get all kelas data for current user with student count"""
    try:
        user_id = get_jwt_identity()
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '', type=str)
        
        query = db.session.query(
            Kelas,
            func.count(Siswa.id).label('total_students')
        ).outerjoin(
            Siswa, Kelas.id == Siswa.kelas
        ).filter(
            Kelas.id_users == user_id
        ).group_by(Kelas.id)
        
        if search:
            query = query.filter(Kelas.nama_kelas.contains(search))
        
        query = query.order_by(Kelas.nama_kelas.asc())
        results = query.all()
        
        total = len(results)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_results = results[start:end]
        
        kelas_list = []
        for kelas, total_students in paginated_results:
            kelas_dict = kelas.to_dict()
            kelas_dict['totalStudents'] = total_students
            kelas_list.append(kelas_dict)
        
        result = {
            'kelas': kelas_list,
            'total': total,
            'pages': (total + per_page - 1) // per_page,
            'current_page': page,
            'per_page': per_page
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@kelas_bp.route('/', methods=['POST'])
@jwt_required()
def create_kelas():
    """Create new kelas"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Nama kelas harus diisi'}), 400
        
        existing_kelas = Kelas.query.filter_by(
            nama_kelas=data['name'], 
            id_users=user_id
        ).first()
        if existing_kelas:
            return jsonify({'error': 'Nama kelas sudah digunakan'}), 400
        
        kelas = Kelas(
            nama_kelas=data['name'],
            id_users=user_id
        )
        
        db.session.add(kelas)
        db.session.commit()
        
        result = kelas.to_dict()
        
        return jsonify({
            'message': 'Kelas berhasil ditambahkan',
            'kelas': result
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@kelas_bp.route('/<int:kelas_id>', methods=['GET'])
@jwt_required()
def get_kelas(kelas_id):
    """Get specific kelas by ID"""
    try:
        user_id = get_jwt_identity()
        kelas = Kelas.query.filter_by(id=kelas_id, id_users=user_id).first()
        
        if not kelas:
            return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        result = kelas.to_dict()
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@kelas_bp.route('/<int:kelas_id>', methods=['PUT'])
@jwt_required()
def update_kelas(kelas_id):
    """Update kelas data"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        kelas = Kelas.query.filter_by(id=kelas_id, id_users=user_id).first()
        
        if not kelas:
            return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        if not data.get('name'):
            return jsonify({'error': 'Nama kelas harus diisi'}), 400
        
        existing_kelas = Kelas.query.filter(
            Kelas.nama_kelas == data['name'],
            Kelas.id != kelas_id,
            Kelas.id_users == user_id
        ).first()
        
        if existing_kelas:
            return jsonify({'error': 'Nama kelas sudah digunakan'}), 400
        
        kelas.nama_kelas = data['name']
        db.session.commit()
        
        result = kelas.to_dict()
        
        return jsonify({
            'message': 'Kelas berhasil diperbarui',
            'kelas': result
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@kelas_bp.route('/<int:kelas_id>', methods=['DELETE'])
@jwt_required()
def delete_kelas(kelas_id):
    """Delete kelas with CASCADE delete"""
    try:
        user_id = get_jwt_identity()
        
        # Check if kelas exists and belongs to user
        kelas = Kelas.query.filter_by(id=kelas_id, id_users=user_id).first()
        if not kelas:
            return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        # Use raw SQL with text() wrapper to leverage database CASCADE constraints
        result = db.session.execute(
            text('DELETE FROM kelas WHERE id = :kelas_id AND id_users = :user_id'),
            {'kelas_id': kelas_id, 'user_id': user_id}
        )
        
        if result.rowcount == 0:
            return jsonify({'error': 'Gagal menghapus kelas'}), 400
        
        db.session.commit()
        return jsonify({'message': 'Kelas berhasil dihapus'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@kelas_bp.route('/search', methods=['GET'])
@jwt_required()
def search_kelas():
    """Search kelas by name"""
    try:
        user_id = get_jwt_identity()
        search_term = request.args.get('q', '', type=str)
        
        if not search_term:
            return jsonify({'kelas': []}), 200
        
        results = db.session.query(
            Kelas,
            func.count(Siswa.id).label('total_students')
        ).outerjoin(
            Siswa, Kelas.id == Siswa.kelas
        ).filter(
            Kelas.nama_kelas.contains(search_term),
            Kelas.id_users == user_id
        ).group_by(Kelas.id).order_by(Kelas.nama_kelas.asc()).limit(10).all()
        
        kelas_list = []
        for kelas, total_students in results:
            kelas_dict = kelas.to_dict()
            kelas_dict['totalStudents'] = total_students
            kelas_list.append(kelas_dict)
        
        return jsonify({'kelas': kelas_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500