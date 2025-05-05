


// Enhanced AppObject Discovery
export function discoverAppObjects() {
    console.group('[Bridge] Searching for application objects');

    // Check common global properties
    const keyChecks = {
        'scene': ['scene', 'gameScene', 'mainScene', 'appScene', 'threeScene'],
        'renderer': ['renderer', 'threeRenderer', 'webGLRenderer'],
        'world': ['world', 'ecsWorld', 'gameWorld', 'entityWorld'],
        'debug': ['__ecsDebug', 'debug', 'debugTools', 'devTools']
    };

    // Check for each type of object
    for (const [type, keys] of Object.entries(keyChecks)) {
        for (const key of keys as string[]) {
            // @ts-ignore
            if (typeof window[key] !== 'undefined') {
                console.log(`✅ Found ${type} object at window.${key}`);
            }
        }
    }

    // Check if we can directly access the world
    const worldAttempts = [
        () => window.world,
        () => window.__ecsDebug?.managers?.get('WorldManager')?.world,
        () => window.__ecsDebug?.world,
        () => window.game?.world,
        () => window.app?.world
    ];

    for (let i = 0; i < worldAttempts.length; i++) {
        try {
            const world = worldAttempts[i]();
            if (world) {
                console.log(`✅ Found world object using attempt #${i+1}`);
                console.log('World properties:', Object.keys(world));
                // Check for key ECS properties
                if (world.entities) console.log('✅ World has entities property');
                if (world.systems) console.log('✅ World has systems property');
                if (typeof world.createEntity === 'function') console.log('✅ World has createEntity method');
                if (typeof world.addSystem === 'function') console.log('✅ World has addSystem method');
                break;
            }
        } catch (e) {
            console.log(`❌ World attempt #${i+1} failed:`, e instanceof Error ? e.message : 'Unknown error');
        }
    }

    console.groupEnd();

    // Check for message passing functionality
    console.group('[Bridge] Testing message passing');
    try {
        // Send a test message to see if we can communicate
        window.postMessage({
            source: 'three-ecs-bridge',
            data: {
                type: 'debug-test',
                message: 'Bridge script is loaded and executing',
                timestamp: Date.now()
            }
        }, '*');
        console.log('✅ Test message sent');

        // Add listener to see if messages are being received
        const testListener = (event: { data: { source: string } }) => {
            if (event.data && event.data.source === 'three-ecs-devtools') {
                console.log('✅ Received message from DevTools:', event.data);
                window.removeEventListener('message', testListener);
            }
        };
        window.addEventListener('message', testListener);
        console.log('✅ Message listener added');
    } catch (e) {
        console.error('❌ Error in message passing test:', e);
    }
    console.groupEnd();
}
