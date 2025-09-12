import torch
from torch import nn
from tqdm import tqdm
import os
import Levenshtein

from crnn_dataset import get_split, TRDataset
from crnn_model import CRNN
from crnn_decoder import ctc_decode

import argparse

# Example Usage
# python crnn_evaluate.py --cp_path runs/crnn/train/best_model.pt --set val

def get_input_args():
    """
    Get command-line arguments using argparse.

    Returns:
        argparse.Namespace: Parsed arguments.
    """
    parser = argparse.ArgumentParser(description="CRNN Model Evaluation for Handwritten Text")
    parser.add_argument("--cp_path", type=str, default='runs/crnn/train/best_model.pt', help="Model checkpoint path.")
    parser.add_argument("--root_dir", type=str, default="dataset", help="Root directory containing dataset.")
    parser.add_argument("--labels_file", type=str, default="dummy", help="Dummy parameter (auto-detected for new structure).")
    parser.add_argument("--set", type=str, default="val", choices=["train", "val", "test"], help="Dataset split to evaluate.")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size for evaluation.")
    parser.add_argument("--device", type=str, default="auto", help="Device to use: 'cpu', 'cuda', or 'auto'.")
    parser.add_argument("--max_iter", type=int, default=None, help="Maximum number of batches to evaluate (None for all).")
    parser.add_argument("--show_examples", type=int, default=10, help="Number of wrong prediction examples to show.")
    return parser.parse_args()

def calculate_cer(pred_text, real_text):
    """
    Calculate Character Error Rate (CER).
    
    Parameters:
    - pred_text (str): Predicted text.
    - real_text (str): Ground truth text.
    
    Returns:
    - float: Character Error Rate.
    """
    if len(real_text) == 0:
        return 0.0 if len(pred_text) == 0 else 1.0
    
    distance = Levenshtein.distance(pred_text, real_text)
    return distance / len(real_text)

def calculate_wer(pred_text, real_text):
    """
    Calculate Word Error Rate (WER).
    
    Parameters:
    - pred_text (str): Predicted text.
    - real_text (str): Ground truth text.
    
    Returns:
    - float: Word Error Rate.
    """
    pred_words = pred_text.split()
    real_words = real_text.split()
    
    if len(real_words) == 0:
        return 0.0 if len(pred_words) == 0 else 1.0
    
    distance = Levenshtein.distance(pred_words, real_words)
    return distance / len(real_words)

def evaluate(crnn, dataloader, criterion, max_iter=None, show_progress=True):
    """
    Evaluate a CRNN model on a given dataloader with CER and WER metrics.

    Parameters:
    - crnn (torch.nn.Module): The CRNN model to be evaluated.
    - dataloader (torch.utils.data.DataLoader): DataLoader containing evaluation data.
    - criterion (torch.nn.Module): The loss criterion for evaluation.
    - max_iter (int): Maximum number of iterations to evaluate. If None, evaluate on the entire dataloader.
    - show_progress (bool): Whether to show progress bar.

    Returns:
    - dict: Dictionary containing evaluation metrics including loss, accuracy, CER, WER, and wrong_cases.
    """
    crnn.eval()

    tot_count = 0
    tot_loss = 0.0
    tot_correct = 0
    wrong_cases = []
    
    # Character and word-level metrics
    char_correct = 0
    char_total = 0
    total_cer = 0.0
    total_wer = 0.0

    pbar_total = min(max_iter, len(dataloader)) if max_iter else len(dataloader)
    pbar = tqdm(total=pbar_total, desc="Evaluating") if show_progress else None

    with torch.no_grad():
        for i, data in enumerate(dataloader):
            if max_iter and i >= max_iter:
                break
                
            device = next(crnn.parameters()).device
            images, targets, target_lengths = [d.to(device) for d in data]

            # Forward pass
            logits = crnn(images)
            log_probs = torch.nn.functional.log_softmax(logits, dim=2)

            batch_size = images.size(0)
            input_lengths = torch.LongTensor([logits.size(0)] * batch_size).to(device)
            target_lengths_flat = torch.flatten(target_lengths).to(device)

            # Calculate loss
            loss = criterion(log_probs, targets, input_lengths, target_lengths_flat)

            # Decode predictions
            preds = ctc_decode(log_probs, label2char=TRDataset.LABEL2CHAR)
            reals = targets.cpu().numpy().tolist()
            target_lengths_list = target_lengths.cpu().numpy().tolist()

            tot_count += batch_size
            tot_loss += loss.item() * batch_size  # Weight by batch size

            # Process each sample in the batch
            target_length_counter = 0
            for pred, target_length in zip(preds, target_lengths_list):
                real = reals[target_length_counter:target_length_counter + target_length]
                target_length_counter += target_length
                
                # Convert to text
                real_text = ''.join([TRDataset.LABEL2CHAR.get(l, '') for l in real])
                pred_text = ''.join(pred)
                
                # Sequence-level accuracy
                if pred_text == real_text:
                    tot_correct += 1
                else:
                    wrong_cases.append((real_text, pred_text))
                
                # Character-level accuracy
                char_correct += sum(1 for r, p in zip(real_text, pred_text) if r == p)
                char_total += max(len(real_text), len(pred_text))
                
                # CER and WER calculation
                total_cer += calculate_cer(pred_text, real_text)
                total_wer += calculate_wer(pred_text, real_text)

            if pbar:
                pbar.update(1)
        
        if pbar:
            pbar.close()

    # Calculate metrics
    avg_loss = tot_loss / tot_count if tot_count > 0 else float('inf')
    seq_accuracy = tot_correct / tot_count if tot_count > 0 else 0.0
    char_accuracy = char_correct / char_total if char_total > 0 else 0.0
    avg_cer = total_cer / tot_count if tot_count > 0 else 0.0
    avg_wer = total_wer / tot_count if tot_count > 0 else 0.0

    evaluation = {
        'loss': avg_loss,
        'acc': seq_accuracy,
        'char_acc': char_accuracy,
        'cer': avg_cer,
        'wer': avg_wer,
        'wrong_cases': wrong_cases,
        'total_samples': tot_count,
        'correct_samples': tot_correct
    }
    return evaluation

