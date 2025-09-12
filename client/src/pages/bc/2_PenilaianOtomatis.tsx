import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, ChevronRight, Image, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
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

export default function PenilaianOtomatis() {
  const { ujianId, pesertaId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedAnswers, setExtractedAnswers] = useState<string[]>(defaultAnswers);
  const [isLoading, setIsLoading] = useState(true);
  
  // States untuk proses penilaian
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingMessage, setGradingMessage] = useState('');

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

  const simulateAIGrading = (answers: string[]): number[] => {
    // Simulasi AI grading berdasarkan panjang dan kualitas jawaban
    return answers.map((answer, index) => {
      if (!answer || answer.trim().length === 0) {
        return 0; // Tidak ada jawaban
      }
      
      // Simulasi skor berdasarkan panjang jawaban dan kata kunci
      let baseScore = 60; // Skor dasar
      
      // Bonus berdasarkan panjang jawaban
      const wordCount = answer.trim().split(/\s+/).length;
      if (wordCount >= 20) baseScore += 20;
      else if (wordCount >= 10) baseScore += 10;
      else if (wordCount >= 5) baseScore += 5;
      
      // Bonus berdasarkan kata kunci (simulasi pemahaman konten)
      const keywordsByQuestion = [
        ['gotong', 'royong', 'bersama', 'contoh'], // Soal 1
        ['liburan', 'pengalaman', 'berkesan'], // Soal 2
        ['manfaat', 'membaca', 'buku', 'wawasan', 'konsentrasi'], // Soal 3
        ['pantun', 'lingkungan', 'baris'], // Soal 4
        ['dongeng', 'fabel', 'perbedaan', 'contoh'] // Soal 5
      ];
      
      const keywords = keywordsByQuestion[index] || [];
      const foundKeywords = keywords.filter(keyword => 
        answer.toLowerCase().includes(keyword.toLowerCase())
      );
      
      baseScore += foundKeywords.length * 3; // Bonus 3 poin per kata kunci
      
      // Randomisasi sedikit untuk variasi
      const randomVariation = (Math.random() - 0.5) * 10; // ±5 poin
      
      const finalScore = Math.round(Math.min(100, Math.max(0, baseScore + randomVariation)));
      return finalScore;
    });
  };

  const handleStartGrading = () => {
    setShowGradingModal(true);
    handleAutoGrading();
  };

  const handleAutoGrading = async () => {
    setIsGrading(true);
    setGradingProgress(0);
    
    try {
      // Store current answers before grading
      sessionStorage.setItem('extractedAnswers', JSON.stringify(extractedAnswers));
      
      // Step 1: Inisialisasi AI Grading
      setGradingMessage('Memulai penilaian otomatis dengan AI...');
      setGradingProgress(10);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Analisis jawaban
      setGradingMessage('Menganalisis jawaban siswa...');
      setGradingProgress(30);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Step 3-7: Penilaian per soal
      for (let i = 1; i <= 5; i++) {
        setGradingMessage(`Menilai jawaban soal ${i}...`);
        setGradingProgress(30 + (i * 12)); // 42, 54, 66, 78, 90
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // Step 8: Generate scores
      setGradingMessage('Menghitung skor final...');
      setGradingProgress(95);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate scores using simulated AI
      const scores = simulateAIGrading(extractedAnswers);
      
      // Store scores in sessionStorage
      sessionStorage.setItem('scores', JSON.stringify(scores));
      
      setGradingMessage('Penilaian selesai!');
      setGradingProgress(100);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const averageScore = totalScore / scores.length;
      
      toast({
        title: "Penilaian Selesai!",
        description: `Rata-rata nilai: ${averageScore.toFixed(1)}/100`,
      });
      
      // Navigate to results page
      setTimeout(() => {
        setShowGradingModal(false);
        navigate(`/ujian/${ujianId}/hasil-penilaian/${pesertaId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error during grading simulation:', error);
      setGradingMessage('Terjadi kesalahan saat penilaian');
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat penilaian. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setIsGrading(false);
    }
  };

  const handleBack = () => {
    navigate(`/ujian/${ujianId}/upload-jawaban/${pesertaId}`);
  };

  const renderGradingModal = () => (
    <Dialog open={showGradingModal} onOpenChange={!isGrading ? setShowGradingModal : undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Proses Penilaian Otomatis
            {!isGrading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGradingModal(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Progress value={gradingProgress} className="w-full" />
          
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              {isGrading && (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              {gradingProgress === 100 && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            
            <p className="text-sm font-medium">
              {gradingMessage}
            </p>
            
            {gradingProgress < 100 && (
              <p className="text-xs text-muted-foreground">
                Sedang menganalisis dan memberikan nilai...
              </p>
            )}
          </div>

          {gradingProgress === 100 && (
            <div className="text-center space-y-2 pt-4 border-t">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
              <p className="text-sm font-medium text-green-700">
                Penilaian Selesai!
              </p>
              <p className="text-xs text-muted-foreground">
                Mengarahkan ke halaman hasil penilaian...
              </p>
            </div>
          )}

          {!isGrading && gradingProgress < 100 && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowGradingModal(false)}
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
          <span className="ml-2 text-sm text-success"></span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            2
          </div>
          <span className="ml-2 text-sm text-primary"></span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm font-medium">
            3
          </div>
          <span className="ml-2 text-sm text-muted-foreground"></span>
        </div>
      </div>

      {/* Header */}
      <Card className="bg-gradient-primary/10 shadow-soft border border-primary/20">
        <CardHeader>
          <CardTitle className="text-center">Hasil Ekstraksi Jawaban</CardTitle>
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
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 bg-muted/20">
                    {uploadedImage ? (
                      <div className="space-y-3">
                        <img 
                          src={uploadedImage} 
                          alt={`Foto soal ${index + 1}`}
                          className="w-full h-32 object-cover rounded border shadow-sm"
                        />
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
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`answer-${index}`} className="text-sm font-medium">
                        Jawaban Siswa:
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


      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1 flex items-center justify-center gap-2"
          disabled={isGrading}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Upload
        </Button>
        
        <Button 
          onClick={handleStartGrading}
          className="flex-1 bg-gradient-primary hover:opacity-90 flex items-center justify-center gap-2"
          disabled={isGrading}
          size="lg"
        >
          <Zap className="h-4 w-4" />
          Penilaian Otomatis
        </Button>
      </div>

      {/* Grading Modal */}
      {renderGradingModal()}
    </div>
  );
}