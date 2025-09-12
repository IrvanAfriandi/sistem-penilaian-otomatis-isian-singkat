from app import db
from datetime import datetime

class Penilaian(db.Model):
    __tablename__ = 'penilaian'
    
    id = db.Column(db.Integer, primary_key=True)
    id_peserta = db.Column(db.Integer, db.ForeignKey('peserta_ujian.id', ondelete='CASCADE'), nullable=False)
    id_soal = db.Column(db.Integer, db.ForeignKey('soal.id', ondelete='CASCADE'), nullable=False)
    jawaban = db.Column(db.String(255), nullable=True)
    nilai = db.Column(db.Float(8,2), nullable=True)
    
    # Relationships
    peserta_ujian = db.relationship('PesertaUjian', backref='penilaian')
    soal = db.relationship('Soal', backref='penilaian')
    
    def to_dict(self):
        return {
            'id': self.id,
            'id_peserta': self.id_peserta,
            'id_soal': self.id_soal,
            'jawaban': self.jawaban,
            'nilai': float(self.nilai) if self.nilai else None
        }