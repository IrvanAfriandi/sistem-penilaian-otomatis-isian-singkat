import torch
from torch import nn
import torchvision.models as models

class CRNN(nn.Module):
    """
    Convolutional Recurrent Neural Network (CRNN) for handwritten text recognition.
    Uses ResNet-50 backbone with BiLSTM layers.

    Args:
        img_channel (int): Number of input image channels (1 for grayscale).
        img_height (int): Height of input images (64).
        img_width (int): Width of input images (512).
        num_class (int): Number of output classes.
        map_to_seq (int): Number of output features from CNN to be mapped to sequence.
        rnn_hidden (int): Number of hidden units in the BiLSTM layers.

    Attributes:
        cnn (nn.Module): ResNet-50 CNN backbone.
        adaptive_pool (nn.AdaptiveAvgPool2d): Adaptive pooling layer.
        map_to_seq (nn.Linear): Linear layer to map CNN output to sequence.
        rnn1 (nn.LSTM): First bidirectional LSTM layer.
        rnn2 (nn.LSTM): Second bidirectional LSTM layer.
        dense (nn.Linear): Fully connected layer for final classification.
    """

    def __init__(self, img_channel, img_height, img_width, num_class, map_to_seq=256, rnn_hidden=256):
        super(CRNN, self).__init__()

        # ResNet-50 CNN Backbone
        self.cnn = self._build_resnet50_backbone(img_channel)
        
        # Calculate the width after CNN processing
        # ResNet-50 reduces spatial dimensions by factor of 32
        cnn_output_height = img_height // 32  # Should be 2 for input height 64
        if cnn_output_height < 1:
            cnn_output_height = 1
            
        # Adaptive pooling to ensure consistent output size
        self.adaptive_pool = nn.AdaptiveAvgPool2d((1, None))  # Pool height to 1, keep width
        
        # ResNet-50 final feature dimension is 2048
        resnet_feature_dim = 2048
        
        # Mapping to Sequence
        self.map_to_seq = nn.Linear(resnet_feature_dim, map_to_seq)

        # Bidirectional LSTM Layers
        self.rnn1 = nn.LSTM(map_to_seq, rnn_hidden, bidirectional=True, batch_first=False)
        self.rnn2 = nn.LSTM(2 * rnn_hidden, rnn_hidden, bidirectional=True, batch_first=False)

        # Fully Connected Layer for Classification
        self.dense = nn.Linear(2 * rnn_hidden, num_class)

    def _build_resnet50_backbone(self, img_channel):
        """
        Build ResNet-50 backbone for feature extraction.

        Args:
            img_channel (int): Number of input image channels.

        Returns:
            nn.Module: Modified ResNet-50 backbone.
        """
        # Load pre-trained ResNet-50
        resnet = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        
        # Modify first conv layer for grayscale input if needed
        if img_channel == 1:
            # Create new conv1 layer for grayscale input
            original_conv1 = resnet.conv1
            resnet.conv1 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
            
            # Initialize new conv1 weights by averaging RGB weights
            with torch.no_grad():
                resnet.conv1.weight.data = original_conv1.weight.data.mean(dim=1, keepdim=True)
        
        # Remove the final classification layers (avgpool and fc)
        modules = list(resnet.children())[:-2]  # Remove avgpool and fc
        cnn_backbone = nn.Sequential(*modules)
        
        return cnn_backbone

    def forward(self, images):
        """
        Forward pass of the CRNN model.

        Args:
            images (torch.Tensor): Input images with shape (batch, channel, height, width).

        Returns:
            torch.Tensor: Output logits with shape (seq_len, batch, num_class).
        """
        # CNN Backbone (ResNet-50)
        conv = self.cnn(images)  # Shape: (batch, 2048, H', W')
        
        # Adaptive pooling to ensure height dimension is 1
        conv = self.adaptive_pool(conv)  # Shape: (batch, 2048, 1, W')
        
        batch, channel, height, width = conv.size()
        
        # Reshape for sequence processing
        conv = conv.squeeze(2)  # Remove height dimension: (batch, 2048, W')
        conv = conv.permute(2, 0, 1)  # Change to: (W', batch, 2048)
        
        # Map CNN features to sequence features
        seq = self.map_to_seq(conv)  # Shape: (W', batch, map_to_seq)

        # Bidirectional LSTM layers
        recurrent, _ = self.rnn1(seq)  # Shape: (W', batch, 2*rnn_hidden)
        recurrent, _ = self.rnn2(recurrent)  # Shape: (W', batch, 2*rnn_hidden)

        # Fully Connected Layer for Classification
        output = self.dense(recurrent)  # Shape: (W', batch, num_class)
        
        return output  # shape: (seq_len, batch, num_class)