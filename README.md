# Penilaian Isian Singkat Otomatis

Aplikasi untuk melakukan penilaian jawaban isian singkat secara otomatis.

## Struktur project

- `client/` — aplikasi frontend.
- `server/` — API backend dan layanan penilaian.
- `training/` — kode atau bahan pelatihan model.
- `penilaian_otomatis.sql` — struktur/data awal database.

## Menyiapkan model

File model tidak disimpan di repository karena ukurannya terlalu besar untuk GitHub.

1. Unduh `crnn.pt` dari [Google Drive](https://drive.google.com/drive/folders/1eOK_Vr8I5ygNW2rwBIqrZfVc-n9cmRub?usp=sharing).
2. Simpan file tersebut pada lokasi berikut:

   ```text
   server/app/services/model/crnn.pt
   ```

3. Pastikan nama file tepat `crnn.pt` sebelum menjalankan backend.

Jika link Google Drive memerlukan akses khusus, minta izin akses terlebih dahulu atau gunakan akun Google yang telah diberi akses.

## Menjalankan backend

Buat virtual environment dan pasang dependensi:

```powershell
cd server
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

## Menjalankan frontend

```powershell
cd client
npm install
npm run dev
```

Jangan commit `server/venv`, `client/node_modules`, file `.env`, atau file model ke repository.
