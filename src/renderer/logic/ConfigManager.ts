import { SaveFileOptions } from '@shared/ipc/ips.types';
import { JsonValue } from '@shared/types/serialization';

class SaveResult {
}

/**
 * Saves configuration to a file using Electron IPC
 */
export async function saveConfig(
    filename: string,
    data: Record<string, unknown> | string | unknown[] | JsonValue,
    format: 'json' | 'yaml' | 'yml' | 'text' | 'txt' = 'json',
    options: SaveFileOptions = {},
): Promise<SaveResult> {
    try {
        const result = await window.electronIPC.invoke('save-file', {
            filename,
            data,
            format,
            options,
        });

        if (result.success) {
            console.log(`File saved successfully at: ${result.path}`);
        } else {
            console.error(`Failed to save file: ${result.error}`);
        }

        return result;
    } catch (error) {
        console.error('Error saving file:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Reads a file using Electron IPC
 * @param filePath The file path to read
 */
export async function readFile(filePath: string): Promise<string> {
    try {
        const result = await window.electronIPC.invoke('read-file', {
            filePath,
        });
        if (!result.success) {
            throw new Error(result.error || 'Failed to read file');
        }
        return result.content;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
}
