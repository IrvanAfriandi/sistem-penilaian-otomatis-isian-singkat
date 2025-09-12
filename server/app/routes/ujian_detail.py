from flask import Blueprint, request, jsonify, current_app, send_file, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.ujian import Ujian
from app.models.soal import Soal
from app.models.peserta_ujian import PesertaUjian
from app.models.siswa import Siswa
from app.models.kelas import Kelas
from app.models.mata_pelajaran import MataPelajaran
from sqlalchemy import text
import os
import uuid
from werkzeug.utils import secure_filename
from PIL import Image
import io

# PDF generation imports
from reportlab.lib.pagesizes import A4 # type: ignore
from reportlab.lib.units import cm, mm # type: ignore
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle # type: ignore
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle # type: ignore
from reportlab.lib.enums import TA_CENTER, TA_LEFT # type: ignore
from reportlab.lib import colors # type: ignore
from io import BytesIO

ujian_detail_bp = Blueprint('ujian_detail', __name__)

# Configuration for file uploads
UPLOAD_FOLDER = 'uploads/question_images'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def ensure_upload_folder():
    """Ensure upload folder exists"""
    upload_path = os.path.join(current_app.root_path, UPLOAD_FOLDER)
    os.makedirs(upload_path, exist_ok=True)
    current_app.logger.info(f"Upload folder ensured at: {upload_path}")
    return upload_path

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(original_filename=None):
    """Generate unique filename preserving original extension"""
    unique_id = str(uuid.uuid4()).replace('-', '')[:12]
    
    if original_filename:
        _, ext = os.path.splitext(original_filename.lower())
        if ext in ['.jpg', '.jpeg']:
            return f"IMG-{unique_id}.jpg"
        elif ext == '.png':
            return f"IMG-{unique_id}.png"
        elif ext == '.gif':
            return f"IMG-{unique_id}.gif"
    
    return f"IMG-{unique_id}.jpg"

def process_image(image_file, preserve_format=False):
    """Process uploaded image with option to preserve format"""
    try:
        image = Image.open(image_file)
        original_format = image.format
        
        current_app.logger.info(f"Original image format: {original_format}")
        current_app.logger.info(f"Original image mode: {image.mode}")
        current_app.logger.info(f"Original image size: {image.size}")
        
        max_size = 1200
        if image.width > max_size or image.height > max_size:
            original_size = image.size
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            current_app.logger.info(f"Resized from {original_size} to {image.size}")
        
        if preserve_format and original_format == 'PNG':
            current_app.logger.info("Preserving PNG format with transparency")
            return image, 'PNG'
        else:
            if image.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'RGBA':
                    background.paste(image, mask=image.split()[-1])
                else:
                    background.paste(image, mask=image.split()[-1])
                image = background
                current_app.logger.info("Converted RGBA/LA to RGB with white background")
            elif image.mode == 'P':
                if 'transparency' in image.info:
                    image = image.convert('RGBA')
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    background.paste(image, mask=image.split()[-1])
                    image = background
                    current_app.logger.info("Converted palette with transparency to RGB")
                else:
                    image = image.convert('RGB')
                    current_app.logger.info("Converted palette to RGB")
            elif image.mode != 'RGB':
                image = image.convert('RGB')
                current_app.logger.info(f"Converted {image.mode} to RGB")
            
            return image, 'JPEG'
    
    except Exception as e:
        current_app.logger.error(f"Error processing image: {str(e)}")
        return None, None

