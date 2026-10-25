// 精細人物模型：參數化的人體、戰馬、四輪車、兵器；主要武將有專屬造型，並可渲染成 3D 頭像
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GENERALS, FACTIONS } from './data.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const _c = new THREE.Color();
export function M(pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
  return new THREE.Matrix4().compose(V(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), V(...scl));
}
function between(a, b, sx = 1, sz = 1) {
  const d = b.clone().sub(a); const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(sx, len, sz));
}

// —— 幾何收集器：依材質分組，最後各自合併成一個網格 ——
export class Builder {
  constructor(lod = 1) { this.lod = lod; this.b = {}; this.base = null; }
  s(n) { return this.lod ? n : Math.max(4, Math.round(n * 0.45)); }
  add(key, geo, color, m) {
    geo.deleteAttribute('uv');
    if (!geo.index) geo = mergeVertices(geo);
    if (m) geo.applyMatrix4(m);
    if (this.base) geo.applyMatrix4(this.base);
    const n = geo.attributes.position.count, col = new Float32Array(n * 3);
    _c.set(color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (this.b[key] ||= []).push(geo);
  }
  box(k, c, w, h, d, m) { this.add(k, new THREE.BoxGeometry(w, h, d), c, m); }
  cyl(k, c, rt, rb, h, seg, m, open = false) { this.add(k, new THREE.CylinderGeometry(rt, rb, h, this.s(seg), 1, open), c, m); }
  sph(k, c, r, m, ws = 12, hs = 9, ts = 0, tl = Math.PI) { this.add(k, new THREE.SphereGeometry(r, this.s(ws), this.s(hs), 0, Math.PI * 2, ts, tl), c, m); }
  cone(k, c, r, h, seg, m) { this.add(k, new THREE.ConeGeometry(r, h, this.s(seg)), c, m); }
  limb(k, c, a, b, r1, r2, seg = 10, joint = true) {
    this.add(k, new THREE.CylinderGeometry(r2, r1, 1, this.s(seg)), c, between(a, b));
    if (joint && this.lod) this.sph(k, c, r2 * 1.02, M([b.x, b.y, b.z]), 8, 6);
  }
  shape(k, c, shape, depth, m) {
    this.add(k, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: this.lod ? 8 : 3 }), c, m);
  }
  merged() { const o = {}; for (const k in this.b) o[k] = mergeGeometries(this.b[k]); return o; }
}

// 關節：每個可動部位各自收集幾何，座標以關節點為原點
export class Rig {
  constructor(lod = 1) { this.lod = lod; this.parts = {}; }
  get(name, pivot) {
    if (!this.parts[name]) { const b = new Builder(this.lod); b.base = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z); this.parts[name] = { b, pivot: pivot.clone() }; }
    return this.parts[name].b;
  }
  addInto(name, m, fn) {
    const p = this.parts[name]; const W = new Builder(this.lod);
    W.base = new THREE.Matrix4().makeTranslation(-p.pivot.x, -p.pivot.y, -p.pivot.z).multiply(m);
    fn(W);
    for (const k in W.b) (p.b.b[k] ||= []).push(...W.b[k]);
  }
}
export const SHOULDER = { R: V(0.255, 1.46, 0), L: V(-0.255, 1.46, 0) };

// —— 人體 ——
// s: { armored, armor, cloth, trim, pants, skin, face, hair, beard, beardColor, head, plume, cape, robe, female, tint, arms, weapon }
export function buildHuman(B, s, pose = 'stand', rig = null) {
  const lod = B.lod;
  const skin = s.skin ?? 0xe2b48c, face = s.face ?? skin;
  const T = (shade = 1) => s.tint ? ['tint', new THREE.Color(shade, shade, shade).getHex()] : ['cloth', shade === 1 ? s.cloth : new THREE.Color(s.cloth).multiplyScalar(shade).getHex()];
  const armor = s.armor ?? 0x6a6f78, trim = s.trim ?? 0xc9a04a, pants = s.pants ?? 0x2e2620, boot = 0x1e1712;
  const hipY = 0.95;
  // 腿
  for (const sx of [-1, 1]) {
    const hip = V(sx * 0.1, hipY, 0.0);
    let knee, ankle;
    if (pose === 'ride') { knee = V(sx * 0.28, 0.76, -0.26); ankle = V(sx * 0.31, 0.36, -0.18); }
    else if (pose === 'sit') { knee = V(sx * 0.13, hipY + 0.02, -0.42); ankle = V(sx * 0.13, hipY - 0.4, -0.46); }
    else { knee = V(sx * 0.11, 0.52, -0.02); ankle = V(sx * 0.11, 0.1, 0); }
    const LB = rig && pose === 'stand' ? rig.get(sx < 0 ? 'legL' : 'legR', hip) : B;
    LB.limb('cloth', pants, hip, knee, 0.085, 0.07, 10);
    LB.limb('cloth', boot, knee, ankle, 0.068, 0.058, 10);
    LB.box('cloth', boot, 0.11, 0.08, 0.22, M([ankle.x, ankle.y - 0.04, ankle.z - 0.06]));
    if (s.armored && lod) LB.limb('metal', armor, knee.clone().lerp(ankle, 0.05), knee.clone().lerp(ankle, 0.6), 0.075, 0.068, 10, false);
  }
  // 下襬
  const [ck, cc] = T(1), [ck2, cc2] = T(0.72);
  if (s.robe && pose === 'stand') B.cyl(ck, cc, 0.19, 0.4, 0.92, 18, M([0, 0.57, 0]), true);
  else if (pose === 'stand') B.cyl(ck, cc, 0.19, 0.3, 0.42, 16, M([0, 0.82, 0]), true);
  else {
    // 騎乘／坐姿：前後兩片衣襬
    B.box(ck, cc, 0.36, 0.42, 0.04, M([0, 0.78, -0.12], [-0.9, 0, 0]));
    B.box(ck, cc, 0.4, s.robe ? 0.6 : 0.42, 0.04, M([0, 0.72, 0.16], [0.35, 0, 0]));
    B.cyl(ck, cc, 0.19, 0.25, 0.14, 14, M([0, 0.93, 0]), true);
  }
  if (s.armored) {
    if (pose === 'stand') B.cyl('metal', armor, 0.2, 0.3, 0.3, 16, M([0, 0.86, 0], [0, 0, 0], [1, 1, 0.9]), true);
    else for (const sx of [-1, 1]) B.box('metal', armor, 0.2, 0.3, 0.3, M([sx * 0.2, 0.84, -0.06], [0, 0, sx * 0.35]));
  }
  // 軀幹
  const fat = s.fat ? 1.22 : 1;
  if (s.bare) {
    B.cyl('skin', skin, 0.215 * fat, 0.18 * fat, 0.52, 16, M([0, 1.26, 0], [0, 0, 0], [1, 1, 0.75]));
    if (B.lod) for (const sx of [-1, 1]) B.sph('skin', new THREE.Color(skin).multiplyScalar(0.92).getHex(), 0.08, M([sx * 0.08, 1.38, -0.12], [0, 0, 0], [1, 0.7, 0.5]), 8, 6);
    B.box(ck, cc, 0.06, 0.6, 0.02, M([0.05, 1.28, -0.16], [0, 0, 0.6]));
  } else B.cyl(ck, cc, 0.205 * fat, 0.17 * fat, 0.52, 16, M([0, 1.26, 0], [0, 0, 0], [1, 1, 0.72 * (s.fat ? 1.15 : 1)]));
  if (s.armored && !s.bare) {
    B.cyl('metal', armor, 0.222 * fat, 0.19 * fat, 0.32, 16, M([0, 1.35, 0], [0, 0, 0], [1, 1, 0.78]));
    if (lod) {
      for (let i = 0; i < 4; i++) B.add('metal', new THREE.TorusGeometry(0.2 - i * 0.006, 0.008, 4, 16), new THREE.Color(armor).multiplyScalar(0.7).getHex(), M([0, 1.24 + i * 0.075, 0], [Math.PI / 2, 0, 0], [1, 0.78, 1]));
      // 護心鏡
      B.cyl('gold', trim, 0.065, 0.065, 0.02, 16, M([0, 1.37, -0.17], [Math.PI / 2, 0, 0]));
    }
  } else if (lod && !s.bare) {
    // 交領
    B.box(ck2, cc2, 0.05, 0.42, 0.02, M([0.06, 1.3, -0.15], [0, 0, 0.45]));
    B.box(ck2, cc2, 0.05, 0.42, 0.02, M([-0.06, 1.3, -0.15], [0, 0, -0.45]));
  }
  B.add('gold', new THREE.TorusGeometry(0.185, 0.032, 5, B.s(18)), s.belt ?? 0x4a3020, M([0, 1.03, 0], [Math.PI / 2, 0, 0], [1, 0.74, 1]));
  if (lod) B.sph('gold', trim, 0.04, M([0, 1.03, -0.14], [0, 0, 0], [1, 1, 0.5]));
  // 肩甲
  if (s.armored && !s.bare) for (const sx of [-1, 1]) {
    B.sph('metal', armor, 0.13, M([sx * 0.26, 1.47, 0], [0, 0, -sx * 0.55], [1, 0.75, 1.05]), 12, 8, 0, Math.PI * 0.55);
    if (lod) B.sph('gold', trim, 0.03, M([sx * 0.3, 1.5, -0.02]));
  }
  // 頸、頭
  B.cyl('skin', skin, 0.055, 0.06, 0.13, 10, M([0, 1.59, 0]));
  B.add(ck2, new THREE.TorusGeometry(0.07, 0.025, 5, B.s(14)), cc2, M([0, 1.55, 0], [Math.PI / 2, 0, 0]));
  const H = V(0, 1.725, 0);
  B.sph('skin', face, 0.122, M([H.x, H.y, H.z], [0, 0, 0], [0.92, 1.1, 1]), 16, 12);
  if (lod) {
    for (const sx of [-1, 1]) {
      B.sph('skin', 0xf4f0e8, 0.024, M([sx * 0.043, 1.742, -0.1], [0, 0, 0], [1.25, 0.8, 0.6]), 8, 6);
      B.sph('dark', 0x1a120c, 0.013, M([sx * 0.043, 1.742, -0.112]), 6, 5);
      B.box('hair', s.hair ?? 0x161210, 0.05, 0.012, 0.02, M([sx * 0.045, 1.77, -0.108], [0, 0, sx * (s.fierce ? 0.35 : -0.12)]));
      B.sph('skin', face, 0.026, M([sx * 0.118, 1.725, 0.005], [0, 0, 0], [0.5, 1, 0.8]), 6, 5);
    }
    B.cone('skin', face, 0.02, 0.05, 6, M([0, 1.715, -0.125], [-Math.PI / 2 + 0.3, 0, 0]));
    B.box('dark', 0x6a2a22, 0.04, 0.008, 0.01, M([0, 1.67, -0.112]));
  }
  // 頭髮
  const hair = s.hair ?? 0x161210;
  if (s.female) {
    B.sph('hair', hair, 0.134, M([0, 1.74, 0.01], [0.45, 0, 0]), 14, 10, 0, Math.PI * 0.6);
    B.cone('hair', hair, 0.12, 0.5, 10, M([0, 1.48, 0.1], [0.12, 0, 0]));
    B.sph('hair', hair, 0.06, M([0, 1.86, 0.06]));
  } else if (!['helmet', 'lion', 'tribal'].includes(s.head)) {
    B.sph('hair', hair, 0.13, M([0, 1.742, 0.01], [0.5, 0, 0]), 14, 10, 0, Math.PI * 0.55);
  }
  buildBeard(B, s, face);
  if (s.eyepatch && lod) {
    B.add('dark', new THREE.TorusGeometry(0.124, 0.008, 4, 16), 0x111111, M([0, 1.75, 0], [Math.PI / 2 - 0.25, 0, 0], [0.95, 1, 1]));
    B.sph('dark', 0x141414, 0.03, M([-0.043, 1.742, -0.112], [0, 0, 0], [1.1, 1, 0.4]), 8, 6);
  }
  buildHead(B, s, armor, trim);
  // 手臂
  const arms = ARM_POSES[s.arms || 'weapon'](pose);
  const hands = {};
  for (const side of ['R', 'L']) {
    const sx = side === 'R' ? 1 : -1;
    const sh = V(sx * 0.255, 1.46, 0.0), el = arms[side][0], wr = arms[side][1];
    const AB = rig ? rig.get('arm' + side, sh) : B;
    AB.limb(s.bare ? 'skin' : ck, s.bare ? skin : cc, sh, el, 0.066, 0.056, 10);
    if (s.bare) AB.limb('skin', skin, el, wr, 0.056, 0.046, 10);
    else if (s.robe && !s.armored) {
      AB.limb(ck, cc, el, wr, 0.06, 0.05, 10);
      AB.add(ck, new THREE.CylinderGeometry(0.15, 0.065, 1, B.s(12), 1, true), cc, between(el.clone().lerp(wr, 0.25), wr.clone().add(wr.clone().sub(el).multiplyScalar(0.12))));
    } else {
      AB.limb(s.armored ? 'metal' : ck, s.armored ? armor : cc, el, wr, 0.055, 0.046, 10);
    }
    AB.sph('skin', skin, 0.046, M([wr.x, wr.y, wr.z]));
    hands[side] = wr;
  }
  // 披風
  if (s.cape != null) {
    const g = new THREE.PlaneGeometry(0.62, pose === 'stand' ? 1.15 : 1.0, 2, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i); p.setZ(i, ((0.5 - y) ** 2) * 0.25 + Math.abs(x) * 0.12); }
    g.computeVertexNormals();
    const [k] = T();
    B.add(s.tint ? 'tint' : 'cape', g, s.tint ? 0xbbbbbb : s.cape, M([0, pose === 'stand' ? 0.95 : 1.0, 0.17], [pose === 'stand' ? 0.08 : 0.5, 0, 0]));
  }
  return hands;
}

