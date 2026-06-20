module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    setupFiles: ['<rootDir>/__tests__/setup.js'],
    testTimeout: 10000,
    collectCoverageFrom: [
        'controllers/**/*.js',
        'middleware/**/*.js',
        '!**/node_modules/**',
    ],
};
