import os
import torch
import numpy as np
from PIL import Image, ImageOps
import warnings
from torch import nn
import torchvision.models as models
import pandas as pd
from difflib import get_close_matches, SequenceMatcher
import re

warnings.filterwarnings('ignore')

class IndonesianWordCorrector:
    def __init__(self):
        self.kata_indonesia_path = os.path.join('app', 'services', 'data', 'kata_indonesia.csv')
        self.koreksi_mapping_path = os.path.join('app', 'services', 'data', 'koreksi_mapping.csv')
        self.word_dict = set()
        self.koreksi_mapping = {}
        self.load_dictionary()
        self.load_koreksi_mapping()
    
    def load_dictionary(self):
        try:
            if os.path.exists(self.kata_indonesia_path):
                df = pd.read_csv(self.kata_indonesia_path)
                if 'word' in df.columns:
                    for _, row in df.iterrows():
                        word = str(row['word']).lower().strip()
                        if word:
                            self.word_dict.add(word)
                print(f"Loaded {len(self.word_dict)} words from kata_indonesia.csv")
        except Exception as e:
            print(f"Error loading dictionary: {e}")
    
    def load_koreksi_mapping(self):
        try:
            if os.path.exists(self.koreksi_mapping_path):
                df = pd.read_csv(self.koreksi_mapping_path)
                if 'hasil_ekstraksi' in df.columns and 'koreksi_user' in df.columns:
                    for _, row in df.iterrows():
                        hasil_ekstraksi = str(row['hasil_ekstraksi']).strip().lower()
                        koreksi_user = str(row['koreksi_user']).strip().upper()
                        if hasil_ekstraksi and koreksi_user:
                            self.koreksi_mapping[hasil_ekstraksi] = koreksi_user
                            self.word_dict.add(koreksi_user.lower())
                print(f"Loaded {len(self.koreksi_mapping)} koreksi mappings")
        except Exception as e:
            print(f"Error loading koreksi mapping: {e}")
    
    def reload_koreksi_mapping(self):
        old_count = len(self.koreksi_mapping)
        self.koreksi_mapping = {}
        self.load_koreksi_mapping()
        new_count = len(self.koreksi_mapping)
        print(f"Koreksi mapping reloaded: {old_count} -> {new_count} mappings")
        return new_count
    
    def find_best_fuzzy_mapping(self, text, threshold=0.8):
        if not text or not self.koreksi_mapping:
            return None
        close_matches = get_close_matches(text.lower(), self.koreksi_mapping.keys(), n=1, cutoff=threshold)
        if close_matches:
            best_key = close_matches[0]
            result = self.koreksi_mapping[best_key]
            similarity = SequenceMatcher(None, text, best_key).ratio()
            print(f"Fuzzy match found: '{text}' -> '{result}' (similarity: {similarity:.3f})")
            return result
        return None
    
    def find_best_match(self, word, threshold=0.6):
        word_lower = word.lower().strip()
        
        if word_lower in self.koreksi_mapping:
            return self.koreksi_mapping[word_lower]
        
        fuzzy_mapping = self.find_fuzzy_mapping_single_word(word_lower, threshold=0.7)
        if fuzzy_mapping:
            return fuzzy_mapping
        
        if word_lower in self.word_dict:
            return word_lower
        
        close_matches = get_close_matches(word_lower, self.word_dict, n=1, cutoff=threshold)
        if close_matches:
            return close_matches[0]
        
        return word
    
    def find_fuzzy_mapping_single_word(self, word, threshold=0.7):
        if not word or not self.koreksi_mapping:
            return None
        close_matches = get_close_matches(word.lower(), self.koreksi_mapping.keys(), n=1, cutoff=threshold)
        if close_matches:
            best_key = close_matches[0]
            result = self.koreksi_mapping[best_key]
            return result
        return None
    
    def correct_text(self, text):
        if not text:
            return ""
        
        text_clean = text.strip()
        text_lower = text_clean.lower()
        
        if text_lower in self.koreksi_mapping:
            return self.koreksi_mapping[text_lower]
        
        best_fuzzy_match = self.find_best_fuzzy_mapping(text_lower, threshold=0.8)
        if best_fuzzy_match:
            return best_fuzzy_match
        
        words = re.findall(r'\S+|\s+', text)
        corrected_words = []
        
        for word in words:
            if word.isspace():
                corrected_words.append(word)
            else:
                clean_word = re.sub(r'[^\w]', '', word)
                if clean_word:
                    corrected = self.find_best_match(clean_word)
                    if word.isupper() and corrected != clean_word:
                        corrected = corrected.upper()
                    elif word.istitle() and corrected != clean_word:
                        corrected = corrected.title()
                    corrected_words.append(corrected)
                else:
                    corrected_words.append(word)
        
        return ''.join(corrected_words)

