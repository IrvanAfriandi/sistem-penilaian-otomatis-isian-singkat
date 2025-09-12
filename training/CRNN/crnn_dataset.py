import os
import numpy as np 
import pandas as pd
import torch
from PIL import Image, ImageOps
import warnings
from pathlib import Path
warnings.filterwarnings('ignore')

torch.manual_seed(42)

class TRDataset(torch.utils.data.Dataset):
    """
    Flexible PyTorch dataset for Kaggle handwriting recognition.
    Auto-detects dataset structure and adapts to different organizations.
    """

    # Extended character set optimized for Indonesian names
    CHARS = ('0123456789'
             'abcdefghijklmnopqrstuvwxyz'
             'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
             ' .,!?:;-()[]{}"\'/\\@#$%^&*+=~`|_<>'
             'À ÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß')
    
    CHAR2LABEL = {char: i + 1 for i, char in enumerate(CHARS)}
    LABEL2CHAR = {label: char for char, label in CHAR2LABEL.items()}
    
    def __init__(self, root_dir=None, labels=None, images=None, paths=None, 
                 img_height=64, img_width=512, augment=False):
        """
        Flexible dataset initialization that adapts to various structures.
        """
        self.img_height = img_height
        self.img_width = img_width
        self.img_paths = None
        self.labels = None
        self.image = False
        self.augment = augment

        if paths:
            self.img_paths = paths
        elif images:
            self.img_paths = images
            self.image = True
        else:
            self.img_paths, self.labels = self.read_labels_flexible(root_dir, labels)

    def __len__(self):
        return len(self.img_paths)

    def __getitem__(self, idx):
        """Enhanced getitem with better error handling"""
        try:
            if self.image:
                image = self.img_paths[idx]
            else:
                img_path = self.img_paths[idx]
                image = Image.open(img_path).convert('RGB')
                
            if self.augment and self.labels:
                image = self.apply_augmentation(image)
        
            image = preprocess(image, self.img_height, self.img_width)
            
            if self.labels:
                label = str(self.labels[idx])
                label = self.clean_text(label)
                
                target = [self.CHAR2LABEL.get(c, 0) for c in label]
                target_length = [len(target)]

                target = torch.LongTensor(target)
                target_length = torch.LongTensor(target_length)
                return image, target, target_length
            else:
                return image
                
        except Exception as e:
            print(f'Error loading sample {idx}: {e}')
            if idx + 1 < len(self):
                return self[idx + 1]
            else:
                return self[0]

    def clean_text(self, text):
        """Clean and normalize text"""
        if pd.isna(text) or text.lower() in ['nan', 'none', '']:
            return ""
        
        text = str(text).strip()
        text = ' '.join(text.split())
        
        cleaned_chars = []
        for char in text:
            if char in self.CHAR2LABEL:
                cleaned_chars.append(char)
            elif char.isalnum() or char.isspace():
                cleaned_chars.append(' ' if char.isspace() else char)
        
        return ''.join(cleaned_chars)
    
    def apply_augmentation(self, image):
        """Apply simple augmentation to training images"""
        import random
        
        if random.random() < 0.3:
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Brightness(image)
            factor = random.uniform(0.8, 1.2)
            image = enhancer.enhance(factor)
        
        if random.random() < 0.2:
            angle = random.uniform(-2, 2)
            image = image.rotate(angle, expand=False, fillcolor=(255, 255, 255))
        
        return image

    def find_csv_files_flexible(self, root_dir):
        """Flexibly find CSV files anywhere in the directory tree"""
        csv_files = []
        
        # Search for CSV files recursively
        for root, dirs, files in os.walk(root_dir):
            for file in files:
                if file.lower().endswith('.csv'):
                    full_path = os.path.join(root, file)
                    
                    # Quick check if it's a handwriting dataset CSV
                    try:
                        df = pd.read_csv(full_path, nrows=1)
                        columns_upper = [col.upper() for col in df.columns]
                        
                        if 'FILENAME' in columns_upper and 'IDENTITY' in columns_upper:
                            # Determine split type
                            if 'train' in file.lower():
                                split_type = 'train'
                            elif 'valid' in file.lower() or 'val' in file.lower():
                                split_type = 'val'
                            elif 'test' in file.lower():
                                split_type = 'test'
                            else:
                                split_type = 'unknown'
                            
                            csv_files.append({
                                'path': full_path,
                                'split': split_type,
                                'filename': file,
                                'relative_path': os.path.relpath(full_path, root_dir)
                            })
                            
                    except Exception as e:
                        continue
        
        return csv_files

    def find_image_directories_flexible(self, root_dir):
        """Flexibly find image directories"""
        image_dirs = []
        
        for root, dirs, files in os.walk(root_dir):
            # Check if this directory contains images
            image_files = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff'))]
            
            if len(image_files) > 10:  # Threshold for considering it an image directory
                rel_path = os.path.relpath(root, root_dir)
                
                # Try to determine split type from path
                path_lower = rel_path.lower()
                if 'train' in path_lower:
                    split_type = 'train'
                elif 'valid' in path_lower or 'val' in path_lower:
                    split_type = 'val'
                elif 'test' in path_lower:
                    split_type = 'test'
                else:
                    split_type = 'unknown'
                
                image_dirs.append({
                    'path': root,
                    'split': split_type,
                    'relative_path': rel_path,
                    'image_count': len(image_files),
                    'sample_files': image_files[:3]
                })
        
        return image_dirs

    def read_labels_flexible(self, root_dir, labels_hint=None):
        """
        Flexible label reading that adapts to different dataset structures.
        """
        print(f"📁 Flexible dataset loading from: {root_dir}")
        
        # Find all CSV files
        csv_files = self.find_csv_files_flexible(root_dir)
        
        if not csv_files:
            raise FileNotFoundError("No handwriting dataset CSV files found (need FILENAME, IDENTITY columns)")
        
        print(f"📄 Found {len(csv_files)} CSV files:")
        for csv_info in csv_files:
            print(f"   {csv_info['split']}: {csv_info['relative_path']}")
        
        # Find image directories
        image_dirs = self.find_image_directories_flexible(root_dir)
        
        if not image_dirs:
            raise FileNotFoundError("No image directories found")
        
        print(f"🖼️ Found {len(image_dirs)} image directories:")
        for img_info in image_dirs:
            print(f"   {img_info['split']}: {img_info['relative_path']} ({img_info['image_count']} images)")
        
        # Determine which CSV and image directory to use
        # Prioritize: train > val > test > unknown
        priority_order = ['train', 'val', 'test', 'unknown']
        
        selected_csv = None
        selected_img_dir = None
        
        for split_type in priority_order:
            # Find CSV for this split
            csv_matches = [csv for csv in csv_files if csv['split'] == split_type]
            img_matches = [img for img in image_dirs if img['split'] == split_type]
            
            if csv_matches and img_matches:
                selected_csv = csv_matches[0]
                selected_img_dir = img_matches[0]
                break
        
        if not selected_csv or not selected_img_dir:
            # Fallback: use first available
            selected_csv = csv_files[0]
            selected_img_dir = image_dirs[0]
        
        print(f"🎯 Using:")
        print(f"   CSV: {selected_csv['relative_path']} ({selected_csv['split']})")
        print(f"   Images: {selected_img_dir['relative_path']} ({selected_img_dir['split']})")
        
        # Load the selected CSV
        csv_path = selected_csv['path']
        images_dir = selected_img_dir['path']
        
        try:
            df = pd.read_csv(csv_path, encoding='utf-8')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(csv_path, encoding='latin1')
            except:
                df = pd.read_csv(csv_path, encoding='cp1252')
        
        print(f"📊 CSV loaded: {df.shape[0]} rows, {df.shape[1]} columns")
        
        # Find filename and identity columns
        filename_col = None
        identity_col = None
        
        for col in df.columns:
            if col.upper() == 'FILENAME':
                filename_col = col
            elif col.upper() == 'IDENTITY':
                identity_col = col
        
        if not filename_col or not identity_col:
            raise ValueError("CSV must have FILENAME and IDENTITY columns")
        
        print(f"🏷️ Columns: {filename_col} → {identity_col}")
        
        # Process data
        img_data, label_data = [], []
        valid_count = 0
        skipped_count = 0
        
        for idx, row in df.iterrows():
            try:
                filename = str(row[filename_col]).strip()
                identity = str(row[identity_col]).strip()
                
                if not identity or identity.lower() in ['nan', 'none', '']:
                    skipped_count += 1
                    continue
                
                # Find image file flexibly
                image_path = self.find_image_file_flexible(images_dir, filename)
                if not image_path:
                    skipped_count += 1
                    continue
                
                img_data.append(image_path)
                label_data.append(identity)
                valid_count += 1
                
            except Exception as e:
                skipped_count += 1
                continue
        
        print(f"✅ Loaded {valid_count} samples, skipped {skipped_count}")
        
        if valid_count == 0:
            raise ValueError("No valid samples found")
        
        return img_data, label_data
    
    def find_image_file_flexible(self, images_dir, filename):
        """Flexibly find image file with various naming patterns"""
        if not filename:
            return None
            
        # Try direct path first
        direct_path = os.path.join(images_dir, filename)
        if os.path.exists(direct_path):
            return direct_path
        
        # Try different extensions
        base_name = os.path.splitext(filename)[0]
        extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.JPG', '.PNG', '.JPEG']
        
        for ext in extensions:
            test_path = os.path.join(images_dir, f'{base_name}{ext}')
            if os.path.exists(test_path):
                return test_path
        
        # Try case-insensitive search
        try:
            files_in_dir = os.listdir(images_dir)
            filename_lower = filename.lower()
            base_lower = base_name.lower()
            
            for file_in_dir in files_in_dir:
                if file_in_dir.lower() == filename_lower:
                    return os.path.join(images_dir, file_in_dir)
                
                # Try matching base name
                file_base = os.path.splitext(file_in_dir)[0].lower()
                if file_base == base_lower:
                    return os.path.join(images_dir, file_in_dir)
        except:
            pass
        
        return None

