import pandas as pd
import logging
import os
from typing import Optional
import sys

# Import model penilaian dari file yang sama direktori
from model_penilaian import grade_single_answer, get_grader

class ExcelGradingProcessor:
    """
    Processor untuk melakukan penilaian otomatis dari file Excel
    menggunakan model penilaian yang sudah ada.
    """
    
    def __init__(self):
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
        # Inisialisasi grader
        try:
            self.grader = get_grader()
            self.logger.info("Model penilaian berhasil dimuat")
        except Exception as e:
            self.logger.error(f"Gagal memuat model penilaian: {e}")
            raise
    
    def validate_excel_columns(self, df: pd.DataFrame) -> bool:
        """
        Validasi kolom-kolom yang diperlukan dalam file Excel
        """
        required_columns = [
            'Mata Pelajaran', 'Nama Siswa', 'Nomor Soal', 'Soal', 
            'Kunci Jawaban', 'Jawaban Siswa', 'Hasil CRNN', 
            'CER', 'WER', 'Nilai Sistem', 'Validasi Guru'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            self.logger.error(f"Kolom yang hilang: {missing_columns}")
            return False
        
        self.logger.info("Semua kolom yang diperlukan tersedia")
        return True
    
    def clean_text(self, text) -> str:
        """
        Membersihkan teks dari nilai NaN atau None
        """
        if pd.isna(text) or text is None:
            return ""
        return str(text).strip()
    
    def grade_single_row(self, row) -> dict:
        """
        Melakukan penilaian untuk satu baris data
        """
        try:
            # Ambil data dari kolom yang sesuai
            question = self.clean_text(row['Soal'])
            key_answer = self.clean_text(row['Kunci Jawaban'])
            student_answer = self.clean_text(row['Hasil CRNN'])  # Menggunakan Hasil CRNN sebagai jawaban siswa
            
            # Validasi input
            if not key_answer:
                return {
                    'score': 0,
                    'grade': 'E',
                    'level': 'Error',
                    'feedback': 'Kunci jawaban kosong',
                    'status': 'error'
                }
            
            if not student_answer:
                return {
                    'score': 0,
                    'grade': 'E', 
                    'level': 'Tidak Dijawab',
                    'feedback': 'Jawaban siswa kosong (Hasil CRNN kosong)',
                    'status': 'empty_answer'
                }
            
            # Lakukan penilaian menggunakan model
            result = grade_single_answer(
                student_answer=student_answer,
                key_answer=key_answer,
                question=question
            )
            
            result['status'] = 'success'
            return result
            
        except Exception as e:
            self.logger.error(f"Error saat menilai baris: {e}")
            return {
                'score': 0,
                'grade': 'E',
                'level': 'Error',
                'feedback': f'Error penilaian: {str(e)}',
                'status': 'error'
            }
    
    def process_excel_file(self, input_file_path: str, output_file_path: Optional[str] = None) -> pd.DataFrame:
        """
        Memproses file Excel dan melakukan penilaian otomatis
        
        Args:
            input_file_path: Path ke file Excel input
            output_file_path: Path ke file Excel output (opsional)
            
        Returns:
            DataFrame dengan hasil penilaian
        """
        try:
            # Baca file Excel
            self.logger.info(f"Membaca file Excel: {input_file_path}")
            df = pd.read_excel(input_file_path)
            
            self.logger.info(f"Data berhasil dibaca. Jumlah baris: {len(df)}")
            
            # Validasi kolom
            if not self.validate_excel_columns(df):
                raise ValueError("File Excel tidak memiliki struktur kolom yang sesuai")
            
            # Inisialisasi kolom hasil jika belum ada
            if 'Nilai Sistem' not in df.columns:
                df['Nilai Sistem'] = None
            
            # Proses setiap baris
            results = []
            total_rows = len(df)
            
            self.logger.info("Memulai proses penilaian...")
            
            for index, row in df.iterrows():
                # Tampilkan progress
                if (index + 1) % 10 == 0 or index == 0:
                    self.logger.info(f"Memproses baris {index + 1}/{total_rows}")
                
                # Lakukan penilaian
                grading_result = self.grade_single_row(row)
                results.append(grading_result)
                
                # Update kolom Nilai Sistem dengan score
                df.at[index, 'Nilai Sistem'] = grading_result['score']
            
            # Buat summary hasil penilaian
            self.create_grading_summary(results)
            
            # Simpan file output jika path diberikan
            if output_file_path:
                self.logger.info(f"Menyimpan hasil ke: {output_file_path}")
                df.to_excel(output_file_path, index=False)
                self.logger.info("File berhasil disimpan")
            
            return df
            
        except FileNotFoundError:
            self.logger.error(f"File tidak ditemukan: {input_file_path}")
            raise
        except Exception as e:
            self.logger.error(f"Error saat memproses file: {e}")
            raise
    
    def create_grading_summary(self, results: list):
        """
        Membuat ringkasan hasil penilaian
        """
        total = len(results)
        success_count = sum(1 for r in results if r['status'] == 'success')
        error_count = sum(1 for r in results if r['status'] == 'error')
        empty_count = sum(1 for r in results if r['status'] == 'empty_answer')
        
        # Hitung distribusi grade untuk jawaban yang berhasil dinilai
        successful_results = [r for r in results if r['status'] == 'success']
        grade_distribution = {}
        if successful_results:
            for result in successful_results:
                grade = result.get('grade', 'Unknown')
                grade_distribution[grade] = grade_distribution.get(grade, 0) + 1
        
        # Hitung rata-rata score
        valid_scores = [r['score'] for r in successful_results if 'score' in r]
        avg_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0
        
        self.logger.info("=" * 50)
        self.logger.info("RINGKASAN PENILAIAN")
        self.logger.info("=" * 50)
        self.logger.info(f"Total soal diproses: {total}")
        self.logger.info(f"Berhasil dinilai: {success_count}")
        self.logger.info(f"Jawaban kosong: {empty_count}")
        self.logger.info(f"Error penilaian: {error_count}")
        self.logger.info(f"Rata-rata nilai: {avg_score:.2f}")
        
        if grade_distribution:
            self.logger.info("\nDistribusi Grade:")
            for grade, count in sorted(grade_distribution.items()):
                percentage = (count / success_count) * 100
                self.logger.info(f"  Grade {grade}: {count} soal ({percentage:.1f}%)")
        
        self.logger.info("=" * 50)


def main():
    """
    Fungsi utama untuk menjalankan proses penilaian
    """
    try:
        # Inisialisasi processor
        processor = ExcelGradingProcessor()
        
        # Tentukan path file input dan output
        # Sesuaikan path ini dengan lokasi file Anda
        input_file = "data_penilaian.xlsx"  # Ganti dengan nama file Anda
        output_file = "data_penilaian_hasil.xlsx"  # File output dengan hasil penilaian
        
        # Periksa apakah file input ada
        if not os.path.exists(input_file):
            print(f"File input tidak ditemukan: {input_file}")
            print("Pastikan file Excel Anda berada di direktori yang sama dengan script ini")
            return
        
        # Proses file Excel
        print("Memulai proses penilaian otomatis...")
        result_df = processor.process_excel_file(input_file, output_file)
        
        print(f"\nProses selesai!")
        print(f"File hasil penilaian disimpan di: {output_file}")
        print(f"Total {len(result_df)} baris data telah diproses")
        
    except Exception as e:
        print(f"Error: {e}")
        logging.error(f"Error dalam main: {e}")


if __name__ == "__main__":
    main()