const ARM_POSES = {
  weapon: (pose) => ({ R: [V(0.36, 1.24, -0.1), V(0.33, 1.2, -0.36)], L: [V(-0.35, 1.24, -0.08), V(-0.24, 1.16, -0.34)] }),
  spear: (pose) => ({ R: [V(0.36, 1.24, -0.06), V(0.34, 1.2, -0.3)], L: [V(-0.3, 1.26, -0.18), V(-0.1, 1.28, -0.4)] }),
  fan: (pose) => ({ R: [V(0.34, 1.2, -0.1), V(0.3, 1.16, -0.34)], L: [V(-0.33, 1.22, -0.1), V(-0.2, 1.12, -0.28)] }),
  twin: (pose) => ({ R: [V(0.37, 1.24, -0.12), V(0.36, 1.27, -0.38)], L: [V(-0.37, 1.24, -0.12), V(-0.36, 1.27, -0.38)] }),
  bow: (pose) => ({ R: [V(0.3, 1.28, -0.14), V(0.12, 1.4, -0.3)], L: [V(-0.3, 1.38, -0.28), V(-0.18, 1.42, -0.58)] }),
  down: (pose) => ({ R: [V(0.31, 1.2, 0.0), V(0.31, 0.96, -0.04)], L: [V(-0.31, 1.2, 0.0), V(-0.31, 0.96, -0.04)] }),
};

function buildBeard(B, s, face) {
  if (!s.beard || s.female) return;
  const c = s.beardColor ?? 0x15100c;
  if (s.beard === 'short') {
    B.cone('hair', c, 0.035, 0.08, 8, M([0, 1.615, -0.085], [Math.PI + 0.2, 0, 0]));
    for (const sx of [-1, 1]) B.box('hair', c, 0.05, 0.012, 0.015, M([sx * 0.025, 1.688, -0.118], [0, 0, sx * 0.3]));
  } else if (s.beard === 'long') {
    B.cone('hair', c, 0.05, 0.3, 8, M([0, 1.52, -0.08], [Math.PI + 0.12, 0, 0]));
    for (const sx of [-1, 1]) B.box('hair', c, 0.07, 0.014, 0.015, M([sx * 0.03, 1.685, -0.118], [0, 0, sx * 0.5]));
  } else if (s.beard === 'thin') {
    B.cone('hair', c, 0.025, 0.24, 6, M([0, 1.54, -0.08], [Math.PI + 0.1, 0, 0]));
    for (const sx of [-1, 1]) B.box('hair', c, 0.06, 0.01, 0.01, M([sx * 0.03, 1.686, -0.118], [0, 0, sx * 0.6]));
  } else if (s.beard === 'full') {
    B.sph('hair', c, 0.1, M([0, 1.64, -0.045], [0, 0, 0], [1, 0.9, 0.8]), 12, 8, Math.PI * 0.45, Math.PI * 0.55);
    B.cone('hair', c, 0.07, 0.16, 8, M([0, 1.55, -0.07], [Math.PI + 0.15, 0, 0]));
  } else if (s.beard === 'bushy') {
    // 燕頷虎鬚
    B.sph('hair', c, 0.12, M([0, 1.65, -0.035], [0, 0, 0], [1.1, 0.95, 0.85]), 12, 8, Math.PI * 0.42, Math.PI * 0.58);
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * 2.4;
      B.cone('hair', c, 0.025, 0.16, 5, M([Math.sin(a) * 0.1, 1.6 - Math.cos(a) * 0.02, -0.06 + Math.abs(Math.sin(a)) * 0.04], [Math.PI + 0.3, 0, -a * 0.6]));
    }
  }
}

function buildHead(B, s, armor, trim) {
  const H = 1.725;
  const hk = s.head;
  const metal = s.helmColor ?? armor;
  if (hk === 'helmet' || hk === 'lion') {
    B.sph('metal', metal, 0.145, M([0, H + 0.06, 0.012], [0.18, 0, 0], [1, 1.0, 1.02]), 16, 10, 0, Math.PI * 0.5);
    B.add('metal', new THREE.TorusGeometry(0.142, 0.016, 5, B.s(18)), new THREE.Color(metal).multiplyScalar(0.8).getHex(), M([0, H + 0.06, 0.012], [Math.PI / 2 + 0.18, 0, 0]));
    B.cyl('metal', metal, 0.14, 0.17, 0.12, 16, M([0, H + 0.0, 0.05], [0.25, 0, 0], [1, 1, 0.9]), true); // 護頸
    if (B.lod) for (const sx of [-1, 1]) B.box('metal', metal, 0.02, 0.1, 0.07, M([sx * 0.132, H - 0.02, 0.02], [0, 0, sx * 0.1]));
    B.cyl('gold', trim, 0.012, 0.02, 0.12, 6, M([0, H + 0.23, 0.02]));
    if (hk === 'lion') {
      B.sph('gold', 0xe0b040, 0.05, M([0, H + 0.14, -0.125], [0, 0, 0], [1.2, 1, 0.6]));
      for (const sx of [-1, 1]) B.sph('gold', 0xe0b040, 0.02, M([sx * 0.03, H + 0.16, -0.15]));
      B.sph('cloth', 0xf4f0e6, 0.09, M([0, H + 0.3, 0.06], [0.6, 0, 0], [0.6, 1.5, 0.6]));
    } else {
      B.box('gold', trim, 0.025, 0.06, 0.03, M([0, H + 0.14, -0.125], [-0.3, 0, 0]));
    }
    if (s.plume != null) {
      const pk = s.tint ? 'tint' : 'cloth';
      B.cone(pk, s.tint ? 0xffffff : s.plume, 0.05, 0.22, 8, M([0, H + 0.36, 0.03], [0.25, 0, 0]));
      if (B.lod) B.cone(pk, s.tint ? 0xffffff : s.plume, 0.035, 0.3, 6, M([0, H + 0.28, 0.12], [1.6, 0, 0]));
    }
    if (s.feathers) for (const sx of [-1, 1]) B.cone('cloth', 0x8a6a2a, 0.012, 0.7, 4, M([sx * 0.08, H + 0.45, 0.05], [0.3, 0, sx * -0.35]));
  } else if (hk === 'crown') {
    // 冕冠
    B.cyl('cloth', 0x15100c, 0.1, 0.11, 0.1, 12, M([0, H + 0.12, 0]));
    B.box('cloth', 0x15100c, 0.36, 0.025, 0.24, M([0, H + 0.19, 0], [-0.08, 0, 0]));
    B.box('gold', trim, 0.37, 0.008, 0.25, M([0, H + 0.205, 0], [-0.08, 0, 0]));
    if (B.lod) for (const z of [-0.12, 0.12]) for (let i = 0; i < 6; i++) {
      const x = -0.15 + i * 0.06;
      B.cyl('gold', trim, 0.004, 0.004, 0.13, 4, M([x, H + 0.12, z + (z < 0 ? 0.01 : -0.01)]));
      B.sph('gold', z < 0 ? 0xe04040 : 0x40a0e0, 0.012, M([x, H + 0.055, z]), 6, 4);
    }
    B.cyl('gold', trim, 0.006, 0.006, 0.34, 4, M([0, H + 0.1, 0], [0, 0, Math.PI / 2]));
  } else if (hk === 'gold') {
    // 金冠
    B.cyl('gold', trim, 0.06, 0.08, 0.08, 12, M([0, H + 0.14, 0.02]));
    B.box('gold', trim, 0.02, 0.18, 0.02, M([0, H + 0.16, 0.02], [0, 0, Math.PI / 2]));
  } else if (hk === 'guanjin') {
    // 綸巾
    B.sph('cloth', s.hatColor ?? 0x3a4a5a, 0.135, M([0, H + 0.05, 0.02], [0.35, 0, 0], [1, 0.95, 1.05]), 14, 10, 0, Math.PI * 0.5);
    B.box('cloth', s.hatColor ?? 0x3a4a5a, 0.1, 0.12, 0.16, M([0, H + 0.15, 0.03]));
    if (B.lod) for (const sx of [-1, 1]) B.box('cloth', s.hatColor ?? 0x3a4a5a, 0.035, 0.32, 0.01, M([sx * 0.05, H - 0.1, 0.14], [0.25, 0, sx * 0.15]));
  } else if (hk === 'jinxian') {
    // 進賢冠
    B.sph('hair', 0x161210, 0.13, M([0, H + 0.015, 0.01], [0.5, 0, 0]), 14, 10, 0, Math.PI * 0.55);
    B.box('cloth', 0x15100c, 0.12, 0.2, 0.03, M([0, H + 0.17, -0.02], [0.45, 0, 0]));
    B.box('cloth', 0x15100c, 0.14, 0.05, 0.16, M([0, H + 0.1, 0.03]));
  } else if (hk === 'headband') {
    B.add('cloth', new THREE.TorusGeometry(0.125, 0.018, 4, B.s(16)), s.bandColor ?? 0xb02020, M([0, H + 0.05, 0], [Math.PI / 2 + 0.1, 0, 0], [0.95, 1, 1]));
    B.sph('hair', s.hair ?? 0x161210, 0.05, M([0, H + 0.16, 0.04]));
    if (B.lod) for (const sx of [-1, 1]) B.box('cloth', s.bandColor ?? 0xb02020, 0.02, 0.25, 0.008, M([sx * 0.03, H - 0.05, 0.14], [0.4, 0, sx * 0.2]));
  } else if (hk === 'tribal') {
    B.sph('hair', s.hair ?? 0x161210, 0.13, M([0, H + 0.015, 0.01], [0.5, 0, 0]), 14, 10, 0, Math.PI * 0.55);
    B.add('gold', new THREE.TorusGeometry(0.13, 0.025, 5, B.s(16)), 0xc08030, M([0, H + 0.07, 0], [Math.PI / 2, 0, 0]));
    const cols = [0xd03020, 0xf0c040, 0x2080a0, 0xf0f0e0];
    for (let i = 0; i < (B.lod ? 9 : 5); i++) {
      const a = (i / ((B.lod ? 9 : 5) - 1) - 0.5) * 2.2;
      B.cone('cloth', cols[i % 4], 0.025, 0.36, 5, M([Math.sin(a) * 0.12, H + 0.25, Math.cos(a) * 0.06 + 0.02], [0.2 + Math.cos(a) * 0.2, 0, -a * 0.35]));
    }
  } else if (hk === 'taoist') {
    B.sph('hair', s.hair ?? 0x161210, 0.13, M([0, H + 0.015, 0.01], [0.5, 0, 0]), 14, 10, 0, Math.PI * 0.55);
    B.sph('hair', s.hair ?? 0x161210, 0.06, M([0, H + 0.15, 0.0]));
    B.box('gold', 0xd8b040, 0.1, 0.07, 0.1, M([0, H + 0.2, 0]));
    B.cyl('gold', 0xd8b040, 0.006, 0.006, 0.2, 4, M([0, H + 0.2, 0], [0, 0, Math.PI / 2]));
  } else if (hk === 'furhat') {
    B.cyl('hair', s.hatColor ?? 0x6a4a2a, 0.14, 0.15, 0.14, 14, M([0, H + 0.1, 0.01]));
    B.sph('hair', s.hatColor ?? 0x6a4a2a, 0.14, M([0, H + 0.16, 0.01]), 12, 8, 0, Math.PI / 2);
    B.add('hair', new THREE.TorusGeometry(0.145, 0.03, 6, B.s(16)), 0xd8ccb0, M([0, H + 0.05, 0.01], [Math.PI / 2, 0, 0]));
  } else if (hk === 'bun' || hk == null) {
    B.sph('hair', s.hair ?? 0x161210, 0.05, M([0, H + 0.15, 0.02]));
    if (B.lod) B.cyl('gold', 0xc9a04a, 0.006, 0.006, 0.16, 4, M([0, H + 0.15, 0.02], [0, 0, Math.PI / 2]));
  }
  if (s.female && B.lod) {
    for (const sx of [-1, 1]) B.sph('gold', 0xf0d060, 0.015, M([sx * 0.12, H - 0.04, 0]));
  }
}

