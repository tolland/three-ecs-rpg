
# Stuff to do


1. global camera is rotating, whereas the camera should be fixed and the object should be rotating ?? is it still doing this?
2. toggle the debug HUD via keystroke
3. contribute module system for debug HUD
4. global speed limit. to somewhat avoid overshooting collision checks



need to refactor

- extract physics variables into constants in a separate file
- refactor the long methods
- reload is not working

problems

- devtools not opening reliably, no errors logged

things to implement

- need camera mount component - e.g. HeadMountComponent
- asset loader with configuration file
- volume control
- stats.js style hud
- modular lobby menu systems. credits/licenses screen 

concepts

- "Game" definition which specifies a World- any game specific rules
- "Level" definition which specifies game map model, player spawn points, any special areas (sound trigger, goal triggers), NPC spawn points and characteristics


things

- How to slow down game consistently. 

## system prompt

I am looking to make something that can be further built upon.
I am interested in designs that naturally are designed to be extended.
I favour designs that are easy to reason about to understand their behaviour.
I am using typescript, rollup, electron, pnpm. IDE is pycharm and I also have vscode
Components should be developed with the idea that in future we will add higher level concepts such as a "Game", "Leverl", "Missions", "Goals", "GameState" (lobby, start, playing, death screen, game over) so properties that might be relevant to those should be exposed and be configurable. This includes concepts such as saving game state, teleporting players, admin mode, switching skins, and in game menu s and options.
Always use types where possible. If calling javascript methods, we should add proper types. Functionality should be testable where possible. I favour tests that create well know environments, and then call dbus methods which call actions, and then call dbus methods which inspect state as a result. However, there is likely testing within the threeJS and electronjs ecosystem that could be implemented

# first prompt

I would like a to build an ECS system for threejs for a roleplaying world. The purpose is to integrate with other tools to drive the events and dynamics.
Initially the player plays the protagonist, but has the option to switch to the NPC character point of view.
The system should support split screen to show multiple cameras.
I would like to extend the split screen idea to allow seeing the scene from multiple character point of view
I am using the assets from https://threejs.org/examples/  which uses a GLTF world called  collision-world.glb which is an Octree structure with ramps and walls.  for the player and npc and world.
Initially I want a component system that supports Gravity, Collisions, WASD+ctrl+space input, pointerlock component that can be moved from each GameObject.
Please create a project that implements those goals and allows for the development of these features on top of the foundaton
