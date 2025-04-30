"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// In a schema-generator.ts file
var TJS = require("typescript-json-schema");
var fs = require("fs");
var path = require("path");
// scripts/generate-json-schema.ts
// Get all system types
var Systems = require("@ecs/systems");
// Setup compiler options
var program = TJS.getProgramFromFiles([path.resolve("src/renderer/ecs/systems/index.ts")], {
    strictNullChecks: true,
});
// Generate schema for each system
Object.entries(Systems).forEach(function (_a) {
    var name = _a[0], system = _a[1];
    if (name.endsWith("System")) {
        var schema = TJS.generateSchema(program, name, {
            required: true,
            noExtraProps: true,
        });
        fs.writeFileSync("./schemas/".concat(name, ".json"), JSON.stringify(schema, null, 2));
    }
});
