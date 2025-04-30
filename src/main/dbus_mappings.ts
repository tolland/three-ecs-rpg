import * as dbus from 'dbus-next';

// Example usage
const propertyOptions: dbus.interface.PropertyOptions = {
    signature: 's',
    access: 'read',
};

type DBUSMethodSignature = {
    properties?: { [key: string]: dbus.interface.PropertyOptions };
    methods?: { [key: string]: dbus.interface.MethodOptions };
    signals?: { [key: string]: dbus.interface.SignalOptions };
};

export const DBUS_MAPPINGS: DBUSMethodSignature = {
    methods: {
        ListEntities: { inSignature: '', outSignature: 'a(is)' }, // Array of Int/String Tuples
        ListComponents: { inSignature: 'i', outSignature: 'as' },
        ListSystems: { inSignature: '', outSignature: 'a(ss)' },
        GetComponentData: { inSignature: 'is', outSignature: 's' },
        SetComponentData: { inSignature: 'iss', outSignature: 's' },
        PauseGame: { inSignature: '', outSignature: '' },
        QuitGame: { inSignature: '', outSignature: '' },
        ToggleDebugHUD: { inSignature: '', outSignature: '' },
        ToggleDebugVisuals: { inSignature: '', outSignature: '' }, // Add signature
        SetPhysicsValue: { inSignature: 'sv', outSignature: '' },
        SetTimeScale: { inSignature: 'd', outSignature: '' }, // 'd' for double float
        Reload: { inSignature: '', outSignature: '' },
        SetCameraThirdPersonGlobal: {
            inSignature: '',
            outSignature: '',
        },
        GetViewportLayout: {
            inSignature: '',
            outSignature: 's',
        },
        // generic system json dumper method
        GetSystemData: { inSignature: 's', outSignature: 's' }, // String -> String (JSON)
        GetLayout: { inSignature: '', outSignature: 's' },
        SetLayout: { inSignature: 's', outSignature: 'b' }, // String -> Boolean
        SendAppAction: { inSignature: 's', outSignature: '' },
    },
    // methods: {
    //     ListEntities: { inSignature: '', outSignature: 's' }, // Array of Dicts {Int32: String}
    //     ListSomething: { inSignature: '', outSignature: 's' },
    //     ListComponents: { inSignature: 'i', outSignature: 's' }, // blob of json string
    //     GetComponentData: { inSignature: 'is', outSignature: 's' }, // Int32, String -> String (JSON)
    //     // Control methods
    //     PauseGame: { inSignature: '', outSignature: '' },
    //     ToggleDebugHUD: { inSignature: '', outSignature: '' },
    //     SetPhysicsValue: { inSignature: 'sv', outSignature: '' }, // String, Variant -> None
    // },
    // properties: { ... }, // Can also define properties
    // signals: { ... }, // Can define signals
};
