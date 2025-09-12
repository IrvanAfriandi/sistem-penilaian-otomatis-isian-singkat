import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Edit, Trash2, BookOpen, Clock, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/api';

interface MataPelajaranData {
  id: number;
  nama_mapel: string;
  id_kelas: number | null;
  nama_kelas: string | null;
  totalExams: number;
}

interface KelasData {
  id: number;
  nama_kelas: string;
}

export default function DataMapel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState<MataPelajaranData[]>([]);
  const [kelasList, setKelasList] = useState<KelasData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<MataPelajaranData | null>(null);
  const [newSubject, setNewSubject] = useState({ 
    nama_mapel: '', 
    id_kelas: 'none' as string // Changed to string untuk konsistensi dengan Select
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Load data saat component mount
  useEffect(() => {
    loadSubjects();
    loadKelas();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMataPelajaran();
      setSubjects(response.mata_pelajaran);
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data mata pelajaran. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadKelas = async () => {
    try {
      const response = await apiService.getKelas();
      setKelasList(response.kelas);
    } catch (error) {
      console.error('Error loading kelas:', error);
    }
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.nama_mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subject.nama_kelas && subject.nama_kelas.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSubject = async () => {
    if (!newSubject.nama_mapel.trim()) {
      toast({
        title: "Error",
        description: "Nama mata pelajaran harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiService.createMataPelajaran({
        nama_mapel: newSubject.nama_mapel,
        id_kelas: newSubject.id_kelas === 'none' ? null : parseInt(newSubject.id_kelas)
      });
      
      // Tambahkan ke state lokal
      setSubjects([...subjects, response.mata_pelajaran]);
      
      setNewSubject({ nama_mapel: '', id_kelas: 'none' });
      setIsAddDialogOpen(false);
      
      toast({
        title: "Berhasil",
        description: response.message
      });
    } catch (error: any) {
      console.error('Error adding subject:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menambah mata pelajaran",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubject = async () => {
    if (!editingSubject || !editingSubject.nama_mapel.trim()) {
      toast({
        title: "Error",
        description: "Nama mata pelajaran harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiService.updateMataPelajaran(editingSubject.id, {
        nama_mapel: editingSubject.nama_mapel,
        id_kelas: editingSubject.id_kelas
      });
      
      // Update state lokal
      setSubjects(subjects.map(s => 
        s.id === editingSubject.id ? response.mata_pelajaran : s
      ));
      
      setEditingSubject(null);
      
      toast({
        title: "Berhasil",
        description: response.message
      });
    } catch (error: any) {
      console.error('Error updating subject:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate mata pelajaran",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id: number) => {
    try {
      const response = await apiService.deleteMataPelajaran(id);
      
      // Hapus dari state lokal
      setSubjects(subjects.filter(s => s.id !== id));
      
      toast({
        title: "Berhasil",
        description: response.message
      });
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus mata pelajaran",
        variant: "destructive"
      });
    }
  };

  // Helper function untuk mendapatkan value select yang aman
  const getSelectValue = (id_kelas: number | null): string => {
    return id_kelas ? id_kelas.toString() : 'none';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data mata pelajaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Mata Pelajaran</h1>
          <p className="text-muted-foreground">Kelola Data Mata Pelajaran</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Tambah Mata Pelajaran
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Mata Pelajaran Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subjectName">Nama Mata Pelajaran</Label>
                <Input
                  id="subjectName"
                  placeholder="Masukkan nama mata pelajaran"
                  value={newSubject.nama_mapel}
                  onChange={(e) => setNewSubject({ ...newSubject, nama_mapel: e.target.value })}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="subjectClass">Kelas</Label>
                <Select 
                  value={newSubject.id_kelas} 
                  onValueChange={(value) => setNewSubject({ 
                    ...newSubject, 
                    id_kelas: value 
                  })}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pilih Kelas</SelectItem>
                    {kelasList.map((kelas) => (
                      <SelectItem key={kelas.id} value={kelas.id.toString()}>
                        {kelas.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleAddSubject} 
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewSubject({ nama_mapel: '', id_kelas: 'none' });
                    setIsAddDialogOpen(false);
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari mata pelajaran atau kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {searchTerm ? "Data mata pelajaran tidak ditemukan" : "Belum ada data mata pelajaran"}
            </p>
            <p className="text-sm">
              {searchTerm ? "Coba ubah kata kunci pencarian Anda" : "Tambah mata pelajaran baru untuk memulai"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <Card key={subject.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{subject.nama_mapel}</CardTitle>
                    </div>
                    {subject.nama_kelas && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Kelas {subject.nama_kelas}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {subject.totalExams} ujian
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Dialog 
                    open={editingSubject?.id === subject.id} 
                    onOpenChange={(open) => !open && setEditingSubject(null)}
                  >
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setEditingSubject(subject)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Mata Pelajaran</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="editSubjectName">Nama Mata Pelajaran</Label>
                          <Input
                            id="editSubjectName"
                            value={editingSubject?.nama_mapel || ''}
                            onChange={(e) => setEditingSubject(editingSubject ? { 
                              ...editingSubject, 
                              nama_mapel: e.target.value 
                            } : null)}
                            disabled={submitting}
                          />
                        </div>
                        <div>
                          <Label htmlFor="editSubjectClass">Kelas</Label>
                          <Select 
                            value={getSelectValue(editingSubject?.id_kelas || null)} 
                            onValueChange={(value) => setEditingSubject(editingSubject ? {
                              ...editingSubject,
                              id_kelas: value === 'none' ? null : parseInt(value)
                            } : null)}
                            disabled={submitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kelas (opsional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Pilih Kelas</SelectItem>
                              {kelasList.map((kelas) => (
                                <SelectItem key={kelas.id} value={kelas.id.toString()}>
                                  {kelas.nama_kelas}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleEditSubject} 
                            className="flex-1"
                            disabled={submitting}
                          >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Simpan
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingSubject(null)}
                            className="flex-1"
                            disabled={submitting}
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Mata Pelajaran</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus mata pelajaran "{subject.nama_mapel}"? 
                          Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteSubject(subject.id)}
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
    </div>
  );
}