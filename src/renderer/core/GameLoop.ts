// src/renderer/core/GameLoop.ts
import { World } from '../ecs';
import { Clock } from 'three';
import { simulationConfigManager } from './SimulationConfigManager'; // Import config

export class GameLoop {
    private clock = new Clock();
    private animationFrameId: number | null = null;
    private _isPaused = false;
    private isFirstFrame = true;  // Track first frame

    private debugSlowMotion = true;
    private STEPS_PER_FRAME: number = 2;
    private SLOW_DOWN_DELAY: number = 100;

    constructor(
        private world: World,
        private updateCallback?: () => void,
    ) {}


    start(): void {
        if (this.animationFrameId === null) {
            try {
                this.clock.start();

                // Schedule the first tick, but don't run it immediately
                // This avoids the audio matrix error during initialization
                this.animationFrameId = requestAnimationFrame(() => {
                    // This first tick won't update the world fully
                    console.log('First game loop tick - skipping world update');

                    // Reset the clock since we're not using the first delta
                    this.clock.getDelta();

                    // Schedule the real first tick for the next frame
                    this.animationFrameId = requestAnimationFrame(this.tick);
                });
            } catch (error) {
                console.error('Error starting game loop:', error);
                throw error;
            }
        }
    }

    stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.clock.stop();
        }
    }

    public pause(): void {
        this._isPaused = true;
        // Optional: clock.stop() if you want deltaTime to not accumulate during pause
    }

    public resume(): void {
        this._isPaused = false;
        // Optional: clock.start() if you stopped it
    }

    public togglePause(): void {
        this._isPaused ? this.resume() : this.pause();
    }

    public isPaused(): boolean {
        return this._isPaused;
    }

    private tick = (): void => {
        let actualDeltaTime = this.clock.getDelta();
        const timeScale = simulationConfigManager.getTimeScale();
        const maxDeltaTime = simulationConfigManager.getMaxDeltaTime();

        let effectiveDeltaTime = actualDeltaTime * timeScale;

        // Clamp the *effective* delta time
        if (effectiveDeltaTime > maxDeltaTime) {
            // console.warn(`Effective delta time ${effectiveDeltaTime.toFixed(4)}s too high (max ${maxDeltaTime.toFixed(4)}s), clamping.`);
            effectiveDeltaTime = maxDeltaTime;
        }

        if (!this._isPaused) {
            this.world.update(effectiveDeltaTime);
        } else {
            // deltaTime 0.000001 for paused state
            this.world.update(0.000001);
        }

        // Optional additional update logic (e.g., UI updates)
        if (this.updateCallback) {
            this.updateCallback();
        }

        this.animationFrameId = requestAnimationFrame(this.tick);
    };
}
