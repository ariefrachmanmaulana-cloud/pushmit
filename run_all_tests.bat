@echo off
setlocal enabledelayedexpansion

:: 1. HAPUS DAN BUAT ULANG STRUKTUR FOLDER (UNTUK MEMASTIKAN BERSIH)
if exist "Reports" rd /s /q "Reports"
mkdir "Reports\HTML"
mkdir "Reports\CSV"
mkdir "Reports\JSON"

echo ==========================================
echo Starting Pushmit Automated Suite...
echo ==========================================

:: 2. BERSIHKAN FILE SISA DI ROOT
del summary_*.html >nul 2>&1
del summary_*.json >nul 2>&1

set scenarios=performance load stress spike endurance scalability

for %%s in (%scenarios%) do (
    echo [RUNNING] %%s test...
    
    :: 3. EKSEKUSI K6 DENGAN PATH YANG DISESUAIKAN (UPPERCASE)
    k6 run -e TYPE=%%s --out csv=Reports\CSV\report_%%s.csv test-script.js
    
    timeout /t 1 >nul
    
    :: 4. PEMINDAHAN HASIL KE FOLDER YANG TEPAT
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