from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.ujian import Ujian
from app.models.soal import Soal
from app.models.kelas import Kelas
from app.models.mata_pelajaran import MataPelajaran
from sqlalchemy import text

ujian_bp = Blueprint('ujian', __name__)

@ujian_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_ujian():
    """Get all ujian data for current user - NEWEST FIRST"""
    try:
        user_id = get_jwt_identity()
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '', type=str)
        kelas_filter = request.args.get('kelas', '', type=str)
        
        query = Ujian.query.filter_by(id_users=user_id)
        
        if search:
            query = query.filter(Ujian.nama_ujian.contains(search))
        
        if kelas_filter and kelas_filter.isdigit():
            query = query.filter_by(id_kelas=int(kelas_filter))
        
        query = query.order_by(Ujian.id.desc())
        
        ujian_paginated = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        result = {
            'ujian': [ujian.to_dict() for ujian in ujian_paginated.items],
            'total': ujian_paginated.total,
            'pages': ujian_paginated.pages,
            'current_page': page,
            'per_page': per_page
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ujian_bp.route('/', methods=['POST'])
@jwt_required()
def create_ujian():
    """Create new ujian"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('nama_ujian'):
            return jsonify({'error': 'Nama ujian harus diisi'}), 400
        
        id_kelas = data.get('id_kelas')
        if id_kelas:
            kelas = Kelas.query.filter_by(id=id_kelas, id_users=user_id).first()
            if not kelas:
                return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        id_mata_pelajaran = data.get('id_mata_pelajaran')
        if id_mata_pelajaran:
            mapel_query = MataPelajaran.query.filter_by(id=id_mata_pelajaran, id_users=user_id)
            if id_kelas:
                mapel_query = mapel_query.filter(
                    db.or_(
                        MataPelajaran.id_kelas == id_kelas,
                        MataPelajaran.id_kelas.is_(None)
                    )
                )
            mata_pelajaran = mapel_query.first()
            if not mata_pelajaran:
                return jsonify({'error': 'Mata pelajaran tidak ditemukan atau tidak sesuai dengan kelas'}), 404
        
        existing_ujian = Ujian.query.filter_by(
            nama_ujian=data['nama_ujian'], 
            id_users=user_id
        ).first()
        if existing_ujian:
            return jsonify({'error': 'Nama ujian sudah digunakan'}), 400
        
        ujian = Ujian(
            nama_ujian=data['nama_ujian'],
            id_kelas=id_kelas,
            id_mapel=id_mata_pelajaran,
            id_users=user_id
        )
        
        db.session.add(ujian)
        db.session.flush()

        for i in range(1, 6):
            soal = Soal(
                id_ujian=ujian.id,
                no_soal=i,
            )
            db.session.add(soal)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Ujian berhasil dibuat beserta 5 soal default',
            'ujian': ujian.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ujian_bp.route('/<int:ujian_id>', methods=['GET'])
@jwt_required()
def get_ujian(ujian_id):
    """Get specific ujian by ID"""
    try:
        user_id = get_jwt_identity()
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan atau Anda tidak memiliki akses'}), 404
            
        return jsonify(ujian.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ujian_bp.route('/<int:ujian_id>', methods=['PUT'])
@jwt_required()
def update_ujian(ujian_id):
    """Update ujian data"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        if not data.get('nama_ujian'):
            return jsonify({'error': 'Nama ujian harus diisi'}), 400
        
        id_kelas = data.get('id_kelas')
        if id_kelas:
            kelas = Kelas.query.filter_by(id=id_kelas, id_users=user_id).first()
            if not kelas:
                return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        id_mata_pelajaran = data.get('id_mata_pelajaran')
        if id_mata_pelajaran:
            mapel_query = MataPelajaran.query.filter_by(id=id_mata_pelajaran, id_users=user_id)
            if id_kelas:
                mapel_query = mapel_query.filter(
                    db.or_(
                        MataPelajaran.id_kelas == id_kelas,
                        MataPelajaran.id_kelas.is_(None)
                    )
                )
            mata_pelajaran = mapel_query.first()
            if not mata_pelajaran:
                return jsonify({'error': 'Mata pelajaran tidak ditemukan atau tidak sesuai dengan kelas'}), 404
        
        existing_ujian = Ujian.query.filter(
            Ujian.nama_ujian == data['nama_ujian'],
            Ujian.id != ujian_id,
            Ujian.id_users == user_id
        ).first()
        if existing_ujian:
            return jsonify({'error': 'Nama ujian sudah digunakan'}), 400
        
        ujian.nama_ujian = data['nama_ujian']
        ujian.id_kelas = id_kelas
        ujian.id_mapel = id_mata_pelajaran
        
        db.session.commit()
        
        return jsonify({
            'message': 'Ujian berhasil diperbarui',
            'ujian': ujian.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ujian_bp.route('/<int:ujian_id>', methods=['DELETE'])
@jwt_required()
def delete_ujian(ujian_id):
    """Delete ujian with CASCADE delete"""
    try:
        user_id = get_jwt_identity()
        
        # Check if ujian exists and belongs to user
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        # Use raw SQL with text() wrapper to leverage database CASCADE constraints
        result = db.session.execute(
            text('DELETE FROM ujian WHERE id = :ujian_id AND id_users = :user_id'),
            {'ujian_id': ujian_id, 'user_id': user_id}
        )
        
        if result.rowcount == 0:
            return jsonify({'error': 'Gagal menghapus ujian'}), 400
        
        db.session.commit()
        return jsonify({'message': 'Ujian berhasil dihapus'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ujian_bp.route('/search', methods=['GET'])
@jwt_required()
def search_ujian():
    """Search ujian by name - NEWEST FIRST"""
    try:
        user_id = get_jwt_identity()
        search_term = request.args.get('q', '', type=str)
        
        if not search_term:
            return jsonify({'ujian': []}), 200
        
        ujian_list = Ujian.query.filter(
            Ujian.id_users == user_id,
            Ujian.nama_ujian.contains(search_term)
        ).order_by(Ujian.id.desc()).limit(10).all()
        
        result = [ujian.to_dict() for ujian in ujian_list]
        
        return jsonify({'ujian': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ujian_bp.route('/by-kelas/<int:kelas_id>', methods=['GET'])
@jwt_required()
def get_ujian_by_kelas(kelas_id):
    """Get ujian by kelas ID - NEWEST FIRST"""
    try:
        user_id = get_jwt_identity()
        
        kelas = Kelas.query.filter_by(id=kelas_id, id_users=user_id).first()
        if not kelas:
            return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        ujian_list = Ujian.query.filter_by(
            id_kelas=kelas_id, 
            id_users=user_id
        ).order_by(Ujian.id.desc()).all()
        
        result = [ujian.to_dict() for ujian in ujian_list]
        
        return jsonify({'ujian': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ujian_bp.route('/mata-pelajaran-options/<int:kelas_id>', methods=['GET'])
@jwt_required()
def get_mata_pelajaran_by_kelas(kelas_id):
    """Get mata pelajaran options by kelas ID for dropdown"""
    try:
        user_id = get_jwt_identity()
        
        kelas = Kelas.query.filter_by(id=kelas_id, id_users=user_id).first()
        if not kelas:
            return jsonify({'error': 'Kelas tidak ditemukan atau Anda tidak memiliki akses'}), 404
        
        mapel_list = MataPelajaran.query.filter(
            MataPelajaran.id_users == user_id,
            db.or_(
                MataPelajaran.id_kelas == kelas_id,
                MataPelajaran.id_kelas.is_(None)
            )
        ).order_by(MataPelajaran.nama_mapel.asc()).all()
        
        result = [{'id': mapel.id, 'nama_mapel': mapel.nama_mapel} for mapel in mapel_list]
        
        return jsonify({'mata_pelajaran': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ujian_bp.route('/kelas-options', methods=['GET'])
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