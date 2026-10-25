// 3D 模型：士兵、戰馬、將軍、旗幟、樹木、城池
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _c = new THREE.Color();
function part(geo, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const g = geo.index ? geo : geo;
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(m);
  g.deleteAttribute('uv');
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  _c.set(color);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 6) => new THREE.CylinderGeometry(rt, rb, h, s);
const sph = (r, w = 6, h = 5) => new THREE.SphereGeometry(r, w, h);
const cone = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);

const SKIN = 0xd9a77c, METAL = 0x8c8f96, DARK = 0x2a2420, WOOD = 0x6b4a2b, HORSE = [0x6e4a2e, 0x3b2a1e, 0x8a6a4a, 0xd8d0c0];

// 回傳 { tint, base }：tint 會被勢力色著色、base 保持原色
export function soldierGeometry(type) {
  const tint = [], base = [];
  if (type === 'cav') {
    // 馬
    base.push(part(box(0.55, 0.6, 1.6), 0x6e4a2e, { y: 1.05 }));
    base.push(part(box(0.32, 0.7, 0.35), 0x6e4a2e, { y: 1.5, z: -0.8, rx: -0.5 }));
    base.push(part(box(0.26, 0.28, 0.55), 0x6e4a2e, { y: 1.8, z: -1.12, rx: 0.2 }));
    for (const [lx, lz] of [[-0.18, -0.6], [0.18, -0.6], [-0.18, 0.6], [0.18, 0.6]])
      base.push(part(cyl(0.07, 0.06, 0.8), 0x4a3220, { x: lx, y: 0.42, z: lz }));
    base.push(part(box(0.1, 0.5, 0.1), 0x2a1c12, { y: 1.0, z: 0.85, rx: 0.4 }));
    tint.push(part(box(0.62, 0.35, 0.9), 0xffffff, { y: 1.25, z: 0.05 })); // 鞍布
    // 騎士
    tint.push(part(box(0.48, 0.6, 0.3), 0xffffff, { y: 1.85 }));
    base.push(part(sph(0.17), SKIN, { y: 2.32 }));
    base.push(part(cone(0.2, 0.3), METAL, { y: 2.55 }));
    base.push(part(cyl(0.03, 0.03, 2.8, 4), WOOD, { x: 0.3, y: 2.1, z: -0.5, rx: -1.2 }));
    base.push(part(cone(0.06, 0.35, 4), METAL, { x: 0.3, y: 2.62, z: -1.85, rx: -1.2 - Math.PI }));
  } else {
    base.push(part(box(0.22, 0.75, 0.24), DARK, { x: -0.13, y: 0.38 }));
    base.push(part(box(0.22, 0.75, 0.24), DARK, { x: 0.13, y: 0.38 }));
    tint.push(part(box(0.55, 0.65, 0.32), 0xffffff, { y: 1.08 }));
    tint.push(part(box(0.6, 0.25, 0.36), 0xdddddd, { y: 0.75 })); // 裙甲
    base.push(part(sph(0.17), SKIN, { y: 1.58 }));
    base.push(part(cone(0.21, 0.3), METAL, { y: 1.82 }));
    base.push(part(box(0.14, 0.55, 0.16), DARK, { x: -0.36, y: 1.05 }));
    base.push(part(box(0.14, 0.55, 0.16), DARK, { x: 0.36, y: 1.05 }));
    if (type === 'inf') {
      tint.push(part(box(0.08, 0.7, 0.5), 0xbbbbbb, { x: -0.45, y: 1.0, z: -0.12 }));
      base.push(part(box(0.06, 0.8, 0.08), METAL, { x: 0.42, y: 1.35, z: -0.25, rx: -0.6 }));
    } else if (type === 'spear') {
      base.push(part(cyl(0.03, 0.03, 3.2, 4), WOOD, { x: 0.38, y: 1.4, z: -0.6, rx: -1.1 }));
      base.push(part(cone(0.06, 0.35, 4), METAL, { x: 0.38, y: 2.05, z: -2.05, rx: -1.1 - Math.PI }));
      tint.push(part(box(0.06, 0.45, 0.4), 0xbbbbbb, { x: -0.42, y: 1.0, z: -0.1 }));
    } else if (type === 'archer') {
      base.push(part(new THREE.TorusGeometry(0.5, 0.03, 4, 10, Math.PI), WOOD, { x: -0.42, y: 1.2, z: -0.3, ry: Math.PI / 2, rz: Math.PI / 2 }));
      base.push(part(cyl(0.09, 0.09, 0.6, 5), WOOD, { x: 0.1, y: 1.3, z: 0.25, rx: 0.3 }));
    }
  }
  return { tint: mergeGeometries(tint), base: mergeGeometries(base) };
}

