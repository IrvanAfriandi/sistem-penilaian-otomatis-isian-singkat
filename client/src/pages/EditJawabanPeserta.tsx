import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';

interface PesertaInfo {
  id: number;
  nama_siswa: string;
  nisn: string;
  kelas: string | null;
  total_nilai: number;  // Backend akan selalu mengembalikan number
}

interface UjianInfo {
  id: number;
  nama_ujian: string;
}

interface EditableAnswer {
  soal_id: number;
  pertanyaan: string;
  kunci_jawaban: string;
  gambar: string | null;
  status_gambar: 'on' | 'off';  // Specific enum values
  jawaban_siswa: string;
  nilai: number;  // Backend akan selalu mengembalikan number
}

export default function EditJawabanPeserta() {
  const { ujianId, pesertaId } = useParams<{ ujianId: string; pesertaId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pesertaInfo, setPesertaInfo] = useState<PesertaInfo | null>(null);
  const [ujianInfo, setUjianInfo] = useState<UjianInfo | null>(null);
  const [editedAnswers, setEditedAnswers] = useState<EditableAnswer[]>([]);

  // Default image sebagai SVG data URL
  const defaultImage = `data:image/svg+xml;base64,${btoa(`
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#f3f4f6"/>
      <rect x="75" y="60" width="150" height="100" fill="#e5e7eb" rx="8"/>
      <circle cx="120" cy="90" r="8" fill="#9ca3af"/>
      <polygon points="140,110 160,90 180,110 160,120" fill="#9ca3af"/>
      <text x="150" y="140" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">Gambar Soal</text>
    </svg>
  `)}`;

  useEffect(() => {
    loadPesertaAnswers();
  }, [ujianId, pesertaId]);

  const loadPesertaAnswers = async () => {
    try {
      setLoading(true);
      
      if (!ujianId || !pesertaId) {
        throw new Error('Parameter tidak lengkap');
      }

      console.log('📄 Loading peserta answers for editing...', { ujianId, pesertaId });
      
      const response = await ApiService.getPesertaAnswers(parseInt(ujianId), parseInt(pesertaId));
      
      console.log('✅ Peserta answers loaded:', response);
      
      setPesertaInfo(response.peserta);
      setUjianInfo(response.ujian);
      setEditedAnswers(response.answers || []);
      
    } catch (error) {
      console.error('❌ Error loading peserta answers:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data jawaban peserta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuestionImageUrl = (imageName: string | null) => {
    if (!imageName || !ujianId) return defaultImage;
    return `http://localhost:5000/api/ujian/${ujianId}/image/${imageName}`;
  };

  const handleAnswerChange = (index: number, newAnswer: string) => {
    setEditedAnswers(prev => 
      prev.map((answer, i) => 
        i === index 
          ? { ...answer, jawaban_siswa: newAnswer }
          : answer
      )
    );
  };

  const handleScoreChange = (index: number, newScore: number) => {
    // Menghilangkan batasan maksimal, hanya memastikan nilai tidak negatif
    const clampedScore = Math.max(0, newScore);
    setEditedAnswers(prev => 
      prev.map((answer, i) => 
        i === index 
          ? { ...answer, nilai: clampedScore }
          : answer
      )
    );
  };

  // Fungsi untuk menghitung nilai rata-rata
  const getAverageScore = () => {
    if (editedAnswers.length === 0) return 0;
    const totalScore = editedAnswers.reduce((sum, answer) => sum + answer.nilai, 0);
    return totalScore / editedAnswers.length;
  };

  const getGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!ujianId || !pesertaId) {
        throw new Error('Parameter tidak lengkap');
      }

      const answersData = editedAnswers.map(answer => ({
        soal_id: answer.soal_id,
        jawaban_siswa: answer.jawaban_siswa,
        nilai: answer.nilai
      }));

      console.log('💾 Saving updated answers...', answersData);

      const response = await ApiService.updatePesertaAnswers(
        parseInt(ujianId), 
        parseInt(pesertaId), 
        answersData
      );

      console.log('✅ Answers saved successfully:', response);

      const averageScore = getAverageScore();
      
      toast({
        title: "Berhasil!",
        description: `Jawaban dan nilai berhasil diperbarui. Nilai rata-rata: ${averageScore.toFixed(1)}`,
      });
      
      navigate(`/ujian/${ujianId}/peserta/${pesertaId}`);
      
    } catch (error) {
      console.error('❌ Error saving answers:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menyimpan perubahan",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/ujian/${ujianId}/peserta/${pesertaId}`);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat data untuk edit...</p>
        </div>
      </div>
    );
  }

  if (!pesertaInfo || !ujianInfo) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Data tidak ditemukan</h2>
          <p className="text-muted-foreground mb-4">Data peserta yang Anda cari tidak dapat ditemukan.</p>
          <Button onClick={() => navigate(`/ujian/${ujianId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Detail Ujian
          </Button>
        </div>
      </div>
    );
  }

  const averageScore = getAverageScore();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleCancel}
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Edit Jawaban & Nilai</h1>
          <p className="text-muted-foreground">
            Edit jawaban dan nilai untuk {pesertaInfo.nama_siswa} - {ujianInfo.nama_ujian}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Nilai Rata-rata</p>
          <p className="text-2xl font-bold text-primary">
            {averageScore.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">
            Grade {getGrade(averageScore)}
          </p>
        </div>
      </div>

      {/* Participant Info Summary */}
      <Card className="bg-muted/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{pesertaInfo.nama_siswa}</h3>
              <p className="text-sm text-muted-foreground">
                NISN: {pesertaInfo.nisn}
                {pesertaInfo.kelas && ` • Kelas: ${pesertaInfo.kelas}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Nilai Sebelumnya</p>
              <p className="font-semibold">{pesertaInfo.total_nilai}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Questions and Answers */}
      <div className="space-y-6">
        {editedAnswers.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium">Belum ada soal untuk diedit</p>
              <p className="text-sm">Soal ujian belum dibuat atau belum ada jawaban</p>
            </div>
          </Card>
        ) : (
          editedAnswers.map((answer, index) => (
            <Card key={answer.soal_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                {/* Question Header */}
                <Label className="font-semibold text-base mb-2 block">Soal {index + 1}</Label>
                
                {/* Question with Image */}
                <div>
                  {answer.status_gambar === 'on' ? (
                    <>
                      {/* Mobile Layout - Image above question */}
                      <div className="md:hidden mb-4">
                        <img 
                          src={getQuestionImageUrl(answer.gambar)}
                          alt={`Gambar soal ${index + 1}`}
                          className="w-full max-w-sm mx-auto rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.src = defaultImage;
                          }}
                        />
                        <p className="text-sm text-foreground bg-muted/20 p-3 rounded mt-3">
                          {answer.pertanyaan}
                        </p>
                      </div>
                      
                      {/* Desktop Layout - Image left of question */}
                      <div className="hidden md:flex gap-4 items-start">
                        <img 
                          src={getQuestionImageUrl(answer.gambar)}
                          alt={`Gambar soal ${index + 1}`}
                          className="w-48 h-32 object-cover rounded border flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = defaultImage;
                          }}
                        />
                        <p className="text-sm text-foreground bg-muted/20 p-3 rounded flex-1">
                          {answer.pertanyaan}
                        </p>
                      </div>
                    </>
                  ) : (
                    // Layout tanpa gambar
                    <p className="text-sm text-foreground bg-muted/20 p-3 rounded">
                      {answer.pertanyaan}
                    </p>
                  )}
                </div>

                {/* Answer Key (Read-only) */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Kunci Jawaban:</Label>
                  <div className="mt-1 p-3 bg-green-50 border-l-4 border-green-500 rounded-r">
                    <p className="text-sm text-foreground">{answer.kunci_jawaban}</p>
                  </div>
                </div>

                {/* Editable Student Answer */}
                <div>
                  <Label htmlFor={`answer-${index}`} className="text-sm font-medium">
                    Jawaban Siswa (dapat diedit):
                  </Label>
                  <Textarea
                    id={`answer-${index}`}
                    value={answer.jawaban_siswa}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    className="mt-1 min-h-[80px]"
                    placeholder="Jawaban siswa..."
                    disabled={saving}
                  />
                </div>

                {/* Editable Score */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor={`score-${index}`} className="text-sm font-medium">
                      Nilai
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id={`score-${index}`}
                        type="number"
                        min="0"
                        value={answer.nilai}
                        onChange={(e) => handleScoreChange(index, parseInt(e.target.value) || 0)}
                        className="w-24 text-center"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  
                  {/* Score indicator */}
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      answer.nilai >= 90 ? 'text-green-600' :
                      answer.nilai >= 80 ? 'text-yellow-600' : 
                      answer.nilai >= 70 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {getScoreGrade(answer.nilai)}
                    </div>
                    <div className="text-xs text-muted-foreground">Grade</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Action Buttons */}
      {editedAnswers.length > 0 && (
        <div className="flex gap-4 pt-6 border-t">
          <Button 
            onClick={handleSave}
            className="flex-1"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="flex-1"
            disabled={saving}
          >
            Batal
          </Button>
        </div>
      )}
    </div>
  );
}