// src/renderer/core/AudioManager.ts
import * as THREE from 'three';
import { CameraSystemLoggingConfig } from '@ecs/systems';

export const AudioManagerLoggingConfig = {
    /** Main toggle for enabling/disable all AudioManager logging */
    enabled: false,
    logConstructors: false,
    logFocusedChanged: false,
    logEnableDisable: false,
    /** Toggle for method invocation logging */
    logMethods: false,
    /** Style for manager names in logs */
    styleFocusChange: (name: string) => `\x1b[36m${name}\x1b[0m`, // Cyan color
    /** Style for lifecycle events */
    styleLifecycle: (event: string) => `\x1b[33m${event}\x1b[0m`, // Yellow color
};

export class AudioManager {
    private audioLoader = new THREE.AudioLoader();
    private cache: Map<string, AudioBuffer> = new Map();
    public listener: THREE.AudioListener | null = null; // Set by CameraSystem
    private _audioContext: AudioContext | null = null;
    private _enabled: boolean = false; // Start disabled

    constructor() {
        // Initialize the listener but don't attach it yet
        if (!AudioManagerLoggingConfig.enabled || !CameraSystemLoggingConfig.logConstructors) {
            console.log('AudioManager initialized.');
        }

        try {
            this.listener = new THREE.AudioListener();

            // Safety patch to prevent matrix errors from crashing app
            const originalUpdateMatrixWorld = this.listener.updateMatrixWorld;
            this.listener.updateMatrixWorld = function(force) {
                try {
                    // Only proceed if all values are valid
                    const parent = this.parent;
                    if (parent && parent.matrixWorld &&
                        !isNaN(parent.matrixWorld.elements[0])) {
                        originalUpdateMatrixWorld.call(this, force);
                    }
                } catch (e) {
                    // Silently catch errors
                    console.warn('AudioListener: Matrix update error suppressed');
                }
            };
        } catch (e) {
            console.error('Error initializing AudioListener:', e);
            this.listener = null;
        }
    }

    enable() {
        if (this._enabled) return;

        try {
            if (!AudioManagerLoggingConfig.enabled || !AudioManagerLoggingConfig.logEnableDisable) {
                console.log('Enabling audio system...');
            }
            this.listener = new THREE.AudioListener();

            // Monkey patch the updateMatrixWorld to be safe
            const originalUpdateMatrixWorld = this.listener.updateMatrixWorld;
            this.listener.updateMatrixWorld = function(force) {
                try {
                    if (this.parent &&
                        this.parent.matrixWorld &&
                        !isNaN(this.parent.matrixWorld.elements[0])) {
                        originalUpdateMatrixWorld.call(this, force);
                    }
                } catch (e) {
                    // Silently catch errors
                }
            };

            this._enabled = true;
            if (!AudioManagerLoggingConfig.enabled || !AudioManagerLoggingConfig.logEnableDisable) {
                console.log('Audio system enabled');
            }

            // Resume context if needed
            if (this.listener.context && this.listener.context.state !== 'running') {
                this.listener.context.resume();
            }
        } catch (error) {
            console.error('Failed to enable audio system:', error);
        }
    }

    disable() {
        if (!this._enabled) return;

        // Remove listener from parent if attached
        if (this.listener && this.listener.parent) {
            this.listener.removeFromParent();
        }

        // Null out the listener
        this.listener = null;
        this._enabled = false;
        if (!AudioManagerLoggingConfig.enabled || !AudioManagerLoggingConfig.logEnableDisable) {
            console.log('Audio system disabled');
        }
    }

    isEnabled() {
        return this._enabled && this.listener !== null;
    }

    // Getter for the audio context
    get context(): AudioContext | null {
        return this._audioContext || (this.listener ? this.listener.context : null);
    }

    // Method to safely initialize the audio context
    initializeContext(): boolean {
        try {
            if (!this.listener) {
                this.listener = new THREE.AudioListener();
            }

            // Resume the context if needed
            if (this.listener.context && this.listener.context.state !== 'running') {
                this.listener.context.resume().catch(err => {
                    console.warn('Could not resume audio context:', err);
                });
            }

            this._audioContext = this.listener.context;
            return true;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            return false;
        }
    }

    async loadSounds(
        sounds: { key: string; path: string }[],
    ): Promise<Awaited<AudioBuffer | null>[]> {
        return Promise.all(
            sounds.map(({ key, path }) => this.loadSound(key, path)),
        );
    }

    // Preload a sound or load on demand
    async loadSound(key: string, path: string): Promise<AudioBuffer | null> {
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }
        try {
            // console.log(`AudioManager: Loading sound "${key}" from ${path}`);
            const buffer = await this.audioLoader.loadAsync(path);
            this.cache.set(key, buffer);
            // console.log(`AudioManager: Loaded sound "${key}"`);
            return buffer;
        } catch (error) {
            console.error(
                `AudioManager: Failed to load sound "${key}" from ${path}:`,
                error,
            );
            return null;
        }
    }

    getSoundBuffer(key: string): AudioBuffer | undefined {
        return this.cache.get(key);
    }

    // Creates a non-positional sound object
    createGenericAudio(key: string): THREE.Audio | null {
        if (!this.isEnabled()) {
            console.warn('AudioManager: AudioListener not set!');
            return null;
        }
        const buffer = this.getSoundBuffer(key);
        if (!buffer) {
            console.warn(
                `AudioManager: Sound buffer not found for key: ${key}`,
            );
            return null;
        }
        const sound = new THREE.Audio(this.listener!);
        sound.setBuffer(buffer);
        return sound;
    }

    // Creates a positional sound object
    createPositionalAudio(key: string): THREE.PositionalAudio | null {
        if (!this.isEnabled()) {
            console.warn('AudioManager: AudioListener not set!');
            return null;
        }
        const buffer = this.getSoundBuffer(key);
        if (!buffer) {
            console.warn(
                `AudioManager: Sound buffer not found for key: ${key}`,
            );
            return null;
        }
        const sound = new THREE.PositionalAudio(this.listener!);
        sound.setBuffer(buffer);
        sound.setRefDistance(1); // Adjust based on your world scale
        sound.setRolloffFactor(1);
        return sound;
    }
}

// Optional: Create a singleton instance
export const audioManager = new AudioManager();
