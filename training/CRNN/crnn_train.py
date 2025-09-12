import os
import torch
from torch import nn
import pandas as pd
import time
import matplotlib.pyplot as plt
import seaborn as sns

from crnn_dataset import get_split, TRDataset
from crnn_model import CRNN
from crnn_decoder import ctc_decode
from crnn_evaluate import evaluate

import argparse

# Example Usage 
# python crnn_train.py --epochs 10 --lr 0.0005 --batch_size 32 --show_interval 100 
# To finetune a pretrained model, add --cp_path arguments e.g. checkpoints/crnn_config.pt

def get_input_args():
    """
    Get command-line arguments using argparse.

    Returns:
        argparse.Namespace: Parsed arguments.
    """
    parser = argparse.ArgumentParser(description="CRNN Training Parameters for Handwritten Text")
    parser.add_argument("--cp_path", type=str, default=None, help="Configuration checkpoint path for resuming training.")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training loop epochs.")
    parser.add_argument("--lr", type=float, default=0.0005, help="Training initial learning rate.")
    parser.add_argument("--batch_size", type=int, default=32, help="Number of samples per batch.")
    parser.add_argument("--show_interval", type=int, default=50, help="Interval of training steps to show progress.")
    parser.add_argument("--root_dir", type=str, default="dataset", help="Root directory containing dataset.")
    parser.add_argument("--labels_file", type=str, default="dummy", help="Dummy parameter (auto-detected for new structure).")
    parser.add_argument("--device", type=str, default="auto", help="Device to use: 'cpu', 'cuda', or 'auto'.")
    parser.add_argument("--save_interval", type=int, default=5, help="Save checkpoint every N epochs.")
    parser.add_argument("--plot_metrics", action="store_true", help="Generate and save training metrics plots.")
    return parser.parse_args()

def train_batch(crnn, data, optimizer, criterion, device):
    """
    Train the CRNN model for one batch.

    Args:
        crnn (torch.nn.Module): The CRNN model.
        data (tuple): A tuple containing input images, targets, and target lengths.
        optimizer (torch.optim.Optimizer): The optimizer for updating model parameters.
        criterion (torch.nn.Module): The loss criterion.
        device (torch.device): The device on which to perform computations.

    Returns:
        float: The loss value for the current batch.
    """
    crnn.train()
    images, targets, target_lengths = [d.to(device) for d in data]

    logits = crnn(images)
    log_probs = torch.nn.functional.log_softmax(logits, dim=2)

    batch_size = images.size(0)
    input_lengths = torch.LongTensor([logits.size(0)] * batch_size).to(device)
    target_lengths = torch.flatten(target_lengths).to(device)

    loss = criterion(log_probs, targets, input_lengths, target_lengths)

    optimizer.zero_grad()
    loss.backward()
    
    # Gradient clipping to prevent exploding gradients
    torch.nn.utils.clip_grad_norm_(crnn.parameters(), max_norm=5.0)
    
    optimizer.step()
    return loss.item()

