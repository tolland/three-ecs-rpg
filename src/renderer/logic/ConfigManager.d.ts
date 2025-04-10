/**
 * Interface for save file options
 */
export interface SaveFileOptions {
    indent?: number;

    [key: string]: any;
}

/**
 * Interface for save result
 */
export interface SaveResult {
    success: boolean;
    path?: string;
    error?: string;
}
