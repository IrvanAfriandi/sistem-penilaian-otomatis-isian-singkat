from app import db
import bcrypt

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    nama_depan = db.Column(db.String(100), nullable=False)
    nama_belakang = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)  # Stored as hashed

    def set_password(self, password_plain):
        """Hash and set password"""
        salt = bcrypt.gensalt()
        self.password = bcrypt.hashpw(password_plain.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password_plain):
        """Check if provided password matches hash"""
        return bcrypt.checkpw(password_plain.encode('utf-8'), self.password.encode('utf-8'))
    
    @property
    def nama_lengkap(self):
        """Get full name"""
        return f"{self.nama_depan} {self.nama_belakang}"
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'id': self.id,
            'nama_depan': self.nama_depan,
            'nama_belakang': self.nama_belakang,
            'nama_lengkap': self.nama_lengkap,
            'email': self.email
        }
    
    def __repr__(self):
        return f'<User {self.email}>'