from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.ekstraksi_teks import EkstraksiTeks
from app.models.soal import Soal
from app.models.peserta_ujian import PesertaUjian
from app.models.ujian import Ujian
from app.services.model_yolo1 import ModelYolo1
from app.services.model_yolo2 import ModelYolo2
from app.services.model_crnn import ModelCRNN
import os
from flask import send_from_directory, abort

# Blueprint untuk ekstraksi
ekstraksi_bp = Blueprint('ekstraksi', __name__)

@ekstraksi_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/init-ekstraksi', methods=['POST'])
@jwt_required()
def initialize_ekstraksi_teks(ujian_id, peserta_id):
    """
    Initialize ekstraksi_teks entries for all questions in ujian
    Creates 5 entries with null values for output_1, output_2, and teks
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Validate ujian exists and belongs to current user
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=current_user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan'}), 404
        
        # Validate peserta exists
        peserta = PesertaUjian.query.filter_by(id=peserta_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta ujian tidak ditemukan'}), 404
        
        # Get all questions for this ujian
        soal_list = Soal.query.filter_by(id_ujian=ujian_id).order_by(Soal.no_soal).all()
        
        if not soal_list:
            return jsonify({'error': 'Tidak ada soal ditemukan untuk ujian ini'}), 400
        
        # Check if ekstraksi already exists for this peserta
        existing_ekstraksi = EkstraksiTeks.query.filter_by(id_peserta_ujian=peserta_id).first()
        if existing_ekstraksi:
            # Delete existing entries first to avoid duplicates
            EkstraksiTeks.query.filter_by(id_peserta_ujian=peserta_id).delete()
            db.session.commit()
        
        # Initialize ekstraksi_teks entries for each question
        ekstraksi_entries = []
        
        for soal in soal_list:
            # Create new ekstraksi_teks entry
            ekstraksi = EkstraksiTeks(
                id_soal=soal.id,
                id_peserta_ujian=peserta_id,
                output_1=None,  # Will be filled by YOLO model 1
                output_2=None,  # Will be filled by YOLO model 2
                teks=None       # Will be filled by actual ML model later
            )
            
            db.session.add(ekstraksi)
            ekstraksi_entries.append({
                'id_soal': soal.id,
                'no_soal': soal.no_soal,
                'pertanyaan': soal.pertanyaan
            })
        
        # Commit all entries
        db.session.commit()
        
        return jsonify({
            'message': f'Berhasil menginisialisasi {len(soal_list)} entry ekstraksi',
            'ekstraksi_count': len(soal_list),
            'entries': ekstraksi_entries
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error initializing ekstraksi: {str(e)}")
        return jsonify({'error': f'Terjadi kesalahan saat menginisialisasi ekstraksi: {str(e)}'}), 500

@ekstraksi_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/ekstraksi', methods=['GET'])
@jwt_required()
def get_ekstraksi_results(ujian_id, peserta_id):
    """
    Get ekstraksi results for a peserta
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Validate ujian exists and belongs to current user
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=current_user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan'}), 404
        
        # Validate peserta exists
        peserta = PesertaUjian.query.filter_by(id=peserta_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta ujian tidak ditemukan'}), 404
        
        # Get all ekstraksi results for this peserta
        ekstraksi_results = db.session.query(
            EkstraksiTeks, Soal
        ).join(
            Soal, EkstraksiTeks.id_soal == Soal.id
        ).filter(
            EkstraksiTeks.id_peserta_ujian == peserta_id
        ).order_by(Soal.no_soal, EkstraksiTeks.id).all()
        
        results = []
        for ekstraksi, soal in ekstraksi_results:
            results.append({
                'id': ekstraksi.id,
                'id_soal': soal.id,
                'no_soal': soal.no_soal,
                'pertanyaan': soal.pertanyaan,
                'kunci_jawaban': soal.kunci_jawaban,
                'output_1': ekstraksi.output_1,
                'output_2': ekstraksi.output_2,
                'teks': ekstraksi.teks
            })
        
        return jsonify({
            'results': results,
            'total_count': len(results)
        }), 200
        
    except Exception as e:
        print(f"Error getting ekstraksi results: {str(e)}")
        return jsonify({'error': f'Terjadi kesalahan saat mengambil hasil ekstraksi: {str(e)}'}), 500

@ekstraksi_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/ekstraksi', methods=['POST'])
@jwt_required()
def extract_answers(ujian_id, peserta_id):
    """
    Extract answers from uploaded image using YOLO model 1 (crop area soal)
    1. Simpan gambar original ke app/static/jawaban/
    2. Update tabel peserta_ujian field foto_jawaban
    3. Crop gambar menggunakan YOLO model 1
    4. Update tabel ekstraksi_teks field output_1 dengan hasil crop
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Validate ujian exists and belongs to current user
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=current_user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan'}), 404
        
        # Validate peserta exists
        peserta = PesertaUjian.query.filter_by(id=peserta_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta ujian tidak ditemukan'}), 404
        
        # Check if image file is provided
        if 'image' not in request.files:
            return jsonify({'error': 'Tidak ada file gambar yang diupload'}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'error': 'Tidak ada file yang dipilih'}), 400
        
        # Get existing ekstraksi entries
        ekstraksi_entries = EkstraksiTeks.query.filter_by(id_peserta_ujian=peserta_id).all()
        
        if not ekstraksi_entries:
            return jsonify({'error': 'Ekstraksi belum diinisialisasi. Jalankan init-ekstraksi terlebih dahulu'}), 400
        
        # Initialize YOLO model 1 service
        model_yolo1 = ModelYolo1()
        
        # Step 1: Simpan gambar original ke folder jawaban
        try:
            original_filename = model_yolo1.save_original_image(image_file, peserta_id, ujian_id)
        except Exception as e:
            return jsonify({'error': f'Gagal menyimpan gambar: {str(e)}'}), 500
        
        # Step 2: Update tabel peserta_ujian dengan nama file foto_jawaban
        peserta.foto_jawaban = original_filename
        db.session.commit()
        
        # Step 3: Deteksi dan crop gambar menggunakan YOLO model 1
        try:
            cropped_files = model_yolo1.detect_and_crop_answers(peserta_id, ujian_id)
        except Exception as e:
            return jsonify({'error': f'Gagal melakukan deteksi dan crop: {str(e)}'}), 500
        
        if not cropped_files:
            return jsonify({'error': 'Tidak ada area soal yang terdeteksi pada gambar'}), 400
        
        # Step 4: Update ekstraksi_teks entries dengan hasil crop tahap 1
        updated_count = 0
        
        for ekstraksi in ekstraksi_entries:
            # Get nomor soal from related Soal model
            soal = Soal.query.get(ekstraksi.id_soal)
            if soal and soal.no_soal in cropped_files:
                ekstraksi.output_1 = cropped_files[soal.no_soal]
                updated_count += 1
        
        # Commit changes to database
        db.session.commit()
        
        return jsonify({
            'message': f'Berhasil menyimpan gambar dan mengekstraksi {updated_count} area soal',
            'original_image': original_filename,
            'extracted_count': updated_count,
            'detected_areas': list(cropped_files.keys())
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error extracting answers: {str(e)}")
        return jsonify({'error': f'Terjadi kesalahan saat mengekstraksi jawaban: {str(e)}'}), 500

@ekstraksi_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/ekstraksi-teks', methods=['POST'])
@jwt_required()
def extract_text_from_answers(ujian_id, peserta_id):
    """
    Extract text from handwriting answer images using CRNN model
    1. Ambil semua gambar hasil crop tahap 2 (output_2) untuk peserta ini
    2. Ekstraksi teks menggunakan CRNN model
    3. Update field teks di tabel ekstraksi_teks
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Validate ujian exists and belongs to current user
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=current_user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan'}), 404
        
        # Validate peserta exists
        peserta = PesertaUjian.query.filter_by(id=peserta_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta ujian tidak ditemukan'}), 404
        
        # Get ekstraksi entries yang sudah memiliki output_2
        ekstraksi_with_output2 = EkstraksiTeks.query.filter_by(
            id_peserta_ujian=peserta_id
        ).filter(
            EkstraksiTeks.output_2.isnot(None)
        ).all()
        
        if not ekstraksi_with_output2:
            return jsonify({'error': 'Tidak ada hasil crop tahap 2 yang ditemukan. Jalankan ekstraksi tahap 2 terlebih dahulu'}), 400
        
        # Initialize CRNN model service
        model_crnn = ModelCRNN()
        
        # Step 1: Extract text dari semua gambar output_2
        try:
            text_results = model_crnn.extract_text_from_images(peserta_id, ujian_id)
        except Exception as e:
            return jsonify({'error': f'Gagal melakukan ekstraksi teks: {str(e)}'}), 500
        
        if not text_results:
            return jsonify({'error': 'Tidak ada teks yang berhasil diekstraksi dari gambar'}), 400
        
        # Step 2: Update database dengan hasil ekstraksi teks
        updated_count = 0
        processed_files = []
        
        for ekstraksi in ekstraksi_with_output2:
            if ekstraksi.output_2 in text_results:
                predicted_text = text_results[ekstraksi.output_2]
                
                # Clean up the predicted text
                cleaned_text = model_crnn.cleanup_predictions(predicted_text)
                
                # Update the ekstraksi entry
                ekstraksi.teks = cleaned_text
                updated_count += 1
                
                # Get image info for response
                try:
                    img_info = model_crnn.get_image_info(ekstraksi.output_2)
                    processed_files.append({
                        'filename': ekstraksi.output_2,
                        'soal_number': img_info['soal_number'],
                        'jawaban_index': img_info['jawaban_index'],
                        'predicted_text': cleaned_text,
                        'text_length': len(cleaned_text)
                    })
                except:
                    processed_files.append({
                        'filename': ekstraksi.output_2,
                        'predicted_text': cleaned_text,
                        'text_length': len(cleaned_text)
                    })
        
        # Commit changes to database
        db.session.commit()
        
        return jsonify({
            'message': f'Berhasil mengekstraksi teks dari {updated_count} gambar jawaban',
            'updated_count': updated_count,
            'total_images_processed': len(text_results),
            'processed_files': processed_files,
            'model_info': model_crnn.get_model_info()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error extracting text from answers: {str(e)}")
        return jsonify({'error': f'Terjadi kesalahan saat mengekstraksi teks: {str(e)}'}), 500

@ekstraksi_bp.route('/ujian/<int:ujian_id>/peserta/<int:peserta_id>/ekstraksi-jawaban', methods=['POST'])
@jwt_required()
def extract_handwriting_answers(ujian_id, peserta_id):
    """
    Extract handwriting answers from cropped question areas using YOLO model 2
    1. Ambil semua ekstraksi yang sudah memiliki output_1 (hasil crop tahap 1)
    2. Crop area jawaban/tulisan tangan menggunakan YOLO model 2
    3. Hanya simpan 1 area jawaban pertama yang terdeteksi per soal
    4. Update field output_2 dengan hasil crop tahap 2 (bisa null jika tidak terdeteksi)
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Validate ujian exists and belongs to current user
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=current_user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian tidak ditemukan'}), 404
        
        # Validate peserta exists
        peserta = PesertaUjian.query.filter_by(id=peserta_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta ujian tidak ditemukan'}), 404
        
        # Get ekstraksi entries yang sudah memiliki output_1
        ekstraksi_with_output1 = db.session.query(
            EkstraksiTeks, Soal
        ).join(
            Soal, EkstraksiTeks.id_soal == Soal.id
        ).filter(
            EkstraksiTeks.id_peserta_ujian == peserta_id,
            EkstraksiTeks.output_1.isnot(None)
        ).all()
        
        if not ekstraksi_with_output1:
            return jsonify({'error': 'Tidak ada hasil crop tahap 1 yang ditemukan. Jalankan ekstraksi tahap 1 terlebih dahulu'}), 400
        
        # Initialize YOLO model 2 service
        model_yolo2 = ModelYolo2()
        
        # Hapus entry ekstraksi lama yang memiliki output_2 untuk peserta ini
        # (untuk avoid duplikasi jika di-run ulang)
        existing_output2 = EkstraksiTeks.query.filter_by(
            id_peserta_ujian=peserta_id
        ).filter(
            EkstraksiTeks.output_2.isnot(None)
        ).all()
        
        for ekstraksi in existing_output2:
            db.session.delete(ekstraksi)
        
        db.session.commit()
        
        # Prepare data untuk batch processing
        soal_numbers = []
        ekstraksi_map = {}  # {no_soal: ekstraksi_object}
        
        for ekstraksi, soal in ekstraksi_with_output1:
            soal_numbers.append(soal.no_soal)
            ekstraksi_map[soal.no_soal] = {
                'ekstraksi': ekstraksi,
                'soal': soal
            }
        
        # Step 1: Deteksi dan crop area jawaban untuk semua soal
        try:
            all_cropped_answers = model_yolo2.detect_and_crop_all_answers(peserta_id, ujian_id, soal_numbers)
        except Exception as e:
            return jsonify({'error': f'Gagal melakukan deteksi dan crop area jawaban: {str(e)}'}), 500
        
        # Step 2: Update database dengan logika baru (1 jawaban per soal, null jika tidak terdeteksi)
        total_detected_answers = 0
        processed_soal = []
        
        for soal_number, answer_files in all_cropped_answers.items():
            if soal_number not in ekstraksi_map:
                continue
                
            ekstraksi_data = ekstraksi_map[soal_number]
            original_ekstraksi = ekstraksi_data['ekstraksi']
            soal = ekstraksi_data['soal']
            
            # Cek apakah ada jawaban yang terdeteksi
            if answer_files and len(answer_files) > 0:
                # Ambil hanya jawaban pertama yang terdeteksi
                original_ekstraksi.output_2 = answer_files[0]
                total_detected_answers += 1
                detected = True
            else:
                # Tidak ada jawaban terdeteksi, set ke null
                original_ekstraksi.output_2 = None
                detected = False
            
            processed_soal.append({
                'no_soal': soal_number,
                'detected': detected,
                'answer_file': answer_files[0] if detected else None,
                'total_detections': len(answer_files) if answer_files else 0
            })
        
        # Handle soal yang tidak ada di hasil deteksi (set output_2 ke null)
        for soal_number in soal_numbers:
            if soal_number not in all_cropped_answers:
                if soal_number in ekstraksi_map:
                    ekstraksi_data = ekstraksi_map[soal_number]
                    original_ekstraksi = ekstraksi_data['ekstraksi']
                    original_ekstraksi.output_2 = None
                    
                    processed_soal.append({
                        'no_soal': soal_number,
                        'detected': False,
                        'answer_file': None,
                        'total_detections': 0
                    })
        
        # Commit changes to database
        db.session.commit()
        
        return jsonify({
            'message': f'Berhasil memproses ekstraksi area jawaban untuk {len(processed_soal)} soal. {total_detected_answers} soal berhasil terdeteksi',
            'total_soal_processed': len(processed_soal),
            'total_detected_answers': total_detected_answers,
            'total_undetected_answers': len(processed_soal) - total_detected_answers,
            'processed_soal': processed_soal
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error extracting handwriting answers: {str(e)}")
        return jsonify({'error': f'Terjadi kesalahan saat mengekstraksi area jawaban: {str(e)}'}), 500

@ekstraksi_bp.route('/images/output_1/<filename>')
def serve_crop_image(filename):
    """Serve gambar hasil crop tahap 1 (area soal)"""
    output_dir = os.path.join('app', 'static', 'output_1')
    return send_from_directory(output_dir, filename)

@ekstraksi_bp.route('/images/output_2/<filename>')
def serve_answer_crop_image(filename):
    """Serve gambar hasil crop tahap 2 (area jawaban)"""
    output_dir = os.path.join('app', 'static', 'output_2')
    return send_from_directory(output_dir, filename)

@ekstraksi_bp.route('/images/jawaban/<filename>')
def serve_jawaban_image(filename):
    """Serve gambar original"""
    jawaban_dir = os.path.join('app', 'static', 'jawaban')
    return send_from_directory(jawaban_dir, filename)