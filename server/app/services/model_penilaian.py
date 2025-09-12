import re
import numpy as np
import pandas as pd
import os
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from fuzzywuzzy import fuzz, process
import warnings
import logging
from typing import List, Dict, Any, Tuple

try:
    from transformers import pipeline
    QA_PIPELINE_AVAILABLE = True
except ImportError:
    QA_PIPELINE_AVAILABLE = False
    logging.warning("Transformers not available for QA pipeline")

warnings.filterwarnings('ignore')

class ImprovedShortAnswerGrader:
    def __init__(self, use_gpu=False, data_folder=None):
        if data_folder is None:
            self.data_folder = os.path.dirname(os.path.abspath(__file__))
        else:
            self.data_folder = data_folder
            
        try:
            self.sentence_model = SentenceTransformer('indobenchmark/indobert-base-p2')
            logging.info("Successfully loaded IndoBERT model")
        except Exception as e:
            logging.warning(f"Failed to load IndoBERT model: {e}")
            self.sentence_model = None

        # Load QA model for question context analysis
        self.qa_pipeline = None
        if QA_PIPELINE_AVAILABLE:
            try:
                self.qa_pipeline = pipeline(
                    "question-answering",
                    model="Rifky/Indobert-QA",
                    tokenizer="Rifky/Indobert-QA"
                )
                logging.info("Successfully loaded IndoBERT-QA for context analysis")
            except Exception as e:
                logging.warning(f"Failed to load IndoBERT-QA: {e}")

        # Question type patterns untuk anak SD
        self.question_patterns = {
            'faktual_ketat': [
                r'\b(nama|siapa|kapan|dimana|berapa|tahun|tanggal|hari|bulan)\b',
                r'\b(sebutkan|tuliskan|apakah nama)\b',
                r'\b(ibu kota|presiden|pahlawan|penemu|pencipta)\b',
                r'\b(warna|bentuk|jumlah|ukuran)\b'
            ],
            'definisi': [
                r'\b(apa itu|apakah|pengertian|arti|maksud)\b',
                r'\b(jelaskan pengertian|apa yang dimaksud)\b',
                r'\b(definisi|makna)\b'
            ],
            'terbuka': [
                r'\b(jelaskan|uraikan|bagaimana|mengapa|kenapa|alasan)\b',
                r'\b(cara|langkah|proses|metode)\b',
                r'\b(pendapat|menurutmu|menurut kamu|ceritakan)\b',
                r'\b(gambarkan|beri contoh|sebutkan contoh)\b'
            ],
            'ciri_sifat': [
                r'\b(ciri-ciri|ciri|sifat-sifat|sifat|karakteristik)\b',
                r'\b(seperti apa|bagaimana bentuk|bagaimana rupa)\b'
            ]
        }

        # Scoring configurations untuk anak SD
        self.scoring_configs = {
            'faktual_ketat': {
                'exact_weight': 0.9,
                'semantic_weight': 0.6,
                'fuzzy_weight': 0.4,
                'penalty_harsh': 0.25,
                'penalty_medium': 0.50,
                'penalty_light': 0.80,
                'description': 'Cukup ketat untuk soal faktual'
            },
            'definisi': {
                'exact_weight': 0.8,
                'semantic_weight': 0.7,
                'fuzzy_weight': 0.5,
                'penalty_harsh': 0.35,
                'penalty_medium': 0.60,
                'penalty_light': 0.85,
                'description': 'Moderat untuk soal definisi'
            },
            'ciri_sifat': {
                'exact_weight': 0.7,
                'semantic_weight': 0.8,
                'fuzzy_weight': 0.4,
                'penalty_harsh': 0.40,
                'penalty_medium': 0.65,
                'penalty_light': 0.85,
                'description': 'Cukup lenient untuk soal ciri/sifat'
            },
            'terbuka': {
                'exact_weight': 0.6,
                'semantic_weight': 0.8,
                'fuzzy_weight': 0.3,
                'penalty_harsh': 0.50,
                'penalty_medium': 0.75,
                'penalty_light': 0.90,
                'description': 'Lenient untuk soal terbuka'
            },
            'standar': {
                'exact_weight': 0.8,
                'semantic_weight': 0.6,
                'fuzzy_weight': 0.4,
                'penalty_harsh': 0.35,
                'penalty_medium': 0.60,
                'penalty_light': 0.85,
                'description': 'Scoring standar'
            }
        }
        
        # Standard thresholds
        self.similarity_thresholds = {
            'excellent': 0.70,
            'good': 0.55,
            'fair': 0.40,
            'poor': 0.25
        }
        
        self.context_thresholds = {
            'relevant': 0.35,
            'somewhat_relevant': 0.20,
            'irrelevant': 0.10
        }

        self.mappings_file = 'app/services/data/penilaian_mapping.csv'
        self.custom_mappings = self._load_custom_mappings()
    
    def analyze_question_context(self, question: str) -> str:
        """Analisis soal untuk menentukan tingkat keketatan scoring"""
        if not question:
            return 'standar'
        
        question_lower = question.lower()
        
        # Check patterns untuk setiap jenis soal
        for q_type, patterns in self.question_patterns.items():
            for pattern in patterns:
                if re.search(pattern, question_lower):
                    return q_type
        
        # Jika tidak ada pattern yang match, gunakan scoring standar
        return 'standar'
    
    def _load_custom_mappings(self) -> Dict:
        mappings = {}
        filepath = self.mappings_file
        try:
            if os.path.exists(filepath):
                df = pd.read_csv(filepath)
                required_cols = ['category', 'key', 'values']
                if not all(col in df.columns for col in required_cols):
                    logging.warning(f"Missing required columns in {self.mappings_file}")
                    return mappings
                for _, row in df.iterrows():
                    category = str(row['category']).strip()
                    key = str(row['key']).lower().strip()
                    values = [v.strip() for v in str(row['values']).split(';')]
                    if category not in mappings:
                        mappings[category] = {}
                    mappings[category][key] = values
                logging.info(f"Loaded {len(mappings)} categories from custom mappings")
        except Exception as e:
            logging.warning(f"Failed to load custom mappings: {e}")
        return mappings
    
    def extract_meaningful_words(self, text: str) -> set:
        """Extract meaningful words (length > 2 characters)"""
        words = re.findall(r'\w+', text.lower())
        return set(word for word in words if len(word) > 2)
    
    def calculate_context_relevance(self, student_answer: str, key_answer: str) -> float:
        """Calculate how relevant the student answer is to the key answer context"""
        student_words = self.extract_meaningful_words(student_answer)
        key_words = self.extract_meaningful_words(key_answer)
        
        if not key_words:
            return 0.7  # More neutral for short answers
        
        # Word overlap ratio
        word_overlap = len(student_words.intersection(key_words))
        overlap_ratio = word_overlap / len(key_words)
        
        # Semantic context using IndoBERT
        semantic_context = 0.0
        if self.sentence_model:
            try:
                student_emb = self.sentence_model.encode([student_answer])
                key_emb = self.sentence_model.encode([key_answer])
                semantic_context = float(cosine_similarity(student_emb, key_emb)[0][0])
            except Exception as e:
                semantic_context = overlap_ratio
        else:
            semantic_context = overlap_ratio
        
        # Balanced combination
        context_score = (overlap_ratio * 0.4) + (semantic_context * 0.6)
        return min(1.0, context_score)
    
    def check_custom_mapping(self, student_answer: str, key_answer: str) -> Tuple[float, str]:
        student_lower = student_answer.lower().strip()
        key_lower = key_answer.lower().strip()
        
        if student_lower == key_lower:
            return 1.0, "exact_match"
        
        for category, mappings in self.custom_mappings.items():
            if student_lower in mappings:
                for mapped_value in mappings[student_lower]:
                    if (key_lower in mapped_value.lower() or 
                        mapped_value.lower() in key_lower or
                        fuzz.ratio(key_lower, mapped_value.lower()) > 80):
                        confidence = 0.90 if category == 'istilah_ilmiah' else 0.85
                        return confidence, f"custom_mapping_{category}"
            
            if key_lower in mappings:
                for mapped_value in mappings[key_lower]:
                    if (student_lower in mapped_value.lower() or 
                        mapped_value.lower() in student_lower or
                        fuzz.ratio(student_lower, mapped_value.lower()) > 80):
                        return 0.80, f"reverse_custom_mapping_{category}"
        
        return 0.0, "no_custom_match"
    
    def calculate_semantic_similarity(self, student_answer: str, key_answer: str) -> float:
        if not self.sentence_model:
            return 0.3 
        try:
            student_emb = self.sentence_model.encode([student_answer])
            key_emb = self.sentence_model.encode([key_answer])
            similarity = cosine_similarity(student_emb, key_emb)[0][0]
            return float(similarity)
        except Exception as e:
            logging.warning(f"Error calculating semantic similarity: {e}")
            return 0.3
    
    def calculate_fuzzy_similarity(self, student_answer: str, key_answer: str) -> float:
        return fuzz.ratio(student_answer.lower(), key_answer.lower()) / 100.0
    
    def calculate_keyword_overlap(self, student_answer: str, key_answer: str) -> float:
        student_words = set(student_answer.lower().split())
        key_words = set(key_answer.lower().split())
        if not key_words:
            return 0.0
        overlap = len(student_words.intersection(key_words))
        return overlap / len(key_words)
    
    def hybrid_scoring_strategy(self, student_answer: str, key_answer: str, question: str = "") -> Dict[str, Any]:
        # Analyze question context to determine scoring strictness
        question_type = self.analyze_question_context(question)
        config = self.scoring_configs[question_type]
        
        # Calculate all components
        custom_score, custom_type = self.check_custom_mapping(student_answer, key_answer)
        semantic_score = self.calculate_semantic_similarity(student_answer, key_answer)
        fuzzy_score = self.calculate_fuzzy_similarity(student_answer, key_answer)
        keyword_score = self.calculate_keyword_overlap(student_answer, key_answer)
        context_score = self.calculate_context_relevance(student_answer, key_answer)
        exact_bonus = 1.0 if student_answer.lower().strip() == key_answer.lower().strip() else 0.0
        
        # PRIORITY 1: Perfect exact match always gets perfect score
        if exact_bonus == 1.0:
            final_score = 1.0  # Perfect 100%
            reasoning = f"Jawaban sama persis dengan kunci jawaban ({config['description']})"
            penalty_multiplier = 1.0
        
        # PRIORITY 2: Near perfect matches (adjusted by question type)
        elif fuzzy_score > 0.95 and len(student_answer.split()) <= 3:
            # Adjust near-exact scoring based on question strictness
            if question_type == 'faktual_ketat':
                final_score = 0.92  # Sedikit lebih rendah untuk soal faktual ketat
            else:
                final_score = 0.95  # Lebih tinggi untuk soal lainnya
            reasoning = f"Jawaban hampir sama persis ({config['description']})"
            penalty_multiplier = 1.0
        
        # PRIORITY 3: Strong custom mapping
        elif custom_score > 0.85:
            final_score = custom_score
            reasoning = f"Strong domain knowledge match: {custom_type} ({config['description']})"
            penalty_multiplier = 1.0
        
        # PRIORITY 4: Context-aware scoring with dynamic penalties
        else:
            # Dynamic penalty system based on question type
            if context_score < self.context_thresholds['irrelevant']:
                penalty_multiplier = config['penalty_harsh']
                reasoning = f"Jawaban tidak relevan dengan kunci jawaban ({config['description']})"
            elif context_score < self.context_thresholds['somewhat_relevant']:
                penalty_multiplier = config['penalty_medium']
                reasoning = f"Jawaban kurang relevan dengan kunci jawaban ({config['description']})"
            elif context_score < self.context_thresholds['relevant']:
                penalty_multiplier = config['penalty_light']
                reasoning = f"Jawaban cukup relevan dengan kunci jawaban ({config['description']})"
            else:
                penalty_multiplier = 1.0
                reasoning = f"Jawaban relevan dengan kunci jawaban ({config['description']})"
            
            # Adaptive scoring branches based on question type
            if semantic_score > 0.7:
                # High semantic similarity - weight adjusted by question type
                weights = {
                    'semantic': config['semantic_weight'],
                    'fuzzy': config['fuzzy_weight'] * 0.3,
                    'keyword': 0.1,
                    'exact': config['exact_weight'] * 0.1
                }
                final_score = (
                    semantic_score * weights['semantic'] +
                    fuzzy_score * weights['fuzzy'] + 
                    keyword_score * weights['keyword'] +
                    exact_bonus * weights['exact']
                ) * penalty_multiplier
                reasoning = f"High semantic similarity. {reasoning}"
                
            elif fuzzy_score > 0.85 and len(student_answer.split()) <= 2:
                # String similarity importance varies by question type
                if question_type in ['faktual_ketat', 'definisi']:
                    # Soal faktual/definisi: fuzzy matching penting untuk detect typo
                    weights = {'semantic': 0.3, 'fuzzy': 0.5, 'keyword': 0.15, 'exact': 0.05}
                elif question_type in ['terbuka', 'ciri_sifat']:
                    # Soal terbuka: semantic lebih penting dari fuzzy
                    weights = {'semantic': 0.6, 'fuzzy': 0.2, 'keyword': 0.15, 'exact': 0.05}
                else:
                    # Balanced untuk tipe lainnya
                    weights = {'semantic': 0.4, 'fuzzy': 0.4, 'keyword': 0.1, 'exact': 0.1}
                
                final_score = (
                    semantic_score * weights['semantic'] +
                    fuzzy_score * weights['fuzzy'] + 
                    keyword_score * weights['keyword'] +
                    exact_bonus * weights['exact']
                ) * penalty_multiplier
                reasoning = f"High string similarity. {reasoning}"
                
            elif custom_score > 0.3:
                # Medium custom mapping
                weights = {'semantic': 0.4, 'custom': 0.4, 'fuzzy': 0.1, 'keyword': 0.1}
                final_score = (
                    semantic_score * weights['semantic'] +
                    custom_score * weights['custom'] +
                    fuzzy_score * weights['fuzzy'] + 
                    keyword_score * weights['keyword']
                ) * penalty_multiplier
                reasoning = f"Medium domain knowledge match. {reasoning}"
                
            else:
                # Balanced approach dengan kesadaran jenis soal
                if question_type in ['terbuka', 'ciri_sifat']:
                    # Soal terbuka: favor pemahaman semantik
                    weights = {'semantic': 0.65, 'fuzzy': 0.15, 'keyword': 0.15, 'exact': 0.05}
                elif question_type in ['faktual_ketat', 'definisi']:
                    # Soal ketat: favor exact matches dan fuzzy
                    weights = {'semantic': 0.35, 'fuzzy': 0.35, 'keyword': 0.25, 'exact': 0.05}
                else:
                    # Default balanced
                    weights = {'semantic': 0.5, 'fuzzy': 0.25, 'keyword': 0.15, 'exact': 0.1}
                
                final_score = (
                    semantic_score * weights['semantic'] +
                    fuzzy_score * weights['fuzzy'] + 
                    keyword_score * weights['keyword'] +
                    exact_bonus * weights['exact']
                ) * penalty_multiplier
                reasoning = f"Balanced scoring approach. {reasoning}"
        
        return {
            'final_score': min(1.0, final_score),
            'component_scores': {
                'semantic_similarity': semantic_score,
                'context_relevance': context_score,
                'fuzzy_matching': fuzzy_score,
                'keyword_overlap': keyword_score,
                'exact_match_bonus': exact_bonus,
                'custom_mapping': custom_score
            },
            'reasoning': reasoning,
            'custom_match_type': custom_type,
            'penalty_applied': penalty_multiplier < 1.0,
            'penalty_multiplier': penalty_multiplier,
            'question_type': question_type,
            'scoring_config': config['description']
        }
    
    def grade_short_answer(self, student_answer: str, key_answers: List[str], question_weight: float = 1.0, question: str = "") -> Dict[str, Any]:
        if not student_answer or not student_answer.strip():
            return {
                'score': 0,
                'grade': 'E',
                'level': 'Tidak Dijawab',
                'feedback': 'Soal tidak dijawab',
                'reasoning': 'Empty answer',
                'original_answer': student_answer,
                'best_key_match': '',
                'final_similarity_score': 0.0,
                'component_scores': {
                    'semantic_similarity': 0.0,
                    'context_relevance': 0.0,
                    'fuzzy_matching': 0.0,
                    'keyword_overlap': 0.0,
                    'exact_match_bonus': 0.0,
                    'custom_mapping': 0.0
                },
                'question_type': 'standar',
                'scoring_config': 'No answer provided'
            }
        
        if isinstance(key_answers, str):
            key_answers = [key_answers]
        
        processed_student = student_answer.lower().strip()
        best_result = None
        best_score = 0.0
        best_key_match = ""
        
        for key_answer in key_answers:
            result = self.hybrid_scoring_strategy(processed_student, key_answer, question)
            if result['final_score'] > best_score:
                best_score = result['final_score']
                best_result = result
                best_key_match = key_answer
        
        percentage_score = best_score * 100 * question_weight
        
        if best_score >= self.similarity_thresholds['excellent']:
            level = 'Excellent'
            grade = 'A'
        elif best_score >= self.similarity_thresholds['good']:
            level = 'Good' 
            grade = 'B'
        elif best_score >= self.similarity_thresholds['fair']:
            level = 'Fair'
            grade = 'C'
        elif best_score >= self.similarity_thresholds['poor']:
            level = 'Poor'
            grade = 'D'
        else:
            level = 'Very Poor'
            grade = 'E'
        
        feedback = f"{level}. {best_result['reasoning']}"
        if best_result['custom_match_type'] != 'no_custom_match':
            feedback += f" (Matched via {best_result['custom_match_type']})"
        
        return {
            'score': round(percentage_score, 1),
            'grade': grade,
            'level': level,
            'feedback': feedback,
            'original_answer': student_answer,
            'best_key_match': best_key_match,
            'final_similarity_score': best_score,
            'component_scores': best_result['component_scores'],
            'reasoning': best_result['reasoning'],
            'question_type': best_result['question_type'],
            'scoring_config': best_result['scoring_config']
        }