// —— 兵器：以握把為原點，+Y 為槍尖方向 ——
export function buildWeapon(B, type, s = {}) {
  const wood = s.shaft ?? 0x4a3020, steel = 0xd4d8de, gold = 0xc9a04a;
  const shaft = (len, r = 0.022, from = -0.9) => B.cyl('wood', wood, r, r, len, 8, M([0, from + len / 2, 0]));
  if (type === 'spear' || type === 'silverSpear') {
    shaft(2.7, 0.02);
    B.add('steel', new THREE.OctahedronGeometry(0.07, 0), steel, M([0, 1.95, 0], [0, 0, 0], [0.6, 3.4, 0.22]));
    B.cone('cloth', s.tassel ?? 0xc02020, 0.06, 0.16, 8, M([0, 1.66, 0], [Math.PI, 0, 0]));
    B.cyl('gold', gold, 0.03, 0.025, 0.06, 8, M([0, 1.74, 0]));
  } else if (type === 'snake') {
    shaft(2.9, 0.023);
    const sh = new THREE.Shape();
    const N = 16, L = 0.55, w = 0.035;
    for (let i = 0; i <= N; i++) { const t = i / N; const x = Math.sin(t * Math.PI * 3) * 0.03 + w * (1 - t); i ? sh.lineTo(x, t * L) : sh.moveTo(x, 0); }
    for (let i = N; i >= 0; i--) { const t = i / N; sh.lineTo(Math.sin(t * Math.PI * 3) * 0.03 - w * (1 - t), t * L); }
    B.shape('steel', steel, sh, 0.012, M([0, 2.0, -0.006]));
    B.cone('cloth', 0x101010, 0.06, 0.16, 8, M([0, 1.94, 0], [Math.PI, 0, 0]));
  } else if (type === 'guandao' || type === 'dao') {
    shaft(2.5, 0.025);
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(0, 0.62); sh.quadraticCurveTo(0.3, 0.5, 0.24, 0.12); sh.quadraticCurveTo(0.18, 0.0, 0.08, -0.04); sh.lineTo(0, 0);
    B.shape('steel', steel, sh, 0.014, M([0.015, 1.6, -0.007]));
    if (type === 'guandao') { B.sph('gold', gold, 0.05, M([0, 1.58, 0]), 8, 6); B.cone('cloth', 0x207040, 0.05, 0.14, 8, M([0, 1.48, 0], [Math.PI, 0, 0])); }
    else B.cyl('gold', gold, 0.04, 0.03, 0.06, 8, M([0, 1.58, 0]));
  } else if (type === 'ji') {
    shaft(2.6, 0.022);
    B.add('steel', new THREE.OctahedronGeometry(0.06, 0), steel, M([0, 1.85, 0], [0, 0, 0], [0.6, 3, 0.22]));
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.quadraticCurveTo(0.22, 0.05, 0.26, 0.25); sh.quadraticCurveTo(0.14, 0.12, 0, 0.12); sh.lineTo(0, 0);
    B.shape('steel', steel, sh, 0.012, M([0.015, 1.52, -0.006]));
    B.cone('cloth', s.tassel ?? 0xc02020, 0.05, 0.14, 8, M([0, 1.45, 0], [Math.PI, 0, 0]));
  } else if (type === 'axe') {
    shaft(2.3, 0.026);
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(0.06, -0.06); sh.quadraticCurveTo(0.38, 0.1, 0.06, 0.48); sh.lineTo(0, 0.4); sh.lineTo(0, 0);
    B.shape('steel', steel, sh, 0.02, M([0.02, 1.0, -0.01]));
    B.cone('steel', steel, 0.03, 0.15, 6, M([0, 1.48, 0]));
  } else if (type === 'sword' || type === 'twin') {
    B.box('steel', steel, 0.038, 0.72, 0.008, M([0, 0.47, 0]));
    B.cone('steel', steel, 0.019, 0.08, 4, M([0, 0.87, 0], [0, Math.PI / 4, 0], [1, 1, 0.3]));
    B.box('gold', gold, 0.13, 0.025, 0.035, M([0, 0.1, 0]));
    B.cyl('wood', 0x2a1810, 0.016, 0.016, 0.15, 6, M([0, 0.02, 0]));
    B.sph('gold', gold, 0.022, M([0, -0.06, 0]), 6, 4);
  } else if (type === 'fan') {
    B.cyl('wood', 0x3a2414, 0.012, 0.012, 0.14, 6, M([0, 0.02, 0]));
    const n = B.lod ? 11 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * 1.5;
      B.add('cloth', new THREE.CircleGeometry(1, B.s(10)), 0xf6f3ea, new THREE.Matrix4().makeRotationZ(-a).multiply(M([0, 0.22, 0], [0, 0, 0], [0.045, 0.16, 1])).premultiply(M([0, 0.07, 0])));
    }
    B.sph('cloth', 0xe8e0d0, 0.03, M([0, 0.09, 0]), 8, 6);
  } else if (type === 'bow') {
    B.add('wood', new THREE.TorusGeometry(0.5, 0.016, 5, B.s(16), 2.2), 0x5a3a1e, M([0, 0, 0], [0, Math.PI / 2, Math.PI - 1.1 + Math.PI / 2]));
  } else if (type === 'knife') {
    B.box('steel', steel, 0.04, 0.3, 0.006, M([0, 0.2, 0]));
    B.cyl('wood', 0xa02020, 0.014, 0.014, 0.1, 6, M([0, 0.0, 0]));
  } else if (type === 'whip') {
    B.cyl('wood', 0x2a1810, 0.014, 0.008, 0.9, 6, M([0, 0.4, 0]));
  }
}

// 依姿勢擺放兵器的矩陣（握在手中）
function weaponPlacement(type, hands, pose) {
  return weaponPlacementH(type, hands, pose).map(x => x.m);
}
function weaponPlacementH(type, hands, pose) {
  const R = hands.R, L = hands.L;
  const at = (h, rot) => ({ m: M([h.x, h.y, h.z], rot), hand: h === L ? 'L' : 'R' });
  switch (type) {
    case 'spear': case 'silverSpear': case 'snake': case 'ji':
      return [at(R, pose === 'stand' ? [-0.15, 0, 0] : [-0.95, 0, 0.05])];
    case 'guandao': case 'dao': case 'axe':
      return [at(R, pose === 'stand' ? [-0.12, Math.PI / 2, 0] : [-0.7, Math.PI / 2, 0.1])];
    case 'sword': return [at(R, [-0.9, 0, 0.1])];
    case 'twin': return [at(R, [-0.85, 0, 0.12]), at(L, [-0.85, 0, -0.12])];
    case 'fan': return [at(R, [-0.5, 0.3, -0.35])];
    case 'bow': return [at(L, [0, 0, 0])];
    case 'knife': return [at(R, [-0.6, 0, 0.3])];
    default: return [];
  }
}

// —— 戰馬 ——
export function buildHorse(B, s = {}, rig = null) {
  const c = s.color ?? 0x6b4428, mane = s.mane ?? 0x1c140e, lod = B.lod;
  const legC = s.legColor ?? c;
  B.sph('horse', c, 0.5, M([0, 1.16, 0.02], [0, 0, 0], [0.54, 0.58, 1.42]), 18, 12);
  B.sph('horse', c, 0.33, M([0, 1.2, -0.52], [0, 0, 0], [0.95, 1.05, 1]), 14, 10);
  B.sph('horse', c, 0.35, M([0, 1.22, 0.52], [0, 0, 0], [1, 1, 1]), 14, 10);
  B.limb('horse', c, V(0, 1.32, -0.62), V(0, 1.9, -0.95), 0.21, 0.13, 12, false);
  B.sph('horse', c, 0.135, M([0, 1.92, -0.98]), 10, 8);
  B.limb('horse', c, V(0, 1.95, -1.0), V(0, 1.72, -1.38), 0.105, 0.075, 10, false);
  B.sph('horse', s.muzzle ?? new THREE.Color(c).multiplyScalar(0.7).getHex(), 0.08, M([0, 1.72, -1.38], [0, 0, 0], [0.95, 0.9, 1.1]), 10, 8);
  for (const sx of [-1, 1]) {
    B.cone('horse', c, 0.03, 0.1, 6, M([sx * 0.055, 2.08, -0.98], [-0.2, 0, sx * 0.2]));
    if (lod) B.sph('dark', 0x0a0806, 0.022, M([sx * 0.08, 1.92, -1.1]), 6, 5);
  }
  // 鬃毛
  B.add('mane', new THREE.BoxGeometry(1, 1, 1), mane, between(V(0, 1.46, -0.5), V(0, 2.04, -0.93), 0.05, 0.16).multiply(M([0, 0, 0.45])));
  B.box('mane', mane, 0.05, 0.12, 0.08, M([0, 2.05, -1.05], [0.4, 0, 0]));
  // 尾
  B.sph('mane', mane, 0.08, M([0, 1.3, 0.9]), 8, 6);
  B.limb('mane', mane, V(0, 1.3, 0.92), V(0, 0.72, 1.1), 0.075, 0.03, 8, false);
  // 腿
  [[-0.17, -0.55, 1], [0.17, -0.55, 1], [-0.18, 0.56, 0], [0.18, 0.56, 0]].forEach(([x, z, front], li) => {
    const top = V(x, 1.02, z), knee = V(x, 0.56, z + (front ? -0.03 : 0.07)), fet = V(x, 0.14, z + (front ? -0.01 : 0.02));
    if (!front) B.sph('horse', c, 0.2, M([x, 1.08, z], [0, 0, 0], [0.7, 1.2, 1]), 10, 8);
    const HB = rig ? rig.get('hleg' + li, top) : B;
    HB.limb('horse', c, top, knee, front ? 0.1 : 0.12, 0.06, 10);
    HB.limb('horse', legC, knee, fet, 0.05, 0.042, 8);
    HB.cyl('dark', 0x1a1410, 0.05, 0.062, 0.11, 8, M([fet.x, fet.y - 0.06, fet.z]));
  });
  // 鞍具
  const [tk, tc] = s.tint ? ['tint', 0xffffff] : ['cloth', s.cloth ?? 0x8a2a1e];
  B.box(tk, tc, 0.64, 0.03, 0.72, M([0, 1.52, 0.04]));
  for (const sx of [-1, 1]) B.box(tk, tc, 0.02, 0.34, 0.66, M([sx * 0.32, 1.37, 0.04]));
  if (lod) for (const sx of [-1, 1]) B.box('gold', s.trim ?? 0xc9a04a, 0.025, 0.03, 0.67, M([sx * 0.322, 1.2, 0.04]));
  B.box('leather', 0x4a2e18, 0.34, 0.1, 0.5, M([0, 1.58, 0.02]));
  B.box('leather', 0x4a2e18, 0.3, 0.14, 0.06, M([0, 1.65, -0.2]));
  B.box('leather', 0x4a2e18, 0.34, 0.12, 0.06, M([0, 1.64, 0.25]));
  if (lod) {
    for (const sx of [-1, 1]) {
      B.cyl('leather', 0x3a2414, 0.008, 0.008, 0.9, 4, M([sx * 0.3, 0.98, -0.18]));
      B.add('gold', new THREE.TorusGeometry(0.04, 0.008, 4, 8), 0x8a8a8a, M([sx * 0.31, 0.5, -0.18], [0, Math.PI / 2, 0]));
    }
    B.add('leather', new THREE.TorusGeometry(0.085, 0.012, 4, 12), 0x3a2414, M([0, 1.73, -1.3], [0.4, 0, 0], [1, 1.1, 1]));
    B.add('leather', new THREE.TorusGeometry(0.115, 0.01, 4, 12), 0x3a2414, M([0, 1.92, -1.02], [1.2, 0, 0], [1, 1.2, 1]));
    if (s.tassels) for (const z of [-0.65, 0.6]) B.cone('cloth', 0xc02020, 0.06, 0.14, 8, M([0, z < 0 ? 1.55 : 1.45, z], [Math.PI, 0, 0]));
  }
  if (s.barding) {
    B.sph('metal', s.barding, 0.36, M([0, 1.2, -0.56], [0, 0, 0], [1.0, 1.1, 1.05]), 14, 10, 0, Math.PI * 0.7);
    B.limb('metal', s.barding, V(0, 1.4, -0.66), V(0, 1.86, -0.94), 0.225, 0.15, 12, false);
    B.box('metal', s.barding, 0.12, 0.22, 0.3, M([0, 1.95, -1.15], [0.9, 0, 0]));
  }
}

