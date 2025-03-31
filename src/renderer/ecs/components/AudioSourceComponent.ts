// src/renderer/ecs/components/AudioSourceComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

// Maps event/action names to sound asset keys and optional parameters
interface SoundMapping {
    key: string; // Asset key (e.g., 'player_jump.wav')
    volume?: number;
    loop?: boolean;
    positional?: boolean; // Should it be a PositionalAudio source?
    refDistance?: number; // For positional
}

export class AudioSourceComponent extends Component {
    // Map trigger strings (like "JUMP", "FOOTSTEP", "IMPACT_GROUND") to sound details
    public sounds: Map<string, SoundMapping> = new Map();
    // Store active playing sound instances (non-positional)
    public playingGeneric: Map<string, THREE.Audio> = new Map();
    // Store positional sound instance (typically one per entity, attached to its renderable)
    public positionalAudio: THREE.PositionalAudio | null = null;
    public isPositionalAudioAttached: boolean = false;

    constructor(soundMappings: Record<string, SoundMapping | string>) {
        super();
        for (const [trigger, mappingOrKey] of Object.entries(soundMappings)) {
            if (typeof mappingOrKey === 'string') {
                // Simple mapping: trigger -> sound key
                this.sounds.set(trigger, {
                    key: mappingOrKey,
                    positional: true,
                }); // Default to positional
            } else {
                // Full mapping object
                this.sounds.set(trigger, { positional: true, ...mappingOrKey }); // Default positional
            }
        }
    }
}