// —— 旗幟材質 ——
const texCache = new Map();
export function bannerTexture(text, colorCss) {
  const key = text + colorCss;
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 384;
  const g = cv.getContext('2d');
  g.fillStyle = colorCss; g.fillRect(0, 0, 256, 384);
  // 鋸齒邊
  g.fillStyle = '#f2e3b8';
  for (let y = 0; y < 384; y += 32) { g.beginPath(); g.moveTo(256, y); g.lineTo(226, y + 16); g.lineTo(256, y + 32); g.fill(); }
  g.fillRect(0, 0, 256, 14); g.fillRect(0, 370, 256, 14);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.beginPath(); g.arc(112, 192, 92, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b130c';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (text.length === 2) {
    g.font = '700 78px "LXGW WenKai TC","Noto Serif TC",serif';
    g.fillText(text[0], 112, 150); g.fillText(text[1], 112, 236);
  } else {
    g.font = '700 132px "LXGW WenKai TC","Noto Serif TC",serif';
    g.fillText(text, 112, 200);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

// 會飄動的旗子
export function makeBanner(text, colorCss, h = 6.5, w = 2.0) {
  const grp = new THREE.Group();
  const pole = new THREE.Mesh(cyl(0.06, 0.08, h, 6), new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.8 }));
  pole.position.y = h / 2; pole.castShadow = true;
  grp.add(pole);
  const tip = new THREE.Mesh(cone(0.14, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.7, roughness: 0.3 }));
  tip.position.y = h + 0.25; grp.add(tip);
  const geo = new THREE.PlaneGeometry(w, w * 1.5, 10, 6);
  geo.translate(w / 2, 0, 0);
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: bannerTexture(text, colorCss), side: THREE.DoubleSide, roughness: 0.9 }));
  flag.position.set(0.05, h - w * 0.75 - 0.15, 0);
  flag.castShadow = true;
  flag.userData.base = Float32Array.from(geo.attributes.position.array);
  grp.add(flag);
  grp.userData.flag = flag;
  grp.userData.phase = Math.random() * 10;
  return grp;
}
export function waveBanner(grp, t) {
  const flag = grp.userData.flag; if (!flag) return;
  const pos = flag.geometry.attributes.position, b = flag.userData.base, ph = grp.userData.phase;
  for (let i = 0; i < pos.count; i++) {
    const x = b[i * 3], y = b[i * 3 + 1];
    pos.array[i * 3 + 2] = Math.sin(x * 2.2 - t * 5 + ph + y * 0.3) * 0.18 * x;
  }
  pos.needsUpdate = true;
  flag.geometry.computeVertexNormals();
}

