// The held staff: VIEWMODEL with a light of its own in its power point, the orb or gem placed by tools/staffeffects
// (src/items/staffcores.js). Twenty kinds, one per staff (src/items/staffeffects.js). They live in q, the point's own unit
// sphere laid across the eye's view of it (across x, up y, toward the eye z), so they stay in the stone through every swing
// and a pupil or a sun's face looks back at you however the staff is held.
import { VIEWMODEL } from './materials.js';

const STAFF_FX = /* wgsl */ `
fn fbm2(p: vec2f) -> f32 { return vn2(p) * 0.55 + vn2(p * 2.03 + 7.1) * 0.3 + vn2(p * 4.1 + 3.3) * 0.15; }
fn ringAt(x: f32, at: f32, w: f32) -> f32 { let d = (x - at) / w; return exp(-d * d); }
fn wrapA(a: f32) -> f32 { return a - 6.2831853 * floor((a + 3.14159265) / 6.2831853); }
// A soft point somewhere in each cell of g, some cells only: a spark, a mote, a glint. s: its size, as a share of the cell.
fn speck(g: vec2f, keep: f32, s: f32, stretch: f32) -> f32 {
  let cell = floor(g);
  let h = h2(cell);
  let at = vec2f(h2(cell + 1.7), h2(cell + 4.2)) * 0.6 + 0.2;
  let d = (fract(g) - at) * vec2f(1.0, 1.0 / stretch);
  let size = s * (0.55 + 0.9 * h2(cell + 9.1));
  return step(1.0 - keep, h) * exp(-dot(d, d) / (size * size));
}

// rgb: the light; a: how much of the stone's own paint it swallows (a void, a pupil, the moon's dark side, a crust).
// Every kind changes visibly within a second: a light that doesn't move reads as paint.
fn staffLight(kind: u32, q: vec3f, t: f32, A: vec3f, B: vec3f, fres: f32) -> vec4f {
  let p = q.xy;
  let rad = length(p);
  let ang = atan2(p.y, p.x);
  let inner = clamp(1.0 - rad, 0.0, 1.0);
  var e = vec3f(0.0);
  var dark = 0.0;
  switch kind {
    case 0u: {
      // Ember: a coal that gutters and flares, and thin sparks streaming up off it.
      let gutter = 0.55 + 0.45 * vn2(vec2f(t * 4.0, 1.0)) + 0.2 * sin(t * 7.0);
      e = A * (0.12 + 1.3 * inner * inner * gutter);
      let s = speck(vec2f(p.x * 5.0, p.y * 2.5 - t * 2.6), 0.4, 0.09, 3.0) * (0.5 + 0.5 * sin(t * 13.0 + p.x * 20.0));
      e += mix(A, B, 0.7) * s * 2.4;
      dark = (1.0 - inner) * 0.35;
    }
    case 1u: {
      // Magma: a near-black crust over the heart, cracked by thin seams that run deep red at their edges and orange-gold down
      // their middles (never white: white seams read as plaster), and one small hot heart pulsing slowly behind it all.
      let n = abs(fbm2(p * 2.2 + vec2f(-t * 0.12, -t * 0.3)) - 0.5);
      let seam = 1.0 - smoothstep(0.0, 0.07, n);
      let core = 1.0 - smoothstep(0.0, 0.025, n);
      let flick = 0.8 + 0.3 * vn2(vec2f(t * 5.0, p.x * 3.0));
      let ramp = mix(vec3f(0.55, 0.04, 0.0), vec3f(1.0, 0.55, 0.1), core);
      let pulse = 0.65 + 0.35 * sin(t * 1.9);
      e = ramp * seam * flick * 1.5 * smoothstep(1.0, 0.35, rad);
      e += vec3f(1.0, 0.62, 0.22) * pow(inner, 5.0) * pulse * 1.1;
      dark = (1.0 - seam) * 0.88;
    }
    case 2u: {
      // Frost: a cold heart, bright in the middle and dark at the facets, rime creeping at its edge, and a glint or two.
      let breathe = 0.75 + 0.25 * sin(t * 2.2);
      // (The very heart goes white-cyan, so it outshines ice painted the same blue as its light.)
      e = mix(A, B, pow(inner, 3.0) * 0.65) * (0.06 + 1.5 * pow(inner, 1.8) * breathe);
      let rime = smoothstep(0.58, 0.78, fbm2(p * 5.0 + vec2f(t * 0.12, 0.0))) * smoothstep(0.45, 0.95, rad);
      e += B * rime * 0.7;
      let glint = speck(p * 3.2 + vec2f(floor(t * 1.5) * 1.37, 0.0), 0.35, 0.07, 1.0);
      e += B * glint * 2.0;
      dark = smoothstep(0.35, 0.9, rad) * 0.4;
    }
    case 3u: {
      // Aurora: curtains of the northern sky hung inside the ice, rippling, dark sky between.
      let bend = fbm2(vec2f(p.x * 1.8 + t * 0.6, p.y * 0.8 - t * 0.25));
      let band = sin(p.y * 7.0 + bend * 7.0 + t * 1.4);
      let curtain = smoothstep(0.35, 1.0, band) * (0.5 + 0.5 * vn2(vec2f(p.x * 9.0 + t * 2.0, 0.5)));
      let col = mix(A, B, 0.5 + 0.5 * sin(p.x * 2.5 + t * 0.9));
      e = col * curtain * 1.6 * (0.75 + 0.35 * sin(t * 3.4));
      dark = (1.0 - curtain) * 0.45;
    }
    case 4u: {
      // Storm: a charged fog, struck through every so often by forks from the centre to the edge.
      let seed = floor(t * 6.0);
      let on = step(0.4, h2(vec2f(seed, 9.0)));
      e = A * (0.15 + 0.3 * fbm2(p * 3.0 + vec2f(t * 1.2, t * 0.5))) * inner;
      var bolt = 0.0;
      for (var i = 0; i < 3; i++) {
        let fi = f32(i);
        let a0 = h2(vec2f(seed, fi * 3.1)) * 6.2831853;
        let jit = (fbm2(vec2f(rad * 5.0, seed * 1.3 + fi * 11.0)) - 0.5) * 2.2;
        let da = abs(wrapA(ang - a0 - jit * rad));
        bolt = max(bolt, (1.0 - smoothstep(0.0, 0.05, da * max(rad, 0.1))) * smoothstep(1.0, 0.7, rad));
      }
      e += B * bolt * on * 2.6 + A * on * 0.4 * inner;
      dark = 0.3 * (1.0 - on);
    }
    case 5u: {
      // Void: a black hole at the heart that eats the light, a thin rim round it, and the light spiralling in.
      // (The arms wind inward, toward the hole.)
      let swirl = sin(ang * 3.0 + log(max(rad, 0.03)) * 5.0 + t * 3.2);
      let arms = smoothstep(0.45, 1.0, swirl) * smoothstep(0.35, 0.6, rad) * (1.0 - smoothstep(0.85, 1.05, rad));
      let lip = ringAt(rad, 0.42 + 0.03 * sin(t * 3.0), 0.04);
      e = A * arms * 1.4 + mix(A, B, 0.6) * lip * (3.2 + 0.8 * sin(t * 4.1));
      dark = max((1.0 - smoothstep(0.3, 0.42, rad)) * 0.98, (1.0 - arms) * 0.35);
    }
    case 6u: {
      // Eye: a bright iris with a hard black slit that looks about, and now and then a blink.
      let look = floor(t * 0.7);
      let tgt = (vec2f(h2(vec2f(look, 1.0)), h2(vec2f(look, 2.0))) - 0.5) * vec2f(0.34, 0.18);
      let s = p - tgt;
      let wide = 0.11 + 0.05 * sin(t * 1.7);
      let pupil = 1.0 - smoothstep(0.8, 1.0, length(vec2f(s.x / wide, s.y / 0.6)));
      let fib = vn2(vec2f(cos(ang), sin(ang)) * 7.0 + vec2f(rad * 3.0, 0.0));
      let iris = (0.5 + 0.8 * fib) * smoothstep(0.95, 0.3, rad);
      let blinkP = fract(t / 4.1);
      let shut = smoothstep(0.0, 0.035, blinkP) * (1.0 - smoothstep(0.06, 0.11, blinkP));
      let lid = smoothstep(1.0 - shut * 1.05, 1.08 - shut * 1.05, abs(p.y));
      e = (A * iris * 1.4 + B * ringAt(rad, 0.9, 0.06)) * (1.0 - pupil) * (1.0 - lid);
      dark = max(pupil, lid * 0.95);
    }
    case 7u: {
      // Heartbeat: lub-dub, dark between, each beat a swell running out from the middle.
      let ph = fract(t / 1.0);
      let lub = exp(-ph * 12.0);
      let dub = select(0.0, exp(-(ph - 0.24) * 12.0) * 0.75, ph > 0.24);
      let thump = lub + dub;
      let wave = ringAt(rad, ph * 1.6, 0.16) * (1.0 - ph);
      let vein = 1.0 - smoothstep(0.0, 0.06, abs(vn2(p * 3.5 + 2.0) - 0.5));
      e = A * (0.04 + 2.2 * thump * (1.0 - 0.6 * rad)) + B * wave * 1.2 + A * vein * thump * 1.2;
      dark = (1.0 - thump) * 0.55;
    }
    case 8u: {
      // Sap: amber running down inside the stone in slow threads, gathering at the bottom.
      let s = vn2(vec2f(p.x * 6.0, p.y * 1.6 + t * 0.9)) * 0.7 + vn2(vec2f(p.x * 13.0, p.y * 3.0 + t * 1.5)) * 0.3;
      let thread = smoothstep(0.56, 0.8, s);
      let pool = smoothstep(0.1, -0.7, p.y);
      e = A * 0.18 * inner + B * (thread * 1.5 + pool * 0.6) * (0.75 + 0.35 * sin(t * 3.0));
      dark = (1.0 - thread) * 0.3;
    }
    case 9u: {
      // Spores: soft motes of all sizes drifting about over a dim, mossy heart.
      e = A * 0.12 * (0.3 + inner);
      var m = 0.0;
      for (var i = 0; i < 7; i++) {
        let fi = f32(i);
        let at = vec2f(sin(t * (0.7 + 0.13 * fi) + fi * 2.1), cos(t * (0.55 + 0.11 * fi) + fi * 1.37)) * 0.6;
        let d = length(p - at);
        let size = 0.006 + 0.012 * h2(vec2f(fi, 3.0));
        m += exp(-d * d / size) * (0.5 + 0.5 * sin(t * 4.0 + fi * 1.9));
      }
      e += B * m * 1.9 * (0.75 + 0.35 * sin(t * 3.7));
      dark = 0.4;
    }
    case 10u: {
      // Sunflare: a hot heart that keeps its colour, rays turning out of it, a flickering corona.
      let rays = pow(0.5 + 0.5 * sin(ang * 12.0 + t * 1.3), 5.0) * (0.55 + 0.45 * sin(ang * 5.0 - t * 2.0));
      let flick = 0.85 + 0.15 * vn2(vec2f(t * 6.0, 2.0));
      e = mix(A, B, 0.25) * pow(inner, 1.6) * 0.7 * flick + A * rays * smoothstep(0.2, 0.65, rad) * (1.0 - smoothstep(0.85, 1.0, rad)) * 1.4;
      // (A darker field between the rays, so the corona has structure instead of a white disc.)
      dark = 0.35 * (1.0 - rays) * smoothstep(0.2, 0.5, rad);
      e += B * ringAt(rad, 0.62, 0.06) * (0.5 + 0.5 * sin(ang * 3.0 + t * 2.5)) * 0.8;
    }
    case 11u: {
      // Moonphase: a lit crescent that waxes to a fat half and wanes back to a sliver, its terminator sweeping across the face
      // you see; the dark side near black with a cold earthshine, the lit side cratered, darker at its limb, never white,
      // and a moonstone's pearly sheen sliding blue to lilac over it.
      let nrm = normalize(q + vec3f(0.0, 0.0, 0.001));
      let ph = 2.0 + 0.8 * sin(t * 0.55);
      let L = vec3f(sin(ph), 0.12, cos(ph));
      let side = dot(nrm, normalize(L));
      let lit = smoothstep(-0.05, 0.08, side);
      let mare = 0.72 + 0.4 * vn2(p * 4.0 + 3.0);
      let limb = 0.55 + 0.45 * clamp(nrm.z, 0.0, 1.0);
      let sheen = mix(vec3f(0.45, 0.6, 1.0), vec3f(0.8, 0.55, 1.0), 0.5 + 0.5 * sin(t * 0.8 + p.x * 3.0 + p.y * 2.0));
      e = mix(A, B, 0.4) * 0.95 * lit * mare * limb + sheen * lit * 0.14 * (0.6 + 0.4 * sin(t * 1.3 + p.y * 4.0));
      e += A * ringAt(side, 0.03, 0.05) * 0.5 + A * 0.025 * (1.0 - lit);
      dark = 0.6 + (1.0 - lit) * 0.38;
    }
    case 12u: {
      // Starfield: a deep sky held in the stone, turning, its stars twinkling.
      let c = cos(t * 0.25); let sn = sin(t * 0.25);
      let r = vec2f(c * p.x - sn * p.y, sn * p.x + c * p.y);
      let star = speck(r * 8.0, 0.3, 0.1, 1.0) * (0.35 + 0.65 * sin(t * 4.0 + r.x * 30.0));
      let neb = fbm2(r * 1.8 + 4.0);
      e = mix(A, B, smoothstep(0.4, 0.8, neb)) * neb * neb * 1.2 + B * star * 2.4;
      dark = 0.6;
    }
    case 13u: {
      // Sand: a stream of glowing grains falling through the waist, the heaps below and above aglow.
      let column = exp(-p.x * p.x / 0.008);
      let grain = speck(vec2f(p.x * 26.0, p.y * 14.0 + t * 9.0), 0.6, 0.18, 1.6);
      let heaps = smoothstep(0.35, 0.95, abs(p.y));
      e = A * (0.15 + 0.6 * heaps * (0.8 + 0.2 * sin(t * 2.0))) + B * column * (0.25 + grain * 2.2);
    }
    case 14u: {
      // Souls: pale wisps circling and rising inside, each trailing its tail.
      // (Three distinct tails over a dark inside, one colour throughout, so they read as things moving in the glass.)
      e = A * 0.14 * pow(inner, 1.5);
      var w = 0.0;
      for (var i = 0; i < 3; i++) {
        let fi = f32(i);
        let head = t * (1.5 + 0.3 * fi) + fi * 2.1;
        let behind = wrapA(head - ang);
        let tail = select(0.0, exp(-behind * 2.4), behind > 0.0) * (0.55 + 0.45 * sin(t * 2.3 + fi));
        let orbit = ringAt(rad, 0.48 + 0.15 * sin(t * 1.6 + fi * 2.0), 0.075);
        w += tail * orbit;
      }
      e += mix(A, B, 0.5) * w * 2.6;
      dark = 0.85;
    }
    case 15u: {
      // Toxic: acid that bubbles and churns, dark scum drifting over it.
      let bubble = speck(vec2f(p.x * 3.8, p.y * 3.8 - t * 1.3), 0.5, 0.12, 1.0);
      let ring = speck(vec2f(p.x * 3.8, p.y * 3.8 - t * 1.3), 0.5, 0.2, 1.0) - bubble;
      let ooze = fbm2(p * 2.5 + vec2f(t * 0.2, -t * 0.5));
      let scum = smoothstep(0.55, 0.72, fbm2(p * 3.0 + vec2f(-t * 0.3, t * 0.2)));
      e = (A * (0.15 + 0.9 * ooze * ooze) + B * max(ring, 0.0) * 2.4) * (0.72 + 0.38 * sin(t * 3.2));
      dark = scum * 0.75;
    }
    case 16u: {
      // Prism: white light split into its colours, the bands turning as you turn it.
      let hue = fract(ang / 6.2831853 + rad * 0.45 + fres * 0.7 + t * 0.25);
      let bow = 0.5 + 0.5 * cos(6.2831853 * (hue + vec3f(0.0, 0.33, 0.67)));
      let band = pow(0.5 + 0.5 * sin(ang * 6.0 + t * 1.5), 3.0);
      e = bow * (0.2 + 0.8 * band) * (0.45 + fres) * 1.2 + A * 0.12;
    }
    case 17u: {
      // Phoenix: flame licking up out of the heart, and every few breaths it flares and is reborn, in its colour, not white.
      let f = fbm2(vec2f(p.x * 2.6, p.y * 2.2 - t * 2.4));
      let flame = smoothstep(0.32, 0.8, f + 0.35 - p.y * 0.45 - rad * 0.4);
      let cyc = fract(t / 4.0);
      let flare = exp(-cyc * 6.0);
      e = mix(A, B, flame * 0.6) * flame * (1.1 + flare * 0.6) + mix(A, B, 0.4) * flare * pow(inner, 2.0) * 0.6;
      dark = (1.0 - flame) * 0.45;
    }
    case 18u: {
      // Runes: a ring of signs turning round a steady light, bright on a darker field, a gleam running along it.
      let a = ang + t * 0.8;
      let k = 6.2831853 / 14.0;
      let seg = floor(a / k);
      let along = fract(a / k);
      let rr = (rad - 0.55) / 0.3;
      let inBand = step(0.0, rr) * step(rr, 1.0) * step(0.12, along) * step(along, 0.88);
      let glyph = step(0.45, h2(vec2f(seg * 7.0 + floor(along * 3.0), floor(rr * 3.0) + 5.0)));
      let gleam = pow(0.5 + 0.5 * cos(ang - t * 2.4), 8.0);
      e = mix(B, A, 0.55) * inBand * glyph * (0.7 + 1.3 * gleam) + A * pow(inner, 2.0) * 0.35;
      // (The field inside the ring dims too, so the signs stand out against it.)
      dark = max(step(0.0, rr) * step(rr, 1.0) * (1.0 - glyph * inBand) * 0.6, (1.0 - step(0.0, rr)) * 0.45);
    }
    case 20u: {
      // Compass: a four-point star needle that searches about north and settles, faint ticks at the four quarters inside the
      // ring, and the ring's inner rim softly lit (the wayfinder's carved star and ring).
      let sway = 0.34 * sin(t * 1.1) * (0.5 + 0.5 * sin(t * 0.23));
      let arm = pow(abs(cos(2.0 * (ang - 1.5707963 - sway))), 18.0);
      let star = 1.0 - smoothstep(-0.03, 0.03, rad - (0.1 + 0.4 * arm));
      let north = pow(max(0.0, cos(ang - 1.5707963 - sway)), 24.0);
      let tick = ringAt(rad, 0.74, 0.035) * pow(abs(cos(2.0 * ang)), 60.0);
      let rim = ringAt(rad, 0.92, 0.05);
      e = mix(A, B, 0.5) * star * (0.75 + 0.25 * sin(t * 2.0)) + B * north * star * 1.4 + A * tick * 1.1 + A * rim * 0.7;
      dark = 0.35 * (1.0 - star) * (1.0 - rim);
    }
    default: {
      // Wind: gusts wheeling round inside, streaked, the eye of it still.
      // (A lit core behind the gusts, so it glows from inside and doesn't read as an engraving.)
      let a = ang + t * 3.0 + rad * 2.5;
      let streak = smoothstep(0.55, 0.9, vn2(vec2f(cos(a), sin(a)) * 2.2 + vec2f(rad * 9.0, t * 0.6)));
      e = A * 1.0 * pow(inner, 1.8) * (0.85 + 0.15 * sin(t * 2.7)) + mix(A, B, 0.6) * streak * 1.9 * smoothstep(1.0, 0.25, rad);
      dark = (1.0 - streak) * 0.45;
    }
  }
  return vec4f(e, dark);
}
`;

