import { CameraID, ViewConfigID, ViewportID } from '@core/types/viewport';

export type ActiveViewId = string;

/**
 * (Linking Object): Connects Layout, Camera, and Config.
 * Managed by CameraSystem.
 */
export interface ActiveView {
    id: ActiveViewId; // Unique ID for this active view instance
    viewportId: ViewportID;
    cameraId: CameraID;
    viewConfigId: ViewConfigID;
}