class CRNN(nn.Module):
    def __init__(self, img_channel, img_height, img_width, num_class, map_to_seq=256, rnn_hidden=256):
        super(CRNN, self).__init__()
        self.cnn = self._build_resnet50_backbone(img_channel)
        self.adaptive_pool = nn.AdaptiveAvgPool2d((1, None))
        self.map_to_seq = nn.Linear(2048, map_to_seq)
        self.rnn1 = nn.LSTM(map_to_seq, rnn_hidden, bidirectional=True, batch_first=False)
        self.rnn2 = nn.LSTM(2 * rnn_hidden, rnn_hidden, bidirectional=True, batch_first=False)
        self.dense = nn.Linear(2 * rnn_hidden, num_class)

    def _build_resnet50_backbone(self, img_channel):
        resnet = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        if img_channel == 1:
            original_conv1 = resnet.conv1
            resnet.conv1 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
            with torch.no_grad():
                resnet.conv1.weight.data = original_conv1.weight.data.mean(dim=1, keepdim=True)
        modules = list(resnet.children())[:-2]
        return nn.Sequential(*modules)

    def forward(self, images):
        conv = self.cnn(images)
        conv = self.adaptive_pool(conv)
        batch, channel, height, width = conv.size()
        conv = conv.squeeze(2)
        conv = conv.permute(2, 0, 1)
        seq = self.map_to_seq(conv)
        recurrent, _ = self.rnn1(seq)
        recurrent, _ = self.rnn2(recurrent)
        output = self.dense(recurrent)
        return output

def _reconstruct(labels, blank=0):
    new_labels = []
    previous = None
    for label in labels:
        if label != previous:
            new_labels.append(label)
            previous = label
    return [l for l in new_labels if l != blank]

def greedy_decode(emission_log_prob, blank=0):
    labels = np.argmax(emission_log_prob, axis=-1)
    return _reconstruct(labels, blank=blank)

def ctc_decode(log_probs, label2char=None, blank=0):
    if hasattr(log_probs, 'cpu'):
        emission_log_probs = np.transpose(log_probs.cpu().numpy(), (1, 0, 2))
    else:
        emission_log_probs = np.transpose(log_probs, (1, 0, 2))
    
    decoded_list = []
    for emission_log_prob in emission_log_probs:
        decoded = greedy_decode(emission_log_prob, blank=blank)
        if label2char:
            try:
                decoded = [label2char[l] for l in decoded if l in label2char]
            except KeyError:
                decoded = [label2char.get(l, '') for l in decoded]
        decoded_list.append(decoded)
    return decoded_list

