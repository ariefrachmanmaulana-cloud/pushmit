import http from 'k6/http';
import { sleep, check } from 'k6';
import { CONFIG } from './config.js';
import { getScenarios } from './scenarios.js';

export const options = {
    stages: Array.isArray(getScenarios(__ENV.TYPE)) ? getScenarios(__ENV.TYPE) : undefined,
    vus: !Array.isArray(getScenarios(__ENV.TYPE)) ? getScenarios(__ENV.TYPE).vus : undefined,
    duration: !Array.isArray(getScenarios(__ENV.TYPE)) ? getScenarios(__ENV.TYPE).duration : undefined,
    
    // Konfigurasi aman untuk semua versi k6
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
};

// SETUP: Menangani login jika CONFIG.requireAuth bernilai true
export function setup() {
    if (CONFIG.requireAuth) {
        const payload = JSON.stringify(CONFIG.authDetails.credentials);
        const params = { headers: { 'Content-Type': 'application/json' } };
        const res = http.post(CONFIG.authDetails.loginUrl, payload, params);
        
        const loginOk = check(res, { 'Login Berhasil': (r) => r.status === 200 });
        // Mengirim data cookies ke fungsi default
        return { cookies: res.cookies, loggedIn: loginOk };
    }
    return { loggedIn: false };
}

export default function (data) {
    // Jika login diperlukan, sertakan cookies dalam request
    const params = data.loggedIn ? { cookies: data.cookies } : {};
    const res = http.get(CONFIG.targetUrl, params);
    
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
}

