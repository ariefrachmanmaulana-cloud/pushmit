import http from 'k6/http';
import { sleep, check } from 'k6';
import { CONFIG } from './config.js';
import { getScenarios, getThresholds } from './scenarios.js';

// KONFIGURASI PENGUJIAN
export const options = {
    stages: Array.isArray(getScenarios(__ENV.TYPE)) ? getScenarios(__ENV.TYPE) : undefined,
    vus: !Array.isArray(getScenarios(__ENV.TYPE)) ? getScenarios(__ENV.TYPE).vus : undefined,
    duration: !Array.isArray(getScenarios(__ENV.TYPE)) ? getScenarios(__ENV.TYPE).duration : undefined,
    thresholds: {
        'http_req_duration': [`p(95)<${getThresholds(__ENV.TYPE).http_req_duration}`],
        'http_req_failed': [`rate<${getThresholds(__ENV.TYPE).http_req_failed}`],
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
};

// TAHAP PERSIAPAN (AUTH)
export function setup() {
    if (CONFIG.requireAuth) {
        const payload = JSON.stringify(CONFIG.authDetails.credentials);
        const params = { headers: { 'Content-Type': 'application/json' } };
        const res = http.post(CONFIG.authDetails.loginUrl, payload, params);
        return { cookies: res.cookies, loggedIn: res.status === 200 };
    }
    return { loggedIn: false };
}

// SKENARIO EKSEKUSI UTAMA
export default function (data) {
    const params = data.loggedIn ? { cookies: data.cookies } : {};
    const res = http.get(CONFIG.targetUrl, params);
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
}

// PENGOLAHAN LAPORAN AKHIR
export function handleSummary(data) {
    const type = __ENV.TYPE || 'performance';
    const thresholds = getThresholds(type);
    const limit = thresholds.http_req_duration; // Mengambil limit durasi dari scenarios.js
    const typeTitle = type.charAt(0).toUpperCase() + type.slice(1);
    const targetUrl = CONFIG.targetUrl;

    // --- TAMBAHAN INFORMASI AUTH ---
    const authStatus = CONFIG.requireAuth ? "Yes" : "No";

    // 1. DURASI PENGUJIAN & TABEL SKENARIO
    const scenarioDef = getScenarios(type);
    let displayDuration = "";
    let stageTableRows = "";

    if (Array.isArray(scenarioDef)) {
        const totalSeconds = scenarioDef.reduce((acc, stage) => {
            let durationStr = stage.duration;
            let value = parseInt(durationStr);
            return acc + (durationStr.includes('m') ? value * 60 : value);
        }, 0);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        displayDuration = mins > 0 ? `${mins} Menit ${secs} Detik` : `${secs} Detik`;
        
        stageTableRows = scenarioDef.map((s, i) => `
            <tr>
                <td>Iteration ${i + 1}</td>
                <td>${s.duration}</td>
                <td>${s.target} VUs</td>
            </tr>
        `).join('');
    } else {
        displayDuration = scenarioDef.duration.replace('s', ' Detik').replace('m', ' Menit');
    }

    // 2. KALKULASI METRIK UTAMA
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const avg = data.metrics.http_req_duration.values.avg;
    const min = data.metrics.http_req_duration.values.min;
    const max = data.metrics.http_req_duration.values.max;
    const successRate = (data.metrics.checks.values.passes / (data.metrics.checks.values.passes + data.metrics.checks.values.fails) * 100) || 0;
    const totalRequests = data.metrics.http_reqs.values.count;
    const rps = (totalRequests / (data.state.testRunDurationMs / 1000)).toFixed(2);
    const dataMB = (data.metrics.data_received.values.count / (1024 * 1024)).toFixed(2);
    
    // Status Kelulusan Berdasarkan Threshold dan Success Rate
    const isSuccess = p95 <= limit && successRate >= 95;

    // 3. ANALISA TEMUAN & REKOMENDASI
    let riskMitigationContent = "";
    if (!isSuccess) {
        riskMitigationContent = `
        <div style="margin-top: 25px; border: 1px solid #e74c3c; border-radius: 8px; overflow: hidden;">
            <div style="background: #e74c3c; color: white; padding: 12px; font-weight: bold;">⚠️ TEST FINDINGS & RECOMMENDATIONS</div>
            <div style="padding: 15px; background: #fff; font-size: 13px; line-height: 1.6;">
                <p style="margin-top: 0;">Sistem terindikasi mengalami degradasi performa saat pengujian <b>${typeTitle}</b> dilakukan. Latensi P95 menyentuh angka <b>${p95.toFixed(0)}ms</b>, melampaui batas SLA <b>${limit}ms</b>.</p>
                <table style="border: none; margin-top: 10px; width: 100%;">
                    <tr style="background: #fdf2f2;">
                        <td style="width: 50%; border: 1px solid #fadad7; padding: 10px;"><b>Kemungkinan Penyebab:</b></td>
                        <td style="width: 50%; border: 1px solid #fadad7; padding: 10px;"><b>Langkah Perbaikan:</b></td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #eee; vertical-align: top; padding: 10px;">
                            <ul style="padding-left: 20px; margin: 0;">
                                <li>Beban pemrosesan data tidak efisien pada endpoint dashboard.</li>
                                <li>Keterbatasan sumber daya CPU/RAM pada server target.</li>
                            </ul>
                        </td>
                        <td style="border: 1px solid #eee; vertical-align: top; padding: 10px;">
                            <ul style="padding-left: 20px; margin: 0;">
                                <li>Optimasi query database atau efisiensi logika kode.</li>
                                <li>Penerapan mekanisne caching untuk data statis.</li>
                            </ul>
                        </td>
                    </tr>
                </table>
            </div>
        </div>`;
    } else {
        riskMitigationContent = `
        <div style="margin-top: 25px; border: 1px solid #27ae60; border-radius: 8px; overflow: hidden;">
            <div style="background: #27ae60; color: white; padding: 12px; font-weight: bold;">✅ PERFORMANCE SUMMARY</div>
            <div style="padding: 15px; background: #fff; font-size: 13px;">
                Secara keseluruhan, sistem berada dalam kondisi stabil. Tidak ditemukan kendala performa berarti saat melayani <b>${totalRequests} permintaan</b>.
            </div>
        </div>`;
    }

    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f0f2f5; padding: 20px; color: #333; }
            .container { max-width: 850px; margin: auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { border-bottom: 2px solid #eee; padding-bottom: 20px; position: relative; }
            .status { position: absolute; top: 0; right: 0; background: ${isSuccess ? '#27ae60' : '#e74c3c'}; color: #fff; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 13px; }
            .meta-info { margin-top: 10px; font-size: 13px; color: #666; line-height: 1.6; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 25px 0; }
            .card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #eee; }
            .card small { font-size: 10px; color: #777; text-transform: uppercase; display: block; margin-bottom: 5px; font-weight: bold; }
            h3 { font-size: 16px; margin-top: 25px; border-left: 4px solid #3498db; padding-left: 10px; color: #2c3e50; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; padding: 12px; background: #f8f9fa; border-bottom: 2px solid #eee; font-size: 11px; color: #7f8c8d; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 12px; }
            .failed { color: #e74c3c; font-weight: bold; }
            .success { color: #27ae60; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0;">Test Report: ${typeTitle}</h2>
                <div class="meta-info">
                    🔐 <b>Auth:</b> ${authStatus}<br>
                    🌐 <b>Target URL:</b> ${targetUrl}<br>
                    ⏱️ <b>Duration:</b> ${displayDuration} | 📅 ${new Date().toLocaleString('id-ID')}
                </div>
                <div class="status">${isSuccess ? "TEST PASSED" : "TEST FAILED"}</div>
            </div>

            <div class="grid">
                <div class="card"><small>Max VUs</small><div><b>${data.metrics.vus ? data.metrics.vus.values.max : data.metrics.vus_max.values.max} Users</b></div></div>
                <div class="card"><small>Success Rate</small><div class="${successRate < 95 ? 'failed' : 'success'}"><b>${successRate.toFixed(1)}%</b></div></div>
                <div class="card"><small>Avg Latency</small><div><b>${avg.toFixed(0)} ms</b></div></div>
                <div class="card"><small>Total Requests</small><div><b>${totalRequests}</b></div></div>
            </div>

            ${riskMitigationContent}

            ${stageTableRows ? `
            <h3>🪜 Test Scenarios (Stages)</h3>
            <table>
                <thead><tr><th>Sequence</th><th>Duration</th><th>Load Target</th></tr></thead>
                <tbody>${stageTableRows}</tbody>
            </table>` : ''}

            <h3>📊 Key Performance Indicators</h3>
            <table>
                <thead>
                    <tr><th>Parameter</th><th>Actual Results</th><th>SLA/Threshold</th><th>Analysis</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><b>P95 Latency</b></td>
                        <td class="${p95 > limit ? 'failed' : 'success'}">${p95.toFixed(0)} ms</td>
                        <td>${limit} ms</td>
                        <td>${p95 > limit ? 'SLA Breached' : 'Within Limits'}</td>
                    </tr>
                    <tr>
                        <td><b>Throughput (RPS)</b></td>
                        <td><b>${rps} req/s</b></td>
                        <td>N/A</td>
                        <td>Kapasitas proses per detik.</td>
                    </tr>
                    <tr>
                        <td><b>Data Transfer</b></td>
                        <td>${dataMB} MB</td>
                        <td>N/A</td>
                        <td>Total volume data.</td>
                    </tr>
                </tbody>
            </table>
            
            <div style="text-align: center; margin-top: 40px; font-size: 10px; color: #bbb;">
                Pushmit Performance Analytics System
            </div>
        </div>
    </body>
    </html>`;

    return {
        [`summary_${type}.html`]: html,
        [`summary_${type}.json`]: JSON.stringify(data),
    };
}