// —— 將軍模型（騎馬、披風） ——
export function makeGeneral(colorHex, mounted = true) {
  const g = new THREE.Group();
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
  const gold = mat(0xd4a640, { metalness: 0.6, roughness: 0.35 });
  const armor = mat(colorHex, { metalness: 0.3, roughness: 0.5 });
  const add = (geo, m, p, r = [0, 0, 0], parent = g) => { const me = new THREE.Mesh(geo, m); me.position.set(...p); me.rotation.set(...r); me.castShadow = true; parent.add(me); return me; };
  const s = 1.35;
  const body = new THREE.Group(); g.add(body); body.scale.setScalar(s);
  let riderY = 0;
  if (mounted) {
    const hm = mat(0xf2ece0);
    add(box(0.62, 0.7, 1.8), hm, [0, 1.1, 0], [0, 0, 0], body);
    add(box(0.36, 0.8, 0.4), hm, [0, 1.6, -0.9], [-0.5, 0, 0], body);
    add(box(0.3, 0.32, 0.6), hm, [0, 1.95, -1.25], [0.2, 0, 0], body);
    for (const [lx, lz] of [[-0.2, -0.65], [0.2, -0.65], [-0.2, 0.65], [0.2, 0.65]]) add(cyl(0.08, 0.07, 0.85), hm, [lx, 0.43, lz], [0, 0, 0], body);
    add(box(0.7, 0.4, 1.0), armor, [0, 1.35, 0.05], [0, 0, 0], body);
    add(box(0.12, 0.6, 0.12), mat(0x222222), [0, 1.0, 0.95], [0.4, 0, 0], body);
    riderY = 1.0;
  }
  add(box(0.56, 0.7, 0.36), armor, [0, 1.05 + riderY, 0], [0, 0, 0], body);
  add(box(0.7, 0.18, 0.4), gold, [0, 1.38 + riderY, 0], [0, 0, 0], body);
  add(sph(0.2, 8, 6), mat(0xd9a77c), [0, 1.62 + riderY, 0], [0, 0, 0], body);
  add(cone(0.24, 0.4, 8), gold, [0, 1.9 + riderY, 0], [0, 0, 0], body);
  add(cone(0.05, 0.6, 4), mat(0xc0392b), [0, 2.3 + riderY, 0.05], [0.3, 0, 0], body);
  if (!mounted) { add(box(0.24, 0.8, 0.26), mat(0x2a2420), [-0.14, 0.4, 0], [0, 0, 0], body); add(box(0.24, 0.8, 0.26), mat(0x2a2420), [0.14, 0.4, 0], [0, 0, 0], body); }
  const cape = add(new THREE.PlaneGeometry(0.75, 1.2, 2, 3), mat(0xa0281e, { side: THREE.DoubleSide }), [0, 0.95 + riderY, 0.25], [0.25, 0, 0], body);
  // 武器（偃月/長戟）
  add(cyl(0.035, 0.035, 3.4, 5), mat(0x3a2818), [0.42, 1.3 + riderY, -0.2], [-0.25, 0, 0], body);
  add(box(0.05, 0.6, 0.25), mat(0xd9dde3, { metalness: 0.8, roughness: 0.25 }), [0.42, 2.9 + riderY, -0.6], [-0.25, 0, 0], body);
  g.userData.cape = cape;
  g.userData.body = body;
  return g;
}

// —— 樹 ——
export function treeGeometries() {
  const pineTrunk = part(cyl(0.15, 0.22, 1.6), 0x5a3c22, { y: 0.8 });
  const pineTop = mergeGeometries([
    part(cone(1.3, 2.2, 7), 0x2f5a2a, { y: 2.2 }),
    part(cone(1.0, 1.8, 7), 0x376a30, { y: 3.2 }),
    part(cone(0.65, 1.4, 7), 0x3f7836, { y: 4.1 }),
  ]);
  const roundTop = mergeGeometries([
    part(sph(1.3, 7, 6), 0x4c7a34, { y: 2.6 }),
    part(sph(0.9, 7, 6), 0x5a8a3c, { x: 0.6, y: 3.1, z: 0.3 }),
  ]);
  return { trunk: pineTrunk, pineTop, roundTop };
}

