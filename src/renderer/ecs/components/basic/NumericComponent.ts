// src/renderer/ecs/components/basic/NumericComponent.ts
import { Component } from '@ecs/index';

export class NumericComponent extends Component {
    constructor(
        public name: string,
        public number = 0,
        public minValue: number = 0,
        public maxValue: number = 0,
    ) {
        super();
    }
}
