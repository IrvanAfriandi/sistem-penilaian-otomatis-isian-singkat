import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Zap, Camera, CheckCircle, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

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
    if (!uploadedFile || !pesertaId || !ujianId) return;
    
    setIsProcessing(true);
    setProcessProgress(0);
    
    try {
      // Step 1: Loading Model
      setProcessMessage('Loading model...');
      setProcessProgress(10);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 2: Deteksi Soal dan Jawaban
      setProcessMessage('Loading deteksi soal dan jawaban...');
      setProcessProgress(25);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Step 3-7: Ekstraksi Soal 1-5
      for (let i = 1; i <= 5; i++) {
        setProcessMessage(`Ekstraksi jawaban soal ${i}...`);
        setProcessProgress(25 + (i * 12)); // 25, 37, 49, 61, 73
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // Step 8: Finalisasi
      setProcessMessage('Jawaban berhasil diekstraksi!');
      setProcessProgress(100);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create dummy extracted answers
      const extractedAnswers = [
        'Gotong royong adalah kegiatan bersama-sama dalam masyarakat untuk mencapai tujuan bersama. Contohnya seperti kerja bakti membersihkan lingkungan sekitar.',
        'Liburan paling berkesan saya adalah ketika pergi ke pantai bersama keluarga. Kami bermain pasir, berenang, dan menikmati pemandangan matahari terbenam yang indah.',
        'Manfaat membaca buku antara lain: 1) Menambah wawasan dan pengetahuan, 2) Melatih konsentrasi dan fokus, 3) Mengembangkan imajinasi dan kreativitas.',
        'Air bersih sangat penting\nUntuk kehidupan semua makhluk\nJaga lingkungan kita\nAgar tetap asri dan sejuk',
        'Dongeng adalah cerita rakyat yang tokohnya manusia dengan unsur keajaiban. Contoh: Cinderella. Fabel adalah cerita dengan tokoh hewan yang memiliki pesan moral. Contoh: Kelinci dan Kura-kura.'
      ];
      
      // Store extracted answers
      sessionStorage.setItem('extractedAnswers', JSON.stringify(extractedAnswers));

      toast({
        title: "Ekstraksi Berhasil!",
        description: "Berhasil mengekstraksi 5 jawaban dari foto.",
      });

      // Navigate to grading page (step 2)
      setTimeout(() => {
        setShowProcessModal(false);
        navigate(`/ujian/${ujianId}/penilaian-otomatis/${pesertaId}`);
      }, 1500);

    } catch (error: any) {
      console.error('Error during extraction:', error);
      
      setProcessMessage('Terjadi kesalahan saat ekstraksi');
      
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memproses. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderProcessModal = () => (
    <Dialog open={showProcessModal} onOpenChange={!isProcessing ? setShowProcessModal : undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Proses Ekstraksi Jawaban
            {!isProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProcessModal(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Progress value={processProgress} className="w-full" />
          
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              {isProcessing && (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              {processProgress === 100 && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            
            <p className="text-sm font-medium">
              {processMessage}
            </p>
            
            {processProgress < 100 && (
              <p className="text-xs text-muted-foreground">
                Sedang memproses dengan model...
              </p>
            )}
          </div>

          {processProgress === 100 && (
            <div className="text-center space-y-2 pt-4 border-t">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-green-700">
                Ekstraksi Selesai!
              </p>
              <p className="text-xs text-muted-foreground">
                Mengarahkan ke halaman penilaian otomatis...
              </p>
            </div>
          )}

          {!isProcessing && processProgress < 100 && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowProcessModal(false)}
                size="sm"
              >
                Tutup
              </Button>
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
          <span className="ml-2 text-sm text-primary"></span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm font-medium">
            2
          </div>
          <span className="ml-2 text-sm text-muted-foreground"></span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm font-medium">
            3
          </div>
          <span className="ml-2 text-sm text-muted-foreground"></span>
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
                Ekstraksi Jawaban
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