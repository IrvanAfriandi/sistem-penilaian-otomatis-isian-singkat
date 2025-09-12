from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.siswa import Siswa
from app.models.kelas import Kelas
from sqlalchemy import text

siswa_bp = Blueprint('siswa', __name__)

@siswa_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_siswa():
    """Get all siswa data for current user"""
    try:
        user_id = get_jwt_identity()
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '', type=str)
        kelas_filter = request.args.get('kelas', '', type=str)
        
        query = Siswa.query.filter_by(id_users=user_id)
        
        if search:
            query = query.filter(
                db.or_(
                    Siswa.nama_siswa.contains(search),
                    Siswa.nisn.like(f'%{search}%')
                )
            )
        
        if kelas_filter and kelas_filter.isdigit():
            query = query.filter_by(kelas=int(kelas_filter))
        
        query = query.order_by(Siswa.nama_siswa.asc())
        
        siswa_paginated = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        result = {
            'siswa': [siswa.to_dict() for siswa in siswa_paginated.items],
            'total': siswa_paginated.total,
            'pages': siswa_paginated.pages,
            'current_page': page,
            'per_page': per_page
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@siswa_bp.route('/', methods=['POST'])
@jwt_required()
def create_siswa():
    """Create new siswa"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        required_fields = ['nama_siswa', 'nisn', 'jenis_kelamin']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} harus diisi'}), 400
        
        try:
            nisn = int(data['nisn'])
        except ValueError:
            return jsonify({'error': 'NISN harus berupa angka'}), 400
        
        existing_siswa = Siswa.query.filter_by(nisn=nisn, id_users=user_id).first()
        if existing_siswa:
            return jsonify({'error': 'NISN sudah digunakan'}), 400
        
        kelas_id = data.get('kelas')
        if kelas_id:
            kelas = Kelas.query.filter_by(id=kelas_id, id_users=user_id).first()
            if not kelas:
                return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        if data['jenis_kelamin'] not in ['Laki-laki', 'Perempuan']:
            return jsonify({'error': 'Jenis kelamin tidak valid'}), 400
        
        siswa = Siswa(
            nama_siswa=data['nama_siswa'],
            nisn=nisn,
            kelas=kelas_id,
            jenis_kelamin=data['jenis_kelamin'],
            id_users=user_id
        )
        
        db.session.add(siswa)
        db.session.commit()
        
        return jsonify({
            'message': 'Data siswa berhasil ditambahkan',
            'siswa': siswa.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@siswa_bp.route('/<int:siswa_id>', methods=['GET'])
@jwt_required()
def get_siswa(siswa_id):
    """Get specific siswa by ID"""
    try:
        user_id = get_jwt_identity()
        siswa = Siswa.query.filter_by(id=siswa_id, id_users=user_id).first()
        
        if not siswa:
            return jsonify({'error': 'Data siswa tidak ditemukan atau Anda tidak memiliki akses'}), 404
            
        return jsonify(siswa.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@siswa_bp.route('/<int:siswa_id>', methods=['PUT'])
@jwt_required()
def update_siswa(siswa_id):
    """Update siswa data"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        siswa = Siswa.query.filter_by(id=siswa_id, id_users=user_id).first()
        
        if not siswa:
            return jsonify({'error': 'Data siswa tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        required_fields = ['nama_siswa', 'nisn', 'jenis_kelamin']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} harus diisi'}), 400
        
        try:
            nisn = int(data['nisn'])
        except ValueError:
            return jsonify({'error': 'NISN harus berupa angka'}), 400
        
        existing_siswa = Siswa.query.filter(
            Siswa.nisn == nisn,
            Siswa.id != siswa_id,
            Siswa.id_users == user_id
        ).first()
        if existing_siswa:
            return jsonify({'error': 'NISN sudah digunakan'}), 400
        
        kelas_id = data.get('kelas')
        if kelas_id:
            kelas = Kelas.query.filter_by(id=kelas_id, id_users=user_id).first()
            if not kelas:
                return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        if data['jenis_kelamin'] not in ['Laki-laki', 'Perempuan']:
            return jsonify({'error': 'Jenis kelamin tidak valid'}), 400
        
        siswa.nama_siswa = data['nama_siswa']
        siswa.nisn = nisn
        siswa.kelas = kelas_id
        siswa.jenis_kelamin = data['jenis_kelamin']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Data siswa berhasil diperbarui',
            'siswa': siswa.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@siswa_bp.route('/<int:siswa_id>', methods=['DELETE'])
@jwt_required()
def delete_siswa(siswa_id):
    """Delete siswa with CASCADE delete"""
    try:
        user_id = get_jwt_identity()
        
        # Check if siswa exists and belongs to user
        siswa = Siswa.query.filter_by(id=siswa_id, id_users=user_id).first()
        if not siswa:
            return jsonify({'error': 'Data siswa tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        # Use raw SQL with text() wrapper to leverage database CASCADE constraints
        result = db.session.execute(
            text('DELETE FROM siswa WHERE id = :siswa_id AND id_users = :user_id'),
            {'siswa_id': siswa_id, 'user_id': user_id}
        )
        
        if result.rowcount == 0:
            return jsonify({'error': 'Gagal menghapus data siswa'}), 400
        
        db.session.commit()
        return jsonify({'message': 'Data siswa berhasil dihapus'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@siswa_bp.route('/search', methods=['GET'])
@jwt_required()
def search_siswa():
    """Search siswa by name or NISN"""
    try:
        user_id = get_jwt_identity()
        search_term = request.args.get('q', '', type=str)
        
        if not search_term:
            return jsonify({'siswa': []}), 200
        
        siswa_list = Siswa.query.filter(
            Siswa.id_users == user_id,
            db.or_(
                Siswa.nama_siswa.contains(search_term),
                Siswa.nisn.like(f'%{search_term}%')
            )
        ).order_by(Siswa.nama_siswa.asc()).limit(10).all()
        
        result = [siswa.to_dict() for siswa in siswa_list]
        
        return jsonify({'siswa': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@siswa_bp.route('/by-kelas/<int:kelas_id>', methods=['GET'])
@jwt_required()
def get_siswa_by_kelas(kelas_id):
    """Get siswa by kelas ID"""
    try:
        user_id = get_jwt_identity()
        
        kelas = Kelas.query.filter_by(id=kelas_id, id_users=user_id).first()
        if not kelas:
            return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        siswa_list = Siswa.query.filter_by(
            kelas=kelas_id, 
            id_users=user_id
        ).order_by(Siswa.nama_siswa.asc()).all()
        
        result = [siswa.to_dict() for siswa in siswa_list]
        
        return jsonify({'siswa': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@siswa_bp.route('/kelas-options', methods=['GET'])
@jwt_required()
def get_kelas_options():
    """Get kelas options for dropdown"""
    try:
        user_id = get_jwt_identity()
        
        kelas_list = Kelas.query.filter_by(id_users=user_id).order_by(Kelas.nama_kelas.asc()).all()
        
        result = [{'id': kelas.id, 'nama_kelas': kelas.nama_kelas} for kelas in kelas_list]
        
        return jsonify({'kelas': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500