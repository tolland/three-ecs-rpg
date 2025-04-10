import * as THREE from 'three';
import chalk from 'chalk';
import { JsonValue } from '@shared/types/serialization';

export class Formatting {
    static fVec3(vector3: THREE.Vector3): string {
        return `(${vector3.x.toFixed(3)},${vector3.y.toFixed(3)},${vector3.z.toFixed(3)})`;
    }
    static dp3(value: number): string {
        return value.toFixed(3);
    }
}

/**
 * Utility to serialize JSON-like types for console.log with color.
 * @param value - The JSON-like value to serialize.
 * @returns A string with colorized JSON output.
 */
export function serializeForConsole(value: JsonValue): string {
    try {
        const jsonString = JSON.stringify(value, null, 2);
        return jsonString
            .replace(/"(.*?)":/g, chalk.blue('"$1":')) // Keys in blue
            .replace(/: "(.*?)"/g, chalk.green(': "$1"')) // String values in green
            .replace(/: (\d+)/g, chalk.yellow(': $1')) // Numbers in yellow
            .replace(/: (true|false)/g, chalk.magenta(': $1')) // Booleans in magenta
            .replace(/: null/g, chalk.gray(': null')); // Null in gray
    } catch (error) {
        console.error(chalk.red('Failed to serialize value:'), error);
        return chalk.red('Serialization error');
    }
}
