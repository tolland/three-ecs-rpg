# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
