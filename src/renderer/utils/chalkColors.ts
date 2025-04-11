// chalkColors.ts - A comprehensive set of chalk color utility functions
import chalk from 'chalk';

// Foreground colors (fc prefix)
export function fcBlack(text: string): string { return chalk.black(text); }
export function fcRed(text: string): string { return chalk.red(text); }
export function fcGreen(text: string): string { return chalk.green(text); }
export function fcYellow(text: string): string { return chalk.yellow(text); }
export function fcBlue(text: string): string { return chalk.blue(text); }
export function fcMagenta(text: string): string { return chalk.magenta(text); }
export function fcCyan(text: string): string { return chalk.cyan(text); }
export function fcWhite(text: string): string { return chalk.white(text); }
export function fcGray(text: string): string { return chalk.gray(text); }
export function fcGrey(text: string): string { return chalk.grey(text); }

// Bright foreground colors
export function fcBrightRed(text: string): string { return chalk.redBright(text); }
export function fcBrightGreen(text: string): string { return chalk.greenBright(text); }
export function fcBrightYellow(text: string): string { return chalk.yellowBright(text); }
export function fcBrightBlue(text: string): string { return chalk.blueBright(text); }
export function fcBrightMagenta(text: string): string { return chalk.magentaBright(text); }
export function fcBrightCyan(text: string): string { return chalk.cyanBright(text); }
export function fcBrightWhite(text: string): string { return chalk.whiteBright(text); }

// Background colors (bc prefix)
export function bcBlack(text: string): string { return chalk.bgBlack(text); }
export function bcRed(text: string): string { return chalk.bgRed(text); }
export function bcGreen(text: string): string { return chalk.bgGreen(text); }
export function bcYellow(text: string): string { return chalk.bgYellow(text); }
export function bcBlue(text: string): string { return chalk.bgBlue(text); }
export function bcMagenta(text: string): string { return chalk.bgMagenta(text); }
export function bcCyan(text: string): string { return chalk.bgCyan(text); }
export function bcWhite(text: string): string { return chalk.bgWhite(text); }

// Bright background colors
export function bcBrightBlack(text: string): string { return chalk.bgBlackBright(text); }
export function bcBrightRed(text: string): string { return chalk.bgRedBright(text); }
export function bcBrightGreen(text: string): string { return chalk.bgGreenBright(text); }
export function bcBrightYellow(text: string): string { return chalk.bgYellowBright(text); }
export function bcBrightBlue(text: string): string { return chalk.bgBlueBright(text); }
export function bcBrightMagenta(text: string): string { return chalk.bgMagentaBright(text); }
export function bcBrightCyan(text: string): string { return chalk.bgCyanBright(text); }
export function bcBrightWhite(text: string): string { return chalk.bgWhiteBright(text); }

// Text styles
export function bold(text: string): string { return chalk.bold(text); }
export function dim(text: string): string { return chalk.dim(text); }
export function italic(text: string): string { return chalk.italic(text); }
export function underline(text: string): string { return chalk.underline(text); }
export function inverse(text: string): string { return chalk.inverse(text); }
export function hidden(text: string): string { return chalk.hidden(text); }
export function strikethrough(text: string): string { return chalk.strikethrough(text); }

// Combined formats - common combinations
export function fcyb(text: string): string { return chalk.yellow.bold(text); }  // Yellow bold
export function fcrb(text: string): string { return chalk.red.bold(text); }     // Red bold
export function fcgb(text: string): string { return chalk.green.bold(text); }   // Green bold
export function fcbb(text: string): string { return chalk.blue.bold(text); }    // Blue bold
export function fcmb(text: string): string { return chalk.magenta.bold(text); } // Magenta bold
export function fccb(text: string): string { return chalk.cyan.bold(text); }    // Cyan bold

// RGB and Hex color support
export function rgb(r: number, g: number, b: number, text: string): string {
  return chalk.rgb(r, g, b)(text);
}

export function hex(hexColor: string, text: string): string {
  return chalk.hex(hexColor)(text);
}

// Special purpose formatters
export function success(text: string): string { return chalk.green.bold(text); }
export function warning(text: string): string { return chalk.yellow.bold(text); }
export function error(text: string): string { return chalk.red.bold(text); }
export function info(text: string): string { return chalk.blue.bold(text); }
export function highlight(text: string): string { return chalk.bgYellow.black(text); }

// Re-export some formatters from the Formatting class for convenience
export { Formatting } from './formatting';

// Named exports with descriptive aliases
export const F = {
  black: fcBlack,
  red: fcRed,
  green: fcGreen,
  yellow: fcYellow,
  blue: fcBlue,
  magenta: fcMagenta,
  cyan: fcCyan,
  white: fcWhite,
  gray: fcGray,
  grey: fcGrey,

  // Bright colors
  brightRed: fcBrightRed,
  brightGreen: fcBrightGreen,
  brightYellow: fcBrightYellow,
  brightBlue: fcBrightBlue,
  brightMagenta: fcBrightMagenta,
  brightCyan: fcBrightCyan,
  brightWhite: fcBrightWhite,

  // Background colors
  bgBlack: bcBlack,
  bgRed: bcRed,
  bgGreen: bcGreen,
  bgYellow: bcYellow,
  bgBlue: bcBlue,
  bgMagenta: bcMagenta,
  bgCyan: bcCyan,
  bgWhite: bcWhite,

  // Bright backgrounds
  bgBrightBlack: bcBrightBlack,
  bgBrightRed: bcBrightRed,
  bgBrightGreen: bcBrightGreen,
  bgBrightYellow: bcBrightYellow,
  bgBrightBlue: bcBrightBlue,
  bgBrightMagenta: bcBrightMagenta,
  bgBrightCyan: bcBrightCyan,
  bgBrightWhite: bcBrightWhite,

  // Styles
  bold,
  dim,
  italic,
  underline,
  inverse,
  hidden,
  strikethrough,

  // Combined formats
  yb: fcyb,      // Yellow bold
  rb: fcrb,      // Red bold
  gb: fcgb,      // Green bold
  bb: fcbb,      // Blue bold
  mb: fcmb,      // Magenta bold
  cb: fccb,      // Cyan bold

  // Special formatters
  success,
  warning,
  error,
  info,
  highlight,

  // Color builders
  rgb,
  hex
};

// Default export
export default F;