// —— 四輪車（諸葛亮） ——
function buildCart(B) {
  const lac = 0x6a1c14, wood = 0x5a3a1e, gold = 0xc9a04a;
  B.box('wood', lac, 0.9, 0.08, 1.05, M([0, 0.62, 0]));
  B.box('wood', lac, 0.72, 0.1, 0.6, M([0, 0.75, 0.05]));
  B.box('wood', lac, 0.74, 0.55, 0.06, M([0, 1.05, 0.38], [-0.15, 0, 0]));
  for (const sx of [-1, 1]) { B.box('wood', lac, 0.06, 0.25, 0.55, M([sx * 0.38, 0.92, 0.08])); B.box('gold', gold, 0.07, 0.03, 0.56, M([sx * 0.38, 1.05, 0.08])); }
  for (const [x, z] of [[-0.5, -0.38], [0.5, -0.38], [-0.5, 0.38], [0.5, 0.38]]) {
    B.add('wood', new THREE.TorusGeometry(0.3, 0.03, 6, B.s(20)), wood, M([x, 0.32, z], [0, Math.PI / 2, 0]));
    B.cyl('gold', gold, 0.05, 0.05, 0.08, 8, M([x, 0.32, z], [0, 0, Math.PI / 2]));
    if (B.lod) for (let i = 0; i < 6; i++) B.box('wood', wood, 0.02, 0.56, 0.02, M([x, 0.32, z], [i * Math.PI / 6, 0, 0]));
  }
  B.cyl('wood', wood, 0.02, 0.02, 0.6, 6, M([0, 0.6, -0.8], [Math.PI / 2 - 0.3, 0, 0]));
}

