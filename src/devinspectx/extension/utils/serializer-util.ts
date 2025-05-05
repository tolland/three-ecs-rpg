/**
 * Utility for safely serializing objects for transmission between contexts
 */



import { SceneNodeInfo } from '@devinspectx/types/message-dto-types';

/**
 * Maximum depth for object serialization to prevent circular references and overly large objects
 */
export const DEFAULT_MAX_DEPTH = 5;

/**
 * Options for serialization
 */
export interface SerializerOptions {
    maxDepth?: number;
    includePrivate?: boolean; // Include properties starting with _
    includeFunctions?: boolean; // Include function names (not implementations)
    includeSymbols?: boolean; // Include symbol keys
    includeFalsey?: boolean;
}

/**
 * Default serializer options
 */
const DEFAULT_OPTIONS: SerializerOptions = {
    maxDepth: DEFAULT_MAX_DEPTH,
    includePrivate: false,
    includeFunctions: false,
    includeSymbols: false,
    includeFalsey: true,
};

/**
 * Safely serializes objects for transmission, handling Three.js specific types
 * and preventing circular references
 */
export class Serializer {
    /**
     * Serialize an object to a plain JSON-compatible structure
     */
    static serialize(
        obj: any,
        options: SerializerOptions = DEFAULT_OPTIONS,
        depth = 0,
    ): any {
        const { maxDepth, includePrivate, includeFunctions, includeSymbols } = {
            ...DEFAULT_OPTIONS,
            ...options,
        };

        // Handle null and undefined
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle primitive types
        if (typeof obj !== 'object' && typeof obj !== 'function') {
            return obj;
        }

        // Prevent circular references and overly deep objects
        if (depth > maxDepth!) {
            return '[MaxDepth]';
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map((item) => this.serialize(item, options, depth + 1));
        }

        // Handle dates
        if (obj instanceof Date) {
            return {
                __type: 'Date',
                value: obj.toISOString(),
            };
        }

        // Handle Three.js specific types
        if (obj.isVector2) {
            return {
                __type: 'Vector2',
                x: obj.x,
                y: obj.y,
            };
        }

        if (obj.isVector3) {
            return {
                __type: 'Vector3',
                x: obj.x,
                y: obj.y,
                z: obj.z,
            };
        }

        if (obj.isEuler) {
            return {
                __type: 'Euler',
                x: obj.x,
                y: obj.y,
                z: obj.z,
                order: obj.order,
            };
        }

        if (obj.isQuaternion) {
            return {
                __type: 'Quaternion',
                x: obj.x,
                y: obj.y,
                z: obj.z,
                w: obj.w,
            };
        }

        if (obj.isMatrix4) {
            return {
                __type: 'Matrix4',
                elements: [...obj.elements],
            };
        }

        if (obj.isMatrix3) {
            return {
                __type: 'Matrix3',
                elements: [...obj.elements],
            };
        }

        if (obj.isColor) {
            return {
                __type: 'Color',
                r: obj.r,
                g: obj.g,
                b: obj.b,
            };
        }

        // Handle specially for Three.js Object3D objects
        if (
            obj.type &&
            typeof obj.uuid === 'string' &&
            typeof obj.isObject3D !== 'undefined'
        ) {
            const result: SceneNodeInfo = {
                uuid: obj.uuid,
                name: obj.name || '',
                type: obj.type,
                visible: !!obj.visible,
                childCount: Array.isArray(obj.children)
                    ? obj.children.length
                    : 0,
            };

            // Add position, rotation, scale if they exist
            if (obj.position) {
                result.position = {
                    x: obj.position.x,
                    y: obj.position.y,
                    z: obj.position.z,
                };
            }

            if (obj.rotation) {
                result.rotation = {
                    x: obj.rotation.x,
                    y: obj.rotation.y,
                    z: obj.rotation.z,
                    order: obj.rotation.order,
                };
            }

            if (obj.scale) {
                result.scale = {
                    x: obj.scale.x,
                    y: obj.scale.y,
                    z: obj.scale.z,
                };
            }

            return result;
        }

        // Handle Maps and Sets
        if (obj instanceof Map) {
            return {
                __type: 'Map',
                value: Array.from(obj.entries()).map(([k, v]) => [
                    this.serialize(k, options, depth + 1),
                    this.serialize(v, options, depth + 1),
                ]),
            };
        }

        if (obj instanceof Set) {
            return {
                __type: 'Set',
                value: Array.from(obj).map((item) =>
                    this.serialize(item, options, depth + 1),
                ),
            };
        }

        // Handle regular objects
        const result: Record<string, any> = {};

        // Get all property keys, including symbols if requested
        const keys = [
            ...Object.getOwnPropertyNames(obj),
            ...(includeSymbols ? Object.getOwnPropertySymbols(obj) : []),
        ];

        for (const key of keys) {
            const stringKey = key.toString();

            // Skip private properties if not requested
            if (!includePrivate && stringKey.startsWith('_')) {
                continue;
            }

            try {
                const value = obj[key];

                // Handle functions
                if (typeof value === 'function') {
                    if (includeFunctions) {
                        result[stringKey] =
                            `[Function: ${value.name || 'anonymous'}]`;
                    }
                    continue;
                }

                // Serialize the value
                result[stringKey] = this.serialize(value, options, depth + 1);
            } catch (e) {
                // Handle errors gracefully
                result[stringKey] =
                    `[Error: ${e instanceof Error ? e.message : 'Unknown error'}]`;
            }
        }

        return result;
    }

    /**
     * Safely convert an object to JSON string
     */
    static toJSON(
        obj: any,
        options: SerializerOptions = DEFAULT_OPTIONS,
    ): string {
        try {
            const serialized = this.serialize(obj, options);
            return JSON.stringify(serialized);
        } catch (e) {
            return JSON.stringify({
                __error: e instanceof Error ? e.message : 'Unknown error',
            });
        }
    }
}
