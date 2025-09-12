import os
import cv2
import numpy as np
from ultralytics import YOLO
from werkzeug.utils import secure_filename

class ModelYolo2:
    def __init__(self):
        self.model_path = os.path.join('app', 'services', 'model', 'yolo2.pt')
        self.model = None
        self.input_dir = os.path.join('app', 'static', 'output_1')  # Input dari hasil crop tahap 1
        self.output_dir = os.path.join('app', 'static', 'output_2')  # Output crop tahap 2
        os.makedirs(self.output_dir, exist_ok=True)
    def load_model(self):
        if self.model is None:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model YOLO2 tidak ditemukan di {self.model_path}")
            self.model = YOLO(self.model_path)
        return self.model
    def detect_and_crop_handwriting(self, peserta_id, ujian_id, soal_number):
        try:
            model = self.load_model()
            input_filename = f"peserta_{peserta_id}_ujian_{ujian_id}_soal_{soal_number}.jpg"
            input_path = os.path.join(self.input_dir, input_filename)
            if not os.path.exists(input_path):
                raise FileNotFoundError(f"Gambar crop tahap 1 tidak ditemukan: {input_path}")
            img = cv2.imread(input_path)
            if img is None:
                raise Exception("Gagal membaca file gambar crop tahap 1")
            results = model(img, conf=0.1)
            result = results[0]
            cropped_files = []
            if len(result.boxes) == 0:
                return cropped_files
            self.cleanup_old_crops(peserta_id, ujian_id, soal_number)
            boxes = result.boxes
            names = model.names
            best_box = None
            best_confidence = 0
            for box in boxes:
                confidence = float(box.conf[0])
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_box = box
            if best_box is None:
                return cropped_files
            
            # Process hanya box terbaik
            x1, y1, x2, y2 = best_box.xyxy[0].int().tolist()
            
            # Nama label (biasanya 'jawaban', 'tulisan', atau similar)
            cls_id = int(best_box.cls[0])
            label = names[cls_id]
            
            # Crop gambar area jawaban
            crop = img[y1:y2, x1:x2]
            
            # Nama file crop (hanya 1 jawaban per soal)
            # Format: peserta_{peserta_id}_ujian_{ujian_id}_soal_{soal_number}_jawaban_1.jpg
            crop_filename = f"peserta_{peserta_id}_ujian_{ujian_id}_soal_{soal_number}_jawaban_1.jpg"
            crop_filepath = os.path.join(self.output_dir, crop_filename)
            
            # Simpan hasil crop
            cv2.imwrite(crop_filepath, crop)
            
            # Simpan nama file untuk database
            cropped_files.append(crop_filename)
            
            # Log informasi deteksi
            total_detections = len(boxes)
            if total_detections > 1:
                print(f"⚠️ Soal {soal_number}: {total_detections} area terdeteksi, mengambil yang terbaik (conf: {best_confidence:.3f})")
            else:
                print(f"✅ Soal {soal_number}: 1 area terdeteksi (conf: {best_confidence:.3f})")
            
            return cropped_files
            
        except Exception as e:
            raise Exception(f"Error dalam deteksi dan crop area jawaban: {str(e)}")
    
    def detect_and_crop_handwriting_alternative(self, peserta_id, ujian_id, soal_number):
        """
        Alternative: Ambil jawaban berdasarkan posisi (paling atas-kiri)
        """
        try:
            # Load model
            model = self.load_model()
            
            # Path gambar input (hasil crop tahap 1)
            input_filename = f"peserta_{peserta_id}_ujian_{ujian_id}_soal_{soal_number}.jpg"
            input_path = os.path.join(self.input_dir, input_filename)
            
            if not os.path.exists(input_path):
                raise FileNotFoundError(f"Gambar crop tahap 1 tidak ditemukan: {input_path}")
            
            # Baca gambar
            img = cv2.imread(input_path)
            if img is None:
                raise Exception("Gagal membaca file gambar crop tahap 1")
            
            # Jalankan deteksi area jawaban
            results = model(img, conf=0.1)
            result = results[0]
            
            # List untuk menyimpan nama file hasil crop
            cropped_files = []
            
            if len(result.boxes) == 0:
                return cropped_files
            
            # Hapus file crop lama untuk soal ini
            self.cleanup_old_crops(peserta_id, ujian_id, soal_number)
            
            # Ambil informasi bounding box
            boxes = result.boxes
            names = model.names
            
            # ALTERNATIF: Sort berdasarkan posisi Y kemudian X, ambil yang pertama
            boxes_with_coords = []
            for i, box in enumerate(boxes):
                x1, y1, x2, y2 = box.xyxy[0].int().tolist()
                confidence = float(box.conf[0])
                boxes_with_coords.append((i, box, y1, x1, confidence))
            
            # Sort berdasarkan Y kemudian X (paling atas-kiri)
            boxes_with_coords.sort(key=lambda x: (x[2], x[3]))
            
            # Ambil hanya yang pertama
            first_box_data = boxes_with_coords[0]
            _, box, _, _, confidence = first_box_data
            
            # Koordinat bounding box
            x1, y1, x2, y2 = box.xyxy[0].int().tolist()
            
            # Nama label
            cls_id = int(box.cls[0])
            label = names[cls_id]
            
            # Crop gambar area jawaban
            crop = img[y1:y2, x1:x2]
            
            # Nama file crop
            crop_filename = f"peserta_{peserta_id}_ujian_{ujian_id}_soal_{soal_number}_jawaban_1.jpg"
            crop_filepath = os.path.join(self.output_dir, crop_filename)
            
            # Simpan hasil crop
            cv2.imwrite(crop_filepath, crop)
            cropped_files.append(crop_filename)
            
            # Log informasi
            total_detections = len(boxes)
            if total_detections > 1:
                print(f"⚠️ Soal {soal_number}: {total_detections} area terdeteksi, mengambil yang paling atas-kiri (conf: {confidence:.3f})")
            else:
                print(f"✅ Soal {soal_number}: 1 area terdeteksi (conf: {confidence:.3f})")
            
            return cropped_files
            
        except Exception as e:
            raise Exception(f"Error dalam deteksi dan crop area jawaban: {str(e)}")
    
    def detect_and_crop_all_answers(self, peserta_id, ujian_id, soal_numbers):
        """
        Deteksi dan crop area jawaban untuk semua soal yang ada output_1
        Returns: dictionary dengan nomor soal sebagai key dan list file crop sebagai value
        """
        try:
            all_cropped_files = {}
            
            for soal_number in soal_numbers:
                try:
                    cropped_files = self.detect_and_crop_handwriting(peserta_id, ujian_id, soal_number)
                    # Selalu masukkan ke dict, baik ada hasil atau tidak
                    all_cropped_files[soal_number] = cropped_files
                except Exception as e:
                    print(f"Warning: Gagal memproses soal {soal_number}: {str(e)}")
                    # Tetap masukkan dengan list kosong
                    all_cropped_files[soal_number] = []
            
            return all_cropped_files
            
        except Exception as e:
            raise Exception(f"Error dalam batch processing crop jawaban: {str(e)}")
    
    def cleanup_old_crops(self, peserta_id, ujian_id, soal_number):
        """Hapus file crop tahap 2 lama untuk soal tertentu"""
        try:
            pattern = f"peserta_{peserta_id}_ujian_{ujian_id}_soal_{soal_number}_jawaban_"
            for filename in os.listdir(self.output_dir):
                if filename.startswith(pattern):
                    filepath = os.path.join(self.output_dir, filename)
                    if os.path.exists(filepath):
                        os.remove(filepath)
        except Exception as e:
            print(f"Warning: Gagal menghapus file crop tahap 2 lama: {str(e)}")
    
    def cleanup_all_crops(self, peserta_id, ujian_id):
        """Hapus semua file crop tahap 2 untuk peserta tertentu"""
        try:
            pattern = f"peserta_{peserta_id}_ujian_{ujian_id}_soal_"
            for filename in os.listdir(self.output_dir):
                if filename.startswith(pattern) and "_jawaban_" in filename:
                    filepath = os.path.join(self.output_dir, filename)
                    if os.path.exists(filepath):
                        os.remove(filepath)
        except Exception as e:
            print(f"Warning: Gagal menghapus file crop tahap 2: {str(e)}")
    
    def get_crop_info(self, crop_filename):
        """
        Extract informasi dari nama file crop
        Returns: dict dengan peserta_id, ujian_id, soal_number, jawaban_index
        """
        try:
            # Format expected: peserta_{peserta_id}_ujian_{ujian_id}_soal_{soal_number}_jawaban_{jawaban_index}.jpg
            parts = crop_filename.replace('.jpg', '').split('_')
            
            if len(parts) >= 8 and parts[0] == 'peserta' and parts[2] == 'ujian' and parts[4] == 'soal' and parts[6] == 'jawaban':
                return {
                    'peserta_id': int(parts[1]),
                    'ujian_id': int(parts[3]),
                    'soal_number': int(parts[5]),
                    'jawaban_index': int(parts[7])
                }
            else:
                raise ValueError("Format nama file tidak sesuai")
                
        except Exception as e:
            raise Exception(f"Error parsing crop filename: {str(e)}")