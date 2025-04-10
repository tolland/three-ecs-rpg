// src/renderer/core/ActiveView.ts
import { CameraID, ViewConfigID, ViewportID } from './ViewportLayout';
import { ViewportLayoutSystem } from '@renderer/ecs/systems/ViewportLayoutSystem';
import { generateId } from './ViewportLayout';
import { LayoutEvent } from '@shared/ipc/ips.types';

/**
 * (Linking Object): Connects Layout, Camera, and Config. Managed by CameraSystem.
 */
export interface ActiveView {
    id: string; // Unique ID for this active view instance
    viewportId: ViewportID;
    cameraId: CameraID;
    viewConfigId: ViewConfigID;
}

/**
 * Manages the ActiveView instances and handles layout change events
 */
export class ActiveViewManager {
    private views: Map<string, ActiveView> = new Map();
    private viewsByViewport: Map<ViewportID, ActiveView> = new Map();

    constructor(private layoutSystem: ViewportLayoutSystem) {
        // // Subscribe to relevant layout events
        // this.layoutSystem.addEventListener('leaf-split', this.handleLeafSplit.bind(this));
        // this.layoutSystem.addEventListener('view-assigned', this.handleViewAssigned.bind(this));
    }

    /**
     * Creates a new ActiveView and associates it with a viewport
     */
    createActiveView(
        viewportId: ViewportID,
        cameraId: CameraID,
        viewConfigId: ViewConfigID
    ): ActiveView {
        const id = generateId({ prefix: 'av-' });
        const view: ActiveView = {
            id,
            viewportId,
            cameraId,
            viewConfigId
        };

        this.views.set(id, view);
        this.viewsByViewport.set(viewportId, view);

        return view;
    }

    /**
     * Gets an ActiveView by ID
     */
    getViewById(id: string): ActiveView | undefined {
        return this.views.get(id);
    }

    /**
     * Gets an ActiveView by viewport ID
     */
    getViewByViewport(viewportId: ViewportID): ActiveView | undefined {
        return this.viewsByViewport.get(viewportId);
    }

    /**
     * Handles leaf split events by updating or creating ActiveViews for the new nodes
     */
    private handleLeafSplit(event: LayoutEvent): void {
        if (!event.sourceNodeId || !event.newNodeIds || !event.newNodeIds.length) {
            return;
        }

        // Get the original view if it exists
        const sourceView = this.viewsByViewport.get(event.sourceNodeId);
        if (!sourceView) return;

        // The first new node (childA) inherits the original view's settings
        const newViewportIdA = event.newNodeIds[0];
        this.viewsByViewport.delete(event.sourceNodeId);

        // Update the existing ActiveView to reference the new viewport
        sourceView.viewportId = newViewportIdA;
        this.viewsByViewport.set(newViewportIdA, sourceView);

        // If there's a second new node, create a new ActiveView with the same settings
        if (event.newNodeIds.length > 1) {
            const newViewportIdB = event.newNodeIds[1];
            this.createActiveView(
                newViewportIdB,
                sourceView.cameraId,
                sourceView.viewConfigId
            );
        }
    }

    /**
     * Handles view assignment events
     */
    private handleViewAssigned(event: LayoutEvent): void {
        if (!event.sourceNodeId || event.viewId === undefined) {
            return;
        }

        // If a view ID was assigned to a viewport
        if (event.viewId) {
            const existingView = this.getViewById(event.viewId);
            if (existingView) {
                // Update the existing view's viewport
                existingView.viewportId = event.sourceNodeId;
                this.viewsByViewport.set(event.sourceNodeId, existingView);
            }
        } else {
            // Remove any ActiveView association if viewId is null
            const existingView = this.viewsByViewport.get(event.sourceNodeId);
            if (existingView) {
                this.viewsByViewport.delete(event.sourceNodeId);
            }
        }
    }

    /**
     * Updates the view config for an ActiveView
     */
    updateViewConfig(viewId: string, newConfigId: ViewConfigID): boolean {
        const view = this.views.get(viewId);
        if (view) {
            view.viewConfigId = newConfigId;
            return true;
        }
        return false;
    }

    /**
     * Destroys an ActiveView
     */
    removeView(viewId: string): boolean {
        const view = this.views.get(viewId);
        if (view) {
            this.viewsByViewport.delete(view.viewportId);
            return this.views.delete(viewId);
        }
        return false;
    }

    /**
     * Gets all ActiveView instances
     */
    getAllViews(): ActiveView[] {
        return Array.from(this.views.values());
    }
}