// —— 地圖用城池模型 ——
export function makeCityModel(size, colorHex) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0xb8ab90, roughness: 0.9 });
  const roofM = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.6 });
  const redM = new THREE.MeshStandardMaterial({ color: 0x9e2b20, roughness: 0.7 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xc9a04a, roughness: 0.4, metalness: 0.5 });
  const add = (geo, m, x, y, z, ry = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.y = ry; me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  const R = 0.9 + size * 0.45, H = 0.35 + size * 0.1, T = 0.18;
  add(box(R * 2 + 0.3, 0.12, R * 2 + 0.3), stone, 0, 0.06, 0);
  add(box(R * 2, H, T), stone, 0, H / 2, -R);
  add(box(R * 2, H, T), stone, 0, H / 2, R);
  add(box(T, H, R * 2), stone, -R, H / 2, 0);
  add(box(T, H, R * 2), stone, R, H / 2, 0);
  for (const [cx, cz] of [[-R, -R], [R, -R], [-R, R], [R, R]]) {
    add(box(0.32, H + 0.2, 0.32), stone, cx, (H + 0.2) / 2, cz);
    add(cone(0.3, 0.25, 4), roofM, cx, H + 0.33, cz, Math.PI / 4);
  }
  // 城門樓
  add(box(0.7, 0.28, 0.36), redM, 0, H + 0.14, R);
  add(cone(0.6, 0.3, 4), roofM, 0, H + 0.43, R, Math.PI / 4).scale.set(1, 1, 0.55);
  // 城內房舍
  const houses = size * 4;
  for (let i = 0; i < houses; i++) {
    const a = i * 2.39, rr = (0.25 + (i % 3) * 0.22) * R;
    const hx = Math.cos(a) * rr, hz = Math.sin(a) * rr;
    if (Math.abs(hx) < 0.35 && Math.abs(hz) < 0.35 && size === 3) continue;
    add(box(0.28, 0.18, 0.22), new THREE.MeshStandardMaterial({ color: 0xd6cbb2 }), hx, 0.21, hz, a);
    add(cone(0.24, 0.14, 4), roofM, hx, 0.37, hz, a + Math.PI / 4);
  }
  if (size >= 2) {
    add(box(0.55, 0.3, 0.45), redM, 0, 0.27, 0);
    add(cone(0.5, 0.3, 4), roofM, 0, 0.57, 0, Math.PI / 4);
  }
  if (size === 3) {
    add(box(0.8, 0.12, 0.7), stone, 0, 0.18, 0);
    add(box(0.6, 0.4, 0.5), redM, 0, 0.44, 0);
    add(cone(0.62, 0.32, 4), goldM, 0, 0.8, 0, Math.PI / 4);
    add(box(0.4, 0.2, 0.32), redM, 0, 1.0, 0);
    add(cone(0.42, 0.26, 4), goldM, 0, 1.22, 0, Math.PI / 4);
  }
  // 旗
  const pole = add(cyl(0.025, 0.025, 1.4, 4), new THREE.MeshStandardMaterial({ color: 0x3a2a1a }), R - 0.1, H + 0.7, -R + 0.1);
  const flagM = new THREE.MeshStandardMaterial({ color: colorHex, side: THREE.DoubleSide, emissive: colorHex, emissiveIntensity: 0.25 });
  const flag = add(new THREE.PlaneGeometry(0.6, 0.38, 4, 1), flagM, R - 0.1 + 0.3, H + 1.2, -R + 0.1);
  g.userData.flagMat = flagM;
  g.userData.flag = flag;
  g.userData.radius = R;
  return g;
}

// —— 戰場城牆 ——
export function makeWall(len, h, colorCss, text) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x9c907a, roughness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x6d6352, roughness: 0.95 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x33333c, roughness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8f2a1f, roughness: 0.7 });
  const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  const gateW = 12, T = 7;
  const segLen = (len - gateW) / 2;
  for (const s of [-1, 1]) {
    const cx = s * (gateW / 2 + segLen / 2);
    add(box(segLen, h, T), stone, cx, h / 2, 0);
    // 雉堞
    for (let x = gateW / 2 + 1; x < len / 2; x += 2.2) add(box(1.1, 1.2, 0.6), dark, s * x, h + 0.6, T / 2 - 0.3);
    for (let x = gateW / 2 + 12; x < len / 2; x += 30) {
      add(box(7, h + 3, 9), stone, s * x, (h + 3) / 2, 0);
      add(box(6, 3, 6), red, s * x, h + 4.5, 0);
      add(cone(5.8, 3, 4), roof, s * x, h + 7.5, 0).rotation.y = Math.PI / 4;
    }
  }
  // 城門與城樓
  add(box(4, h + 1, T + 2), stone, -gateW / 2 - 2, (h + 1) / 2, 0);
  add(box(4, h + 1, T + 2), stone, gateW / 2 + 2, (h + 1) / 2, 0);
  add(box(gateW + 8, 2, T + 2), stone, 0, h, 0);
  const tower = add(box(gateW + 4, 4, T), red, 0, h + 3, 0);
  add(cone((gateW + 6) * 0.75, 4.5, 4), roof, 0, h + 7.2, 0).rotation.y = Math.PI / 4;
  add(box(gateW + 2, 3, T - 2), red, 0, h + 9.5, 0);
  add(cone((gateW + 2) * 0.7, 3.5, 4), roof, 0, h + 12.5, 0).rotation.y = Math.PI / 4;
  const gate = add(box(gateW, h - 1, 1.2), new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.8 }), 0, (h - 1) / 2, T / 2 + 0.2);
  for (let i = -2; i <= 2; i++) add(box(0.3, h - 1.2, 1.3), new THREE.MeshStandardMaterial({ color: 0x2d2d2d, metalness: 0.6 }), i * 2.2, (h - 1) / 2, T / 2 + 0.25);
  // 匾額
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
  const c2 = cv.getContext('2d'); c2.fillStyle = '#1a1410'; c2.fillRect(0, 0, 256, 96); c2.strokeStyle = '#d4a640'; c2.lineWidth = 6; c2.strokeRect(4, 4, 248, 88);
  c2.fillStyle = '#e8c86a'; c2.font = '700 64px "LXGW WenKai TC",serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText(text, 128, 52);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const sign = add(new THREE.PlaneGeometry(5, 1.9), new THREE.MeshBasicMaterial({ map: tx }), 0, h + 3, T / 2 + 0.05);
  g.userData.gate = gate;
  g.userData.gateW = gateW;
  g.userData.thick = T;
  return g;
}

