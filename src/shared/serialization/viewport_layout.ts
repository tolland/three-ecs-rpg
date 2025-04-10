// src/renderer/ecs/serialization/viewport_layout.ts
/*
 *    Simplified state representation for serialization
 */
interface SerializedLayoutNode {
    id: string;
    type: 'split' | 'leaf';
    direction?: 'horizontal' | 'vertical';
    splitPercentage?: number;
    childAId?: string;
    childBId?: string;
    // LeafNode specific
    activeViewId?: string | null;
}
