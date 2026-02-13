export const CONFIG = {
    targetUrl: 'https://fastingmate.my.id/dashboard',
    // Daftar endpoint baru yang diminta
    endpoints: [
        '/dashboard',
        '/fasting-debts',
        '/fidyah',
        '/fasting-plans',
        '/blog',
        '/quran',
        '/ibadah/dzikir-pagi',
        '/documentation',
        '/profile'
    ],
    requireAuth: true,
    authDetails: {
        loginUrl: 'https://fastingmate.my.id/login',
        baseUrl: 'https://fastingmate.my.id', // Base URL untuk mempermudah join path
        credentials: { 
            username: 'bassist.oke@gmail.com', 
            password: 'asdf0987' 
        }
    },
};