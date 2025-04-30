// src/renderer/ecs/components/controls/PlayerControlledComponent.ts
import { Component } from '@ecs/Component';

/**
 * Marker component to designate the entity currently controlled
 * by the player, and that the entity is on the ground, so to send the
 * input to ground based movement. Not being used I think until flying
 * is implemented
 */
export class PlayerControlGroundedComponent extends Component {}
