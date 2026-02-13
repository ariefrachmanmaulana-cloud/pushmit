# 🚀 Pushmit - Performance Testing Suite

Panduan cepat penggunaan tools **Pushmit** untuk testing performa website di Windows.

---

## 📂 Struktur File
* `config.js`      : Ganti URL target, Header, dan Kredensial di sini.
* `scenarios.js`   : Atur jumlah Virtual Users (target) dan durasi tes.
* `test-script.js` : Logika utama (jangan diubah kecuali ingin ganti alur tes).
* `run_all_tests.bat`: Script otomatis untuk menjalankan SEMUA tes sekaligus.

---

## ⚡ Cara Menjalankan Testing

### 1. Menjalankan Semua Tes Sekaligus (Otomatis)
Cara ini akan menjalankan Performance, Load, Stress, hingga Scalability secara berurutan dan menghasilkan laporan untuk masing-masing tes.
* **Via Terminal:** Ketik `run_all_tests.bat` lalu Enter.
* **Via Explorer:** Klik dua kali file `run_all_tests.bat`.

### 2. Menjalankan Tes Satu Per Satu (Manual)
Gunakan cara ini jika kamu hanya ingin menguji skenario tertentu tanpa menunggu tes lainnya. Ketik perintah berikut di terminal VS Code:

| Skenario | Perintah Terminal |
| :--- | :--- |
| **Performance** | `k6 run -e TYPE=performance --summary-export=report_perf.json test-script.js` |
| **Load Test** | `k6 run -e TYPE=load --summary-export=report_load.json test-script.js` |
| **Stress Test** | `k6 run -e TYPE=stress --summary-export=report_stress.json test-script.js` |
| **Spike Test** | `k6 run -e TYPE=spike --summary-export=report_spike.json test-script.js` |
| **Endurance** | `k6 run -e TYPE=endurance --summary-export=report_endur.json test-script.js` |

> **Tips:** Ganti `--summary-export=nama_file.json` menjadi `--out csv=nama_file.csv` jika ingin laporan dalam format Excel (CSV).

---

## 📊 Cara Membaca Hasil
Setelah running selesai, cek folder untuk file berikut:
1. **JSON (`.json`)**: Data detail hasil testing.
2. **CSV (`.csv`)**: Data statistik yang bisa dibuka di Microsoft Excel.
3. **Terminal**: Lihat tabel `http_req_duration` (kecepatan) dan `http_req_failed` (error).

---

## 🛠️ Maintenance
* **Ganti Website**: Buka `config.js` -> ubah `targetUrl`.
* **Naikkan Jumlah User**: Buka `scenarios.js` -> ubah nilai `target` atau `vus`.
* **Ubah Syarat Lulus**: Buka `scenarios.js` -> ubah `thresholds` (misal: durasi respon maksimal).