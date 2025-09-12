from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.ekstraksi_teks import EkstraksiTeks
from app.models.soal import Soal
from app.models.penilaian import Penilaian
from app.models.peserta_ujian import PesertaUjian
from app.services.model_penilaian import get_grader, grade_multiple_answers
from app import db
import logging
from typing import List, Dict, Any
import os
import csv
import re
from flask import send_from_directory, abort

# Create Blueprint
penilaian_otomatis_bp = Blueprint('penilaian_otomatis', __name__)

def save_koreksi_mapping(id_peserta: int, id_soal: int):
    """
    Membandingkan teks ekstraksi dengan jawaban penilaian
    Simpan ke CSV hanya jika berbeda (user telah edit) dan keduanya valid
    """
    try:
        # Ambil data dari ekstraksi_teks
        ekstraksi = EkstraksiTeks.query.filter_by(
            id_peserta_ujian=id_peserta,
            id_soal=id_soal
        ).first()
        
        # Ambil data dari penilaian
        penilaian = Penilaian.query.filter_by(
            id_peserta=id_peserta,
            id_soal=id_soal
        ).first()
        
        # Skip jika salah satu tidak ada
        if not ekstraksi or not penilaian:
            return
        
        # Ambil teks dan bersihkan whitespace dengan validasi ketat
        hasil_ekstraksi = (ekstraksi.teks or "").strip()
        koreksi_user = (penilaian.jawaban or "").strip()
        
        # VALIDASI KETAT: Pastikan kedua field tidak kosong dan minimal 2 karakter
        if not hasil_ekstraksi or len(hasil_ekstraksi) < 2:
            current_app.logger.info(f"Skip save koreksi: hasil_ekstraksi kosong atau terlalu pendek untuk peserta {id_peserta}, soal {id_soal}")
            return
            
        if not koreksi_user or len(koreksi_user) < 2:
            current_app.logger.info(f"Skip save koreksi: koreksi_user kosong atau terlalu pendek untuk peserta {id_peserta}, soal {id_soal}")
            return
        
        # VALIDASI: Pastikan tidak hanya berisi spasi atau karakter khusus
        if not re.search(r'[a-zA-Z0-9]', hasil_ekstraksi):
            current_app.logger.info(f"Skip save koreksi: hasil_ekstraksi tidak mengandung karakter valid untuk peserta {id_peserta}, soal {id_soal}")
            return
            
        if not re.search(r'[a-zA-Z0-9]', koreksi_user):
            current_app.logger.info(f"Skip save koreksi: koreksi_user tidak mengandung karakter valid untuk peserta {id_peserta}, soal {id_soal}")
            return
        
        # Simpan hanya jika berbeda dan kedua field valid
        if hasil_ekstraksi.lower() != koreksi_user.lower():
            # Buat direktori jika belum ada
            csv_dir = os.path.join('app', 'services', 'data')
            os.makedirs(csv_dir, exist_ok=True)
            
            csv_path = os.path.join(csv_dir, 'koreksi_mapping.csv')
            file_exists = os.path.exists(csv_path)
            
            # Cek duplikasi dengan validasi tambahan
            data_exists = False
            if file_exists:
                try:
                    with open(csv_path, 'r', encoding='utf-8') as file:
                        reader = csv.DictReader(file)
                        for row in reader:
                            # Validasi row yang dibaca juga
                            row_hasil = (row.get('hasil_ekstraksi', '') or '').strip()
                            row_koreksi = (row.get('koreksi_user', '') or '').strip()
                            
                            # Skip row yang kosong saat pengecekan duplikasi
                            if not row_hasil or not row_koreksi:
                                continue
                                
                            # Cek duplikasi dengan exact match
                            if (row_hasil.lower() == hasil_ekstraksi.lower() and 
                                row_koreksi.upper() == koreksi_user.upper()):
                                data_exists = True
                                break
                except Exception as e:
                    current_app.logger.warning(f"Error checking duplicate data: {e}")
            
            # Simpan hanya jika data valid dan belum ada
            if not data_exists:
                try:
                    with open(csv_path, 'a', newline='', encoding='utf-8') as file:
                        fieldnames = ['hasil_ekstraksi', 'koreksi_user']
                        writer = csv.DictWriter(file, fieldnames=fieldnames)
                        
                        # Tulis header jika file baru
                        if not file_exists:
                            writer.writeheader()
                        
                        # Final validation sebelum write
                        data_to_write = {
                            'hasil_ekstraksi': hasil_ekstraksi,
                            'koreksi_user': koreksi_user.upper()
                        }
                        
                        # Double check before writing
                        if (data_to_write['hasil_ekstraksi'] and 
                            len(data_to_write['hasil_ekstraksi']) >= 2 and
                            data_to_write['koreksi_user'] and 
                            len(data_to_write['koreksi_user']) >= 2):
                            
                            writer.writerow(data_to_write)
                            current_app.logger.info(f"Koreksi mapping saved: '{hasil_ekstraksi}' -> '{koreksi_user.upper()}'")
                        else:
                            current_app.logger.warning(f"Final validation failed, not saving: '{hasil_ekstraksi}' -> '{koreksi_user}'")
                        
                except Exception as e:
                    current_app.logger.error(f"Error saving koreksi mapping: {e}")
            else:
                current_app.logger.info(f"Koreksi mapping already exists, skipped: '{hasil_ekstraksi}' -> '{koreksi_user.upper()}'")
        else:
            current_app.logger.info(f"No difference found, skip save for peserta {id_peserta}, soal {id_soal}")
                
    except Exception as e:
        current_app.logger.error(f"Error in save_koreksi_mapping: {e}")

