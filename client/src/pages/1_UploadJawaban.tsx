import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Zap, Camera, CheckCircle, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';

export default function UploadJawaban() {
  const { ujianId, pesertaId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processMessage, setProcessMessage] = useState('');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "File yang dipilih bukan gambar. Silakan pilih file gambar.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error", 
        description: "Ukuran file terlalu besar. Maksimal 10MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create preview
      const preview = URL.createObjectURL(file);
      setUploadedImage(preview);
      setUploadedFile(file);

      // Store in sessionStorage for next pages
      sessionStorage.setItem('uploadedImageData', preview);
      sessionStorage.setItem('uploadedFileName', file.name);

      toast({
        title: "Upload Berhasil",
        description: "Foto jawaban berhasil diupload. Klik 'Ekstraksi Jawaban' untuk memproses.",
      });

    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Gagal mengupload file. Silakan coba lagi.",
        variant: "destructive"
      });
      
      // Reset upload state
      setUploadedImage(null);
      setUploadedFile(null);
      sessionStorage.removeItem('uploadedImageData');
      sessionStorage.removeItem('uploadedFileName');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartExtraction = () => {
    setShowProcessModal(true);
    handleExtractAnswers();
  };

  const handleExtractAnswers = async () => {
    if (!uploadedFile || !pesertaId || !ujianId) {
      toast({
        title: "Error",
        description: "Data tidak lengkap. Silakan coba lagi.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    setProcessProgress(0);
    
    try {
      // Step 1: Loading Model YOLO 1
      setProcessMessage('Loading YOLO Model 1 (Deteksi Area Soal)...');
      setProcessProgress(5);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 2: Initialize ekstraksi_teks entries in database
      setProcessMessage('Menginisialisasi data ekstraksi...');
      setProcessProgress(10);
      
      try {
        console.log('🔍 Calling initializeEkstraksiTeks...');
        await ApiService.initializeEkstraksiTeks(parseInt(ujianId), parseInt(pesertaId));
        console.log('✅ Init ekstraksi berhasil');
      } catch (apiError: any) {
        console.error('❌ API Error during initialization:', apiError);
        throw new Error(`Gagal menginisialisasi data: ${apiError.message}`);
      }
      
      // Step 3: TAHAP 1 - EKSTRAKSI AREA SOAL (YOLO Model 1)
      setProcessMessage('TAHAP 1: Mengekstraksi area soal dengan YOLO Model 1...');
      setProcessProgress(25);
      
      let extractResult;
      try {
        console.log('🔍 Calling extractAnswers (TAHAP 1) with file...');
        extractResult = await ApiService.extractAnswers(
          parseInt(ujianId), 
          parseInt(pesertaId), 
          uploadedFile
        );
        console.log('✅ Extract answers TAHAP 1 result:', extractResult);
        
        setProcessMessage('TAHAP 1: Area soal berhasil diekstraksi!');
        setProcessProgress(40);
        
      } catch (extractError: any) {
        console.error('❌ API Error during TAHAP 1 extraction:', extractError);
        throw new Error(`TAHAP 1 - Gagal mengekstraksi area soal: ${extractError.message}`);
      }
      
      // Step 4: Loading Model YOLO 2  
      setProcessMessage('Loading YOLO Model 2 (Deteksi Area Jawaban)...');
      setProcessProgress(45);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 5: TAHAP 2 - EKSTRAKSI AREA JAWABAN (YOLO Model 2)
      setProcessMessage('TAHAP 2: Mengekstraksi area jawaban dengan YOLO Model 2...');
      setProcessProgress(55);
      
      try {
        console.log('🔍 Calling extractHandwritingAnswers (TAHAP 2)...');
        const handwritingResult = await ApiService.extractHandwritingAnswers(
          parseInt(ujianId), 
          parseInt(pesertaId)
        );
        console.log('✅ Extract handwriting TAHAP 2 result:', handwritingResult);
        
        setProcessMessage('TAHAP 2: Area jawaban berhasil diekstraksi!');
        setProcessProgress(70);
        
      } catch (handwritingError: any) {
        console.error('❌ API Error during TAHAP 2 extraction:', handwritingError);
        throw new Error(`TAHAP 2 - Gagal mengekstraksi area jawaban: ${handwritingError.message}`);
      }
      
      // Step 6: Loading Model CRNN
      setProcessMessage('Loading CRNN Model (Ekstraksi Teks)...');
      setProcessProgress(75);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 7: TAHAP 3 - EKSTRAKSI TEKS (CRNN Model)
      setProcessMessage('TAHAP 3: Mengekstraksi teks dengan CRNN Model...');
      setProcessProgress(85);
      
      try {
        console.log('🔍 Calling extractTextFromAnswers (TAHAP 3)...');
        const textResult = await ApiService.extractTextFromAnswers(
          parseInt(ujianId), 
          parseInt(pesertaId)
        );
        console.log('✅ Extract text TAHAP 3 result:', textResult);
        
        setProcessMessage('TAHAP 3: Teks berhasil diekstraksi!');
        setProcessProgress(95);
        
      } catch (textError: any) {
        console.error('❌ API Error during TAHAP 3 extraction:', textError);
        throw new Error(`TAHAP 3 - Gagal mengekstraksi teks: ${textError.message}`);
      }
      
      // Step 8: Finalisasi
      setProcessMessage('Ekstraksi 3 tahap selesai!');
      setProcessProgress(100);
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Ekstraksi Berhasil!",
        description: "Berhasil mengekstraksi area soal, area jawaban, dan teks dengan AI models.",
      });

      // Navigate to grading page (step 2)
      setTimeout(() => {
        setShowProcessModal(false);
        navigate(`/ujian/${ujianId}/penilaian-otomatis/${pesertaId}`);
      }, 1500);

    } catch (error: any) {
      console.error('❌ Error during extraction:', error);
      
      setProcessMessage('Terjadi kesalahan saat ekstraksi');
      setProcessProgress(0);
      
      toast({
        title: "Error",
        description: error.message || "Terjadi kesalahan saat memproses. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderProcessModal = () => (
    <Dialog open={showProcessModal} onOpenChange={undefined}>
      <DialogContent className="sm:max-w-md bg-card shadow-soft border-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center">
            Ekstraksi Jawaban
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Loading Indicator */}
          <div className="flex justify-center">
            {isProcessing ? (
              <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin" />
            ) : processProgress === 100 ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 border-4 border-muted rounded-full" />
            )}
          </div>

          {/* Process Description */}
          <div className="text-center space-y-2">
            <h3 className="text-base font-medium text-foreground">
              {processProgress === 100 ? (
                "Ekstraksi Selesai!"
              ) : processProgress >= 85 ? (
                "Model 3: Mengekstraksi teks dari tulisan tangan..."
              ) : processProgress >= 55 ? (
                "Model 2: Mendeteksi area jawaban/tulisan tangan..."
              ) : processProgress >= 25 ? (
                "Model 1: Mendeteksi dan memotong area soal..."
              ) : processProgress >= 10 ? (
                "Menginisialisasi database ekstraksi..."
              ) : (
                "Mempersiapkan model..."
              )}
            </h3>
            
            <p className="text-sm text-muted-foreground">
              {processProgress === 100 ? (
                "Semua tahap berhasil diselesaikan"
              ) : processProgress >= 85 ? (
                "CRNN Model sedang membaca tulisan tangan"
              ) : processProgress >= 55 ? (
                "YOLO Model 2 sedang memproses"
              ) : processProgress >= 25 ? (
                "YOLO Model 1 sedang memproses"
              ) : processProgress >= 10 ? (
                "Menyiapkan data untuk ekstraksi"
              ) : (
                "Loading models dan dependencies"
              )}
            </p>
          </div>

          {/* Progress Percentage */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(processProgress)}%</span>
            </div>
            <Progress value={processProgress} className="h-2" />
          </div>

          {/* Success Message */}
          {processProgress === 100 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-green-800 mb-1">
                Ekstraksi berhasil diselesaikan!
              </p>
              <p className="text-xs text-green-700">
                Mengarahkan ke halaman penilaian otomatis...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2 mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            1
          </div>
          <span className="ml-2 text-sm text-primary">Upload & Ekstraksi</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm font-medium">
            2
          </div>
          <span className="ml-2 text-sm text-muted-foreground">Penilaian</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm font-medium">
            3
          </div>
          <span className="ml-2 text-sm text-muted-foreground">Hasil</span>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="bg-card shadow-soft border-0">
        <CardHeader>
          <CardTitle>Upload Foto Lembar Jawaban</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
          

            <div 
              className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadedImage ? (
                <div className="space-y-4">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded answer" 
                    className="max-w-full h-64 object-contain mx-auto rounded-lg border shadow-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    Foto berhasil diupload. Klik untuk mengubah foto.
                  </p>
                </div>
              ) : (
                <>
                  <Camera className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Upload Foto Jawaban</p>
                  <p className="text-muted-foreground mb-4">
                    Klik di sini untuk memilih foto jawaban siswa (Max: 10MB)
                  </p>
                  <Button variant="outline" disabled={isUploading}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? 'Mengupload...' : 'Pilih Foto'}
                  </Button>
                </>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {uploadedImage && (
              <Button 
                onClick={handleStartExtraction}
                className="w-full bg-gradient-primary hover:opacity-90 flex items-center justify-center gap-2"
                disabled={isUploading || isProcessing}
                size="lg"
              >
                <Zap className="mr-2 h-4 w-4" />
                Ekstraksi Jawaban (3 Tahap)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Process Modal */}
      {renderProcessModal()}

      {/* Back Button */}
      <div className="flex justify-start">
        <Button
          variant="outline"
          onClick={() => navigate(`/ujian/${ujianId}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Detail Ujian
        </Button>
      </div>
    </div>
  );
}