def plot_training_metrics(train_losses, val_losses, val_accs, val_cers, val_wers, save_dir):
    """
    Create and save training metrics plots.
    
    Args:
        train_losses (list): Training losses per epoch.
        val_losses (list): Validation losses per epoch.
        val_accs (list): Validation accuracies per epoch.
        val_cers (list): Validation CERs per epoch.
        val_wers (list): Validation WERs per epoch.
        save_dir (str): Directory to save plots.
    """
    # Set up the plotting style
    plt.style.use('default')
    sns.set_palette("husl")
    
    epochs = range(1, len(train_losses) + 1)
    
    # Create a figure with subplots
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle('CRNN Training Metrics', fontsize=16, fontweight='bold')
    
    # Plot 1: Loss curves
    axes[0, 0].plot(epochs, train_losses, label='Training Loss', linewidth=2, marker='o', markersize=4)
    axes[0, 0].plot(epochs, val_losses, label='Validation Loss', linewidth=2, marker='s', markersize=4)
    axes[0, 0].set_xlabel('Epoch')
    axes[0, 0].set_ylabel('Loss')
    axes[0, 0].set_title('Training and Validation Loss')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)
    
    # Plot 2: Accuracy
    axes[0, 1].plot(epochs, [acc * 100 for acc in val_accs], label='Validation Accuracy', 
                   linewidth=2, marker='o', markersize=4, color='green')
    axes[0, 1].set_xlabel('Epoch')
    axes[0, 1].set_ylabel('Accuracy (%)')
    axes[0, 1].set_title('Validation Accuracy')
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)
    axes[0, 1].set_ylim(0, 100)
    
    # Plot 3: CER
    axes[1, 0].plot(epochs, [cer * 100 for cer in val_cers], label='Character Error Rate', 
                   linewidth=2, marker='^', markersize=4, color='red')
    axes[1, 0].set_xlabel('Epoch')
    axes[1, 0].set_ylabel('CER (%)')
    axes[1, 0].set_title('Character Error Rate (CER)')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)
    
    # Plot 4: WER
    axes[1, 1].plot(epochs, [wer * 100 for wer in val_wers], label='Word Error Rate', 
                   linewidth=2, marker='d', markersize=4, color='orange')
    axes[1, 1].set_xlabel('Epoch')
    axes[1, 1].set_ylabel('WER (%)')
    axes[1, 1].set_title('Word Error Rate (WER)')
    axes[1, 1].legend()
    axes[1, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    # Save the plot
    plot_path = os.path.join(save_dir, 'training_metrics.png')
    plt.savefig(plot_path, dpi=300, bbox_inches='tight')
    print(f"Training metrics plot saved to: {plot_path}")
    
    # Create individual plots for better readability
    plot_individual_metrics(train_losses, val_losses, val_accs, val_cers, val_wers, save_dir)
    
    plt.close()

def plot_individual_metrics(train_losses, val_losses, val_accs, val_cers, val_wers, save_dir):
    """
    Create individual plots for each metric.
    """
    epochs = range(1, len(train_losses) + 1)
    
    # Individual Loss plot
    plt.figure(figsize=(10, 6))
    plt.plot(epochs, train_losses, label='Training Loss', linewidth=2, marker='o')
    plt.plot(epochs, val_losses, label='Validation Loss', linewidth=2, marker='s')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title('Training Progress: Loss Curves')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.savefig(os.path.join(save_dir, 'loss_curves.png'), dpi=300, bbox_inches='tight')
    plt.close()
    
    # Individual Metrics plot (Accuracy, CER, WER)
    plt.figure(figsize=(12, 6))
    plt.subplot(1, 3, 1)
    plt.plot(epochs, [acc * 100 for acc in val_accs], 'g-o', linewidth=2)
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy (%)')
    plt.title('Validation Accuracy')
    plt.grid(True, alpha=0.3)
    plt.ylim(0, 100)
    
    plt.subplot(1, 3, 2)
    plt.plot(epochs, [cer * 100 for cer in val_cers], 'r-^', linewidth=2)
    plt.xlabel('Epoch')
    plt.ylabel('CER (%)')
    plt.title('Character Error Rate')
    plt.grid(True, alpha=0.3)
    
    plt.subplot(1, 3, 3)
    plt.plot(epochs, [wer * 100 for wer in val_wers], 'orange', marker='d', linewidth=2)
    plt.xlabel('Epoch')
    plt.ylabel('WER (%)')
    plt.title('Word Error Rate')
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(save_dir, 'evaluation_metrics.png'), dpi=300, bbox_inches='tight')
    plt.close()

