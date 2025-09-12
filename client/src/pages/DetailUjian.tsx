import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Upload, Eye, Edit, Check, Clock, FileText, Users, Search, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useToast } from '@/hooks/use-toast';
import { ProgressCircle } from '@/components/ui/progress-circle';
import ApiService from '@/services/api';

interface UjianDetail {
  id: number;
  nama_ujian: string;
  kelas: string | null;
  mata_pelajaran: string | null;
  id_kelas: number | null;
  id_mapel: number | null;
}

interface Soal {
  id: number;
  id_ujian: number;
  pertanyaan: string;
  kunci_jawaban: string;
  gambar: string | null;
  status_gambar: 'on' | 'off';
}

interface Peserta {
  id: number;
  siswa_id: number;
  nama_siswa: string;
  nisn: string;
  status: 'completed' | 'not_completed';
  score: number | null;
  total_jawaban: number;
  total_soal: number;
  inExam: boolean;
}

interface Stats {
  total_peserta: number;
  completed: number;
  not_completed: number;
}

export default function DetailUjian() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [ujianDetail, setUjianDetail] = useState<UjianDetail | null>(null);
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [pesertaList, setPesertaList] = useState<Peserta[]>([]);
  const [stats, setStats] = useState<Stats>({ total_peserta: 0, completed: 0, not_completed: 0 });
  
  const [questions, setQuestions] = useState<string[]>(['', '', '', '', '']);
  const [answerKeys, setAnswerKeys] = useState<string[]>(['', '', '', '', '']);
  const [questionImages, setQuestionImages] = useState<{ [key: number]: { 
    file: File | null, 
    preview: string | null
  } }>({});
  const [imageEnabled, setImageEnabled] = useState<{ [key: number]: boolean }>({});
  
  const [participantSearch, setParticipantSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isEditQuestionsOpen, setIsEditQuestionsOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Peserta | null>(null);
  const [saving, setSaving] = useState(false);

  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [modalStudents, setModalStudents] = useState<any[]>([]);
  const [modalOriginalStudents, setModalOriginalStudents] = useState<any[]>([]);
  const [modalSearch, setModalSearch] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);

  const [pdfExporting, setPdfExporting] = useState(false);

  const ITEMS_PER_PAGE = 6;

  const isQuestionsComplete = () => {
    return soalList.every(soal => 
      soal.pertanyaan && soal.pertanyaan.trim() !== '' && 
      soal.kunci_jawaban && soal.kunci_jawaban.trim() !== ''
    );
  };

  useEffect(() => {
    loadUjianDetail();
  }, [id]);

  const loadUjianDetail = async () => {
    try {
      setLoading(true);
      
      if (!id) {
        throw new Error('Ujian ID not found');
      }

      const response = await ApiService.getUjianDetail(parseInt(id));
      
      setUjianDetail(response.ujian);
      setSoalList(response.soal || []);
      setPesertaList(response.peserta || []);
      setStats(response.stats);
      
      const newQuestions = ['', '', '', '', ''];
      const newAnswerKeys = ['', '', '', '', ''];
      const newImageEnabled: { [key: number]: boolean } = {};
      const newQuestionImages: { [key: number]: { 
        file: File | null, 
        preview: string | null
      } } = {};
      
      response.soal?.forEach((soal: Soal, index: number) => {
        if (index < 5) {
          newQuestions[index] = soal.pertanyaan;
          newAnswerKeys[index] = soal.kunci_jawaban;
          newImageEnabled[index] = soal.status_gambar === 'on';
          
          if (soal.gambar) {
            const imageUrl = `http://localhost:5000/api/ujian/${id}/image/${soal.gambar}`;
            newQuestionImages[index] = {
              file: null,
              preview: imageUrl
            };
          }
        }
      });
      
      setQuestions(newQuestions);
      setAnswerKeys(newAnswerKeys);
      setImageEnabled(newImageEnabled);
      setQuestionImages(newQuestionImages);
      
    } catch (error) {
      console.error('Error loading ujian detail:', error);
      toast({
        title: "Error",
        description: "Gagal memuat detail ujian",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = pesertaList.filter(participant => 
    participant.nama_siswa.toLowerCase().includes(participantSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredParticipants.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentParticipants = filteredParticipants.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleExportPdf = async () => {
    if (!ujianDetail || !id) return;
    
    try {
      setPdfExporting(true);
      
      if (soalList.length === 0) {
        toast({
          title: "Peringatan",
          description: "Tidak ada soal untuk diekspor. Tambahkan soal terlebih dahulu.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Memproses...",
        description: "Sedang membuat lembar jawaban PDF...",
      });

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      const response = await fetch(`http://localhost:5000/api/ujian/${id}/export-pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('File PDF kosong');
      }
      
      const timestamp = new Date().toISOString().slice(0, 10);
      const cleanName = ujianDetail.nama_ujian.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const filename = `${cleanName}_Lembar_Jawaban_${timestamp}.pdf`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setTimeout(() => {
        toast({
          title: "Berhasil!",
          description: `Lembar jawaban berhasil diunduh: ${filename}`,
        });
      }, 100);
      
    } catch (error) {
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Gagal mengekspor PDF",
        variant: "destructive"
      });
    } finally {
      setPdfExporting(false);
    }
  };

  const handleSaveQuestions = async () => {
    try {
      setSaving(true);
      
      if (!id) {
        throw new Error('Ujian ID not found');
      }

      const validQuestions = questions.filter(q => q.trim() !== '');
      const validAnswers = answerKeys.filter(a => a.trim() !== '');
      
      if (validQuestions.length !== validAnswers.length) {
        throw new Error('Jumlah soal dan kunci jawaban harus sama');
      }

      const questionsData = [];
      const token = localStorage.getItem('access_token');
      
      for (let i = 0; i < Math.max(validQuestions.length, validAnswers.length, 5); i++) {
        const questionData: any = {
          pertanyaan: validQuestions[i] || '',
          kunci_jawaban: validAnswers[i] || '',
          status_gambar: imageEnabled[i] ? 'on' : 'off',
          gambar: null
        };
        
        if (imageEnabled[i]) {
          const existingImage = questionImages[i];
          const existingSoal = soalList[i];
          
          if (existingImage?.file) {
            try {
              const formData = new FormData();
              formData.append('file', existingImage.file);
              formData.append('question_index', i.toString());
              
              const uploadResponse = await fetch(`http://localhost:5000/api/ujian/${id}/upload-image`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: formData
              });
              
              if (uploadResponse.ok) {
                const uploadData = await uploadResponse.json();
                questionData.gambar = uploadData.filename;
              }
            } catch (uploadError) {
              console.error('Error uploading new image:', uploadError);
            }
          } else if (existingSoal?.gambar) {
            questionData.gambar = existingSoal.gambar;
          }
        }
        
        if (questionData.pertanyaan.trim() || questionData.gambar) {
          questionsData.push(questionData);
        }
      }

      await ApiService.updateUjianQuestions(parseInt(id), {
        questions_data: questionsData
      });

      await loadUjianDetail();
      
      setIsEditQuestionsOpen(false);
      toast({
        title: "Berhasil!",
        description: "Soal ujian berhasil disimpan.",
      });
    } catch (error) {
      console.error('Error saving questions:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menyimpan soal",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const openParticipantModal = async () => {
    setIsParticipantModalOpen(true);
    setModalLoading(true);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:5000/api/ujian/${id}/available-students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const students = data.students || [];
      
      setModalStudents(students);
      setModalOriginalStudents(JSON.parse(JSON.stringify(students)));
      
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data siswa",
        variant: "destructive"
      });
    } finally {
      setModalLoading(false);
    }
  };

  const closeParticipantModal = () => {
    setIsParticipantModalOpen(false);
    setModalStudents([]);
    setModalOriginalStudents([]);
    setModalSearch('');
  };

  const handleModalToggle = (studentId: number) => {
    setModalStudents(prev => {
      const updated = prev.map(student => 
        student.id === studentId 
          ? { ...student, inExam: !student.inExam }
          : student
      );
      return updated;
    });
  };

  const saveModalChanges = async () => {
    if (modalSaving) return;
    
    const changes = modalStudents.filter(student => {
      const original = modalOriginalStudents.find(orig => orig.id === student.id);
      return original && original.inExam !== student.inExam;
    });
    
    if (changes.length === 0) {
      closeParticipantModal();
      return;
    }

    setModalSaving(true);
    
    try {
      const token = localStorage.getItem('access_token');
      
      for (const change of changes) {
        if (change.inExam) {
          const response = await fetch(`http://localhost:5000/api/ujian/${id}/toggle-peserta`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ siswa_id: change.id })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to add student ${change.id}`);
          }
        } else {
          const response = await fetch(`http://localhost:5000/api/ujian/${id}/remove-peserta`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ siswa_id: change.id })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to remove student ${change.id}`);
          }
        }
      }
      
      toast({
        title: "Berhasil!",
        description: `${changes.length} perubahan berhasil disimpan.`,
      });
      
      await loadUjianDetail();
      closeParticipantModal();
      
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan perubahan",
        variant: "destructive"
      });
    } finally {
      setModalSaving(false);
    }
  };

  const cancelModalChanges = () => {
    const changes = modalStudents.filter(student => {
      const original = modalOriginalStudents.find(orig => orig.id === student.id);
      return original && original.inExam !== student.inExam;
    });
    
    if (changes.length > 0) {
      toast({
        title: "Dibatalkan",
        description: "Perubahan tidak disimpan.",
      });
    }
    
    closeParticipantModal();
  };

  const handleImageUpload = (questionIndex: number, file: File) => {
    const preview = URL.createObjectURL(file);
    setQuestionImages(prev => ({
      ...prev,
      [questionIndex]: { 
        file, 
        preview
      }
    }));
  };

  const toggleImageEnabled = (questionIndex: number) => {
    setImageEnabled(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }));
    
    if (imageEnabled[questionIndex]) {
      setQuestionImages(prev => ({
        ...prev,
        [questionIndex]: { file: null, preview: null }
      }));
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'completed' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-orange-100 text-orange-800';
  };

  const getStatusIcon = (status: string) => {
    return status === 'completed' ? Check : Clock;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat detail ujian...</p>
        </div>
      </div>
    );
  }

  if (!ujianDetail) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Ujian tidak ditemukan</h2>
          <p className="text-muted-foreground mb-4">Ujian yang Anda cari tidak dapat ditemukan.</p>
          <Button onClick={() => navigate('/ujian')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Ujian
          </Button>
        </div>
      </div>
    );
  }

  const questionsComplete = isQuestionsComplete();

  return (
    <div className="p-6 space-y-6">
      <style dangerouslySetInnerHTML={{
        __html: `
          .hide-scrollbar {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `
      }} />
      
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/ujian')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{ujianDetail.nama_ujian}</h1>
          <p className="text-muted-foreground">Detail ujian dan peserta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardContent className="space-y-6 mt-6">
              <div className="text-center space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-md mx-auto">
                  <div>
                    <Label className="text-sm text-muted-foreground">Mata Pelajaran</Label>
                    <p className="font-medium text-lg">{ujianDetail.mata_pelajaran || 'Tidak ditentukan'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Kelas</Label>
                    <p className="font-medium text-lg">{ujianDetail.kelas || 'Tidak ditentukan'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label className="text-sm text-muted-foreground">Progress Peserta</Label>
                  <div className="flex flex-col items-center space-y-3">
                    <ProgressCircle 
                      value={stats.total_peserta > 0 ? Math.round((stats.completed / stats.total_peserta) * 100) : 0} 
                      size={80} 
                      strokeWidth={8}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">
                          {stats.total_peserta > 0 ? Math.round((stats.completed / stats.total_peserta) * 100) : 0}%
                        </div>
                      </div>
                    </ProgressCircle>
                    <div className="text-center">
                      <p className="text-sm">
                        <span className="font-medium">{stats.completed}</span> dari{' '}
                        <span className="font-medium">{stats.total_peserta}</span> siswa telah selesai
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stats.not_completed} siswa belum mengumpulkan
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="space-y-3">
              <Button
                onClick={() => setIsEditQuestionsOpen(true)}
                variant="outline"
                className="w-full justify-start mt-6"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Soal
              </Button>
              
              <Button
                onClick={handleExportPdf}
                className="w-full justify-start"
                disabled={!questionsComplete || soalList.length === 0 || pdfExporting}
              >
                {pdfExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Lembar Soal PDF
                  </>
                )}
              </Button>
              
              {!questionsComplete && (
                <p className="text-xs text-muted-foreground text-center">
                  Lengkapi semua soal dan jawaban terlebih dahulu
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="space-y-3">
              <Button
                onClick={openParticipantModal}
                variant="outline"
                className="w-full justify-start mt-6"
              >
                <Users className="mr-2 h-4 w-4" />
                Kelola Peserta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama peserta..."
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredParticipants.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {participantSearch ? "Data peserta tidak ditemukan" : "Belum ada peserta ujian"}
                </p>
                <p className="text-sm">
                  {participantSearch ? "Coba ubah kata kunci pencarian Anda" : "Tambah peserta untuk memulai ujian"}
                </p>
              </div>
            </Card>
          ) : (
            <>
              <div className="hidden sm:block">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {currentParticipants.map((participant) => (
                    <ParticipantCard 
                      key={participant.id} 
                      participant={participant}
                      questionsComplete={questionsComplete}
                      onUpload={() => {
                        setSelectedParticipant(participant);
                        navigate(`/ujian/${id}/upload-jawaban/${participant.id}`);
                      }}
                      onView={() => navigate(`/ujian/${id}/peserta/${participant.id}`)}
                      onEdit={() => navigate(`/ujian/${id}/edit/${participant.id}`)}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                    />
                  ))}
                </div>
              </div>

              <div className="block sm:hidden">
                <Carousel className="w-full max-w-xs mx-auto">
                  <CarouselContent>
                    {currentParticipants.map((participant) => (
                      <CarouselItem key={participant.id}>
                        <ParticipantCard 
                          participant={participant}
                          questionsComplete={questionsComplete}
                          onUpload={() => {
                            setSelectedParticipant(participant);
                            navigate(`/ujian/${id}/upload-jawaban/${participant.id}`);
                          }}
                          onView={() => navigate(`/ujian/${id}/peserta/${participant.id}`)}
                          onEdit={() => navigate(`/ujian/${id}/edit/${participant.id}`)}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>

              {totalPages > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditQuestionsOpen} onOpenChange={setIsEditQuestionsOpen}>
        <DialogContent className="sm:max-w-4xl max-w-[95vw] max-h-[90vh] overflow-y-auto hide-scrollbar">
          <DialogHeader>
            <DialogTitle>Edit Soal Ujian</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="space-y-4 p-4 border rounded-lg">
                <Label className="text-lg font-semibold">Soal {num}</Label>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`image-switch-${num}`}
                    checked={imageEnabled[num - 1] || false}
                    onCheckedChange={() => toggleImageEnabled(num - 1)}
                  />
                  <Label htmlFor={`image-switch-${num}`} className="text-sm">
                    Tambahkan gambar?
                  </Label>
                </div>
                
                {imageEnabled[num - 1] ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label>Gambar Soal</Label>
                      <div className="space-y-3">
                        <div 
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) handleImageUpload(num - 1, file);
                            };
                            input.click();
                          }}
                        >
                          {questionImages[num - 1]?.preview ? (
                            <div className="space-y-2">
                              <img
                                src={questionImages[num - 1].preview || ''}
                                alt={`Soal ${num}`}
                                className="max-w-full h-32 object-contain mx-auto rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <p className="text-xs text-muted-foreground">Klik untuk ganti gambar</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="h-8 w-8 mx-auto text-gray-400" />
                              <p className="text-sm text-gray-600">Klik untuk upload gambar</p>
                              <p className="text-xs text-gray-400">PNG, JPG, GIF hingga 5MB</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Pertanyaan</Label>
                        <Textarea
                          value={questions[num - 1] || ''}
                          onChange={(e) => {
                            const newQuestions = [...questions];
                            newQuestions[num - 1] = e.target.value;
                            setQuestions(newQuestions);
                          }}
                          placeholder={`Masukkan soal nomor ${num}`}
                          className="min-h-[120px]"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Kunci Jawaban</Label>
                        <Textarea
                          value={answerKeys[num - 1] || ''}
                          onChange={(e) => {
                            const newAnswerKeys = [...answerKeys];
                            newAnswerKeys[num - 1] = e.target.value;
                            setAnswerKeys(newAnswerKeys);
                          }}
                          placeholder={`Masukkan kunci jawaban nomor ${num}`}
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Pertanyaan</Label>
                      <Textarea
                        value={questions[num - 1] || ''}
                        onChange={(e) => {
                          const newQuestions = [...questions];
                          newQuestions[num - 1] = e.target.value;
                          setQuestions(newQuestions);
                        }}
                        placeholder={`Masukkan soal nomor ${num}`}
                        className="min-h-[120px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Kunci Jawaban</Label>
                      <Textarea
                        value={answerKeys[num - 1] || ''}
                        onChange={(e) => {
                          const newAnswerKeys = [...answerKeys];
                          newAnswerKeys[num - 1] = e.target.value;
                          setAnswerKeys(newAnswerKeys);
                        }}
                        placeholder={`Masukkan kunci jawaban nomor ${num}`}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveQuestions} className="flex-1" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsEditQuestionsOpen(false)} className="flex-1" disabled={saving}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isParticipantModalOpen} onOpenChange={(open) => {
        if (!open && !modalSaving) {
          closeParticipantModal();
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Kelola Peserta Ujian</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama siswa..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="flex-1"
                disabled={modalLoading || modalSaving}
              />
            </div>
            
            {modalLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Memuat data siswa...</span>
              </div>
            )}
            
            {modalSaving && (
              <div className="flex items-center justify-center py-4 bg-blue-50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Menyimpan perubahan...</span>
              </div>
            )}
            
            {!modalLoading && (
              <div className="space-y-2 max-h-80 overflow-y-auto hide-scrollbar">
                {modalStudents
                  .filter(student => 
                    student.nama_siswa.toLowerCase().includes(modalSearch.toLowerCase())
                  )
                  .sort((a, b) => (a.inExam === b.inExam ? 0 : a.inExam ? 1 : -1))
                  .map((student) => {
                    const original = modalOriginalStudents.find(orig => orig.id === student.id);
                    const isModified = original && original.inExam !== student.inExam;
                    
                    return (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                          student.inExam 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-orange-300 bg-orange-50'
                        } ${isModified ? 'ring-2 ring-blue-300' : ''}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{student.nama_siswa}</p>
                            {isModified && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                Diubah
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col text-sm text-muted-foreground">
                            <span>NISN: {student.nisn}</span>
                            {student.kelas_nama && (
                              <span>Kelas: {student.kelas_nama}</span>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={student.inExam}
                          onCheckedChange={() => handleModalToggle(student.id)}
                          disabled={modalLoading || modalSaving}
                        />
                      </div>
                    );
                  })}
                
                {modalStudents.filter(student => 
                  student.nama_siswa.toLowerCase().includes(modalSearch.toLowerCase())
                ).length === 0 && !modalLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Tidak ada siswa yang ditemukan</p>
                    <p className="text-sm">Coba ubah kata kunci pencarian</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={cancelModalChanges}
                disabled={modalLoading || modalSaving}
              >
                Batal
              </Button>
              
              <Button 
                onClick={saveModalChanges}
                disabled={modalLoading || modalSaving}
              >
                {modalSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan & Tutup'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParticipantCard({ participant, questionsComplete, onUpload, onView, onEdit, getStatusColor, getStatusIcon }: any) {
  const StatusIcon = getStatusIcon(participant.status);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
              {participant.nama_siswa.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{participant.nama_siswa}</h3>
              <p className="text-xs text-muted-foreground">NISN: {participant.nisn}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(participant.status)} flex-shrink-0`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {participant.status === 'completed' ? 'Selesai' : 'Menunggu'}
          </Badge>
        </div>
        
        {participant.status === 'completed' ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nilai Rata-rata:</span>
              <span className="font-medium text-primary">{participant.score?.toFixed(1) || '0.0'}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(participant)}
                className="flex-1"
              >
                <Eye className="h-3 w-3 mr-1" />
                Info
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(participant)}
                className="flex-1"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={() => onUpload(participant)}
              className="w-full"
              size="sm"
              disabled={!questionsComplete}
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload Jawaban
            </Button>
            {!questionsComplete && (
              <p className="text-xs text-muted-foreground text-center">
                Lengkapi semua soal terlebih dahulu
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}