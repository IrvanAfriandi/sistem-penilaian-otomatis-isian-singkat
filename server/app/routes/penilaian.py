from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.peserta_ujian import PesertaUjian
from app.models.ujian import Ujian
from app.models.soal import Soal
from app.models.penilaian import Penilaian

# ✅ TAMBAHAN: Import learning functions
from app.services.model_penilaian import save_learning_data, get_grader

penilaian_bp = Blueprint('penilaian', __name__)

@penilaian_bp.route('/detail/<int:peserta_ujian_id>', methods=['GET'])
@jwt_required()
def get_detail_penilaian(peserta_ujian_id):
    """Get detail penilaian per soal untuk peserta ujian"""
    try:
        user_id = get_jwt_identity()
        
        # Validate peserta ujian belongs to current user
        peserta = PesertaUjian.query.join(Ujian).filter(
            PesertaUjian.id == peserta_ujian_id,
            Ujian.id_users == user_id
        ).first()
        
        if not peserta:
            return jsonify({'error': 'Peserta ujian tidak ditemukan'}), 404
        
        # Get penilaian data with soal info
        penilaian_data = db.session.query(
            Penilaian.id,
            Penilaian.id_soal,
            Penilaian.jawaban,
            Penilaian.nilai,
            Soal.no_soal,
            Soal.pertanyaan,
            Soal.kunci_jawaban
        ).join(
            Soal, Penilaian.id_soal == Soal.id
        ).filter(
            Penilaian.id_peserta == peserta_ujian_id
        ).order_by(Soal.no_soal).all()
        
        # Format response
        detail_list = []
        for data in penilaian_data:
            detail_list.append({
                'penilaian_id': data.id,
                'soal_id': data.id_soal,
                'no_soal': data.no_soal,
                'pertanyaan': data.pertanyaan,
                'kunci_jawaban': data.kunci_jawaban,
                'jawaban': data.jawaban,
                'nilai': float(data.nilai) if data.nilai else 0.0
            })
        
        return jsonify({
            'data': detail_list,
            'total': len(detail_list),
            'peserta_ujian_id': peserta_ujian_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@penilaian_bp.route('/update-nilai/<int:penilaian_id>', methods=['PUT'])
@jwt_required()
def update_nilai_manual(penilaian_id):
    """Update nilai manual per soal dengan continuous learning"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate input
        nilai_baru = data.get('nilai')
        if nilai_baru is None:
            return jsonify({'error': 'Nilai harus diisi'}), 400
        
        try:
            nilai_baru = float(nilai_baru)
            if nilai_baru < 0 or nilai_baru > 100:
                return jsonify({'error': 'Nilai harus antara 0-100'}), 400
        except ValueError:
            return jsonify({'error': 'Nilai harus berupa angka'}), 400
        
        # Get penilaian with soal data dan validate ownership
        penilaian_query = db.session.query(
            Penilaian,
            Soal.pertanyaan,
            Soal.kunci_jawaban
        ).join(
            Soal, Penilaian.id_soal == Soal.id
        ).join(
            PesertaUjian, Penilaian.id_peserta == PesertaUjian.id
        ).join(
            Ujian, PesertaUjian.id_ujian == Ujian.id
        ).filter(
            Penilaian.id == penilaian_id,
            Ujian.id_users == user_id
        ).first()
        
        if not penilaian_query:
            return jsonify({'error': 'Penilaian tidak ditemukan'}), 404
        
        penilaian, soal_pertanyaan, soal_kunci_jawaban = penilaian_query
        
        # ✅ CONTINUOUS LEARNING: Save learning data jika ada perbedaan signifikan
        nilai_lama = float(penilaian.nilai) if penilaian.nilai else 0.0
        perbedaan = abs(nilai_baru - nilai_lama)
        
        learning_saved = False
        if perbedaan >= 5.0 and penilaian.jawaban and soal_kunci_jawaban:
            try:
                # Determine question type
                grader = get_grader()
                question_type = grader.analyze_question_context(soal_pertanyaan or '')
                
                # Save learning data
                learning_result = save_learning_data(
                    student_answer=penilaian.jawaban,
                    key_answer=soal_kunci_jawaban,
                    ai_score=nilai_lama,  # AI score (nilai sebelum edit)
                    human_score=nilai_baru,  # Human score (nilai setelah edit)
                    question_type=question_type,
                    question_text=soal_pertanyaan or ''
                )
                
                if learning_result:
                    learning_saved = True
                    
            except Exception as e:
                # Log error tapi jangan fail update nilai
                print(f"Warning: Failed to save learning data: {e}")
        
        # Update nilai
        penilaian.nilai = nilai_baru
        db.session.commit()
        
        # ✅ ENHANCED RESPONSE: Include learning info
        response_data = {
            'message': 'Nilai berhasil diperbarui',
            'penilaian': penilaian.to_dict(),
            'learning_data': {
                'saved': learning_saved,
                'score_difference': round(perbedaan, 1),
                'old_score': nilai_lama,
                'new_score': nilai_baru
            }
        }
        
        if learning_saved:
            response_data['message'] += ' dan data pembelajaran disimpan untuk peningkatan akurasi AI'
        
        return jsonify(response_data), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@penilaian_bp.route('/hitung-total/<int:peserta_ujian_id>', methods=['POST'])
@jwt_required()
def hitung_ulang_total_nilai(peserta_ujian_id):
    """Hitung ulang total nilai peserta berdasarkan penilaian individual"""
    try:
        user_id = get_jwt_identity()
        
        # Validate peserta ujian belongs to current user
        peserta = PesertaUjian.query.join(Ujian).filter(
            PesertaUjian.id == peserta_ujian_id,
            Ujian.id_users == user_id
        ).first()
        
        if not peserta:
            return jsonify({'error': 'Peserta ujian tidak ditemukan'}), 404
        
        # Get all penilaian for this peserta
        penilaian_list = Penilaian.query.filter_by(id_peserta=peserta_ujian_id).all()
        
        if not penilaian_list:
            return jsonify({'error': 'Belum ada penilaian untuk peserta ini'}), 400
        
        # Calculate new total
        total_score = sum([float(p.nilai) for p in penilaian_list if p.nilai])
        average_score = total_score / len(penilaian_list) if penilaian_list else 0
        
        # Update peserta ujian
        peserta.total_nilai = round(average_score, 2)
        db.session.commit()
        
        return jsonify({
            'message': 'Total nilai berhasil dihitung ulang',
            'total_nilai': peserta.total_nilai,
            'total_penilaian': len(penilaian_list),
            'peserta_ujian_id': peserta_ujian_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ✅ BONUS: Route untuk learning statistics
@penilaian_bp.route('/learning-stats', methods=['GET'])
@jwt_required()
def get_learning_statistics():
    """Get continuous learning statistics"""
    try:
        from app.services.model_penilaian import get_learning_stats
        
        stats = get_learning_stats()
        return jsonify({
            'data': stats,
            'message': 'Learning statistics retrieved successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@penilaian_bp.route('/reload-learning', methods=['POST'])
@jwt_required()
def reload_learning_mappings():
    """Reload learning mappings cache"""
    try:
        from app.services.model_penilaian import reload_learning_mappings
        
        count = reload_learning_mappings()
        return jsonify({
            'message': f'Learning mappings reloaded successfully',
            'total_mappings': count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500