def run_training_loop(crnn, train_loader, val_loader, optimizer, criterion, scheduler, device, epochs, show_interval, save_interval, save_dir):
    """
    Run the training loop for the CRNN model with enhanced metrics tracking.

    Args:
        crnn (torch.nn.Module): The CRNN model.
        train_loader (torch.utils.data.DataLoader): DataLoader for training data.
        val_loader (torch.utils.data.DataLoader): DataLoader for validation data.
        optimizer (torch.optim.Optimizer): The optimizer for updating model parameters.
        criterion (torch.nn.Module): The loss criterion.
        scheduler: Learning rate scheduler.
        device (torch.device): The device on which to perform computations.
        epochs (int): The number of training epochs.
        show_interval (int): Interval for printing training loss during an epoch.
        save_interval (int): Interval for saving checkpoints.
        save_dir (str): Directory to save checkpoints.

    Returns:
        tuple: Lists of training losses, validation losses, validation accuracies, CERs, and WERs for each epoch.
    """
    train_losses = []
    val_losses = []
    val_accs = []
    val_cers = []
    val_wers = []
    best_val_acc = 0.0

    for epoch in range(1, epochs + 1):
        print(f'\n=== EPOCH [{epoch}/{epochs}] ===')
        epoch_start_time = time.time()
        
        run_train_loss = 0.0
        run_train_count = 0

        step = 1
        for train_data in train_loader:
            batch_start_time = time.time()
            loss = train_batch(crnn, train_data, optimizer, criterion, device)
            train_size = train_data[0].size(0)
            run_train_loss += loss * train_size  # Weight by batch size
            run_train_count += train_size
            
            batch_time = time.time() - batch_start_time
            
            if step % show_interval == 0:
                avg_loss = run_train_loss / run_train_count
                print(f'Step [{step:4d}/{len(train_loader)}] | '
                      f'Loss: {avg_loss:.4f} | '
                      f'Batch Time: {batch_time:.2f}s')

            step += 1

        # Calculate average training loss for the epoch
        train_loss = run_train_loss / run_train_count
        
        # Validation
        if val_loader is not None:
            print("Running validation...")
            eval_result = evaluate(crnn, val_loader, criterion, max_iter=100)  # Limit validation for speed
        else:
            print("No validation data available")
            eval_result = {'loss': float('inf'), 'acc': 0.0, 'cer': 1.0, 'wer': 1.0}
        
        # Learning rate scheduling
        if scheduler:
            scheduler.step(eval_result['loss'])
        
        epoch_time = time.time() - epoch_start_time
        current_lr = optimizer.param_groups[0]['lr']
        
        print(f"EPOCH [{epoch}/{epochs}] COMPLETE")
        print(f"Train Loss: {train_loss:.4f} | Val Loss: {eval_result['loss']:.4f} | Val Acc: {eval_result['acc']:.4f}")
        print(f"CER: {eval_result['cer']:.4f} ({eval_result['cer']*100:.2f}%) | WER: {eval_result['wer']:.4f} ({eval_result['wer']*100:.2f}%)")
        print(f"Learning Rate: {current_lr:.6f} | Epoch Time: {epoch_time:.1f}s")
        
        # Save metrics
        train_losses.append(train_loss)
        val_losses.append(eval_result['loss'])
        val_accs.append(eval_result['acc'])
        val_cers.append(eval_result['cer'])
        val_wers.append(eval_result['wer'])
        
        # Save checkpoint if validation accuracy improved
        if eval_result['acc'] > best_val_acc:
            best_val_acc = eval_result['acc']
            best_model_path = os.path.join(save_dir, 'best_model.pt')
            save_checkpoint(crnn, optimizer, epoch, train_loss, eval_result, best_model_path)
            print(f"New best model saved! Val Acc: {best_val_acc:.4f}")
        
        # Save checkpoint at regular intervals
        if epoch % save_interval == 0:
            checkpoint_path = os.path.join(save_dir, f'checkpoint_epoch_{epoch}.pt')
            save_checkpoint(crnn, optimizer, epoch, train_loss, eval_result, checkpoint_path)
            print(f"Checkpoint saved: {checkpoint_path}")

    return train_losses, val_losses, val_accs, val_cers, val_wers

def save_checkpoint(model, optimizer, epoch, train_loss, eval_result, filepath):
    """Save model checkpoint with enhanced metrics."""
    config = {
        'state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'epoch': epoch,
        'train_loss': train_loss,
        'val_loss': eval_result['loss'],
        'val_acc': eval_result['acc'],
        'val_cer': eval_result['cer'],
        'val_wer': eval_result['wer'],
        'img_height': 64,
        'img_width': 512,
        'map_to_seq': 256,
        'rnn_hidden': 256
    }
    torch.save(config, filepath)

