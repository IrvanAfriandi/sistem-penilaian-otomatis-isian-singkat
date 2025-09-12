import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, ChevronRight, Save, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Mock data untuk pertanyaan ujian
const mockQuestions = [
  'Jelaskan pengertian dari kata "gotong royong" dan berikan contoh penerapannya dalam kehidupan sehari-hari!',
  'Ceritakan pengalaman liburan yang paling berkesan menurut kalian dengan menggunakan kalimat yang baik dan benar!',
  'Apa manfaat membaca buku? Jelaskan minimal 3 manfaat dan berikan alasannya!',
  'Buatlah pantun dengan tema lingkungan hidup yang terdiri dari 4 baris!',
  'Jelaskan perbedaan antara dongeng dan fabel beserta masing-masing contohnya!'
];

// Default jawaban jika tidak ada di sessionStorage
const defaultAnswers = [
  'Gotong royong adalah kegiatan bersama-sama dalam masyarakat untuk mencapai tujuan bersama. Contohnya seperti kerja bakti membersihkan lingkungan sekitar.',
  'Liburan paling berkesan saya adalah ketika pergi ke pantai bersama keluarga. Kami bermain pasir, berenang, dan menikmati pemandangan matahari terbenam yang indah.',
  'Manfaat membaca buku antara lain: 1) Menambah wawasan dan pengetahuan, 2) Melatih konsentrasi dan fokus, 3) Mengembangkan imajinasi dan kreativitas.',
  'Air bersih sangat penting\nUntuk kehidupan semua makhluk\nJaga lingkungan kita\nAgar tetap asri dan sejuk',
  'Dongeng adalah cerita rakyat yang tokohnya manusia dengan unsur keajaiban. Contoh: Cinderella. Fabel adalah cerita dengan tokoh hewan yang memiliki pesan moral. Contoh: Kelinci dan Kura-kura.'
];

export default function EkstraksiJawaban() {
  const { ujianId, pesertaId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedAnswers, setExtractedAnswers] = useState<string[]>(defaultAnswers);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadDataFromStorage();
  }, [ujianId, pesertaId]);

  const loadDataFromStorage = () => {
    try {
      // Get uploaded image
      const imageData = sessionStorage.getItem('uploadedImageData');
      if (imageData) {
        setUploadedImage(imageData);
      }
      
      // Get extracted answers
      const answersData = sessionStorage.getItem('extractedAnswers');
      if (answersData) {
        const parsedAnswers = JSON.parse(answersData);
        setExtractedAnswers(parsedAnswers);
      } else {
        console.log('Tidak ada data ekstraksi, menggunakan data default');
        setExtractedAnswers(defaultAnswers);
      }
    } catch (error) {
      console.error('Error loading data from sessionStorage:', error);
      setExtractedAnswers(defaultAnswers);
      
      toast({
        title: "Peringatan",
        description: "Gagal memuat data ekstraksi, menggunakan data default.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...extractedAnswers];
    newAnswers[index] = value;
    setExtractedAnswers(newAnswers);
    
    // Auto-save to sessionStorage
    sessionStorage.setItem('extractedAnswers', JSON.stringify(newAnswers));
  };

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    
    try {
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Store updated answers
      sessionStorage.setItem('extractedAnswers', JSON.stringify(extractedAnswers));
      
      toast({
        title: "Tersimpan!",
        description: "Hasil ekstraksi jawaban berhasil disimpan.",
      });
      
      // Navigate to grading page
      navigate(`/ujian/${ujianId}/penilaian-otomatis/${pesertaId}`);
      
    } catch (error) {
      console.error('Error saving answers:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan jawaban. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/ujian/${ujianId}/upload-jawaban/${pesertaId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat hasil ekstraksi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2 mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-sm font-medium">
            ✓
          </div>
          <span className="ml-2 text-sm text-success">Upload</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            2
          </div>
          <span className="ml-2 text-sm text-primary">Ekstraksi</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm font-medium">
            3
          </div>
          <span className="ml-2 text-sm text-muted-foreground">Penilaian</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm font-medium">
            4
          </div>
          <span className="ml-2 text-sm text-muted-foreground">Hasil</span>
        </div>
      </div>

      {/* Header */}
      <Card className="bg-gradient-primary/10 shadow-soft border border-primary/20">
        <CardHeader>
          <CardTitle className="text-center">Hasil Ekstraksi Jawaban</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Review dan edit hasil ekstraksi sebelum melanjutkan ke penilaian otomatis
          </p>
        </CardHeader>
      </Card>

      {/* Soal Cards */}
      <div className="space-y-6">
        {extractedAnswers.map((answer, index) => (
          <Card key={index} className="bg-card shadow-soft border-0">
            <CardHeader>
              <CardTitle className="text-lg text-primary">Soal {index + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Foto Soal */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Foto Soal
                  </Label>
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 bg-muted/20">
                    {uploadedImage ? (
                      <div className="space-y-3">
                        <img 
                          src={uploadedImage} 
                          alt={`Foto soal ${index + 1}`}
                          className="w-full h-32 object-cover rounded border shadow-sm"
                        />
                        <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 border-l-4 border-blue-400">
                          <strong>Pertanyaan:</strong> {mockQuestions[index]}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Image className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Foto tidak tersedia</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prediksi Jawaban */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Prediksi Jawaban
                  </Label>
                  <div className="space-y-3">
                    <div className="bg-success/10 p-3 rounded border-l-4 border-success">
                      <Label className="text-xs text-success font-medium">
                        Status: Berhasil diekstraksi ✓
                      </Label>
                    </div>
                    <div>
                      <Label htmlFor={`answer-${index}`} className="text-sm font-medium">
                        Jawaban:
                      </Label>
                      <Textarea
                        id={`answer-${index}`}
                        value={answer}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="min-h-[120px] mt-2"
                        placeholder={`Jawaban untuk soal ${index + 1}...`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Anda dapat mengedit jawaban jika diperlukan
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Information Alert */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          <strong>AI Ekstraksi:</strong> Sistem AI telah berhasil mengekstraksi 5 jawaban dari foto. 
          Anda dapat mengedit jawaban jika ada kesalahan sebelum melanjutkan ke penilaian otomatis.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1 flex items-center justify-center gap-2"
          disabled={isSaving}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Upload
        </Button>
        
        <Button 
          onClick={handleSaveAndContinue}
          className="flex-1 bg-gradient-primary hover:opacity-90 flex items-center justify-center gap-2"
          disabled={isSaving}
          size="lg"
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Lanjut ke Penilaian Otomatis
            </>
          )}
        </Button>
      </div>
    </div>
  );
}