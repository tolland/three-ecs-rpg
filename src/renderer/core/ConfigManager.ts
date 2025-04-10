import { ConfigMetadata, ConfigSetter } from '@core/UberConfigManager';

export interface Config {}

export interface IConfigManager {
    getSetters(): Record<string, ConfigSetter>;
    getMetadata(): Record<string, ConfigMetadata>;
    getConfig(): Readonly<Config>;
}

/**
 * Base class for configuration managers
 */
export abstract class ConfigManager<T> {
    /**
     * Load configuration from a file
     * @param configPath Path to the configuration file
     */
    public abstract loadConfig(configPath: string): Promise<T>;

    /**
     * Get the current configuration
     */
    public abstract getConfig(): T | null;
}
