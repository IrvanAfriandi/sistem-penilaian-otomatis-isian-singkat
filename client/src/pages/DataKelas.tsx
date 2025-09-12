import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Edit, Trash2, Users, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/api';

interface KelasData {
  id: number;
  nama_kelas: string;
  totalStudents: number;
}

export default function DataKelas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<KelasData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<KelasData | null>(null);
  const [newClass, setNewClass] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Load data saat component mount
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await apiService.getKelas();
      // Map backend field nama_kelas ke frontend field name untuk kompatibilitas
      const mappedClasses = response.kelas.map((kelas: any) => ({
        id: kelas.id,
        nama_kelas: kelas.nama_kelas,
        totalStudents: kelas.totalStudents || 0
      }));
      setClasses(mappedClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data kelas. Silakan coba lagi.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.nama_kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClass = async () => {
    if (!newClass.name.trim()) {
      toast({
        title: "Error",
        description: "Nama kelas harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiService.createKelas({ name: newClass.name });
      
      // Tambahkan ke state lokal
      const newKelasData = {
        id: response.kelas.id,
        nama_kelas: response.kelas.nama_kelas,
        totalStudents: 0
      };
      setClasses([...classes, newKelasData]);
      
      setNewClass({ name: '' });
      setIsAddDialogOpen(false);
      
      toast({
        title: "Berhasil",
        description: response.message
      });
    } catch (error: any) {
      console.error('Error adding class:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menambah kelas",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClass = async () => {
    if (!editingClass || !editingClass.nama_kelas.trim()) {
      toast({
        title: "Error",
        description: "Nama kelas harus diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiService.updateKelas(editingClass.id, { 
        name: editingClass.nama_kelas 
      });
      
      // Update state lokal
      setClasses(classes.map(c => 
        c.id === editingClass.id ? {
          ...c,
          nama_kelas: response.kelas.nama_kelas
        } : c
      ));
      
      setEditingClass(null);
      
      toast({
        title: "Berhasil",
        description: response.message
      });
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate kelas",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: number) => {
    try {
      const response = await apiService.deleteKelas(id);
      
      // Hapus dari state lokal
      setClasses(classes.filter(c => c.id !== id));
      
      toast({
        title: "Berhasil",
        description: response.message
      });
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus kelas",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data kelas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Data Kelas</h1>
          <p className="text-muted-foreground">Kelola Data Kelas</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Tambah Kelas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Kelas Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="className">Nama Kelas</Label>
                <Input
                  id="className"
                  placeholder="Masukkan nama kelas"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  disabled={submitting}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleAddClass} 
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewClass({ name: '' });
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
            placeholder="Cari nama kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredClasses.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {searchTerm ? "Data kelas tidak ditemukan" : "Belum ada data kelas"}
            </p>
            <p className="text-sm">
              {searchTerm ? "Coba ubah kata kunci pencarian Anda" : "Tambah kelas baru untuk memulai"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{cls.nama_kelas}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {cls.totalStudents} siswa
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Dialog 
                    open={editingClass?.id === cls.id} 
                    onOpenChange={(open) => !open && setEditingClass(null)}
                  >
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setEditingClass(cls)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Kelas</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="editClassName">Nama Kelas</Label>
                          <Input
                            id="editClassName"
                            value={editingClass?.nama_kelas || ''}
                            onChange={(e) => setEditingClass(editingClass ? { 
                              ...editingClass, 
                              nama_kelas: e.target.value 
                            } : null)}
                            disabled={submitting}
                          />
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleEditClass} 
                            className="flex-1"
                            disabled={submitting}
                          >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Simpan
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingClass(null)}
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
                        <AlertDialogTitle>Hapus Kelas</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus kelas "{cls.nama_kelas}"? 
                          Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteClass(cls.id)}
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