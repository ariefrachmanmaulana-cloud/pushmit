import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { CONFIG } from './config.js';
import { getScenarios, getThresholds } from './scenarios.js';

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

export function setup() {
    if (CONFIG.requireAuth) {
        const payload = JSON.stringify(CONFIG.authDetails.credentials);
        const params = { headers: { 'Content-Type': 'application/json' } };
        const res = http.post(CONFIG.authDetails.loginUrl, payload, params);
        
        const loggedIn = res.status === 200 || res.status === 201;
        return { cookies: res.cookies, loggedIn: loggedIn };
    }
    return { loggedIn: false };
}

export default function (data) {
    const params = data.loggedIn ? { cookies: data.cookies } : {};
    
    const endpointIndex = __ITER % CONFIG.endpoints.length;
    const path = CONFIG.endpoints[endpointIndex];
    const fullUrl = `${CONFIG.authDetails.baseUrl || ''}${path}`;

    group(path, function () {
        const res = http.get(fullUrl, params);
        check(res, {
            'status is 200': (r) => r.status === 200,
        });
    });

    sleep(1);
}

export function handleSummary(data) {
    const type = __ENV.TYPE || 'performance';
    const thresholds = getThresholds(type);
    const limit = thresholds.http_req_duration;
    const typeTitle = type.charAt(0).toUpperCase() + type.slice(1);
    const targetUrl = CONFIG.authDetails.baseUrl || CONFIG.targetUrl;
    const authStatus = CONFIG.requireAuth ? "Yes" : "No";

    // 1. HITUNG ULANG TOTAL DARI GROUPS AGAR SINKRON
    let endpointRows = "";
    let totalPasses = 0;
    let totalFails = 0;
    const groups = data.root_group.groups;
    
    groups.forEach((grp) => {
        if (grp.name === 'setup') return;

        const passes = grp.checks.reduce((acc, c) => acc + c.passes, 0);
        const fails = grp.checks.reduce((acc, c) => acc + c.fails, 0);
        
        totalPasses += passes;
        totalFails += fails;
        
        const total = passes + fails;
        const sRate = total > 0 ? ((passes / total) * 100).toFixed(1) : 0;
        
        endpointRows += `
            <tr>
                <td style="font-family: monospace; color: #2980b9;">${grp.name}</td>
                <td>${passes}</td>
                <td class="${fails > 0 ? 'failed' : ''}">${fails}</td>
                <td><b class="${sRate < 95 ? 'failed' : 'success'}">${sRate}%</b></td>
            </tr>`;
    });

    // 2. KALKULASI METRIK UTAMA
    const p95 = data.metrics.http_req_duration.values['p(95)'];
    const avg = data.metrics.http_req_duration.values.avg;
    const totalRequests = totalPasses + totalFails;
    const successRate = totalRequests > 0 ? (totalPasses / totalRequests * 100) : 0;
    const rps = (totalRequests / (data.state.testRunDurationMs / 1000)).toFixed(2);
    const isSuccess = p95 <= limit && successRate >= 95;

    // 3. LOGIKA DINAMIS KEY PERFORMANCE INDICATORS (KPI)
    let kpiRows = `
        <tr><td><b>P95 Latency</b></td><td class="${p95 > limit ? 'failed' : 'success'}">${p95.toFixed(0)} ms</td><td>${limit} ms</td><td>${p95 > limit ? 'Breached' : 'OK'}</td></tr>
        <tr><td><b>Throughput</b></td><td><b>${rps} req/s</b></td><td>N/A</td><td>-</td></tr>
    `;

    if (type === 'stress' || type === 'spike') {
        const failRate = data.metrics.http_req_failed.values.rate * 100;
        kpiRows += `<tr><td><b>Error Rate</b></td><td class="${failRate > (thresholds.http_req_failed * 100) ? 'failed' : 'success'}">${failRate.toFixed(2)}%</td><td>${(thresholds.http_req_failed * 100)}%</td><td>Resilience Check</td></tr>`;
    } else if (type === 'endurance') {
        const dataReceived = (data.metrics.data_received.values.count / (1024 * 1024)).toFixed(2);
        kpiRows += `<tr><td><b>Data Transferred</b></td><td>${dataReceived} MB</td><td>N/A</td><td>Stability Check</td></tr>`;
    }else if (type === 'scalability') {
        const maxVusValue = data.metrics.vus ? data.metrics.vus.values.max : (data.metrics.vus_max ? data.metrics.vus_max.values.max : 'N/A');
        kpiRows += `<tr><td><b>Max Concurrent VUs</b></td><td><b>${maxVusValue} VUs</b></td><td>N/A</td><td>Scaling Limit</td></tr>`;
    }

    // 4. PERFORMANCE SUMMARY (RISK MITIGATION)
    let riskMitigationContent = isSuccess ? `
        <div style="margin-top: 25px; border: 1px solid #27ae60; border-radius: 8px; overflow: hidden;">
            <div style="background: #27ae60; color: white; padding: 12px; font-weight: bold;">✅ PERFORMANCE SUMMARY</div>
            <div style="padding: 15px; background: #fff; font-size: 13px;">
                Sistem stabil. Data menunjukkan total <b>${totalRequests} request</b> pada endpoint target berhasil ditangani dengan baik tanpa kendala performa berarti.
            </div>
        </div>` : `
        <div style="margin-top: 25px; border: 1px solid #e74c3c; border-radius: 8px; overflow: hidden;">
            <div style="background: #e74c3c; color: white; padding: 12px; font-weight: bold;">⚠️ TEST FINDINGS & RECOMMENDATIONS</div>
            <div style="padding: 15px; background: #fff; font-size: 13px; line-height: 1.6;">
                <p>Terjadi degradasi performa pada tipe <b>${typeTitle}</b>. P95 Latency <b>${p95.toFixed(0)}ms</b> melampaui batas toleransi <b>${limit}ms</b>.</p>
            </div>
        </div>`;

    // 5. SKENARIO & DURASI
    const scenarioDef = getScenarios(type);
    let displayDuration = "";
    let stageTableRows = "";

    if (Array.isArray(scenarioDef)) {
        const totalSeconds = scenarioDef.reduce((acc, stage) => {
            let durationStr = stage.duration;
            let value = parseInt(durationStr);
            return acc + (durationStr.includes('m') ? value * 60 : value);
        }, 0);
        displayDuration = `${Math.floor(totalSeconds / 60)} Menit ${totalSeconds % 60} Detik`;
        stageTableRows = scenarioDef.map((s, i) => `<tr><td>Iteration ${i + 1}</td><td>${s.duration}</td><td>${s.target} VUs</td></tr>`).join('');
    } else {
        displayDuration = scenarioDef.duration.replace('s', ' Detik').replace('m', ' Menit');
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
                    🔐 <b>Auth:</b> ${authStatus} | 🌐 <b>Host:</b> ${targetUrl}<br>
                    ⏱️ <b>Duration:</b> ${displayDuration} | 📅 ${new Date().toLocaleString('id-ID')}
                </div>
                <div class="status">${isSuccess ? "TEST PASSED" : "TEST FAILED"}</div>
            </div>

            <div class="grid">
                <div class="card"><small>Max VUs</small><div><b>${data.metrics.vus ? data.metrics.vus.values.max : data.metrics.vus_max.values.max}</b></div></div>
                <div class="card"><small>Success Rate</small><div class="${successRate < 95 ? 'failed' : 'success'}"><b>${successRate.toFixed(1)}%</b></div></div>
                <div class="card"><small>Avg Latency</small><div><b>${avg.toFixed(0)} ms</b></div></div>
                <div class="card"><small>Total Requests</small><div><b>${totalRequests}</b></div></div>
            </div>

            ${riskMitigationContent}

            <h3>📍 Endpoint Specific Details</h3>
            <table>
                <thead>
                    <tr><th>Path</th><th>Passed</th><th>Failed</th><th>Success Rate</th></tr>
                </thead>
                <tbody>${endpointRows}</tbody>
            </table>

            ${stageTableRows ? `<h3>🪜 Test Scenarios</h3><table><thead><tr><th>Sequence</th><th>Duration</th><th>Target</th></tr></thead><tbody>${stageTableRows}</tbody></table>` : ''}

            <h3>📊 Key Performance Indicators</h3>
            <table>
                <thead><tr><th>Parameter</th><th>Actual Results</th><th>Threshold</th><th>Analysis</th></tr></thead>
                <tbody>
                    ${kpiRows}
                </tbody>
            </table>
        </div>
    </body>
    </html>`;

    return {
        [`summary_${type}.html`]: html,
        [`summary_${type}.json`]: JSON.stringify(data),
    };
}