import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// Mock data untuk pertanyaan ujian
const mockQuestions = [
  'Jelaskan pengertian dari kata "gotong royong" dan berikan contoh penerapannya dalam kehidupan sehari-hari!',
  'Ceritakan pengalaman liburan yang paling berkesan menurut kalian dengan menggunakan kalimat yang baik dan benar!',
  'Apa manfaat membaca buku? Jelaskan minimal 3 manfaat dan berikan alasannya!',
  'Buatlah pantun dengan tema lingkungan hidup yang terdiri dari 4 baris!',
  'Jelaskan perbedaan antara dongeng dan fabel beserta masing-masing contohnya!'
];

// Mock data jawaban default jika tidak ada di sessionStorage
const defaultMockAnswers = [
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
  const [extractedAnswers, setExtractedAnswers] = useState<string[]>(['', '', '', '', '']);
  const [isProcessingGrading, setIsProcessingGrading] = useState(false);

  useEffect(() => {
    loadDataFromStorage();
  }, [ujianId, pesertaId, navigate]);

  const loadDataFromStorage = () => {
    // Get data from sessionStorage
    const imageData = sessionStorage.getItem('uploadedImageData');
    const answersData = sessionStorage.getItem('extractedAnswers');
    
    if (imageData) {
      setUploadedImage(imageData);
    }
    
    if (answersData) {
      try {
        setExtractedAnswers(JSON.parse(answersData));
      } catch (error) {
        console.warn('Error parsing extracted answers from sessionStorage:', error);
        setExtractedAnswers(defaultMockAnswers);
      }
    } else {
      // Jika tidak ada data di sessionStorage, gunakan data default
      console.log('Tidak ada data ekstraksi, menggunakan data default mock');
      setExtractedAnswers(defaultMockAnswers);
      sessionStorage.setItem('extractedAnswers', JSON.stringify(defaultMockAnswers));
    }
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

  const handleAutoGrading = async () => {
    setIsProcessingGrading(true);
    
    // Store current answers before grading
    sessionStorage.setItem('extractedAnswers', JSON.stringify(extractedAnswers));
    
    try {
      // Simulasi proses AI grading dengan delay realistis
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate scores using simulated AI
      const scores = simulateAIGrading(extractedAnswers);
      
      // Store scores in sessionStorage
      sessionStorage.setItem('scores', JSON.stringify(scores));
      
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const averageScore = totalScore / scores.length;
      
      toast({
        title: "Penilaian selesai!",
        description: `Rata-rata nilai: ${averageScore.toFixed(1)}/100`,
      });
      
      // Navigate to results page
      navigate(`/ujian/${ujianId}/hasil-penilaian/${pesertaId}`);
      
    } catch (error) {
      console.error('Error during grading simulation:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat penilaian. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingGrading(false);
    }
  };

  const handleBack = () => {
    navigate(`/ujian/${ujianId}/ekstraksi/${pesertaId}`);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...extractedAnswers];
    newAnswers[index] = value;
    setExtractedAnswers(newAnswers);
    
    // Auto-save to sessionStorage
    sessionStorage.setItem('extractedAnswers', JSON.stringify(newAnswers));
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2 mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-sm font-medium">
            ✓
          </div>
          <span className="ml-2 text-sm text-success">Ekstraksi</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            2
          </div>
          <span className="ml-2 text-sm text-primary">Penilaian</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm font-medium">
            3
          </div>
          <span className="ml-2 text-sm text-muted-foreground">Hasil</span>
        </div>
      </div>

      {/* Uploaded Image Preview */}
      {uploadedImage && (
        <Card className="bg-muted/30 shadow-soft border-0">
          <CardHeader>
            <CardTitle className="text-lg">Foto Jawaban</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={uploadedImage} 
              alt="Uploaded answer" 
              className="max-w-full h-48 object-contain mx-auto rounded-lg border shadow-sm"
            />
          </CardContent>
        </Card>
      )}

      {/* Extracted Answers Section */}
      <Card className="bg-card shadow-soft border-0">
        <CardHeader>
          <CardTitle>Jawaban Hasil Ekstraksi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review dan edit jawaban jika diperlukan sebelum melakukan penilaian otomatis
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {extractedAnswers.map((answer, index) => (
              <div key={index} className="space-y-3 p-4 bg-muted/20 rounded-lg">
                <div className="space-y-2">
                  <Label className="font-medium text-primary">Soal {index + 1}</Label>
                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                    {mockQuestions[index]}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Jawaban:</Label>
                  <Textarea
                    value={answer}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    className="min-h-[100px] mt-2"
                    placeholder={`Jawaban soal nomor ${index + 1}`}
                  />
                </div>
              </div>
            ))}
            
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Ekstraksi
              </Button>
              
              <Button 
                onClick={handleAutoGrading}
                className="flex-1 bg-gradient-primary hover:opacity-90 flex items-center justify-center gap-2"
                disabled={isProcessingGrading}
                size="lg"
              >
                <Zap className="h-4 w-4" />
                {isProcessingGrading ? 'Menilai...' : 'Mulai Penilaian Otomatis'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Modal */}
      <Dialog open={isProcessingGrading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Menilai Jawaban</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Sedang melakukan penilaian otomatis...</p>
            <p className="text-xs text-muted-foreground mt-2">Menganalisis jawaban siswa dengan AI</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}