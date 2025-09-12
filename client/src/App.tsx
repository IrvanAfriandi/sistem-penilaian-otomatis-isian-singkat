import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DataSiswa from "./pages/DataSiswa";
import DataKelas from "./pages/DataKelas";
import DataMapel from "./pages/DataMapel";
import Ujian from "./pages/Ujian";
import DetailUjian from "./pages/DetailUjian";
import UploadJawaban from "./pages/1_UploadJawaban";
import PenilaianOtomatis from "./pages/2_PenilaianOtomatis";
import HasilPenilaian from "./pages/3_HasilPenilaian";
import DetailJawabanPeserta from "./pages/DetailJawabanPeserta";
import EditJawabanPeserta from "./pages/EditJawabanPeserta";
import { AppLayout } from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes - No Authentication Required */}
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected Routes - Authentication Required */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout><Dashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/siswa" element={
            <ProtectedRoute>
              <AppLayout><DataSiswa /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/kelas" element={
            <ProtectedRoute>
              <AppLayout><DataKelas /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/mapel" element={
            <ProtectedRoute>
              <AppLayout><DataMapel /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ujian" element={
            <ProtectedRoute>
              <AppLayout><Ujian /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ujian/:id" element={
            <ProtectedRoute>
              <AppLayout><DetailUjian /></AppLayout>
            </ProtectedRoute>
          } />
          
          {/* New 3-Step Upload & Grading Process Routes */}
          {/* Step 1: Upload foto jawaban dan ekstraksi */}
          <Route path="/ujian/:ujianId/upload-jawaban/:pesertaId" element={
            <ProtectedRoute>
              <AppLayout><UploadJawaban /></AppLayout>
            </ProtectedRoute>
          } />
          {/* Step 2: Review hasil ekstraksi dan penilaian otomatis */}
          <Route path="/ujian/:ujianId/penilaian-otomatis/:pesertaId" element={
            <ProtectedRoute>
              <AppLayout><PenilaianOtomatis /></AppLayout>
            </ProtectedRoute>
          } />
          {/* Step 3: Hasil penilaian final dan save */}
          <Route path="/ujian/:ujianId/hasil-penilaian/:pesertaId" element={
            <ProtectedRoute>
              <AppLayout><HasilPenilaian /></AppLayout>
            </ProtectedRoute>
          } />
          
          {/* Legacy/Backward Compatibility Routes */}
          {/* Redirect old ekstraksi route to new upload route */}
          <Route path="/ujian/:ujianId/ekstraksi/:pesertaId" element={
            <ProtectedRoute>
              <AppLayout><UploadJawaban /></AppLayout>
            </ProtectedRoute>
          } />
          {/* Redirect old ekstraksi-jawaban route to new penilaian route */}
          <Route path="/ujian/:ujianId/ekstraksi-jawaban/:pesertaId" element={
            <ProtectedRoute>
              <AppLayout><PenilaianOtomatis /></AppLayout>
            </ProtectedRoute>
          } />
          
          {/* Existing Routes for View/Edit Participant Answers */}
          <Route path="/ujian/:ujianId/peserta/:pesertaId" element={
            <ProtectedRoute>
              <AppLayout><DetailJawabanPeserta /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/ujian/:ujianId/edit/:pesertaId" element={
            <ProtectedRoute>
              <AppLayout><EditJawabanPeserta /></AppLayout>
            </ProtectedRoute>
          } />
          
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;