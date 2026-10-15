"""Create an isolated SQLite dataset for local screenshots.

This helper is intentionally outside the application source tree.
It refuses to overwrite an existing database file.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", required=True, help="SQLite file path")
    args = parser.parse_args()

    database_path = Path(args.database).expanduser().resolve()
    if database_path.exists() and database_path.stat().st_size > 0:
        raise SystemExit(f"Refusing to overwrite non-empty database: {database_path}")
    database_path.parent.mkdir(parents=True, exist_ok=True)
    database_path.touch(exist_ok=True)

    os.environ["DATABASE_URL"] = f"sqlite:///{database_path.as_posix()}"
    os.environ["APP_ENV"] = "local"
    os.environ["APP_DEBUG"] = "false"

    from app import create_app, db
    from app.models.ekstraksi_teks import EkstraksiTeks
    from app.models.kelas import Kelas
    from app.models.mata_pelajaran import MataPelajaran
    from app.models.penilaian import Penilaian
    from app.models.peserta_ujian import PesertaUjian
    from app.models.siswa import Siswa
    from app.models.soal import Soal
    from app.models.user import User
    from app.models.ujian import Ujian

    app = create_app()
    with app.app_context():
        db.create_all()

        accounts = []
        for first, last, email in [
            ("Alya", "Pratama", "admin@example.test"),
            ("Bima", "Nugraha", "operator@example.test"),
            ("Citra", "Lestari", "viewer@example.test"),
        ]:
            user = User(nama_depan=first, nama_belakang=last, email=email)
            user.set_password("Demo123!")
            db.session.add(user)
            accounts.append(user)
        db.session.flush()

        # Give each account an identical, fully fictional workspace. The app
        # has no role column, so all three accounts intentionally have the
        # same capabilities exposed by the current source code.
        for user_index, user in enumerate(accounts):
            classes = [
                Kelas(id_users=user.id, nama_kelas=f"Kelas {user_index + 1}-A"),
                Kelas(id_users=user.id, nama_kelas=f"Kelas {user_index + 1}-B"),
                Kelas(id_users=user.id, nama_kelas=f"Kelas {user_index + 1}-C"),
            ]
            db.session.add_all(classes)
            db.session.flush()

            subjects = [
                MataPelajaran(id_users=user.id, id_kelas=classes[0].id, nama_mapel="Bahasa Indonesia"),
                MataPelajaran(id_users=user.id, id_kelas=classes[1].id, nama_mapel="Ilmu Pengetahuan Alam"),
                MataPelajaran(id_users=user.id, id_kelas=classes[2].id, nama_mapel="Pendidikan Pancasila"),
            ]
            db.session.add_all(subjects)
            db.session.flush()

            students = []
            for number in range(1, 11):
                students.append(
                    Siswa(
                        id_users=user.id,
                        nama_siswa=f"Siswa Demo {user_index + 1}-{number:02d}",
                        nisn=9900000000 + (user_index * 100) + number,
                        kelas=classes[(number - 1) % len(classes)].id,
                        jenis_kelamin="Laki-laki" if number % 2 else "Perempuan",
                    )
                )
            db.session.add_all(students)
            db.session.flush()

            exams = [
                Ujian(id_users=user.id, id_kelas=classes[0].id, id_mapel=subjects[0].id, nama_ujian="Asesmen Teks Deskripsi"),
                Ujian(id_users=user.id, id_kelas=classes[1].id, id_mapel=subjects[1].id, nama_ujian="Evaluasi Sains Terapan"),
                Ujian(id_users=user.id, id_kelas=classes[2].id, id_mapel=subjects[2].id, nama_ujian="Refleksi Kebangsaan"),
            ]
            db.session.add_all(exams)
            db.session.flush()

            for exam_index, exam in enumerate(exams):
                questions = [
                    Soal(id_ujian=exam.id, no_soal=1, pertanyaan="Jelaskan gagasan utama dari bacaan berikut.", kunci_jawaban="Gagasan utama dijelaskan dengan kalimat yang runtut.", status_gambar="off"),
                    Soal(id_ujian=exam.id, no_soal=2, pertanyaan="Tuliskan dua contoh yang mendukung jawabanmu.", kunci_jawaban="Dua contoh relevan dan sesuai konteks.", status_gambar="off"),
                    Soal(id_ujian=exam.id, no_soal=3, pertanyaan="Sampaikan kesimpulan singkat berdasarkan informasi tersebut.", kunci_jawaban="Kesimpulan merangkum informasi utama.", status_gambar="off"),
                ]
                db.session.add_all(questions)
                db.session.flush()

                for student_index, student in enumerate(students[:8]):
                    completed = student_index < 5
                    participant = PesertaUjian(
                        id_siswa=student.id,
                        id_ujian=exam.id,
                        total_nilai=78.0 + ((student_index + exam_index) % 5) if completed else 0.0,
                        status="selesai" if completed else "belum selesai",
                    )
                    db.session.add(participant)
                    db.session.flush()
                    if completed:
                        for question_index, question in enumerate(questions):
                            score = 74.0 + ((student_index + question_index + exam_index) % 7)
                            db.session.add(Penilaian(id_peserta=participant.id, id_soal=question.id, jawaban="Jawaban contoh siswa yang relevan dan runtut.", nilai=score))
                            db.session.add(EkstraksiTeks(id_soal=question.id, id_peserta_ujian=participant.id, teks="Jawaban contoh siswa yang relevan dan runtut."))

        db.session.commit()
        print(f"Created isolated screenshot database: {database_path}")
        print("Test accounts: admin@example.test, operator@example.test, viewer@example.test")
        print("Test password: Demo123!")


if __name__ == "__main__":
    main()
