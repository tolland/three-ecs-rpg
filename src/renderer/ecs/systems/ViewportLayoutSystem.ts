// src/renderer/ecs/systems/ViewportLayoutSystem.ts
import { System } from '@ecs/System';
import { World } from '@ecs/World';
import * as THREE from 'three';
import { generateId } from '@core/ViewportLayout';
import { Serializer } from '@shared/serialization/Serializer';
import { appEventManager, AppEventManager } from '@renderer/core';
import { AppAction } from '@shared/core';
import { LayoutEvent, LayoutEventType } from '@shared/ipc/ips.types';
import * as F from '@renderer/utils/chalkColors';
import { LayoutNode, LeafNode, SplitNode, ViewportID, ViewportRect } from '@core/types/viewport';

/**
 * Manages the layout tree and calculates viewport rectangles.
 */
export class ViewportLayoutSystem extends System {
    @Serializer.Serialize()
    private rootNode: LayoutNode;
    @Serializer.Serialize()
    private leafNodes: Map<ViewportID, LeafNode> = new Map(); // Quick lookup for leaves

    constructor(
        world: World,
        initialLayout?: LayoutNode,
        private events: AppEventManager = appEventManager,
    ) {
        super(world);
        // Start with a single leaf node covering the whole screen
        this.rootNode = initialLayout ?? this.createDefaultLeaf();
        this.registerListeners();
        this.recalculateLayout(); // Initial calculation
    }

    /**
     * Creates a default leaf node with a unique ID and no assigned view.
     * @private
     */
    private createDefaultLeaf(): LeafNode {
        const leaf: LeafNode = {
            id: generateId({ prefix: 'ln-' }),
            type: 'leaf',
            activeViewId: null, // No view assigned initially
            calculatedViewport: new THREE.Vector4(0, 0, 1, 1) as ViewportRect,
        };
        this.leafNodes.set(leaf.id, leaf);
        this.events.emit(AppAction.FOCUS_SET_FOCUS, {
            viewportId: leaf.id,
        });
        return leaf;
    }

    // region Event Handling

    registerListeners() {
        this.events.on(
            AppAction.VIEWPORT_MERGE_VIEWPORT,
            this.handleMergeViewport.bind(this),
        );
        this.events.on(
            AppAction.VIEWPORT_SPLIT_VIEWPORT,
            this.handleSplitViewport.bind(this),
        );
    }

    private handleMergeViewport(payload: { viewportId: string | null }) {
        if (payload.viewportId) {
            this.mergeLeaf(payload.viewportId);
        }
    }

    private handleSplitViewport(payload: { viewportId: string | null }) {
        if (payload.viewportId) {
            this.splitHorizontal(payload.viewportId);
        }
    }

    notifyChanges(eventType: LayoutEventType, data: Partial<LayoutEvent> = {}) {
        const event: LayoutEvent = {
            type: eventType,
            ...data,
        };

        this.events.emit(AppAction.VIEWPORT_LAYOUT_UPDATED, event);
    }

    // endregion

    //region Display or serialization
    /** Serializes the current layout tree structure */
    getLayoutState(): SerializedLayoutNode {
        const serialize = (node: LayoutNode): SerializedLayoutNode => {
            const base: Partial<SerializedLayoutNode> = {
                id: node.id,
                type: node.type,
            };
            if (node.type === 'leaf') {
                return {
                    ...base,
                    activeViewId: node.activeViewId,
                } as SerializedLayoutNode;
            } else {
                // SplitNode
                return {
                    ...base,
                    direction: node.direction,
                    splitPercentage: node.splitPercentage,
                    childAId: node.childA.id,
                    childBId: node.childB.id,
                    // Recursively serialize children (needed if loading state)
                    // children: [serialize(node.childA), serialize(node.childB)] // Or store flat map
                } as SerializedLayoutNode;
            }
        };
        // For loading, would need a flat map and then reconstruct tree
        return serialize(this.rootNode); // Just serialize root for now
    }

    /**
     * Generates a succinct string representation of the layout tree
     * Format:
     * - Leaf nodes: L(viewId)
     * - Split nodes: (childA)[H|V:pct](childB)
     */
    getTreeNotation(node: LayoutNode = this.rootNode): string {
        if (node.type === 'leaf') {
            const viewId = node.activeViewId
                ? node.activeViewId.substring(0, 3)
                : '-';
            return `L(${viewId})`;
        } else {
            const dirChar = node.direction === 'horizontal' ? 'H' : 'V';
            const splitPct = Math.round(node.splitPercentage * 100);
            return `(${this.getTreeNotation(node.childA)}${dirChar}:${splitPct}${this.getTreeNotation(node.childB)})`;
        }
    }

