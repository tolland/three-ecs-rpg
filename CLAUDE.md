# CLAUDE.md

Due to token limits, I have only uploaded a limited number of files for context. Please ask for relevant files to be added to project if they would improve the answer, or provide necessary information.

It's important to keep the project comprehensible. 

Please keep files below 500 lines and use separate utility functions. 

## Build/Test Commands
- Build: `pnpm run build`
- Development: `pnpm run dev`

## Code Style Guidelines
- TypeScript with strict typing, explicit types and no 'any'
- module path aliases (@renderer, @ecs, @components, etc.)
- Follow ECS architecture pattern,  Components should hold data, Systems process data
- types should be in separate declaration file
- Use THREE.Vector3 for 3D vectors and calculations

## Project Goals
- I am looking to make something that can be further built upon, in particular for integration with external tools. I am interested in code architectures that naturally are designed to be extended.
- I favour designs that are easy to reason about to understand their behaviour. Either through clear small pieces of logic in the code, or through debugging and logging, or through dumping state, and exposing values through APIs.
- I am using typescript, rollup, electron, pnpm, jest and threejs.
- Components should be developed with the idea that in future we will add higher level concepts such as a "Game", "Level", "Missions", "Goals", "GameState" (lobby, start, playing, deathscreen, game over) so properties that might be relevant to those should be exposed and be configurable. This includes concepts such as saving game state, teleporting players, admin mode, switching skins, and in game menu s and options. 

Required Features:
- split views, split horizontal and vertical using splitpane hierarchical structure. with standard templates for common patterns, e.g. 2x2
- camera can follow entity, for first or third person, or be world freecam.
- a modular HUD system for the player
- a modular admin screen for interacting with entities
- ability to set parameters dynamically. per entity, globally
- integrate configuration with DBUS
- ability to control entities via non gui means. for example AI or rules based logic.
- configuration file driven game parameters