// ════════════════ 主要人物造型 ════════════════
const WEI_A = 0x3e4f6e, WEI_C = 0x1f2d4e, SHU_A = 0x7a6a3a, SHU_C = 0x2f5a32, WU_A = 0x6a2a22, WU_C = 0x8e2a1e;
export const HERO = {
  // 魏
  caopi: { head: 'crown', beard: 'short', armored: true, armor: 0x2a3044, cloth: 0x1a1f38, trim: 0xe0b040, weapon: 'sword', arms: 'weapon', horse: { color: 0x1a1612 }, cape: 0x7a1a1a, bio: '曹操次子，受漢禪即帝位，建立曹魏。著《典論》，文采斐然。' },
  caorui: { head: 'crown', beard: null, cloth: 0x1f2540, trim: 0xe0b040, robe: true, weapon: 'sword', horse: { color: 0xe8e0d0 }, cape: 0x3a1a4a, bio: '魏明帝。曹丕之子，沉毅好斷，任用司馬懿、曹真抵禦蜀吳。' },
  caoren: { head: 'helmet', beard: 'full', armored: true, armor: 0x5a6274, cloth: WEI_C, plume: 0x2a3a8a, weapon: 'ji', horse: { color: 0x5a3a22, barding: 0x4a5060 }, cape: 0x1a2a5a, fierce: true, bio: '曹操從弟，魏國大司馬。善守，樊城之戰力拒關羽。' },
  caoxiu: { head: 'helmet', beard: 'short', armored: true, armor: 0x4a5a78, cloth: WEI_C, plume: 0xc02020, weapon: 'spear', horse: { color: 0x7a5232 }, cape: 0x2a3a6a, bio: '曹操族子，「此吾家千里駒也」。石亭之戰中周魴詐降之計。' },
  caozhen: { head: 'helmet', beard: 'short', armored: true, armor: 0x485876, cloth: WEI_C, plume: 0x2a3a8a, weapon: 'spear', horse: { color: 0x3a2a1e }, cape: 0x1a2a5a, bio: '曹操養子，魏大將軍，多次抵禦諸葛亮北伐。' },
  zhangliao: { head: 'helmet', beard: 'short', armored: true, armor: 0x2c3a58, cloth: 0x15203a, plume: 0x1a1a1a, weapon: 'ji', horse: { color: 0x141210, barding: 0x3a4660 }, cape: 0x101a30, fierce: true, bio: '合肥之戰以八百破十萬，威震逍遙津，江東小兒聞名止啼。' },
  zhanghe: { head: 'helmet', beard: 'short', armored: true, armor: 0x5a6478, cloth: WEI_C, plume: 0x2a6a3a, weapon: 'spear', horse: { color: 0x8a6440 }, cape: 0x2a3a5a, bio: '河北名將，識變數，善處營陳。街亭大破馬謖。' },
  xuhuang: { head: 'helmet', beard: 'full', armored: true, armor: 0x4a525e, cloth: WEI_C, weapon: 'axe', horse: { color: 0x6b4428 }, cape: 0x1a2a4a, bio: '治軍嚴整，有周亞夫之風，揮大斧解樊城之圍。' },
  simayi: { head: 'jinxian', beard: 'long', beardColor: 0x2a2420, cloth: 0x18141e, trim: 0x8a6ab0, robe: true, weapon: 'sword', arms: 'weapon', horse: { color: 0x2a2018 }, cape: 0x3a2a4a, bio: '深沉有謀，鷹視狼顧。五丈原堅壁不出，熬死諸葛亮。' },
  xiahoushang: { head: 'helmet', beard: 'short', armored: true, armor: WEI_A, cloth: WEI_C, plume: 0xd0d0d0, weapon: 'spear', horse: { color: 0x9a7a5a } },
  xiahoumao: { head: 'gold', beard: null, cloth: 0x4a5a8a, robe: true, weapon: 'sword', horse: { color: 0xe8e0d0 }, bio: '夏侯惇之子，娶曹操之女，怯而無謀。' },
  guohuai: { head: 'helmet', beard: 'short', armored: true, armor: WEI_A, cloth: WEI_C, plume: 0x2a3a8a, weapon: 'spear', horse: { color: 0x5a3a22 } },
  haozhao: { head: 'helmet', beard: 'full', armored: true, armor: 0x5a5a5a, cloth: 0x2a2a3a, plume: 0x8a1a1a, weapon: 'sword', arms: 'weapon', horse: { color: 0x4a3020 }, fierce: true, bio: '以千餘人守陳倉，拒諸葛亮數萬大軍二十餘日。' },
  manchong: { head: 'helmet', beard: 'long', armored: true, armor: 0x485060, cloth: 0x1a2a4a, weapon: 'sword', horse: { color: 0x3a2a1e }, bio: '剛毅多智，鎮守合肥新城，屢挫孫權。' },
  jiakui: { head: 'jinxian', beard: 'short', cloth: 0x2a3a5a, robe: true, weapon: 'sword', horse: { color: 0x7a5a3a } },
  changdiao: { head: 'helmet', beard: 'short', armored: true, armor: WEI_A, cloth: WEI_C, weapon: 'dao', horse: { color: 0x6b4428 } },
  caotai: { head: 'helmet', beard: null, armored: true, armor: WEI_A, cloth: WEI_C, plume: 0xc02020, weapon: 'spear', horse: { color: 0x8a6440 } },
  // 蜀
  liubei: { head: 'gold', beard: 'short', armored: true, armor: 0xb09040, cloth: 0x2a6a3a, trim: 0xf0d060, weapon: 'twin', arms: 'twin', horse: { color: 0xf0ece0, cloth: 0x2a6a3a, tassels: true }, cape: 0xd4b040, bio: '漢中山靖王之後，仁德布於四海。雙股劍，乘的盧馬。' },
  zhugeliang: { head: 'guanjin', hatColor: 0x2a3850, beard: 'thin', cloth: 0xf2efe6, trim: 0x2a3a5a, robe: true, weapon: 'fan', arms: 'fan', mount: 'cart', cape: null, bio: '臥龍先生，羽扇綸巾。鞠躬盡瘁，死而後已。' },
  zhaoyun: { head: 'helmet', helmColor: 0xd8dce4, beard: null, armored: true, armor: 0xc8ccd6, cloth: 0xeceae4, plume: 0xf8f8f8, weapon: 'silverSpear', arms: 'spear', tassel: 0xf0f0f0, horse: { color: 0xf6f4ee, cloth: 0xe8e8e8, tassels: true }, cape: 0xf2f2f2, bio: '常山趙子龍，一身是膽。白馬銀槍，長坂坡七進七出。' },
  machao: { head: 'lion', helmColor: 0xdcdcdc, beard: null, armored: true, armor: 0xd0d4dc, cloth: 0xf0f0f0, weapon: 'spear', arms: 'spear', horse: { color: 0xf2f0ea, cloth: 0xc8c8c8 }, cape: 0xf6f6f6, bio: '錦馬超，西涼豪傑，獅盔白袍，羌胡敬服。' },
  zhangfei: { head: 'helmet', helmColor: 0x2a2a2a, beard: 'bushy', armored: true, armor: 0x2a2620, cloth: 0x1a1a1a, skin: 0xc89a72, weapon: 'snake', arms: 'spear', fierce: true, horse: { color: 0x141210, barding: 0x2a2a2a }, cape: 0x3a1a10, bio: '豹頭環眼，燕頷虎鬚，聲若巨雷。丈八蛇矛，喝斷長坂橋。' },
  weiyan: { head: 'helmet', beard: 'full', armored: true, armor: 0x6a4a2a, cloth: 0x5a2a1a, face: 0xb86a48, weapon: 'dao', fierce: true, plume: 0x1a1a1a, horse: { color: 0x6a2a1a }, cape: 0x2a1a1a, bio: '勇猛過人，鎮守漢中十餘年。曾獻子午谷奇謀。' },
  huangquan: { head: 'jinxian', beard: 'long', cloth: 0x2a4a3a, robe: true, weapon: 'sword', horse: { color: 0x6b4428 } },
  masu: { head: 'guanjin', hatColor: 0x2a3a2a, beard: 'short', cloth: 0x3a5a4a, robe: true, weapon: 'sword', horse: { color: 0x8a6440 }, bio: '才器過人，好論軍計。「攻心為上」，卻失街亭。' },
  wangping: { head: 'helmet', beard: 'short', armored: true, armor: SHU_A, cloth: SHU_C, plume: 0x2a6a3a, weapon: 'spear', horse: { color: 0x5a3a22 } },
  jiangwei: { head: 'helmet', beard: null, armored: true, armor: 0x7a8a5a, cloth: 0x2a5a3a, plume: 0xc02020, weapon: 'spear', arms: 'spear', horse: { color: 0x3a2a1e, tassels: true }, cape: 0x2a5a3a, bio: '天水麒麟兒，諸葛亮傳人，「凡人中之傑也」。' },
  wuban: { head: 'helmet', beard: 'short', armored: true, armor: SHU_A, cloth: SHU_C, weapon: 'dao', horse: { color: 0x6b4428 } },
  guanxing: { head: 'headband', bandColor: 0x2a6a3a, beard: null, armored: true, armor: 0x3a6a4a, cloth: 0x2a5a32, face: 0xc06a48, weapon: 'guandao', horse: { color: 0x9a3a1a }, cape: 0x2a6a3a, bio: '關羽次子，繼承青龍偃月刀。' },
  zhangbao: { head: 'headband', bandColor: 0x1a1a1a, beard: 'short', armored: true, armor: 0x3a3a30, cloth: 0x1a2a1a, weapon: 'snake', arms: 'spear', fierce: true, horse: { color: 0x1a1612 } },
  maliang: { head: 'jinxian', beard: 'short', hair: 0x161210, cloth: 0x3a5a3a, robe: true, weapon: 'sword', horse: { color: 0xe8e0d0 }, bio: '「馬氏五常，白眉最良」，眉中有白毛。' },
  // 吳
  sunquan: { head: 'crown', beard: 'full', beardColor: 0x5a2a4a, hair: 0x3a1a2a, armored: true, armor: 0xa0302a, cloth: 0x7a1a16, trim: 0xe0b040, weapon: 'sword', horse: { color: 0x7a4a2a, cloth: 0x8a1a1a, tassels: true }, cape: 0xb02a20, bio: '碧眼紫髯，坐斷東南。「生子當如孫仲謀」。' },
  luxun: { head: 'guanjin', hatColor: 0x2a1a1a, beard: null, cloth: 0xf0ebe0, trim: 0xa02a20, robe: true, armored: false, weapon: 'sword', horse: { color: 0xf0ece4, cloth: 0xa02a20 }, cape: 0xa02a20, bio: '書生拜將，夷陵火燒連營七百里，石亭大破曹休。' },
  zhoutai: { head: 'helmet', beard: 'full', armored: true, armor: 0x5a2a22, cloth: WU_C, plume: 0x1a1a1a, skin: 0xc8946c, weapon: 'dao', fierce: true, horse: { color: 0x3a2418 }, cape: 0x6a1a14, bio: '數度捨身護孫權，身被十二創，皮膚如刻畫。' },
  zhuhuan: { head: 'helmet', beard: 'short', armored: true, armor: WU_A, cloth: WU_C, plume: 0xe0b040, weapon: 'spear', horse: { color: 0x6b4428 }, bio: '濡須之戰以五千破曹仁數萬，「客倍而主人半」。' },
  zhuran: { head: 'helmet', beard: 'short', armored: true, armor: WU_A, cloth: WU_C, weapon: 'spear', horse: { color: 0x8a6440 } },
  handang: { head: 'helmet', beard: 'long', beardColor: 0x6a6a6a, armored: true, armor: 0x5a3a2a, cloth: WU_C, weapon: 'dao', horse: { color: 0x5a3a22 }, bio: '江東三代老將，善弓馬。' },
  xusheng: { head: 'helmet', beard: 'short', armored: true, armor: WU_A, cloth: WU_C, plume: 0xc02020, weapon: 'ji', horse: { color: 0x3a2a1e }, bio: '築疑城於長江，曹丕望之嘆曰：「吳有人焉」。' },
  dingfeng: { head: 'headband', bandColor: 0xc02020, beard: 'short', armored: true, armor: WU_A, cloth: WU_C, weapon: 'sword', horse: { color: 0x6b4428 } },
  panzhang: { head: 'helmet', beard: 'full', armored: true, armor: WU_A, cloth: WU_C, weapon: 'dao', horse: { color: 0x4a3020 } },
  zhugejin: { head: 'jinxian', beard: 'long', cloth: 0x6a2a2a, robe: true, weapon: 'sword', horse: { color: 0xe8e0d0 }, bio: '諸葛亮之兄，寬厚溫雅，屢為吳蜀通好。' },
  zhoufang: { head: 'guanjin', hatColor: 0x2a1a1a, beard: 'short', cloth: 0x5a2a2a, robe: true, weapon: 'sword', horse: { color: 0x7a5a3a }, bio: '斷髮詐降，誘曹休入石亭之伏。' },
  lvfan: { head: 'jinxian', beard: 'short', cloth: WU_C, robe: true, weapon: 'sword', horse: { color: 0x6b4428 } },
  quancong: { head: 'helmet', beard: 'short', armored: true, armor: WU_A, cloth: WU_C, plume: 0xe0b040, weapon: 'spear', horse: { color: 0x8a6440 } },
  sunhuan: { head: 'helmet', beard: null, armored: true, armor: WU_A, cloth: WU_C, plume: 0xc02020, weapon: 'spear', horse: { color: 0x5a3a22 } },
  // —— 赤壁時代 ——
  caocao: { head: 'gold', beard: 'short', beardColor: 0x2a2018, armored: true, armor: 0x2a3048, cloth: 0x1a1630, trim: 0xe8c050, weapon: 'sword', horse: { color: 0x7a1e14, mane: 0x1a0a06, tassels: true }, cape: 0x8a1a1a, fierce: true, bio: '治世之能臣，亂世之奸雄。挾天子以令諸侯，平定北方，橫槊賦詩。' },
  caozhi: { head: 'guanjin', hatColor: 0x1a1a2a, beard: null, cloth: 0x4a5a8a, robe: true, weapon: 'sword', horse: { color: 0xf0ece0 }, bio: '才高八斗，七步成詩。〈洛神賦〉傳誦千古。' },
  caohong: { head: 'helmet', beard: 'full', armored: true, armor: 0x5a6070, cloth: WEI_C, plume: 0xc02020, weapon: 'dao', horse: { color: 0xf0e8d8 }, bio: '「天下可無洪，不可無君」，滎陽讓馬救曹操。' },
  xiahoudun: { head: 'helmet', beard: 'full', eyepatch: true, armored: true, armor: 0x3a4660, cloth: 0x15203a, plume: 0x1a1a1a, weapon: 'spear', fierce: true, horse: { color: 0x2a1e16, barding: 0x3a4660 }, cape: 0x1a2a4a, bio: '曹操最信任的大將。征呂布時左目中箭，人稱「盲夏侯」。' },
  xiahouyuan: { head: 'helmet', beard: 'short', armored: true, armor: 0x4a5878, cloth: WEI_C, plume: 0xe0b040, weapon: 'dao', horse: { color: 0x8a5a30 }, cape: 0x2a3a6a, bio: '虎步關右，善長途奔襲，「三日五百，六日一千」。' },
  xuchu: { head: 'headband', bandColor: 0x2a2a4a, beard: 'full', bare: true, fat: true, cloth: 0x2a3050, skin: 0xd0a07a, pants: 0x2a2a3a, weapon: 'dao', fierce: true, horse: { color: 0x3a2a1e }, bio: '虎癡。曾裸衣鬥馬超，護衛曹操寸步不離。' },
  yujin: { head: 'helmet', beard: 'long', armored: true, armor: WEI_A, cloth: WEI_C, plume: 0x2a3a8a, weapon: 'spear', horse: { color: 0x5a3a22 }, bio: '治軍嚴整，五子良將之一。樊城被關羽水淹七軍而降。' },
  lejin: { head: 'helmet', beard: 'short', armored: true, armor: WEI_A, cloth: WEI_C, plume: 0xc02020, weapon: 'ji', horse: { color: 0x6b4428 } },
  xunyu: { head: 'jinxian', beard: 'long', cloth: 0x2a2a4a, robe: true, weapon: 'sword', horse: { color: 0xe8e0d0 }, bio: '王佐之才，曹操稱為「吾之子房」。' },
  jiaxu: { head: 'jinxian', beard: 'long', beardColor: 0x9a9a9a, hair: 0x8a8a8a, cloth: 0x2a2018, robe: true, weapon: 'sword', horse: { color: 0x3a2a1e }, bio: '算無遺策。潼關之戰獻離間計，使馬超、韓遂相疑。' },
  pangde: { head: 'helmet', beard: 'full', armored: true, armor: 0x6a6050, cloth: 0x4a3a2a, plume: 0xf0f0f0, weapon: 'dao', fierce: true, horse: { color: 0xf0ece0 }, bio: '抬櫬決戰關羽，寧為國家鬼，不為賊將。' },
  dengai: { head: 'helmet', beard: 'short', armored: true, armor: WEI_A, cloth: WEI_C, plume: 0x2a3a8a, weapon: 'spear', horse: { color: 0x5a3a22 }, bio: '口吃而多謀，後偷渡陰平滅蜀。' },
  guanyu: { head: 'headband', bandColor: 0x2a7a3a, beard: 'long', beardColor: 0x0e0a08, face: 0xb8503a, skin: 0xc8805a, armored: true, armor: 0x3a6a3a, cloth: 0x2a6a32, trim: 0xd4a640, weapon: 'guandao', fierce: true, horse: { color: 0x9a2a14, mane: 0x2a0a04, tassels: true }, cape: 0x2a7a3a, bio: '美髯公。紅臉綠袍，青龍偃月刀，坐騎赤兔。溫酒斬華雄、過五關斬六將。' },
  pangtong: { head: 'guanjin', hatColor: 0x3a2a1a, beard: 'short', skin: 0xb88a62, face: 0xb08560, cloth: 0x4a4030, robe: true, weapon: 'fan', arms: 'fan', horse: { color: 0xe8e8e0 }, cape: null, bio: '鳳雛先生，與臥龍齊名。獻入蜀三計，卒於雒城落鳳坡。' },
  guanping: { head: 'helmet', beard: null, armored: true, armor: 0x4a6a4a, cloth: 0x2a5a32, plume: 0x2a6a3a, weapon: 'dao', horse: { color: 0x6b4428 } },
  liaohua: { head: 'headband', bandColor: 0xc8a030, beard: 'short', armored: true, armor: SHU_A, cloth: SHU_C, weapon: 'dao', horse: { color: 0x5a3a22 }, bio: '黃巾出身，追隨關羽。「蜀中無大將，廖化作先鋒」。' },
  huangzhong: { head: 'helmet', helmColor: 0xb09040, beard: 'long', beardColor: 0xe8e8e0, hair: 0xd8d8d0, armored: true, armor: 0xa08a40, cloth: 0x3a5a2a, plume: 0xc02020, weapon: 'dao', quiver: true, horse: { color: 0x8a5a30 }, cape: 0x7a2a1a, bio: '老當益壯，百步穿楊。定軍山一戰斬夏侯淵。' },
  fazheng: { head: 'jinxian', beard: 'short', cloth: 0x2a4a4a, robe: true, weapon: 'sword', horse: { color: 0x3a2a1e }, bio: '劉備的謀主，定軍山之戰「可擊矣」。' },
  yanyan: { head: 'helmet', beard: 'long', beardColor: 0xe0e0dc, hair: 0xd0d0c8, armored: true, armor: 0x5a6a6a, cloth: 0x2a5a5a, weapon: 'dao', fierce: true, horse: { color: 0x6b4428 }, bio: '「我州但有斷頭將軍，無有降將軍也！」' },
  mengda: { head: 'helmet', beard: 'short', armored: true, armor: SHU_A, cloth: SHU_C, weapon: 'spear', horse: { color: 0x7a5232 } },
  mifang: { head: 'gold', beard: 'short', cloth: 0x4a5a3a, robe: true, weapon: 'sword', horse: { color: 0xe8e0d0 } },
  zhouyu: { head: 'gold', beard: null, armored: true, armor: 0xb0302a, cloth: 0x9a1e18, trim: 0xe8c050, weapon: 'sword', horse: { color: 0xf4f0e8, cloth: 0xa01e18, tassels: true }, cape: 0xd8b040, bio: '美周郎，雄姿英發。赤壁之戰火燒曹營，「檣櫓灰飛煙滅」。' },
  lusu: { head: 'jinxian', beard: 'short', cloth: 0x5a2a20, robe: true, weapon: 'sword', horse: { color: 0x6b4428 }, bio: '榻上策：鼎足江東以觀天下之釁。力主孫劉聯盟。' },
  lvmeng: { head: 'helmet', beard: 'short', armored: true, armor: WU_A, cloth: WU_C, plume: 0x1a1a1a, weapon: 'dao', horse: { color: 0x3a2a1e }, bio: '「士別三日，當刮目相待」。白衣渡江，奪取荊州。' },
  huanggai: { head: 'helmet', beard: 'full', beardColor: 0x8a8a84, hair: 0x9a9a94, armored: true, armor: 0x6a3a2a, cloth: WU_C, weapon: 'whip', fierce: true, horse: { color: 0x5a3a22 }, bio: '苦肉計詐降，以火船焚燒曹操艦隊。' },
  chengpu: { head: 'helmet', beard: 'long', beardColor: 0xb8b8b0, armored: true, armor: WU_A, cloth: WU_C, weapon: 'ji', horse: { color: 0x6b4428 }, bio: '江東四代老臣，赤壁之戰任右都督。' },
  ganning: { head: 'headband', bandColor: 0xe0b040, beard: 'short', armored: false, bare: true, skin: 0xc89468, cloth: 0xa02a20, pants: 0x3a2018, weapon: 'dao', feathers: true, fierce: true, horse: { color: 0x2a1e16 }, cape: 0xe0b040, bio: '錦帆賊出身，腰懸銅鈴。百騎劫魏營，不折一人。' },
  lingtong: { head: 'helmet', beard: null, armored: true, armor: WU_A, cloth: WU_C, plume: 0xf0f0f0, weapon: 'spear', horse: { color: 0xe8e0d0 }, bio: '逍遙津之戰捨命護孫權突圍，身被重創。' },
  sunshangxiang: { head: null, female: true, armored: true, armor: 0xc04040, cloth: 0xc02a3a, trim: 0xf0d060, weapon: 'bow', arms: 'bow', horse: { color: 0xf0ece0, cloth: 0xc02a3a }, cape: 0xf0c0c0, bio: '孫權之妹，才捷剛猛，侍婢百餘人皆執刀侍立。嫁劉備。' },
  weiwen: { head: 'helmet', beard: 'short', armored: true, armor: WU_A, cloth: WU_C, weapon: 'spear', horse: { color: 0x6b4428 }, bio: '奉孫權之命率甲士萬人浮海求夷州（今台灣）。' },
  liuzhang: { head: 'gold', beard: 'short', fat: true, cloth: 0x2a6a6a, robe: true, weapon: 'sword', horse: { color: 0xe8e0d0 }, bio: '劉焉之子，性情寬柔，終將益州讓與劉備。' },
  zhangren: { head: 'helmet', beard: 'short', armored: true, armor: 0x4a6a6a, cloth: 0x1e4a4a, plume: 0xc02020, weapon: 'spear', fierce: true, horse: { color: 0x3a2a1e }, bio: '忠勇之將，「老臣終不復事二主」。' },
  liyan: { head: 'helmet', beard: 'short', armored: true, armor: 0x4a6a6a, cloth: 0x1e4a4a, weapon: 'spear', horse: { color: 0x6b4428 } },
  zhanglu: { head: 'taoist', beard: 'long', cloth: 0xc8a840, robe: true, weapon: 'sword', horse: { color: 0xe8e0d0 }, bio: '五斗米道師君，據漢中三十年，政教合一。' },
  zhangwei: { head: 'helmet', beard: 'full', armored: true, armor: 0x5a4a6a, cloth: 0x3a2a4a, weapon: 'spear', horse: { color: 0x6b4428 } },
  yangren: { head: 'helmet', beard: 'short', armored: true, armor: 0x5a4a6a, cloth: 0x3a2a4a, weapon: 'dao', horse: { color: 0x5a3a22 } },
  hansui: { head: 'furhat', beard: 'long', beardColor: 0xc8c8c0, armored: true, armor: 0x7a5a3a, cloth: 0x8a4a1a, weapon: 'dao', horse: { color: 0x8a6440 }, bio: '割據涼州三十餘年的老將，與馬騰結為兄弟。' },
  madai: { head: 'helmet', beard: 'short', armored: true, armor: 0x8a6a4a, cloth: 0x8a4a1a, weapon: 'spear', horse: { color: 0xe8e0d0 } },
  chenggongying: { head: 'furhat', hatColor: 0x4a3a2a, beard: 'short', cloth: 0x6a4a2a, robe: true, weapon: 'sword', horse: { color: 0x6b4428 } },
  hanxuan: { head: 'gold', beard: 'short', fat: true, cloth: 0x4a5a6a, robe: true, weapon: 'sword', horse: { color: 0x7a5a3a } },
  jinxuan: { head: 'jinxian', beard: 'short', cloth: 0x4a5a6a, robe: true, weapon: 'sword', horse: { color: 0x6b4428 } },
  liudu: { head: 'jinxian', beard: 'long', cloth: 0x4a5a6a, robe: true, weapon: 'sword', horse: { color: 0x6b4428 } },
  shixie: { head: 'jinxian', beard: 'long', beardColor: 0xd0d0c8, hair: 0xc0c0b8, cloth: 0x7a3a4a, robe: true, weapon: 'sword', horse: { color: 0xe8e0d0 }, bio: '交趾太守，治交州四十餘年，被尊為「南交學祖」。' },
  wutugu: { head: 'tribal', beard: 'full', bare: true, fat: true, skin: 0x8a5a3a, cloth: 0xb08a4a, pants: 0x8a6a3a, weapon: 'axe', fierce: true, horse: { color: 0x3a2a1a }, bio: '烏戈國主，身披刀槍不入的藤甲。' },
  yizhouwang: { head: 'tribal', beard: 'short', bare: true, skin: 0xa8704a, cloth: 0x3a6a8a, pants: 0x3a2a1a, weapon: 'spear', horse: { color: 0x6b4428 }, bio: '夷州（今台灣）的部落首領。' },
  xushu: { head: 'guanjin', hatColor: 0x2a2a2a, beard: 'short', cloth: 0x3a3a4a, robe: true, weapon: 'sword', horse: { color: 0x6b4428 }, bio: '單福、走馬薦諸葛。「徐庶進曹營，一言不發」。' },
  // 南蠻
  menghuo: { head: 'tribal', beard: 'full', armored: false, cloth: 0x8a5a2a, skin: 0xb07848, belt: 0x6a3a1a, pants: 0x5a3a1a, weapon: 'axe', fierce: true, horse: { color: 0x9a3a1a, mane: 0x3a1a0a }, cape: 0xc8a050, bio: '南中豪帥，七擒七縱，終心悅誠服：「南人不復反矣」。' },
  zhurong: { head: 'tribal', female: true, armored: false, cloth: 0xb02a2a, skin: 0xc08a5a, pants: 0x6a2a1a, weapon: 'knife', horse: { color: 0xe0d0b0 }, cape: 0xe0b040, bio: '孟獲之妻，相傳為祝融氏之後，善使飛刀。' },
  mengyou: { head: 'tribal', beard: 'short', cloth: 0x7a4a2a, skin: 0xb07848, weapon: 'dao', horse: { color: 0x6b4428 } },
  yonggai: { head: 'bun', beard: 'short', cloth: 0x6a4a2a, robe: true, weapon: 'sword', horse: { color: 0x7a5a3a } },
};

