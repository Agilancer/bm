import { CAVE_MOUTH, OPENING, OPENING_ROUTE, OPENING_SPAWN, OPENING_YAW } from '../core/opening.js';

export class Opening {
  constructor(sim) {
    this.sim = sim;
  }

  reset() {
    this.stage = OPENING.NAME;
    this.time = 0;
    const { player, villagers, world } = this.sim;
    [player.x, player.z] = OPENING_SPAWN;
    player.y = world.height(player.x, player.z);
    player.yaw = OPENING_YAW;
    for (const v of villagers) {
      v.route = OPENING_ROUTE;
      v.reset();
      v.yaw = -0.74;
    }
  }

  setStage(stage) {
    this.stage = stage;
    this.time = 0;
  }

  update(dt) {
    const { player, villagers, world } = this.sim;
    this.time += dt;
    if (this.stage === OPENING.LEAVE && player.z < CAVE_MOUTH) this.setStage(OPENING.REVEAL);
    if (this.stage === OPENING.REVEAL && this.time >= 3.2) this.setStage(OPENING.ESCORT);
    const witch = villagers[1];
    const follow = Math.hypot(witch.x - player.x, witch.z - player.z) < 5.3;
    const last = OPENING_ROUTE.at(-1);
    const atTown = Math.hypot(witch.x - last[0], witch.z - last[1]) < 0.4;
    if (this.stage === OPENING.ESCORT && atTown && Math.hypot(player.x - last[0], player.z - last[1]) < 4) this.setStage(OPENING.ARRIVED);
    const walking = (this.stage === OPENING.LEAVE && witch.next < 2)
      || (this.stage === OPENING.ESCORT && follow && !atTown);
    const pretty = villagers[0];
    [pretty.x, pretty.z, pretty.yaw, pretty.next] = [witch.x, witch.z, witch.yaw, witch.next];
    const startled = this.stage === OPENING.NAME && this.time >= 2.25 && this.time < 4.65;
    for (const v of villagers) v.update(dt, world, !walking, startled ? 'afraid' : 'idle');
  }
}
