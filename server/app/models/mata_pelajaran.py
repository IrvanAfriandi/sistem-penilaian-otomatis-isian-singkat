from app import db

class MataPelajaran(db.Model):
    __tablename__ = 'mata_pelajaran'
    
    id = db.Column(db.Integer, primary_key=True)
    id_users = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    id_kelas = db.Column(db.Integer, db.ForeignKey('kelas.id', ondelete='SET NULL'), nullable=True)
    nama_mapel = db.Column(db.String(100), nullable=False)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('mata_pelajaran', lazy=True))
    kelas = db.relationship('Kelas', backref=db.backref('mata_pelajaran', lazy=True))
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'id': self.id,
            'id_users': self.id_users,
            'id_kelas': self.id_kelas,
            'nama_mapel': self.nama_mapel,
            'nama_kelas': self.kelas.nama_kelas if self.kelas else None,
            'nama_user': self.user.nama_lengkap if self.user else None,
            'totalExams': 0  # Nanti akan dihitung dari relasi soal
        }
    
    def __repr__(self):
        return f'<MataPelajaran {self.nama_mapel}>'