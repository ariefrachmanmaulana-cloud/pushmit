export const CONFIG = {
    targetUrl: 'https://japantrips.id',
    requireAuth: false,
    authDetails: {
        loginUrl: 'https://qonaah.luqni.my.id/login',
        credentials: { 
            username: 'bassist.oke@gmail.com', 
            password: 'asdf0987' 
        }
    },
    // AMBANG BATAS: Jika hasil melewati angka ini, laporan otomatis berubah status
    thresholds: {
        performance: { http_req_duration: 10000,  http_req_failed: 0.01 },
        load:        { http_req_duration: 10000,  http_req_failed: 0.01 },
        stress:      { http_req_duration: 10000, http_req_failed: 0.05 },
        spike:       { http_req_duration: 10000, http_req_failed: 0.10 },
        endurance:   { http_req_duration: 10000,  http_req_failed: 0.01 },
        scalability: { http_req_duration: 10000, http_req_failed: 0.05 },
    }
};