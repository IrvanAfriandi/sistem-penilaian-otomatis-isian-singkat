import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'client', 'package.json'));
const { chromium } = require('playwright');
const sharp = require('sharp');
const outputDir = path.join(root, 'screenshots');
const baseUrl = process.env.SCREENSHOT_URL || 'http://localhost:8080';
const accounts = [
  { name: 'admin', email: 'admin@example.test', password: 'Demo123!' },
  { name: 'operator', email: 'operator@example.test', password: 'Demo123!' },
  { name: 'viewer', email: 'viewer@example.test', password: 'Demo123!' },
];

await fs.mkdir(outputDir, { recursive: true });
for (const oldFile of await fs.readdir(outputDir)) {
  if (/\.png$|\.webp$/i.test(oldFile)) {
    await fs.unlink(path.join(outputDir, oldFile));
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 870 }, deviceScaleFactor: 1 });
const page = await context.newPage();

async function settle() {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.complete
      ? Promise.resolve()
      : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); })));
  }).catch(() => {});
  await page.waitForTimeout(1400);
}

async function hideOverlays() {
  await page.addStyleTag({ content: `
    [data-sonner-toaster], [data-radix-toast-viewport], [role="status"] { display: none !important; }
  ` }).catch(() => {});
}

async function capture(number, name, caption, role = 'admin') {
  await settle();
  await hideOverlays();
  const png = path.join(outputDir, `${number}-${name}.png`);
  const webp = path.join(outputDir, `${number}-${name}.webp`);
  await page.screenshot({ path: png, fullPage: false, animations: 'disabled' });
  await sharp(png).webp({ quality: 85 }).toFile(webp);
  await fs.unlink(png);
  return { file: path.basename(webp), caption, role };
}

async function login(account) {
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await settle();
  await context.storageState({ path: path.join(os.tmpdir(), `penilaian-${account.name}.state.json`) });
}

for (const account of accounts) {
  await login(account);
}

// The application has no role column and filters records by owner. Use the
// first account again for the feature tour because its fixture owns exam 1.
await login(accounts[0]);

const screenshots = [];
await page.goto(`${baseUrl}/dashboard`);
screenshots.push(await capture('01', 'dashboard', 'Dashboard ringkas dengan statistik kelas, siswa, mata pelajaran, dan ujian.', 'admin'));

await page.goto(`${baseUrl}/kelas`);
screenshots.push(await capture('02', 'daftar-kelas', 'Daftar kelas dengan jumlah siswa dan aksi pengelolaan.', 'admin'));

await page.goto(`${baseUrl}/mapel`);
await page.getByPlaceholder('Cari mata pelajaran atau kelas...').fill('Bahasa');
screenshots.push(await capture('03', 'pencarian-mata-pelajaran', 'Daftar mata pelajaran dengan pencarian aktif.', 'admin'));

await page.goto(`${baseUrl}/siswa`);
await page.getByPlaceholder('Cari siswa berdasarkan nama atau NISN...').fill('Siswa Demo 1');
screenshots.push(await capture('04', 'daftar-siswa', 'Daftar siswa dummy dengan pencarian aktif.', 'admin'));

await page.goto(`${baseUrl}/ujian`);
screenshots.push(await capture('05', 'daftar-ujian', 'Daftar ujian dengan ringkasan peserta dan progres.', 'admin'));

await page.goto(`${baseUrl}/ujian/1`);
screenshots.push(await capture('06', 'detail-ujian', 'Detail ujian, progres pengumpulan, dan daftar peserta.', 'admin'));

await settle();
const editQuestions = page.locator('button').filter({ hasText: 'Edit Soal' }).first();
await editQuestions.waitFor({ state: 'visible', timeout: 10000 });
await editQuestions.click();
screenshots.push(await capture('07', 'edit-soal', 'Form pengelolaan soal ujian dengan data contoh.', 'admin'));

await page.goto(`${baseUrl}/ujian/1/peserta/1`);
screenshots.push(await capture('08', 'detail-jawaban-peserta', 'Detail jawaban dan penilaian peserta ujian.', 'admin'));

await page.goto(`${baseUrl}/ujian/1/upload-jawaban/6`);
await settle();
const upload = page.locator('input[type="file"]');
if (await upload.count()) {
  await upload.setInputFiles({ name: 'jawaban-demo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#eef2ff"/><text x="50" y="120" font-size="32" fill="#1e293b">Contoh Jawaban Dummy</text><text x="50" y="190" font-size="22" fill="#475569">Tidak memuat data asli</text></svg>') });
  screenshots.push(await capture('09', 'upload-jawaban', 'Form upload jawaban dengan file contoh dummy yang sudah dipilih.', 'admin'));
}

await page.goto(`${baseUrl}/ujian/1/penilaian-otomatis/1`);
screenshots.push(await capture('10', 'penilaian-otomatis', 'Alur review jawaban dan penilaian otomatis berbasis AI.', 'admin'));

await page.goto(`${baseUrl}/ujian/1/hasil-penilaian/1`);
screenshots.push(await capture('11', 'hasil-penilaian', 'Hasil penilaian per soal dengan nilai dummy.', 'admin'));

await page.goto(`${baseUrl}/auth`);
screenshots.push(await capture('12', 'login', 'Halaman login aplikasi.', 'public'));

await browser.close();
console.log(JSON.stringify({ baseUrl, accounts: accounts.map(({ name, email }) => ({ name, email })), screenshots }, null, 2));
