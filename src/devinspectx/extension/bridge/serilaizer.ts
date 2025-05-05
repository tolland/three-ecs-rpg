

// Define the serializer directly in this file since it will be injected as a standalone script
export const serializeObject = (obj: any, depth = 0, maxDepth = 3): any => {
    // Handle null and undefined
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle primitive types
    if (typeof obj !== 'object' && typeof obj !== 'function') {
        return obj;
    }

    // Prevent circular references and too deep objects
    if (depth > maxDepth) {
        return '[MaxDepth]';
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map((item) => serializeObject(item, depth + 1, maxDepth));
    }

    // Handle dates
    if (obj instanceof Date) {
        return { __type: 'Date', value: obj.toISOString() };
    }

    // Handle Three.js specific types
    if (obj.isVector2) {
        return { __type: 'Vector2', x: obj.x, y: obj.y };
    }

    if (obj.isVector3) {
        return { __type: 'Vector3', x: obj.x, y: obj.y, z: obj.z };
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
        return { __type: 'Quaternion', x: obj.x, y: obj.y, z: obj.z, w: obj.w };
    }

    if (obj.isMatrix4) {
        return { __type: 'Matrix4', elements: [...obj.elements] };
    }

    if (obj.isMatrix3) {
        return { __type: 'Matrix3', elements: [...obj.elements] };
    }

    if (obj.isColor) {
        return { __type: 'Color', r: obj.r, g: obj.g, b: obj.b };
    }

    // Handle Three.js Object3D objects
    if (
        obj.type &&
        typeof obj.uuid === 'string' &&
        typeof obj.isObject3D !== 'undefined'
    ) {
        const result: any = {
            uuid: obj.uuid,
            name: obj.name || '',
            type: obj.type,
            visible: !!obj.visible,
            childCount: Array.isArray(obj.children) ? obj.children.length : 0,
        };

        // Add position, rotation, scale if available
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

    // Handle special ECS components
    if (obj && obj.constructor && obj.constructor.name === 'Component') {
        return {
            __type: 'Component',
            componentType: obj.constructor.name,
            data: serializeObject(obj, depth + 1, maxDepth),
        };
    }

    // Handle Maps and Sets
    if (obj instanceof Map) {
        return {
            __type: 'Map',
            value: Array.from(obj.entries()).map(([k, v]) => [
                serializeObject(k, depth + 1, maxDepth),
                serializeObject(v, depth + 1, maxDepth),
            ]),
        };
    }

    if (obj instanceof Set) {
        return {
            __type: 'Set',
            value: Array.from(obj).map((item) =>
                serializeObject(item, depth + 1, maxDepth),
            ),
        };
    }

    // Handle regular objects
    const result: Record<string, any> = {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Skip private properties starting with underscore
            if (key.startsWith('_')) continue;

            try {
                const value = obj[key];

                // Skip functions
                if (typeof value === 'function') continue;

                // Serialize the value
                result[key] = serializeObject(value, depth + 1, maxDepth);
            } catch (e) {
                // Handle errors during serialization
                const errorMsg =
                    e instanceof Error ? e.message : 'Unknown error';
                result[key] = `[Error: ${errorMsg}]`;
            }
        }
    }

    return result;
};
