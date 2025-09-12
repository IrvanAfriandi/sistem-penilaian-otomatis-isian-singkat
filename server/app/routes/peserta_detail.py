# app/routes/peserta_detail.py
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.ujian import Ujian
from app.models.soal import Soal
from app.models.peserta_ujian import PesertaUjian
from app.models.siswa import Siswa
from app.models.kelas import Kelas
from app.models.penilaian import Penilaian
from app.models.ekstraksi_teks import EkstraksiTeks
import os

peserta_detail_bp = Blueprint('peserta_detail', __name__)

@peserta_detail_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/detail', methods=['GET'])
@jwt_required()
def get_peserta_detail(ujian_id, peserta_id):
    """Get detailed information about a participant including scores and answers"""
    try:
        user_id = get_jwt_identity()
        
        # Verify ujian belongs to user
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan'}), 404
        
        # Get peserta ujian by peserta_ujian.id
        peserta = PesertaUjian.query.filter_by(id=peserta_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta tidak ditemukan'}), 404
        
        # Get siswa data from peserta.id_siswa
        siswa = Siswa.query.get(peserta.id_siswa)
        if not siswa:
            return jsonify({'error': 'Data siswa tidak ditemukan'}), 404
        
        # Get kelas data
        kelas_nama = None
        if siswa.kelas:
            kelas = Kelas.query.get(siswa.kelas)
            if kelas:
                kelas_nama = kelas.nama_kelas
        
        # Get soal data
        soal_list = Soal.query.filter_by(id_ujian=ujian_id).order_by(Soal.id).all()
        
        # Get penilaian data using peserta_id (peserta_ujian.id)
        penilaian_list = Penilaian.query.filter_by(id_peserta=peserta_id).all()
        penilaian_dict = {p.id_soal: p for p in penilaian_list}
        
        # Prepare response data
        soal_data = []
        for soal in soal_list:
            penilaian = penilaian_dict.get(soal.id)
            soal_data.append({
                'id': soal.id,
                'pertanyaan': soal.pertanyaan or '',
                'kunci_jawaban': soal.kunci_jawaban or '',
                'gambar': soal.gambar,
                'status_gambar': soal.status_gambar,
                'jawaban_siswa': penilaian.jawaban if penilaian else '',
                'nilai': float(penilaian.nilai) if penilaian and penilaian.nilai is not None else 0.0
            })
        
        return jsonify({
            'peserta': {
                'id': peserta.id,
                'nama_siswa': siswa.nama_siswa,
                'nisn': str(siswa.nisn),  # Convert to string for consistent handling
                'kelas': kelas_nama,
                'status': peserta.status,
                'total_nilai': float(peserta.total_nilai) if peserta.total_nilai is not None else 0.0,  # Ensure float
                'foto_jawaban': peserta.foto_jawaban
            },
            'ujian': {
                'id': ujian.id,
                'nama_ujian': ujian.nama_ujian
            },
            'soal': soal_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting peserta detail: {str(e)}")
        return jsonify({'error': 'Terjadi kesalahan server'}), 500

@peserta_detail_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/answers', methods=['GET'])
@jwt_required()
def get_peserta_answers(ujian_id, peserta_id):
    """Get participant answers for editing"""
    try:
        user_id = get_jwt_identity()
        
        # Verify ujian belongs to user
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan'}), 404
        
        # Get peserta ujian by peserta_ujian.id
        peserta = PesertaUjian.query.filter_by(id=peserta_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta tidak ditemukan'}), 404
        
        # Get siswa data from peserta.id_siswa
        siswa = Siswa.query.get(peserta.id_siswa)
        if not siswa:
            return jsonify({'error': 'Data siswa tidak ditemukan'}), 404
        
        # Get kelas data
        kelas_nama = None
        if siswa.kelas:
            kelas = Kelas.query.get(siswa.kelas)
            if kelas:
                kelas_nama = kelas.nama_kelas
        
        # Get soal data
        soal_list = Soal.query.filter_by(id_ujian=ujian_id).order_by(Soal.id).all()
        
        # Get penilaian data using peserta_id (peserta_ujian.id)
        penilaian_list = Penilaian.query.filter_by(id_peserta=peserta_id).all()
        penilaian_dict = {p.id_soal: p for p in penilaian_list}
        
        # Prepare editable data
        answers_data = []
        for soal in soal_list:
            penilaian = penilaian_dict.get(soal.id)
            answers_data.append({
                'soal_id': soal.id,
                'pertanyaan': soal.pertanyaan or '',
                'kunci_jawaban': soal.kunci_jawaban or '',
                'gambar': soal.gambar,
                'status_gambar': soal.status_gambar,
                'jawaban_siswa': penilaian.jawaban if penilaian else '',
                'nilai': float(penilaian.nilai) if penilaian and penilaian.nilai is not None else 0.0
            })
        
        return jsonify({
            'peserta': {
                'id': peserta.id,
                'nama_siswa': siswa.nama_siswa,
                'nisn': str(siswa.nisn),  # Convert to string
                'kelas': kelas_nama,
                'total_nilai': float(peserta.total_nilai) if peserta.total_nilai is not None else 0.0  # Ensure float
            },
            'ujian': {
                'id': ujian.id,
                'nama_ujian': ujian.nama_ujian
            },
            'answers': answers_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting peserta answers: {str(e)}")
        return jsonify({'error': 'Terjadi kesalahan server'}), 500

@peserta_detail_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/answers', methods=['PUT'])
@jwt_required()
def update_peserta_answers(ujian_id, peserta_id):
    """Update participant answers and scores"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'answers' not in data:
            return jsonify({'error': 'Data jawaban tidak valid'}), 400
        
        # Verify ujian belongs to user
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan'}), 404
        
        # Get peserta ujian by peserta_ujian.id
        peserta = PesertaUjian.query.filter_by(id=peserta_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta tidak ditemukan'}), 404
        
        answers = data['answers']
        total_nilai = 0
        
        for answer_data in answers:
            soal_id = answer_data.get('soal_id')
            jawaban = answer_data.get('jawaban_siswa', '')
            nilai = float(answer_data.get('nilai', 0))
            
            # Find existing penilaian or create new - use peserta_id (peserta_ujian.id)
            penilaian = Penilaian.query.filter_by(
                id_peserta=peserta_id,  # Use peserta_ujian.id directly
                id_soal=soal_id
            ).first()
            
            if penilaian:
                # Update existing
                penilaian.jawaban = jawaban
                penilaian.nilai = nilai
            else:
                # Create new
                penilaian = Penilaian(
                    id_peserta=peserta_id,  # Use peserta_ujian.id directly
                    id_soal=soal_id,
                    jawaban=jawaban,
                    nilai=nilai
                )
                db.session.add(penilaian)
            
            total_nilai += nilai
        
        # Update total nilai in peserta_ujian
        peserta.total_nilai = total_nilai
        peserta.status = 'selesai'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Jawaban berhasil diperbarui',
            'total_nilai': total_nilai
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating peserta answers: {str(e)}")
        return jsonify({'error': 'Terjadi kesalahan server'}), 500

@peserta_detail_bp.route('/static/jawaban/<filename>')
def serve_answer_image(filename):
    """Serve answer images"""
    try:
        upload_folder = os.path.join(current_app.root_path, 'static', 'jawaban')
        return send_from_directory(upload_folder, filename)
    except Exception as e:
        current_app.logger.error(f"Error serving answer image: {str(e)}")
        return jsonify({'error': 'File tidak ditemukan'}), 404