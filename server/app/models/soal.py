from app import db

class Soal(db.Model):
    __tablename__ = 'soal'
    
    id = db.Column(db.Integer, primary_key=True)
    id_ujian = db.Column(db.Integer, db.ForeignKey('ujian.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # NEW FIELD - Nomor urut soal
    no_soal = db.Column(db.Integer, nullable=False, index=True)  # Nomor soal berurutan (1, 2, 3, etc.)
    
    pertanyaan = db.Column(db.Text, nullable=True)
    kunci_jawaban = db.Column(db.Text, nullable=True)
    gambar = db.Column(db.String(255), nullable=True)
    status_gambar = db.Column(db.Enum('on', 'off', name='status_gambar_enum'), nullable=False, default='off')
    
    # Index untuk optimisasi query berdasarkan ujian dan nomor soal
    __table_args__ = (
        db.Index('idx_ujian_no_soal', 'id_ujian', 'no_soal'),
    )
    
    # Relationships
    ujian = db.relationship('Ujian', backref=db.backref('soal', lazy=True, cascade='all, delete-orphan', order_by='Soal.no_soal'))
    
    def to_dict(self):
        """Convert soal object to dictionary"""
        return {
            'id': self.id,
            'id_ujian': self.id_ujian,
            'no_soal': self.no_soal,  # NEW: Nomor soal untuk ordering
            'pertanyaan': self.pertanyaan,
            'kunci_jawaban': self.kunci_jawaban,
            'gambar': self.gambar,
            'status_gambar': self.status_gambar,
            'nomor_soal': self.no_soal,  # For backward compatibility
            'has_image': bool(self.gambar and self.status_gambar == 'on')
        }
    
    def to_dict_public(self):
        """Convert soal object to dictionary for students (without answer key)"""
        return {
            'id': self.id,
            'id_ujian': self.id_ujian,
            'no_soal': self.no_soal,  # NEW: Nomor soal
            'pertanyaan': self.pertanyaan,
            'gambar': self.gambar,
            'status_gambar': self.status_gambar,
            'nomor_soal': self.no_soal,  # For backward compatibility
            'has_image': bool(self.gambar and self.status_gambar == 'on')
        }
    
    def to_dict_with_jawaban(self, peserta_ujian_id=None):
        """Convert soal with jawaban for specific peserta"""
        base_dict = self.to_dict()
        
        if peserta_ujian_id:
            from app.models.jawaban import Jawaban
            jawaban = Jawaban.query.filter_by(
                id_soal=self.id, 
                id_peserta_ujian=peserta_ujian_id
            ).first()
            
            if jawaban:
                base_dict.update({
                    'jawaban_siswa': jawaban.jawaban,
                    'nilai': float(jawaban.nilai),
                    'output_1': jawaban.output_1,
                    'output_2': jawaban.output_2,
                    'has_processing_output': bool(jawaban.output_1 or jawaban.output_2)
                })
            else:
                base_dict.update({
                    'jawaban_siswa': None,
                    'nilai': 0,
                    'output_1': None,
                    'output_2': None,
                    'has_processing_output': False
                })
                
        return base_dict
    
    def get_image_url(self, base_url=None):
        """Get full URL for soal image"""
        if not self.gambar or self.status_gambar != 'on':
            return None
        if base_url:
            return f"{base_url}/api/ujian/{self.id_ujian}/image/{self.gambar}"
        return f"/api/ujian/{self.id_ujian}/image/{self.gambar}"
    
    @classmethod
    def get_ordered_by_ujian(cls, ujian_id):
        """Get all soal for ujian ordered by no_soal"""
        return cls.query.filter_by(id_ujian=ujian_id).order_by(cls.no_soal).all()
    
    @classmethod
    def get_next_no_soal(cls, ujian_id):
        """Get next available no_soal for ujian"""
        max_no = db.session.query(db.func.max(cls.no_soal)).filter_by(id_ujian=ujian_id).scalar()
        return (max_no or 0) + 1
    
    @classmethod
    def reorder_soal(cls, ujian_id):
        """Reorder soal in ujian to ensure consecutive numbering (1, 2, 3...)"""
        soal_list = cls.query.filter_by(id_ujian=ujian_id).order_by(cls.no_soal).all()
        for index, soal in enumerate(soal_list, 1):
            soal.no_soal = index
        db.session.commit()
        return len(soal_list)
    
    def __repr__(self):
        return f'<Soal {self.id} No.{self.no_soal} - Ujian {self.id_ujian}>'