# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Due to token limits, I have only uploaded a limited number of files for context. Please ask for relevant files to be added to project if they would improve the answer, or provide necessary information.

It's important to keep the project comprehensible. So large files are bad. Ideally below 500 lines. There are some critical areas such as CameraSystems, Layout services, which might naturally get quite big. But generally split out utility functions to separate files.

## Build/Test Commands
- Build: `pnpm run build`
- Development: `pnpm run dev`
- Lint/TypeCheck: `pnpm run lint`
- Format: `pnpm run format`
- Run single test: `npx jest src/path/to/file.test.ts`
- Package for distribution: `pnpm run package`

## Code Style Guidelines
- TypeScript with strict typing
- Use module path aliases (@renderer, @ecs, @components, etc.)
- Follow ECS architecture pattern
- Tests should use Jest with descriptive test names
- Prefer explicit types and no 'any'
- types should be in separate declaration file
- Use THREE.Vector3 for 3D vectors and calculations
- Components should hold data, Systems process data
- Code organization follows src/main, src/preload, src/renderer, src/shared structure
- Tests should follow the pattern of specific test cases with clear assertions

## Notes
- don't make changes to pointerlock casually, it produces security errors in electron unless carefully done

## Project Goals
- I am looking to make something that can be further built upon, in particular for integration with external tools. I am interested in code architectures that naturally are designed to be extended.
- I favour designs that are easy to reason about to understand their behaviour. Either through clear small pieces of logic in the code, or through debugging and logging, or through dumping state, and exposing values through APIs.
- I am using typescript, rollup, electron, pnpm, jest and threejs. IDE is webstorm and I also have vscode and pycharm if required
- Components should be developed with the idea that in future we will add higher level concepts such as a "Game", "Level", "Missions", "Goals", "GameState" (lobby, start, playing, deathscreen, game over) so properties that might be relevant to those should be exposed and be configurable. This includes concepts such as saving game state, teleporting players, admin mode, switching skins, and in game menu s and options. 


This is a project to build an extendable platform for simple games in threejs. The purpose is to build a platform where the playable characters and NPCs can be driven by integration with AI or scripted through DBUS. The technology stack is typescript, pnpm, rollup, electron, threejs. The aim is to develop a relatively simple ECS system.
Required Features:
- split views, split horizontal and vertical using splitpane hierarchical structure. with standard templates for common patterns, e.g. 2x2
- camera can follow entity, for first or third person, or be world freecam.
- a modular HUD system for the player
- a modular admin screen for interacting with entities
- ability to set parameters dynamically. per entity, globally
- integrate configuration with DBUS
- ability to control entities via non gui means. for example AI or rules based logic.
- configuration file driven game parameters