# BONUS: Function untuk membersihkan CSV dari data kosong
def cleanup_koreksi_mapping_csv():
    """
    Membersihkan koreksi_mapping.csv dari data yang kosong atau tidak valid
    """
    try:
        csv_path = os.path.join('app', 'services', 'data', 'koreksi_mapping.csv')
        
        if not os.path.exists(csv_path):
            current_app.logger.info("CSV file not found, nothing to cleanup")
            return 0
        
        # Backup original file
        backup_path = csv_path + '.backup'
        import shutil
        shutil.copy2(csv_path, backup_path)
        
        # Read and filter valid data
        valid_rows = []
        invalid_count = 0
        
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                hasil_ekstraksi = (row.get('hasil_ekstraksi', '') or '').strip()
                koreksi_user = (row.get('koreksi_user', '') or '').strip()
                
                # Validate row
                if (hasil_ekstraksi and len(hasil_ekstraksi) >= 2 and
                    koreksi_user and len(koreksi_user) >= 2 and
                    re.search(r'[a-zA-Z0-9]', hasil_ekstraksi) and
                    re.search(r'[a-zA-Z0-9]', koreksi_user)):
                    valid_rows.append({
                        'hasil_ekstraksi': hasil_ekstraksi,
                        'koreksi_user': koreksi_user.upper()
                    })
                else:
                    invalid_count += 1
                    current_app.logger.info(f"Removed invalid row: '{hasil_ekstraksi}' -> '{koreksi_user}'")
        
        # Write cleaned data back
        with open(csv_path, 'w', newline='', encoding='utf-8') as file:
            if valid_rows:
                fieldnames = ['hasil_ekstraksi', 'koreksi_user']
                writer = csv.DictWriter(file, fieldnames=fieldnames)
                writer.writeheader()
                
                # Remove duplicates while writing
                seen = set()
                unique_count = 0
                for row in valid_rows:
                    key = (row['hasil_ekstraksi'].lower(), row['koreksi_user'].upper())
                    if key not in seen:
                        writer.writerow(row)
                        seen.add(key)
                        unique_count += 1
                
                duplicate_count = len(valid_rows) - unique_count
                current_app.logger.info(f"CSV cleanup completed: {invalid_count} invalid rows removed, {duplicate_count} duplicates removed")
                return invalid_count + duplicate_count
            else:
                current_app.logger.info("No valid data found, CSV file emptied")
                return invalid_count
        
    except Exception as e:
        current_app.logger.error(f"Error cleaning up CSV: {e}")
        return 0
