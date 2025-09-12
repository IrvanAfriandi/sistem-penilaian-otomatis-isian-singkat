import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, Edit, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';

interface PesertaDetail {
  id: number;
  nama_siswa: string;
  nisn: string;
  kelas: string | null;
  status: 'selesai' | 'belum selesai';
  total_nilai: number;  // Backend akan selalu mengembalikan number (0.0 jika null)
  foto_jawaban: string | null;
}

interface UjianInfo {
  id: number;
  nama_ujian: string;
}

interface SoalWithAnswer {
  id: number;
  pertanyaan: string;
  kunci_jawaban: string;
  gambar: string | null;
  status_gambar: 'on' | 'off';
  jawaban_siswa: string | null;
  nilai: number;  // Backend akan selalu mengembalikan number (0.0 jika null)
}

export default function DetailJawabanPeserta() {
  const { ujianId, pesertaId } = useParams<{ ujianId: string; pesertaId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [pesertaDetail, setPesertaDetail] = useState<PesertaDetail | null>(null);
  const [ujianInfo, setUjianInfo] = useState<UjianInfo | null>(null);
  const [soalList, setSoalList] = useState<SoalWithAnswer[]>([]);

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
    loadPesertaDetail();
  }, [ujianId, pesertaId]);

  const loadPesertaDetail = async () => {
    try {
      setLoading(true);
      
      if (!ujianId || !pesertaId) {
        throw new Error('Parameter tidak lengkap');
      }

      console.log('📄 Loading peserta detail...', { ujianId, pesertaId });
      
      const response = await ApiService.getPesertaDetail(parseInt(ujianId), parseInt(pesertaId));
      
      console.log('✅ Peserta detail loaded:', response);
      
      setPesertaDetail(response.peserta);
      setUjianInfo(response.ujian);
      setSoalList(response.soal || []);
      
    } catch (error) {
      console.error('❌ Error loading peserta detail:', error);
      toast({
        title: "Error",
        description: "Gagal memuat detail peserta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
  };

  // Fungsi untuk menghitung nilai rata-rata
  const calculateAverageScore = () => {
    if (soalList.length === 0) return 0;
    const totalScore = soalList.reduce((sum, soal) => sum + soal.nilai, 0);
    return totalScore / soalList.length;
  };

  const getQuestionImageUrl = (imageName: string | null) => {
    if (!imageName || !ujianId) return defaultImage;
    return `http://localhost:5000/api/ujian/${ujianId}/image/${imageName}`;
  };

  const getAnswerImageUrl = (filename: string | null) => {
    if (!filename) return null;
    return ApiService.getAnswerImageUrl(filename);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat detail peserta...</p>
        </div>
      </div>
    );
  }

  if (!pesertaDetail || !ujianInfo) {
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

  const averageScore = calculateAverageScore();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/ujian/${ujianId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Detail Peserta</h1>
          <p className="text-muted-foreground">Informasi lengkap hasil ujian - {ujianInfo.nama_ujian}</p>
        </div>
        <Button
          onClick={() => navigate(`/ujian/${ujianId}/edit/${pesertaId}`)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit Jawaban
        </Button>
      </div>

      {/* Participant Info */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          {/* Desktop Layout */}
          <div className="hidden md:block">
            <div className="flex items-center justify-center gap-16">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">{pesertaDetail.nama_siswa}</h2>
                  <p className="text-muted-foreground">NISN: {pesertaDetail.nisn}</p>
                  {pesertaDetail.kelas && (
                    <p className="text-muted-foreground">Kelas: {pesertaDetail.kelas}</p>
                  )}
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-32 h-32 rounded-full border-8 border-primary/20 flex items-center justify-center bg-primary/5">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(averageScore)}`}>
                      {averageScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Nilai Rata-rata</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Badge variant="outline" className="text-lg font-bold">
                    Grade {getGrade(averageScore)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{pesertaDetail.nama_siswa}</h2>
                <p className="text-muted-foreground text-sm">NISN: {pesertaDetail.nisn}</p>
                {pesertaDetail.kelas && (
                  <p className="text-muted-foreground text-sm">Kelas: {pesertaDetail.kelas}</p>
                )}
              </div>
            </div>
            
            <div className="text-center pt-2">
              <div className="w-24 h-24 rounded-full border-6 border-primary/20 flex items-center justify-center bg-primary/5 mx-auto mb-3">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                    {averageScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">Nilai</div>
                </div>
              </div>
              <Badge variant="outline" className="text-base font-bold">
                Grade {getGrade(averageScore)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answer Photo */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Foto Jawaban
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pesertaDetail.foto_jawaban ? (
            <div className="bg-muted/20 rounded-lg p-4">
              <img 
                src={getAnswerImageUrl(pesertaDetail.foto_jawaban) || ''}
                alt="Foto Jawaban Siswa"
                className="w-full h-96 object-contain mx-auto rounded border shadow-sm bg-white"
                onError={(e) => {
                  console.error('Failed to load answer image:', pesertaDetail.foto_jawaban);
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.removeAttribute('style');
                }}
              />
              {/* Fallback content */}
              <div className="text-center text-muted-foreground py-8" style={{ display: 'none' }}>
                <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Gambar tidak dapat dimuat</p>
                <p className="text-sm">File: {pesertaDetail.foto_jawaban}</p>
              </div>
            </div>
          ) : (
            <div className="bg-muted/20 rounded-lg p-8 text-center h-96 flex items-center justify-center">
              <div className="text-muted-foreground">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Belum ada foto jawaban</p>
                <p className="text-sm">Siswa belum mengupload foto jawaban</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions and Answers Detail */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Detail Soal dan Jawaban</h2>
        
        {soalList.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Belum ada soal</p>
              <p className="text-sm">Soal ujian belum dibuat</p>
            </div>
          </Card>
        ) : (
          soalList.map((soal, index) => (
            <Card key={soal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                {/* Question Header */}
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-lg">Soal {index + 1}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Nilai:</span>
                    <Badge variant={soal.nilai >= 70 ? "default" : "destructive"} className="font-bold">
                      {soal.nilai}
                    </Badge>
                  </div>
                </div>

                {/* Question with Image */}
                <div>
                  {soal.status_gambar === 'on' ? (
                    // Layout dengan gambar
                    <div className="md:hidden mb-4">
                      <img 
                        src={getQuestionImageUrl(soal.gambar)}
                        alt={`Gambar soal ${index + 1}`}
                        className="w-full max-w-sm mx-auto rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.src = defaultImage;
                        }}
                      />
                      <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                        <p className="text-sm text-foreground">{soal.pertanyaan}</p>
                      </div>
                    </div>
                  ) : (
                    // Layout tanpa gambar
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                      <p className="text-sm text-foreground">{soal.pertanyaan}</p>
                    </div>
                  )}
                  
                  {/* Desktop layout dengan gambar */}
                  {soal.status_gambar === 'on' && (
                    <div className="hidden md:flex gap-4 items-start">
                      <img 
                        src={getQuestionImageUrl(soal.gambar)}
                        alt={`Gambar soal ${index + 1}`}
                        className="w-48 h-32 object-cover rounded border flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = defaultImage;
                        }}
                      />
                      <div className="flex-1 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                        <p className="text-sm text-foreground">{soal.pertanyaan}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Answer Key */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Kunci Jawaban:</Label>
                  <div className="mt-1 p-3 bg-green-50 border-l-4 border-green-500 rounded-r">
                    <p className="text-sm text-foreground">{soal.kunci_jawaban}</p>
                  </div>
                </div>

                {/* Student Answer */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Jawaban Siswa:</Label>
                  <div className="mt-1 p-3 bg-orange-50 border-l-4 border-orange-500 rounded-r">
                    <p className="text-sm text-foreground">
                      {soal.jawaban_siswa || 'Belum ada jawaban'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}