def analyze_errors(wrong_cases, max_examples=10):
    """
    Analyze and display error patterns.
    
    Parameters:
    - wrong_cases (list): List of (ground_truth, prediction) tuples.
    - max_examples (int): Maximum number of examples to show.
    """
    if not wrong_cases:
        print("No wrong predictions found!")
        return
    
    print(f"\n=== ERROR ANALYSIS ===")
    print(f"Total wrong predictions: {len(wrong_cases)}")
    
    # Show examples
    print(f"\nFirst {min(max_examples, len(wrong_cases))} wrong predictions:")
    print("-" * 80)
    
    for i, (real, pred) in enumerate(wrong_cases[:max_examples]):
        cer = calculate_cer(pred, real)
        wer = calculate_wer(pred, real)
        
        print(f"Example {i+1}:")
        print(f"  Ground Truth: '{real}'")
        print(f"  Prediction:   '{pred}'")
        print(f"  Length GT/Pred: {len(real)}/{len(pred)}")
        print(f"  CER: {cer:.3f}, WER: {wer:.3f}")
        print("-" * 40)
    
    # Analyze common error patterns
    print("\n=== COMMON ERROR PATTERNS ===")
    
    # Length differences
    length_diffs = [len(pred) - len(real) for real, pred in wrong_cases]
    avg_length_diff = sum(length_diffs) / len(length_diffs)
    print(f"Average length difference (pred - real): {avg_length_diff:.2f}")
    
    # CER and WER statistics
    cers = [calculate_cer(pred, real) for real, pred in wrong_cases]
    wers = [calculate_wer(pred, real) for real, pred in wrong_cases]
    print(f"Average CER on wrong predictions: {sum(cers)/len(cers):.3f}")
    print(f"Average WER on wrong predictions: {sum(wers)/len(wers):.3f}")
    
    # Character substitution analysis
    char_substitutions = {}
    for real, pred in wrong_cases[:100]:  # Analyze first 100 for performance
        for r_char, p_char in zip(real, pred):
            if r_char != p_char:
                key = f"'{r_char}' -> '{p_char}'"
                char_substitutions[key] = char_substitutions.get(key, 0) + 1
    
    if char_substitutions:
        print("\nMost common character substitutions:")
        sorted_subs = sorted(char_substitutions.items(), key=lambda x: x[1], reverse=True)
        for sub, count in sorted_subs[:10]:
            print(f"  {sub}: {count} times")