# Modifikasi pada fungsi process_automatic_grading_frontend

@penilaian_otomatis_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/penilaian-otomatis-frontend', methods=['POST'])
def process_automatic_grading_frontend(ujian_id: int, peserta_id: int):
    """
    Process automatic grading with answers data from frontend
    """
    try:
        # Verify JWT token
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        
        # Get request data
        data = request.get_json()
        if not data or 'answers' not in data:
            return jsonify({
                'error': 'Data jawaban tidak ditemukan'
            }), 400
        
        frontend_answers = data['answers']
        if not frontend_answers or len(frontend_answers) == 0:
            return jsonify({
                'error': 'Tidak ada data jawaban untuk dinilai'
            }), 400
        
        # Validate peserta_ujian exists
        peserta = PesertaUjian.query.filter_by(
            id=peserta_id,
            id_ujian=ujian_id
        ).first()
        
        if not peserta:
            return jsonify({
                'error': 'Peserta ujian tidak ditemukan'
            }), 404
        
        # Prepare data for grading
        grading_data = []
        
        for answer_data in frontend_answers:
            # Get jawaban siswa from frontend
            student_answer = answer_data.get('jawaban_siswa', '').strip()
            if not student_answer:
                continue
            
            # Get soal data from database
            if 'soal_id' in answer_data:
                # Use soal_id if available (from database source)
                soal = Soal.query.filter_by(
                    id=answer_data['soal_id'],
                    id_ujian=ujian_id
                ).first()
            else:
                # Use no_soal if soal_id not available (from default source)
                no_soal = answer_data.get('no_soal', 0)
                soal = Soal.query.filter_by(
                    no_soal=no_soal,
                    id_ujian=ujian_id
                ).first()
            
            if not soal:
                continue
                
            if not soal.kunci_jawaban or not soal.kunci_jawaban.strip():
                continue
            
            # PENYESUAIAN: Tambahkan field pertanyaan dari tabel soal
            grading_data.append({
                'student_answer': student_answer,
                'key_answer': soal.kunci_jawaban.strip(),
                'question': soal.pertanyaan.strip() if soal.pertanyaan else "",  # ✅ TAMBAHAN INI
                'student_id': peserta.id_siswa,
                'soal_id': soal.id,
                'peserta_ujian_id': peserta_id,
                'question_id': soal.no_soal
            })
        
        if not grading_data:
            return jsonify({
                'error': 'Tidak ada data valid untuk dinilai. Pastikan kunci jawaban sudah diisi untuk semua soal.'
            }), 400
        
        # Process grading using AI model dengan question context
        try:
            grading_results = grade_multiple_answers(grading_data)
        except Exception as e:
            logging.error(f"Error during AI grading: {e}")
            return jsonify({
                'error': f'Error saat proses penilaian AI: {str(e)}'
            }), 500
        
        # Save results to database
        saved_results = []
        total_score = 0
        
        try:
            for result in grading_results:
                if 'error' not in result:
                    # Check if penilaian already exists
                    existing_penilaian = Penilaian.query.filter_by(
                        id_peserta=peserta_id,
                        id_soal=result['soal_id']
                    ).first()
                    
                    if existing_penilaian:
                        # Update existing
                        existing_penilaian.jawaban = result['original_answer'].upper()  # KAPITAL
                        existing_penilaian.nilai = result['score']
                        saved_result = existing_penilaian
                    else:
                        # Create new
                        penilaian = Penilaian(
                            id_peserta=peserta_id,
                            id_soal=result['soal_id'],
                            jawaban=result['original_answer'].upper(),  # KAPITAL
                            nilai=result['score']
                        )
                        db.session.add(penilaian)
                        saved_result = penilaian
                    
                    # ✅ PENYESUAIAN: Tambahkan question_type dan scoring_config ke response
                    saved_results.append({
                        'soal_id': result['soal_id'],
                        'question_id': result['question_id'],
                        'score': result['score'],
                        'grade': result['grade'],
                        'level': result['level'],
                        'feedback': result['feedback'],
                        'similarity_score': result['final_similarity_score'],
                        'reasoning': result['reasoning'],
                        'component_scores': result['component_scores'],
                        'question_type': result.get('question_type', 'standar'),  # ✅ TAMBAHAN
                        'scoring_config': result.get('scoring_config', 'Scoring standar')  # ✅ TAMBAHAN
                    })
                    
                    total_score += result['score']
                else:
                    # Handle error case
                    saved_results.append({
                        'soal_id': result.get('soal_id'),
                        'question_id': result.get('question_id'),
                        'error': result['error'],
                        'score': 0,
                        'grade': 'E',
                        'question_type': 'error',
                        'scoring_config': 'Error occurred'
                    })
            
            # Update total score in peserta_ujian
            average_score = total_score / len([r for r in grading_results if 'error' not in r]) if grading_results else 0
            peserta.total_nilai = round(average_score, 2)
            peserta.status = 'selesai'
            
            # Commit all changes
            db.session.commit()
            
            # Process koreksi mapping
            for result in grading_results:
                if 'error' not in result:
                    save_koreksi_mapping(peserta_id, result['soal_id'])
            
            return jsonify({
                'message': 'Penilaian otomatis berhasil',
                'results': saved_results,
                'total_questions': len(grading_data),
                'processed_questions': len([r for r in grading_results if 'error' not in r]),
                'failed_questions': len([r for r in grading_results if 'error' in r]),
                'average_score': round(average_score, 2),
                'total_score': round(total_score, 2)
            }), 200
            
        except Exception as e:
            db.session.rollback()
            logging.error(f"Error saving grading results: {e}")
            return jsonify({
                'error': f'Error saat menyimpan hasil penilaian: {str(e)}'
            }), 500
            
    except Exception as e:
        logging.error(f"Error in frontend automatic grading: {e}")
        return jsonify({
            'error': f'Error saat proses penilaian otomatis: {str(e)}'
        }), 500
        
