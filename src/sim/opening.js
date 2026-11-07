import { openingBeat } from '../core/opening-script.js';
import { CAVE_MOUTH, OPENING, OPENING_ROUTE, OPENING_SPAWN, OPENING_YAW, REVEAL_END } from '../core/opening.js';
import { wrapAngle } from '../core/math.js';

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
      v.yaw = -1.12;
    }
  }

  setStage(stage) {
    this.stage = stage;
    this.time = 0;
  }

  update(dt) {
    const { player, villagers, world } = this.sim;
    this.time += dt;
    const witch = villagers[1];
    if (this.stage === OPENING.LEAVE && player.z < CAVE_MOUTH - 0.65 && witch.next >= 2) this.setStage(OPENING.REVEAL);
    if (this.stage === OPENING.REVEAL && this.time >= REVEAL_END) this.setStage(OPENING.ESCORT);
    const follow = Math.hypot(witch.x - player.x, witch.z - player.z) < 7;
    const last = OPENING_ROUTE.at(-1);
    const atTown = Math.hypot(witch.x - last[0], witch.z - last[1]) < 0.4;
    if (this.stage === OPENING.ESCORT && atTown && Math.hypot(player.x - last[0], player.z - last[1]) < 4) this.setStage(OPENING.ARRIVED);
    const walking = (this.stage === OPENING.LEAVE && this.time >= 4.2 && witch.next < 2)
      || (this.stage === OPENING.ESCORT && follow && !atTown);
    const beat = openingBeat(this.stage, this.time);
    let gesture = beat?.gesture ?? 'idle';
    // The player is speaking: hold the last reaction instead of greeting them.
    if (beat?.who === 'player') gesture = 'scared_02';
    if (!walking) {
      const angle = this.stage === OPENING.NAME && (this.time < 3.5 || (this.time >= 12.1 && this.time < 13.5)) ? -1.12
        : this.stage === OPENING.LEAVE ? -Math.PI + 0.2
        : Math.atan2(player.x - witch.x, player.z - witch.z);
      witch.yaw += wrapAngle(angle - witch.yaw) * Math.min(1, dt * 5);
    }
    const pretty = villagers[0];
    [pretty.x, pretty.z, pretty.yaw, pretty.next] = [witch.x, witch.z, witch.yaw, witch.next];
    for (const v of villagers) v.update(dt, world, !walking, gesture, 1.25);
  }
}