def main():
    args = get_input_args()
    
    # Device setup
    if args.device == "auto":
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    else:
        device = torch.device(args.device)
    
    print(f"Using device: {device}")
    
    # Load checkpoint if provided
    start_epoch = 1
    if args.cp_path and os.path.exists(args.cp_path):
        print(f"Loading checkpoint from {args.cp_path}")
        config = torch.load(args.cp_path, map_location=device)
        start_epoch = config.get('epoch', 0) + 1
    else:
        print("Starting training from scratch")
        config = {
            'state_dict': None,
            'optimizer_state_dict': None,
            'img_height': 64,
            'img_width': 512,
            'map_to_seq': 256,
            'rnn_hidden': 256
        }
    
    # Create data loaders
    print("Loading datasets...")
    print("Expected dataset structure:")
    print("dataset/")
    print("├── train_v2/train/")
    print("├── validation_v2/validation/")
    print("├── test_v2/test/")
    print("├── written_name_train_v2.csv")
    print("├── written_name_validation_v2.csv")
    print("└── written_name_test_v2.csv")
    
    try:
        train_loader, val_loader, test_loader = get_split(
            root_dir=args.root_dir,
            labels=args.labels_file,  # This will be ignored with new structure
            img_width=config['img_width'],
            img_height=config['img_height'],
            batch_size=args.batch_size
        )
        
        if train_loader is None:
            raise ValueError("Training data not found. Please check your dataset structure.")
            
        print(f"Training samples: {len(train_loader.dataset)}")
        
        if val_loader is not None:
            print(f"Validation samples: {len(val_loader.dataset)}")
        else:
            print("No validation data found")
            
        if test_loader is not None:
            print(f"Test samples: {len(test_loader.dataset)}")
        else:
            print("No test data found")
            
    except Exception as e:
        print(f"Error loading dataset: {e}")
        print("\nTroubleshooting tips:")
        print("1. Make sure you have the correct dataset structure")
        print("2. Check that CSV files exist and contain the right columns")
        print("3. Verify that image folders contain actual image files")
        print("4. Run setup_checker.py to diagnose issues")
        return
    
    # Model setup
    num_class = len(TRDataset.LABEL2CHAR) + 1  # +1 for blank token
    print(f"Number of classes: {num_class}")
    print(f"Character set size: {len(TRDataset.CHARS)}")
    
    crnn = CRNN(
        img_channel=1,
        img_height=config['img_height'],
        img_width=config['img_width'],
        num_class=num_class,
        map_to_seq=config['map_to_seq'],
        rnn_hidden=config['rnn_hidden']
    )

    # Load model weights if available
    if config['state_dict']:
        try:
            crnn.load_state_dict(config['state_dict'])
            print("Model weights loaded successfully")
        except Exception as e:
            print(f"Warning: Could not load model weights: {e}")

    crnn.to(device)
    
    # Print model summary
    total_params = sum(p.numel() for p in crnn.parameters())
    trainable_params = sum(p.numel() for p in crnn.parameters() if p.requires_grad)
    print(f"Total parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
    
    # Optimizer and criterion
    criterion = nn.CTCLoss(reduction='mean', zero_infinity=True)
    optimizer = torch.optim.AdamW(crnn.parameters(), lr=args.lr, weight_decay=1e-4)
    
    # Load optimizer state if available
    if config.get('optimizer_state_dict'):
        try:
            optimizer.load_state_dict(config['optimizer_state_dict'])
            print("Optimizer state loaded successfully")
        except Exception as e:
            print(f"Warning: Could not load optimizer state: {e}")
    
    # Learning rate scheduler
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', factor=0.5, patience=3
    )
    
    # Create save directory
    save_dir = os.path.join('runs', 'crnn')
    os.makedirs(save_dir, exist_ok=True)
    
    # Find unique save path
    save_path = os.path.join(save_dir, 'train')
    i = 1
    while os.path.exists(save_path):
        save_path = os.path.join(save_dir, f'train{i}')
        i += 1
    
    os.makedirs(save_path, exist_ok=True)
    print(f"Results will be saved to: {save_path}")
    
    # Training
    print(f"\nStarting training for {args.epochs} epochs...")
    print(f"Batch size: {args.batch_size}")
    print(f"Learning rate: {args.lr}")
    
    train_losses, val_losses, val_accs, val_cers, val_wers = run_training_loop(
        crnn=crnn,
        train_loader=train_loader,
        val_loader=val_loader,
        optimizer=optimizer,
        criterion=criterion,
        scheduler=scheduler,
        device=device,
        epochs=args.epochs,
        show_interval=args.show_interval,
        save_interval=args.save_interval,
        save_dir=save_path
    )

    # Final evaluation
    print('\n=== FINAL EVALUATION ===')
    if val_loader is not None:
        final_eval = evaluate(crnn, val_loader, criterion)
        print(f"Final Val Loss: {final_eval['loss']:.4f}")
        print(f"Final Val Accuracy: {final_eval['acc']:.4f} ({final_eval['acc']*100:.2f}%)")
        print(f"Final CER: {final_eval['cer']:.4f} ({final_eval['cer']*100:.2f}%)")
        print(f"Final WER: {final_eval['wer']:.4f} ({final_eval['wer']*100:.2f}%)")
    else:
        final_eval = {'loss': 0.0, 'acc': 0.0, 'cer': 1.0, 'wer': 1.0}
        print("No validation data for final evaluation")
    
    # Show some example predictions
    print('\n=== SAMPLE PREDICTIONS ===')
    crnn.eval()
    with torch.no_grad():
        data_loader = val_loader if val_loader is not None else train_loader
        for i, data in enumerate(data_loader):
            if i >= 3:  # Show only 3 examples
                break
            images, targets, target_lengths = [d.to(device) for d in data]
            logits = crnn(images)
            log_probs = torch.nn.functional.log_softmax(logits, dim=2)
            preds = ctc_decode(log_probs, label2char=TRDataset.LABEL2CHAR)
            
            # Get ground truth
            targets_np = targets.cpu().numpy().tolist()
            target_lengths_np = target_lengths.cpu().numpy().tolist()
            
            target_length_counter = 0
            for j, (pred, target_length) in enumerate(zip(preds, target_lengths_np)):
                if j >= 1:  # Show only first sample from batch
                    break
                real = targets_np[target_length_counter:target_length_counter + target_length]
                target_length_counter += target_length
                
                real_text = ''.join([TRDataset.LABEL2CHAR.get(l, '') for l in real])
                pred_text = ''.join(pred)
                
                print(f"Ground Truth: '{real_text}'")
                print(f"Prediction:   '{pred_text}'")
                print(f"Match: {real_text == pred_text}")
                print("-" * 50)
    
    # Create and save plots
    if args.plot_metrics and len(train_losses) > 1:
        print('\n=== GENERATING PLOTS ===')
        plot_training_metrics(train_losses, val_losses, val_accs, val_cers, val_wers, save_path)
    
    # Save training results
    config_final = {
        'state_dict': crnn.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'epoch': args.epochs,
        'img_height': config['img_height'],
        'img_width': config['img_width'],
        'map_to_seq': config['map_to_seq'],
        'rnn_hidden': config['rnn_hidden'],
        'final_val_loss': final_eval['loss'],
        'final_val_acc': final_eval['acc'],
        'final_val_cer': final_eval['cer'],
        'final_val_wer': final_eval['wer']
    }
    
    # Save results DataFrame with enhanced metrics
    df = pd.DataFrame({
        'epoch': range(1, args.epochs + 1),
        'train_loss': train_losses,
        'val_loss': val_losses,
        'val_accuracy': val_accs,
        'val_cer': val_cers,
        'val_wer': val_wers
    })
    
    df.to_csv(os.path.join(save_path, 'training_results.csv'), index=False)
    torch.save(config_final, os.path.join(save_path, 'final_model.pt'))
    
    print(f'\nTraining completed!')
    print(f'Results saved to: {save_path}')
    print(f'Best validation accuracy: {max(val_accs) if val_accs else 0:.4f}')
    print(f'Best CER: {min(val_cers) if val_cers else 1.0:.4f}')
    print(f'Best WER: {min(val_wers) if val_wers else 1.0:.4f}')
    
if __name__ == "__main__":
    main()