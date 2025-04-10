export type SerializationMode = 'full' | 'state' | 'summary';

export type SerializationContext = {
    mode: SerializationMode;
    depth: number;
    maxDepth?: number;
};

export type Replacer = (key: string, value: any) => any;

// JSON primitive types
export type JsonPrimitive = string | number | boolean | null;

// JSON array can contain any valid JSON value
export interface JsonArray extends Array<JsonValue> {}

// JSON object maps strings to any valid JSON value
export interface JsonObject {
    [key: string]: JsonValue;
}

// Any valid JSON value
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/** A valid JSON document must be either an object or an array at the root
 * This object represents a JSON document that can be serialized. It is also useful for other types for serialization such as yaml as well.
 */
export type JsonDocument = JsonObject | JsonArray;


