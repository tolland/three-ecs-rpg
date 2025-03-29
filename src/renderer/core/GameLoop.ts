// src/renderer/core/GameLoop.ts
import {World} from '@ecs/World';
import {Clock} from 'three';

export class GameLoop {
    private clock = new Clock();
    private animationFrameId: number | null = null;
    private _isPaused = false; // Paused state

    constructor(private world: World, private updateCallback?: () => void) {
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

    private tick = (): void => { // Use arrow function to preserve 'this'
        const deltaTime = this.clock.getDelta();

        // Only update world if not paused
        if (!this._isPaused) {
            this.world.update(deltaTime); // Pass actual delta time
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
        this.animationFrameId = requestAnimationFrame(this.tick);
    }
}
