// In a schema-generator.ts file
import * as TJS from "typescript-json-schema";
import * as fs from "fs";
import * as path from "path";
// scripts/generate-json-schema.ts

// Get all system types
import * as Systems from "@ecs/systems";

// Setup compiler options
const program = TJS.getProgramFromFiles(
    [path.resolve("src/renderer/ecs/systems/index.ts")],
    {
        strictNullChecks: true,
    }
);

// Generate schema for each system
Object.entries(Systems).forEach(([name, system]) => {
    if (name.endsWith("System")) {
        const schema = TJS.generateSchema(program, name, {
            required: true,
            noExtraProps: true,
        });

        fs.writeFileSync(
            `./schemas/${name}.json`,
            JSON.stringify(schema, null, 2)
        );
    }
});
