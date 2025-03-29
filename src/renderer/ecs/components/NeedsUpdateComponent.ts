// src/renderer/ecs/components/NeedsUpdateComponent.ts (Optional Performance)
import { Component } from '@ecs/Component';
// A marker to indicate an entity's visual representation needs updating
// Useful to avoid updating Three.js objects every frame if static
export class NeedsUpdateComponent extends Component {}