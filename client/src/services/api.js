const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  getHeaders(includeAuth = true, skipContentType = false) {
    const headers = {};
    
    if (!skipContentType) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          ...this.getHeaders(!options.skipAuth, options.skipContentType),
          ...options.headers
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  async login(credentials) {
    const data = await this.makeRequest('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(credentials)
    });
    
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      this.token = data.access_token;
    }
    
    return data;
  }

  async register(userData) {
    return await this.makeRequest('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(userData)
    });
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST'
      });
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      this.token = null;
    }
  }

  async getProfile() {
    return await this.makeRequest('/auth/profile');
  }

  async checkAuth() {
    try {
      await this.makeRequest('/auth/check');
      return true;
    } catch (error) {
      return false;
    }
  }

  // KELAS METHODS
  async getKelas(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/kelas/?${queryString}` : '/kelas/';
    
    return await this.makeRequest(url);
  }

  async getKelasById(kelasId) {
    return await this.makeRequest(`/kelas/${kelasId}`);
  }

  async createKelas(kelasData) {
    return await this.makeRequest('/kelas/', {
      method: 'POST',
      body: JSON.stringify(kelasData)
    });
  }

  async updateKelas(kelasId, kelasData) {
    return await this.makeRequest(`/kelas/${kelasId}`, {
      method: 'PUT',
      body: JSON.stringify(kelasData)
    });
  }

  async deleteKelas(kelasId) {
    return await this.makeRequest(`/kelas/${kelasId}`, {
      method: 'DELETE'
    });
  }

  async searchKelas(searchTerm) {
    return await this.makeRequest(`/kelas/search?q=${encodeURIComponent(searchTerm)}`);
  }

  // MATA PELAJARAN METHODS
  async getMataPelajaran(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/mata-pelajaran/?${queryString}` : '/mata-pelajaran/';
    
    return await this.makeRequest(url);
  }

  async getMataPelajaranById(mapelId) {
    return await this.makeRequest(`/mata-pelajaran/${mapelId}`);
  }

  async createMataPelajaran(mapelData) {
    return await this.makeRequest('/mata-pelajaran/', {
      method: 'POST',
      body: JSON.stringify(mapelData)
    });
  }

  async updateMataPelajaran(mapelId, mapelData) {
    return await this.makeRequest(`/mata-pelajaran/${mapelId}`, {
      method: 'PUT',
      body: JSON.stringify(mapelData)
    });
  }

  async deleteMataPelajaran(mapelId) {
    return await this.makeRequest(`/mata-pelajaran/${mapelId}`, {
      method: 'DELETE'
    });
  }

  async searchMataPelajaran(searchTerm) {
    return await this.makeRequest(`/mata-pelajaran/search?q=${encodeURIComponent(searchTerm)}`);
  }

  async getMataPelajaranByKelas(kelasId) {
    return await this.makeRequest(`/mata-pelajaran/by-kelas/${kelasId}`);
  }

  // SISWA METHODS
  async getSiswa(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.search) queryParams.append('search', params.search);
    if (params.kelas) queryParams.append('kelas', params.kelas);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/siswa/?${queryString}` : '/siswa/';
    
    return await this.makeRequest(url);
  }

  async getSiswaById(siswaId) {
    return await this.makeRequest(`/siswa/${siswaId}`);
  }

  async createSiswa(siswaData) {
    return await this.makeRequest('/siswa/', {
      method: 'POST',
      body: JSON.stringify(siswaData)
    });
  }

  async updateSiswa(siswaId, siswaData) {
    return await this.makeRequest(`/siswa/${siswaId}`, {
      method: 'PUT',
      body: JSON.stringify(siswaData)
    });
  }

  async deleteSiswa(siswaId) {
    return await this.makeRequest(`/siswa/${siswaId}`, {
      method: 'DELETE'
    });
  }

  async searchSiswa(searchTerm) {
    return await this.makeRequest(`/siswa/search?q=${encodeURIComponent(searchTerm)}`);
  }

  async getSiswaByKelas(kelasId) {
    return await this.makeRequest(`/siswa/by-kelas/${kelasId}`);
  }

  async getKelasOptions() {
    return await this.makeRequest('/siswa/kelas-options');
  }

  // UJIAN METHODS
  async getUjian(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.search) queryParams.append('search', params.search);
    if (params.kelas) queryParams.append('kelas', params.kelas);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/ujian/?${queryString}` : '/ujian/';
    
    return await this.makeRequest(url);
  }

  async getUjianById(ujianId) {
    return await this.makeRequest(`/ujian/${ujianId}`);
  }

  async createUjian(ujianData) {
    return await this.makeRequest('/ujian/', {
      method: 'POST',
      body: JSON.stringify(ujianData)
    });
  }

  async updateUjian(ujianId, ujianData) {
    return await this.makeRequest(`/ujian/${ujianId}`, {
      method: 'PUT',
      body: JSON.stringify(ujianData)
    });
  }

  async deleteUjian(ujianId) {
    return await this.makeRequest(`/ujian/${ujianId}`, {
      method: 'DELETE'
    });
  }

  async searchUjian(searchTerm) {
    return await this.makeRequest(`/ujian/search?q=${encodeURIComponent(searchTerm)}`);
  }

  async getUjianByKelas(kelasId) {
    return await this.makeRequest(`/ujian/by-kelas/${kelasId}`);
  }

  async getUjianKelasOptions() {
    return await this.makeRequest('/ujian/kelas-options');
  }

  async getMataPelajaranByKelasForUjian(kelasId) {
    return await this.makeRequest(`/ujian/mata-pelajaran-options/${kelasId}`);
  }

  // UJIAN DETAIL METHODS
  async getUjianDetail(ujianId) {
    return await this.makeRequest(`/ujian/${ujianId}/detail`);
  }

  async updateUjianQuestions(ujianId, data) {
    return await this.makeRequest(`/ujian/${ujianId}/soal`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async addPesertaUjian(ujianId, siswaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta`, {
      method: 'POST',
      body: JSON.stringify({ siswa_id: siswaId })
    });
  }

  async removePesertaUjian(ujianId, siswaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${siswaId}`, {
      method: 'DELETE'
    });
  }

  async getAvailableStudents(ujianId) {
    return await this.makeRequest(`/ujian/${ujianId}/available-students`);
  }

  async togglePesertaUjian(ujianId, siswaId) {
    return await this.makeRequest(`/ujian/${ujianId}/toggle-peserta`, {
      method: 'POST',
      body: JSON.stringify({ siswa_id: siswaId })
    });
  }

  async updatePesertaStatus(ujianId, pesertaId, status) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // EKSTRAKSI METHODS
  async extractAnswers(ujianId, pesertaId, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/ekstraksi`, {
      method: 'POST',
      skipContentType: true,
      body: formData
    });
  }

  async initializeEkstraksiTeks(ujianId, pesertaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/init-ekstraksi`, {
      method: 'POST'
    });
  }

  async getEkstraksiResults(ujianId, pesertaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/ekstraksi`);
  }

  // PENILAIAN OTOMATIS METHODS
  async processAutomaticGrading(ujianId, pesertaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/penilaian-otomatis`, {
      method: 'POST'
    });
  }

  async processAutomaticGradingWithAnswers(ujianId, pesertaId, answersData) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/penilaian-otomatis-frontend`, {
      method: 'POST',
      body: JSON.stringify({
        answers: answersData
      })
    });
  }

  async getGradingResults(ujianId, pesertaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/hasil-penilaian`);
  }

  async testGrader(studentAnswer, keyAnswer) {
    return await this.makeRequest('/test-grader', {
      method: 'POST',
      body: JSON.stringify({
        student_answer: studentAnswer,
        key_answer: keyAnswer
      })
    });
  }

  async updateGradingResults(ujianId, pesertaId, updatedScores) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/update-penilaian`, {
      method: 'PUT',
      body: JSON.stringify({
        scores: updatedScores
      })
    });
  }

  // IMAGE METHODS
  async refreshImage(ujianId, pesertaId, filename) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/refresh-image/${filename}`, {
      method: 'POST'
    });
  }

  async checkImagesForUjian(ujianId) {
    return await this.makeRequest(`/ujian/${ujianId}/check-images`);
  }

  async getImageDebugInfo() {
    try {
      return await this.makeRequest('/debug/image-paths');
    } catch (error) {
      throw error;
    }
  }

  // PDF EXPORT METHODS
  async exportLembarSoalPdf(ujianId) {
    try {
      const response = await fetch(`${API_BASE_URL}/ujian/${ujianId}/export-pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      throw error;
    }
  }
  
  async extractHandwritingAnswers(ujianId, pesertaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/ekstraksi-jawaban`, {
      method: 'POST'
    });
  }

  async extractTextFromAnswers(ujianId, pesertaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/ekstraksi-teks`, {
      method: 'POST'
    });
  }

  // PESERTA DETAIL METHODS
  async getPesertaDetail(ujianId, pesertaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/detail`);
  }

  async getPesertaAnswers(ujianId, pesertaId) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/answers`);
  }

  async updatePesertaAnswers(ujianId, pesertaId, answersData) {
    return await this.makeRequest(`/ujian/${ujianId}/peserta/${pesertaId}/answers`, {
      method: 'PUT',
      body: JSON.stringify({
        answers: answersData
      })
    });
  }

  getAnswerImageUrl(filename) {
    if (!filename) return null;
    return `${API_BASE_URL}/static/jawaban/${filename}`;
  }
  
  // UTILITY METHODS
  isAuthenticated() {
    return !!this.token;
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  async healthCheck() {
    return await this.makeRequest('/health', {
      skipAuth: true
    });
  }
}

export default new ApiService();