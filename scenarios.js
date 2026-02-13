/**
 * Konfigurasi Skenario dan Ambang Batas Pengujian
 * Lokasi: scenarios.js
 */

export const getScenarios = (type) => {
    const scenarios = {
        // 1. PERFORMANCE: Mengukur kecepatan dasar (baseline)
        performance: { 
            vus: 1, 
            duration: '30s' 
        },

        // 2. LOAD: Simulasi trafik harian normal yang stabil
        load: [
            { duration: '30s', target: 20 },
            { duration: '1m', target: 20 },
            { duration: '30s', target: 0 },
        ],

        // 3. STRESS: Mencari titik batas maksimal sistem (Breaking Point)
        stress: [
            { duration: '1m', target: 20 },
            { duration: '1m', target: 50 },
            { duration: '1m', target: 80 },
            { duration: '1m', target: 100 },
            { duration: '1m', target: 0 },
        ],

        // 4. SPIKE: Menguji ketahanan terhadap lonjakan trafik mendadak
        spike: [
            { duration: '10s', target: 10 },
            { duration: '30s', target: 100 },
            { duration: '1m', target: 100 },
            { duration: '30s', target: 0 },
        ],

        // 5. ENDURANCE: Menguji stabilitas dalam jangka waktu panjang
        endurance: { 
            vus: 15, 
            duration: '10m' 
        },

        // 6. SCALABILITY: Mengukur efisiensi penambahan beban secara bertahap
        scalability: [
            { duration: '1m', target: 10 },
            { duration: '1m', target: 20 },
            { duration: '1m', target: 40 },
            { duration: '1m', target: 80 },
        ],
    };

    return scenarios[type] || scenarios.performance;
};

export const getThresholds = (type) => {
    const thresholds = {
        performance: {
            http_req_duration: 500, // Target ideal < 500ms
            http_req_failed: 0.05,  // Maksimal error 1%
        },
        load: {
            http_req_duration: 1000, // Batas toleransi 1 detik
            http_req_failed: 0.05,
        },
        stress: {
            http_req_duration: 2000, // Toleransi beban puncak
            http_req_failed: 0.05,   // Toleransi error 5%
        },
        spike: {
            http_req_duration: 3000, // Toleransi lonjakan ekstrim
            http_req_failed: 0.10,   // Toleransi error 10%
        },
        endurance: {
            http_req_duration: 1200, // Kompensasi akumulasi data
            http_req_failed: 0.01,
        },
        scalability: {
            http_req_duration: 1500,
            http_req_failed: 0.02,
        },
    };

    return thresholds[type] || thresholds.performance;
};