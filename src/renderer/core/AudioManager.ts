// src/renderer/core/AudioManager.ts
import * as THREE from 'three';

export class AudioManager {
    private audioLoader = new THREE.AudioLoader();
    private cache: Map<string, AudioBuffer> = new Map();
    public listener: THREE.AudioListener | null = null; // Set by CameraSystem

    constructor() {
        console.log('AudioManager initialized.');
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
        if (!this.listener) {
            console.error('AudioManager: AudioListener not set!');
            return null;
        }
        const buffer = this.getSoundBuffer(key);
        if (!buffer) {
            console.warn(
                `AudioManager: Sound buffer not found for key: ${key}`,
            );
            return null;
        }
        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(buffer);
        return sound;
    }

    // Creates a positional sound object
    createPositionalAudio(key: string): THREE.PositionalAudio | null {
        if (!this.listener) {
            console.error('AudioManager: AudioListener not set!');
            return null;
        }
        const buffer = this.getSoundBuffer(key);
        if (!buffer) {
            console.warn(
                `AudioManager: Sound buffer not found for key: ${key}`,
            );
            return null;
        }
        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(buffer);
        sound.setRefDistance(1); // Adjust based on your world scale
        sound.setRolloffFactor(1);
        return sound;
    }
}

// Optional: Create a singleton instance
export const audioManager = new AudioManager();