export function handleSummary(data) {
    const getMetric = (val, suffix = " ms") => {
        return (val !== undefined && val !== null) ? val.toFixed(2) + suffix : "N/A";
    };

    const successRateNum = (data.metrics.checks.values.passes / (data.metrics.checks.values.passes + data.metrics.checks.values.fails) * 100) || 0;
    const successRate = getMetric(successRateNum, "%");
    const avgRes = getMetric(data.metrics.http_req_duration.values.avg);
    const p95Res = getMetric(data.metrics.http_req_duration.values['p(95)']);
    const maxRes = getMetric(data.metrics.http_req_duration.values.max);
    const totalReq = data.metrics.http_reqs.values.count;
    const maxVus = data.metrics.vus ? data.metrics.vus.values.max : data.metrics.vus_max.values.max;
    const date = new Date().toLocaleString();

    // Logika Status
    const isSuccess = successRateNum >= 95;
    const statusLabel = isSuccess ? "✅ SISTEM STABIL" : "⚠️ PERLU ANALISA";
    const statusBg = isSuccess ? "#27ae60" : "#e74c3c";
    const statusColor = isSuccess ? "#27ae60" : "#e74c3c";

    let specificRows = "";
    const sc = getScenarios(__ENV.TYPE);
    const testDuration = (typeof sc === 'object' && sc.duration) ? sc.duration : "Berdasarkan Tahapan";

    // Tabel Tahapan (Stages)
    let stagesInfo = "";
    if (Array.isArray(sc)) {
        stagesInfo = `
        <div class="detail-section">
            <h2>📈 Detail Tahapan Pengujian (Stages)</h2>
            <table>
                <thead>
                    <tr><th>Fase Ke-</th><th>Durasi</th><th>Target User</th></tr>
                </thead>
                <tbody>
                    ${sc.map((s, i) => `<tr><td>Fase ${i + 1}</td><td>${s.duration}</td><td>${s.target} VUs</td></tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }

    // Penentuan Baris Spesifik berdasarkan Mode
    switch (__ENV.TYPE) {
        case 'performance':
            specificRows = `<tr><td><b>Min Latency</b></td><td>${getMetric(data.metrics.http_req_duration.values.min)}</td><td>Respon tercepat sistem.</td></tr>`;
            break;
        case 'load':
            specificRows = `<tr><td><b>Median Respon</b></td><td>${getMetric(data.metrics.http_req_duration.values.med)}</td><td>Nilai tengah kecepatan.</td></tr>`;
            break;
        case 'stress':
            specificRows = `<tr><td><b>Error Rate</b></td><td style="color:#e74c3c; font-weight:bold;">${getMetric(100 - successRateNum, "%")}</td><td>Tingkat kegagalan beban puncak.</td></tr>`;
            break;
        case 'spike':
            specificRows = `<tr><td><b>P99 Latency</b></td><td style="color:#e74c3c; font-weight:bold;">${getMetric(data.metrics.http_req_duration.values['p(99)'])}</td><td>Respon 1% user paling lambat.</td></tr>`;
            break;
        case 'endurance':
            specificRows = `<tr><td><b>Stability (P95)</b></td><td>${p95Res}</td><td>Konsistensi performa jangka panjang.</td></tr>`;
            break;
        case 'scalability':
            const runDuration = data.state.testRunDurationMs || 1000;
            const rps = totalReq / (runDuration / 1000);
            specificRows = `<tr><td><b>Throughput</b></td><td>${getMetric(rps, " RPS")}</td><td>Request per detik.</td></tr>`;
            break;
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #f4f7f6; padding: 40px; color: #000; }
            .container { max-width: 900px; margin: auto; background: white; padding: 40px; border-radius: 15px; border: 1px solid #ddd; position: relative; }
            .status-banner { position: absolute; top: 20px; right: 40px; background: ${statusBg}; color: white; padding: 8px 20px; border-radius: 5px; font-weight: bold; font-size: 13px; }
            .header { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #000; text-transform: uppercase; font-size: 24px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 30px; }
            .card { background: #fff; padding: 15px; border: 1px solid #eee; text-align: center; }
            .card h3 { margin: 0; font-size: 11px; color: #555; text-transform: uppercase; }
            .card p { margin: 8px 0 0; font-size: 18px; font-weight: bold; color: #000; }
            .detail-section { margin-top: 30px; }
            .detail-section h2 { font-size: 16px; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 15px; color: #000; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f9f9f9; text-align: left; padding: 10px; font-size: 12px; border: 1px solid #ddd; color: #000; }
            td { padding: 10px; border: 1px solid #ddd; font-size: 13px; color: #000; }
            .footer { margin-top: 50px; text-align: center; color: #777; font-size: 11px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status-banner">${statusLabel}</div>
            <div class="header">
                <h1>${__ENV.TYPE.toUpperCase()} TEST REPORT</h1>
                <p style="margin: 5px 0 0; color: #000;">Target: ${CONFIG.targetUrl} (Auth: ${CONFIG.requireAuth ? 'YES' : 'NO'})</p>
                <small>📅 ${date} | ⏱️ Konfigurasi: ${testDuration}</small>
            </div>
            
            <div class="grid">
                <div class="card"><h3>Peak VUs</h3><p>${maxVus}</p></div>
                <div class="card"><h3>Success Rate</h3><p style="color: ${statusColor};">${successRate}</p></div>
                <div class="card"><h3>Avg Latency</h3><p>${avgRes}</p></div>
                <div class="card"><h3>Total Req</h3><p>${totalReq}</p></div>
            </div>

            ${stagesInfo}

            <div class="detail-section">
                <h2>📊 Statistik Kecepatan Khusus</h2>
                <table>
                    <thead><tr><th>Metrik</th><th>Hasil</th><th>Keterangan</th></tr></thead>
                    <tbody>
                        ${specificRows}
                        <tr><td><b>P95 Latency</b></td><td>${p95Res}</td><td>Standar mayoritas user.</td></tr>
                        <tr><td><b>Max Latency</b></td><td>${maxRes}</td><td>Respon terlama.</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="footer">Dibuat otomatis oleh Pushmit (Push to The Limit) &bull; Analis: Arief Rachman Maulana &bull; Mode: ${__ENV.TYPE}</div>
        </div>
    </body>
    </html>`;

    return {
        [`summary_${__ENV.TYPE}.html`]: html,
        [`summary_${__ENV.TYPE}.json`]: JSON.stringify(data),
    };
}