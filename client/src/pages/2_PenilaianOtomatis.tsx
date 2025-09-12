// Updated PenilaianOtomatis.tsx dengan enhanced image display

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, ChevronRight, Image, X, CheckCircle, Camera, AlertCircle, RefreshCw, FileImage, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/api';

// Interface untuk data ekstraksi yang sudah diproses backend
interface EkstraksiData {
  id: number;
  id_soal: number;
  no_soal: number;
  pertanyaan: string;
  kunci_jawaban: string;
  output_1: string | null;
  output_2: string | null;
  teks: string | null;
  crop_image: {
    url: string | null;
    filename: string;
    exists: boolean;
    size: number;
    error: string | null;
  } | null;
  jawaban_image: {
    url: string | null;
    filename: string;
    exists: boolean;
    size: number;
    error: string | null;
  } | null;
}

// Interface untuk jawaban yang sudah digabungkan per soal
interface CombinedAnswer {
  no_soal: number;
  pertanyaan: string;
  kunci_jawaban: string;
  teks: string;
  crop_image_data: {
    url: string | null;
    filename: string;
    exists: boolean;
    size: number;
    error: string | null;
  } | null;
  soal_image_data: {
    url: string | null;
    filename: string;
    exists: boolean;
    size: number;
    error: string | null;
  } | null;
  raw_data: EkstraksiData[];
}

