// src/renderer/logic/PhysicsLogic.test.ts
import { PhysicsLogic } from '../PhysicsLogic';
import * as THREE from 'three';
import { strict as assert } from 'assert';

describe('PhysicsLogic', () => {
    describe('calcGroundFriction', () => {
        it('should return zero friction when horizontal velocity is zero', () => {
            const velocity = new THREE.Vector3(0, 1, 0);
            const mass = 1;
            const deltaTime = 0.1;
            const friction = PhysicsLogic.calcGroundFriction(
                velocity,
                mass,
                deltaTime,
            );
            expect(friction.x).toBeCloseTo(0);
            expect(friction.y).toBeCloseTo(0);
            expect(friction.z).toBeCloseTo(0);
        });

        it('should apply friction in the opposite direction of horizontal velocity', () => {
            const velocity = new THREE.Vector3(1, 1, 1);
            const mass = 1;
            const deltaTime = 0.1;
            const friction = PhysicsLogic.calcGroundFriction(
                velocity,
                mass,
                deltaTime,
            );
            expect(friction.x).toBeLessThan(0);
            expect(friction.y).toBeCloseTo(0);
            expect(friction.z).toBeLessThan(0);
        });

        it('should apply friction with correct magnitude based on velocity and deltaTime', () => {
            const velocity = new THREE.Vector3(10, 0, 0);
            const mass = 1;
            const deltaTime = 0.1;
            const friction = PhysicsLogic.calcGroundFriction(
                velocity,
                mass,
                deltaTime,
            );
            const expectedFrictionMagnitude = Math.min(
                velocity.length() / deltaTime,
                5.0 * deltaTime * mass * 9.81,
            );
            expect(friction.length()).toBeCloseTo(expectedFrictionMagnitude);
            expect(friction.x).toBeLessThan(0);
            expect(friction.y).toBeCloseTo(0);
            expect(friction.z).toBeCloseTo(0);
        });

        it('should apply friction with correct magnitude based on mass', () => {
            const velocity = new THREE.Vector3(10, 0, 0);
            const mass = 2;
            const deltaTime = 0.1;
            const friction = PhysicsLogic.calcGroundFriction(
                velocity,
                mass,
                deltaTime,
            );
            const expectedFrictionMagnitude = Math.min(
                velocity.length() / deltaTime,
                5.0 * deltaTime * mass * 9.81,
            );
            expect(friction.length()).toBeCloseTo(expectedFrictionMagnitude);
            expect(friction.x).toBeLessThan(0);
            expect(friction.y).toBeCloseTo(0);
            expect(friction.z).toBeCloseTo(0);
        });

        it('should apply friction with correct magnitude based on deltaTime', () => {
            const velocity = new THREE.Vector3(10, 0, 0);
            const mass = 1;
            const deltaTime = 0.2;
            const friction = PhysicsLogic.calcGroundFriction(
                velocity,
                mass,
                deltaTime,
            );
            const expectedFrictionMagnitude = Math.min(
                velocity.length() / deltaTime,
                5.0 * deltaTime * mass * 9.81,
            );
            expect(friction.length()).toBeCloseTo(expectedFrictionMagnitude);
            expect(friction.x).toBeLessThan(0);
            expect(friction.y).toBeCloseTo(0);
            expect(friction.z).toBeCloseTo(0);
        });

        it('should limit friction magnitude based on the simplified friction limit', () => {
            const velocity = new THREE.Vector3(1000, 0, 0); // Very high velocity
            const mass = 1;
            const deltaTime = 0.1;
            const friction = PhysicsLogic.calcGroundFriction(
                velocity,
                mass,
                deltaTime,
            );
            const expectedMaxFriction = 5.0 * deltaTime * mass * 9.81;
            expect(friction.length()).toBeCloseTo(expectedMaxFriction);
            expect(friction.x).toBeLessThan(0);
            expect(friction.y).toBeCloseTo(0);
            expect(friction.z).toBeCloseTo(0);
        });

        it('should handle negative horizontal velocity', () => {
            const velocity = new THREE.Vector3(-5, 0, 0);
            const mass = 1;
            const deltaTime = 0.1;
            const friction = PhysicsLogic.calcGroundFriction(
                velocity,
                mass,
                deltaTime,
            );
            expect(friction.x).toBeGreaterThan(0);
            expect(friction.y).toBeCloseTo(0);
            expect(friction.z).toBeCloseTo(0);
        });

        it('should handle negative z velocity', () => {
            const velocity = new THREE.Vector3(0, 0, -5);
            const mass = 1;
            const deltaTime = 0.1;
            const friction = PhysicsLogic.calcGroundFriction(
                velocity,
                mass,
                deltaTime,
            );
            expect(friction.x).toBeCloseTo(0);
            expect(friction.y).toBeCloseTo(0);
            expect(friction.z).toBeGreaterThan(0);
        });
    });
    describe('calcVelocityFromForce', () => {
        it('should calculate velocity correctly with no initial velocity', () => {
            const force = new THREE.Vector3(0, 10, 0);
            const mass = 1;
            const deltaTime = 0.1;
            const globalDamping = 0;
            const outVector = new THREE.Vector3(0, 0, 0);

            const result = PhysicsLogic.calcVelocityFromForce(
                force,
                mass,
                deltaTime,
                globalDamping,
                outVector,
            );

            assert.deepStrictEqual(result, new THREE.Vector3(0, 1, 0));
        });

        it('should calculate velocity correctly with initial velocity', () => {
            const force = new THREE.Vector3(0, 10, 0);
            const mass = 1;
            const deltaTime = 0.1;
            const globalDamping = 0;
            const outVector = new THREE.Vector3(0, 2, 0);

            const result = PhysicsLogic.calcVelocityFromForce(
                force,
                mass,
                deltaTime,
                globalDamping,
                outVector,
            );

            assert.deepStrictEqual(result, new THREE.Vector3(0, 3, 0));
        });

        it('should calculate velocity correctly with damping', () => {
            const force = new THREE.Vector3(0, 10, 0);
            const mass = 1;
            const deltaTime = 0.1;
            const globalDamping = 0.5;
            const outVector = new THREE.Vector3(0, 0, 0);

            const result = PhysicsLogic.calcVelocityFromForce(
                force,
                mass,
                deltaTime,
                globalDamping,
                outVector,
            );

            assert.deepStrictEqual(result, new THREE.Vector3(0, 0.95, 0));
        });

        it('should calculate velocity correctly with negative force', () => {
            const force = new THREE.Vector3(0, -10, 0);
            const mass = 1;
            const deltaTime = 0.1;
            const globalDamping = 0;
            const outVector = new THREE.Vector3(0, 0, 0);

            const result = PhysicsLogic.calcVelocityFromForce(
                force,
                mass,
                deltaTime,
                globalDamping,
                outVector,
            );

            assert.deepStrictEqual(result, new THREE.Vector3(0, -1, 0));
        });

        it('should calculate velocity correctly with different mass', () => {
            const force = new THREE.Vector3(0, 10, 0);
            const mass = 2;
            const deltaTime = 0.1;
            const globalDamping = 0;
            const outVector = new THREE.Vector3(0, 0, 0);

            const result = PhysicsLogic.calcVelocityFromForce(
                force,
                mass,
                deltaTime,
                globalDamping,
                outVector,
            );

            assert.deepStrictEqual(result, new THREE.Vector3(0, 0.5, 0));
        });

        it('should calculate velocity correctly with different deltaTime', () => {
            const force = new THREE.Vector3(0, 10, 0);
            const mass = 1;
            const deltaTime = 0.2;
            const globalDamping = 0;
            const outVector = new THREE.Vector3(0, 0, 0);

            const result = PhysicsLogic.calcVelocityFromForce(
                force,
                mass,
                deltaTime,
                globalDamping,
                outVector,
            );

            assert.deepStrictEqual(result, new THREE.Vector3(0, 2, 0));
        });

        it('should create a new outVector if none is provided', () => {
            const force = new THREE.Vector3(0, 10, 0);
            const mass = 1;
            const deltaTime = 0.1;
            const globalDamping = 0;

            const result = PhysicsLogic.calcVelocityFromForce(
                force,
                mass,
                deltaTime,
                globalDamping,
                undefined,
            );

            assert.deepStrictEqual(result, new THREE.Vector3(0, 1, 0));
        });

        it('should handle zero force', () => {
            const force = new THREE.Vector3(0, 0, 0);
            const mass = 1;
            const deltaTime = 0.1;
            const globalDamping = 0;
            const outVector = new THREE.Vector3(1, 1, 1);

            const result = PhysicsLogic.calcVelocityFromForce(
                force,
                mass,
                deltaTime,
                globalDamping,
                outVector,
            );

            assert.deepStrictEqual(result, new THREE.Vector3(1, 1, 1));
        });

        it('should handle zero mass', () => {
            const force = new THREE.Vector3(0, 10, 0);
            const mass = 0;
            const deltaTime = 0.1;
            const globalDamping = 0;
            const outVector = new THREE.Vector3(0, 0, 0);

            assert.throws(() => {
                PhysicsLogic.calcVelocityFromForce(
                    force,
                    mass,
                    deltaTime,
                    globalDamping,
                    outVector,
                );
            }, Error);
        });
    });
});
