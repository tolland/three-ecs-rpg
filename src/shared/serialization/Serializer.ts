import 'reflect-metadata';
import { three_replacer } from './three_replacer';
import {
    JsonObject,
    JsonValue,
    Replacer,
    SerializationContext,
} from '@shared/types/serialization';

export namespace Serializer {
    // Define more specific types for serialization metadata
    export interface SerializeMetadata<T, K extends keyof T = keyof T> {
        key: K;
        serializer?: TypeSerializer<T[K]>;
        outputKey?: string;
    }

    export interface TypeSerializer<T> {
        serialize: (value: T) => JsonValue;
        deserialize?: (value: JsonValue) => T;
    }

    export interface SerializeOptions<T> {
        serializer?: TypeSerializer<T>;
        outputKey?: string;
    }

    export function Serialize<T>(options: SerializeOptions<T> = {}) {
        return function (target: object, propertyKey: string | symbol) {
            const constructor = target?.constructor;
            if (!constructor) {
                console.warn(
                    'Serialize decorator: Could not find constructor for property',
                    propertyKey,
                );
                return;
            }

            if (!Reflect.hasMetadata('serializable', constructor)) {
                Reflect.defineMetadata('serializable', [], constructor);
            }

            const properties = Reflect.getMetadata(
                'serializable',
                constructor,
            ) as Array<SerializeMetadata<T>>;

            properties.push({
                key: propertyKey as keyof T,
                serializer: options.serializer as
                    | TypeSerializer<T[keyof T]>
                    | undefined,
                outputKey: options.outputKey,
            });
            Reflect.defineMetadata('serializable', properties, constructor);
        };
    }

    // Built-in type serializers
    const mapSerializer: TypeSerializer<
        Map<string | number | symbol, unknown>
    > = {
        serialize: (map: Map<string | number | symbol, unknown>) => {
            const result: Record<string, JsonValue> = {};
            map.forEach((value, key) => {
                result[String(key)] = serialize(
                    value,
                    { mode: 'full', depth: 0 },
                    [three_replacer],
                );
            });
            return result;
        },
        deserialize: (value: JsonValue) => {
            const map = new Map<string, unknown>();
            if (typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([k, v]) => {
                    map.set(k, v);
                });
            }
            return map;
        },
    };

    const setSerializer: TypeSerializer<Set<unknown>> = {
        serialize: (set: Set<unknown>) =>
            Array.from(set).map((item) =>
                serialize(item, { mode: 'full', depth: 0 }, [three_replacer]),
            ),
        deserialize: (value: JsonValue) => {
            if (Array.isArray(value)) {
                return new Set(
                    value.map((item) =>
                        deserialize(item, Object, { mode: 'full', depth: 0 }),
                    ),
                );
            }
            return new Set<unknown>();
        },
    };

    export function serialize<T>(
        value: T,
        context: SerializationContext = { mode: 'full', depth: 0 },
        replacers: Replacer[] = [three_replacer],
    ): JsonValue {
        if (value === null || value === undefined) {
            return value as JsonValue;
        }

        // Apply replacers first
        for (const replacer of replacers) {
            const replaced = replacer('', value);
            if (replaced !== value) {
                return replaced as JsonValue;
            }
        }

        // Handle primitive values
        if (typeof value !== 'object') {
            return value as JsonValue;
        }

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map((item) => serialize(item, context, replacers));
        }

        // Handle special types
        if (value instanceof Map) {
            return mapSerializer.serialize(value);
        }
        if (value instanceof Set) {
            return setSerializer.serialize(value);
        }

        // Handle objects and class instances
        const result: JsonObject = {};
        if (value.constructor && value.constructor !== Object) {
            // For class instances, use metadata
            const properties: SerializeMetadata<T>[] =
                (Reflect.getMetadata(
                    'serializable',
                    value.constructor,
                ) as Array<SerializeMetadata<T>>) || [];
            for (const { key, serializer, outputKey } of properties) {
                const propValue = (value as T)[key as keyof T];
                const targetKey = outputKey || String(key);
                if (serializer) {
                    result[targetKey] = serializer.serialize(propValue);
                } else {
                    result[targetKey] = serialize(
                        propValue,
                        context,
                        replacers,
                    );
                }
            }
        } else {
            // For plain objects, serialize all properties
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    result[key] = serialize(
                        (value as Record<string, unknown>)[key],
                        context,
                        replacers,
                    );
                }
            }
        }

        return result;
    }

    export function deserialize<T>(
        value: JsonValue,
        targetClass: new (...args: unknown[]) => T,
        context: SerializationContext = { mode: 'full', depth: 0 },
    ): T {
        if (value === null || value === undefined) {
            return value as T;
        }

        // Handle primitive values
        if (typeof value !== 'object') {
            return value as T;
        }

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map((item) =>
                deserialize(item, targetClass, context),
            ) as T;
        }

        // Handle special types
        if (targetClass === (Map as unknown)) {
            return mapSerializer.deserialize!(value) as T;
        }
        if (targetClass === (Set as unknown)) {
            return setSerializer.deserialize!(value) as T;
        }

        // Handle objects and class instances
        const instance = new targetClass();
        const properties =
            (Reflect.getMetadata('serializable', targetClass) as Array<
                SerializeMetadata<T>
            >) || [];

        //const propValue = (value as T)[key as keyof T];

        for (const { key, serializer, outputKey } of properties) {
            const lookupKey = outputKey || String(key);
            const propValue = (value as Record<string, JsonValue>)[lookupKey];
            if (propValue !== undefined) {
                if (serializer?.deserialize) {
                    (instance as Record<string | symbol, unknown>)[
                        key as string | symbol
                    ] = serializer.deserialize(propValue);
                } else {
                    (instance as Record<string | symbol, unknown>)[
                        key as string | symbol
                    ] = deserialize(propValue, Object, context);
                }
            }
        }

        return instance;
    }

    export function serializeToJSON<T>(
        value: T,
        context: SerializationContext = { mode: 'full', depth: 0 },
        replacers: Replacer[] = [three_replacer],
    ): string {
        return JSON.stringify(serialize(value, context, replacers));
    }
}