@ujian_detail_bp.route('/<int:ujian_id>/detail', methods=['GET'])
@jwt_required()
def get_ujian_detail(ujian_id):
    """Get detailed ujian information with questions and participants"""
    try:
        user_id = get_jwt_identity()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        detail_data = ujian.to_dict_detailed()
        
        return jsonify(detail_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting ujian detail: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ujian_detail_bp.route('/<int:ujian_id>/export-pdf', methods=['GET'])
@jwt_required()
def export_lembar_soal_pdf(ujian_id):
    try:
        user_id = get_jwt_identity()
        current_app.logger.info(f"Starting PDF export for ujian {ujian_id}")
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            current_app.logger.error(f"Ujian {ujian_id} not found for user {user_id}")
            return jsonify({'error': 'Ujian not found'}), 404
        
        soal_list = Soal.query.filter_by(id_ujian=ujian_id).order_by(Soal.id).all()
        current_app.logger.info(f"Found {len(soal_list)} soal for ujian {ujian_id}")
        
        if not soal_list:
            return jsonify({'error': 'Tidak ada soal untuk diekspor'}), 400
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1*cm,
            leftMargin=1*cm,
            topMargin=0.5*cm,
            bottomMargin=0.5*cm
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=13,
            spaceAfter=2*mm,
            spaceBefore=2*mm,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        header_info_style = ParagraphStyle(
            'HeaderInfo',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leading=12
        )
        
        instruction_style = ParagraphStyle(
            'InstructionStyle',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=3*mm,
            spaceBefore=1*mm,
            alignment=TA_LEFT,
            fontName='Helvetica'
        )
        
        question_style = ParagraphStyle(
            'QuestionStyle',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=1*mm,
            spaceBefore=2*mm,
            fontName='Helvetica',
            leading=12
        )
        
        answer_style = ParagraphStyle(
            'AnswerStyle',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=3*mm,
            fontName='Helvetica'
        )
        
        logo_path = os.path.join(current_app.root_path, 'assets', 'logo-sd.jpeg')
        
        logo_element = None
        try:
            if os.path.exists(logo_path):
                logo_img = RLImage(logo_path)
                logo_img.drawHeight = 4.5*cm
                logo_img.drawWidth = 4.5*cm
                logo_element = logo_img
                current_app.logger.info(f"Logo loaded successfully from: {logo_path}")
            else:
                current_app.logger.error(f"Logo not found at: {logo_path}")
                raise FileNotFoundError("Logo file not found")
        except Exception as e:
            current_app.logger.warning(f"Error loading logo from {logo_path}: {e}")
            logo_placeholder = ""
            logo_element = Paragraph(logo_placeholder, header_info_style)
            current_app.logger.warning("Using placeholder logo")
        
        def safe_str(value, default='..................................................................'):
            return str(value) if value else default

        info_data = [
            ['Nama', ':', safe_str(None)],
            ['No', ':', safe_str(None)],
            ['Kelas', ':', safe_str(getattr(ujian.kelas, 'nama_kelas', None))],
            ['Mata Pelajaran', ':', safe_str(getattr(ujian.mata_pelajaran, 'nama_mapel', ujian.nama_ujian))]
        ]
        
        info_table = Table(info_data, colWidths=[3*cm, 0.5*cm, 8.5*cm])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (2, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('LEFTPADDING', (0, 0), (-1, -1), 28),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 20),
            ('BOTTOMPADDING', (0, 3), (-1, 3), 20),
            ('LINEWIDTH', (0, 0), (-1, -1), 1.2),
            ('BOX', (0, 0), (-1, -1), 1.2, colors.black),
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ]))
        
        header_data = [
            [logo_element, '', info_table]
        ]
        
        header_table = Table(header_data, colWidths=[4*cm, 1*cm, 12*cm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('ALIGN', (2, 0), (2, 0), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 13),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        
        story.append(header_table)
        story.append(Spacer(1, 6*mm))
        
        line_data = [['_' * 120]]
        line_table = Table(line_data, colWidths=[17*cm])
        line_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ]))
        story.append(line_table)
        story.append(Spacer(1, 3*mm))
        
        story.append(Paragraph(" Soal Isian Singkat", title_style))
        
        for index, soal in enumerate(soal_list[:5], 1):
            current_app.logger.info(f"Processing soal {index}: {soal.pertanyaan[:50]}...")
            
            question_text = soal.pertanyaan.strip() if soal.pertanyaan else ""
            question_para = Paragraph(question_text, question_style)
            
            has_valid_image = False
            image_element = None
            
            if soal.gambar and soal.status_gambar == 'on':
                try:
                    image_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, soal.gambar)
                    if os.path.exists(image_path):
                        img = RLImage(image_path)
                        img.drawHeight = 3.25*cm
                        img.drawWidth = 4.25*cm
                        img.hAlign = 'LEFT'
                        image_element = img
                        has_valid_image = True
                        current_app.logger.info(f"Added image for soal {index}")
                except Exception as e:
                    current_app.logger.error(f"Error loading image {soal.gambar}: {e}")
            
            if has_valid_image:
                answer_text = "Jawaban : " + "." * 93
                answer_para = Paragraph(answer_text, answer_style)
                
                content_data = [
                    [f"{index}.", image_element, question_para],
                    ['', '', answer_para]
                ]
                content_table = Table(content_data, colWidths=[1*cm, 4.5*cm, 11.5*cm])
                content_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (0, -1), 'TOP'),
                    ('VALIGN', (1, 0), (1, 0), 'TOP'),
                    ('VALIGN', (2, 0), (2, -1), 'MIDDLE'),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    
                    ('LEFTPADDING', (0, 0), (0, -1), 0),
                    ('LEFTPADDING', (1, 0), (1, -1), 2),
                    ('LEFTPADDING', (2, 0), (2, -1), 8),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 2),
                    ('TOPPADDING', (0, 0), (0, -1), 2),
                    ('TOPPADDING', (1, 0), (1, 0), 0),
                    ('TOPPADDING', (2, 0), (2, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                    
                    ('FONTSIZE', (0, 0), (0, -1), 10),
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                    
                    ('SPAN', (1, 0), (1, 1)),
                ]))
            else:
                answer_text = "Jawaban : " + "." * 140
                answer_para = Paragraph(answer_text, answer_style)
                
                content_data = [
                    [f"{index}.", question_para],
                    ['', answer_para]
                ]
                content_table = Table(content_data, colWidths=[1*cm, 16*cm])
                content_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    
                    ('LEFTPADDING', (0, 0), (0, -1), 0),
                    ('LEFTPADDING', (1, 0), (1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 2),
                    ('TOPPADDING', (0, 0), (-1, -1), 2),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                    
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
                    ('TOPPADDING', (0, 1), (-1, 1), 6),
                    
                    ('FONTSIZE', (0, 0), (0, -1), 10),
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ]))
            
            story.append(content_table)
            story.append(Spacer(1, 4*mm))
            current_app.logger.info(f"Added soal {index} with {'image' if has_valid_image else 'text-only'} layout")
        
        current_app.logger.info("Building PDF...")
        doc.build(story)
        
        buffer.seek(0)
        pdf_data = buffer.getvalue()
        buffer.close()
        
        current_app.logger.info(f"PDF generated successfully: {len(pdf_data)} bytes")
        
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="{ujian.nama_ujian}_Lembar_Soal.pdf"'
        response.headers['Content-Length'] = len(pdf_data)
        
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error exporting PDF: {str(e)}")
        current_app.logger.exception("Full traceback:")
        return jsonify({'error': f'Gagal mengekspor PDF: {str(e)}'}), 500
    