export default function PenilaianOtomatis() {
  const { ujianId, pesertaId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [combinedAnswers, setCombinedAnswers] = useState<CombinedAnswer[]>([]);
  const [editableAnswers, setEditableAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasExtraksiData, setHasExtraksiData] = useState(false);
  const [imageStats, setImageStats] = useState({
    total_images: 0,
    found_images: 0,
    missing_images: 0,
    processing_errors: 0
  });
  
  // States untuk proses penilaian
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingMessage, setGradingMessage] = useState('');

  // State untuk image troubleshooting
  const [showImageDebug, setShowImageDebug] = useState(false);
  const [refreshingImages, setRefreshingImages] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadEkstraksiData();
  }, [ujianId, pesertaId]);

  const loadEkstraksiData = async () => {
    try {
      setIsLoading(true);

      if (!ujianId || !pesertaId) {
        throw new Error('Parameter ujianId atau pesertaId tidak valid');
      }

      console.log('🔍 Loading ekstraksi data from backend (with enhanced image processing)...');
      
      // Get ekstraksi data from backend - SUDAH INCLUDE IMAGE PROCESSING
      const response = await ApiService.getEkstraksiResults(parseInt(ujianId), parseInt(pesertaId));
      
      if (response.results && response.results.length > 0) {
        console.log('✅ Data ekstraksi ditemukan (with enhanced images):', response.results);
        console.log('📊 Image stats:', response.image_stats);
        
        // Set image statistics
        if (response.image_stats) {
          setImageStats(response.image_stats);
        }
        
        // Process and combine data by no_soal
        const combinedData = processEkstraksiData(response.results);
        setCombinedAnswers(combinedData);
        
        // Set editable answers dari field teks
        const answersForEdit = combinedData.map(item => item.teks || '');
        setEditableAnswers(answersForEdit);
        
        setHasExtraksiData(true);
        
        // Success message dengan image stats
        const imageMessage = response.image_stats 
          ? ` (${response.image_stats.found_images}/${response.image_stats.total_images} gambar ditemukan)`
          : '';
          
        toast({
          title: "Data Berhasil Dimuat",
          description: `Berhasil memuat ${response.results.length} data ekstraksi${imageMessage}`,
        });
      } else {
        console.log('⚠️ Tidak ada data ekstraksi ditemukan');
        setHasExtraksiData(false);
        
        toast({
          title: "Peringatan",
          description: "Tidak ada data ekstraksi. Silakan lakukan upload dan ekstraksi terlebih dahulu.",
          variant: "destructive"
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error loading ekstraksi data:', error);
      
      toast({
        title: "Error",
        description: error.message || "Gagal memuat data ekstraksi dari database.",
        variant: "destructive"
      });
      
      setHasExtraksiData(false);
    } finally {
      setIsLoading(false);
    }
  };

  const processEkstraksiData = (ekstraksiData: EkstraksiData[]): CombinedAnswer[] => {
    console.log('🔄 Processing ekstraksi data (already processed by backend):', ekstraksiData);
    
    // Group data by no_soal
    const groupedData = ekstraksiData.reduce((acc, item) => {
      const noSoal = item.no_soal;
      
      if (!acc[noSoal]) {
        acc[noSoal] = [];
      }
      
      acc[noSoal].push(item);
      return acc;
    }, {} as Record<number, EkstraksiData[]>);

    // Process each soal
    const combined: CombinedAnswer[] = [];
    
    for (const noSoal of Object.keys(groupedData)) {
      const items = groupedData[parseInt(noSoal)];
      
      // Sort items by id untuk konsistensi
      items.sort((a, b) => a.id - b.id);
      
      // Use first item for metadata
      const firstItem = items[0];
      
      // Combine teks dari semua items (jika ada multiple entries per soal)
      const combinedText = items
        .map(item => item.teks)
        .filter(text => text && text.trim().length > 0)
        .join(' ')
        .trim();
      
      // Get crop image data (sudah diproses oleh backend)
      let cropImageData = null;
      const cropImageItem = items.find(item => item.crop_image);
      if (cropImageItem?.crop_image) {
        cropImageData = cropImageItem.crop_image;
        console.log(`🖼️ Crop image data for soal ${noSoal}:`, cropImageData);
      }
      
      // Get soal image data dari output_1
      let soalImageData = null;
      const soalImageItem = items.find(item => item.output_1);
      if (soalImageItem?.output_1) {
        soalImageData = {
          url: `http://localhost:5000/static/output_1/${soalImageItem.output_1}`,
          filename: soalImageItem.output_1,
          exists: true,
          size: 0,
          error: null
        };
        console.log(`📝 Soal image data for soal ${noSoal}:`, soalImageData);
      }
      
      combined.push({
        no_soal: firstItem.no_soal,
        pertanyaan: firstItem.pertanyaan || `Soal ${firstItem.no_soal}`,
        kunci_jawaban: firstItem.kunci_jawaban || '',
        teks: combinedText,
        crop_image_data: cropImageData,
        soal_image_data: soalImageData,
        raw_data: items
      });
    }

    // Sort by no_soal
    combined.sort((a, b) => a.no_soal - b.no_soal);
    
    console.log('✅ Combined ekstraksi data (with backend-processed images):', combined);
    return combined;
  };

  const handleRefreshImage = async (soalIndex: number, filename: string) => {
    console.log(`🔄 Refreshing image for soal ${soalIndex}: ${filename}`);
    
    // Set refreshing state
    setRefreshingImages(prev => new Set(prev).add(soalIndex));
    
    try {
      // Call backend to refresh image
      const refreshResponse = await ApiService.refreshImage(
        parseInt(ujianId!), 
        parseInt(pesertaId!), 
        filename
      );
      
      console.log('🔄 Refresh response:', refreshResponse);
      
      if (refreshResponse.success && refreshResponse.image_data) {
        // Update combined answers with refreshed image data
        const newCombinedAnswers = [...combinedAnswers];
        if (newCombinedAnswers[soalIndex]) {
          newCombinedAnswers[soalIndex].crop_image_data = refreshResponse.image_data;
          setCombinedAnswers(newCombinedAnswers);
        }
        
        toast({
          title: "Gambar Berhasil Dimuat Ulang",
          description: `File: ${filename} berhasil dimuat ulang`,
        });
      } else {
        toast({
          title: "Gambar Masih Tidak Ditemukan",
          description: `File: ${filename} masih tidak dapat dimuat. Periksa apakah file berada di app/images/output_1/`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error(`Error refreshing image:`, error);
      
      toast({
        title: "Error Refresh Gambar",
        description: `Error saat refresh gambar: ${error}`,
        variant: "destructive"
      });
    } finally {
      // Remove refreshing state
      setRefreshingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(soalIndex);
        return newSet;
      });
    }
  };

  const handleCheckImagesForUjian = async () => {
    try {
      console.log(`🔍 Checking images for ujian ${ujianId}`);
      
      const response = await ApiService.checkImagesForUjian(parseInt(ujianId!));
      
      console.log('📊 Image check results:', response);
      
      toast({
        title: "Pemeriksaan Gambar Selesai",
        description: `Ditemukan ${response.found_images}/${response.total_soal} gambar untuk ujian ini`,
      });
      
      setShowImageDebug(true);
      
    } catch (error) {
      console.error('Error checking images:', error);
      toast({
        title: "Error",
        description: `Error saat memeriksa gambar: ${error}`,
        variant: "destructive"
      });
    }
  };

  const renderSoalImage = (combinedData: CombinedAnswer) => {
    const soalImageData = combinedData.soal_image_data;
    
    // Jika tidak ada data gambar soal
    if (!soalImageData) {
      return (
        <div className="w-full h-40 bg-gray-100 border border-gray-200 rounded flex flex-col items-center justify-center text-gray-500">
          <FileImage className="w-8 h-8 mb-2" />
          <span className="text-sm font-medium">Tidak ada gambar soal</span>
        </div>
      );
    }

    // Render gambar soal
    return (
      <div className="space-y-3">
        <img 
          src={soalImageData.url!} 
          alt={`Soal ${combinedData.no_soal}`}
          className="w-full h-40 object-contain rounded border shadow-sm bg-white"
          onError={(e) => {
            console.log(`❌ Soal image load error for: ${soalImageData.url}`);
            const imgElement = e.target as HTMLImageElement;
            imgElement.style.display = 'none';
            
            // Show error in place of image
            const container = imgElement.parentElement;
            if (container) {
              container.innerHTML = `
                <div class="w-full h-40 bg-red-50 border border-red-200 rounded flex flex-col items-center justify-center text-red-600">
                  <svg class="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-sm font-medium">Error Loading Soal Image</span>
                  <span class="text-xs text-center">${soalImageData.filename}</span>
                </div>
              `;
            }
          }}
          onLoad={() => {
            console.log(`✅ Soal image loaded successfully: ${soalImageData.filename}`);
          }}
        />
      </div>
    );
  };

  const renderCropImage = (combinedData: CombinedAnswer, index: number) => {
    const cropImageData = combinedData.crop_image_data;
    const filename = cropImageData?.filename;
    const isRefreshing = refreshingImages.has(index);
    
    // Jika tidak ada data gambar sama sekali
    if (!cropImageData) {
      return (
        <div className="w-full h-40 bg-gray-100 border border-gray-200 rounded flex flex-col items-center justify-center text-gray-500">
          <Camera className="w-8 h-8 mb-2" />
          <span className="text-sm font-medium">Tidak ada gambar</span>
        </div>
      );
    }

    // Jika ada error atau gambar tidak ditemukan
    if (!cropImageData.exists || cropImageData.error) {
      return (
        <div className="w-full h-40 bg-red-50 border border-red-200 rounded flex flex-col items-center justify-center text-red-600">
          <AlertCircle className="w-8 h-8 mb-2" />
          <span className="text-sm font-medium">Gambar Tidak Ditemukan</span>
          <span className="text-xs mb-1 text-center px-2">{filename}</span>
          {cropImageData.error && (
            <span className="text-xs mb-2 text-center text-red-500 px-2">
              {cropImageData.error}
            </span>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRefreshImage(index, filename!)}
              disabled={isRefreshing}
              className="flex items-center gap-1"
            >
              {isRefreshing ? (
                <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {isRefreshing ? 'Checking...' : 'Coba Lagi'}
            </Button>
          </div>
          <div className="mt-2 text-xs text-blue-600 text-center px-2">
            Expected: ujian_{ujianId}_soal_{combinedData.no_soal}.jpg
          </div>
        </div>
      );
    }

    // Render gambar normal - URL sudah siap dari backend
    return (
      <div className="space-y-3">
        <img 
          src={cropImageData.url!} 
          alt={`Crop soal ${combinedData.no_soal}`}
          className="w-full h-40 object-contain rounded border shadow-sm bg-white"
          onError={(e) => {
            console.log(`❌ Image load error for: ${cropImageData.url}`);
            const imgElement = e.target as HTMLImageElement;
            imgElement.style.display = 'none';
            
            // Show error in place of image
            const container = imgElement.parentElement;
            if (container) {
              container.innerHTML = `
                <div class="w-full h-40 bg-red-50 border border-red-200 rounded flex flex-col items-center justify-center text-red-600">
                  <svg class="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-sm font-medium">Error Loading Image</span>
                  <span class="text-xs text-center">${filename}</span>
                </div>
              `;
            }
            
            toast({
              title: "Error Loading Gambar",
              description: `Gagal memuat gambar: ${filename}`,
              variant: "destructive"
            });
          }}
          onLoad={() => {
            console.log(`✅ Image loaded successfully: ${filename}`);
          }}
        />
        
      </div>
    );
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...editableAnswers];
    newAnswers[index] = value;
    setEditableAnswers(newAnswers);
    
    // Also update combinedAnswers for consistency
    const newCombinedAnswers = [...combinedAnswers];
    if (newCombinedAnswers[index]) {
      newCombinedAnswers[index].teks = value;
    }
    setCombinedAnswers(newCombinedAnswers);
  };

  const handleStartGrading = () => {
    setShowGradingModal(true);
    handleAutoGrading();
  };

  const handleAutoGrading = async () => {
    setIsGrading(true);
    setGradingProgress(0);
    
    try {
      if (!ujianId || !pesertaId) {
        throw new Error('Parameter ujianId atau pesertaId tidak valid');
      }

      // Step 1: Inisialisasi AI Grading
      setGradingMessage('Memulai penilaian otomatis dengan AI...');
      setGradingProgress(10);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Prepare answers data
      setGradingMessage('Mempersiapkan data jawaban...');
      setGradingProgress(20);
      
      const answersToGrade = [];
      
      for (let i = 0; i < editableAnswers.length; i++) {
        const answer = editableAnswers[i];
        const combinedData = combinedAnswers[i];
        
        if (answer && answer.trim() && combinedData) {
          answersToGrade.push({
            soal_id: combinedData.raw_data[0].id_soal,
            no_soal: combinedData.no_soal,
            jawaban_siswa: answer.trim()
          });
        }
      }
      
      if (answersToGrade.length === 0) {
        throw new Error('Tidak ada jawaban yang valid untuk dinilai');
      }
      
      console.log('🔍 Data jawaban yang akan dinilai:', answersToGrade);
      
      // Step 3: Process dengan AI
      setGradingMessage('Memproses jawaban dengan model AI...');
      setGradingProgress(40);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Call grading API
      setGradingMessage('Menganalisis jawaban dengan model penilaian...');
      setGradingProgress(60);
      
      const gradingResponse = await ApiService.processAutomaticGradingWithAnswers(
        parseInt(ujianId), 
        parseInt(pesertaId),
        answersToGrade
      );
      
      setGradingProgress(80);
      setGradingMessage('Menyimpan hasil penilaian...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setGradingMessage('Penilaian selesai!');
      setGradingProgress(100);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Penilaian Selesai!",
        description: `Rata-rata nilai: ${gradingResponse.average_score}/100`,
      });
      
      // Navigate to results page
      setTimeout(() => {
        setShowGradingModal(false);
        navigate(`/ujian/${ujianId}/hasil-penilaian/${pesertaId}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Error during automatic grading:', error);
      setGradingMessage('Terjadi kesalahan saat penilaian');
      
      toast({
        title: "Error",
        description: error.message || 'Terjadi kesalahan saat penilaian. Silakan coba lagi.',
        variant: "destructive"
      });
      
      setTimeout(() => {
        setIsGrading(false);
        setShowGradingModal(false);
        setGradingProgress(0);
        setGradingMessage('');
      }, 3000);
      
    } finally {
      if (gradingProgress === 100) {
        setIsGrading(false);
      }
    }
  };

  const handleBack = () => {
    navigate(`/ujian/${ujianId}/upload-jawaban/${pesertaId}`);
  };

const renderGradingModal = () => (
    <Dialog open={showGradingModal} onOpenChange={undefined}>
      <DialogContent className="sm:max-w-md bg-card shadow-soft border-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center">
            Penilaian Otomatis
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Loading Indicator */}
          <div className="flex justify-center">
            {isGrading && gradingProgress < 100 ? (
              <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin" />
            ) : gradingProgress === 100 ? (
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
              {gradingProgress === 100 ? (
                "Penilaian Selesai!"
              ) : gradingProgress >= 80 ? (
                "Menyimpan hasil penilaian..."
              ) : gradingProgress >= 60 ? (
                "Menganalisis jawaban dengan model penilaian..."
              ) : gradingProgress >= 40 ? (
                "Memproses jawaban dengan model..."
              ) : gradingProgress >= 20 ? (
                "Mempersiapkan data jawaban..."
              ) : (
                "Memulai penilaian otomatis..."
              )}
            </h3>
            
            <p className="text-sm text-muted-foreground">
              {gradingProgress === 100 ? (
                "Semua jawaban berhasil dinilai"
              ) : gradingProgress >= 80 ? (
                "Finalisasi hasil penilaian"
              ) : gradingProgress >= 60 ? (
                "Model sedang mengevaluasi jawaban"
              ) : gradingProgress >= 40 ? (
                "sedang menganalisis dengan teknologi"
              ) : gradingProgress >= 20 ? (
                "Validasi dan persiapan data"
              ) : (
                "Inisialisasi sistem penilaian"
              )}
            </p>
          </div>

          {/* Progress Percentage */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(gradingProgress)}%</span>
            </div>
            <Progress value={gradingProgress} className="h-2" />
          </div>

          {/* Success Message */}
          {gradingProgress === 100 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-green-800 mb-1">
                Penilaian berhasil diselesaikan!
              </p>
              <p className="text-xs text-green-700">
                Mengarahkan ke halaman hasil penilaian...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat hasil ekstraksi...</p>
        </div>
      </div>
    );
  }

  if (!hasExtraksiData) {
    return (
      <div className="space-y-6">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Tidak ada data ekstraksi ditemukan. Silakan lakukan upload dan ekstraksi terlebih dahulu.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Upload Jawaban
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
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            2
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm font-medium">
            3
          </div>
        </div>
      </div>

      {/* Header */}
      <Card className="bg-gradient-primary/10 shadow-soft border border-primary/20">
        <CardHeader>
          <div className="text-center">
            <CardTitle>Hasil Ekstraksi Jawaban</CardTitle>
            {imageStats.total_images > 0 && (
              <div className="mt-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">
                  📊 Status Gambar: {imageStats.found_images}/{imageStats.total_images} ditemukan
                  {imageStats.missing_images > 0 && (
                    <span className="text-orange-600 ml-2">
                      • {imageStats.missing_images} hilang
                    </span>
                  )}
                  {imageStats.processing_errors > 0 && (
                    <span className="text-red-600 ml-2">
                      • {imageStats.processing_errors} error
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Soal Cards */}
      <div className="space-y-6">
        {combinedAnswers.map((combinedData, index) => {
          const currentAnswer = editableAnswers[index] || '';
          
          return (
            <Card key={index} className="bg-card shadow-soft border-0">
              <CardHeader>
                <CardTitle className="text-lg text-primary">
                  Soal {combinedData.no_soal}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gambar Soal dari output_1 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      📝 Gambar Soal
                    </Label>
                    <div className="border-2 border-dashed border-muted rounded-lg p-4 bg-muted/20">
                      {renderSoalImage(combinedData)}
                    </div>
                  </div>

                  {/* Jawaban Siswa dari OCR */}
                  <div className="space-y-3">
                    <Label htmlFor={`answer-${index}`} className="text-sm font-medium text-gray-700">
                      📝 Jawaban Siswa
                    </Label>
                    <Textarea
                      id={`answer-${index}`}
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      className="min-h-[140px]"
                      placeholder={`${!currentAnswer ? '' : 'Edit jawaban jika perlu...'}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1 flex items-center justify-center gap-2"
          disabled={isGrading}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Upload
        </Button>
        
        <Button 
          onClick={handleStartGrading}
          className="flex-1 bg-gradient-primary hover:opacity-90 flex items-center justify-center gap-2"
          disabled={isGrading || editableAnswers.every(answer => !answer?.trim())}
          size="lg"
        >
          <Zap className="h-4 w-4" />
          Penilaian Otomatis
        </Button>
      </div>

      {/* Grading Modal */}
      {renderGradingModal()}
    </div>
  );
}