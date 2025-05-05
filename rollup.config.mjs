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
        sourcemapPathTransform: (relativeSourcePath) => {
            // If the path starts with "../../../src", fix it by removing one "../"
            if (relativeSourcePath.startsWith('../../../src')) {
                return relativeSourcePath.replace('../../../src', '../../src');
            }
            return relativeSourcePath;
        },
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
                rootDir: 'src',
                sourceRoot: '.',
            },
            include: ['main/**/*.ts', 'shared/**/*.ts'],
            // seems like this is ignored, is probably only useful to build a selective
            // include list. because if something references something in the these
            // files they get loaded anyway, so don't serve the intuitive purpose.
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
        sourcemapPathTransform: (relativeSourcePath) => {
            // If the path starts with "../../../src", fix it by removing one "../"
            if (relativeSourcePath.startsWith('../../../src')) {
                return relativeSourcePath.replace('../../../src', '../../src');
            }
            return relativeSourcePath;
        },
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
                sourceRoot: '.',
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
                // {
                //     src: 'assets/extensions/**/*.crx',
                //     dest: 'dist/renderer/assets/extensions',
                // },
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
        sourcemapPathTransform: (relativeSourcePath) => {
            // If the path starts with "../../../src", fix it by removing one "../"
            if (relativeSourcePath.startsWith('../../../src')) {
                return relativeSourcePath.replace('../../../src', '../../src');
            }
            return relativeSourcePath;
        },
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
                sourceRoot: '.',
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
        background: 'src/devinspectx/extension/service_worker/background.ts',
        'devtools/devtools': 'src/devinspectx/extension/devtools/devtools.ts',
        'panel/panel': 'src/devinspectx/extension/panel/panel.ts',
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
                'shared/**/*.ts',
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
                {
                    src: 'src/devinspectx/extension/devtools/*.html',
                    dest: 'dist/devinspectx/devtools',
                },
                {
                    src: 'src/devinspectx/extension/devtools/*.css',
                    dest: 'dist/devinspectx/devtools',
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

// --- Inspector/DevTools content_script Bundle ---
export const content_script = {
    input: {
        'content-script': 'src/devinspectx/extension/content_script/index.ts',
    },
    output: {
        dir: 'dist/devinspectx',
        format: 'iife',
        sourcemap: true,
        name: '_',
        entryFileNames: '[name].js',
    },
    plugins: [
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
                'shared/**/*.ts',
            ],
            // typeRoots: ["./node_modules/@types", "./src/inspector/types"]
        }),
        production && terser(),
    ],
    // The chrome API is external
    external: ['chrome'],
    watch: {
        clearScreen: false,
    },
};

// --- Inspector/DevTools bridge_script Bundle ---
export const bridge_script = {
    input: {
        'bridge/bridge': 'src/devinspectx/extension/bridge/bridge.ts',
    },
    output: {
        dir: 'dist/devinspectx',
        format: 'iife',
        sourcemap: true,
        name: '_',
        entryFileNames: '[name].js',
    },
    plugins: [
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
            include: ['devinspectx/**/*.ts', 'shared/**/*.ts'],
            // typeRoots: ["./node_modules/@types", "./src/inspector/types"]
        }),
        production && terser(),
    ],
    watch: {
        clearScreen: false,
    },
};

const configMap = {
    bridge_script,
    content_script,
    main,
    renderer,
    preload,
    inspector,
};
export default [
    bridge_script,
    content_script,
    main,
    renderer,
    preload,
    inspector,
];
