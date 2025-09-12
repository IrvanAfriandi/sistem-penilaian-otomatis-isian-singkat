import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/api';

interface SiswaData {
  id: number;
  nama_siswa: string;
  nisn: string;
  kelas: number | null;
  nama_kelas: string | null;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  totalExams: number;
  averageScore: number;
}

interface KelasOption {
  id: number;
  nama_kelas: string;
}

export default function DataSiswa() {
  const [students, setStudents] = useState<SiswaData[]>([]);
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<SiswaData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nama_siswa: '',
    kelas: 'none' as string,
    nisn: '',
    jenis_kelamin: 'none' as string
  });

  // Load data saat component mount
  useEffect(() => {
    loadStudents();
    loadKelasOptions();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSiswa();
      setStudents(response.siswa);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data siswa. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadKelasOptions = async () => {
    try {
      const response = await apiService.getKelasOptions();
      setKelasOptions(response.kelas);
    } catch (error) {
      console.error('Error loading kelas options:', error);
    }
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.nisn.includes(searchTerm);
    const matchesClass = selectedClass === 'all' || 
                        (selectedClass === 'none' ? !student.kelas : student.kelas?.toString() === selectedClass);
    return matchesSearch && matchesClass;
  });

  const handleAddStudent = async () => {
    if (!formData.nama_siswa.trim() || !formData.nisn.trim() || formData.jenis_kelamin === 'none') {
      toast({
        title: "Error",
        description: "Nama, NISN, dan jenis kelamin harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiService.createSiswa({
        nama_siswa: formData.nama_siswa,
        nisn: formData.nisn,
        kelas: formData.kelas === 'none' ? null : parseInt(formData.kelas),
        jenis_kelamin: formData.jenis_kelamin as 'Laki-laki' | 'Perempuan'
      });
      
      // Tambahkan ke state lokal
      setStudents([...students, response.siswa]);
      
      setFormData({ nama_siswa: '', kelas: 'none', nisn: '', jenis_kelamin: 'none' });
      setIsAddModalOpen(false);
      
      toast({
        title: "Berhasil",
        description: response.message
      });
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menambah siswa",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent || !formData.nama_siswa.trim() || !formData.nisn.trim() || formData.jenis_kelamin === 'none') {
      toast({
        title: "Error",
        description: "Nama, NISN, dan jenis kelamin harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiService.updateSiswa(selectedStudent.id, {
        nama_siswa: formData.nama_siswa,
        nisn: formData.nisn,
        kelas: formData.kelas === 'none' ? null : parseInt(formData.kelas),
        jenis_kelamin: formData.jenis_kelamin as 'Laki-laki' | 'Perempuan'
      });
      
      // Update state lokal
      setStudents(students.map(s => 
        s.id === selectedStudent.id ? response.siswa : s
      ));
      
      setIsEditModalOpen(false);
      setSelectedStudent(null);
      
      toast({
        title: "Berhasil",
        description: response.message
      });
    } catch (error: any) {
      console.error('Error updating student:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate siswa",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    try {
      const response = await apiService.deleteSiswa(selectedStudent.id);
      
      // Hapus dari state lokal
      setStudents(students.filter(s => s.id !== selectedStudent.id));
      setSelectedStudent(null);
      
      toast({
        title: "Berhasil",
        description: response.message
      });
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus siswa",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (student: SiswaData) => {
    setSelectedStudent(student);
    setFormData({
      nama_siswa: student.nama_siswa,
      kelas: student.kelas ? student.kelas.toString() : 'none',
      nisn: student.nisn,
      jenis_kelamin: student.jenis_kelamin
    });
    setIsEditModalOpen(true);
  };

  const openDetailModal = (student: SiswaData) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const getGenderColor = (gender: string) => {
    return gender === 'Laki-laki' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary';
  };

  const getSelectValue = (value: number | null): string => {
    return value ? value.toString() : 'none';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data siswa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Siswa</h1>
          <p className="text-muted-foreground">Kelola Data Siswa</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Siswa Baru</DialogTitle>
              <DialogDescription>
                Tambahkan data siswa baru ke dalam sistem
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={formData.nama_siswa}
                  onChange={(e) => setFormData({...formData, nama_siswa: e.target.value})}
                  placeholder="Masukkan nama lengkap"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="class">Kelas</Label>
                <Select 
                  value={formData.kelas} 
                  onValueChange={(value) => setFormData({...formData, kelas: value})}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa kelas</SelectItem>
                    {kelasOptions.map((kelas) => (
                      <SelectItem key={kelas.id} value={kelas.id.toString()}>
                        {kelas.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nisn">NISN</Label>
                <Input
                  id="nisn"
                  value={formData.nisn}
                  onChange={(e) => setFormData({...formData, nisn: e.target.value})}
                  placeholder="Masukkan NISN"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="gender">Jenis Kelamin</Label>
                <Select 
                  value={formData.jenis_kelamin} 
                  onValueChange={(value) => setFormData({...formData, jenis_kelamin: value})}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleAddStudent} 
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFormData({ nama_siswa: '', kelas: 'none', nisn: '', jenis_kelamin: 'none' });
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

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari siswa berdasarkan nama atau NISN..."
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
            {kelasOptions.map(kelas => (
              <SelectItem key={kelas.id} value={kelas.id.toString()}>{kelas.nama_kelas}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Students Grid */}
      {filteredStudents.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-lg font-medium">
              {searchTerm || selectedClass !== 'all' ? "Data siswa tidak ditemukan" : "Belum ada data siswa"}
            </p>
            <p className="text-sm">
              {searchTerm || selectedClass !== 'all' ? "Coba ubah kata kunci pencarian atau filter" : "Tambah siswa baru untuk memulai"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                      {student.nama_siswa.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{student.nama_siswa}</h3>
                      <p className="text-sm text-muted-foreground truncate">NISN: {student.nisn}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Kelas:</span>
                    <Badge variant="outline">{student.nama_kelas || 'Belum ada kelas'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Jenis Kelamin:</span>
                    <Badge className={getGenderColor(student.jenis_kelamin)}>{student.jenis_kelamin}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Ujian:</span>
                    <span className="font-medium">{student.totalExams}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Nilai Rata-rata:</span>
                    <span className={`font-medium ${getScoreColor(student.averageScore)}`}>
                      {student.averageScore.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDetailModal(student)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detail
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(student)}
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
                        onClick={() => setSelectedStudent(student)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Data Siswa</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus data siswa "{student.nama_siswa}"? 
                          Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteStudent}
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
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Siswa</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-medium">
                  {selectedStudent.nama_siswa.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedStudent.nama_siswa}</h3>
                  <p className="text-muted-foreground">NISN: {selectedStudent.nisn}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Kelas</Label>
                  <p className="font-medium">{selectedStudent.nama_kelas || 'Belum ada kelas'}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Jenis Kelamin</Label>
                  <p className="font-medium">{selectedStudent.jenis_kelamin}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Ujian</Label>
                  <p className="font-medium">{selectedStudent.totalExams}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Nilai Rata-rata</Label>
                  <p className={`font-medium ${getScoreColor(selectedStudent.averageScore)}`}>
                    {selectedStudent.averageScore.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Siswa</DialogTitle>
            <DialogDescription>
              Ubah data siswa yang sudah ada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nama Lengkap</Label>
              <Input
                id="edit-name"
                value={formData.nama_siswa}
                onChange={(e) => setFormData({...formData, nama_siswa: e.target.value})}
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="edit-class">Kelas</Label>
              <Select 
                value={formData.kelas} 
                onValueChange={(value) => setFormData({...formData, kelas: value})}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa kelas</SelectItem>
                  {kelasOptions.map((kelas) => (
                    <SelectItem key={kelas.id} value={kelas.id.toString()}>
                      {kelas.nama_kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-nisn">NISN</Label>
              <Input
                id="edit-nisn"
                value={formData.nisn}
                onChange={(e) => setFormData({...formData, nisn: e.target.value})}
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="edit-gender">Jenis Kelamin</Label>
              <Select 
                value={formData.jenis_kelamin} 
                onValueChange={(value) => setFormData({...formData, jenis_kelamin: value})}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleEditStudent} 
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
                  setSelectedStudent(null);
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