from .user import User
from .kelas import Kelas
from .mata_pelajaran import MataPelajaran
from .siswa import Siswa
from .ujian import Ujian
from .soal import Soal
from .peserta_ujian import PesertaUjian
# Add new models (create these files if they don't exist yet)
from .ekstraksi_teks import EkstraksiTeks
from .penilaian import Penilaian

__all__ = [
    'User', 
    'Kelas', 
    'MataPelajaran', 
    'Siswa', 
    'Ujian', 
    'Soal', 
    'PesertaUjian',
    'EkstraksiTeks',
    'Penilaian'
]