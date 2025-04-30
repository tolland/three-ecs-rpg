import { ActiveViewId } from '@core/types/activeView';

type SaveFileOptions = {
    indent?: number;
    overwrite?: boolean;
    encoding?: string;
    format?: 'json' | 'yaml' | 'xml';
    compress?: boolean;
};

// Define layout event types
export type LayoutEventType =
    | 'leaf-split'
    | 'leaf-merged'
    | 'view-assigned'
    | 'layout-recalculated';

export interface LayoutEvent {
    type: LayoutEventType;
    sourceNodeId?: ViewportID;
    newNodeIds?: ViewportID[];
    activeViewId?: ActiveViewId | null;
    message?: string;
}

export type LayoutEventListener = (event: LayoutEvent) => void;
