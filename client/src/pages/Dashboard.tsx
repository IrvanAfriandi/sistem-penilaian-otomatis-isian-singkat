import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, GraduationCap, Award, BookOpen, Plus, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import ApiService from '../services/api'; // Adjust path as needed

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState({
    totalSiswa: 0,
    totalUjian: 0,
    totalKelas: 0,
    totalMataPelajaran: 0,
    recentExams: [],
    loading: true,
    error: null
  });

  // Modal states
  const [isCreateUjianOpen, setIsCreateUjianOpen] = useState(false);
  const [isCreateSiswaOpen, setIsCreateSiswaOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Options data
  const [kelasOptions, setKelasOptions] = useState([]);
  const [mataPelajaranOptions, setMataPelajaranOptions] = useState([]);

  // Form data
  const [ujianFormData, setUjianFormData] = useState({
    nama_ujian: '',
    id_kelas: 'none',
    id_mata_pelajaran: 'none'
  });

  const [siswaFormData, setSiswaFormData] = useState({
    nama_siswa: '',
    kelas: 'none',
    nisn: '',
    jenis_kelamin: 'none'
  });

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all required data in parallel
      const [siswaResponse, ujianResponse, kelasResponse, mataPelajaranResponse] = await Promise.all([
        ApiService.getSiswa({ per_page: 1000 }),
        ApiService.getUjian({ per_page: 1000 }),
        ApiService.getKelas({ per_page: 1000 }),
        ApiService.getMataPelajaran({ per_page: 1000 })
      ]);

      // Process recent exams (get last 3 exams)
      const recentExams = ujianResponse.ujian?.slice(0, 3).map(ujian => ({
        id: ujian.id,
        title: ujian.nama_ujian,
        subject: ujian.nama_mata_pelajaran || 'Tidak ada mata pelajaran',
        participants: ujian.total_participants || 0,
        completed: ujian.completed_participants || 0,
        date: new Date().toISOString().split('T')[0], // Using current date as placeholder
        kelas: ujian.nama_kelas || 'Tidak ada kelas'
      })) || [];

      setDashboardData({
        totalSiswa: siswaResponse.total || siswaResponse.siswa?.length || 0,
        totalUjian: ujianResponse.total || ujianResponse.ujian?.length || 0,
        totalKelas: kelasResponse.total || kelasResponse.kelas?.length || 0,
        totalMataPelajaran: mataPelajaranResponse.total || mataPelajaranResponse.mata_pelajaran?.length || 0,
        recentExams: recentExams,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: 'Gagal memuat data dashboard'
      }));
    }
  };

  // Load options for forms
  const loadKelasOptions = async () => {
    try {
      const response = await ApiService.getKelasOptions();
      setKelasOptions(response.kelas || []);
    } catch (error) {
      console.error('Error loading kelas options:', error);
    }
  };

  const loadMataPelajaranByKelas = async (kelasId) => {
    try {
      const response = await ApiService.getMataPelajaranByKelasForUjian(kelasId);
      setMataPelajaranOptions(response.mata_pelajaran || []);
    } catch (error) {
      console.error('Error loading mata pelajaran options:', error);
      setMataPelajaranOptions([]);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
    loadKelasOptions();
  }, []);

  // Navigation functions
  const handleNavigateToKelas = () => navigate('/kelas');
  const handleNavigateToSiswa = () => navigate('/siswa');
  const handleNavigateToMapel = () => navigate('/mapel');
  const handleNavigateToUjian = () => navigate('/ujian');

  // Handle kelas change for ujian form
  const handleUjianKelasChange = async (value) => {
    setUjianFormData({ 
      ...ujianFormData, 
      id_kelas: value, 
      id_mata_pelajaran: 'none'
    });
    
    if (value !== 'none') {
      await loadMataPelajaranByKelas(parseInt(value));
    } else {
      setMataPelajaranOptions([]);
    }
  };

  // Create ujian handler
  const handleCreateUjian = async () => {
    if (!ujianFormData.nama_ujian.trim()) {
      toast({
        title: "Error",
        description: "Nama ujian harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const requestData = {
        nama_ujian: ujianFormData.nama_ujian.trim(),
        id_kelas: ujianFormData.id_kelas === 'none' ? null : parseInt(ujianFormData.id_kelas),
        id_mata_pelajaran: ujianFormData.id_mata_pelajaran === 'none' ? null : parseInt(ujianFormData.id_mata_pelajaran)
      };

      const response = await ApiService.createUjian(requestData);
      
      // Reset form and close modal
      setUjianFormData({ nama_ujian: '', id_kelas: 'none', id_mata_pelajaran: 'none' });
      setMataPelajaranOptions([]);
      setIsCreateUjianOpen(false);
      
      // Refresh dashboard data
      await fetchDashboardData();
      
      toast({
        title: "Berhasil",
        description: "Ujian berhasil dibuat"
      });
    } catch (error) {
      console.error('Error creating ujian:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal membuat ujian",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Create siswa handler
  const handleCreateSiswa = async () => {
    if (!siswaFormData.nama_siswa.trim() || !siswaFormData.nisn.trim() || siswaFormData.jenis_kelamin === 'none') {
      toast({
        title: "Error",
        description: "Nama, NISN, dan jenis kelamin harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await ApiService.createSiswa({
        nama_siswa: siswaFormData.nama_siswa,
        nisn: siswaFormData.nisn,
        kelas: siswaFormData.kelas === 'none' ? null : parseInt(siswaFormData.kelas),
        jenis_kelamin: siswaFormData.jenis_kelamin
      });
      
      // Reset form and close modal
      setSiswaFormData({ nama_siswa: '', kelas: 'none', nisn: '', jenis_kelamin: 'none' });
      setIsCreateSiswaOpen(false);
      
      // Refresh dashboard data
      await fetchDashboardData();
      
      toast({
        title: "Berhasil",
        description: "Siswa berhasil ditambahkan"
      });
    } catch (error) {
      console.error('Error creating siswa:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menambah siswa",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Stats configuration
  const stats = [
    {
      title: 'Total Kelas',
      value: dashboardData.totalKelas,
      icon: GraduationCap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      onClick: handleNavigateToKelas
    },
    {
      title: 'Total Siswa',
      value: dashboardData.totalSiswa,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      onClick: handleNavigateToSiswa
    },
    {
      title: 'Total Mata Pelajaran',
      value: dashboardData.totalMataPelajaran,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      onClick: handleNavigateToMapel
    },
    {
      title: 'Total Ujian',
      value: dashboardData.totalUjian,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      onClick: handleNavigateToUjian
    }
  ];

  // Loading state
  if (dashboardData.loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Memuat data...</p>
          </div>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Sistem Penilaian Otomatis Lembar Jawaban Isian Singkat</p>
        </div>
      </div>

      {/* Error Alert */}
      {dashboardData.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-800">
              {dashboardData.error}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={stat.onClick}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Recent Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exams */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Data Ujian Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.recentExams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada ujian yang dibuat</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setIsCreateUjianOpen(true)}
                >
                  Buat Ujian Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.recentExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{exam.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {exam.subject}, Kelas {exam.kelas}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">
                          Peserta: {exam.participants}
                        </span>
                        <span className="text-xs text-success">
                          Selesai: {exam.completed}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {exam.participants > 0 ? Math.round((exam.completed / exam.participants) * 100) : 0}%
                        </span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/ujian/${exam.id}`)}
                      >
                        Detail
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Aksi Cepat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start bg-primary hover:bg-primary/90"
              onClick={() => setIsCreateUjianOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Buat Ujian Baru
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setIsCreateSiswaOpen(true)}
            >
              <Users className="mr-2 h-4 w-4" />
              Tambah Siswa
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleNavigateToUjian}
            >
              <FileText className="mr-2 h-4 w-4" />
              Lihat Semua Ujian
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleNavigateToMapel}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Kelola Mata Pelajaran
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Create Ujian Modal */}
      <Dialog open={isCreateUjianOpen} onOpenChange={setIsCreateUjianOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Ujian Baru</DialogTitle>
            <DialogDescription>
              Buat ujian baru untuk kelas tertentu atau semua kelas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ujian-name">Nama Ujian</Label>
              <Input
                id="ujian-name"
                value={ujianFormData.nama_ujian}
                onChange={(e) => setUjianFormData({...ujianFormData, nama_ujian: e.target.value})}
                placeholder="Masukkan nama ujian"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="ujian-class">Kelas (Opsional)</Label>
              <Select 
                value={ujianFormData.id_kelas} 
                onValueChange={handleUjianKelasChange}
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
              <Label htmlFor="ujian-subject">Mata Pelajaran (Opsional)</Label>
              <Select 
                value={ujianFormData.id_mata_pelajaran} 
                onValueChange={(value) => setUjianFormData({...ujianFormData, id_mata_pelajaran: value})}
                disabled={submitting || ujianFormData.id_kelas === 'none' || mataPelajaranOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    ujianFormData.id_kelas === 'none' 
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
                onClick={handleCreateUjian} 
                className="flex-1"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Buat Ujian
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setUjianFormData({ nama_ujian: '', id_kelas: 'none', id_mata_pelajaran: 'none' });
                  setMataPelajaranOptions([]);
                  setIsCreateUjianOpen(false);
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

      {/* Create Siswa Modal */}
      <Dialog open={isCreateSiswaOpen} onOpenChange={setIsCreateSiswaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Siswa Baru</DialogTitle>
            <DialogDescription>
              Tambahkan data siswa baru ke dalam sistem
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="siswa-name">Nama Lengkap</Label>
              <Input
                id="siswa-name"
                value={siswaFormData.nama_siswa}
                onChange={(e) => setSiswaFormData({...siswaFormData, nama_siswa: e.target.value})}
                placeholder="Masukkan nama lengkap"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="siswa-class">Kelas</Label>
              <Select 
                value={siswaFormData.kelas} 
                onValueChange={(value) => setSiswaFormData({...siswaFormData, kelas: value})}
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
              <Label htmlFor="siswa-nisn">NISN</Label>
              <Input
                id="siswa-nisn"
                value={siswaFormData.nisn}
                onChange={(e) => setSiswaFormData({...siswaFormData, nisn: e.target.value})}
                placeholder="Masukkan NISN"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="siswa-gender">Jenis Kelamin</Label>
              <Select 
                value={siswaFormData.jenis_kelamin} 
                onValueChange={(value) => setSiswaFormData({...siswaFormData, jenis_kelamin: value})}
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
                onClick={handleCreateSiswa} 
                className="flex-1"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSiswaFormData({ nama_siswa: '', kelas: 'none', nisn: '', jenis_kelamin: 'none' });
                  setIsCreateSiswaOpen(false);
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