@ujian_detail_bp.route('/<int:ujian_id>/upload-image', methods=['POST'])
@jwt_required()
def upload_question_image(ujian_id):
    """Upload image with format preservation option"""
    try:
        user_id = get_jwt_identity()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Use PNG, JPG, or GIF.'}), 400
        
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': 'File too large. Maximum size is 5MB.'}), 400
        
        question_index = request.form.get('question_index', '0')
        preserve_png = request.form.get('preserve_png', 'true').lower() == 'true'
        
        current_app.logger.info(f"Upload parameters - Question: {question_index}, Preserve PNG: {preserve_png}, Original filename: {file.filename}")
        
        upload_path = ensure_upload_folder()
        
        filename = generate_unique_filename(file.filename)
        current_app.logger.info(f"Generated filename: {filename}")
        
        try:
            file.seek(0)
            
            _, ext = os.path.splitext(file.filename.lower())
            should_preserve = preserve_png and ext == '.png'
            
            current_app.logger.info(f"Should preserve PNG: {should_preserve} (ext: {ext})")
            
            processed_image, save_format = process_image(file, preserve_format=should_preserve)
            if processed_image is None:
                return jsonify({'error': 'Failed to process image'}), 500
            
            file_path = os.path.join(upload_path, filename)
            current_app.logger.info(f"Saving to path: {file_path}")
            
            if save_format == 'PNG':
                processed_image.save(file_path, 'PNG', optimize=True)
                current_app.logger.info("Saved as PNG with transparency preserved")
            else:
                processed_image.save(file_path, 'JPEG', quality=90, optimize=True)
                current_app.logger.info("Saved as JPEG with white background")
            
            if not os.path.exists(file_path):
                raise Exception(f"File was not saved successfully: {file_path}")
            
            file_size_saved = os.path.getsize(file_path)
            current_app.logger.info(f"File saved successfully: {file_path}, size: {file_size_saved} bytes")
            
        except Exception as e:
            file_path = os.path.join(upload_path, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
            current_app.logger.error(f"Error saving image: {str(e)}")
            raise e
        
        response_data = {
            'message': 'Image uploaded and processed successfully',
            'filename': filename,
            'question_index': question_index,
            'file_size': os.path.getsize(file_path),
            'original_filename': file.filename,
            'saved_format': save_format,
            'file_path': file_path,
            'upload_success': True
        }
        
        current_app.logger.info(f"Upload response: {response_data}")
        return jsonify(response_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error uploading image: {str(e)}")
        return jsonify({'error': f'Failed to upload image: {str(e)}'}), 500

@ujian_detail_bp.route('/<int:ujian_id>/soal', methods=['PUT'])
@jwt_required()
def update_soal_ujian(ujian_id):
    """Update questions for ujian without deleting existing default soal"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        current_app.logger.info(f"Updating soal for ujian {ujian_id} with data: {data}")

        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404

        if 'questions_data' in data:
            questions_data = data['questions_data']
            current_app.logger.info(f"Processing {len(questions_data)} questions")

            existing_soal_list = Soal.query.filter_by(id_ujian=ujian_id).all()
            existing_soal_dict = {soal.no_soal: soal for soal in existing_soal_list}

            existing_image_files = [soal.gambar for soal in existing_soal_list if soal.gambar]
            used_image_files = []

            for i, question_data in enumerate(questions_data, start=1):
                pertanyaan = question_data.get('pertanyaan') or None
                kunci_jawaban = question_data.get('kunci_jawaban') or None
                gambar = question_data.get('gambar')
                status_gambar = question_data.get('status_gambar', 'off')

                if i in existing_soal_dict:
                    soal = existing_soal_dict[i]
                    soal.pertanyaan = pertanyaan
                    soal.kunci_jawaban = kunci_jawaban
                    soal.status_gambar = status_gambar
                    soal.gambar = gambar
                else:
                    soal = Soal(
                        id_ujian=ujian_id,
                        no_soal=i,
                        pertanyaan=pertanyaan,
                        kunci_jawaban=kunci_jawaban,
                        status_gambar=status_gambar,
                        gambar=gambar
                    )
                    db.session.add(soal)

                if gambar:
                    used_image_files.append(gambar)

            orphaned_files = set(existing_image_files) - set(used_image_files)
            for orphaned_file in orphaned_files:
                if orphaned_file:
                    file_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, orphaned_file)
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            current_app.logger.info(f"Deleted orphaned image: {orphaned_file}")
                    except Exception as e:
                        current_app.logger.warning(f"Failed to delete orphaned image {orphaned_file}: {e}")

        else:
            questions = data.get('questions', [])
            answer_keys = data.get('answer_keys', [])

            if len(questions) != len(answer_keys):
                return jsonify({'error': 'Questions and answer keys count mismatch'}), 400

            existing_soal_list = Soal.query.filter_by(id_ujian=ujian_id).all()
            existing_soal_dict = {soal.no_soal: soal for soal in existing_soal_list}

            for i, (question, answer) in enumerate(zip(questions, answer_keys), start=1):
                if i in existing_soal_dict:
                    soal = existing_soal_dict[i]
                    soal.pertanyaan = question.strip() if question.strip() else None
                    soal.kunci_jawaban = answer.strip() if answer.strip() else None
                    soal.status_gambar = 'off'
                else:
                    soal = Soal(
                        id_ujian=ujian_id,
                        no_soal=i,
                        pertanyaan=question.strip() if question.strip() else None,
                        kunci_jawaban=answer.strip() if answer.strip() else None,
                        status_gambar='off'
                    )
                    db.session.add(soal)

        db.session.commit()
        current_app.logger.info(f"Successfully updated soal for ujian {ujian_id}")

        return jsonify({'message': 'Soal berhasil diperbarui'}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating soal: {str(e)}")
        return jsonify({'error': str(e)}), 500


@ujian_detail_bp.route('/<int:ujian_id>/peserta', methods=['POST'])
@jwt_required()
def add_peserta_ujian(ujian_id):
    """Add participant to ujian"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        siswa_id = data.get('siswa_id')
        if not siswa_id:
            return jsonify({'error': 'siswa_id is required'}), 400
        
        siswa = Siswa.query.filter_by(id=siswa_id, id_users=user_id).first()
        if not siswa:
            return jsonify({'error': 'Siswa not found'}), 404
        
        existing = PesertaUjian.query.filter_by(id_siswa=siswa_id, id_ujian=ujian_id).first()
        if existing:
            return jsonify({'error': 'Siswa sudah terdaftar di ujian ini'}), 409
        
        peserta = PesertaUjian(id_siswa=siswa_id, id_ujian=ujian_id)
        db.session.add(peserta)
        db.session.commit()
        
        return jsonify({
            'message': 'Peserta berhasil ditambahkan',
            'peserta': peserta.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error adding peserta: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ujian_detail_bp.route('/<int:ujian_id>/peserta/<int:siswa_id>', methods=['DELETE'])
@jwt_required()
def remove_peserta_ujian(ujian_id, siswa_id):
    """Remove participant from ujian using raw SQL CASCADE delete"""
    try:
        user_id = get_jwt_identity()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        peserta = PesertaUjian.query.filter_by(id_siswa=siswa_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta tidak ditemukan'}), 404
        
        # Use raw SQL with CASCADE delete to avoid SQLAlchemy ORM issues
        result = db.session.execute(
            text('DELETE FROM peserta_ujian WHERE id_siswa = :siswa_id AND id_ujian = :ujian_id'),
            {'siswa_id': siswa_id, 'ujian_id': ujian_id}
        )
        
        if result.rowcount == 0:
            return jsonify({'error': 'Gagal menghapus peserta'}), 400
        
        db.session.commit()
        return jsonify({'message': 'Peserta berhasil dihapus'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error removing peserta: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ujian_detail_bp.route('/<int:ujian_id>/remove-peserta', methods=['DELETE'])
@jwt_required()
def remove_peserta_ujian_alt(ujian_id):
    """Alternative endpoint for removing participant using raw SQL CASCADE delete"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        siswa_id = data.get('siswa_id')
        if not siswa_id:
            return jsonify({'error': 'siswa_id is required'}), 400
        
        siswa = Siswa.query.filter_by(id=siswa_id, id_users=user_id).first()
        if not siswa:
            return jsonify({'error': 'Siswa not found'}), 404
        
        peserta = PesertaUjian.query.filter_by(id_siswa=siswa_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta not found in this ujian'}), 404
        
        # Use raw SQL with CASCADE delete to avoid SQLAlchemy ORM issues
        result = db.session.execute(
            text('DELETE FROM peserta_ujian WHERE id_siswa = :siswa_id AND id_ujian = :ujian_id'),
            {'siswa_id': siswa_id, 'ujian_id': ujian_id}
        )
        
        if result.rowcount == 0:
            return jsonify({'error': 'Failed to remove peserta'}), 400
        
        db.session.commit()
        return jsonify({'message': 'Peserta berhasil dihapus dari ujian'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error removing peserta: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ujian_detail_bp.route('/<int:ujian_id>/available-students', methods=['GET'])
@jwt_required()
def get_available_students(ujian_id):
    """Get students available to be added to ujian (filtered by class)"""
    try:
        user_id = get_jwt_identity()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        target_kelas_id = None
        
        if ujian.id_kelas:
            target_kelas_id = ujian.id_kelas
        elif ujian.id_mapel:
            mapel = MataPelajaran.query.get(ujian.id_mapel)
            if mapel and mapel.id_kelas:
                target_kelas_id = mapel.id_kelas
        
        if target_kelas_id:
            students_query = Siswa.query.filter_by(
                id_users=user_id, 
                kelas=target_kelas_id
            )
        else:
            students_query = Siswa.query.filter_by(id_users=user_id)
        
        all_students = students_query.all()
        
        peserta_ids = [p.id_siswa for p in PesertaUjian.query.filter_by(id_ujian=ujian_id).all()]
        
        students_data = []
        for siswa in all_students:
            students_data.append({
                'id': siswa.id,
                'nama_siswa': siswa.nama_siswa,
                'nisn': str(siswa.nisn),
                'kelas_nama': siswa.kelas_ref.nama_kelas if siswa.kelas_ref else 'Tidak ada kelas',
                'inExam': siswa.id in peserta_ids
            })
        
        return jsonify({
            'students': students_data,
            'filter_info': {
                'target_kelas_id': target_kelas_id,
                'ujian_kelas': ujian.kelas.nama_kelas if ujian.kelas else None,
                'ujian_mapel': ujian.mata_pelajaran.nama_mapel if ujian.mata_pelajaran else None,
                'total_students': len(students_data)
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting available students: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ujian_detail_bp.route('/<int:ujian_id>/toggle-peserta', methods=['POST'])
@jwt_required()
def toggle_peserta_ujian(ujian_id):
    """Toggle student participation in ujian"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        siswa_id = data.get('siswa_id')
        if not siswa_id:
            return jsonify({'error': 'siswa_id is required'}), 400
        
        siswa = Siswa.query.filter_by(id=siswa_id, id_users=user_id).first()
        if not siswa:
            return jsonify({'error': 'Siswa not found'}), 404
        
        peserta = PesertaUjian.query.filter_by(id_siswa=siswa_id, id_ujian=ujian_id).first()
        
        if peserta:
            # Use raw SQL with CASCADE delete to avoid SQLAlchemy ORM issues
            result = db.session.execute(
                text('DELETE FROM peserta_ujian WHERE id_siswa = :siswa_id AND id_ujian = :ujian_id'),
                {'siswa_id': siswa_id, 'ujian_id': ujian_id}
            )
            
            if result.rowcount == 0:
                return jsonify({'error': 'Gagal menghapus peserta'}), 400
            
            message = 'Peserta berhasil dihapus dari ujian'
            in_exam = False
        else:
            peserta = PesertaUjian(
                id_siswa=siswa_id, 
                id_ujian=ujian_id,
                status='belum selesai'
            )
            db.session.add(peserta)
            message = 'Peserta berhasil ditambahkan ke ujian'
            in_exam = True
        
        db.session.commit()
        
        return jsonify({
            'message': message,
            'in_exam': in_exam
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error toggling peserta: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ujian_detail_bp.route('/<int:ujian_id>/peserta/<int:peserta_id>/status', methods=['PUT'])
@jwt_required()
def update_peserta_status(ujian_id, peserta_id):
    """Update status peserta ujian (selesai/belum selesai)"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        status = data.get('status')
        if status not in ['selesai', 'belum selesai']:
            return jsonify({'error': 'Status must be "selesai" or "belum selesai"'}), 400
        
        peserta = PesertaUjian.query.filter_by(id=peserta_id, id_ujian=ujian_id).first()
        if not peserta:
            return jsonify({'error': 'Peserta ujian not found'}), 404
        
        peserta.status = status
        db.session.commit()
        
        return jsonify({
            'message': f'Status peserta berhasil diubah menjadi {status}',
            'peserta': peserta.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating peserta status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ujian_detail_bp.route('/<int:ujian_id>/image/<filename>', methods=['GET'])
def get_question_image(ujian_id, filename):
    """Serve question image files - NO AUTH required for image serving"""
    try:
        soal = Soal.query.filter_by(id_ujian=ujian_id, gambar=filename).first()
        if not soal:
            current_app.logger.error(f"Image not found in database: {filename} for ujian {ujian_id}")
            return jsonify({'error': 'Image not found'}), 404
        
        file_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, filename)
        current_app.logger.info(f"Looking for image at: {file_path}")
        
        if not os.path.exists(file_path):
            current_app.logger.error(f"Image file not found on disk: {file_path}")
            return jsonify({'error': 'Image file not found on disk'}), 404
        
        ext = filename.lower().split('.')[-1]
        mimetype_map = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg', 
            'png': 'image/png',
            'gif': 'image/gif'
        }
        mimetype = mimetype_map.get(ext, 'image/jpeg')
        
        return send_file(
            file_path, 
            mimetype=mimetype,
            as_attachment=False
        )
        
    except Exception as e:
        current_app.logger.error(f"Error serving image: {str(e)}")
        return jsonify({'error': 'Failed to serve image'}), 500

@ujian_detail_bp.route('/<int:ujian_id>/debug-images', methods=['GET'])
@jwt_required()
def debug_images(ujian_id):
    """Debug endpoint to check images for ujian"""
    try:
        user_id = get_jwt_identity()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        soal_list = Soal.query.filter_by(id_ujian=ujian_id).all()
        
        debug_info = {
            'ujian_id': ujian_id,
            'upload_folder': UPLOAD_FOLDER,
            'full_upload_path': os.path.join(current_app.root_path, UPLOAD_FOLDER),
            'soal_with_images': []
        }
        
        for soal in soal_list:
            if soal.gambar:
                file_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, soal.gambar)
                soal_info = {
                    'soal_id': soal.id,
                    'gambar': soal.gambar,
                    'status_gambar': soal.status_gambar,
                    'file_path': file_path,
                    'file_exists': os.path.exists(file_path),
                    'file_size': os.path.getsize(file_path) if os.path.exists(file_path) else None
                }
                debug_info['soal_with_images'].append(soal_info)
        
        return jsonify(debug_info), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in debug: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ujian_detail_bp.route('/<int:ujian_id>/delete-image/<filename>', methods=['DELETE'])
@jwt_required()
def delete_question_image(ujian_id, filename):
    """Delete question image file"""
    try:
        user_id = get_jwt_identity()
        
        ujian = Ujian.query.filter_by(id=ujian_id, id_users=user_id).first()
        if not ujian:
            return jsonify({'error': 'Ujian not found'}), 404
        
        soal = Soal.query.filter_by(id_ujian=ujian_id, gambar=filename).first()
        if not soal:
            return jsonify({'error': 'Image not found'}), 404
        
        file_path = os.path.join(current_app.root_path, UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            current_app.logger.info(f"Deleted image file: {file_path}")
        
        soal.gambar = None
        soal.status_gambar = 'off'
        db.session.commit()
        
        return jsonify({'message': 'Image deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting image: {str(e)}")
        return jsonify({'error': 'Failed to delete image'}), 500