@penilaian_otomatis_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/hasil-penilaian', methods=['GET'])
def get_grading_results(ujian_id: int, peserta_id: int):
    """
    Get grading results for a specific participant with complete soal data
    """
    try:
        # Verify JWT token
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        
        # Validate peserta_ujian exists
        peserta = PesertaUjian.query.filter_by(
            id=peserta_id,
            id_ujian=ujian_id
        ).first()
        
        if not peserta:
            return jsonify({
                'error': 'Peserta ujian tidak ditemukan'
            }), 404
        
        # Get penilaian results with complete soal information
        results = db.session.query(Penilaian, Soal).join(
            Soal, Penilaian.id_soal == Soal.id
        ).filter(
            Penilaian.id_peserta == peserta_id,
            Soal.id_ujian == ujian_id
        ).order_by(Soal.no_soal).all()
        
        # Format results with complete data
        grading_results = []
        total_score = 0
        
        for penilaian, soal in results:
            grading_results.append({
                'question_number': soal.no_soal,
                'question_text': soal.pertanyaan,
                'key_answer': soal.kunci_jawaban,
                'student_answer': penilaian.jawaban,
                'score': penilaian.nilai,
                'grade': _score_to_grade(penilaian.nilai),
                'soal_id': soal.id,
                'penilaian_id': penilaian.id,
                'gambar': soal.gambar,
                'status_gambar': soal.status_gambar
            })
            total_score += penilaian.nilai if penilaian.nilai else 0
        
        average_score = total_score / len(results) if results else 0
        
        return jsonify({
            'results': grading_results,
            'summary': {
                'total_questions': len(results),
                'total_score': round(total_score, 2),
                'average_score': round(average_score, 2),
                'final_grade': _score_to_grade(average_score),
                'participant_id': peserta_id,
                'exam_id': ujian_id
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting grading results: {e}")
        return jsonify({
            'error': f'Error saat mengambil hasil penilaian: {str(e)}'
        }), 500

@penilaian_otomatis_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/update-penilaian', methods=['PUT'])
def update_grading_results(ujian_id: int, peserta_id: int):
    """
    Update grading results for a specific participant
    """
    try:
        # Verify JWT token
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        
        # Get request data
        data = request.get_json()
        if not data or 'scores' not in data:
            return jsonify({
                'error': 'Data scores tidak ditemukan'
            }), 400
        
        scores_data = data['scores']
        if not scores_data or len(scores_data) == 0:
            return jsonify({
                'error': 'Tidak ada data scores untuk diupdate'
            }), 400
        
        # Validate peserta_ujian exists
        peserta = PesertaUjian.query.filter_by(
            id=peserta_id,
            id_ujian=ujian_id
        ).first()
        
        if not peserta:
            return jsonify({
                'error': 'Peserta ujian tidak ditemukan'
            }), 404
        
        # Update penilaian records
        updated_count = 0
        total_score = 0
        
        for score_data in scores_data:
            penilaian_id = score_data.get('penilaian_id')
            new_score = score_data.get('score', 0)
            
            if not penilaian_id:
                continue
                
            # Find and update penilaian
            penilaian = Penilaian.query.filter_by(
                id=penilaian_id,
                id_peserta=peserta_id
            ).first()
            
            if penilaian:
                penilaian.nilai = new_score
                updated_count += 1
                total_score += new_score
        
        if updated_count == 0:
            return jsonify({
                'error': 'Tidak ada data penilaian yang berhasil diupdate'
            }), 400
        
        # Update total score in peserta_ujian
        average_score = total_score / updated_count if updated_count > 0 else 0
        peserta.total_nilai = round(average_score, 2)
        
        # Commit all changes
        db.session.commit()
        
        # Process koreksi mapping
        for score_data in scores_data:
            penilaian_id = score_data.get('penilaian_id')
            if penilaian_id:
                penilaian = Penilaian.query.get(penilaian_id)
                if penilaian:
                    save_koreksi_mapping(peserta_id, penilaian.id_soal)
        
        return jsonify({
            'message': 'Hasil penilaian berhasil diupdate',
            'updated_count': updated_count,
            'average_score': round(average_score, 2),
            'total_score': round(total_score, 2)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating grading results: {e}")
        return jsonify({
            'error': f'Error saat mengupdate hasil penilaian: {str(e)}'
        }), 500
        
@penilaian_otomatis_bp.route('/test-grader', methods=['POST'])
def test_grader():
    """
    Test endpoint for grading functionality dengan question context
    """
    try:
        data = request.get_json()
        
        if not data or 'student_answer' not in data or 'key_answer' not in data:
            return jsonify({
                'error': 'Data tidak lengkap. Perlu student_answer dan key_answer'
            }), 400
        
        student_answer = data['student_answer']
        key_answer = data['key_answer']
        question = data.get('question', '')  # ✅ TAMBAHAN: Optional question
        
        # Test grading dengan question context
        grader = get_grader()
        result = grader.grade_short_answer(
            student_answer, 
            [key_answer], 
            question=question  # ✅ TAMBAHAN: Pass question ke model
        )
        
        return jsonify({
            'test_result': result,
            'input_data': {
                'student_answer': student_answer,
                'key_answer': key_answer,
                'question': question
            },
            'status': 'success'
        }), 200
        
    except Exception as e:
        logging.error(f"Error testing grader: {e}")
        return jsonify({
            'error': f'Error saat test grader: {str(e)}'
        }), 500
        
def _score_to_grade(score: float) -> str:
    """Convert numerical score to letter grade"""
    if score >= 85:
        return 'A'
    elif score >= 70:
        return 'B'
    elif score >= 55:
        return 'C'
    elif score >= 40:
        return 'D'
    else:
        return 'E'

# PERBAIKAN ROUTE STATIC FILES - FOKUS KE app/images/output_1/
@penilaian_otomatis_bp.route('/images/output_1/<filename>')
def serve_crop_image(filename):
    """Serve gambar hasil crop dari app/images/output_1/"""
    try:
        # Path utama berdasarkan informasi user
        output_dir = os.path.join('app', 'images', 'output_1')
        
        # Log informasi untuk debugging
        current_app.logger.info(f"🔍 Mencari file crop: {filename}")
        current_app.logger.info(f"📁 Target directory: {output_dir}")
        current_app.logger.info(f"🏠 Flask app root path: {current_app.root_path}")
        current_app.logger.info(f"📂 Current working directory: {os.getcwd()}")
        
        # Cek apakah file exists di path utama
        full_path = os.path.join(output_dir, filename)
        current_app.logger.info(f"🎯 Checking primary path: {full_path}")
        
        if os.path.exists(full_path):
            current_app.logger.info(f"✅ File crop ditemukan di: {full_path}")
            return send_from_directory(output_dir, filename)
        
        # Jika tidak ada di path utama, coba absolute path
        abs_output_dir = os.path.abspath(output_dir)
        abs_full_path = os.path.join(abs_output_dir, filename)
        current_app.logger.info(f"🎯 Checking absolute path: {abs_full_path}")
        
        if os.path.exists(abs_full_path):
            current_app.logger.info(f"✅ File crop ditemukan di absolute path: {abs_full_path}")
            return send_from_directory(abs_output_dir, filename)
        
        # List isi direktori untuk debugging
        current_app.logger.warning(f"❌ File {filename} tidak ditemukan!")
        
        if os.path.exists(output_dir):
            try:
                files_in_dir = os.listdir(output_dir)
                current_app.logger.info(f"📋 Files di {output_dir}: {files_in_dir[:10]}...")  # Show first 10 files
                
                # Check if any similar files exist
                similar_files = [f for f in files_in_dir if filename.split('_')[0] in f]
                if similar_files:
                    current_app.logger.info(f"🔍 Similar files found: {similar_files}")
                    
            except Exception as e:
                current_app.logger.error(f"Error listing directory {output_dir}: {e}")
        else:
            current_app.logger.error(f"❌ Directory tidak exist: {output_dir}")
        
        # Return 404 dengan informasi berguna
        return jsonify({
            'error': f'File crop {filename} tidak ditemukan',
            'directory': output_dir,
            'full_path': full_path,
            'directory_exists': os.path.exists(output_dir),
            'suggestion': 'Pastikan ekstraksi YOLO telah dijalankan dan file crop tersimpan di app/images/output_1/'
        }), 404
        
    except Exception as e:
        current_app.logger.error(f"❌ Error serving crop image {filename}: {e}")
        return jsonify({'error': f'Error serving crop file: {str(e)}'}), 500

@penilaian_otomatis_bp.route('/images/jawaban/<filename>')
def serve_jawaban_image(filename):
    """Serve gambar original dari app/images/jawaban/"""
    try:
        # Path utama berdasarkan struktur yang sama
        jawaban_dir = os.path.join('app', 'images', 'jawaban')
        
        # Log informasi untuk debugging
        current_app.logger.info(f"🔍 Mencari file jawaban: {filename}")
        current_app.logger.info(f"📁 Target directory: {jawaban_dir}")
        
        # Cek apakah file exists di path utama
        full_path = os.path.join(jawaban_dir, filename)
        current_app.logger.info(f"🎯 Checking path: {full_path}")
        
        if os.path.exists(full_path):
            current_app.logger.info(f"✅ File jawaban ditemukan di: {full_path}")
            return send_from_directory(jawaban_dir, filename)
        
        # Jika tidak ada, coba absolute path
        abs_jawaban_dir = os.path.abspath(jawaban_dir)
        abs_full_path = os.path.join(abs_jawaban_dir, filename)
        current_app.logger.info(f"🎯 Checking absolute path: {abs_full_path}")
        
        if os.path.exists(abs_full_path):
            current_app.logger.info(f"✅ File jawaban ditemukan di absolute path: {abs_full_path}")
            return send_from_directory(abs_jawaban_dir, filename)
        
        # Return 404 dengan informasi berguna
        return jsonify({
            'error': f'File jawaban {filename} tidak ditemukan',
            'directory': jawaban_dir,
            'full_path': full_path,
            'directory_exists': os.path.exists(jawaban_dir),
            'suggestion': 'Pastikan file jawaban telah diupload ke app/images/jawaban/'
        }), 404
        
    except Exception as e:
        current_app.logger.error(f"❌ Error serving jawaban image {filename}: {e}")
        return jsonify({'error': f'Error serving jawaban file: {str(e)}'}), 500

# Route untuk debug path - FOKUS KE app/images/
@penilaian_otomatis_bp.route('/debug/paths')
def debug_paths():
    """Debug endpoint untuk memeriksa path dan file di app/images/"""
    try:
        paths_info = {
            'flask_root_path': current_app.root_path,
            'current_working_directory': os.getcwd(),
            'target_directories': {}
        }
        
        # Check direktori utama berdasarkan konfirmasi user
        target_paths = {
            'output_1': os.path.join('app', 'images', 'output_1'),
            'jawaban': os.path.join('app', 'images', 'jawaban'),
            'app_images_base': os.path.join('app', 'images')
        }
        
        for folder_name, path in target_paths.items():
            path_info = {
                'path': path,
                'absolute_path': os.path.abspath(path),
                'exists': os.path.exists(path),
                'files': [],
                'file_count': 0
            }
            
            if os.path.exists(path):
                try:
                    all_files = os.listdir(path)
                    path_info['file_count'] = len(all_files)
                    path_info['files'] = all_files[:20]  # Max 20 files untuk preview
                    
                    # Khusus untuk output_1, check pattern peserta_*_ujian_*_soal_*.jpg
                    if folder_name == 'output_1':
                        crop_files = [f for f in all_files if f.startswith('peserta_') and f.endswith('.jpg')]
                        path_info['crop_files'] = crop_files[:10]
                        path_info['crop_count'] = len(crop_files)
                        
                except Exception as e:
                    path_info['error'] = str(e)
            
            paths_info['target_directories'][folder_name] = path_info
        
        # Check parent directories juga
        app_dir = 'app'
        if os.path.exists(app_dir):
            paths_info['app_directory'] = {
                'exists': True,
                'contents': os.listdir(app_dir)[:10]
            }
        
        return jsonify(paths_info), 200
        
    except Exception as e:
        return jsonify({'error': f'Error debugging paths: {str(e)}'}), 500

# Error handlers
@penilaian_otomatis_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint tidak ditemukan'}), 404

@penilaian_otomatis_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# Create Blueprint untuk image serving
image_serving_bp = Blueprint('image_serving', __name__)

@image_serving_bp.route('/images/output_1/<filename>')
def serve_crop_image(filename):
    """Serve gambar crop dari app/images/output_1/"""
    try:
        # Path absolut ke direktori output_1
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Parent directory dari app/
        output_dir = os.path.join(base_dir, 'app', 'images', 'output_1')
        
        # Log untuk debugging
        current_app.logger.info(f"🔍 Serving crop image: {filename}")
        current_app.logger.info(f"📂 Base directory: {base_dir}")
        current_app.logger.info(f"📁 Output directory: {output_dir}")
        current_app.logger.info(f"🎯 Full file path: {os.path.join(output_dir, filename)}")
        
        # Check apakah direktori ada
        if not os.path.exists(output_dir):
            current_app.logger.error(f"❌ Directory tidak ada: {output_dir}")
            return jsonify({
                'error': f'Directory tidak ditemukan: {output_dir}',
                'suggestion': 'Pastikan direktori app/images/output_1/ sudah dibuat'
            }), 404
        
        # Check apakah file ada
        file_path = os.path.join(output_dir, filename)
        if not os.path.exists(file_path):
            current_app.logger.error(f"❌ File tidak ditemukan: {file_path}")
            
            # List files yang ada untuk debugging
            try:
                available_files = os.listdir(output_dir)
                current_app.logger.info(f"📋 Files tersedia: {available_files[:10]}")
            except Exception as e:
                current_app.logger.error(f"Error listing files: {e}")
            
            return jsonify({
                'error': f'File tidak ditemukan: {filename}',
                'directory': output_dir,
                'suggestion': 'Pastikan ekstraksi YOLO sudah dijalankan dan file crop tersimpan'
            }), 404
        
        # Serve file dengan mimetype yang benar
        current_app.logger.info(f"✅ Serving file: {file_path}")
        return send_from_directory(
            output_dir, 
            filename,
            mimetype='image/jpeg'  # Atau bisa auto-detect
        )
        
    except Exception as e:
        current_app.logger.error(f"❌ Error serving crop image {filename}: {str(e)}")
        return jsonify({
            'error': f'Server error: {str(e)}'
        }), 500

@image_serving_bp.route('/images/jawaban/<filename>')
def serve_jawaban_image(filename):
    """Serve gambar jawaban original dari app/images/jawaban/"""
    try:
        # Path absolut ke direktori jawaban
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        jawaban_dir = os.path.join(base_dir, 'app', 'images', 'jawaban')
        
        current_app.logger.info(f"🔍 Serving jawaban image: {filename}")
        current_app.logger.info(f"📁 Jawaban directory: {jawaban_dir}")
        
        # Check direktori
        if not os.path.exists(jawaban_dir):
            current_app.logger.error(f"❌ Directory tidak ada: {jawaban_dir}")
            return jsonify({
                'error': f'Directory tidak ditemukan: {jawaban_dir}'
            }), 404
        
        # Check file
        file_path = os.path.join(jawaban_dir, filename)
        if not os.path.exists(file_path):
            current_app.logger.error(f"❌ File tidak ditemukan: {file_path}")
            return jsonify({
                'error': f'File tidak ditemukan: {filename}'
            }), 404
        
        # Serve file
        current_app.logger.info(f"✅ Serving jawaban file: {file_path}")
        return send_from_directory(
            jawaban_dir, 
            filename,
            mimetype='image/jpeg'
        )
        
    except Exception as e:
        current_app.logger.error(f"❌ Error serving jawaban image {filename}: {str(e)}")
        return jsonify({
            'error': f'Server error: {str(e)}'
        }), 500

@image_serving_bp.route('/debug/image-paths')
def debug_image_paths():
    """Debug endpoint untuk check struktur direktori"""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        debug_info = {
            'base_directory': base_dir,
            'current_working_directory': os.getcwd(),
            'app_directory': os.path.join(base_dir, 'app'),
            'images_base': os.path.join(base_dir, 'app', 'images'),
            'directories': {}
        }
        
        # Check direktori-direktori penting
        dirs_to_check = {
            'output_1': os.path.join(base_dir, 'app', 'images', 'output_1'),
            'jawaban': os.path.join(base_dir, 'app', 'images', 'jawaban')
        }
        
        for name, path in dirs_to_check.items():
            dir_info = {
                'path': path,
                'exists': os.path.exists(path),
                'files': [],
                'file_count': 0
            }
            
            if os.path.exists(path):
                try:
                    files = os.listdir(path)
                    dir_info['file_count'] = len(files)
                    dir_info['files'] = files[:15]  # First 15 files
                    
                    # Untuk output_1, check pattern file crop
                    if name == 'output_1':
                        crop_files = [f for f in files if 'peserta_' in f and f.endswith(('.jpg', '.jpeg', '.png'))]
                        dir_info['crop_files'] = crop_files[:10]
                        dir_info['crop_count'] = len(crop_files)
                        
                except Exception as e:
                    dir_info['error'] = str(e)
            
            debug_info['directories'][name] = dir_info
        
        return jsonify(debug_info), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Debug error: {str(e)}'
        }), 500

# Route untuk test image
@image_serving_bp.route('/test-image/<filename>')
def test_image_access(filename):
    """Test apakah file bisa diakses"""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(base_dir, 'app', 'images', 'output_1')
        file_path = os.path.join(output_dir, filename)
        
        result = {
            'filename': filename,
            'output_dir': output_dir,
            'file_path': file_path,
            'directory_exists': os.path.exists(output_dir),
            'file_exists': os.path.exists(file_path),
            'file_size': None,
            'file_permissions': None
        }
        
        if os.path.exists(file_path):
            result['file_size'] = os.path.getsize(file_path)
            result['file_permissions'] = oct(os.stat(file_path).st_mode)[-3:]
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500