    /**
     * Serializes the full state including all nodes for reconstruction
     */
    getFullLayoutState(): Record<string, SerializedLayoutNode> {
        const state: Record<string, SerializedLayoutNode> = {};
        const serializeRecursive = (node: LayoutNode) => {
            const base: Partial<SerializedLayoutNode> = {
                id: node.id,
                type: node.type,
            };
            if (node.type === 'leaf') {
                state[node.id] = {
                    ...base,
                    activeViewId: node.activeViewId,
                } as SerializedLayoutNode;
            } else {
                // SplitNode
                state[node.id] = {
                    ...base,
                    direction: node.direction,
                    splitPercentage: node.splitPercentage,
                    childAId: node.childA.id,
                    childBId: node.childB.id,
                } as SerializedLayoutNode;
                serializeRecursive(node.childA);
                serializeRecursive(node.childB);
            }
        };
        serializeRecursive(this.rootNode);
        // Add root node ID separately
        //state['__root__'] = { id: this.rootNode.id, type: '__root__' };
        state['__root__'] = { id: this.rootNode.id, type: this.rootNode.type };
        return state;
    }

    /** Loads layout state and rebuilds the tree */
    loadLayoutState(state: Record<string, SerializedLayoutNode>): boolean {
        const rootId = state['__root__']?.id;
        if (!rootId) {
            console.error(
                `${F.fcGreen('ViewportLayoutSystem')}: Layout state missing root node ID.`,
            );
            return false;
        }

        const nodeMap = new Map<string, LayoutNode>();

        // Function to reconstruct node from serialized data
        const buildNode = (nodeId: string): LayoutNode | null => {
            if (nodeMap.has(nodeId)) return nodeMap.get(nodeId)!; // Already built

            const serialized = state[nodeId];
            if (!serialized) return null; // Node data missing

            let newNode: LayoutNode;
            if (serialized.type === 'leaf') {
                newNode = {
                    id: serialized.id,
                    type: 'leaf',
                    activeViewId: serialized.activeViewId ?? null,
                    calculatedViewport: new THREE.Vector4(
                        0,
                        0,
                        1,
                        1,
                    ) as ViewportRect, // Will be recalculated
                };
            } else if (serialized.type === 'split') {
                const childA = buildNode(serialized.childAId!);
                const childB = buildNode(serialized.childBId!);
                if (!childA || !childB) return null; // Child build failed

                newNode = {
                    id: serialized.id,
                    type: 'split',
                    direction: serialized.direction!,
                    splitPercentage: serialized.splitPercentage!,
                    childA: childA,
                    childB: childB,
                };
            } else {
                return null; // Unknown type
            }
            nodeMap.set(nodeId, newNode);
            return newNode;
        };

        const newRoot = buildNode(rootId);
        if (newRoot) {
            this.rootNode = newRoot;
            this.recalculateLayout(); // Recalculate viewports and leaf map
            console.log(
                `${F.fcGreen('ViewportLayoutSystem')}: Viewport layout loaded successfully.`,
            );
            return true;
        } else {
            console.error(
                `${F.fcGreen('ViewportLayoutSystem')}: Failed to reconstruct viewport layout from state.`,
            );
            // Revert to default?
            this.rootNode = this.createDefaultLeaf();
            this.recalculateLayout();
            return false;
        }
    }

    //endregion

    // region Calulating Layout

    // Recursively calculates absolute viewport rectangles
    private calculateNodeViewport(
        node: LayoutNode,
        parentRect: ViewportRect,
    ): void {
        if (node.type === 'leaf') {
            node.calculatedViewport.copy(parentRect);
            this.leafNodes.set(node.id, node); // Update map entry
            // console.log(`Calculated viewport for Leaf ${node.id}:`, node.calculatedViewport.toArray());
        } else if (node.type === 'split') {
            const rectA = parentRect.clone();
            const rectB = parentRect.clone();
            const split = node.splitPercentage;

            if (node.direction === 'horizontal') {
                rectA.width *= split; // Left/Top part
                rectB.x += rectA.width; // Right/Bottom part starts where A ends
                rectB.width *= 1 - split;
            } else {
                // Vertical
                rectA.height *= split; // Top/Left part
                rectB.y += rectA.height; // Bottom/Right part starts where A ends
                rectB.height *= 1 - split;
            }
            this.calculateNodeViewport(node.childA, rectA);
            this.calculateNodeViewport(node.childB, rectB);
        }
    }

