export const CONFIG = {
    targetUrl: 'https://qonaah.luqni.my.id/dashboard',
    requireAuth: true, // SET KE FALSE JIKA WEBSITE TIDAK BUTUH LOGIN
    authDetails: {
        loginUrl: 'https://qonaah.luqni.my.id/login',
        credentials: { 
            username: 'bassist.oke@gmail.com', 
            password: 'asdf0987' 
        }
    },
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
    }
};