export function makeTent(colorHex) {
  return mergeGeometries([
    part(cone(2.2, 2.6, 6), 0xe8dcc0, { y: 1.3 }),
    part(cyl(0.05, 0.05, 1, 4), 0x3a2a1a, { y: 3.0 }),
  ]);
}

export function makeCatapult() {
  const g = new THREE.Group();
  const w = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 });
  const add = (geo, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, w); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); return m; };
  add(box(3, 0.4, 4.5), 0, 0.6, 0);
  for (const sx of [-1.2, 1.2]) { add(box(0.3, 3, 0.3), sx, 2, 0); }
  add(box(2.7, 0.3, 0.3), 0, 3.4, 0);
  const arm = add(box(0.3, 0.3, 5.5), 0, 3.4, 0.5, -0.5);
  for (const [x, z] of [[-1.5, -1.6], [1.5, -1.6], [-1.5, 1.6], [1.5, 1.6]]) { const wh = add(cyl(0.6, 0.6, 0.3, 10), x, 0.6, z); wh.rotation.z = Math.PI / 2; }
  g.userData.arm = arm;
  return g;
}

// —— 戰船（水戰） ——
export function makeShip(L, W, colorHex, big = false) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.9 });
  const red = new THREE.MeshStandardMaterial({ color: 0x8a2a1e, roughness: 0.7 });
  const sailM = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, side: THREE.DoubleSide });
  const flagM = new THREE.MeshStandardMaterial({ color: colorHex, side: THREE.DoubleSide });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  add(new THREE.BoxGeometry(W, 1.8, L), wood, 0, 0.2, 0);
  const bow = add(new THREE.CylinderGeometry(0.05, W * 0.42, W * 0.9, 4, 1), wood, 0, 0.35, -L / 2 - W * 0.3, -Math.PI / 2, 0, Math.PI / 4);
  bow.scale.set(1, 1, 0.45);
  add(new THREE.BoxGeometry(W + 0.3, 0.25, L + 0.2), dark, 0, 1.15, 0);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.15, 0.6, L), red, sx * (W / 2), 1.5, 0);
  // 船樓
  const cast = add(new THREE.BoxGeometry(W * 0.7, big ? 3.5 : 2, L * 0.22), red, 0, 1.25 + (big ? 1.75 : 1), L * 0.36);
  add(new THREE.ConeGeometry(W * 0.62, 1.6, 4), dark, 0, 1.25 + (big ? 3.5 : 2) + 0.8, L * 0.36, 0, Math.PI / 4);
  const mh = big ? 13 : 9;
  add(new THREE.CylinderGeometry(0.18, 0.22, mh, 8), dark, 0, mh / 2 + 1, -L * 0.08);
  const sail = add(new THREE.PlaneGeometry(W * 0.85, mh * 0.42, 1, 4), sailM, 0, mh * 0.62 + 1, -L * 0.08 + 0.25);
  add(new THREE.PlaneGeometry(2.4, 1.4), flagM, 1.2, mh + 1.2, -L * 0.08);
  // 槳
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.1, 0.1, 3.2), dark, sx * (W / 2 + 1.2), 0.3, -L * 0.35 + i * L * 0.14, 0, sx * 1.2, sx * 0.5);
  g.userData.sail = sail;
  g.userData.deck = 1.6;
  return g;
}
