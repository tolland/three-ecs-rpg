import { Prefab } from '@ecs/Prefab';
import { World } from '@ecs/World';
import { PositionComponent } from '@ecs/components';


export class VelocityChart extends Prefab {

    private data: number[];

    constructor(
        protected world: World,
        protected width: number = 10,
        protected height: number = 5,
        protected color: string = 'blue',
        protected backgroundColor: string = 'white',
        protected xAxisLabel: string = 'Time (s)',
        protected yAxisLabel: string = 'Velocity (m/s)'
    ) {
        super(world);
        this.data = [];
    }


    public static create(world: World): Prefab {
        const entity = world.createEntity();
        const prefab = new VelocityChart(world);
        // world.addComponent(
        //     entity,
        //     new PositionComponent(playerStartPos.clone()),
        // ); // Position is feet
        return prefab;
    }
}
