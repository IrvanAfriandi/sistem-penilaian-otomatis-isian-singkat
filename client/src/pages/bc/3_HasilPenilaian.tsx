import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Mock data untuk kunci jawaban
const mockAnswerKeys = [
  'Gotong royong adalah kegiatan bersama-sama untuk mencapai tujuan bersama. Contoh: kerja bakti membersihkan lingkungan.',
  'Jawaban bervariasi sesuai pengalaman siswa dengan struktur cerita yang baik.',
  'Manfaat membaca: menambah wawasan, melatih konsentrasi, mengembangkan imajinasi.',
  'Pantun dengan tema lingkungan yang memenuhi syarat A-B-A-B.',
  'Dongeng: cerita rakyat dengan tokoh manusia. Fabel: cerita dengan tokoh hewan.'
];

// Mock data untuk pertanyaan dengan gambar
const mockImageQuestions = {
  1: {
    imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=300&h=200&fit=crop&crop=center',
    question: 'Berdasarkan gambar di samping, jelaskan pengertian dari kata "gotong royong" dan berikan contoh penerapannya dalam kehidupan sehari-hari!'
  },
  3: {
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=200&fit=crop&crop=center',
    question: 'Perhatikan gambar di samping! Buatlah pantun dengan tema lingkungan hidup yang terdiri dari 4 baris berdasarkan gambar tersebut!'
  }
};

// Mock data untuk pertanyaan regular
const regularQuestions = {
  2: 'Ceritakan pengalaman liburan yang paling berkesan menurut kalian dengan menggunakan kalimat yang baik dan benar!',
  4: 'Apa manfaat membaca buku? Jelaskan minimal 3 manfaat dan berikan alasannya!',
  5: 'Jelaskan perbedaan antara dongeng dan fabel beserta masing-masing contohnya!'
};

// Default data jika tidak ada di sessionStorage
const defaultAnswers = [
  'Gotong royong adalah kegiatan bersama-sama dalam masyarakat untuk mencapai tujuan bersama. Contohnya seperti kerja bakti membersihkan lingkungan sekitar.',
  'Liburan paling berkesan saya adalah ketika pergi ke pantai bersama keluarga. Kami bermain pasir, berenang, dan menikmati pemandangan matahari terbenam yang indah.',
  'Manfaat membaca buku antara lain: 1) Menambah wawasan dan pengetahuan, 2) Melatih konsentrasi dan fokus, 3) Mengembangkan imajinasi dan kreativitas.',
  'Air bersih sangat penting\nUntuk kehidupan semua makhluk\nJaga lingkungan kita\nAgar tetap asri dan sejuk',
  'Dongeng adalah cerita rakyat yang tokohnya manusia dengan unsur keajaiban. Contoh: Cinderella. Fabel adalah cerita dengan tokoh hewan yang memiliki pesan moral. Contoh: Kelinci dan Kura-kura.'
];

const defaultScores = [88, 82, 90, 75, 85]; // Default scores out of 100