    // Recalculate the entire layout (call after modification)
    recalculateLayout(): void {
        this.leafNodes.clear(); // Clear old leaf map before recalculating
        this.calculateNodeViewport(
            this.rootNode,
            new THREE.Vector4(0, 0, 1, 1) as ViewportRect,
        );
        // TODO: Emit layout change event?
    }

    // endregion

    // --- API for Modifying Layout ---

    // region Merging leafs

    /** Removes a leaf node and merges its sibling into the parent's space */
    mergeLeaf(leafIdToRemove: ViewportID): boolean {
        const beforeTree = this.getTreeNotation();

        const leafToRemove = this.findLeaf(leafIdToRemove);
        if (!leafToRemove) {
            console.error(
                `${F.fcGreen('ViewportLayoutSystem')}: Cannot merge, leaf node ${leafIdToRemove} not found.`,
            );
            return false;
        }
        if (this.rootNode === leafToRemove) {
            console.warn(
                `${F.fcGreen('ViewportLayoutSystem')}: Cannot merge the root node.`,
            );
            return false; // Cannot merge the root
        }

        const parent = this.findParentOfNode(leafIdToRemove);
        if (!parent) {
            console.error(
                `${F.fcGreen('ViewportLayoutSystem')}: Could not find parent for leaf ${leafIdToRemove} to merge. Tree corrupted?`,
            );
            return false;
        }

        // Determine the sibling node
        const sibling =
            parent.childA === leafToRemove ? parent.childB : parent.childA;

        // Replace the parent split node with the sibling node in the grandparent (or root)
        if (this.rootNode === parent) {
            this.rootNode = sibling;
        } else {
            const grandparent = this.findParentOfNode(parent.id);
            if (!grandparent) {
                console.error(
                    `${F.fcGreen('ViewportLayoutSystem')}: Could not find grandparent for node ${parent.id}. Tree corrupted?`,
                );
                return false;
            }
            if (grandparent.childA === parent) grandparent.childA = sibling;
            else if (grandparent.childB === parent)
                grandparent.childB = sibling;
        }

        // Clean up the removed leaf from the map
        this.leafNodes.delete(leafIdToRemove);

        console.log(
            `${F.fcGreen('ViewportLayoutSystem')}: Merged leaf ${leafIdToRemove}, sibling ${sibling.id} took its place.`,
            `\nTree change: ${beforeTree} → ${this.getTreeNotation()}`,
        );
        this.recalculateLayout();

        // Notify about the merge
        this.notifyChanges('leaf-merged', {
            sourceNodeId: leafIdToRemove,
        });

        return true;
    }

    // endregion

    //region Splitting methods

    // --- API Wrappers for Convenience ---
    splitHorizontal(
        targetLeafId: ViewportID,
        splitPercentage: number = 0.5,
    ): SplitNode | null {
        return this.splitLeaf(targetLeafId, 'horizontal', splitPercentage);
    }

    splitVertical(
        targetLeafId: ViewportID,
        splitPercentage: number = 0.5,
    ): SplitNode | null {
        return this.splitLeaf(targetLeafId, 'vertical', splitPercentage);
    }