def preprocess(img, height, width):
    """
    Enhanced image preprocessing with forced width constraint.
    
    Strategy:
    1. Convert to grayscale
    2. Resize height to target height (64px) maintaining aspect ratio
    3. If width < target width (512px): pad with white pixels on the right
    4. If width > target width (512px): force resize to target width (non-proportional)
    
    Args:
        img (PIL.Image): Input image
        height (int): Target height (64)
        width (int): Target width (512)
    
    Returns:
        torch.FloatTensor: Preprocessed image tensor with shape (1, height, width)
    """
    try:
        # Convert to grayscale
        if img.mode != 'L':
            image = img.convert('L')
        else:
            image = img
        
        # Auto-orient based on EXIF
        image = ImageOps.exif_transpose(image)
        
        # Get original dimensions
        orig_width, orig_height = image.size
        
        # Step 1: Resize height to target height maintaining aspect ratio
        aspect_ratio = orig_width / orig_height
        new_height = height
        new_width = int(height * aspect_ratio)
        
        # Resize with high quality resampling
        image = image.resize((new_width, new_height), resample=Image.LANCZOS)
        
        # Convert to numpy
        image = np.array(image)
        
        # Step 2: Handle width adjustment
        if new_width < width:
            # Pad with white pixels on the right
            pad_width = width - new_width
            image = np.pad(image, ((0, 0), (0, pad_width)), mode='constant', constant_values=255)
            
        elif new_width > width:
            # Force resize to target width (non-proportional)
            # Convert back to PIL for resize
            temp_image = Image.fromarray(image)
            image = temp_image.resize((width, height), resample=Image.LANCZOS)
            image = np.array(image)
        
        # If width equals target width, no additional processing needed
        
        # Ensure final dimensions are correct
        final_height, final_width = image.shape
        if final_height != height or final_width != width:
            # Final safety resize if dimensions still don't match
            temp_image = Image.fromarray(image)
            image = temp_image.resize((width, height), resample=Image.LANCZOS)
            image = np.array(image)
        
        # Add channel dimension and normalize
        image = image.reshape((1, height, width))
        image = image.astype(np.float32)
        
        # Normalize to [-1, 1]
        image = image / 255.0
        image = (image - 0.5) * 2.0
        
        return torch.FloatTensor(image)
        
    except Exception as e:
        # Only print actual errors, not normal processing info
        print(f"Error preprocessing image: {e}")
        # Return blank image as fallback
        blank = np.ones((1, height, width), dtype=np.float32) * -1
        return torch.FloatTensor(blank)

