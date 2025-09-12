from app import db

class Ujian(db.Model):
    __tablename__ = 'ujian'
    
    id = db.Column(db.Integer, primary_key=True)
    id_users = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    id_kelas = db.Column(db.Integer, db.ForeignKey('kelas.id', ondelete='SET NULL'), nullable=True)
    id_mapel = db.Column(db.Integer, db.ForeignKey('mata_pelajaran.id', ondelete='SET NULL'), nullable=True)
    nama_ujian = db.Column(db.String(255), nullable=False)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('ujian', lazy=True))
    kelas = db.relationship('Kelas', backref=db.backref('ujian', lazy=True))
    mata_pelajaran = db.relationship('MataPelajaran', foreign_keys=[id_mapel], backref=db.backref('ujian', lazy=True))
    
    def get_total_participants(self):
        """Hitung total peserta ujian dari tabel peserta_ujian"""
        from app.models.peserta_ujian import PesertaUjian
        return PesertaUjian.query.filter_by(id_ujian=self.id).count()
    
    def get_completed_participants(self):
        """Hitung peserta yang sudah selesai berdasarkan status field"""
        from app.models.peserta_ujian import PesertaUjian
        
        return PesertaUjian.query.filter_by(
            id_ujian=self.id, 
            status='selesai'
        ).count()
    
    def get_average_score(self):
        """Hitung rata-rata nilai ujian dari peserta yang sudah selesai"""
        from app.models.peserta_ujian import PesertaUjian
        from app.models.penilaian import Penilaian  # Changed from Jawaban to Penilaian
        
        # Get peserta yang sudah selesai
        peserta_selesai = PesertaUjian.query.filter_by(
            id_ujian=self.id, 
            status='selesai'
        ).all()
        
        if not peserta_selesai:
            return 0.0
        
        # Method 1: Menggunakan total_nilai langsung (lebih efisien)
        nilai_list = []
        for peserta in peserta_selesai:
            if peserta.total_nilai is not None and peserta.total_nilai > 0:
                nilai_list.append(float(peserta.total_nilai))
        
        if nilai_list:
            return round(sum(nilai_list) / len(nilai_list), 2)
        
        # Method 2: Fallback - hitung dari penilaian individual jika total_nilai kosong
        total_score = 0
        count = 0
        
        for peserta in peserta_selesai:
            penilaian_list = Penilaian.query.filter_by(id_peserta=peserta.id).all()  # Changed from id_peserta_ujian
            if penilaian_list:
                peserta_score = sum([float(p.nilai) for p in penilaian_list if p.nilai]) / len(penilaian_list)
                total_score += peserta_score
                count += 1
        
        return round(total_score / count, 2) if count > 0 else 0.0

    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        total_participants = self.get_total_participants()
        completed_participants = self.get_completed_participants()
        
        return {
            'id': self.id,
            'id_users': self.id_users,
            'id_kelas': self.id_kelas,
            'id_mata_pelajaran': self.id_mapel,  # Map id_mapel to id_mata_pelajaran for frontend compatibility
            'nama_ujian': self.nama_ujian,
            'nama_kelas': self.kelas.nama_kelas if self.kelas else None,
            'nama_mata_pelajaran': self.mata_pelajaran.nama_mapel if self.mata_pelajaran else None,
            'nama_user': self.user.nama_lengkap if self.user else None,
            'total_participants': total_participants,
            'completed_participants': completed_participants,
            'average_score': self.get_average_score(),
            'progress_text': f"{completed_participants}/{total_participants}" if total_participants > 0 else "0/0"
        }
    
    def to_dict_detailed(self):
        """Convert ujian object to detailed dictionary with soal and peserta"""
        from app.models.kelas import Kelas
        from app.models.mata_pelajaran import MataPelajaran
        from app.models.soal import Soal
        from app.models.peserta_ujian import PesertaUjian
        
        # Get related data
        kelas_info = None
        if self.id_kelas:
            kelas = Kelas.query.get(self.id_kelas)
            kelas_info = kelas.nama_kelas if kelas else None
        
        mapel_info = None
        if self.id_mapel:
            mapel = MataPelajaran.query.get(self.id_mapel)
            mapel_info = mapel.nama_mapel if mapel else None
        
        # Get soal
        soal_list = Soal.query.filter_by(id_ujian=self.id).order_by(Soal.id).all()
        
        # Get peserta with status
        peserta_list = PesertaUjian.query.filter_by(id_ujian=self.id).all()
        peserta_data = [peserta.to_dict() for peserta in peserta_list]
        
        # Calculate stats
        completed = len([p for p in peserta_data if p['status'] == 'completed'])
        total = len(peserta_data)
        
        return {
            'ujian': {
                'id': self.id,
                'nama_ujian': self.nama_ujian,
                'kelas': kelas_info,
                'mata_pelajaran': mapel_info,
                'id_kelas': self.id_kelas,
                'id_mapel': self.id_mapel
            },
            'soal': [soal.to_dict() for soal in soal_list],
            'peserta': peserta_data,
            'stats': {
                'total_peserta': total,
                'completed': completed,
                'not_completed': total - completed
            }
        }
    
    def __repr__(self):
        return f'<Ujian {self.nama_ujian}>'