from app import db
from datetime import datetime

class PesertaUjian(db.Model):
    __tablename__ = 'peserta_ujian'
    
    id = db.Column(db.Integer, primary_key=True)
    id_siswa = db.Column(db.Integer, db.ForeignKey('siswa.id', ondelete='CASCADE'), nullable=False, index=True)
    id_ujian = db.Column(db.Integer, db.ForeignKey('ujian.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # FIXED: Add missing total_nilai field that exists in database
    total_nilai = db.Column(db.Float(8,2), nullable=True, default=0.00)
    
    # Upload foto jawaban siswa
    foto_jawaban = db.Column(db.String(255), nullable=True)
    
    status = db.Column(db.Enum('selesai', 'belum selesai', name='status_peserta_enum'), nullable=False, default='belum selesai')
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('id_siswa', 'id_ujian', name='unique_peserta_ujian'),
    )
    
    # Relationships
    siswa = db.relationship('Siswa', backref=db.backref('peserta_ujian', lazy=True, cascade='all, delete-orphan'))
    ujian = db.relationship('Ujian', backref=db.backref('peserta_ujian', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        """Convert peserta ujian object to dictionary"""
        # Calculate completion based on status field
        status_completed = 'completed' if self.status == 'selesai' else 'not_completed'
        
        # Count penilaian for additional info (FIXED: use Penilaian instead of jawaban)
        total_penilaian = 0
        if hasattr(self, 'penilaian'):
            total_penilaian = len(self.penilaian)
        
        # Get total soal for this ujian
        from app.models.soal import Soal
        total_soal = Soal.query.filter_by(id_ujian=self.id_ujian).count()
        
        # FIXED: Use total_nilai directly from database
        nilai_final = float(self.total_nilai) if self.total_nilai else 0.00
        
        return {
            'id': self.id,
            'id_siswa': self.id_siswa,
            'id_ujian': self.id_ujian,
            'siswa_id': self.id_siswa,  # For frontend compatibility
            'nama_siswa': self.siswa.nama_siswa if self.siswa else 'Unknown',
            'nisn': str(self.siswa.nisn) if self.siswa else 'Unknown',
            'foto_jawaban': self.foto_jawaban,
            'has_foto_jawaban': bool(self.foto_jawaban),
            'status': status_completed,
            'status_raw': self.status,
            'total_nilai': nilai_final,  # FIXED: Use database field directly
            'score': nilai_final if self.status == 'selesai' else None,
            'total_jawaban': total_penilaian,
            'total_soal': total_soal,
            'inExam': True
        }
    
    def to_dict_detailed(self):
        """Convert peserta ujian with detailed info including processing status"""
        base_dict = self.to_dict()
        
        # FIXED: Check penilaian instead of jawaban
        processing_info = {
            'total_processed_answers': 0,
            'processing_completion': 0
        }
        
        # Get penilaian count for processing info
        from app.models.penilaian import Penilaian
        penilaian_count = Penilaian.query.filter_by(id_peserta=self.id).count()
        total_soal = base_dict['total_soal']
        
        if total_soal > 0:
            processing_info.update({
                'total_processed_answers': penilaian_count,
                'processing_completion': round((penilaian_count / total_soal) * 100, 2)
            })
        
        base_dict.update(processing_info)
        return base_dict
    
    def set_foto_jawaban(self, filename):
        """Set foto jawaban filename"""
        self.foto_jawaban = filename
        
    def remove_foto_jawaban(self):
        """Remove foto jawaban"""
        self.foto_jawaban = None
        
    def get_foto_jawaban_url(self, base_url=None):
        """Get full URL for foto jawaban"""
        if not self.foto_jawaban:
            return None
        if base_url:
            return f"{base_url}/uploads/jawaban_photos/{self.foto_jawaban}"
        return f"/uploads/jawaban_photos/{self.foto_jawaban}"
        
    def mark_as_completed(self):
        """Mark peserta as completed"""
        self.status = 'selesai'
        
    def mark_as_not_completed(self):
        """Mark peserta as not completed"""  
        self.status = 'belum selesai'
    
    def update_total_nilai(self):
        """Calculate and update total_nilai from penilaian"""
        from app.models.penilaian import Penilaian
        
        penilaian_list = Penilaian.query.filter_by(id_peserta=self.id).all()
        if penilaian_list:
            # Calculate average score
            total_score = sum([float(p.nilai) for p in penilaian_list if p.nilai])
            average_score = total_score / len(penilaian_list) if penilaian_list else 0
            self.total_nilai = round(average_score, 2)
        else:
            self.total_nilai = 0.00
    
    def __repr__(self):
        return f'<PesertaUjian Siswa:{self.id_siswa} Ujian:{self.id_ujian} Status:{self.status} Nilai:{self.total_nilai}>'