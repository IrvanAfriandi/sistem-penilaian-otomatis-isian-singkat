from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.mata_pelajaran import MataPelajaran
from app.models.kelas import Kelas
from app.models.user import User

mata_pelajaran_bp = Blueprint('mata_pelajaran', __name__)

@mata_pelajaran_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_mata_pelajaran():
    """Get all mata pelajaran data for current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get all mata pelajaran with pagination support - HANYA milik user yang sedang login
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '', type=str)
        
        query = MataPelajaran.query.filter_by(id_users=user_id)  # Filter by current user
        
        # Add search filter if provided
        if search:
            query = query.filter(MataPelajaran.nama_mapel.contains(search))
        
        # Order by nama_mapel
        query = query.order_by(MataPelajaran.nama_mapel.asc())
        
        # Paginate
        mapel_paginated = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        result = {
            'mata_pelajaran': [mapel.to_dict() for mapel in mapel_paginated.items],
            'total': mapel_paginated.total,
            'pages': mapel_paginated.pages,
            'current_page': page,
            'per_page': per_page
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mata_pelajaran_bp.route('/', methods=['POST'])
@jwt_required()
def create_mata_pelajaran():
    """Create new mata pelajaran"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        if not data.get('nama_mapel'):
            return jsonify({'error': 'Nama mata pelajaran harus diisi'}), 400
        
        # Validate kelas jika ada
        id_kelas = data.get('id_kelas')
        if id_kelas:
            # Pastikan kelas milik user yang sedang login
            kelas = Kelas.query.filter_by(id=id_kelas, id_users=user_id).first()
            if not kelas:
                return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        # Check if mata pelajaran name already exists for this user and kelas
        existing_query = MataPelajaran.query.filter_by(
            nama_mapel=data['nama_mapel'], 
            id_users=user_id
        )
        if id_kelas:
            existing_query = existing_query.filter_by(id_kelas=id_kelas)
        
        existing_mapel = existing_query.first()
        if existing_mapel:
            kelas_msg = f" untuk kelas {existing_mapel.kelas.nama_kelas}" if existing_mapel.kelas else ""
            return jsonify({'error': f'Nama mata pelajaran sudah digunakan{kelas_msg}'}), 400
        
        # Create new mata pelajaran
        mata_pelajaran = MataPelajaran(
            nama_mapel=data['nama_mapel'],
            id_kelas=id_kelas,
            id_users=user_id  # Set owner dari session
        )
        
        db.session.add(mata_pelajaran)
        db.session.commit()
        
        return jsonify({
            'message': 'Mata pelajaran berhasil ditambahkan',
            'mata_pelajaran': mata_pelajaran.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@mata_pelajaran_bp.route('/<int:mapel_id>', methods=['GET'])
@jwt_required()
def get_mata_pelajaran(mapel_id):
    """Get specific mata pelajaran by ID - only owned by current user"""
    try:
        user_id = get_jwt_identity()
        mata_pelajaran = MataPelajaran.query.filter_by(id=mapel_id, id_users=user_id).first()
        
        if not mata_pelajaran:
            return jsonify({'error': 'Mata pelajaran tidak ditemukan atau Anda tidak memiliki akses'}), 404
            
        return jsonify(mata_pelajaran.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mata_pelajaran_bp.route('/<int:mapel_id>', methods=['PUT'])
@jwt_required()
def update_mata_pelajaran(mapel_id):
    """Update mata pelajaran data - only owned by current user"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        mata_pelajaran = MataPelajaran.query.filter_by(id=mapel_id, id_users=user_id).first()
        
        if not mata_pelajaran:
            return jsonify({'error': 'Mata pelajaran tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        # Validate required fields
        if not data.get('nama_mapel'):
            return jsonify({'error': 'Nama mata pelajaran harus diisi'}), 400
        
        # Validate kelas jika ada
        id_kelas = data.get('id_kelas')
        if id_kelas:
            kelas = Kelas.query.filter_by(id=id_kelas, id_users=user_id).first()
            if not kelas:
                return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        # Check if new name already exists (excluding current mata pelajaran, for current user)
        existing_query = MataPelajaran.query.filter(
            MataPelajaran.nama_mapel == data['nama_mapel'],
            MataPelajaran.id != mapel_id,
            MataPelajaran.id_users == user_id
        )
        if id_kelas:
            existing_query = existing_query.filter_by(id_kelas=id_kelas)
        
        existing_mapel = existing_query.first()
        if existing_mapel:
            kelas_msg = f" untuk kelas {existing_mapel.kelas.nama_kelas}" if existing_mapel.kelas else ""
            return jsonify({'error': f'Nama mata pelajaran sudah digunakan{kelas_msg}'}), 400
        
        # Update mata pelajaran data
        mata_pelajaran.nama_mapel = data['nama_mapel']
        mata_pelajaran.id_kelas = id_kelas
        
        db.session.commit()
        
        return jsonify({
            'message': 'Mata pelajaran berhasil diperbarui',
            'mata_pelajaran': mata_pelajaran.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@mata_pelajaran_bp.route('/<int:mapel_id>', methods=['DELETE'])
@jwt_required()
def delete_mata_pelajaran(mapel_id):
    """Delete mata pelajaran - only owned by current user"""
    try:
        user_id = get_jwt_identity()
        mata_pelajaran = MataPelajaran.query.filter_by(id=mapel_id, id_users=user_id).first()
        
        if not mata_pelajaran:
            return jsonify({'error': 'Mata pelajaran tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        # TODO: Check if mata pelajaran has related data (soal, ujian, etc.)
        # For now, we'll allow deletion
        
        db.session.delete(mata_pelajaran)
        db.session.commit()
        
        return jsonify({'message': 'Mata pelajaran berhasil dihapus'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@mata_pelajaran_bp.route('/search', methods=['GET'])
@jwt_required()
def search_mata_pelajaran():
    """Search mata pelajaran by name - only owned by current user"""
    try:
        user_id = get_jwt_identity()
        search_term = request.args.get('q', '', type=str)
        
        if not search_term:
            return jsonify({'mata_pelajaran': []}), 200
        
        mapel_list = MataPelajaran.query.filter(
            MataPelajaran.nama_mapel.contains(search_term),
            MataPelajaran.id_users == user_id  # Only current user's mata pelajaran
        ).order_by(MataPelajaran.nama_mapel.asc()).limit(10).all()
        
        result = [mapel.to_dict() for mapel in mapel_list]
        
        return jsonify({'mata_pelajaran': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mata_pelajaran_bp.route('/by-kelas/<int:kelas_id>', methods=['GET'])
@jwt_required()
def get_mata_pelajaran_by_kelas(kelas_id):
    """Get mata pelajaran by kelas ID - only owned by current user"""
    try:
        user_id = get_jwt_identity()
        
        # Pastikan kelas milik user
        kelas = Kelas.query.filter_by(id=kelas_id, id_users=user_id).first()
        if not kelas:
            return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        # Get mata pelajaran untuk kelas ini milik user
        mapel_list = MataPelajaran.query.filter_by(
            id_kelas=kelas_id, 
            id_users=user_id
        ).order_by(MataPelajaran.nama_mapel.asc()).all()
        
        result = [mapel.to_dict() for mapel in mapel_list]
        
        return jsonify({'mata_pelajaran': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500