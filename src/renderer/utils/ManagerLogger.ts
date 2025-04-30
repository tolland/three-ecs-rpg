// src/renderer/utils/ManagerLogger.ts

/**
 * Configuration for manager logging
 */
export const ManagerLoggingConfig = {
    /** Main toggle for enabling/disable all manager logging */
    enabled: true,
    /** Toggle for constructor logging */
    logConstructors: true,
    /** Toggle for method invocation logging */
    logMethods: false,
    /** Style for manager names in logs */
    styleManagerName: (name: string) => `\x1b[36m${name}\x1b[0m`, // Cyan color
    /** Style for lifecycle events */
    styleLifecycle: (event: string) => `\x1b[33m${event}\x1b[0m`, // Yellow color
};

/**
 * Type for the constructor of any class
 */
type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Decorator for logging manager construction
 *
 * @example
 * ```ts
 * @LogManager()
 * export class MyManager {
 *   constructor() {
 *     // Constructor is now logged when enabled
 *   }
 * }
 * ```
 */
export function LogManager() {
    return function <T extends Constructor>(originalConstructor: T) {
        // Return original constructor if logging is disabled (no overhead)
        if (!ManagerLoggingConfig.enabled || !ManagerLoggingConfig.logConstructors) {
            return originalConstructor;
        }

        // Create a new constructor function that wraps the original
        const newConstructor = function (this: any, ...args: any[]) {
            const className = originalConstructor.name;
            const style = ManagerLoggingConfig.styleManagerName;

            console.log(`${style(className)}: ${ManagerLoggingConfig.styleLifecycle('constructor')} started`);

            // Call the original constructor with the proper this context
            const instance = new originalConstructor(...args);

            console.log(`${style(className)}: ${ManagerLoggingConfig.styleLifecycle('constructor')} completed`);

            return instance;
        };

        // Copy prototype so instanceof operator still works
        newConstructor.prototype = originalConstructor.prototype;

        // Copy static properties
        Object.setPrototypeOf(newConstructor, originalConstructor);

        // Copy the name property
        Object.defineProperty(newConstructor, 'name', {
            value: originalConstructor.name,
            configurable: true
        });

        return newConstructor as unknown as T;
    };
}

/**
 * Method decorator to log method calls
 *
 * @example
 * ```ts
 * class MyManager {
 *   @LogMethod()
 *   public myMethod() {
 *     // Method calls are now logged when enabled
 *   }
 * }
 * ```
 */
export function LogMethod() {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        // Store the original method
        const originalMethod = descriptor.value;

        // Return original descriptor if logging is disabled (no overhead)
        if (!ManagerLoggingConfig.enabled || !ManagerLoggingConfig.logMethods) {
            return descriptor;
        }

        // Replace the method with our instrumented version
        descriptor.value = function (...args: any[]) {
            const className = this.constructor.name;
            const style = ManagerLoggingConfig.styleManagerName;

            console.log(`${style(className)}.${propertyKey}: ${ManagerLoggingConfig.styleLifecycle('invoked')}`);

            // Call the original method
            const result = originalMethod.apply(this, args);

            console.log(`${style(className)}.${propertyKey}: ${ManagerLoggingConfig.styleLifecycle('completed')}`);

            return result;
        };

        return descriptor;
    };
}