// 劇情中的文臣、使者
export const NPC = {
  '陳群': { f: 'wei', head: 'jinxian', beard: 'long', cloth: 0x2a3050, robe: true },
  '劉曄': { f: 'wei', head: 'jinxian', beard: 'short', cloth: 0x3a3a5a, robe: true },
  '蔣濟': { f: 'wei', head: 'jinxian', beard: 'thin', cloth: 0x2a3a4a, robe: true },
  '侍中': { f: 'wei', head: 'jinxian', beard: 'long', beardColor: 0x8a8a8a, cloth: 0x3a2a2a, robe: true },
  '靳詳': { f: 'shu', head: 'guanjin', beard: 'short', cloth: 0x3a4a3a, robe: true },
  '闞澤': { f: 'wu', head: 'jinxian', beard: 'long', cloth: 0x5a2a2a, robe: true },
  '張昭': { f: 'wu', head: 'jinxian', beard: 'long', beardColor: 0xb0b0b0, hair: 0x9a9a9a, cloth: 0x4a1a1a, robe: true },
  '漢獻帝': { f: 'wei', head: 'crown', beard: 'short', cloth: 0xc8a030, trim: 0xe03030, robe: true },
  '程昱': { f: 'wei', head: 'jinxian', beard: 'long', cloth: 0x2a2a3a, robe: true },
  '蔡瑁': { f: 'wei', head: 'helmet', beard: 'short', armored: true, armor: WEI_A, cloth: WEI_C },
  '辛毗': { f: 'wei', head: 'jinxian', beard: 'long', cloth: 0x2a3050, robe: true },
  '劉琦': { f: 'shu', head: 'guanjin', beard: null, cloth: 0x4a5a4a, robe: true },
  '張松': { f: 'liuzhang', head: 'jinxian', beard: 'short', skin: 0xc09070, cloth: 0x2a5a5a, robe: true },
  '鄧芝': { f: 'shu', head: 'jinxian', beard: 'short', cloth: 0x2a5a3a, robe: true },
  '劉禪': { f: 'shu', head: 'crown', beard: null, fat: true, cloth: 0x2a5a32, robe: true },
  '楊儀': { f: 'shu', head: 'jinxian', beard: 'thin', cloth: 0x2a4a3a, robe: true },
  '步騭': { f: 'wu', head: 'jinxian', beard: 'short', cloth: 0x5a2a2a, robe: true },
  '大喬': { f: 'wu', female: true, cloth: 0xe0a0b0, robe: true },
  '小喬': { f: 'wu', female: true, cloth: 0xb0d0e0, robe: true },
  '眾將': { f: 'wei', head: 'helmet', beard: 'full', armored: true, armor: WEI_A, cloth: WEI_C, plume: 0xc02020 },
  '諸將': { f: 'wu', head: 'helmet', beard: 'full', armored: true, armor: WU_A, cloth: WU_C, plume: 0xc02020 },
};

function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// 沒有專屬造型的武將，依勢力與能力自動生成
export function heroSpec(id) {
  if (HERO[id]) return HERO[id];
  if (NPC[id]) return NPC[id];
  const g = GENERALS[id];
  const f = g?.f || 'wei';
  const h = hash(id);
  const pal = { wei: [WEI_A, WEI_C], shu: [SHU_A, SHU_C], wu: [WU_A, WU_C], nanman: [0x6a4a2a, 0x7a4a2a] }[f];
  const scholar = g && g.int > g.war + 12;
  return {
    head: scholar ? (h & 1 ? 'jinxian' : 'guanjin') : (f === 'nanman' ? 'tribal' : 'helmet'),
    beard: ['short', 'full', 'long', null][h % 4], armored: !scholar, armor: pal[0], cloth: pal[1], robe: scholar,
    plume: [0xc02020, 0x1a1a1a, 0xe0b040][(h >> 3) % 3], weapon: scholar ? 'sword' : ['spear', 'dao', 'ji', 'sword'][(h >> 5) % 4],
    horse: { color: [0x6b4428, 0x3a2a1e, 0x8a6440, 0x1a1612, 0xe8e0d0][(h >> 7) % 5] },
  };
}

// —— 材質 ——
const MATS = {};
function mat(key) {
  if (MATS[key]) return MATS[key];
  const o = { vertexColors: true, roughness: 0.75, metalness: 0.0 };
  if (key === 'metal') Object.assign(o, { roughness: 0.38, metalness: 0.65 });
  if (key === 'steel') Object.assign(o, { roughness: 0.22, metalness: 0.9 });
  if (key === 'gold') Object.assign(o, { roughness: 0.3, metalness: 0.75 });
  if (key === 'skin') Object.assign(o, { roughness: 0.6 });
  if (key === 'hair' || key === 'mane') Object.assign(o, { roughness: 0.9 });
  if (key === 'horse') Object.assign(o, { roughness: 0.55 });
  if (key === 'cloth' || key === 'cape') Object.assign(o, { roughness: 0.85, side: THREE.DoubleSide });
  if (key === 'leather') Object.assign(o, { roughness: 0.6 });
  return (MATS[key] = new THREE.MeshStandardMaterial(o));
}

