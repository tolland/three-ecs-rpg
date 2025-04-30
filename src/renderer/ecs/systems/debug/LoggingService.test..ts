import { LoggingService } from './LoggingService';

async function loggingServiceTest() {
    const loggingService = LoggingService.getInstance();

    // Test vector updates
    const testUpdates = [
        {
            entityId: 1,
            type: 'position' as const,
            x: 10.5,
            y: 20.3,
            z: 30.7,
            timestamp: Date.now(),
        },
        {
            entityId: 2,
            type: 'velocity' as const,
            x: 1.2,
            y: 2.3,
            z: 3.4,
            timestamp: Date.now(),
        },
        {
            entityId: 3,
            type: 'force' as const,
            x: 100.0,
            y: 200.0,
            z: 300.0,
            timestamp: Date.now(),
        },
    ];

    console.log('Testing Graylog logging...');

    for (const update of testUpdates) {
        try {
            await loggingService.logVectorUpdate(update);
            console.log(
                `Successfully logged ${update.type} update for entity ${update.entityId}`,
            );
        } catch (error) {
            console.error(`Failed to log ${update.type} update:`, error);
        }
    }
}

// Run the test
loggingServiceTest().catch(console.error);