def main():
    args = get_input_args()
    
    # Device setup
    if args.device == "auto":
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    else:
        device = torch.device(args.device)
    
    print(f"Using device: {device}")
    
    # Load checkpoint
    if not os.path.exists(args.cp_path):
        print(f"Error: Checkpoint file not found: {args.cp_path}")
        return
    
    print(f"Loading checkpoint from: {args.cp_path}")
    config = torch.load(args.cp_path, map_location=device)
    
    # Extract configuration
    img_height = config.get('img_height', 64)
    img_width = config.get('img_width', 512)
    map_to_seq = config.get('map_to_seq', 256)
    rnn_hidden = config.get('rnn_hidden', 256)
    
    print(f"Model configuration:")
    print(f"  Image size: {img_height}x{img_width}")
    print(f"  Map to seq: {map_to_seq}")
    print(f"  RNN hidden: {rnn_hidden}")
    
    # Load dataset
    print(f"\nLoading {args.set} dataset...")
    try:
        dataloader = get_split(
            root_dir=args.root_dir,
            labels=args.labels_file,  # This will be ignored with new structure
            set=args.set,
            img_width=img_width,
            img_height=img_height,
            batch_size=args.batch_size
        )
        
        if dataloader is None:
            raise ValueError(f"{args.set} dataset not found")
            
        print(f"Dataset loaded: {len(dataloader.dataset)} samples")
        
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print("\nMake sure your dataset structure is:")
        print("dataset/")
        print("├── train_v2/train/")
        print("├── validation_v2/validation/")
        print("├── test_v2/test/")
        print("├── written_name_train_v2.csv")
        print("├── written_name_validation_v2.csv")
        print("└── written_name_test_v2.csv")
        return
    
    # Create model
    num_class = len(TRDataset.LABEL2CHAR) + 1
    print(f"Number of classes: {num_class}")
    
    crnn = CRNN(
        img_channel=1,
        img_height=img_height,
        img_width=img_width,
        num_class=num_class,
        map_to_seq=map_to_seq,
        rnn_hidden=rnn_hidden
    )
    
    # Load model weights
    if 'state_dict' in config:
        try:
            crnn.load_state_dict(config['state_dict'])
            print("Model weights loaded successfully")
        except Exception as e:
            print(f"Error loading model weights: {e}")
            return
    else:
        print("No model weights found in checkpoint")
        return

    crnn.to(device)
    
    # Model info
    total_params = sum(p.numel() for p in crnn.parameters())
    print(f"Model parameters: {total_params:,}")
    
    # Evaluation
    criterion = nn.CTCLoss(reduction='mean', zero_infinity=True)
    
    print(f"\nEvaluating on {args.set} set...")
    evaluation = evaluate(crnn, dataloader, criterion, max_iter=args.max_iter)
    
    # Results
    print(f"\n=== EVALUATION RESULTS ===")
    print(f"Dataset: {args.set}")
    print(f"Total samples: {evaluation['total_samples']}")
    print(f"Correct predictions: {evaluation['correct_samples']}")
    print(f"Loss: {evaluation['loss']:.4f}")
    print(f"Sequence Accuracy: {evaluation['acc']:.4f} ({evaluation['acc']*100:.2f}%)")
    print(f"Character Accuracy: {evaluation['char_acc']:.4f} ({evaluation['char_acc']*100:.2f}%)")
    print(f"Character Error Rate (CER): {evaluation['cer']:.4f} ({evaluation['cer']*100:.2f}%)")
    print(f"Word Error Rate (WER): {evaluation['wer']:.4f} ({evaluation['wer']*100:.2f}%)")
    
    # Error analysis
    if evaluation['wrong_cases'] and args.show_examples > 0:
        analyze_errors(evaluation['wrong_cases'], args.show_examples)
    
    # Save detailed results if there are errors
    if evaluation['wrong_cases']:
        import pandas as pd
        
        # Create detailed results with CER and WER
        detailed_results = []
        for real, pred in evaluation['wrong_cases']:
            cer = calculate_cer(pred, real)
            wer = calculate_wer(pred, real)
            detailed_results.append({
                'ground_truth': real, 
                'prediction': pred, 
                'correct': False,
                'cer': cer,
                'wer': wer
            })
        
        results_df = pd.DataFrame(detailed_results)
        
        # Add correct predictions for complete picture
        correct_samples = evaluation['total_samples'] - len(evaluation['wrong_cases'])
        for _ in range(min(correct_samples, 1000)):  # Limit for file size
            results_df = pd.concat([results_df, pd.DataFrame([{
                'ground_truth': 'N/A', 'prediction': 'N/A', 'correct': True,
                'cer': 0.0, 'wer': 0.0
            }])], ignore_index=True)
        
        save_path = f"evaluation_results_{args.set}.csv"
        results_df.to_csv(save_path, index=False)
        print(f"\nDetailed results saved to: {save_path}")
    
if __name__ == "__main__":
    main()