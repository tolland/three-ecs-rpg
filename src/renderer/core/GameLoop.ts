// src/renderer/core/GameLoop.ts
import { World } from '../ecs';
import { Clock } from 'three';
import { DEBUG_OBJ2 } from '@renderer/utils/debug';

const MAX_DELTA_TIME = 1 / 30; // Clamp delta time to max 30 FPS equivalent

export class GameLoop {
    private clock = new Clock();
    private animationFrameId: number | null = null;
    private _isPaused = false; // Paused state
    private debugSlowMotion = false;
    private STEPS_PER_FRAME: number = 2;

    constructor(
        private world: World,
        private updateCallback?: () => void,
    ) {
    }

    start(): void {
        if (this.animationFrameId === null) {
            this.clock.start();
            this.tick();
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
        // Use arrow function to preserve 'this'
        // let deltaTime = this.clock.getDelta();

        let deltaTime = this.debugSlowMotion ?
            this.clock.getDelta() / this.STEPS_PER_FRAME : this.clock.getDelta();

        // --- Clamp Delta Time ---
        if (deltaTime > MAX_DELTA_TIME) {
            console.warn(
                `Delta time ${deltaTime.toFixed(4)}s too high, clamping to ${MAX_DELTA_TIME.toFixed(4)}s`,
            );
            deltaTime = MAX_DELTA_TIME;
        }

        // Only update world if not paused
        if (!this._isPaused) {
            this.world.update(deltaTime);
        } else {
            // Optionally update specific non-gameplay systems even when paused
            // e.g., world.updateSystem(RenderSystem, 0); // Or pass 0 delta
            this.world.update(0); // Simplest: still call update, but with 0 delta.
            // Systems need to handle deltaTime=0 appropriately.
            // RenderSystem should still run.
        }

        // Optional additional update logic (e.g., UI updates)
        if (this.updateCallback) {
            this.updateCallback();
        }

        // Request next frame
        if (this.debugSlowMotion) {
            setTimeout(() => {
                this.animationFrameId = this.doRequestAnimationFrame(this.tick);
            }, 50);
        } else {
            this.animationFrameId = this.doRequestAnimationFrame(this.tick);
        }
    };

    private doRequestAnimationFrame(callback: FrameRequestCallback): number {
        DEBUG_OBJ2.updateId = DEBUG_OBJ2.updateId + 1;
        return requestAnimationFrame(this.tick);
    }
}
