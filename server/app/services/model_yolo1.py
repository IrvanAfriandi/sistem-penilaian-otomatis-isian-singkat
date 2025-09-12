import os
import cv2
import numpy as np
from ultralytics import YOLO
from werkzeug.utils import secure_filename

class ModelYolo1:
    def __init__(self):
        # Path ke model YOLO
        self.model_path = os.path.join('app', 'services', 'model', 'yolo1.pt')
        self.model = None
        
        # Folders untuk menyimpan gambar
        self.jawaban_dir = os.path.join('app', 'static', 'jawaban')
        self.output_dir = os.path.join('app', 'static', 'output_1')
        
        # Pastikan folder ada
        os.makedirs(self.jawaban_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        
    def load_model(self):
        """Load YOLO model"""
        if self.model is None:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model YOLO tidak ditemukan di {self.model_path}")
            self.model = YOLO(self.model_path)
        return self.model
    
    def save_original_image(self, image_file, peserta_id, ujian_id):
        """
        Simpan gambar original ke folder jawaban
        Returns: nama file yang disimpan
        """
        try:
            # Buat nama file unik
            filename = f"peserta_{peserta_id}_ujian_{ujian_id}_jawaban.jpg"
            filepath = os.path.join(self.jawaban_dir, filename)
            
            # Hapus file lama jika ada
            if os.path.exists(filepath):
                os.remove(filepath)
            
            # Simpan file gambar
            image_file.save(filepath)
            
            return filename
            
        except Exception as e:
            raise Exception(f"Error menyimpan gambar original: {str(e)}")
    
    def detect_and_crop_answers(self, peserta_id, ujian_id):
        """
        Deteksi area soal dan crop gambar dari file yang sudah disimpan
        Returns: dictionary dengan nomor soal sebagai key dan nama file crop sebagai value
        """
        try:
            # Load model
            model = self.load_model()
            
            # Path gambar original
            original_filename = f"peserta_{peserta_id}_ujian_{ujian_id}_jawaban.jpg"
            original_path = os.path.join(self.jawaban_dir, original_filename)
            
            if not os.path.exists(original_path):
                raise FileNotFoundError(f"Gambar original tidak ditemukan: {original_path}")
            
            # Baca gambar
            img = cv2.imread(original_path)
            if img is None:
                raise Exception("Gagal membaca file gambar")
            
            # Jalankan deteksi
            results = model(img, conf=0.1)
            result = results[0]
            
            # Dictionary untuk menyimpan hasil crop
            cropped_files = {}
            
            if len(result.boxes) == 0:
                return cropped_files
            
            # Hapus file crop lama
            self.cleanup_old_crops(peserta_id, ujian_id)
            
            # Ambil informasi bounding box
            boxes = result.boxes
            names = model.names  # mapping class id -> label
            
            for i, box in enumerate(boxes):
                # Koordinat bounding box
                x1, y1, x2, y2 = box.xyxy[0].int().tolist()
                
                # Nama label (nomor soal)
                cls_id = int(box.cls[0])
                label = names[cls_id]
                
                # Crop gambar
                crop = img[y1:y2, x1:x2]
                
                # Ekstrak nomor soal dari label
                # Asumsi label berformat 'soal-1', 'soal-2', dst atau '1', '2', dst
                if 'soal-' in label:
                    soal_num = label.split('-')[1]
                elif 'soal_' in label:
                    soal_num = label.split('_')[1]
                else:
                    soal_num = label
                
                try:
                    soal_number = int(soal_num)
                except ValueError:
                    continue  # Skip jika tidak bisa convert ke int
                
                # Nama file crop
                crop_filename = f"peserta_{peserta_id}_ujian_{ujian_id}_soal_{soal_number}.jpg"
                crop_filepath = os.path.join(self.output_dir, crop_filename)
                
                # Simpan hasil crop
                cv2.imwrite(crop_filepath, crop)
                
                # Simpan nama file untuk database
                cropped_files[soal_number] = crop_filename
            
            return cropped_files
            
        except Exception as e:
            raise Exception(f"Error dalam deteksi dan crop: {str(e)}")
    
    def cleanup_old_crops(self, peserta_id, ujian_id):
        """Hapus file crop lama untuk peserta tertentu"""
        try:
            pattern = f"peserta_{peserta_id}_ujian_{ujian_id}_soal_"
            for filename in os.listdir(self.output_dir):
                if filename.startswith(pattern):
                    filepath = os.path.join(self.output_dir, filename)
                    if os.path.exists(filepath):
                        os.remove(filepath)
        except Exception as e:
            print(f"Warning: Gagal menghapus file crop lama: {str(e)}")
    
    def cleanup_old_jawaban(self, peserta_id, ujian_id):
        """Hapus file jawaban lama untuk peserta tertentu"""
        try:
            filename = f"peserta_{peserta_id}_ujian_{ujian_id}_jawaban.jpg"
            filepath = os.path.join(self.jawaban_dir, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as e:
            print(f"Warning: Gagal menghapus file jawaban lama: {str(e)}")