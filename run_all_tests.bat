@echo off
setlocal enabledelayedexpansion

:: Buat struktur folder jika belum ada
if not exist "Reports\html" mkdir "Reports\html"
if not exist "Reports\csv" mkdir "Reports\csv"
if not exist "Reports\json" mkdir "Reports\json"

echo ==========================================
echo Starting Pushmit Automated Suite...
echo ==========================================

:: BERSIHKAN file sisa dari proses sebelumnya yang di-terminate paksa
del summary_*.html >nul 2>&1
del summary_*.json >nul 2>&1

set scenarios=performance load stress spike endurance scalability

for %%s in (%scenarios%) do (
    echo [RUNNING] %%s test...
    
    :: Jalankan k6
    k6 run -e TYPE=%%s --out csv=Reports\CSV\report_%%s.csv test-script.js
    
    :: Pindahkan file hanya jika file tersebut muncul (berhasil digenerate k6)
    timeout /t 1 >nul
    if exist summary_%%s.html (
        move /y summary_%%s.html Reports\HTML\Laporan_%%s.html >nul
    )
    if exist summary_%%s.json (
        move /y summary_%%s.json Reports\JSON\data_%%s.json >nul
    )
    
    echo [OK] %%s test completed.
    echo ------------------------------------------
)

echo.
echo SEMUA PENGUJIAN SELESAI!
pause