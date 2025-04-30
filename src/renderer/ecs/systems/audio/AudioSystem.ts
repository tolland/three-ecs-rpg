// src/renderer/ecs/systems/AudioSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import { AudioSourceComponent, RenderableComponent } from '@ecs/components';
import { appEventManager, AppEventManager } from '@core/AppEventManager';
import { audioManager, AudioManager } from '@core/AudioManager';
import { Entity } from '@ecs/Entity';

export class AudioSystem extends System {
    constructor(
        world: World,
        private events: AppEventManager = appEventManager,
        private audio: AudioManager = audioManager,
    ) {
        super(world);
        this.registerListeners();
    }

    // Call this in constructor or an init method
    registerListeners() {
        this.events.on(
            'ENTITY_COLLISION_IMPACT' as any,
            this.handleCollisionImpact,
        );
        this.events.on('PLAYER_ACTION' as any, this.handlePlayerAction);
        this.events.on('AREA_TRIGGER_ENTER' as any, this.handleAreaEnter);
        this.events.on('AREA_TRIGGER_EXIT' as any, this.handleAreaExit);
        // Add listeners for other sound-triggering events
    }

    // --- Event Handlers ---

    private handleCollisionImpact = (payload: {
        entityId: Entity;
        impactVelocity: number;
        surfaceType: 'ground' | 'wall';
    }) => {
        // Determine sound based on surface and velocity
        let trigger = 'IMPACT_LIGHT';
        if (payload.impactVelocity > 5) trigger = 'IMPACT_HEAVY'; // Example threshold
        if (payload.surfaceType === 'ground' && payload.impactVelocity > 7)
            trigger = 'IMPACT_GROUND_HARD'; // Specific hard landing

        // console.log(`AudioSystem: Collision Impact Event for Entity ${payload.entityId}, trigger: ${trigger}`); // Debug
        this.playSoundForEntity(payload.entityId, trigger);
    };

    private handlePlayerAction = (payload: {
        entityId: Entity;
        action: string;
    }) => {
        // Payload.action might be "JUMP", "SAY_HELLO", "FOOTSTEP_LEFT", etc.
        // console.log(
        //     `AudioSystem: Player Action Event for Entity ${payload.entityId}, action: ${payload.action}`,
        // ); // Debug
        this.playSoundForEntity(payload.entityId, payload.action);
    };

    private handleAreaEnter = (payload: {
        triggerEntityId: number;
        activatorEntityId: number;
        areaName: string;
        soundKey?: string;
    }) => {
        // console.log(`AudioSystem: Area Enter Event for Area ${payload.areaName}, activator: ${payload.activatorEntityId}`); // Debug
        // If soundKey is directly in payload (from AreaTriggerComponent)
        if (payload.soundKey) {
            // Play non-positional ambient sound? Or positional from trigger center?
            this.playGenericSound(payload.soundKey); // Example: play globally
        }
        // Could also check the activatorEntity for an AudioSource and play something specific
    };

    private handleAreaExit = (payload: {
        triggerEntityId: number;
        activatorEntityId: number;
        areaName: string;
        soundKey?: string;
    }) => {
        // console.log(`AudioSystem: Area Exit Event for Area ${payload.areaName}, activator: ${payload.activatorEntityId}`); // Debug
        if (payload.soundKey) {
            this.playGenericSound(payload.soundKey);
        }
    };

    // --- Core Sound Playing Logic ---

    private playSoundForEntity(entityId: Entity, trigger: string): void {
        //console.log(`AudioSystem: Attempting to play sound for Entity ${entityId}, trigger: ${trigger}`); // Debug

        if (!audioManager.listener) {
            console.warn(`Cannot play sound for entity ${entityId}, trigger "${trigger}": AudioListener not initialized`);
            return;
        }

        const audioComp = this.world.getComponent(
            entityId,
            AudioSourceComponent,
        );
        if (!audioComp) return; // Entity doesn't have sounds defined

        const soundMapping = audioComp.sounds.get(trigger);
        if (!soundMapping) return; // No sound defined for this trigger

        const {
            key,
            volume = 0.5,
            loop = false,
            positional = true,
            refDistance,
        } = soundMapping;

        if (positional) {
            // Handle Positional Audio
            if (!audioComp.positionalAudio) {
                // Create if doesn't exist
                audioComp.positionalAudio =
                    this.audio.createPositionalAudio(key);
                audioComp.isPositionalAudioAttached = false; // Needs attachment
            }

            if (audioComp.positionalAudio) {
                // Ensure buffer is set correctly (if reused for different sound)
                const buffer = this.audio.getSoundBuffer(key);
                if (buffer && audioComp.positionalAudio.buffer !== buffer) {
                    if (audioComp.positionalAudio.isPlaying)
                        audioComp.positionalAudio.stop();
                    audioComp.positionalAudio.setBuffer(buffer);
                }

                // Attach to renderable if not already attached
                if (!audioComp.isPositionalAudioAttached) {
                    const renderable = this.world.getComponent(
                        entityId,
                        RenderableComponent,
                    );
                    if (renderable?.object3D) {
                        renderable.object3D.add(audioComp.positionalAudio);
                        audioComp.isPositionalAudioAttached = true;
                        console.log(
                            `AudioSystem: Attached PositionalAudio for trigger "${trigger}" to entity ${entityId}`,
                        );
                    } else {
                        console.warn(
                            `AudioSystem: Cannot attach PositionalAudio for entity ${entityId}, RenderableComponent not found.`,
                        );
                        return; // Don't play if we can't attach
                    }
                }

                // Configure and play
                audioComp.positionalAudio.setVolume(volume);
                audioComp.positionalAudio.setLoop(loop);
                if (refDistance)
                    audioComp.positionalAudio.setRefDistance(refDistance);
                if (audioComp.positionalAudio.isPlaying)
                    audioComp.positionalAudio.stop(); // Stop previous if any
                audioComp.positionalAudio.play();
                // console.log(
                //     `AudioSystem: Playing positional sound "${key}" for entity ${entityId} trigger "${trigger}"`,
                // );
            }
        } else {
            // Handle Generic (non-positional) Audio
            // Can reuse or create new - let's create new for simplicity
            const soundInstance = this.audio.createGenericAudio(key);
            if (soundInstance) {
                soundInstance.setVolume(volume);
                soundInstance.setLoop(loop);
                soundInstance.play();
                // Optional: Store in playingGeneric map if we need to stop it later
                // audioComp.playingGeneric.set(key, soundInstance);
                console.log(
                    `AudioSystem: Playing generic sound "${key}" for entity ${entityId} trigger "${trigger}"`,
                );
            }
        }
    }

    // Helper for simple global sounds (like area enter/exit)
    private playGenericSound(
        key: string,
        volume: number = 0.5,
        loop: boolean = false,
    ) {
        if (!audioManager.isEnabled()) return;

        if (!audioManager.listener) {
            console.warn(`Cannot play generic sound "${key}": AudioListener not initialized`);
            return;
        }

        const soundInstance = this.audio.createGenericAudio(key);
        if (soundInstance) {
            soundInstance.setVolume(volume);
            soundInstance.setLoop(loop);
            soundInstance.play();
            console.log(`AudioSystem: Playing global generic sound "${key}"`);
        }
    }

    // TODO: Cleanup listeners on system destruction
    destroy() {
        // this.events.off(...)
    }
}
