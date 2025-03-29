// rollup.config.mjs (Note the .mjs extension)
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

const production = !process.env.ROLLUP_WATCH;

export default [
    // --- Renderer Process Bundle ---
    {
        input: 'src/renderer/main.ts',
        output: {
            file: 'dist/renderer/bundle.js',
            format: 'es',
            sourcemap: !production ? 'inline' : false,
        },
        plugins: [
            resolve({ browser: true }),
            commonjs(),
            typescript({ // Specify the tsconfig for the renderer
                tsconfig: './tsconfig.renderer.json',
                sourceMap: !production,
                inlineSources: !production,
            }),
            copy({
                targets: [
                    { src: 'src/renderer/index.html', dest: 'dist/renderer' },
                    { src: 'src/renderer/styles.css', dest: 'dist/renderer' },
                    { src: 'src/assets/**/*', dest: 'dist/renderer/assets' }
                ],
                hook: 'writeBundle'
            }),
            production && terser(),
        ],
        watch: {
            clearScreen: false,
        }
    },
    // --- Main Process Bundle ---
    {
        input: 'src/main/main.ts',
        output: {
            file: 'dist/main/main.js',
            format: 'cjs', // Keep CJS for main
            sourcemap: !production ? 'inline' : false,
        },
        plugins: [
            resolve({ preferBuiltins: true }),
            commonjs(),
            typescript({ // Specify the tsconfig for main
                tsconfig: './tsconfig.main.json',
                sourceMap: !production,
                inlineSources: !production,
            }),
            production && terser(),
        ],
        external: ['electron'],
    },
    // --- Preload Script Bundle ---
    {
        input: 'src/preload/preload.ts',
        output: {
            file: 'dist/preload/preload.js',
            format: 'cjs', // Keep CJS for preload
            sourcemap: !production ? 'inline' : false,
        },
        plugins: [
            resolve(),
            commonjs(),
            typescript({ // Specify the tsconfig for preload
                tsconfig: './tsconfig.preload.json',
                sourceMap: !production,
                inlineSources: !production,
            }),
            production && terser(),
        ],
        external: ['electron'],
    },
];