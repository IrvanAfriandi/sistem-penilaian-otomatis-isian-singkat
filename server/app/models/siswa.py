from app import db

class Siswa(db.Model):
    __tablename__ = 'siswa'
    
    id = db.Column(db.Integer, primary_key=True)
    id_users = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    nama_siswa = db.Column(db.String(255), nullable=False)
    nisn = db.Column(db.BigInteger, nullable=False)  # Remove unique=True if not in your current DB
    kelas = db.Column(db.Integer, db.ForeignKey('kelas.id', ondelete='SET NULL'), nullable=True)
    jenis_kelamin = db.Column(db.Enum('Laki-laki', 'Perempuan', name='jenis_kelamin'), nullable=False)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('siswa', lazy=True))
    kelas_ref = db.relationship('Kelas', backref=db.backref('siswa', lazy=True))
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'id': self.id,
            'id_users': self.id_users,
            'nama_siswa': self.nama_siswa,
            'nisn': str(self.nisn),  # Convert to string for frontend
            'kelas': self.kelas,
            'nama_kelas': self.kelas_ref.nama_kelas if self.kelas_ref else None,
            'jenis_kelamin': self.jenis_kelamin,
            'nama_user': self.user.nama_lengkap if self.user else None,
            'totalExams': self.get_total_exams(),
            'averageScore': self.get_average_score()
        }
    
    def to_dict_with_ujian_status(self, ujian_id=None):
        """Convert siswa object to dictionary with ujian participation status"""
        base_dict = self.to_dict()
        
        if ujian_id:
            from app.models.peserta_ujian import PesertaUjian
            peserta = PesertaUjian.query.filter_by(
                id_siswa=self.id, 
                id_ujian=ujian_id
            ).first()
            base_dict['inExam'] = peserta is not None
        else:
            base_dict['inExam'] = False
        
        return base_dict
    
    def get_total_exams(self):
        """Get total exams this student has participated in"""
        from app.models.peserta_ujian import PesertaUjian
        return PesertaUjian.query.filter_by(id_siswa=self.id).count()
    
    def get_average_score(self):
        """Get average score across all exams - FIXED to use Penilaian"""
        from app.models.peserta_ujian import PesertaUjian
        # FIXED: Use Penilaian instead of Jawaban
        from app.models.penilaian import Penilaian
        
        peserta_list = PesertaUjian.query.filter_by(id_siswa=self.id).all()
        if not peserta_list:
            return 0.0
        
        # Method 1: Use total_nilai directly from peserta_ujian (more efficient)
        total_score = 0
        count = 0
        
        for peserta in peserta_list:
            if peserta.total_nilai and peserta.total_nilai > 0:
                total_score += float(peserta.total_nilai)
                count += 1
        
        if count > 0:
            return round(total_score / count, 2)
        
        # Method 2: Fallback - calculate from individual penilaian
        total_score = 0
        count = 0
        
        for peserta in peserta_list:
            # FIXED: Use Penilaian model instead of Jawaban
            penilaian_list = Penilaian.query.filter_by(id_peserta=peserta.id).all()
            if penilaian_list:
                exam_score = sum([float(p.nilai) for p in penilaian_list if p.nilai]) / len(penilaian_list)
                total_score += exam_score
                count += 1
        
        return round(total_score / count, 2) if count > 0 else 0.0
    
    def __repr__(self):
        return f'<Siswa {self.nama_siswa}>'