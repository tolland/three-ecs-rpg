// src/renderer/ecs/components/GravityAffectedComponent.ts
import { Component } from '@ecs/Component';
// Marker component - presence indicates gravity applies
export class GravityAffectedComponent extends Component {
    constructor(
        public gravityMultiplier: number = 1.0 // Default multiplier is 1
    ) { super(); }
}