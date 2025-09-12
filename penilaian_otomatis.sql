-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 12, 2025 at 04:03 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `penilaian_otomatis`
--

-- --------------------------------------------------------

--
-- Table structure for table `ekstraksi_teks`
--

CREATE TABLE `ekstraksi_teks` (
  `id` int(11) NOT NULL,
  `id_soal` int(11) NOT NULL,
  `id_peserta_ujian` int(11) NOT NULL,
  `output_1` varchar(255) DEFAULT NULL,
  `output_2` varchar(255) DEFAULT NULL,
  `teks` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ekstraksi_teks`
--

INSERT INTO `ekstraksi_teks` (`id`, `id_soal`, `id_peserta_ujian`, `output_1`, `output_2`, `teks`) VALUES
(167, 732, 60, 'peserta_60_ujian_96_soal_1.jpg', NULL, 'aawawaj'),
(168, 733, 60, 'peserta_60_ujian_96_soal_2.jpg', NULL, NULL),
(169, 734, 60, 'peserta_60_ujian_96_soal_3.jpg', NULL, NULL),
(170, 735, 60, 'peserta_60_ujian_96_soal_4.jpg', NULL, NULL),
(171, 736, 60, 'peserta_60_ujian_96_soal_5.jpg', NULL, NULL),
(478, 747, 72, 'peserta_72_ujian_99_soal_1.jpg', 'peserta_72_ujian_99_soal_1_jawaban_1.jpg', 'JAKARTA'),
(479, 748, 72, 'peserta_72_ujian_99_soal_2.jpg', 'peserta_72_ujian_99_soal_2_jawaban_1.jpg', 'FOTOSINTESIS'),
(480, 749, 72, 'peserta_72_ujian_99_soal_3.jpg', 'peserta_72_ujian_99_soal_3_jawaban_1.jpg', 'KARBON MONOKSIDA'),
(481, 750, 72, 'peserta_72_ujian_99_soal_4.jpg', 'peserta_72_ujian_99_soal_4_jawaban_1.jpg', 'JALAN TOL'),
(482, 751, 72, 'peserta_72_ujian_99_soal_5.jpg', 'peserta_72_ujian_99_soal_5_jawaban_1.jpg', 'AMFIBI'),
(568, 757, 78, 'peserta_78_ujian_101_soal_1.jpg', 'peserta_78_ujian_101_soal_1_jawaban_1.jpg', 'MOSA'),
(569, 758, 78, 'peserta_78_ujian_101_soal_2.jpg', 'peserta_78_ujian_101_soal_2_jawaban_1.jpg', 'KRUCIL'),
(570, 759, 78, 'peserta_78_ujian_101_soal_3.jpg', 'peserta_78_ujian_101_soal_3_jawaban_1.jpg', 'DU'),
(571, 760, 78, 'peserta_78_ujian_101_soal_4.jpg', 'peserta_78_ujian_101_soal_4_jawaban_1.jpg', 'MEUS EDARAN'),
(572, 761, 78, 'peserta_78_ujian_101_soal_5.jpg', 'peserta_78_ujian_101_soal_5_jawaban_1.jpg', 'DEDE'),
(573, 757, 79, 'peserta_79_ujian_101_soal_1.jpg', 'peserta_79_ujian_101_soal_1_jawaban_1.jpg', 'BOLA'),
(574, 758, 79, 'peserta_79_ujian_101_soal_2.jpg', 'peserta_79_ujian_101_soal_2_jawaban_1.jpg', 'SARAPAN'),
(575, 759, 79, 'peserta_79_ujian_101_soal_3.jpg', 'peserta_79_ujian_101_soal_3_jawaban_1.jpg', 'MENYAPU'),
(576, 760, 79, 'peserta_79_ujian_101_soal_4.jpg', 'peserta_79_ujian_101_soal_4_jawaban_1.jpg', 'SEPAK BOLA'),
(577, 761, 79, 'peserta_79_ujian_101_soal_5.jpg', 'peserta_79_ujian_101_soal_5_jawaban_1.jpg', 'LENDA'),
(578, 762, 80, 'peserta_80_ujian_102_soal_1.jpg', 'peserta_80_ujian_102_soal_1_jawaban_1.jpg', 'SOEKARNO'),
(579, 763, 80, 'peserta_80_ujian_102_soal_2.jpg', 'peserta_80_ujian_102_soal_2_jawaban_1.jpg', 'PADI'),
(580, 764, 80, 'peserta_80_ujian_102_soal_3.jpg', 'peserta_80_ujian_102_soal_3_jawaban_1.jpg', 'MUCU ATOM'),
(581, 765, 80, 'peserta_80_ujian_102_soal_4.jpg', 'peserta_80_ujian_102_soal_4_jawaban_1.jpg', 'PENYEMPITAN'),
(582, 766, 80, 'peserta_80_ujian_102_soal_5.jpg', 'peserta_80_ujian_102_soal_5_jawaban_1.jpg', 'BANTAI'),
(588, 702, 82, 'peserta_82_ujian_90_soal_1.jpg', 'peserta_82_ujian_90_soal_1_jawaban_1.jpg', 'PEPAYA'),
(589, 703, 82, 'peserta_82_ujian_90_soal_2.jpg', NULL, NULL),
(590, 704, 82, 'peserta_82_ujian_90_soal_3.jpg', NULL, NULL),
(591, 705, 82, 'peserta_82_ujian_90_soal_4.jpg', NULL, NULL),
(592, 706, 82, 'peserta_82_ujian_90_soal_5.jpg', 'peserta_82_ujian_90_soal_5_jawaban_1.jpg', 'MEPT'),
(593, 772, 85, 'peserta_85_ujian_104_soal_1.jpg', 'peserta_85_ujian_104_soal_1_jawaban_1.jpg', ''),
(594, 773, 85, 'peserta_85_ujian_104_soal_2.jpg', 'peserta_85_ujian_104_soal_2_jawaban_1.jpg', 'HUJAN'),
(595, 774, 85, 'peserta_85_ujian_104_soal_3.jpg', 'peserta_85_ujian_104_soal_3_jawaban_1.jpg', 'ULAT'),
(596, 775, 85, 'peserta_85_ujian_104_soal_4.jpg', 'peserta_85_ujian_104_soal_4_jawaban_1.jpg', 'MINUM'),
(597, 776, 85, 'peserta_85_ujian_104_soal_5.jpg', 'peserta_85_ujian_104_soal_5_jawaban_1.jpg', 'API'),
(608, 752, 87, 'peserta_87_ujian_100_soal_1.jpg', 'peserta_87_ujian_100_soal_1_jawaban_1.jpg', 'JARA'),
(609, 753, 87, 'peserta_87_ujian_100_soal_2.jpg', 'peserta_87_ujian_100_soal_2_jawaban_1.jpg', 'INTENSIF'),
(610, 754, 87, 'peserta_87_ujian_100_soal_3.jpg', 'peserta_87_ujian_100_soal_3_jawaban_1.jpg', 'BRBONMONOKI'),
(611, 755, 87, 'peserta_87_ujian_100_soal_4.jpg', 'peserta_87_ujian_100_soal_4_jawaban_1.jpg', 'MANTOL'),
(612, 756, 87, 'peserta_87_ujian_100_soal_5.jpg', 'peserta_87_ujian_100_soal_5_jawaban_1.jpg', 'MANDI'),
(613, 712, 89, 'peserta_89_ujian_92_soal_1.jpg', 'peserta_89_ujian_92_soal_1_jawaban_1.jpg', 'PELAJARLAH'),
(614, 713, 89, 'peserta_89_ujian_92_soal_2.jpg', 'peserta_89_ujian_92_soal_2_jawaban_1.jpg', 'FOTOSINETESIS'),
(615, 714, 89, 'peserta_89_ujian_92_soal_3.jpg', 'peserta_89_ujian_92_soal_3_jawaban_1.jpg', 'KARBON MOSI'),
(616, 715, 89, 'peserta_89_ujian_92_soal_4.jpg', 'peserta_89_ujian_92_soal_4_jawaban_1.jpg', 'MAKIAN'),
(617, 716, 89, 'peserta_89_ujian_92_soal_5.jpg', 'peserta_89_ujian_92_soal_5_jawaban_1.jpg', 'MIDI');

-- --------------------------------------------------------

--
-- Table structure for table `kelas`
--

CREATE TABLE `kelas` (
  `id` int(11) NOT NULL,
  `id_users` int(11) NOT NULL,
  `nama_kelas` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `kelas`
--

INSERT INTO `kelas` (`id`, `id_users`, `nama_kelas`) VALUES
(18, 9, '2A'),
(30, 9, 'A'),
(26, 10, '2'),
(31, 10, '3'),
(32, 10, '4'),
(27, 11, '2'),
(34, 12, '2');

-- --------------------------------------------------------

--
-- Table structure for table `mata_pelajaran`
--

CREATE TABLE `mata_pelajaran` (
  `id` int(11) NOT NULL,
  `id_kelas` int(11) NOT NULL,
  `id_users` int(11) NOT NULL,
  `nama_mapel` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `mata_pelajaran`
--

INSERT INTO `mata_pelajaran` (`id`, `id_kelas`, `id_users`, `nama_mapel`) VALUES
(17, 18, 9, 'Bahasa Indonesia a'),
(19, 18, 9, 'IPS'),
(20, 18, 9, 'IPA'),
(27, 27, 11, 'Bhs Indonesia'),
(30, 26, 10, 'IPS'),
(31, 26, 10, 'Bahasa Indonesia'),
(32, 26, 10, 'IPA'),
(33, 26, 10, 'PKN'),
(34, 26, 10, 'Tematik'),
(36, 34, 12, 'IPA');

-- --------------------------------------------------------

--
-- Table structure for table `penilaian`
--

CREATE TABLE `penilaian` (
  `id` int(11) NOT NULL,
  `id_peserta` int(11) NOT NULL,
  `id_soal` int(11) NOT NULL,
  `jawaban` varchar(255) DEFAULT NULL,
  `nilai` double(8,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `penilaian`
--

INSERT INTO `penilaian` (`id`, `id_peserta`, `id_soal`, `jawaban`, `nilai`) VALUES
(28, 60, 732, 'aawawaj', 27.60),
(29, 60, 733, 'sdsds', 17.00),
(30, 60, 734, 'dsdsd', 32.30),
(31, 60, 735, 'ddddddds', 27.90),
(32, 60, 736, 'aaaaaaaaaa', 36.70),
(83, 72, 747, 'JAKARTA', 100.00),
(84, 72, 748, 'FOTOSINTESIS', 100.00),
(85, 72, 749, 'KARBON MONOKSIDA', 100.00),
(86, 72, 750, 'JALAN TOL', 100.00),
(87, 72, 751, 'AMFIBI', 100.00),
(93, 78, 757, 'PASAR', 100.00),
(94, 78, 758, 'RUPIAH', 100.00),
(95, 78, 759, 'DAYAK', 56.60),
(96, 78, 760, 'RUMAH MINANG', 65.40),
(97, 78, 761, 'MEMBELI', 54.40),
(98, 85, 773, 'HUJAN', 100.00),
(99, 85, 774, 'ULAT', 71.30),
(100, 85, 775, 'MINUM', 46.60),
(101, 85, 776, 'API', 68.40),
(107, 85, 772, '', 0.00),
(108, 87, 752, 'JARA', 30.00),
(109, 87, 753, 'INTENSIF', 47.60),
(110, 87, 754, 'BRBONMONOKI', 27.50),
(111, 87, 755, 'MANTOL', 29.20),
(112, 87, 756, 'MANDI', 28.30),
(113, 89, 712, 'KI HAJAR DEWANTORO', 71.80),
(114, 89, 713, 'FOTOSINETESIS', 47.10),
(115, 89, 714, 'KARBON MOSI', 22.70),
(116, 89, 715, 'MAKIAN', 33.40),
(117, 89, 716, 'MIDI', 26.30);

-- --------------------------------------------------------

--
-- Table structure for table `peserta_ujian`
--

CREATE TABLE `peserta_ujian` (
  `id` int(11) NOT NULL,
  `id_siswa` int(11) NOT NULL,
  `id_ujian` int(11) NOT NULL,
  `foto_jawaban` varchar(255) DEFAULT NULL,
  `status` enum('selesai','belum selesai','','') NOT NULL DEFAULT 'belum selesai',
  `total_nilai` double(8,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `peserta_ujian`
--

INSERT INTO `peserta_ujian` (`id`, `id_siswa`, `id_ujian`, `foto_jawaban`, `status`, `total_nilai`) VALUES
(60, 25, 96, 'peserta_60_ujian_96_jawaban.jpg', 'selesai', 28.30),
(72, 28, 99, 'peserta_72_ujian_99_jawaban.jpg', 'selesai', 100.00),
(75, 30, 97, NULL, 'belum selesai', 0.00),
(76, 29, 97, NULL, 'belum selesai', 0.00),
(77, 25, 97, NULL, 'belum selesai', 0.00),
(78, 26, 101, 'peserta_78_ujian_101_jawaban.jpg', 'selesai', 75.28),
(79, 33, 101, 'peserta_79_ujian_101_jawaban.jpg', 'belum selesai', 0.00),
(80, 26, 102, 'peserta_80_ujian_102_jawaban.jpg', 'belum selesai', 0.00),
(81, 34, 102, NULL, 'belum selesai', 0.00),
(82, 30, 90, 'peserta_82_ujian_90_jawaban.jpg', 'belum selesai', 0.00),
(85, 36, 104, 'peserta_85_ujian_104_jawaban.jpg', 'selesai', 286.30),
(87, 25, 100, 'peserta_87_ujian_100_jawaban.jpg', 'selesai', 32.52),
(89, 38, 92, 'peserta_89_ujian_92_jawaban.jpg', 'selesai', 40.26);

-- --------------------------------------------------------

--
-- Table structure for table `siswa`
--

CREATE TABLE `siswa` (
  `id` int(11) NOT NULL,
  `id_users` int(11) NOT NULL,
  `nama_siswa` varchar(255) NOT NULL,
  `nisn` bigint(10) NOT NULL,
  `kelas` int(11) DEFAULT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `siswa`
--

INSERT INTO `siswa` (`id`, `id_users`, `nama_siswa`, `nisn`, `kelas`, `jenis_kelamin`) VALUES
(25, 9, 'df', 1234567892, 18, 'Perempuan'),
(26, 10, 'Irvan', 211, 26, 'Laki-laki'),
(28, 11, 'Irvan Afriandi', 12345, 27, 'Laki-laki'),
(29, 9, 'hhh', 121213, 18, 'Perempuan'),
(30, 9, 'C', 11111, 18, 'Laki-laki'),
(31, 11, 'asss', 123456, 26, 'Laki-laki'),
(33, 10, 'Ahmad', 210, 26, 'Laki-laki'),
(34, 10, 'Ilham', 212, 26, 'Laki-laki'),
(36, 12, 'Andi Pratama', 1234567890, 34, 'Laki-laki'),
(37, 12, 'Rina Sari Dewi', 1234567892, 34, 'Perempuan'),
(38, 9, 'Irvan Afriandi', 14113513, 18, 'Laki-laki');

-- --------------------------------------------------------

--
-- Table structure for table `soal`
--

CREATE TABLE `soal` (
  `id` int(11) NOT NULL,
  `id_ujian` int(11) NOT NULL,
  `no_soal` int(1) DEFAULT NULL,
  `pertanyaan` text DEFAULT NULL,
  `kunci_jawaban` text DEFAULT NULL,
  `gambar` varchar(255) DEFAULT NULL,
  `status_gambar` enum('on','off','','') NOT NULL DEFAULT 'off'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `soal`
--

INSERT INTO `soal` (`id`, `id_ujian`, `no_soal`, `pertanyaan`, `kunci_jawaban`, `gambar`, `status_gambar`) VALUES
(697, 89, 1, 'Apa sumber cahaya terbesar di bumi?', 'Matahari', 'IMG-8b6df1e126d6.png', 'on'),
(698, 89, 2, 'Hewan apa yang menghasilkan susu?', 'Sapi', NULL, 'off'),
(699, 89, 3, 'Sebutkan 2 contoh organ tubuh untuk bernapas!', 'Hidung, paru-paru', NULL, 'off'),
(700, 89, 4, 'Bagian tumbuhan apa yang berwarna indah dan disukai lebah?', 'Bunga', 'IMG-22c83cdc46ce.jpg', 'on'),
(701, 89, 5, 'Alat tubuh apa yang digunakan untuk mendengar?', 'Telinga', 'IMG-cab1ff9bc99a.jpg', 'on'),
(702, 90, 1, 'Apa nama ibukota Indonesia?', 'Jakarta', NULL, 'off'),
(703, 90, 2, 'Bendera negara mana yang ada pada gambar?', 'Indonesia', 'IMG-d844141229fb.jpg', 'on'),
(704, 90, 3, 'Hari kemerdekaan Indonesia diperingati tanggal berapa?', '17 agustus', NULL, 'off'),
(705, 90, 4, 'Siapakah pemimpin tertinggi negara kita?', 'Presiden', 'IMG-3e0c217cbffc.jpg', 'on'),
(706, 90, 5, 'Apa warna pada bendera ini?', 'Merah putih biru', 'IMG-67d6eda8ed70.jpg', 'on'),
(707, 91, 1, 'Sebutkan sila pertama Pancasila!', 'Ketuhanan Yang Maha Esa', NULL, 'off'),
(708, 91, 2, 'Lambang negara Indonesia adalah ...', 'Garuda Pancasila', NULL, 'off'),
(709, 91, 3, 'Apa nama lambang pada gambar?', 'Garuda Pancasila', 'IMG-506778a9298f.png', 'on'),
(710, 91, 4, 'Apa yang harus kita lakukan saat bertemu guru?', 'Memberi salam', 'IMG-8da33e7123a9.jpg', 'on'),
(711, 91, 5, 'Apa warna dasar bendera Indonesia?', 'Merah dan putih', NULL, 'off'),
(712, 92, 1, 'Siapa nama pahlawan yang dikenal dengan sebutan \'Bapak Pendidikan Nasional\'?', 'Ki Hajar Dewantara', NULL, 'off'),
(713, 92, 2, 'Apa tanaman utama yang tumbuh di sawah?', 'Padi', 'IMG-f2297c130d41.jpg', 'on'),
(714, 92, 3, 'Sebutkan contoh kegiatan gotong royong di rumah!', 'Membersihkan rumah bersama-sama', NULL, 'off'),
(715, 92, 4, 'Apa yang sedang dilakukan orang pada gambar?', 'Menanam pohon', 'IMG-6382a3d9f103.jpg', 'on'),
(716, 92, 5, 'Apa yang harus kita lakukan agar punya banyak teman?', 'Saling menolong', 'IMG-216506d6e903.png', 'on'),
(732, 96, 1, 'Apa nama ibukota Indonesia', 'DKI Jakarta', NULL, 'off'),
(733, 96, 2, 'Sebutkan sila ke-5 Pancasila!', 'Keadilan sosial bagi seluruh rakyat Indonesia', NULL, 'off'),
(734, 96, 3, 'Apa sikap baik yang ditunjukkan pada gambar?', 'tertib', 'IMG-843563c0dcc4.jpg', 'on'),
(735, 96, 4, 'Apa warna dasar lambang Garuda Pancasila?', 'emas', NULL, 'off'),
(736, 96, 5, 'Apa yang harus kita lakukan terhadap perbedaan di sekolah?', 'menghargai', NULL, 'off'),
(737, 97, 1, 'Alat apa yang digunakan untuk bermain sepak bola?', 'bola', 'IMG-2dffa0266c91.jpg', 'on'),
(738, 97, 2, 'Apa yang kita lakukan setiap pagi sebelum belajar?', 'Sarapan / berdoa', NULL, 'off'),
(739, 97, 3, 'Apa yang dilakukan anak pada gambar?', 'menyapu', 'IMG-d92e0fd556e1.jpg', 'on'),
(740, 97, 4, 'Sebutkan 2 contoh permainan tradisional!', 'Kelereng, congklak', NULL, 'off'),
(741, 97, 5, 'Apa kegiatan anak pada gambar?', 'membaca', 'IMG-f9551900b3ae.jpg', 'on'),
(747, 99, 1, 'Apa nama ibukota Indonesia?', 'jakarta', NULL, 'off'),
(748, 99, 2, 'Proses tumbuhan menghasilkan oksigen disebut?', 'fotosintesis', NULL, 'off'),
(749, 99, 3, 'gas apa yang dihasilkan kendaraan bermotor?', 'karbon monoksida', NULL, 'off'),
(750, 99, 4, 'jalan bebas hambatan disebut?', 'jalan tol', NULL, 'off'),
(751, 99, 5, 'hewan yang dapat hidup di air dan di darat disebut?', 'amfibi', NULL, 'off'),
(752, 100, 1, '1', '1', NULL, 'off'),
(753, 100, 2, '2', '3', NULL, 'off'),
(754, 100, 3, '4', '4', NULL, 'off'),
(755, 100, 4, '5', '6', NULL, 'off'),
(756, 100, 5, '7', '8', NULL, 'off'),
(757, 101, 1, 'Tempat apa yang digunakan untuk jual beli?', 'Pasar', 'IMG-49b348c3b830.jpg', 'on'),
(758, 101, 2, 'Apa mata uang yang digunakan Indonesia?', 'Rupiah', NULL, 'off'),
(759, 101, 3, 'Apa suku paling banyak di Indonesia?', 'Jawa', NULL, 'off'),
(760, 101, 4, 'Apa nama bangunan yang ada pada gambar?', 'Rumah adat', 'IMG-a2de8a718984.jpg', 'on'),
(761, 101, 5, 'Kegiatan yang dilakukan agar mendapatkan uang disebut?', 'Bekerja', NULL, 'off'),
(762, 102, 1, 'Siapa presiden pertama Indonesia?', 'soekarno', NULL, 'off'),
(763, 102, 2, 'Apa nama  tumbuhan disamping?', 'padi', 'IMG-2623416d2aad.jpg', 'on'),
(764, 102, 3, 'apa pekerjaan yang ada dirumah?', 'mencuci', NULL, 'off'),
(765, 102, 4, 'apa yang dilakukan orang disamping?', 'menanam', 'IMG-21a12b5da4a7.jpg', 'on'),
(766, 102, 5, 'apa yang dilakukan bersama teman?', 'tolong menolong', 'IMG-c783d5e5df71.png', 'on'),
(772, 104, 1, 'Sebutkan 3 benda yang termasuk makhluk hidup!', 'Manusia, hewan, dan tumbuhan', NULL, 'off'),
(773, 104, 2, 'Apa nama lain CO2?', 'karbon dioksida', NULL, 'off'),
(774, 104, 3, 'Proses apa yang terjadi di daun?', 'fotosintesis', NULL, 'off'),
(775, 104, 4, 'Pusat tata surya kita terletak di?', 'matahari', NULL, 'off'),
(776, 104, 5, 'apa yang dihasilkan oleh proses fotosintesis?', 'oksigen', NULL, 'off');

-- --------------------------------------------------------

--
-- Table structure for table `ujian`
--

CREATE TABLE `ujian` (
  `id` int(11) NOT NULL,
  `id_users` int(11) NOT NULL,
  `id_kelas` int(11) DEFAULT NULL,
  `id_mapel` int(10) DEFAULT NULL,
  `nama_ujian` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ujian`
--

INSERT INTO `ujian` (`id`, `id_users`, `id_kelas`, `id_mapel`, `nama_ujian`) VALUES
(89, 9, 18, 20, 'IPA BAB 1'),
(90, 9, 18, 19, 'IPS BAB 1'),
(91, 9, 18, NULL, 'PKN BAB 1'),
(92, 9, 18, NULL, 'Tematik BAB 1'),
(96, 9, 18, NULL, 'PKN BAB 2'),
(97, 9, 18, 20, 'Tematik BAB 2'),
(99, 11, 27, 27, 'BAB 1'),
(100, 9, 18, 17, 'aaa'),
(101, 10, 26, 30, 'IPS BAB 1'),
(102, 10, 26, 33, 'PKN BAB 3'),
(104, 12, 34, NULL, 'Ujian IPA Semester 1');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `nama_depan` varchar(100) NOT NULL,
  `nama_belakang` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nama_depan`, `nama_belakang`, `email`, `password`) VALUES
(9, 'Irvan', 'Afriandi', 'admin123@gmail.com', '$2b$12$45x/dBvbEubWxx2rHq20wORnhQs4W3B57RUSs3oUTmXdjYuH/g./y'),
(10, 'Irvan', 'Afriandi', 'irvan123@gmail.com', '$2b$12$J4gxioIFISZ8/HqAIK/DGOG.A02rr6HzxoJUm2roNYEFK3Gi05XuG'),
(11, 'Fickry', 'Nur Farhansyah', 'fikri123@gmail.com', '$2b$12$tShVNhYgUGawoj2evRyWee25F8AV1WwdmlI3yGE/emHEm8gk/k/s2'),
(12, 'Test', 'User', 'user123@gmail.com', '$2b$12$SgX3eja6bEV4NJUA0rR6de2UhKAMiIAGCnI8L1ucBtmjKt0S.YlDO');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ekstraksi_teks`
--
ALTER TABLE `ekstraksi_teks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_jawaban_soal` (`id_soal`),
  ADD KEY `idx_jawaban_peserta` (`id_peserta_ujian`);

--
-- Indexes for table `kelas`
--
ALTER TABLE `kelas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_kelas_per_user` (`id_users`,`nama_kelas`),
  ADD KEY `idx_kelas_users` (`id_users`),
  ADD KEY `idx_kelas_nama` (`nama_kelas`);

--
-- Indexes for table `mata_pelajaran`
--
ALTER TABLE `mata_pelajaran`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mapel_kelas` (`id_kelas`),
  ADD KEY `idx_mapel_users` (`id_users`);

--
-- Indexes for table `penilaian`
--
ALTER TABLE `penilaian`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_peserta` (`id_peserta`,`id_soal`),
  ADD KEY `id_soal` (`id_soal`);

--
-- Indexes for table `peserta_ujian`
--
ALTER TABLE `peserta_ujian`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_peserta_ujian` (`id_siswa`,`id_ujian`),
  ADD KEY `idx_peserta_ujian_siswa` (`id_siswa`),
  ADD KEY `idx_peserta_ujian_ujian` (`id_ujian`);

--
-- Indexes for table `siswa`
--
ALTER TABLE `siswa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_siswa_users` (`id_users`),
  ADD KEY `idx_siswa_kelas` (`kelas`),
  ADD KEY `idx_siswa_nama` (`nama_siswa`);

--
-- Indexes for table `soal`
--
ALTER TABLE `soal`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_soal_ujian` (`id_ujian`);

--
-- Indexes for table `ujian`
--
ALTER TABLE `ujian`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ujian_users` (`id_users`),
  ADD KEY `idx_ujian_kelas` (`id_kelas`),
  ADD KEY `idx_ujian_nama` (`nama_ujian`),
  ADD KEY `id_mapel` (`id_mapel`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_users_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ekstraksi_teks`
--
ALTER TABLE `ekstraksi_teks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=618;

--
-- AUTO_INCREMENT for table `kelas`
--
ALTER TABLE `kelas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `mata_pelajaran`
--
ALTER TABLE `mata_pelajaran`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `penilaian`
--
ALTER TABLE `penilaian`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=118;

--
-- AUTO_INCREMENT for table `peserta_ujian`
--
ALTER TABLE `peserta_ujian`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90;

--
-- AUTO_INCREMENT for table `siswa`
--
ALTER TABLE `siswa`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `soal`
--
ALTER TABLE `soal`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=777;

--
-- AUTO_INCREMENT for table `ujian`
--
ALTER TABLE `ujian`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=105;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ekstraksi_teks`
--
ALTER TABLE `ekstraksi_teks`
  ADD CONSTRAINT `fk_jawaban_peserta_ujian` FOREIGN KEY (`id_peserta_ujian`) REFERENCES `peserta_ujian` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_jawaban_soal` FOREIGN KEY (`id_soal`) REFERENCES `soal` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `kelas`
--
ALTER TABLE `kelas`
  ADD CONSTRAINT `fk_kelas_users` FOREIGN KEY (`id_users`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `mata_pelajaran`
--
ALTER TABLE `mata_pelajaran`
  ADD CONSTRAINT `fk_mapel_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mapel_users` FOREIGN KEY (`id_users`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `penilaian`
--
ALTER TABLE `penilaian`
  ADD CONSTRAINT `penilaian_ibfk_1` FOREIGN KEY (`id_peserta`) REFERENCES `peserta_ujian` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `penilaian_ibfk_2` FOREIGN KEY (`id_soal`) REFERENCES `soal` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `peserta_ujian`
--
ALTER TABLE `peserta_ujian`
  ADD CONSTRAINT `fk_peserta_ujian_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_peserta_ujian_ujian` FOREIGN KEY (`id_ujian`) REFERENCES `ujian` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `siswa`
--
ALTER TABLE `siswa`
  ADD CONSTRAINT `fk_siswa_kelas` FOREIGN KEY (`kelas`) REFERENCES `kelas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_siswa_users` FOREIGN KEY (`id_users`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `soal`
--
ALTER TABLE `soal`
  ADD CONSTRAINT `fk_soal_ujian` FOREIGN KEY (`id_ujian`) REFERENCES `ujian` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ujian`
--
ALTER TABLE `ujian`
  ADD CONSTRAINT `fk_ujian_kelas` FOREIGN KEY (`id_kelas`) REFERENCES `kelas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ujian_mata_pelajaran` FOREIGN KEY (`id_mapel`) REFERENCES `mata_pelajaran` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ujian_users` FOREIGN KEY (`id_users`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
