from app import db
from datetime import datetime

class EkstraksiTeks(db.Model):
    __tablename__ = 'ekstraksi_teks'
    
    id = db.Column(db.Integer, primary_key=True)
    id_soal = db.Column(db.Integer, db.ForeignKey('soal.id', ondelete='CASCADE'), nullable=False)
    id_peserta_ujian = db.Column(db.Integer, db.ForeignKey('peserta_ujian.id', ondelete='CASCADE'), nullable=False)
    output_1 = db.Column(db.String(255), nullable=True) 
    output_2 = db.Column(db.String(255), nullable=True) 
    teks = db.Column(db.String(255), nullable=True) 

    soal = db.relationship('Soal', backref='ekstraksi_teks')
    peserta_ujian = db.relationship('PesertaUjian', backref='ekstraksi_teks')
    
    def to_dict(self):
        return {
            'id': self.id,
            'id_soal': self.id_soal,
            'id_peserta_ujian': self.id_peserta_ujian,
            'output_1': self.output_1,
            'output_2': self.output_2,
            'teks': self.teks
        }