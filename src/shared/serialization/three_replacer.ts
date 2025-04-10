// Custom replacer for complex types (like THREE objects)
import * as THREE from 'three';
import { Replacer } from '@shared/types/serialization';

export const three_replacer: Replacer = (key, value) => {
    if (value instanceof THREE.Vector4) {
        return { x: value.x, y: value.y, z: value.z, w: value.w };
    }
    if (value instanceof THREE.Vector3) {
        return { x: value.x, y: value.y, z: value.z };
    }
    if (value instanceof THREE.Vector2) {
        return { x: value.x, y: value.y };
    }
    if (value instanceof THREE.PerspectiveCamera) {
        return {
            fov: value.fov,
            aspect: value.aspect,
            near: value.near,
            far: value.far,
            position: {
                x: value.position.x,
                y: value.position.y,
                z: value.position.z,
            },
            rotation: {
                x: value.rotation.x,
                y: value.rotation.y,
                z: value.rotation.z,
            },
        };
    }
    if (value instanceof THREE.Quaternion) {
        return { x: value.x, y: value.y, z: value.z, w: value.w };
    }
    if (value instanceof THREE.Euler) {
        return {
            x: value.x,
            y: value.y,
            z: value.z,
            order: value.order,
        };
    }
    if (value instanceof THREE.Color) {
        return value.getHexString(); // Represent color as hex string
    }
    if (value instanceof THREE.Object3D) {
        // Avoid serializing entire scene graph nodes!
        return `[Object3D: ${value.name || value.type} ID:${value.id}]`;
    }

    // Add more handlers for other complex types if needed
    return value; // Keep other values as they are
};
