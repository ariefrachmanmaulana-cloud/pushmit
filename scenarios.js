export const getScenarios = (type) => {
    const scenarios = {
        performance: { vus: 5, duration: '30s' },
        load: { vus: 10, duration: '20s' },
        stress: [
            { duration: '30s', target: 20 },
            { duration: '1m', target: 20 },
            { duration: '30s', target: 0 },
        ],
        spike: [
            { duration: '20s', target: 50 },
            { duration: '1m', target: 50 },
            { duration: '20s', target: 0 },
        ],
        endurance: { vus: 5, duration: '2m' },
        scalability: [
            { duration: '1m', target: 5 },
            { duration: '1m', target: 15 },
            { duration: '1m', target: 30 },
        ],
    };
    return scenarios[type] || scenarios.performance;
};