function groupFrom(B) {
  const grp = new THREE.Group();
  for (const [k, geo] of Object.entries(B.merged())) {
    const m = new THREE.Mesh(geo, mat(k));
    m.castShadow = true; m.receiveShadow = true;
    grp.add(m);
  }
  return grp;
}

// —— 建立武將模型（有關節，可做動作） ——
// opts: { mounted, pose, portrait, unarmed }
export function makeHero(id, factionColor, opts = {}) {
  const spec = { ...heroSpec(id || '') };
  if (opts.portrait) { spec.arms = 'down'; spec.weapon = null; }
  if (opts.unarmed && spec.weapon !== 'fan') { spec.arms = 'down'; spec.weapon = null; }
  if (!id) Object.assign(spec, { head: 'helmet', beard: 'short', armored: true, armor: 0x6a6f78, cloth: factionColor, plume: 0xc02020, weapon: 'spear', horse: { color: 0x6b4428 } });
  const mounted = opts.mounted ?? true;
  const mount = mounted ? (spec.mount || 'horse') : null;
  const pose = opts.pose || (mount === 'cart' ? 'sit' : mount ? 'ride' : 'stand');
  if (spec.cape === undefined) spec.cape = new THREE.Color(factionColor).multiplyScalar(0.7).getHex();
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const rig = { hlegs: [], kind: animKind(spec.weapon), mounted: mount === 'horse', pose };
  // 坐騎
  if (mount === 'horse') {
    const R = new Rig(1), B = new Builder(1);
    buildHorse(B, { cloth: spec.cape ?? factionColor, ...spec.horse }, R);
    body.add(groupFrom(B));
    for (let i = 0; i < 4; i++) { const p = R.parts['hleg' + i]; const g = new THREE.Group(); g.position.copy(p.pivot); g.add(groupFrom(p.b)); body.add(g); rig.hlegs.push(g); }
  }
  if (mount === 'cart') { const B = new Builder(1); buildCart(B); body.add(groupFrom(B)); }
  // 人
  const off = pose === 'ride' ? 0.62 : pose === 'sit' ? -0.13 : 0;
  const rider = new THREE.Group(); rider.position.set(0, off, pose === 'sit' ? 0.05 : 0); body.add(rider);
  const R = new Rig(1), B = new Builder(1);
  const hands = buildHuman(B, spec, pose, R);
  for (const { m, hand } of weaponPlacementH(spec.weapon, hands, pose)) R.addInto('arm' + hand, m, W => buildWeapon(W, spec.weapon, spec));
  if (spec.weapon === 'bow' || spec.quiver) B.cyl('leather', 0x4a2e18, 0.06, 0.06, 0.5, 8, M([0.12, 1.35, 0.2], [0.3, 0, 0.2]));
  if (spec.armored && pose !== 'stand' && spec.weapon !== 'sword') {
    const W = new Builder(1); W.base = M([-0.24, 0.98, 0.05], [1.9, 0, 0.2]); buildWeapon(W, 'sword');
    for (const k in W.b) (B.b[k] ||= []).push(...W.b[k]);
  }
  rider.add(groupFrom(B));
  for (const name of ['armR', 'armL', 'legL', 'legR']) {
    const p = R.parts[name]; if (!p) continue;
    const g = new THREE.Group(); g.position.copy(p.pivot); g.add(groupFrom(p.b)); rider.add(g); rig[name] = g;
  }
  rig.riderY = off;
  root.userData.body = body;
  root.userData.rider = rider;
  root.userData.spec = spec;
  root.userData.rig = rig;
  return root;
}

// —— 動作 ——
export function animKind(w) {
  if (['spear', 'silverSpear', 'snake', 'ji'].includes(w)) return 'spear';
  if (['guandao', 'dao', 'axe'].includes(w)) return 'pole';
  if (w === 'bow') return 'archer';
  if (w === 'fan') return 'fan';
  return 'inf';
}
const _P = { aR: [0, 0, 0], aL: [0, 0, 0], lL: 0, lR: 0, h: [0, 0, 0, 0], lunge: 0, bob: 0, lean: 0 };
const smooth = (x) => x * x * (3 - 2 * x);
// kind：inf / spear / pole / archer / cav / fan；act：idle walk run fight shoot rout talk raise
// ph：步伐相位（依移動距離推進），t：攻擊節奏時間
export function poseAngles(kind, act, ph, t, mounted, out = { aR: [0, 0, 0], aL: [0, 0, 0], h: [0, 0, 0, 0] }) {
  out.aR[0] = out.aR[1] = out.aR[2] = 0; out.aL[0] = out.aL[1] = out.aL[2] = 0;
  out.lL = out.lR = 0; out.lunge = 0; out.bob = 0; out.lean = 0;
  for (let i = 0; i < 4; i++) out.h[i] = 0;
  const s = Math.sin(ph);
  const moving = act === 'walk' || act === 'run' || act === 'rout';
  if (!mounted) {
    if (moving) {
      const A = act === 'walk' ? 0.5 : 0.8;
      out.lL = A * s; out.lR = -A * s;
      out.aL[0] = -0.35 * A * s * (kind === 'archer' ? 0.3 : 1);
      out.aR[0] = 0.25 * A * s * (kind === 'inf' ? 1 : 0.3);
      out.bob = Math.abs(Math.cos(ph)) * (act === 'walk' ? 0.05 : 0.09);
      if (act !== 'walk') out.lean = -0.18;
    } else {
      out.bob = Math.sin(t * 1.6) * 0.008;
      out.aL[0] = Math.sin(t * 1.6) * 0.02;
    }
  } else {
    // 戰馬步伐：前後腿交錯
    const A = act === 'walk' ? 0.32 : moving ? 0.72 : 0;
    const offs = [0, 0.55, Math.PI, Math.PI + 0.55];
    for (let i = 0; i < 4; i++) out.h[i] = A * Math.sin(ph + offs[i]);
    out.bob = moving ? Math.abs(Math.sin(ph)) * (act === 'walk' ? 0.06 : 0.16) : 0;
    if (act === 'rout') out.lean = -0.25;
  }
  if (act === 'fight') {
    const c = (t % 1 + 1) % 1;
    if (!mounted) { out.lL = 0.28; out.lR = -0.22; }
    if (kind === 'spear' || kind === 'cav') {
      // 突刺
      let k;
      if (c < 0.5) k = -smooth(c / 0.5) * 0.5; else if (c < 0.62) k = -0.5 + smooth((c - 0.5) / 0.12) * 1.1; else k = 0.6 - smooth((c - 0.62) / 0.38) * 0.6;
      out.aR[0] = k * 0.7; out.aL[0] = k * 0.6;
      out.lunge = Math.max(0, k) * 0.55;
    } else if (kind === 'pole') {
      // 大刀橫掃
      let k;
      if (c < 0.45) k = smooth(c / 0.45); else if (c < 0.62) k = 1 - smooth((c - 0.45) / 0.17) * 2; else k = -1 + smooth((c - 0.62) / 0.38);
      out.aR[1] = k * 0.9; out.aR[0] = 0.3 + Math.abs(k) * 0.4; out.aL[1] = k * 0.7; out.aL[0] = 0.3;
      out.lean = -k * 0.08;
    } else if (kind === 'archer') {
      let k; if (c < 0.5) k = -smooth(c / 0.5) * 1.3; else if (c < 0.62) k = -1.3 + smooth((c - 0.5) / 0.12) * 2.2; else k = 0.9 - smooth((c - 0.62) / 0.38) * 0.9;
      out.aR[0] = k; out.lunge = Math.max(0, k) * 0.2;
    } else {
      // 揮砍：舉劍 → 下劈
      let k;
      if (c < 0.45) k = -smooth(c / 0.45) * 1.6; else if (c < 0.6) k = -1.6 + smooth((c - 0.45) / 0.15) * 2.5; else k = 0.9 - smooth((c - 0.6) / 0.4) * 0.9;
      out.aR[0] = k; out.aR[2] = -Math.min(0, k) * -0.25;
      out.aL[0] = 0.45; out.lunge = Math.max(0, k) * 0.3; out.lean = Math.max(0, k) * 0.12;
    }
  } else if (act === 'shoot') {
    // 拉弓：右手後拉，放箭
    const c = (t % 1 + 1) % 1;
    const draw = c < 0.7 ? smooth(c / 0.7) : 1 - smooth((c - 0.7) / 0.08 > 1 ? 1 : (c - 0.7) / 0.08);
    out.aR[1] = draw * 0.7; out.aR[0] = -draw * 0.15;
    out.aL[0] = 0.12;
    out.lean = draw * 0.05;
  } else if (act === 'talk') {
    out.aR[0] = 0.35 + Math.sin(t * 2.6) * 0.18; out.aR[2] = Math.sin(t * 1.3) * 0.08;
  } else if (act === 'raise') {
    out.aR[0] = 2.5; out.aR[2] = 0.2;
  }
  if (kind === 'fan' && act !== 'fight') { out.aR[2] += Math.sin(t * 1.4) * 0.1; }
  return out;
}

// 套用到武將模型
const _pa = { aR: [0, 0, 0], aL: [0, 0, 0], h: [0, 0, 0, 0] };
export function animateHero(hero, act, ph, t) {
  const rig = hero.userData.rig; if (!rig) return;
  const p = poseAngles(rig.kind, act, ph, t, rig.mounted, _pa);
  if (rig.armR) rig.armR.rotation.set(p.aR[0], p.aR[1], p.aR[2]);
  if (rig.armL) rig.armL.rotation.set(p.aL[0], p.aL[1], p.aL[2]);
  if (rig.legL) rig.legL.rotation.x = p.lL;
  if (rig.legR) rig.legR.rotation.x = p.lR;
  rig.hlegs.forEach((g, i) => g.rotation.x = p.h[i]);
  const rider = hero.userData.rider;
  rider.position.y = rig.riderY + (rig.mounted ? p.bob : 0);
  rider.position.z = -p.lunge * 0.4;
  rider.rotation.x = p.lean;
  if (!rig.mounted) hero.userData.body.position.y = p.bob;
  else hero.userData.body.position.y = p.bob * 0.4;
}

// —— 頭像（離屏渲染） ——
let pr = null;
const PORTRAITS = {};
function portraitRenderer() {
  if (pr) return pr;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(256, 256); renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff2e0, 0x5a4a3a, 2.0));
  const key = new THREE.DirectionalLight(0xffeedd, 3.0); key.position.set(-1.5, 2.5, -2.5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd090, 1.8); rim.position.set(2, 1.5, 2); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  pr = { renderer, scene, cam };
  return pr;
}
export function renderPortrait(id) {
  if (PORTRAITS[id]) return PORTRAITS[id];
  try {
    const { renderer, scene, cam } = portraitRenderer();
    const f = GENERALS[id]?.f || NPC[id]?.f || 'wei';
    const hero = makeHero(id, FACTIONS[f].color, { mounted: false, pose: 'stand', portrait: true });
    hero.rotation.y = 0.35;
    scene.add(hero);
    const spec = hero.userData.spec;
    const tall = ['tribal', 'crown', 'jinxian', 'lion'].includes(spec.head) || spec.plume != null;
    cam.position.set(-0.32, 1.72, -1.35); cam.lookAt(0, tall ? 1.74 : 1.69, 0);
    cam.fov = tall ? 27 : 23; cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(hero);
    hero.traverse(o => o.geometry && o.geometry.dispose());
    return (PORTRAITS[id] = url);
  } catch (e) { console.warn('portrait', id, e); return null; }
}
export function getPortrait(id) { return PORTRAITS[id] || null; }
export async function renderAllPortraits(onProgress) {
  const ids = [...Object.keys(GENERALS), ...Object.keys(NPC)];
  for (let i = 0; i < ids.length; i++) {
    renderPortrait(ids[i]);
    if (i % 6 === 5) { onProgress && onProgress(i / ids.length); await new Promise(r => setTimeout(r, 0)); }
  }
}