_grader_instance = None

def get_grader() -> ImprovedShortAnswerGrader:
    global _grader_instance
    if _grader_instance is None:
        _grader_instance = ImprovedShortAnswerGrader()
    return _grader_instance

def grade_single_answer(student_answer: str, key_answer: str, question: str = "") -> Dict[str, Any]:
    grader = get_grader()
    return grader.grade_short_answer(student_answer, [key_answer], question=question)

def grade_multiple_answers(answers_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grader = get_grader()
    results = []
    
    for i, data in enumerate(answers_data):
        try:
            result = grader.grade_short_answer(
                data['student_answer'], 
                [data['key_answer']],
                question=data.get('question', "")
            )
            result['question_id'] = data.get('question_id', i + 1)
            result['student_id'] = data.get('student_id')
            result['soal_id'] = data.get('soal_id')
            results.append(result)
        except Exception as e:
            logging.error(f"Error grading answer {i}: {e}")
            results.append({
                'question_id': data.get('question_id', i + 1),
                'student_id': data.get('student_id'),
                'soal_id': data.get('soal_id'),
                'error': str(e),
                'score': 0,
                'grade': 'E',
                'level': 'Error',
                'feedback': f'Error during grading: {str(e)}',
                'original_answer': data.get('student_answer', ''),
                'best_key_match': data.get('key_answer', ''),
                'final_similarity_score': 0.0,
                'question_type': 'error',
                'scoring_config': 'Error occurred'
            })
    
    return results