def preprocess_image(img, height=64, width=512):
    try:
        if img.mode != 'L':
            image = img.convert('L')
        else:
            image = img
        
        image = ImageOps.exif_transpose(image)
        orig_width, orig_height = image.size
        aspect_ratio = orig_width / orig_height
        new_height = height
        new_width = int(height * aspect_ratio)
        image = image.resize((new_width, new_height), resample=Image.LANCZOS)
        image = np.array(image)
        
        if new_width < width:
            pad_width = width - new_width
            image = np.pad(image, ((0, 0), (0, pad_width)), mode='constant', constant_values=255)
        elif new_width > width:
            start_x = (new_width - width) // 2
            image = image[:, start_x:start_x + width]
        
        image = image.reshape((1, height, width))
        image = image.astype(np.float32)
        image = image / 255.0
        image = (image - 0.5) * 2.0
        return torch.FloatTensor(image)
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        blank = np.ones((1, height, width), dtype=np.float32) * -1
        return torch.FloatTensor(blank)

class CharacterSet:
    # Extended character set yang match dengan model checkpoint (126 karakter + 1 blank = 127)
    CHARS = ('0123456789'
             'abcdefghijklmnopqrstuvwxyz'
             'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
             ' .,!?:;-()[]{}"\'/\\@#$%^&*+=~`|_<>'
             'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß'
             'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ'
             '₀₁₂₃₄₅₆₇₈₉')
    
    CHAR2LABEL = {char: i + 1 for i, char in enumerate(CHARS)}
    LABEL2CHAR = {label: char for char, label in CHAR2LABEL.items()}

def get_num_classes_from_checkpoint(model_path):
    """Extract num_classes dari model checkpoint"""
    try:
        checkpoint = torch.load(model_path, map_location='cpu')
        if 'model_state_dict' in checkpoint:
            state_dict = checkpoint['model_state_dict']
        elif 'state_dict' in checkpoint:
            state_dict = checkpoint['state_dict']
        else:
            state_dict = checkpoint
        
        if 'dense.weight' in state_dict:
            num_classes = state_dict['dense.weight'].shape[0]
            return num_classes
        else:
            return None
    except Exception as e:
        print(f"Error reading checkpoint: {e}")
        return None

