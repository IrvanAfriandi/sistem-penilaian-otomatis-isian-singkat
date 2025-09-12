import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ChevronRight, CheckCircle, AlertCircle, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';

// Interface untuk data hasil penilaian
interface GradingResult {
  question_number: number;
  question_text: string;
  key_answer: string;
  student_answer: string;
  score: number;
  grade: string;
  soal_id: number;
  penilaian_id: number;
  gambar?: string | null;
  status_gambar?: 'on' | 'off';
}

// Interface untuk summary
interface GradingSummary {
  total_questions: number;
  total_score: number;
  average_score: number;
  final_grade: string;
  participant_id: number;
  exam_id: number;
}

export default function HasilPenilaian() {
  const { ujianId, pesertaId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([]);
  const [summary, setSummary] = useState<GradingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // States untuk modal penyimpanan
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Helper function to build image URL for soal
  const buildImageUrl = (filename: string): string => {
    return `http://localhost:5000/api/ujian/${ujianId}/image/${filename}`;
  };

  useEffect(() => {
    loadGradingResults();
  }, [ujianId, pesertaId]);

  const loadGradingResults = async () => {
    try {
      setIsLoading(true);

      if (!ujianId || !pesertaId) {
        throw new Error('Parameter ujianId atau pesertaId tidak valid');
      }

      // Get grading results from backend
      const response = await ApiService.getGradingResults(parseInt(ujianId), parseInt(pesertaId));
      
      if (response.results && response.summary) {
        console.log('📋 Data hasil penilaian:', response);
        console.log('🖼️ Image data check:', response.results.map(r => ({ 
          soal: r.question_number, 
          gambar: r.gambar, 
          status: r.status_gambar 
        })));
        
        // Ensure numeric values for results
        const processedResults = response.results.map((result: any) => ({
          ...result,
          score: Number(result.score || 0),
          question_number: Number(result.question_number || 0)
        }));
        
        // Ensure numeric values for summary
        const processedSummary = {
          ...response.summary,
          total_score: Number(response.summary.total_score || 0),
          average_score: Number(response.summary.average_score || 0),
          total_questions: Number(response.summary.total_questions || 0)
        };
        
        setGradingResults(processedResults);
        setSummary(processedSummary);
        
        toast({
          title: "Data Berhasil Dimuat",
          description: `Berhasil memuat ${processedResults.length} hasil penilaian.`,
        });
      } else {
        throw new Error('Data hasil penilaian tidak ditemukan');
      }
      
    } catch (error: any) {
      console.error('Error loading grading results:', error);
      
      toast({
        title: "Error",
        description: error.message || "Gagal memuat hasil penilaian.",
        variant: "destructive"
      });
      
      // Redirect back jika tidak ada data
      setTimeout(() => {
        navigate(`/ujian/${ujianId}/penilaian-otomatis/${pesertaId}`);
      }, 3000);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleScoreChange = (index: number, newScore: number) => {
    const validScore = Math.max(0, Math.min(100, Number(newScore) || 0));
    const newResults = [...gradingResults];
    newResults[index].score = validScore;
    setGradingResults(newResults);
    setHasChanges(true);
    
    // Update summary
    if (summary) {
      const totalScore = newResults.reduce((sum, result) => sum + (Number(result.score) || 0), 0);
      const averageScore = newResults.length > 0 ? totalScore / newResults.length : 0;
      
      setSummary({
        ...summary,
        total_score: Number(totalScore),
        average_score: Number(averageScore),
        final_grade: getGradeFromScore(averageScore)
      });
    }
  };

  const getGradeFromScore = (score: number): string => {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'E';
  };

  const getGradeCategory = (score: number): string => {
    if (score >= 80) return 'Sangat Baik';
    if (score >= 65) return 'Baik';
    if (score >= 50) return 'Cukup';
    return 'Perlu Perbaikan';
  };

  const getGradeCategoryClass = (score: number): string => {
    if (score >= 80) return 'bg-success/20 text-success';
    if (score >= 65) return 'bg-blue-500/20 text-blue-600';
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-600';
    return 'bg-destructive/20 text-destructive';
  };

  const handleStartSaving = () => {
    setShowSaveModal(true);
    handleSaveGrades();
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    setSaveProgress(0);
    
    try {
      if (!ujianId || !pesertaId) {
        throw new Error('Parameter ujianId atau pesertaId tidak valid');
      }

      // Step 1: Validasi data
      setSaveProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Prepare data for saving
      setSaveProgress(40);
      const updatedScores = gradingResults.map(result => ({
        penilaian_id: result.penilaian_id,
        soal_id: result.soal_id,
        score: result.score,
        student_answer: result.student_answer
      }));
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Call API to save scores
      setSaveProgress(70);
      await ApiService.updateGradingResults(
        parseInt(ujianId), 
        parseInt(pesertaId), 
        updatedScores
      );
      
      // Step 4: Finalisasi
      setSaveProgress(100);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setHasChanges(false);
      
      // Redirect back to exam detail
      setTimeout(() => {
        setShowSaveModal(false);
        navigate(`/ujian/${ujianId}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error saving grades:', error);
      setSaveProgress(0);
      
      toast({
        title: "Gagal menyimpan",
        description: error.message || "Terjadi kesalahan saat menyimpan nilai.",
        variant: "destructive"
      });
      
      setTimeout(() => {
        setIsSaving(false);
        setShowSaveModal(false);
      }, 3000);
    } finally {
      if (saveProgress === 100) {
        setIsSaving(false);
      }
    }
  };

  const renderSaveModal = () => (
    <Dialog open={showSaveModal} onOpenChange={undefined}>
      <DialogContent className="sm:max-w-md bg-card shadow-soft border-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center">
            Menyimpan Hasil Penilaian
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Loading Indicator */}
          <div className="flex justify-center">
            {isSaving && saveProgress < 100 ? (
              <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin" />
            ) : saveProgress === 100 ? (
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
              {saveProgress === 100 ? (
                "Penyimpanan Selesai!"
              ) : saveProgress >= 70 ? (
                "Menyimpan nilai ke database..."
              ) : saveProgress >= 40 ? (
                "Memproses data penilaian..."
              ) : saveProgress >= 20 ? (
                "Validasi data nilai..."
              ) : (
                "Mempersiapkan penyimpanan..."
              )}
            </h3>
            
            <p className="text-sm text-muted-foreground">
              {saveProgress === 100 ? (
                "Semua nilai berhasil tersimpan"
              ) : saveProgress >= 70 ? (
                "Proses penyimpanan ke database"
              ) : saveProgress >= 40 ? (
                "Memformat data untuk penyimpanan"
              ) : saveProgress >= 20 ? (
                "Memeriksa validitas nilai"
              ) : (
                "Inisialisasi proses penyimpanan"
              )}
            </p>
          </div>

          {/* Progress Percentage */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(saveProgress)}%</span>
            </div>
            <Progress value={saveProgress} className="h-2" />
          </div>

          {/* Success Message */}
          {saveProgress === 100 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-green-800 mb-1">
                Nilai berhasil disimpan!
              </p>
              <p className="text-xs text-green-700">
                Mengarahkan ke halaman detail ujian...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const handleBack = () => {
    if (hasChanges) {
      const confirm = window.confirm('Ada perubahan nilai yang belum disimpan. Yakin ingin kembali?');
      if (!confirm) return;
    }
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

  if (!summary || !gradingResults.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-medium">Data Tidak Ditemukan</h3>
            <p className="text-muted-foreground">Tidak ada hasil penilaian yang tersedia.</p>
          </div>
          <Button onClick={() => navigate(`/ujian/${ujianId}`)}>
            Kembali ke Ujian
          </Button>
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
          <span className="ml-2 text-sm text-success">Upload & Ekstraksi</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-sm font-medium">
            ✓
          </div>
          <span className="ml-2 text-sm text-success">Penilaian</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
          </div>
          <span className="ml-2 text-sm text-primary">Hasil</span>
        </div>
      </div>

      {/* Summary Score Card */}
      <Card className="bg-gradient-primary/10 shadow-soft border border-primary/20">
        <CardHeader>
          <CardTitle className="text-center">Hasil Penilaian</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Ujian ID: {ujianId} | Peserta ID: {pesertaId}
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">{Number(summary.average_score || 0).toFixed(1)}</div>
              <div className="text-muted-foreground">Rata-rata Nilai</div>
            </div>
            <div className="space-y-1">
              <div className={`text-sm px-3 py-1 rounded-full inline-block ${getGradeCategoryClass(Number(summary.average_score || 0))}`}>
                {getGradeCategory(Number(summary.average_score || 0))} (Grade {summary.final_grade})
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {Number(summary.total_score || 0).toFixed(1)}/{summary.total_questions * 100} poin
            </div>
            {hasChanges && (
              <Alert className="mx-auto max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Ada perubahan nilai yang belum disimpan
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Scores Section */}
      <Card className="bg-card shadow-soft border-0">
        <CardHeader>
          <CardTitle>Detail Penilaian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {gradingResults.map((result, index) => {
              const hasImage = result.status_gambar === 'on' && result.gambar;
              console.log(`🔍 Soal ${result.question_number}:`, { 
                status_gambar: result.status_gambar, 
                gambar: result.gambar, 
                hasImage 
              });
              
              return (
                <div key={result.soal_id} className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label className="font-medium text-primary">Soal {result.question_number}</Label>
                    {/* Debug info untuk status gambar */}
                    <span className={`text-xs ml-2 px-2 py-1 rounded ${
                      result.status_gambar === 'on' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {result.status_gambar === 'on' ? '🖼️ Bergambar' : '📝 Teks'}
                    </span>
                  </div>
                  
                  {hasImage ? (
                    // Layout untuk soal bergambar - 2 kolom
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Kolom kiri - Gambar */}
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Gambar Soal:</Label>
                          <div className="mt-1">
                            {(() => {
                              const imageUrl = buildImageUrl(result.gambar!);
                              console.log(`🖼️ Loading image for soal ${result.question_number}:`, imageUrl);
                              
                              return (
                                <div className="w-full max-w-md h-64 rounded-lg border shadow-sm overflow-hidden bg-gray-50 flex items-center justify-center">
                                  <img 
                                    src={imageUrl} 
                                    alt={`Gambar soal ${result.question_number}`}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                      console.error(`⚠ Error loading image for question ${result.question_number}:`, imageUrl);
                                      const imgElement = e.target as HTMLImageElement;
                                      const containerDiv = imgElement.parentElement;
                                      if (containerDiv) {
                                        containerDiv.innerHTML = `
                                          <div class="w-full h-full bg-gray-200 rounded flex flex-col items-center justify-center text-gray-500">
                                            <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89L8.982 4.11A2 2 0 0110.646 3h2.708a2 2 0 011.664 1.11L16.406 6.11A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            </svg>
                                            <span class="text-sm font-medium">Gambar tidak ditemukan</span>
                                            <span class="text-xs text-gray-400 mt-1 text-center px-2">${result.gambar}</span>
                                          </div>
                                        `;
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log(`✅ Successfully loaded image for question ${result.question_number}`);
                                    }}
                                  />
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        {/* Kolom kanan - Pertanyaan dan Kunci Jawaban */}
                        <div className="space-y-4">
                          {/* Pertanyaan */}
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Pertanyaan:</Label>
                            <div className="text-sm text-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400 mt-1">
                              {result.question_text || `Soal ${result.question_number}`}
                            </div>
                          </div>
                          
                          {/* Kunci Jawaban */}
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Kunci Jawaban:</Label>
                            <div className="text-sm text-foreground bg-success/10 p-3 rounded border-l-4 border-success mt-1">
                              {result.key_answer || 'Kunci jawaban belum tersedia'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Jawaban Siswa - Full width di bawah */}
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Jawaban Siswa:</Label>
                        <div className="text-sm text-foreground bg-muted/20 p-3 rounded mt-1">
                          {result.student_answer || 'Belum ada jawaban'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Layout untuk soal tanpa gambar - 1 kolom
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Pertanyaan:</Label>
                        <div className="text-sm text-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400 mt-1">
                          {result.question_text || `Soal ${result.question_number}`}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Kunci Jawaban:</Label>
                          <div className="text-sm text-foreground bg-success/10 p-3 rounded border-l-4 border-success mt-1">
                            {result.key_answer || 'Kunci jawaban belum tersedia'}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Jawaban Siswa:</Label>
                          <div className="text-sm text-foreground bg-muted/20 p-3 rounded mt-1">
                            {result.student_answer || 'Belum ada jawaban'}
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
                        step="0.1"
                        value={Number(result.score || 0)}
                        onChange={(e) => handleScoreChange(index, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded text-center text-sm"
                      />
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                    
                    {/* Score indicator */}
                    <div className={`text-xs px-2 py-1 rounded ${getGradeCategoryClass(Number(result.score || 0))}`}>
                      {getGradeCategory(Number(result.score || 0))} (Grade {getGradeFromScore(Number(result.score || 0))})
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
          onClick={handleStartSaving}
          className="flex-1 bg-gradient-primary hover:opacity-90 flex items-center justify-center gap-2"
          disabled={isSaving}
          size="lg"
        >
          <Save className="h-4 w-4" />
          {hasChanges ? 'Simpan Perubahan' : 'Simpan Nilai'}
        </Button>
      </div>

      {/* Save Modal */}
      {renderSaveModal()}
    </div>
  );
}