const STAFF_LIGHT = /* wgsl */ `
  if (in.staff > 0u) {
    let facing = max(dot(n, v), 0.0);
    let rim = pow(1.0 - facing, 3.0);
    // A staff is held up against the dusk as often as not: a soft fill from the eye and a rim keep its carving in view
    // (the critics, round 1: the painted heads read as black lumps in the hand at dusk).
    if ((in.staff & 0x40000000u) != 0u) {
      c += albedo * vec3f(0.5, 0.47, 0.42) * (0.3 + 0.7 * facing) * 0.55 + albedo * rim * 0.5;
    }
    if (M.fxA.w >= 0.0) {
      let tm = F.camPos.w;
      let A = M.fxA.rgb; let B = M.fxB.rgb;
      // The staff's own colour, packed by the renderer: top bit, then 8-bit RGB (src/items/staffglow.js).
      let tint = vec3f(f32((in.staff >> 16u) & 255u), f32((in.staff >> 8u) & 255u), f32(in.staff & 255u)) / 255.0;
      // Laid out across the eye's view of the stone (the renderer works the axes out each frame: src/gfx/dangles.js eyeAxes).
      let q0 = (in.bind - M.core.xyz) / M.core.w;
      let toEye = cross(M.ax.xyz, M.ay.xyz);
      let q = vec3f(dot(q0, M.ax.xyz), dot(q0, M.ay.xyz), dot(q0, toEye));
      let r3 = length(vec3f(q.xy, q.z * 0.75));
      // Strongest at the heart, gone by the sphere's edge.
      let inside = 1.0 - smoothstep(0.55, 1.0, r3);
      // Only the stone itself: bright and coloured like its light, or near white and bright. Wood, bone, gold and the
      // mid-toned paint of a carved head stay as they are.
      let hi = max(max(albedo.r, albedo.g), albedo.b);
      let sat = (hi - min(min(albedo.r, albedo.g), albedo.b)) / max(hi, 0.001);
      let dir = normalize(albedo + 0.001);
      let near = max(dot(dir, normalize(tint + 0.001)), dot(dir, normalize(A + 0.001)));
      // (A staff with no stone, only carving, says so in ax.w: its light takes whatever is in the sphere.)
      let tinted = smoothstep(0.08, 0.3, hi) * smoothstep(0.25, 0.55, sat) * smoothstep(0.75, 0.92, near);
      let gem = max(max(tinted, smoothstep(0.2, 0.5, hi) * (1.0 - smoothstep(0.12, 0.3, sat))), M.ax.w);
      let L = staffLight(u32(M.fxA.w + 0.5), q, tm, A, B, rim);
      let k = inside * mix(0.05, 1.0, gem);
      let shade = dot(albedo, vec3f(0.3, 0.59, 0.11)) / max(hi, 0.05);
      var em = L.rgb * (0.45 + 0.85 * shade) * k * M.fxB.w * 1.5;
      // Its hue carries the energy, not white: past a little over 1 the light only creeps brighter.
      let peak = max(max(em.r, em.g), em.b);
      if (peak > 1.1) { em *= (1.1 + (peak - 1.1) * 0.12) / peak; }
      // (What the light swallows reaches a little past the gate: a pupil or a void is dark to its edge.)
      let swallow = L.a * inside * mix(0.5, 1.0, gem);
      c = c * (1.0 - swallow) + em;
      // Paint the colour of the light but outside its point (the other shards, the shell, the leaves round the gem) sits
      // back, so the point is the brightest thing on the head (round 3: whole ice clusters and flame shells read as lit).
      let head = 1.0 - smoothstep(1.4, 3.5, r3);
      let alike = smoothstep(0.08, 0.3, hi) * smoothstep(0.12, 0.35, sat) * smoothstep(0.75, 0.92, near);
      c *= 1.0 - 0.62 * alike * (1.0 - inside) * head;
      // Past a soft shoulder the stone only creeps brighter, keeping its hue and its pattern (round 3: discs clipped white).
      let top = max(max(c.r, c.g), c.b);
      if (top > 0.85) { c *= mix(1.0, (0.85 + (top - 0.85) * 0.3) / top, inside); }
      if (u32(M.fxA.w + 0.5) == 1u) {
        let crust = (1.0 - inside) * (1.0 - smoothstep(2.2, 4.5, r3)) * smoothstep(0.7, 0.9, near);
        c *= 1.0 - 0.72 * crust;
      }
      // What holds the stone catches its light: the claws and prongs nearest it, falling off with distance.
      // (Never on what the light swallows: the moon's dark side, a pupil, a void stay dark.)
      let spill = (1.0 - smoothstep(0.8, 1.9, r3)) * (1.0 - inside * gem) * (1.0 - swallow) * (1.0 - 0.9 * tinted);
      c += albedo * A * spill * 1.4 * M.fxB.w * (0.8 + 0.2 * sin(tm * 2.1));
    }
  }
`;

const code = VIEWMODEL
  .replace('struct VM { sway: mat4x4f, params: vec4f };', 'struct VM { sway: mat4x4f, params: vec4f, core: vec4f, fxA: vec4f, fxB: vec4f, ax: vec4f, ay: vec4f };')
  .replace('@fragment fn fs(', () => STAFF_FX + '\n@fragment fn fs(')
  .replace(/ {2}\/\/ STAFF_LIGHT\r?\n/, () => STAFF_LIGHT);
if (!code.includes('fxA: vec4f') || !code.includes('let spill') || !code.includes('fn staffLight')) throw new Error('VIEWMODEL has moved: fix the staff light');
export const VIEWMODEL_STAFF = code;
// The light's block in the staff's uniform, after sway (64) and params (16): core, fxA, fxB, then the eye's axes each frame.
export const STAFF_FX_OFFSET = 80;
export const STAFF_AXES_OFFSET = 128;
export const STAFF_UBO_SIZE = 160;
