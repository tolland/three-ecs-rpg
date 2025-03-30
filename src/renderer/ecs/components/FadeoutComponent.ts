// src/renderer/ecs/components/FadeoutComponent.ts
import { Component } from '@ecs/Component';
import * as THREE from 'three';

export class FadeoutComponent extends Component {
    constructor(public fadeOutTime = 1) {
        super();
    }
}
