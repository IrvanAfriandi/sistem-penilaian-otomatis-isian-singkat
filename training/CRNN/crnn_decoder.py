import numpy as np

def _reconstruct(labels, blank=0):
    """
    Merge consecutive identical labels and remove blank labels.

    Parameters:
    - labels (list): List of integer labels.
    - blank (int): Integer representing the blank label.

    Returns:
    - list: List of reconstructed labels without consecutive duplicates and blanks.
    """
    new_labels = []
    previous = None
    for label in labels:
        if label != previous:
            new_labels.append(label)
            previous = label
    new_labels = [l for l in new_labels if l != blank]
    return new_labels

def greedy_decode(emission_log_prob, blank=0):
    """
    Perform greedy decoding on emission probabilities.

    Parameters:
    - emission_log_prob (numpy.ndarray): 2D array of emission log probabilities.
    - blank (int): Integer representing the blank label.

    Returns:
    - list: List of decoded labels after greedy decoding.
    """
    labels = np.argmax(emission_log_prob, axis=-1)
    labels = _reconstruct(labels, blank=blank)
    return labels

def ctc_decode(log_probs, label2char=None, blank=0):
    """
    Perform CTC decoding on log probabilities for handwritten text recognition.

    Parameters:
    - log_probs (torch.Tensor or numpy.ndarray): 3D array of log probabilities with shape (seq_len, batch, num_classes).
    - label2char (dict): Optional dictionary mapping labels to characters.
    - blank (int): Integer representing the blank label.

    Returns:
    - list: List of decoded sequences after CTC decoding.
    """
    # Convert to numpy and transpose to (batch, seq_len, num_classes)
    if hasattr(log_probs, 'cpu'):  # Check if it's a torch tensor
        emission_log_probs = np.transpose(log_probs.cpu().numpy(), (1, 0, 2))
    else:
        emission_log_probs = np.transpose(log_probs, (1, 0, 2))
    
    decoded_list = []
    for emission_log_prob in emission_log_probs:
        decoded = greedy_decode(emission_log_prob, blank=blank)
        if label2char:
            try:
                decoded = [label2char[l] for l in decoded if l in label2char]
            except KeyError as e:
                print(f"Warning: Unknown label {e} encountered during decoding")
                decoded = [label2char.get(l, '') for l in decoded]
        decoded_list.append(decoded)
    return decoded_list

def beam_search_decode(log_probs, label2char=None, blank=0, beam_width=10):
    """
    Perform beam search CTC decoding (more accurate but slower than greedy).
    
    Parameters:
    - log_probs (torch.Tensor or numpy.ndarray): 3D array of log probabilities.
    - label2char (dict): Optional dictionary mapping labels to characters.
    - blank (int): Integer representing the blank label.
    - beam_width (int): Width of the beam for beam search.
    
    Returns:
    - list: List of decoded sequences after beam search CTC decoding.
    """
    # For now, fallback to greedy decode
    # A full beam search implementation would be more complex
    # and might require additional dependencies
    return ctc_decode(log_probs, label2char, blank)

def postprocess_text(text):
    """
    Post-process decoded text to improve readability.
    
    Parameters:
    - text (str): Raw decoded text.
    
    Returns:
    - str: Post-processed text.
    """
    if not text:
        return ""
    
    # Remove excessive whitespace
    text = ' '.join(text.split())
    
    # Basic corrections for common OCR errors in Indonesian text
    corrections = {
        '0': 'O',  # Zero to O in some contexts
        '1': 'I',  # One to I in some contexts
        '5': 'S',  # Five to S in some contexts
    }
    
    # Apply corrections only if the context suggests it's a letter
    # This is a simple heuristic and might need refinement
    
    return text.strip()