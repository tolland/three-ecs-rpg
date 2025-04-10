// jest.config.js
/** @type {import('ts-jest').JestConfigWithTsJest} */
// @TODO it seems to be ignoring the attempt to ignore the node_modules folder
module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'],
    modulePaths: ['<rootDir>/src'],
    moduleDirectories: ["src", "node_modules"],
    transformIgnorePatterns: [
        '/node_modules/(?!(three|three/examples/jsm)/)', // Transform three and its examples
    ],
    moduleNameMapper: {
      '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
      '^@ecs/(.*)$': '<rootDir>/src/renderer/ecs/$1',
      '^@components/(.*)$': '<rootDir>/src/renderer/ecs/components/$1',
      '^@core/(.*)$': '<rootDir>/src/renderer/core/$1',
      '^@setup/(.*)$': '<rootDir>/src/renderer/setup/$1',
      '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true,
            tsconfig: 'tsconfig.json',
        }],
        '^.+\\.js$': ['babel-jest', {
            presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
            plugins: [
                '@babel/plugin-transform-modules-commonjs',
                '@babel/plugin-transform-runtime'
            ],
        }],
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
};
