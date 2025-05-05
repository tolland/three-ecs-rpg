


export function reloadElectronOnChanges(){

// Enable hot reload for development
// @TODO this is not working properly
// if (process.env.NODE_ENV === 'development') {
//     console.log('Development mode detected. Enabling hot reload.');
//     try {
//         require('electron-reloader')(__dirname, {
//             electron: require(`${__dirname}/../../node_modules/electron`),
//             // hardResetMethod: 'exit'
//             paths: [
//                 `${__dirname}/dist/main/**/*`,
//                 "dist/renderer/**/*",
//                 "dist/preload/**/*",
//             ]
//         });
//         console.log('Hot reload enabled');
//     } catch (error) {
//         console.log('Hot reload error:', error);
//     }
// }
}
