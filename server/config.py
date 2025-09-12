import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    
    # Updated untuk database penilaian_otomatis
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'mysql+pymysql://root:@localhost/penilaian_otomatis'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = False
    
    @staticmethod
    def init_app(app):
        # Create directories if they don't exist
        os.makedirs(Config.OUTPUT1_FOLDER, exist_ok=True)
        os.makedirs(Config.OUTPUT2_FOLDER, exist_ok=True)