def collate_batch(batch):
    """Enhanced batch collation with error handling"""
    try:
        images, targets, target_lengths = zip(*batch)
        images = torch.stack(images, 0)
        targets = torch.cat(targets, 0)
        target_lengths = torch.cat(target_lengths, 0)
        return images, targets, target_lengths
    except Exception as e:
        print(f"Error collating batch: {e}")
        return torch.zeros(1, 1, 64, 512), torch.zeros(1, dtype=torch.long), torch.ones(1, dtype=torch.long)

def get_split_flexible(root_dir=None, labels=None, set=None, img_width=512, img_height=64, 
                      batch_size=32, splits=[0.8, 0.1, 0.1], augment_train=True):
    """
    Flexible data loading that adapts to various dataset structures.
    """
    print(f"📄 Flexible dataset loading from: {root_dir}")
    
    # Create a single dataset instance to analyze structure
    temp_dataset = TRDataset(root_dir=root_dir, labels=labels, 
                           img_width=img_width, img_height=img_height)
    
    # Find all available CSV files and image directories
    csv_files = temp_dataset.find_csv_files_flexible(root_dir)
    image_dirs = temp_dataset.find_image_directories_flexible(root_dir)
    
    datasets = {}
    loaders = {}
    
    # Create datasets for each available split
    for split_name in ['train', 'val', 'test']:
        # Find matching CSV and image directory
        csv_matches = [csv for csv in csv_files if csv['split'] == split_name]
        img_matches = [img for img in image_dirs if img['split'] == split_name]
        
        if csv_matches and img_matches:
            csv_info = csv_matches[0]
            img_info = img_matches[0]
            
            print(f"\n📂 Loading {split_name} dataset:")
            print(f"   CSV: {csv_info['relative_path']}")
            print(f"   Images: {img_info['relative_path']}")
            
            try:
                # Create temporary dataset for this specific split
                split_dataset = TRDataset(
                    root_dir=img_info['path'],  # Use image directory as root
                    labels=csv_info['filename'],  # CSV filename
                    img_width=img_width,
                    img_height=img_height,
                    augment=augment_train and (split_name == 'train')
                )
                
                # Override the CSV path resolution for this specific case
                split_dataset.img_paths, split_dataset.labels = split_dataset.load_specific_split(
                    csv_info['path'], img_info['path']
                )
                
                datasets[split_name] = split_dataset
                
                # Create data loader
                current_batch_size = batch_size if split_name == 'train' else min(batch_size, 16)
                shuffle = (split_name == 'train')
                
                loaders[split_name] = torch.utils.data.DataLoader(
                    datasets[split_name], 
                    batch_size=current_batch_size, 
                    shuffle=shuffle, 
                    collate_fn=collate_batch,
                    num_workers=0,
                    pin_memory=torch.cuda.is_available(),
                    drop_last=(split_name == 'train')
                )
                
                print(f"   ✅ {split_name}: {len(datasets[split_name])} samples")
                
            except Exception as e:
                print(f"   ❌ Error loading {split_name}: {e}")
                continue
        else:
            print(f"   ⚠️ {split_name} not found")
    
    if set:
        return loaders.get(set, None)
    
    return loaders.get('train'), loaders.get('val'), loaders.get('test')

