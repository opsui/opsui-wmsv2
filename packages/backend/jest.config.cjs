module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?@opsui/shared)',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/db/**',
    '!src/test/**',
    '!src/platforms/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 65,
      statements: 65,
    },
    './src/services/': {
      branches: 60,
      functions: 70,
      lines: 75,
      statements: 75,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock the entire @opsui/shared package for Jest
    '^@opsui/shared$': '<rootDir>/__mocks__/@opsui/shared.ts',
  },
  // Enable verbose output
  verbose: false,
  // Clear mocks between tests
  clearMocks: true,
  // Reset modules between tests
  resetModules: false,
  // Restore mocks after each test
  restoreMocks: true,
};
