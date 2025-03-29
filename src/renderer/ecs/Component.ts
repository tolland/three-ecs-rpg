// src/renderer/ecs/Component.ts
// Base class (optional, can also use interfaces/types)
// Using classes allows for `instanceof` checks if needed.
export abstract class Component {
    // Components primarily hold data.
    // Use specific properties in inheriting classes.
}

// Example Component:
// import { Component } from './Component';
// import * as THREE from 'three';
// export class PositionComponent extends Component {
//     constructor(public position = new THREE.Vector3()) { super(); }
// }