# Add method to TRDataset class
def load_specific_split(self, csv_path, images_dir):
    """Load specific split from given CSV and image directory"""
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(csv_path, encoding='latin1')
        except:
            df = pd.read_csv(csv_path, encoding='cp1252')
    
    # Find columns
    filename_col = None
    identity_col = None
    
    for col in df.columns:
        if col.upper() == 'FILENAME':
            filename_col = col
        elif col.upper() == 'IDENTITY':
            identity_col = col
    
    if not filename_col or not identity_col:
        raise ValueError("CSV must have FILENAME and IDENTITY columns")
    
    # Process data
    img_data, label_data = [], []
    
    for idx, row in df.iterrows():
        try:
            filename = str(row[filename_col]).strip()
            identity = str(row[identity_col]).strip()
            
            if not identity or identity.lower() in ['nan', 'none', '']:
                continue
            
            image_path = self.find_image_file_flexible(images_dir, filename)
            if image_path:
                img_data.append(image_path)
                label_data.append(identity)
                
        except Exception:
            continue
    
    return img_data, label_data

# Add the method to the class
TRDataset.load_specific_split = load_specific_split

# Update main get_split function to use flexible version
def get_split(root_dir=None, labels=None, set=None, img_width=512, img_height=64, 
              batch_size=32, splits=[0.8, 0.1, 0.1], augment_train=True):
    """Main get_split function that uses flexible loading"""
    return get_split_flexible(root_dir, labels, set, img_width, img_height, 
                            batch_size, splits, augment_train)