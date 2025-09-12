import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, Users, Loader2, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import apiService from '@/services/api';

interface UjianData {
  id: number;
  nama_ujian: string;
  id_kelas: number | null;
  id_mapel: number | null;
  id_users: number;
  kelas?: {
    id: number;
    nama_kelas: string;
  } | null;
  mata_pelajaran?: {
    id: number;
    nama_mapel: string;
  } | null;
  nama_kelas?: string;
  nama_mata_pelajaran?: string;
}

interface ProcessedUjianData extends UjianData {
  total_participants: number;
  completed_participants: number;
  average_score: number;
  progress_text: string;
  completion_status: {
    status: string;
    message: string;
    progress_percentage: number;
    completed_count: number;
    total_count: number;
  };
  card_priority: number;
  card_style: string;
}

interface KelasOption {
  id: number;
  nama_kelas: string;
}

interface MataPelajaranOption {
  id: number;
  nama_mapel: string;
}

interface UjianCreateRequest {
  nama_ujian: string;
  id_kelas: number | null;
  id_mata_pelajaran: number | null;
}

export default function Ujian() {
  const [exams, setExams] = useState<ProcessedUjianData[]>([]);
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);
  const [mataPelajaranOptions, setMataPelajaranOptions] = useState<MataPelajaranOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedExam, setSelectedExam] = useState<ProcessedUjianData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 6;

  const [formData, setFormData] = useState({
    nama_ujian: '',
    id_kelas: 'none' as string,
    id_mata_pelajaran: 'none' as string
  });

  useEffect(() => {
    loadExams();
    loadKelasOptions();
  }, []);

  const determineCardStyle = (ujian: UjianData, stats: any): { priority: number, style: string } => {
    const hasValidKelas = ujian.kelas?.nama_kelas || ujian.nama_kelas;
    const hasValidMapel = ujian.mata_pelajaran?.nama_mapel || ujian.nama_mata_pelajaran;
    
    const isDataCorrupted = !hasValidKelas && !hasValidMapel;
    
    if (isDataCorrupted) {
      return { priority: 2, style: 'shadow-md shadow-red-500/20 border-red-200' };
    }
    
    const progressPercentage = stats.total_participants > 0 ? 
      (stats.completed_participants / stats.total_participants) * 100 : 0;
    
    if (progressPercentage >= 100) {
      return { priority: 3, style: 'shadow-md shadow-green-500/20 border-green-200' };
    }
    
    return { priority: 1, style: 'shadow-md shadow-blue-500/20 border-blue-200' };
  };

  const processUjianData = async (ujianList: UjianData[]): Promise<ProcessedUjianData[]> => {
    const processedList: ProcessedUjianData[] = [];

    for (const ujian of ujianList) {
      const baseProcessedUjian = {
        ...ujian,
        kelas: ujian.kelas || (ujian.nama_kelas ? { 
          id: ujian.id_kelas || 0, 
          nama_kelas: ujian.nama_kelas 
        } : null),
        mata_pelajaran: ujian.mata_pelajaran || (ujian.nama_mata_pelajaran ? { 
          id: ujian.id_mapel || 0, 
          nama_mapel: ujian.nama_mata_pelajaran 
        } : null),
        total_participants: 0,
        completed_participants: 0,
        average_score: 0,
        progress_text: 'Memuat...',
        completion_status: {
          status: 'loading',
          message: 'Memuat data...',
          progress_percentage: 0,
          completed_count: 0,
          total_count: 0
        },
        card_priority: 1,
        card_style: 'shadow-md shadow-blue-500/20 border-blue-200'
      };

      try {
        const detailResponse = await apiService.getUjianDetail(ujian.id);
        
        let totalParticipants = 0;
        
        if (detailResponse.jumlah_peserta !== undefined) {
          totalParticipants = detailResponse.jumlah_peserta;
        } else if (detailResponse.stats?.total_peserta !== undefined) {
          totalParticipants = detailResponse.stats.total_peserta;
        } else if (detailResponse.peserta && Array.isArray(detailResponse.peserta)) {
          totalParticipants = detailResponse.peserta.length;
        } else if (detailResponse.total_participants !== undefined) {
          totalParticipants = detailResponse.total_participants;
        }
        
        let completedParticipants = 0;
        if (detailResponse.statistik?.sudah_selesai !== undefined) {
          completedParticipants = detailResponse.statistik.sudah_selesai;
        } else if (detailResponse.stats?.completed !== undefined) {
          completedParticipants = detailResponse.stats.completed;
        } else if (detailResponse.peserta && Array.isArray(detailResponse.peserta)) {
          completedParticipants = detailResponse.peserta.filter((p: any) => 
            p.status === 'completed' || p.status === 'selesai'
          ).length;
        }
        
        let averageScore = 0;
        if (detailResponse.statistik?.rata_rata !== undefined) {
          averageScore = detailResponse.statistik.rata_rata;
        } else if (detailResponse.stats?.average_score !== undefined) {
          averageScore = detailResponse.stats.average_score;
        }
        
        let progressText = 'Belum ada peserta';
        if (totalParticipants > 0) {
          progressText = `${completedParticipants}/${totalParticipants} selesai`;
        }

        const completionStatus = {
          status: totalParticipants === 0 ? 'no_participants' : 
                   completedParticipants === 0 ? 'not_started' :
                   completedParticipants === totalParticipants ? 'completed' : 'in_progress',
          message: progressText,
          progress_percentage: totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0,
          completed_count: completedParticipants,
          total_count: totalParticipants
        };

        const styleInfo = determineCardStyle(ujian, {
          total_participants: totalParticipants,
          completed_participants: completedParticipants
        });

        const processedUjian = {
          ...baseProcessedUjian,
          total_participants: totalParticipants,
          completed_participants: completedParticipants,
          average_score: averageScore,
          progress_text: progressText,
          completion_status: completionStatus,
          card_priority: styleInfo.priority,
          card_style: styleInfo.style
        };

        processedList.push(processedUjian);
        
      } catch (error) {
        const fallbackStyleInfo = determineCardStyle(ujian, {
          total_participants: 0,
          completed_participants: 0
        });
        
        const fallbackUjian = {
          ...baseProcessedUjian,
          progress_text: 'Data tidak tersedia',
          completion_status: {
            status: 'unknown',
            message: 'Data tidak tersedia',
            progress_percentage: 0,
            completed_count: 0,
            total_count: 0
          },
          card_priority: fallbackStyleInfo.priority,
          card_style: fallbackStyleInfo.style
        };
        
        processedList.push(fallbackUjian);
      }
    }

    return processedList.sort((a, b) => a.card_priority - b.card_priority);
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUjian();
      
      const processedExams = await processUjianData(response.ujian);
      setExams(processedExams);
    } catch (error: any) {
      console.error('Error loading exams:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data ujian. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadKelasOptions = async () => {
    try {
      const response = await apiService.getUjianKelasOptions();
      setKelasOptions(response.kelas);
    } catch (error: any) {
      console.error('Error loading kelas options:', error);
      toast({
        title: "Warning",
        description: "Gagal memuat data kelas",
        variant: "destructive"
      });
    }
  };

  const loadMataPelajaranByKelas = async (kelasId: number) => {
    try {
      const response = await apiService.getMataPelajaranByKelasForUjian(kelasId);
      setMataPelajaranOptions(response.mata_pelajaran);
    } catch (error: any) {
      console.error('Error loading mata pelajaran options:', error);
      setMataPelajaranOptions([]);
      toast({
        title: "Warning",
        description: "Gagal memuat data mata pelajaran",
        variant: "destructive"
      });
    }
  };

  const handleKelasChange = async (value: string) => {
    setFormData({ 
      ...formData, 
      id_kelas: value, 
      id_mata_pelajaran: 'none'
    });
    
    if (value !== 'none') {
      await loadMataPelajaranByKelas(parseInt(value));
    } else {
      setMataPelajaranOptions([]);
    }
  };

  const handleEditKelasChange = async (value: string) => {
    setFormData({ 
      ...formData, 
      id_kelas: value, 
      id_mata_pelajaran: 'none'
    });
    
    if (value !== 'none') {
      await loadMataPelajaranByKelas(parseInt(value));
    } else {
      setMataPelajaranOptions([]);
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.nama_ujian.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || 
                        (selectedClass === 'none' ? !exam.id_kelas : exam.id_kelas?.toString() === selectedClass);
    return matchesSearch && matchesClass;
  }).sort((a, b) => a.card_priority - b.card_priority);

  const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentExams = filteredExams.slice(startIndex, endIndex);

  const handleAddExam = async () => {
    if (!formData.nama_ujian.trim()) {
      toast({
        title: "Error",
        description: "Nama ujian harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const requestData: UjianCreateRequest = {
        nama_ujian: formData.nama_ujian.trim(),
        id_kelas: formData.id_kelas === 'none' ? null : parseInt(formData.id_kelas),
        id_mata_pelajaran: formData.id_mata_pelajaran === 'none' ? null : parseInt(formData.id_mata_pelajaran)
      };

      const response = await apiService.createUjian(requestData);
      
      const processedNewUjian = await processUjianData([response.ujian]);
      
      setExams([...processedNewUjian, ...exams]);
      
      setFormData({ nama_ujian: '', id_kelas: 'none', id_mata_pelajaran: 'none' });
      setMataPelajaranOptions([]);
      setIsAddModalOpen(false);
      
      toast({
        title: "Berhasil",
        description: response.message || "Ujian berhasil dibuat"
      });
    } catch (error: any) {
      console.error('Error adding exam:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal membuat ujian",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExam = async () => {
    if (!selectedExam || !formData.nama_ujian.trim()) {
      toast({
        title: "Error",
        description: "Nama ujian harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const requestData: UjianCreateRequest = {
        nama_ujian: formData.nama_ujian.trim(),
        id_kelas: formData.id_kelas === 'none' ? null : parseInt(formData.id_kelas),
        id_mata_pelajaran: formData.id_mata_pelajaran === 'none' ? null : parseInt(formData.id_mata_pelajaran)
      };

      const response = await apiService.updateUjian(selectedExam.id, requestData);
      
      const processedUpdatedUjian = await processUjianData([response.ujian]);
      
      setExams(exams.map(e => 
        e.id === selectedExam.id ? processedUpdatedUjian[0] : e
      ).sort((a, b) => a.card_priority - b.card_priority));
      
      setIsEditModalOpen(false);
      setSelectedExam(null);
      setMataPelajaranOptions([]);
      
      toast({
        title: "Berhasil",
        description: response.message || "Ujian berhasil diperbarui"
      });
    } catch (error: any) {
      console.error('Error updating exam:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate ujian",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!selectedExam) return;

    try {
      const response = await apiService.deleteUjian(selectedExam.id);
      
      setExams(exams.filter(e => e.id !== selectedExam.id));
      setSelectedExam(null);
      
      toast({
        title: "Berhasil",
        description: response.message || "Ujian berhasil dihapus"
      });
    } catch (error: any) {
      console.error('Error deleting exam:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus ujian",
        variant: "destructive"
      });
    }
  };

  const openEditModal = async (exam: ProcessedUjianData) => {
    setSelectedExam(exam);
    setFormData({
      nama_ujian: exam.nama_ujian,
      id_kelas: exam.id_kelas ? exam.id_kelas.toString() : 'none',
      id_mata_pelajaran: exam.id_mapel ? exam.id_mapel.toString() : 'none'
    });
    
    if (exam.id_kelas) {
      await loadMataPelajaranByKelas(exam.id_kelas);
    } else {
      setMataPelajaranOptions([]);
    }
    
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ nama_ujian: '', id_kelas: 'none', id_mata_pelajaran: 'none' });
    setMataPelajaranOptions([]);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data ujian...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Ujian</h1>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Buat Ujian Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Buat Ujian Baru</DialogTitle>
              <DialogDescription>
                Buat ujian baru untuk kelas tertentu atau semua kelas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Nama Ujian</Label>
                <Input
                  id="title"
                  value={formData.nama_ujian}
                  onChange={(e) => setFormData({...formData, nama_ujian: e.target.value})}
                  placeholder="Masukkan nama ujian"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="class">Kelas (Opsional)</Label>
                <Select 
                  value={formData.id_kelas} 
                  onValueChange={handleKelasChange}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Semua kelas</SelectItem>
                    {kelasOptions.map((kelas) => (
                      <SelectItem key={kelas.id} value={kelas.id.toString()}>
                        {kelas.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Mata Pelajaran (Opsional)</Label>
                <Select 
                  value={formData.id_mata_pelajaran} 
                  onValueChange={(value) => setFormData({...formData, id_mata_pelajaran: value})}
                  disabled={submitting || formData.id_kelas === 'none' || mataPelajaranOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      formData.id_kelas === 'none' 
                        ? "Pilih kelas terlebih dahulu" 
                        : mataPelajaranOptions.length === 0 
                          ? "Tidak ada mata pelajaran" 
                          : "Pilih mata pelajaran (opsional)"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa mata pelajaran tertentu</SelectItem>
                    {mataPelajaranOptions.map((mapel) => (
                      <SelectItem key={mapel.id} value={mapel.id.toString()}>
                        {mapel.nama_mapel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleAddExam} 
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Buat Ujian
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsAddModalOpen(false);
                  }} 
                  className="flex-1"
                  disabled={submitting}
                >
                  Batal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari ujian berdasarkan nama..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            <SelectItem value="none">Tanpa Kelas Tertentu</SelectItem>
            {kelasOptions.map(kelas => (
              <SelectItem key={kelas.id} value={kelas.id.toString()}>{kelas.nama_kelas}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredExams.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {searchTerm || selectedClass !== 'all' ? "Data ujian tidak ditemukan" : "Belum ada data ujian"}
            </p>
            <p className="text-sm">
              {searchTerm || selectedClass !== 'all' ? "Coba ubah kata kunci pencarian atau filter" : "Buat ujian baru untuk memulai"}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentExams.map((exam) => (
              <Card key={exam.id} className={`transition-all duration-200 ${exam.card_style}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground line-clamp-2 mb-2">{exam.nama_ujian}</h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Kelas:</span>
                      </div>
                      <span className="text-sm font-medium">
                        {exam.kelas?.nama_kelas || 'Semua kelas'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Mata Pelajaran:</span>
                      </div>
                      <span className="text-sm font-medium truncate ml-2">
                        {exam.mata_pelajaran?.nama_mapel || 'Tidak ditentukan'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Jumlah Peserta:</span>
                      </div>
                      <span className="text-sm font-medium">
                        {exam.total_participants} siswa
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/ujian/${exam.id}`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detail
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(exam)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedExam(exam)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Ujian</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus ujian "{exam.nama_ujian}"? 
                            Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait termasuk soal dan hasil ujian.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteExam}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(Math.max(1, currentPage - 1));
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(Math.min(totalPages, currentPage + 1));
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Ujian</DialogTitle>
            <DialogDescription>
              Ubah data ujian yang sudah ada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Nama Ujian</Label>
              <Input
                id="edit-title"
                value={formData.nama_ujian}
                onChange={(e) => setFormData({...formData, nama_ujian: e.target.value})}
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="edit-class">Kelas (Opsional)</Label>
              <Select 
                value={formData.id_kelas} 
                onValueChange={handleEditKelasChange}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Semua kelas</SelectItem>
                  {kelasOptions.map((kelas) => (
                    <SelectItem key={kelas.id} value={kelas.id.toString()}>
                      {kelas.nama_kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-subject">Mata Pelajaran (Opsional)</Label>
              <Select 
                value={formData.id_mata_pelajaran} 
                onValueChange={(value) => setFormData({...formData, id_mata_pelajaran: value})}
                disabled={submitting || formData.id_kelas === 'none'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    formData.id_kelas === 'none' 
                      ? "Pilih kelas terlebih dahulu" 
                      : "Pilih mata pelajaran (opsional)"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa mata pelajaran tertentu</SelectItem>
                  {mataPelajaranOptions.map((mapel) => (
                    <SelectItem key={mapel.id} value={mapel.id.toString()}>
                      {mapel.nama_mapel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleEditExam} 
                className="flex-1"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedExam(null);
                  setMataPelajaranOptions([]);
                }} 
                className="flex-1"
                disabled={submitting}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}