// rollup.config.mjs (Note the .mjs extension)
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';
import json from "@rollup/plugin-json";

// const production = !process.env.ROLLUP_WATCH;
const production = false;

export default [
    // --- Main Process Bundle ---
    {
        input: [
            'src/main/main.ts',
        ],
        output: {
            dir: 'dist/main',
            format: 'cjs', // Keep CJS for main
            sourcemap: !production ? 'inline' : false,
            preserveModules: true,
            preserveModulesRoot: 'src/main',
            entryFileNames: '[name].js',
        },
        plugins: [
            resolve({preferBuiltins: true}),
            commonjs(),
            json(),
            typescript({ // Specify the tsconfig for main
                tsconfig: './tsconfig.base.json',
                sourceMap: !production,
                inlineSources: !production,
                compilerOptions: {
                    noEmit: false,
                    module: "esnext",
                    lib: ["ESNext"],
                    target: "es6",
                    outDir: "./dist/main",
                    moduleResolution: "node",
                    rootDir: "./src",
                },
                include: [
                    "main/**/*.ts",
                    "shared/**/*.ts"
                ],
                exclude: [
                    "node_modules",
                    "dist",
                    "release",
                    "src/renderer"
                ]
            }),
            production && terser(),
        ],
        external: ['electron'],
    },
    // --- Renderer Process Bundle ---
    {
        input: 'src/renderer/main.ts',
        output: {
            file: 'dist/renderer/bundle.js',
            format: 'es',
            sourcemap: true,
        },
        plugins: [
            resolve({browser: true}),
            commonjs(),
            typescript({ // Specify the tsconfig for the renderer
                tsconfig: './tsconfig.base.json',
                sourceMap: !production,
                inlineSources: !production,
                compilerOptions: {
                    noEmit: false,
                    module: "esnext",
                    lib: ["ESNext", "DOM", "DOM.Iterable"],
                    target: "ES2020",
                    outDir: "./dist/renderer",
                    moduleResolution: "node",
                    rootDir: "./src",
                },
                include: [
                    "renderer/**/*.ts",
                    "shared/**/*.ts"
                ]
            }),
            copy({
                targets: [
                    {src: 'src/renderer/index.html', dest: 'dist/renderer'},
                    {src: 'src/renderer/styles.css', dest: 'dist/renderer'},
                    {src: 'src/assets/**/*', dest: 'dist/renderer/assets'}
                ],
                hook: 'writeBundle'
            }),
            production && terser(),
        ],
        watch: {
            clearScreen: false,
        }
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
                tsconfig: './tsconfig.base.json',
                sourceMap: !production,
                inlineSources: !production,
                compilerOptions: {
                    noEmit: false,
                    module: "esnext",
                    lib: ["ESNext", "DOM"],
                    target: "ES2020",
                    outDir: "./dist/preload",
                    moduleResolution: "node",
                    rootDir: "./src",
                },
                include: [
                    "preload/**/*.ts",
                    "shared/**/*.ts",
                ]
            }),
            production && terser(),
        ],
        external: ['electron'],
    },
];