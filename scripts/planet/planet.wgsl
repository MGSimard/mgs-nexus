struct Params {
  light: vec3f,
  size: f32,
  seed: f32,
  lime: f32,
  relief: f32,
  edge: f32,
  grain: f32,
  shatter: f32,
  mode: f32,
  idA: vec4f,
  idB: vec4f,
}

@group(0) @binding(0) var<uniform> params: Params;

const SCALE: f32 = 0.82;

fn pcg3(input: vec3u) -> vec3u {
  var v = input * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> vec3u(16u);
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v;
}

fn rand3(c: vec3f) -> vec3f {
  let s = vec3i(c) + vec3i(i32(params.seed) * 7919, i32(params.seed) * 104729, 31337);
  return vec3f(pcg3(bitcast<vec3u>(s))) / 4294967295.0;
}

fn gnoise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = p - i;
  let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  var corners: array<f32, 8>;
  for (var k = 0u; k < 8u; k++) {
    let o = vec3f(f32(k & 1u), f32((k >> 1u) & 1u), f32((k >> 2u) & 1u));
    let g = normalize(rand3(i + o) * 2.0 - 1.0);
    corners[k] = dot(g, f - o);
  }
  let x00 = mix(corners[0], corners[1], u.x);
  let x10 = mix(corners[2], corners[3], u.x);
  let x01 = mix(corners[4], corners[5], u.x);
  let x11 = mix(corners[6], corners[7], u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

fn fbm(p: vec3f, octaves: u32) -> f32 {
  var total = 0.0;
  var amp = 0.5;
  var q = p;
  for (var k = 0u; k < octaves; k++) {
    total += amp * gnoise(q);
    q = q * 2.03 + vec3f(17.1, 4.3, 9.7);
    amp *= 0.5;
  }
  return total;
}

fn craters(p: vec3f, density: f32) -> f32 {
  let c = floor(p);
  var h = 0.0;
  for (var z = -1; z <= 1; z++) {
    for (var y = -1; y <= 1; y++) {
      for (var x = -1; x <= 1; x++) {
        let cell = c + vec3f(f32(x), f32(y), f32(z));
        let r = rand3(cell + vec3f(911.0, 313.0, 577.0));
        if (r.x > density) {
          continue;
        }
        let point = cell + rand3(cell) * 0.7 + 0.15;
        let shell = length(p);
        if (abs(length(point) - shell) > 0.35) {
          continue;
        }
        let center = normalize(point) * shell;
        let radius = mix(0.16, 0.4, r.y * r.y);
        let d = length(p - center) / radius;
        if (d > 1.6) {
          continue;
        }
        let bowl = select(0.0, (d * d - 1.0), d < 1.0);
        let rim = exp(-pow((d - 1.0) / 0.2, 2.0)) * 0.35;
        h += (bowl + rim) * radius;
      }
    }
  }
  return h;
}

struct Shard {
  offset: f32,
  crack: f32,
  core: f32,
  sunk: f32,
  hair: f32,
  zone: f32,
  lift: f32,
  hole: f32,
}

fn plates(p: vec3f) -> vec4f {
  let c = floor(p);
  var f1 = 1e9;
  var f2 = 1e9;
  var id = c;
  for (var z = -1; z <= 1; z++) {
    for (var y = -1; y <= 1; y++) {
      for (var x = -1; x <= 1; x++) {
        let cell = c + vec3f(f32(x), f32(y), f32(z));
        let d = length(p - (cell + rand3(cell + vec3f(5.0, 9.0, 13.0)) * 0.8 + 0.1));
        if (d < f1) {
          f2 = f1;
          f1 = d;
          id = cell;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
  }
  return vec4f(id, f2 - f1);
}

const IMPACT: vec3f = vec3f(-0.42, -0.3, 0.86);

const FLOAT_A: vec3f = vec3f(-0.62, -0.55, 0.56);
const FLOAT_B: vec3f = vec3f(-0.8, 0.2, 0.56);
const LIFTS: vec2f = vec2f(0.08, 0.05);

fn plateCoord(dir: vec3f) -> vec3f {
  let jag = vec3f(fbm(dir * 9.0 + 11.0, 4u), fbm(dir * 9.0 + 23.0, 4u), fbm(dir * 9.0 + 37.0, 4u)) * 0.06
    + vec3f(gnoise(dir * 70.0 + 3.0), gnoise(dir * 70.0 + 9.0), gnoise(dir * 70.0 + 17.0)) * 0.006;
  return (dir + jag) * 2.2;
}

fn shardId(dir: vec3f) -> vec3f {
  return plates(plateCoord(normalize(dir)) * 2.6 + 41.0).xyz;
}

fn shard(dir: vec3f) -> Shard {
  let zone = smoothstep(0.15, 0.9, dot(dir, normalize(IMPACT)) + 0.12 * gnoise(dir * 3.0 + 9.0));
  let q = plateCoord(dir);
  let big = plates(q);
  let fine = plates(q * 2.6 + 41.0);
  let gone = select(0.0, 1.0, all(fine.xyz == params.idA.xyz) || all(fine.xyz == params.idB.xyz)) * step(0.001, params.shatter);
  let small = plates(q * 6.0 + 87.0);
  let rnd = rand3(big.xyz + vec3f(55.0, 21.0, 89.0));
  let rndFine = rand3(fine.xyz + vec3f(19.0, 63.0, 7.0));
  let keepBig = max(zone, step(0.75, rnd.z) * 0.6);
  let width = max(0.012, 0.035 + 0.05 * gnoise(dir * 4.0 + 70.0)) * params.shatter;
  let bigCrack = (1.0 - smoothstep(0.0, width * keepBig, big.w)) * step(0.01, keepBig);
  let fineCrack = (1.0 - smoothstep(0.0, width * 0.7 * zone, fine.w)) * step(0.3, zone);
  var out: Shard;
  out.crack = max(bigCrack, fineCrack);
  out.core = max((1.0 - smoothstep(0.0, width * 0.3 * keepBig, big.w)) * step(0.01, keepBig),
    (1.0 - smoothstep(0.0, width * 0.2 * zone, fine.w)) * step(0.45, zone));
  let sunkBig = step(rnd.y, 0.35 * zone) * smoothstep(0.0, 0.16, big.w);
  out.hole = gone * (1.0 - smoothstep(0.0, 0.035, fine.w));
  let sunkFine = step(rndFine.y, 0.18 * zone) * step(0.5, zone) * smoothstep(0.0, 0.12, fine.w);
  out.sunk = max(sunkBig, sunkFine) * (1.0 - gone);
  out.zone = zone;
  out.hair = (1.0 - smoothstep(0.0, 0.025, small.w)) * step(0.35, rand3(small.xyz).x) * (0.3 + 0.7 * zone);
  let wallBig = smoothstep(0.0, 0.07, big.w);
  let wallFine = smoothstep(0.0, 0.05, fine.w);
  let lift = ((rnd.x - 0.5) * 0.6 + dot(dir, normalize(rnd * 2.0 - 1.0)) * 0.18) * wallBig
    + (rndFine.x - 0.5) * 0.45 * zone * wallFine * step(0.3, zone);
  out.lift = lift * (0.35 + 0.65 * zone) * params.shatter;
  out.lift *= 1.0 - gone;
  out.offset = out.lift - out.sunk * 0.9 * params.shatter;
  return out;
}

fn terrain(dir: vec3f) -> f32 {
  let warp = vec3f(fbm(dir * 1.7 + 3.1, 3u), fbm(dir * 1.7 + 7.7, 3u), fbm(dir * 1.7 + 1.3, 3u));
  var h = fbm(dir * 2.4 + warp * 1.4, 5u) * 0.6;
  h += craters(dir * 3.5, 0.7) * 1.1;
  h += craters(dir * 8.0, 0.75) * 0.55;
  h += craters(dir * 19.0, 0.8) * 0.25;
  h += craters(dir * 44.0, 0.85) * 0.11;
  h += fbm(dir * 60.0, 3u) * 0.04;
  return h;
}

fn height(dir: vec3f, intact: bool) -> f32 {
  if (intact) {
    return terrain(dir);
  }
  let s = shard(dir);
  return terrain(dir) + s.offset - s.crack * 0.4 * params.shatter - s.hair * 0.06 * params.shatter;
}

fn edgeHeight(dir: vec3f) -> f32 {
  let s = shard(dir);
  var h = terrain(dir) * 0.6 + (s.offset - s.crack * 0.6 * params.shatter) * 1.1;
  h += craters(dir * 26.0, 0.85) * 1.2;
  h += craters(dir * 70.0, 0.9) * 0.5;
  h += fbm(dir * 140.0, 3u) * 0.06;
  return h;
}

fn hash2(p: vec2f) -> f32 {
  return f32(pcg3(vec3u(vec2u(p), u32(params.seed))).x) / 4294967295.0;
}

const DARK: vec3f = vec3f(0.13, 0.14, 0.17);
const MID: vec3f = vec3f(0.29, 0.30, 0.36);
const LIGHT: vec3f = vec3f(0.56, 0.58, 0.65);

fn debris(p: vec2f, pixel: f32, l: vec3f) -> vec4f {
  var color = vec3f(0.0);
  var cover = 0.0;
  for (var k = 0; k < 26; k++) {
    let fk = f32(k);
    let a = rand3(vec3f(fk, 77.0, 191.0));
    let b = rand3(vec3f(fk, 13.0, 401.0));
    let angle = 3.75 + (a.x - 0.5) * 1.6;
    let center = vec2f(cos(angle), sin(angle)) * (0.82 + 0.5 * a.y * a.y);
    let size = mix(0.004, 0.05, pow(a.z, 2.2)) * params.shatter;
    if (size <= 0.0) {
      continue;
    }
    let q = (p - center) / size;
    let lq = length(q);
    if (lq > 1.8) {
      continue;
    }
    let theta = atan2(q.y, q.x);
    let ring = vec3f(cos(theta), sin(theta), fk * 7.3);
    let radius = 0.8 + 0.4 * gnoise(ring * vec3f(1.5, 1.5, 1.0)) + 0.15 * abs(gnoise(ring * vec3f(5.0, 5.0, 1.0)));
    let cov = clamp((radius - lq) * size / pixel + 0.5, 0.0, 1.0);
    if (cov <= 0.0) {
      continue;
    }
    let qq = q / radius;
    let facet = vec3f(gnoise(vec3f(q * 2.2, fk)), gnoise(vec3f(q * 2.2, fk + 5.0)), 0.0) * 0.7;
    let n = normalize(vec3f(qq * 0.9, sqrt(max(1.0 - dot(qq, qq), 0.05))) + (b - 0.5) * 0.8 + facet);
    let rock = mix(DARK, LIGHT, 0.35 + 0.35 * b.x) * (0.05 + 1.1 * max(dot(n, l), 0.0));
    color = mix(color, rock, cov);
    cover = max(cover, cov);
  }
  return vec4f(color, cover);
}

fn surface(n0: vec3f, frag: vec2f, intact: bool) -> vec4f {
  let l = normalize(params.light);
  let up = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(n0.y) > 0.95);
  let t1 = normalize(cross(n0, up));
  let t2 = cross(n0, t1);
  let e = 0.0012;
  let h0 = height(n0, intact);
  let dh1 = (height(normalize(n0 + t1 * e), intact) - h0) / e;
  let dh2 = (height(normalize(n0 + t2 * e), intact) - h0) / e;
  let n = normalize(n0 - params.relief * (t1 * dh1 + t2 * dh2));

  let diffuse = max(dot(n, l), 0.0);
  let smoothTerm = smoothstep(-0.05, 0.35, dot(n0, l));
  let shade = 0.05 + 1.05 * diffuse * smoothTerm;

  let maria = fbm(n0 * 1.6 + 40.0, 5u);
  let speck = fbm(n0 * 24.0 + 80.0, 4u);
  let tone = clamp(0.55 + maria * 1.3 + speck * 0.35 + terrain(n0) * 0.25, 0.0, 1.0);
  var color = select(mix(MID, LIGHT, (tone - 0.5) * 2.0), mix(DARK, MID, tone * 2.0), tone < 0.5) * shade;

  let cracks = 1.0 - abs(fbm(n0 * 6.0 + vec3f(fbm(n0 * 2.0 + 5.0, 3u)) * 2.5, 6u) * 2.0);
  let flecks = step(0.45, hash2(frag + 911.0));
  var mask = smoothstep(1.0 - params.lime, 1.0 - params.lime * 0.4, cracks) * smoothstep(0.0, 0.2, -h0 + 0.05) * flecks;
  mask *= smoothstep(0.1, 0.8, diffuse * smoothTerm);

  if (!intact) {
    let s = shard(n0);
    color *= mix(1.0, 0.55, s.sunk) * (1.0 - s.crack * 0.55) * (1.0 + clamp(s.lift, -0.3, 0.3) * 0.8);
    mask = max(mask * (1.0 - 0.8 * s.zone), max(s.core, s.hole));
  }
  return vec4f(color, clamp(mask, 0.0, 1.0));
}

fn chunk(p: vec2f, frag: vec2f, anchor: vec3f, id: vec3f, lift: f32) -> vec4f {
  if (length(p - anchor.xy * (1.0 + lift * 0.5)) > 0.4) {
    return vec4f(0.0);
  }
  let l = normalize(params.light);
  let steps = 24;
  for (var j = 0; j <= steps; j++) {
    let t = f32(j) / f32(steps);
    let layer = lift * (1.0 - t);
    let sc = p / (1.0 + layer);
    let rr = dot(sc, sc);
    if (rr >= 1.0) {
      continue;
    }
    let dir = vec3f(sc, sqrt(1.0 - rr));
    if (!all(shardId(dir) == id)) {
      continue;
    }
    if (j == 0) {
      let top = surface(dir, frag, true);
      return vec4f(top.rgb * 1.1, 1.0);
    }
    let side = normalize(vec3f(p, 0.2) + vec3f(gnoise(vec3f(p * 40.0, layer * 30.0)), gnoise(vec3f(p * 40.0 + 7.0, layer * 30.0)), 0.0) * 0.5);
    let strata = 0.8 + 0.4 * gnoise(vec3f(dir.xy * 6.0, layer * 90.0));
    let depth = mix(1.0, 0.35, t);
    let wall = mix(MID, DARK, t * 0.6) * strata * depth * (0.1 + 0.95 * max(dot(side, l), 0.0));
    return vec4f(wall, 1.0);
  }
  return vec4f(0.0);
}

fn over(top: vec4f, bottom: vec4f) -> vec4f {
  let a = top.a + bottom.a * (1.0 - top.a);
  return vec4f((top.rgb * top.a + bottom.rgb * bottom.a * (1.0 - top.a)) / max(a, 1e-4), a);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  if (params.mode > 0.5) {
    return vec4f((shardId(select(FLOAT_A, FLOAT_B, uv.x > 0.5)) + 128.0) / 255.0, 1.0);
  }
  let p = (uv * 2.0 - 1.0) / SCALE;
  let r = length(p);
  let pixel = 2.0 / (params.size * SCALE);
  let l = normalize(params.light);
  let frag = uv * params.size;

  var planet = vec4f(0.0);
  let limb = vec3f(p / max(r, 1e-5), 0.0);
  let coverage = clamp((1.0 + params.edge * edgeHeight(limb) - r) / pixel + 0.5, 0.0, 1.0);
  if (coverage > 0.0) {
    let n0 = select(limb, vec3f(p, sqrt(max(1.0 - r * r, 0.0))), r < 1.0);
    let sp = surface(n0, frag, false);
    planet = vec4f(sp.rgb, coverage * (1.0 - sp.a * 0.92));
  }

  var result = planet;
  if (params.shatter > 0.0) {
    result = over(chunk(p, frag, normalize(FLOAT_A), params.idA.xyz, LIFTS.x * params.shatter), result);
    result = over(chunk(p, frag, normalize(FLOAT_B), params.idB.xyz, LIFTS.y * params.shatter), result);
  }
  result = over(debris(p, pixel, l), result);

  let noise = (hash2(frag) + hash2(frag + 1371.0) + hash2(frag + 2741.0) - 1.5) * params.grain;
  return vec4f(clamp(result.rgb + noise, vec3f(0.0), vec3f(1.0)), result.a);
}