class ModelCRNN:
    def __init__(self):
        self.model_path = os.path.join('app', 'services', 'model', 'crnn.pt')
        self.model = None
        self.input_dir = os.path.join('app', 'static', 'output_2')
        self.img_height = 64
        self.img_width = 512
        self.img_channel = 1
        
        # Akan di-set dinamis berdasarkan checkpoint
        self.chars = None
        self.char2label = None
        self.label2char = None
        self.num_classes = None
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.word_corrector = None
        self.use_word_correction = True
        
    def setup_character_set(self, num_classes):
        """Setup character set berdasarkan num_classes dari checkpoint"""
        if num_classes == 127:  # Model asli dengan 126 chars + 1 blank
            self.chars = CharacterSet.CHARS
            self.char2label = CharacterSet.CHAR2LABEL
            self.label2char = CharacterSet.LABEL2CHAR
            self.num_classes = num_classes
            print(f"Using extended character set with {len(self.chars)} characters")
        else:
            # Fallback ke character set dasar
            basic_chars = ('0123456789'
                          'abcdefghijklmnopqrstuvwxyz'
                          'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                          ' .,!?:;-()[]{}"\'/\\@#$%^&*+=~`|_<>')
            
            self.chars = basic_chars[:num_classes-1]  # -1 untuk blank
            self.char2label = {char: i + 1 for i, char in enumerate(self.chars)}
            self.label2char = {label: char for char, label in self.char2label.items()}
            self.num_classes = num_classes
            print(f"Using basic character set with {len(self.chars)} characters")
        
    def load_model(self):
        if self.model is None:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model CRNN tidak ditemukan di {self.model_path}")
            
            try:
                # Baca num_classes dari checkpoint terlebih dahulu
                checkpoint_num_classes = get_num_classes_from_checkpoint(self.model_path)
                if checkpoint_num_classes is None:
                    raise Exception("Cannot determine num_classes from checkpoint")
                
                # Setup character set berdasarkan checkpoint
                self.setup_character_set(checkpoint_num_classes)
                
                # Initialize model dengan num_classes yang benar
                self.model = CRNN(
                    img_channel=self.img_channel,
                    img_height=self.img_height,
                    img_width=self.img_width,
                    num_class=self.num_classes,
                    map_to_seq=256,
                    rnn_hidden=256
                )
                
                # Load checkpoint
                checkpoint = torch.load(self.model_path, map_location=self.device)
                
                if 'model_state_dict' in checkpoint:
                    self.model.load_state_dict(checkpoint['model_state_dict'])
                elif 'state_dict' in checkpoint:
                    self.model.load_state_dict(checkpoint['state_dict'])
                else:
                    self.model.load_state_dict(checkpoint)
                
                self.model.to(self.device)
                self.model.eval()
                print(f"CRNN model loaded successfully on {self.device} with {self.num_classes} classes")
                
            except Exception as e:
                raise Exception(f"Error loading CRNN model: {str(e)}")
                
        return self.model
    
    def load_word_corrector(self):
        if self.word_corrector is None:
            try:
                self.word_corrector = IndonesianWordCorrector()
                print("Word corrector loaded successfully")
            except Exception as e:
                print(f"Warning: Could not load word corrector: {e}")
                self.use_word_correction = False
    
    def reload_koreksi_mapping(self):
        if self.word_corrector:
            return self.word_corrector.reload_koreksi_mapping()
        else:
            print("Word corrector not loaded")
            return 0
    
    def preprocess_single_image(self, image_path):
        try:
            if isinstance(image_path, str):
                image = Image.open(image_path).convert('RGB')
            else:
                image = image_path
            
            processed_image = preprocess_image(image, self.img_height, self.img_width)
            processed_image = processed_image.unsqueeze(0)
            return processed_image.to(self.device)
        except Exception as e:
            raise Exception(f"Error preprocessing image {image_path}: {str(e)}")
    
    def predict_text(self, image_path):
        try:
            model = self.load_model()
            image_tensor = self.preprocess_single_image(image_path)
            
            with torch.no_grad():
                log_probs = model(image_tensor)
                log_probs = torch.log_softmax(log_probs, dim=-1)
                decoded_sequences = ctc_decode(log_probs, label2char=self.label2char, blank=0)
                
                if decoded_sequences and len(decoded_sequences) > 0:
                    decoded_chars = decoded_sequences[0]
                    text = ''.join(decoded_chars)
                    text = ' '.join(text.split()).strip()
                    return text
                else:
                    return ""
        except Exception as e:
            print(f"Error predicting text for {image_path}: {str(e)}")
            return ""
    
    def predict_text_with_correction(self, image_path):
        try:
            raw_text = self.predict_text(image_path)
            
            if not self.use_word_correction or not raw_text:
                return raw_text
            
            if self.word_corrector is None:
                self.load_word_corrector()
            
            if self.word_corrector:
                corrected_text = self.word_corrector.correct_text(raw_text)
                if raw_text != corrected_text:
                    print(f"Corrected: '{raw_text}' -> '{corrected_text}'")
                return corrected_text
            
            return raw_text
        except Exception as e:
            print(f"Error in prediction with correction: {e}")
            return self.predict_text(image_path)
    
    def extract_text_from_images(self, peserta_id, ujian_id, auto_reload_mapping=True):
        try:
            if auto_reload_mapping and self.use_word_correction:
                if self.word_corrector is None:
                    self.load_word_corrector()
                else:
                    self.reload_koreksi_mapping()
            
            model = self.load_model()
            pattern = f"peserta_{peserta_id}_ujian_{ujian_id}_soal_"
            image_files = []
            
            if not os.path.exists(self.input_dir):
                raise FileNotFoundError(f"Directory {self.input_dir} tidak ditemukan")
            
            for filename in os.listdir(self.input_dir):
                if filename.startswith(pattern) and "_jawaban_" in filename and filename.lower().endswith('.jpg'):
                    image_files.append(filename)
            
            if not image_files:
                return {}
            
            print(f"Found {len(image_files)} images to process for peserta {peserta_id}")
            results = {}
            
            for filename in image_files:
                try:
                    image_path = os.path.join(self.input_dir, filename)
                    corrected_text = self.predict_text_with_correction(image_path)
                    results[filename] = corrected_text
                    print(f"{filename}: '{corrected_text}'")
                except Exception as e:
                    print(f"Error processing {filename}: {str(e)}")
                    results[filename] = ""
                    continue
            
            return results
        except Exception as e:
            raise Exception(f"Error extracting text from images: {str(e)}")
    
    def get_koreksi_mapping_info(self):
        if self.word_corrector:
            return {
                'total_mappings': len(self.word_corrector.koreksi_mapping),
                'csv_exists': os.path.exists(self.word_corrector.koreksi_mapping_path)
            }
        else:
            return {'total_mappings': 0, 'status': 'Word corrector not loaded'}
    
    def cleanup_predictions(self, text):
        """Clean up predicted text to remove common OCR errors"""
        if not text:
            return ""
        
        text = ' '.join(text.split())
        text = text.strip()
        
        if len(text.strip()) < 2:
            return ""
        
        return text
    
    def get_image_info(self, filename):
        """Extract informasi dari nama file output_2"""
        try:
            parts = filename.replace('.jpg', '').split('_')
            
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
            raise Exception(f"Error parsing filename {filename}: {str(e)}")
    
    def toggle_word_correction(self, enable=True):
        """Enable/disable word correction"""
        self.use_word_correction = enable
        print(f"Word correction {'enabled' if enable else 'disabled'}")
    
    def batch_predict_images(self, image_paths, batch_size=8):
        """Predict text from multiple images in batches for efficiency"""
        try:
            model = self.load_model()
            results = []
            
            for i in range(0, len(image_paths), batch_size):
                batch_paths = image_paths[i:i + batch_size]
                batch_tensors = []
                
                for path in batch_paths:
                    try:
                        tensor = self.preprocess_single_image(path)
                        batch_tensors.append(tensor)
                    except Exception as e:
                        print(f"Error preprocessing {path}: {e}")
                        empty_tensor = torch.zeros(1, 1, self.img_height, self.img_width).to(self.device)
                        batch_tensors.append(empty_tensor)
                
                if not batch_tensors:
                    continue
                
                try:
                    batch_input = torch.cat(batch_tensors, dim=0)
                    
                    with torch.no_grad():
                        log_probs = model(batch_input)
                        log_probs = torch.log_softmax(log_probs, dim=-1)
                        decoded_sequences = ctc_decode(log_probs, label2char=self.label2char, blank=0)
                        
                        for j, decoded_chars in enumerate(decoded_sequences):
                            text = ''.join(decoded_chars)
                            text = self.cleanup_predictions(text)
                            
                            if self.use_word_correction and self.word_corrector and text:
                                text = self.word_corrector.correct_text(text)
                            
                            results.append(text)
                            
                except Exception as e:
                    print(f"Error in batch inference: {e}")
                    results.extend([""] * len(batch_paths))
            
            return results
        except Exception as e:
            raise Exception(f"Error in batch prediction: {str(e)}")
    
    def get_model_info(self):
        try:
            model = self.load_model()
            total_params = sum(p.numel() for p in model.parameters())
            koreksi_info = self.get_koreksi_mapping_info()
            
            return {
                'model_path': self.model_path,
                'device': str(self.device),
                'total_parameters': total_params,
                'input_size': f"{self.img_height}x{self.img_width}",
                'num_classes': self.num_classes,
                'character_count': len(self.chars) if self.chars else 0,
                'word_correction_enabled': self.use_word_correction,
                'koreksi_mapping_info': koreksi_info
            }
        except Exception as e:
            return {'error': str(e)}