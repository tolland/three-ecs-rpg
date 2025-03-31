
# Stuff to do


1. global camera is rotating, whereas the camera should be fixed and the object should be rotating
2. toggle the debug HUD via keystroke
3. contribute module system for debug HUD

need to refactor

- extract physics variables into constants in a separate file
- refactor the long methods
- reload is not working

problems

- devtools not opening reliably, no errors logged

things to implement

- need camera mount component - e.g. HeadMountComponent
- asset loader with configuration file

concepts

- "Game" definition which specifies a World- any game specific rules
- "Level" definition which specifies game map model, player spawn points, any special areas (sound trigger, goal triggers), NPC spawn points and characteristics


## system prompt

I am looking to make something that can be further built upon.
I am interested in designs that naturally are designed to be extended.
I favour designs that are easy to reason about to understand their behaviour.
I am using typescript, rollup, electron, pnpm. IDE is pycharm and I also have vscode
Components should be developed with the idea that in future we will add higher level concepts such as a "Game", "Leverl", "Missions", "Goals", "GameState" (lobby, start, playing, deathscreen, game over) so properties that might be relevant to those should be exposed and be configurable. This includes concepts such as saving game state, teleporting players, admin mode, switching skins, and in game menu s and options. 
