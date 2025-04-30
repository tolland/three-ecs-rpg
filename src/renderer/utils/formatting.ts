import * as THREE from 'three';
import chalk from 'chalk';

export class Formatting {
    static fVec3(vector3: THREE.Vector3): string {
        return `(${vector3.x.toFixed(3)},${vector3.y.toFixed(3)},${vector3.z.toFixed(3)})`;
    }
    static dp3(value: number): string {
        return value.toFixed(3);
    }
}

export function fc(value: string): string {
    return chalk.yellow(value);
}