export default function HasilPenilaian() {
  const { ujianId, pesertaId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [extractedAnswers, setExtractedAnswers] = useState<string[]>(defaultAnswers);
  const [scores, setScores] = useState<number[]>(defaultScores);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadDataFromStorage();
  }, [ujianId, pesertaId]);

  const loadDataFromStorage = () => {
    try {
      // Get data from sessionStorage
      const answersData = sessionStorage.getItem('extractedAnswers');
      const scoresData = sessionStorage.getItem('scores');
      
      if (answersData) {
        const parsedAnswers = JSON.parse(answersData);
        setExtractedAnswers(parsedAnswers);
      } else {
        console.log('Tidak ada data jawaban, menggunakan data default');
        setExtractedAnswers(defaultAnswers);
      }
      
      if (scoresData) {
        const parsedScores = JSON.parse(scoresData);
        setScores(parsedScores);
      } else {
        console.log('Tidak ada data nilai, menggunakan nilai default');
        setScores(defaultScores);
      }
    } catch (error) {
      console.error('Error loading data from sessionStorage:', error);
      setExtractedAnswers(defaultAnswers);
      setScores(defaultScores);
      
      toast({
        title: "Peringatan",
        description: "Gagal memuat data dari storage, menggunakan data default.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = (index: number, newScore: number) => {
    const validScore = Math.max(0, Math.min(100, newScore));
    const newScores = [...scores];
    newScores[index] = validScore;
    setScores(newScores);
    
    // Auto-save to sessionStorage
    sessionStorage.setItem('scores', JSON.stringify(newScores));
  };

  const simulateSaveToDatabase = async (data: any): Promise<void> => {
    // Simulasi API call ke database
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulasi 95% success rate
        if (Math.random() > 0.05) {
          resolve();
        } else {
          reject(new Error('Simulasi error jaringan'));
        }
      }, 1500);
    });
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    
    try {
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const averageScore = totalScore / scores.length;
      
      const dataToSave = {
        ujianId: Number(ujianId),
        pesertaId: Number(pesertaId),
        answers: extractedAnswers,
        scores: scores,
        totalScore,
        averageScore,
        timestamp: new Date().toISOString()
      };
      
      // Simulasi penyimpanan ke database
      await simulateSaveToDatabase(dataToSave);
      
      // Clear sessionStorage after successful save
      sessionStorage.removeItem('uploadedImageData');
      sessionStorage.removeItem('uploadedFileName');
      sessionStorage.removeItem('extractedAnswers');
      sessionStorage.removeItem('scores');
      
      toast({
        title: "Nilai tersimpan!",
        description: `Rata-rata nilai: ${averageScore.toFixed(1)}/100 berhasil disimpan ke database.`,
      });
      
      // Redirect back to exam detail
      navigate(`/ujian/${ujianId}`);
      
    } catch (error) {
      console.error('Error saving grades:', error);
      toast({
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan saat menyimpan nilai. Data tetap tersimpan lokal.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/ujian/${ujianId}/penilaian-otomatis/${pesertaId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat hasil penilaian...</p>
        </div>
      </div>
    );
  }

  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const averageScore = totalScore / scores.length;
  const gradeCategory = averageScore >= 80 ? 'Sangat Baik' : 
                       averageScore >= 65 ? 'Baik' : 
                       averageScore >= 50 ? 'Cukup' : 'Perlu Perbaikan';

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
          <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-sm font-medium">
            ✓
          </div>
          <span className="ml-2 text-sm text-success"></span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
          </div>
          <span className="ml-2 text-sm text-primary"></span>
        </div>
      </div>

      {/* Summary Score Card */}
      <Card className="bg-gradient-primary/10 shadow-soft border border-primary/20">
        <CardHeader>
          <CardTitle className="text-center">Hasil Penilaian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">{averageScore.toFixed(1)}</div>
              <div className="text-muted-foreground">Rata-rata Nilai</div>
            </div>
            <div className="space-y-1">
              <div className={`text-sm px-3 py-1 rounded-full inline-block ${
                gradeCategory === 'Sangat Baik' ? 'bg-success/20 text-success' :
                gradeCategory === 'Baik' ? 'bg-blue-500/20 text-blue-600' :
                gradeCategory === 'Cukup' ? 'bg-yellow-500/20 text-yellow-600' :
                'bg-destructive/20 text-destructive'
              }`}>
                {gradeCategory}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {totalScore}/500 poin
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Scores Section */}
      <Card className="bg-card shadow-soft border-0">
        <CardHeader>
          <CardTitle>Detail Penilaian</CardTitle>
          <p className="text-sm text-muted-foreground">
            Anda dapat melakukan penyesuaian nilai jika diperlukan
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {scores.map((score, index) => {
              const isImageQuestion = index === 0 || index === 2; // Soal 1 dan 3 bergambar
              const questionNumber = index + 1;
              
              return (
                <div key={index} className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label className="font-medium text-primary">Soal {questionNumber}</Label>
                  </div>
                  
                  {isImageQuestion ? (
                    // Layout untuk soal bergambar
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Gambar */}
                        <div>
                          <img 
                            src={mockImageQuestions[questionNumber].imageUrl} 
                            alt={`Gambar soal ${questionNumber}`}
                            className="w-full max-w-sm rounded-lg border shadow-sm"
                          />
                        </div>
                        
                        {/* Pertanyaan dan Kunci Jawaban */}
                        <div className="space-y-4">
                          {/* Pertanyaan */}
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Pertanyaan:</Label>
                            <div className="text-sm text-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400 mt-1">
                              {mockImageQuestions[questionNumber].question}
                            </div>
                          </div>
                          
                          {/* Kunci Jawaban */}
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Kunci Jawaban:</Label>
                            <div className="text-sm text-foreground bg-success/10 p-3 rounded border-l-4 border-success mt-1">
                              {mockAnswerKeys[index]}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Jawaban Siswa - Full width di bawah */}
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Jawaban Siswa:</Label>
                        <div className="text-sm text-foreground bg-muted/20 p-3 rounded mt-1">
                          {extractedAnswers[index] || 'Belum ada jawaban'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Layout untuk soal regular
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Pertanyaan:</Label>
                        <div className="text-sm text-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400 mt-1">
                          {regularQuestions[questionNumber]}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Kunci Jawaban:</Label>
                          <div className="text-sm text-foreground bg-success/10 p-3 rounded border-l-4 border-success mt-1">
                            {mockAnswerKeys[index]}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Jawaban Siswa:</Label>
                          <div className="text-sm text-foreground bg-muted/20 p-3 rounded mt-1">
                            {extractedAnswers[index] || 'Belum ada jawaban'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-muted">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`score-${index}`} className="text-sm font-medium">
                        Nilai:
                      </Label>
                      <input
                        id={`score-${index}`}
                        type="number"
                        min="0"
                        max="100"
                        value={scores[index]}
                        onChange={(e) => handleScoreChange(index, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded text-center text-sm"
                      />
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                    
                    {/* Score indicator */}
                    <div className={`text-xs px-2 py-1 rounded ${
                      score >= 80 ? 'bg-success/20 text-success' :
                      score >= 65 ? 'bg-blue-500/20 text-blue-600' :
                      score >= 50 ? 'bg-yellow-500/20 text-yellow-600' :
                      'bg-destructive/20 text-destructive'
                    }`}>
                      {score >= 80 ? 'Sangat Baik' :
                       score >= 65 ? 'Baik' :
                       score >= 50 ? 'Cukup' : 'Perlu Perbaikan'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1 flex items-center justify-center gap-2"
          disabled={isSaving}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Penilaian
        </Button>
        
        <Button 
          onClick={handleSaveGrades}
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
              <Save className="h-4 w-4" />
              Simpan Nilai
            </>
          )}
        </Button>
      </div>
    </div>
  );
}