// —— 模型檢視器（軍營） ——
export function openViewer(container, id, factionColor) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  const fit = () => { const r = container.getBoundingClientRect(); const w = Math.max(50, r.width), h = Math.max(50, r.height); renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(fit);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff2e0, 0x5a4a3a, 2.0));
  const camLight = new THREE.DirectionalLight(0xfff4e8, 2.2); scene.add(camLight);
  const sun = new THREE.DirectionalLight(0xffeedd, 2.2); sun.position.set(-3, 5, -3); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 });
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xffc080, 1.2); rim.position.set(3, 2, 3); scene.add(rim);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1.8, 40), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  let hero = makeHero(id, factionColor, { mounted: true });
  scene.add(hero);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  fit(); ro.observe(container);
  let ang = 2.6, drag = null, mounted = true, alive = true;
  const el = renderer.domElement;
  el.style.cursor = 'grab';
  el.onpointerdown = (e) => { drag = e.clientX; el.setPointerCapture(e.pointerId); };
  el.onpointermove = (e) => { if (drag != null) { ang -= (e.clientX - drag) * 0.01; drag = e.clientX; } };
  el.onpointerup = () => { drag = null; };
  const acts = ['idle', 'fight', 'walk', 'fight', 'run'];
  let t0 = performance.now(), ph = 0;
  function loop() {
    if (!alive) return;
    if (drag == null) ang += 0.006;
    const tt = (performance.now() - t0) / 1000;
    const act = acts[Math.floor(tt / 3) % acts.length];
    ph += (act === 'run' ? 0.25 : act === 'walk' ? 0.12 : 0);
    animateHero(hero, act === 'walk' && mounted ? 'walk' : act, ph, tt);
    const r = mounted ? 6.2 : 3.9, ty = mounted ? 1.25 : 1.0;
    cam.position.set(Math.sin(ang) * r, ty + 0.6, Math.cos(ang) * r); cam.lookAt(0, ty, 0);
    camLight.position.copy(cam.position).add(V(1, 2, 0));
    renderer.render(scene, cam);
    requestAnimationFrame(loop);
  }
  loop();
  return {
    toggleMount() { mounted = !mounted; scene.remove(hero); hero = makeHero(id, factionColor, { mounted }); scene.add(hero); return mounted; },
    dispose() { alive = false; ro.disconnect(); renderer.dispose(); el.remove(); scene.traverse(o => o.geometry && o.geometry.dispose()); },
  };
}

// —— 批次士兵用的幾何（低細節，tint 部分著勢力色；依勢力有不同裝束） ——
const TROOP_STYLE = {
  wei: { armor: 0x4a505e, head: 'helmet', plume: 'tint', shield: 'round', barding: 0x3a4250 },
  shu: { armor: 0x8a7a4a, head: 'helmet', plume: 0xf2f2ee, shield: 'round' },
  wu: { armor: 0x6a3428, head: 'helmet', plume: 'tint', shield: 'oval', archerHead: 'headband' },
  nanman: { armor: 0xb08a4a, head: 'tribal', bare: true, shield: 'oval', skin: 0x9a6a44 },
  yizhou: { armor: 0x9a7a4a, head: 'tribal', bare: true, shield: 'oval', skin: 0xa06c48 },
  xiliang: { armor: 0x7a5a3a, head: 'furhat', shield: 'round', plume: null },
  liuzhang: { armor: 0x5a6a6a, head: 'helmet', plume: 'tint', shield: 'round' },
  zhanglu: { armor: 0x5a5060, head: 'headband', shield: 'round' },
  jingnan: { armor: 0x5a6068, head: 'helmet', plume: 'tint', shield: 'round' },
  shixie: { armor: 0x7a6050, head: 'headband', shield: 'oval' },
};
// 批次士兵：拆成可動部位，每個部位分 tint（勢力色）與 base
export function soldierRig(type, faction = 'wei', weapons = []) {
  const st = TROOP_STYLE[faction] || TROOP_STYLE.wei;
  const B = new Builder(0), R = new Rig(0);
  const head = type === 'archer' ? (st.archerHead || (st.head === 'helmet' ? 'headband' : st.head)) : st.head;
  const spec = {
    tint: true, armored: !st.bare, bare: !!st.bare, skin: st.skin, armor: st.armor, cloth: 0xffffff, head, bandColor: 0x3a2a1a,
    plume: (type === 'cav' || type === 'spear') && st.plume !== null ? 1 : null, beard: null,
    arms: type === 'spear' ? 'spear' : type === 'archer' ? 'bow' : 'weapon',
  };
  const mounted = type === 'cav';
  const pose = mounted ? 'ride' : 'stand';
  const off = mounted ? 0.62 : 0;
  const HB = new Builder(0), HR = new Rig(0);
  if (mounted) buildHorse(HB, { tint: true, color: [0x6b4428, 0x3a2a1e, 0x8a6440][faction.length % 3], barding: weapons.includes('armor') ? st.barding || 0x4a4a4a : null }, HR);
  const hands = buildHuman(B, spec, pose, R);
  if (typeof st.plume === 'number' && (type === 'cav' || type === 'spear')) B.cone('cloth', st.plume, 0.055, 0.24, 6, M([0, 1.725 + 0.36, 0.03], [0.25, 0, 0]));
  const crossbow = type === 'archer' && weapons.includes('crossbow');
  const wtype = mounted || type === 'spear' ? 'spear' : type === 'archer' ? (crossbow ? 'crossbow' : 'bow') : (faction === 'nanman' || faction === 'wu' ? 'dao1' : 'sword');
  if (wtype === 'crossbow') {
    R.addInto('armL', M(), W => { W.box('wood', 0x4a3020, 0.06, 0.06, 0.6, M([0.05, 1.3, -0.36])); W.add('wood', new THREE.TorusGeometry(0.28, 0.014, 4, 8, 2.2), 0x3a2414, M([0.05, 1.3, -0.6], [Math.PI / 2, 0, Math.PI - 1.1])); });
  } else if (wtype === 'dao1') {
    R.addInto('armR', M([hands.R.x, hands.R.y, hands.R.z], [-0.9, 0, 0.1]), W => { W.box('steel', 0xd4d8de, 0.06, 0.62, 0.01, M([0.02, 0.42, 0])); W.box('gold', 0x8a6a2a, 0.1, 0.03, 0.04, M([0, 0.1, 0])); });
  } else {
    for (const { m, hand } of weaponPlacementH(wtype, hands, wtype === 'spear' ? 'ride' : 'stand')) R.addInto('arm' + hand, m, W => buildWeapon(W, wtype, { tassel: 0xc02020 }));
  }
  if (type === 'inf') {
    R.addInto('armL', M(), W => {
      if (st.shield === 'oval') W.sph('tint', 0xcfc0a0, 0.3, M([-0.36, 1.1, -0.24], [0, 0, 0.2], [0.18, 1.3, 0.85]), 10, 8);
      else { W.cyl('tint', 0xdddddd, 0.26, 0.26, 0.04, 12, M([-0.36, 1.1, -0.24], [Math.PI / 2, 0, 0.25])); W.cyl('metal', 0xb8a060, 0.06, 0.06, 0.06, 8, M([-0.37, 1.1, -0.27], [Math.PI / 2, 0, 0.25])); }
    });
  }
  if (type === 'archer') B.cyl('leather', 0x4a2e18, 0.06, 0.06, 0.5, 6, M([0.12, 1.32, 0.2], [0.3, 0, 0.2]));
  const split = (bld) => { const g = bld.merged(); const tint = g.tint || null; delete g.tint; const rest = Object.values(g); return { tint, base: rest.length ? mergeGeometries(rest) : null }; };
  const parts = [];
  parts.push({ name: 'torso', pivot: V(0, off, 0), rider: true, ...split(B) });
  for (const name of ['armR', 'armL', 'legL', 'legR']) { const p = R.parts[name]; if (p) parts.push({ name, pivot: p.pivot.clone().add(V(0, off, 0)), rider: true, ...split(p.b) }); }
  if (mounted) {
    parts.push({ name: 'horse', pivot: V(0, 0, 0), ...split(HB) });
    for (let i = 0; i < 4; i++) { const p = HR.parts['hleg' + i]; parts.push({ name: 'hleg' + i, idx: i, pivot: p.pivot.clone(), ...split(p.b) }); }
  }
  return parts;
}

export function soldierGeometry2(type, faction = 'wei', weapons = []) {
  const st = TROOP_STYLE[faction] || TROOP_STYLE.wei;
  const B = new Builder(0);
  const head = type === 'archer' ? (st.archerHead || (st.head === 'helmet' ? 'headband' : st.head)) : st.head;
  const spec = {
    tint: true, armored: !st.bare, bare: !!st.bare, skin: st.skin, armor: st.armor, cloth: 0xffffff, head, bandColor: 0x3a2a1a,
    plume: (type === 'cav' || type === 'spear') && st.plume !== null ? 1 : null, beard: null,
    arms: type === 'spear' ? 'spear' : type === 'archer' ? 'bow' : 'weapon',
  };
  const pose = type === 'cav' ? 'ride' : 'stand';
  if (type === 'cav') buildHorse(B, { tint: true, color: [0x6b4428, 0x3a2a1e, 0x8a6440][faction.length % 3], barding: weapons.includes('armor') ? st.barding || 0x4a4a4a : null });
  const off = pose === 'ride' ? 0.62 : 0;
  B.base = M([0, off, 0]);
  const hands = buildHuman(B, spec, pose);
  // 白色盔纓（白耳兵）
  if (typeof st.plume === 'number' && (type === 'cav' || type === 'spear') && B.b.tint) {
    B.cone('cloth', st.plume, 0.055, 0.24, 6, M([0, 1.725 + 0.36, 0.03], [0.25, 0, 0]));
  }
  const crossbow = type === 'archer' && weapons.includes('crossbow');
  const wtype = type === 'cav' ? 'spear' : type === 'spear' ? 'spear' : type === 'archer' ? (crossbow ? 'crossbow' : 'bow') : (faction === 'nanman' || faction === 'wu' ? 'dao1' : 'sword');
  if (wtype === 'crossbow') {
    B.base = M([0, off, 0]);
    B.box('wood', 0x4a3020, 0.06, 0.06, 0.6, M([0.05, 1.3, -0.36]));
    B.add('wood', new THREE.TorusGeometry(0.28, 0.014, 4, 8, 2.2), 0x3a2414, M([0.05, 1.3, -0.6], [Math.PI / 2, 0, Math.PI / 2 - 1.1 + Math.PI / 2]));
  } else if (wtype === 'dao1') {
    B.base = M([0, off, 0]).multiply(M([hands.R.x, hands.R.y, hands.R.z], [-0.9, 0, 0.1]));
    B.box('steel', 0xd4d8de, 0.06, 0.62, 0.01, M([0.02, 0.42, 0]));
    B.box('gold', 0x8a6a2a, 0.1, 0.03, 0.04, M([0, 0.1, 0]));
  } else {
    for (const m of weaponPlacement(wtype, hands, type === 'cav' ? 'ride' : (type === 'spear' ? 'ride' : 'stand'))) {
      B.base = M([0, off, 0]).multiply(m);
      buildWeapon(B, wtype, { tassel: 0xc02020 });
    }
  }
  B.base = M([0, off, 0]);
  if (type === 'inf') {
    if (st.shield === 'oval') {
      B.sph('tint', 0xcfc0a0, 0.3, M([-0.36, 1.08, -0.2], [0, 0, 0.2], [0.18, 1.3, 0.85]), 10, 8);
    } else {
      B.cyl('tint', 0xdddddd, 0.26, 0.26, 0.04, 12, M([-0.36, 1.1, -0.22], [Math.PI / 2, 0, 0.25]));
      B.cyl('metal', 0xb8a060, 0.06, 0.06, 0.06, 8, M([-0.37, 1.1, -0.25], [Math.PI / 2, 0, 0.25]));
    }
  }
  if (type === 'archer') B.cyl('leather', 0x4a2e18, 0.06, 0.06, 0.5, 6, M([0.12, 1.32, 0.2], [0.3, 0, 0.2]));
  const g = B.merged();
  const tint = g.tint;
  delete g.tint;
  return { tint, base: mergeGeometries(Object.values(g)) };
}
