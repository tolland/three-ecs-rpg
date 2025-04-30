
// Define interfaces for the objects we expect to find in the page
export interface Vector2Like {
    isVector2?: boolean;
    x: number;
    y: number;
}

export interface Vector3Like {
    isVector3?: boolean;
    x: number;
    y: number;
    z: number;
}

export interface EulerLike {
    isEuler?: boolean;
    x: number;
    y: number;
    z: number;
    order: string;
}

export interface QuaternionLike {
    isQuaternion?: boolean;
    x: number;
    y: number;
    z: number;
    w: number;
}

export interface MatrixLike {
    isMatrix3?: boolean;
    isMatrix4?: boolean;
    elements: number[];
}

export interface ColorLike {
    isColor?: boolean;
    r: number;
    g: number;
    b: number;
}

export interface Object3DLike {
    isObject3D?: boolean;
    uuid: string;
    name: string;
    type: string;
    visible: boolean;
    children: Object3DLike[];
    position?: Vector3Like;
    rotation?: EulerLike;
    scale?: Vector3Like;
}

export interface ComponentLike {
    constructor: { name: string };
}
