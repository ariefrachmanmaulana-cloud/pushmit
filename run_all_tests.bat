@echo off
setlocal enabledelayedexpansion

:: 1. Pastikan folder Reports ada
if not exist "Reports\HTML" mkdir "Reports\HTML"
if not exist "Reports\CSV" mkdir "Reports\CSV"
if not exist "Reports\JSON" mkdir "Reports\JSON"

echo ==========================================
echo Starting Pushmit Automated Suite...
echo ==========================================

:: 2. BERSIHKAN FILE SISA DI ROOT AGAR TIDAK MENGGANGGU
del summary_*.html >nul 2>&1
del summary_*.json >nul 2>&1

::set scenarios=performance load stress spike endurance scalability
set scenarios=performance

for %%s in (%scenarios%) do (
    echo [RUNNING] %%s test...
    
    :: Jalankan k6
    k6 run -e TYPE=%%s --out csv=Reports\CSV\report_%%s.csv test-script.js
    
    :: Jeda untuk membiarkan k6 menulis file sepenuhnya
    timeout /t 2 >nul
    
    :: 3. Pindahkan file dengan paksa jika ditemukan
    if exist summary_%%s.html (
        move /y summary_%%s.html Reports\HTML\Laporan_%%s.html >nul
        echo [OK] HTML Report Moved. [cite: 2]
    )
    if exist summary_%%s.json (
        move /y summary_%%s.json Reports\JSON\data_%%s.json >nul
        echo [OK] JSON Report Moved. [cite: 2]
    )
    
    echo ------------------------------------------ [cite: 3]
)

echo SEMUA PENGUJIAN SELESAI!
pause