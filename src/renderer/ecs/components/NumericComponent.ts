import { Component } from '@renderer/ecs';

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
