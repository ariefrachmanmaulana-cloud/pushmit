export const getScenarios = (type) => {
    const scenarios = {
        performance: { vus: 1, duration: '30s' }, // Ditambah ke 30 detik agar baseline stabil
        load: { vus: 10, duration: '1m' },        // Minimal 1 menit untuk melihat beban normal
        stress: [
            { duration: '30s', target: 20 },      // Ramp-up
            { duration: '1m', target: 20 },       // Stay di beban tinggi
            { duration: '30s', target: 0 },       // Ramp-down
        ],
        spike: [
            { duration: '20s', target: 50 },      // Lonjakan cepat
            { duration: '1m', target: 50 },       // TAHAN di puncak (Kunci agar P99 keluar)
            { duration: '20s', target: 0 },       // Penurunan
        ],
        endurance: { vus: 5, duration: '5m' },    // Minimal 5 menit untuk melihat gejala Memory Leak/Std Dev
        scalability: [
            { duration: '1m', target: 5 },
            { duration: '1m', target: 15 },
            { duration: '1m', target: 30 },
        ],
    };

    return scenarios[type] || scenarios.performance;
};