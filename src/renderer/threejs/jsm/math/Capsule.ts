// src/renderer/threejs/jsm/math/Capsule.ts
// copied from node_modules/.pnpm/three@0.175.0/node_modules/three/examples/jsm/math/Capsule.js
import { Box3, Line3, Vector3 } from 'three';
import { Serializer } from '@shared/serialization/Serializer';

export class Capsule {

    private _start: Vector3;
    private _end: Vector3;
    private _radius: number;
    _groundBox: Box3 | null = null;
    _boundingBox: Box3 | null = null;
    _segment: Line3 | null = null;

    constructor(
        start: Vector3 = new Vector3(0, 0, 0),
        end: Vector3 = new Vector3(0, 1, 0),
        radius: number = 1,
    ) {
        this._start = start;
        this._end = end;
        this._radius = radius;
    }

    set(start: Vector3, end: Vector3, radius: number): Capsule {
        this._start = start;
        this._end = end;
        this._radius = radius;
        return this;
    }

    clone(): Capsule {
        return new Capsule().copy(this);
    }

    copy(capsule: Capsule): Capsule {
        this._start.copy(capsule._start);
        this._end.copy(capsule._end);
        this._radius = capsule._radius;
        return this;
    }

    getCenter(target: Vector3): Vector3 {
        return target.copy(this._end).add(this._start).multiplyScalar(0.5);
    }

    translate(v: Vector3): Capsule {
        this._start.add(v);
        this._end.add(v);

        return this;
    }

    get minPoint(): Vector3 {
        const min = this._start.clone().subScalar(this._radius);
        const max = this._end.clone().addScalar(this._radius);
        return min.min(max);
    }

    // The Y point is the one with the lowest Y value
    // @TODO this is not correct, it should be the lowest point of the capsule
    // this assumes the capsule is vertical, but we should be able to rotate it
    get minYPoint(): Vector3 {
        const min = this._start.clone().subScalar(this._radius);
        const max = this._end.clone().addScalar(this._radius);
        return new Vector3(this._start.x, Math.min(min.y, max.y), this._start.z);
    }

    get maxPoint(): Vector3 {
        const min = this._start.clone().subScalar(this._radius);
        const max = this._end.clone().addScalar(this._radius);
        return min.max(max);
    }

    get maxYPoint(): Vector3 {
        const min = this._start.clone().subScalar(this._radius);
        const max = this._end.clone().addScalar(this._radius);
        return new Vector3(this._end.x,  Math.max(min.y, max.y), this._end.z);
    }

    get boundingBox(): Box3 {
        const min = this._start.clone().subScalar(this._radius);
        const max = this._end.clone().addScalar(this._radius);
        this._boundingBox = new Box3(min, max);
        return this._boundingBox;
    }

    get groundBox(): Box3 {
        const min = this._start.clone().subScalar(this._radius);
        const max = this._end.clone().addScalar(this._radius);
        return new Box3(
            new Vector3(min.x, min.y, min.z),
            new Vector3(max.x, min.y + (max.y - min.y) * 0.1,  max.z),
        );
    }

    get segment(): Line3 {
        if (this._segment === null) {
            this._segment = new Line3(this._start, this._end);
        }
        return this._segment;
    }

    checkAABBAxis(
        p1x: number,
        p1y: number,
        p2x: number,
        p2y: number,
        minx: number,
        maxx: number,
        miny: number,
        maxy: number,
        radius: number,
    ): boolean {
        return (
            (minx - p1x < radius || minx - p2x < radius) &&
            (p1x - maxx < radius || p2x - maxx < radius) &&
            (miny - p1y < radius || miny - p2y < radius) &&
            (p1y - maxy < radius || p2y - maxy < radius)
        );
    }

    intersectsBox(box: Box3): boolean {
        return (
            this.checkAABBAxis(
                this._start.x, this._start.y, this._end.x, this._end.y,
                box.min.x, box.max.x, box.min.y, box.max.y,
                this._radius ) &&
            this.checkAABBAxis(
                this._start.x, this._start.z, this._end.x, this._end.z,
                box.min.x, box.max.x, box.min.z, box.max.z,
                this._radius ) &&
            this.checkAABBAxis(
                this._start.y, this._start.z, this._end.y, this._end.z,
                box.min.y, box.max.y, box.min.z, box.max.z,
                this._radius )
        );
    }

    set radius(value: number) {
        this._segment = null;
        this._boundingBox = null;
        this._groundBox = null;
        this._radius = value;
    }

    @Serializer.Serialize()
    get start(): Vector3 {
        return this._start;
    }

    set start(value: Vector3) {
        this._segment = null;
        this._boundingBox = null;
        this._groundBox = null;
        this._start = value;
    }
    get end(): Vector3 {
        return this._end;
    }

    set end(value: Vector3) {
        this._segment = null;
        this._boundingBox = null;
        this._groundBox = null;
        this._end = value;
    }
    get radius(): number {
        return this._radius;
    }
}
