// rollup.config.mjs (Note the .mjs extension)
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import css from 'rollup-plugin-import-css';
import copy from 'rollup-plugin-copy';
import copyWatch from 'rollup-plugin-copy-watch';

const isWatch = process.env.ROLLUP_WATCH === 'true';
const production = false;

// Use copy-watch in watch mode, regular copy in build mode
const copyPlugin = isWatch ? copyWatch : copy;

// --- Main Process Bundle ---
export const main = {
    input: ['src/main/main.ts'],
    output: {
        dir: 'dist/main',
        format: 'cjs', // Keep CJS for main
        sourcemap: !production ? 'inline' : false,
        entryFileNames: '[name].js',
    },
    plugins: [
        resolve({ preferBuiltins: true }),
        commonjs(),
        json(),
        typescript({
            // Specify the tsconfig for main
            tsconfig: './tsconfig.base.json',
            sourceMap: !production,
            inlineSources: !production,
            compilerOptions: {
                noEmit: false,
                module: 'esnext',
                lib: ['ESNext'],
                target: 'es6',
                outDir: './dist/main',
                moduleResolution: 'node',
                rootDir: './src',
            },
            include: ['main/**/*.ts', 'shared/**/*.ts'],
            exclude: [
                'devinspectx/**',
                'renderer/**',
                'preload/**',
                'src/devinspectx/**',
                'src/renderer/**',
                'src/preload/**',
            ],
        }),
        production && terser(),
    ],
    external: ['electron'],
};

// --- Renderer Process Bundle ---
export const renderer = {
    input: 'src/renderer/main.ts',
    output: {
        file: 'dist/renderer/bundle.js',
        format: 'es',
        sourcemap: true,
        globals: {
            'plotly.js': 'Plotly',
            'chart.js': 'ChartJs',
        },
    },
    plugins: [
        resolve({ browser: true, preferBuiltins: false }),
        commonjs(),
        css(),
        json(),
        typescript({
            // Specify the tsconfig for the renderer
            tsconfig: './tsconfig.base.json',
            sourceMap: !production,
            inlineSources: !production,
            compilerOptions: {
                noEmit: false,
                module: 'esnext',
                lib: ['ESNext', 'DOM', 'DOM.Iterable'],
                target: 'ES2020',
                outDir: './dist/renderer',
                moduleResolution: 'node',
                rootDir: './src',
            },
            include: ['renderer/**/*.ts', 'shared/**/*.ts'],
            exclude: ['node_modules', 'dist', 'release', 'src/devinspectx/**'],
        }),
        copyPlugin({
            targets: [
                {
                    src: 'assets/index.html',
                    dest: 'dist/renderer',
                },
                {
                    src: 'assets/styles.css',
                    dest: 'dist/renderer',
                },
                {
                    src: 'assets/configs/*.{json,yml,yaml}',
                    dest: 'dist/renderer/assets/configs',
                },
                {
                    src: 'assets/sounds/*.wav',
                    dest: 'dist/renderer/assets/sounds',
                },
                {
                    src: 'assets/worlds/**/*.{glb,gltf}',
                    dest: 'dist/renderer/assets/worlds',
                },
                {
                    src: 'assets/skins/**/*.{glb,gltf}',
                    dest: 'dist/renderer/assets/skins',
                },
                // Extensions directory if needed
                {
                    src: 'assets/extensions/**/*.crx',
                    dest: 'dist/renderer/assets/extensions',
                },
                {
                    src: 'node_modules/stats.js/build/stats.min.js',
                    dest: 'dist/renderer/libs',
                },
            ],
            // This specifies that the copy plugin should run its tasks after the bundle has been written to the output directory
            hook: 'writeBundle',
            watch: 'assets',
        }),
        production && terser(),
    ],
    watch: {
        clearScreen: false,
    },
    external: ['plotly.js', 'ChartJs'],
};

// --- Preload Script Bundle ---
export const preload = {
    input: 'src/preload/preload.ts',
    output: {
        file: 'dist/preload/preload.js',
        format: 'cjs', // Keep CJS for preload
        sourcemap: !production ? 'inline' : false,
    },
    plugins: [
        resolve(),
        commonjs(),
        typescript({
            // Specify the tsconfig for preload
            tsconfig: './tsconfig.base.json',
            sourceMap: !production,
            inlineSources: !production,
            compilerOptions: {
                noEmit: false,
                module: 'esnext',
                lib: ['ESNext', 'DOM'],
                target: 'ES2020',
                outDir: './dist/preload',
                moduleResolution: 'node',
                rootDir: './src',
            },
            include: ['preload/**/*.ts', 'shared/**/*.ts'],
            exclude: ['node_modules', 'dist', 'release', 'renderer/**'],
        }),
        production && terser(),
    ],
    external: ['electron'],
};

// --- Inspector/DevTools Extension Bundle ---
export const inspector = {
    input: {
        'index': 'src/devinspectx/index.ts',
        'background': 'src/devinspectx/extension/background.ts',
        'content-script': 'src/devinspectx/extension/content-script.ts',
        'bridge': 'src/devinspectx/extension/bridge.ts',
        'devtools': 'src/devinspectx/extension/devtools.ts',
    },
    output: {
        dir: 'dist/devinspectx',
        format: 'es',
        sourcemap: true,
    },
    plugins: [
        // Ensure we use the browser versions of dependencies
        // and properly handle the browser environment
        resolve({
            browser: true,
            preferBuiltins: false,
        }),
        commonjs(),
        json(),
        css(),
        typescript({
            tsconfig: './tsconfig.base.json',
            sourceMap: !production,
            inlineSources: !production,
            compilerOptions: {
                // Browser-specific options for the extension
                noEmit: false,
                module: 'esnext',
                moduleResolution: 'node',
                target: 'ES2020',
                outDir: './dist/devinspectx',
                rootDir: './src',
                // Critical options for browser environment
                lib: ['ESNext', 'DOM', 'DOM.Iterable'],
                skipLibCheck: true,
                strictFunctionTypes: false,
            },
            // Include both the source files and our types reference file
            include: [
                'devinspectx/**/*.ts',
                'devinspectx/types/*.d.ts',
            ],
            // typeRoots: ["./node_modules/@types", "./src/inspector/types"]
        }),
        copyPlugin({
            targets: [
                // Extension manifest
                {
                    src: 'src/devinspectx/extension/manifest.json',
                    dest: 'dist/devinspectx',
                },
                // HTML files
                {
                    src: 'src/devinspectx/extension/*.html',
                    dest: 'dist/devinspectx',
                },
                {
                    src: 'src/devinspectx/extension/panel/*.html',
                    dest: 'dist/devinspectx/panel',
                },
                // CSS files
                {
                    src: 'src/devinspectx/extension/panel/*.css',
                    dest: 'dist/devinspectx/panel',
                },
                // JavaScript files that should not be processed by rollup
                {
                    src: 'src/devinspectx/extension/panel/*.js',
                    dest: 'dist/devinspectx/panel',
                },
                // Icons
                {
                    src: 'assets/devinspectx/icons/*',
                    dest: 'dist/devinspectx/icons',
                },
            ],
            hook: 'writeBundle',
            watch: 'src/devinspectx',
        }),
        production && terser(),
    ],
    // The chrome API is external
    external: ['chrome'],
    watch: {
        clearScreen: false,
    },
};

const configMap = { main, renderer, preload, inspector };
export default [main, renderer, preload, inspector];