    /** Splits a target leaf node */
    splitLeaf(
        targetLeafId: ViewportID,
        direction: 'horizontal' | 'vertical',
        splitPercentage: number = 0.5,
    ): SplitNode | null {
        const beforeTree = this.getTreeNotation();

        const leafToSplit = this.findLeaf(targetLeafId);
        if (!leafToSplit) {
            if (this.findNodeById(targetLeafId)) {
                console.error(
                    `${F.fcGreen('ViewportLayoutSystem')}: Cannot split, node ${targetLeafId} is not a leaf.`,
                );
                return null;
            }
            console.error(
                `${F.fcGreen('ViewportLayoutSystem')}: Cannot split, leaf node ${targetLeafId} not found.`,
            );
            return null;
        }

        const newLeafA = this.createDefaultLeaf();
        const newLeafB = this.createDefaultLeaf(); // New leaf starts empty
        this.assignViewToLeaf(newLeafA.id, leafToSplit.activeViewId);

        const newSplitNode: SplitNode = {
            id: generateId({ prefix: 'ln-' }),
            type: 'split',
            direction,
            splitPercentage,
            childA: newLeafA,
            childB: newLeafB,
        };

        // Replace the old leaf with the new split node in the tree structure
        if (this.rootNode === leafToSplit) {
            this.rootNode = newSplitNode;
        } else {
            const parent = this.findParentOfNode(targetLeafId);
            if (!parent) {
                console.error(
                    `${F.fcGreen('ViewportLayoutSystem')}: Could not find parent for leaf ${targetLeafId}. Tree corrupted?`,
                );
                return null; // Should not happen in a valid tree
            }
            if (parent.childA === leafToSplit) parent.childA = newSplitNode;
            else if (parent.childB === leafToSplit)
                parent.childB = newSplitNode;
        }

        this.leafNodes.delete(targetLeafId); // Remove the old leaf from the map
        this.recalculateLayout(); // Update calculated viewports
        console.log(
            `${F.fcGreen('ViewportLayoutSystem')}: Split leaf ${targetLeafId} into ${newLeafA.id} and ${newLeafB.id}`,
            `\nTree change: ${beforeTree} → ${this.getTreeNotation()}`,
        );

        // Emit split event with relevant data
        this.notifyChanges('leaf-split', {
            sourceNodeId: targetLeafId,
            newNodeIds: [newLeafA.id, newLeafB.id],
            viewId: leafToSplit.activeViewId,
        });

        return newSplitNode;
    }

    // endregion

    /** Assigns an ActiveView ID to a specific leaf node */
    assignViewToLeaf(leafId: ViewportID, activeViewId: string | null): boolean {
        const beforeTree = this.getTreeNotation();

        const leaf = this.findLeaf(leafId);
        if (leaf) {
            leaf.activeViewId = activeViewId;
            console.log(
                `${F.fcGreen('ViewportLayoutSystem')}: Assigned ActiveView ${activeViewId} to Leaf ${leafId}`,
                `\nTree change: ${beforeTree} → ${this.getTreeNotation()}`,
            );

            // Emit view assignment event
            this.notifyChanges('view-assigned', {
                sourceNodeId: leafId,
                viewId: activeViewId,
            });

            return true;
        }
        //  console.log(`${Serializer.serializeToJSON(this)}`);
        console.error(
            `${F.fcGreen('ViewportLayoutSystem')}: Leaf node ${leafId} not found for view assignment.`,
        );
        return false;
    }

    // TODO: Add methods for removing nodes, changing split percentage etc.

    //region Finding leaves or Nodes

    public getRootNode(): LayoutNode {
        return this.rootNode;
    }

    findLeaf(nodeId: ViewportID): LeafNode | undefined {
        return this.leafNodes.get(nodeId);
    }

    findNodeById(
        targetId: string,
        startNode: LayoutNode = this.rootNode,
    ): LayoutNode | null {
        if (startNode.id === targetId) return startNode;
        if (startNode.type === 'split') {
            return (
                this.findNodeById(targetId, startNode.childA) ??
                this.findNodeById(targetId, startNode.childB)
            );
        }
        return null;
    }

    findParentOfNode(
        targetId: string,
        currentNode: LayoutNode = this.rootNode,
        parentNode: SplitNode | null = null,
    ): SplitNode | null {
        if (currentNode.id === targetId) return parentNode;
        if (currentNode.type === 'split') {
            return (
                this.findParentOfNode(
                    targetId,
                    currentNode.childA,
                    currentNode,
                ) ??
                this.findParentOfNode(targetId, currentNode.childB, currentNode)
            );
        }
        return null;
    }

    /** Gets all currently active leaf nodes */
    getActiveLeafs(): LeafNode[] {
        return Array.from(this.leafNodes.values());
    }

    //endregion

    update(deltaTime: number): void {}

    clear(): void {
        const beforeTree = this.getTreeNotation();

        console.log(`${F.fcGreen('ViewportLayoutSystem')}: Removing stuff.`);
        const leafKeys = Array.from(this.leafNodes.keys()).reverse();
        for (const leaf_id of leafKeys) {
            const node = this.leafNodes.get(leaf_id);
            if (node) node.activeViewId = null;
            if (this.rootNode !== node) {
                this.mergeLeaf(leaf_id);
            }
        }

        console.log(
            `${F.fcGreen('ViewportLayoutSystem')}: Cleared all nodes`,
            `\nTree change: ${beforeTree} → ${this.getTreeNotation()}`,
        );
    }
}
