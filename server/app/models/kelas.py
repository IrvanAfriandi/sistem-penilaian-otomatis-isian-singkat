from app import db

class Kelas(db.Model):
    __tablename__ = 'kelas'
    
    id = db.Column(db.Integer, primary_key=True)
    id_users = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    nama_kelas = db.Column(db.String(100), nullable=False)
    
    def get_total_students(self):
        """Hitung total siswa di kelas ini"""
        from app.models.siswa import Siswa
        return Siswa.query.filter_by(kelas=self.id).count()
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'id': self.id,
            'nama_kelas': self.nama_kelas,
            'id_users': self.id_users,
            'totalStudents': self.get_total_students()  # Hitung real total siswa
        }
    
    def __repr__(self):
        return f'<Kelas {self.nama_kelas}>'