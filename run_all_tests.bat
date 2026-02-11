@echo off
setlocal enabledelayedexpansion

:: 1. Buat struktur folder jika belum ada
if not exist "Reports\html" mkdir "Reports\html"
if not exist "Reports\csv" mkdir "Reports\scv"
if not exist "Reports\json" mkdir "Reports\json"

echo Starting Pushmit Automated Suite...

:: Daftar skenario yang akan dijalankan
set scenarios=performance load stress spike endurance scalability

for %%s in (%scenarios%) do (
    echo Running %%s test...
    
    :: Jalankan k6 dengan output CSV
    k6 run -e TYPE=%%s --out csv=Reports\CSV\report_%%s.csv test-script.js
    
    :: Pindahkan file HTML dan JSON yang dihasilkan k6 ke folder masing-masing
    if exist summary_%%s.html (
        move /y summary_%%s.html Reports\HTML\Laporan_%%s.html >nul
    )
    if exist summary_%%s.json (
        move /y summary_%%s.json Reports\JSON\data_%%s.json >nul
    )
    
    echo %%s test completed.
    echo --------------------------------------
)

echo All tests finished! Check the "Reports" folder.
pause