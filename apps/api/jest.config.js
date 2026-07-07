/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: String.raw`.*\.spec\.ts$`,
  transform: {
    [String.raw`^.+\.(t|j)s$`]: 'ts-jest',
  },
  // packages/shared uses ESM-style ".js" specifiers for its own .ts files
  // (required for tsc/Vite's ESM resolution) — map them back to extensionless
  // so ts-jest's CommonJS resolution finds the .ts sources.
  moduleNameMapper: {
    [String.raw`^(\.{1,2}/.*)\.js$`]: '$1',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
};
