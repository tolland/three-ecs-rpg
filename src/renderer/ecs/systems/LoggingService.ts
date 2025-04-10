import axios from 'axios';

// @TODO need some optional config loader.
const GRAYLOG_SERVER = 'http://graylog.lan:12202/gelf';
const INITIAL_RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRY_DELAY = 60000; // 1 minute

interface VectorUpdate {
    entityId: number;
    type: 'position' | 'velocity' | 'force';
    x: number;
    y: number;
    z: number;
    timestamp: number;
}

export class LoggingService {
    private static instance: LoggingService;
    private enabled: boolean = false;

    // --- Backoff State ---
    private isGraylogReachable: boolean = true;
    private currentRetryDelay: number = INITIAL_RETRY_DELAY;
    private retryTimeoutId: NodeJS.Timeout | null = null;
    // Flag to log the "connection restored" message only once
    private loggedConnectionRestored: boolean = true;
    // --- End Backoff State ---

    private constructor() {}

    public static getInstance(): LoggingService {
        if (!LoggingService.instance) {
            LoggingService.instance = new LoggingService();
        }
        return LoggingService.instance;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled && this.retryTimeoutId) {
            // Clear pending retry if logging is disabled
            clearTimeout(this.retryTimeoutId);
            this.retryTimeoutId = null;
            this.resetBackoffState(); // Reset state when disabling
        }
    }

    // Helper to reset the backoff state variables
    private resetBackoffState(): void {
        this.isGraylogReachable = true;
        this.currentRetryDelay = INITIAL_RETRY_DELAY;
        if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId);
            this.retryTimeoutId = null;
        }
    }

    public async logVectorUpdate(update: VectorUpdate): Promise<void> {
        if (!this.enabled) {
            // console.log('Logging disabled, skipping vector update.');
            return;
        }

        // If we know Graylog is down, don't even try sending immediately
        if (!this.isGraylogReachable) {
            // console.warn('Graylog unreachable, skipping log send for:', update);
            // Optionally queue the log here if needed, but this example just drops it
            return;
        }

        const payload = {
            version: '1.1',
            host: 'three-ecs-rpg-renderer', // Indicate source is renderer
            short_message: `Vector update for entity ${update.entityId}`,
            level: 6, // Informational
            _entityId: update.entityId,
            _vectorType: update.type,
            _x: update.x,
            _y: update.y,
            _z: update.z,
            _timestamp: update.timestamp, // Use provided timestamp
        };

        try {
            await axios.post(GRAYLOG_SERVER, payload, {
                timeout: 2000, // Add a short timeout for the request itself
            });

            // If successful after a period of being down, reset state and log
            if (!this.loggedConnectionRestored) {
                console.log('LoggingService: Connection to Graylog restored.');
                this.resetBackoffState(); // Fully reset state on success
                this.loggedConnectionRestored = true;
            }
        } catch (error: any) {
            // Check if it's the *first* time we detect an issue
            if (this.isGraylogReachable) {
                console.error(
                    `LoggingService: Failed to send log to Graylog. Initiating backoff. Error: ${error.message || error}`,
                );
                this.isGraylogReachable = false;
                this.loggedConnectionRestored = false; // Mark that we need to log restoration later

                // Clear any existing timeout just in case (shouldn't happen often)
                if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);

                // Schedule the first reconnection attempt
                this.scheduleReconnectAttempt();
            } else {
                // If already known to be unreachable, log less verbosely or not at all
                // console.warn(`LoggingService: Still unable to reach Graylog. Log dropped.`);
            }

            // Re-throw or handle the error further if needed by the caller
            // For now, we just absorb it to prevent app crashes due to logging failures
        }
    }

    private scheduleReconnectAttempt(): void {
        // Ensure logging is still enabled before scheduling
        if (!this.enabled) return;

        this.retryTimeoutId = setTimeout(() => {
            console.log(
                `LoggingService: Attempting to reconnect to Graylog (delay: ${this.currentRetryDelay}ms)...`,
            );
            this.attemptReconnect();
        }, this.currentRetryDelay);
    }

    // Tries to send a minimal "ping" message to see if Graylog is back
    private async attemptReconnect(): Promise<void> {
        // Ensure logging is still enabled
        if (!this.enabled) return;

        const pingPayload = {
            version: '1.1',
            host: 'three-ecs-rpg-renderer-ping',
            short_message: 'LoggingService reconnect attempt',
            level: 7, // Debug level
        };

        try {
            await axios.post(GRAYLOG_SERVER, pingPayload, { timeout: 2000 });
            // SUCCESS!
            console.log(
                'LoggingService: Reconnect successful. Resuming normal logging.',
            );
            this.resetBackoffState();
            this.loggedConnectionRestored = true; // Mark as restored
        } catch (error: any) {
            // Still failing
            console.warn(
                `LoggingService: Reconnect attempt failed. Error: ${error.message || error}`,
            );
            // Increase delay for next attempt
            this.currentRetryDelay = Math.min(
                this.currentRetryDelay * 2,
                MAX_RETRY_DELAY,
            );
            this.scheduleReconnectAttempt(); // Schedule the next try
        }
    }
}
