// 立體天下地圖：地形、河流、城池、疆域
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CITIES, FACTIONS, ROADS } from './data.js';
import { makeNoise, smoothstep, clamp, lerp, distToPolyline, pointInPoly, tween, ease, sleep } from './util.js';
import { makeCityModel, makeBanner, waveBanner } from './models.js';
import { makeHero, soldierGeometry2 as soldierGeometry } from './figures.js';

const LON0 = 111, LAT0 = 32, SX = 7.5, SZ = 8.4;
export const W = 210, H = 180;
export const toXZ = (lon, lat) => [(lon - LON0) * SX, (LAT0 - lat) * SZ];
const toLL = (x, z) => [x / SX + LON0, LAT0 - z / SZ];
const YS = 3.0; // 高度比例

const N = makeNoise(7);

// 海岸線（東海、南海一側的多邊形）
const SEA = [
  [130, 39.6], [124.3, 39.8], [123.0, 39.5], [121.3, 38.8], [121.6, 39.5], [122.2, 40.4], [121.0, 40.85], [120.0, 40.1],
  [119.2, 39.4], [117.8, 39.0], [118.1, 38.1], [118.9, 37.4], [119.5, 37.1], [120.3, 37.6], [121.5, 37.5], [122.6, 37.35],
  [121.0, 36.6], [120.2, 35.9], [119.3, 35.0], [120.3, 34.1], [120.9, 32.7], [121.9, 31.7], [121.9, 30.85], [121.0, 30.35],
  [121.9, 29.9], [121.6, 28.6], [120.6, 27.5], [119.6, 26.0], [118.6, 24.6], [117.1, 23.6], [115.5, 22.8], [114.2, 22.35],
  [113.5, 22.2], [112.0, 21.8], [110.6, 21.3], [110.2, 20.4], [109.7, 21.5], [108.5, 21.6], [107.6, 21.45], [106.6, 20.6],
  [106.0, 19.0], [106.0, 15], [130, 15],
];
const COAST = SEA.slice(1, -2);

export const RIVERS = {
  黃河: { w: 0.5, pts: [[96.5, 35.0], [100, 35.6], [103.5, 36.1], [105.5, 37.2], [106.4, 38.6], [106.8, 40.3], [108.5, 40.7], [110.6, 40.5], [110.8, 38.9], [110.4, 36.5], [110.3, 34.75], [111.8, 34.8], [113.6, 34.9], [115.0, 35.5], [116.6, 36.6], [118.6, 37.75]] },
  長江: { w: 0.55, pts: [[97, 31.6], [99.3, 29.0], [100.6, 26.9], [102.5, 26.4], [104.6, 28.8], [106.5, 29.55], [108.3, 30.2], [109.5, 31.05], [111.2, 30.75], [112.2, 30.25], [113.0, 29.45], [114.3, 30.55], [115.5, 29.85], [116.4, 29.75], [117.5, 30.9], [118.8, 32.1], [120.2, 32.0], [121.7, 31.5]] },
  漢水: { w: 0.32, pts: [[106.6, 33.0], [108.3, 32.75], [110.0, 32.5], [111.5, 32.45], [112.15, 31.9], [112.5, 31.1], [113.6, 30.65], [114.3, 30.6]] },
  渭水: { w: 0.28, pts: [[104.4, 34.8], [105.8, 34.55], [107.2, 34.3], [108.9, 34.4], [110.35, 34.62]] },
  淮河: { w: 0.3, pts: [[113.3, 32.4], [114.8, 32.4], [116.4, 32.55], [117.4, 33.0], [118.6, 33.4], [119.6, 33.9]] },
  湘江: { w: 0.26, pts: [[110.9, 25.6], [111.8, 26.5], [112.6, 27.5], [112.95, 28.3], [113.0, 29.2]] },
  贛江: { w: 0.26, pts: [[114.9, 25.8], [115.0, 27.1], [115.8, 28.6], [116.1, 29.3]] },
  珠江: { w: 0.3, pts: [[106.5, 23.6], [108.5, 23.5], [110.3, 23.5], [112.0, 23.2], [113.3, 22.8]] },
};
const LAKES = [
  { name: '洞庭湖', lon: 112.8, lat: 29.25, rx: 0.55, ry: 0.4 },
  { name: '鄱陽湖', lon: 116.25, lat: 29.05, rx: 0.3, ry: 0.55 },
  { name: '太湖', lon: 120.15, lat: 31.15, rx: 0.32, ry: 0.28 },
];
const RIDGES = [
  { n: '秦嶺', a: 2.1, w: 0.45, p: [[104, 34.2], [107, 33.85], [109.5, 33.9], [111.5, 33.6]] },
  { n: '大巴山', a: 1.6, w: 0.45, p: [[105.8, 32.45], [108, 32.0], [110.3, 31.6]] },
  { a: 1.3, w: 0.35, p: [[109, 31.25], [110.8, 31.0]] },
  { n: '太行山', a: 1.7, w: 0.45, p: [[112.9, 35.0], [113.6, 37], [114.5, 39.4], [115.3, 40.2]] },
  { a: 1.3, w: 0.45, p: [[115.3, 40.6], [117.5, 40.5], [119.5, 40.6]] },
  { a: 1.4, w: 0.5, p: [[107, 41.3], [110, 41.2], [113, 41.6]] },
  { n: '祁連山', a: 2.8, w: 0.7, p: [[97, 38.8], [100, 38.3], [102.5, 37.4], [103.8, 36.9]] },
  { a: 1.0, w: 0.4, p: [[111, 36], [111.5, 38], [111.9, 39.5]] },
  { a: 1.0, w: 0.4, p: [[110.5, 33.6], [112.3, 33.5]] },
  { a: 1.0, w: 0.4, p: [[113.5, 31.7], [115, 31.25], [116.4, 31.0]] },
  { n: '南嶺', a: 1.2, w: 0.6, p: [[109.5, 25.3], [112, 25.2], [114.5, 24.9], [116.5, 24.6]] },
  { a: 1.3, w: 0.5, p: [[116.3, 25.6], [117.5, 27], [118.7, 28.6]] },
  { a: 1.0, w: 0.45, p: [[109.5, 26.0], [110.5, 27.5], [111.3, 28.6]] },
  { a: 0.8, w: 0.35, p: [[116.8, 36.1], [117.6, 36.4]] },
  { a: 0.8, w: 0.4, p: [[117.5, 29.8], [119.0, 30.3]] },
  { a: 0.9, w: 0.4, p: [[113.8, 25.8], [114.2, 27.2], [114.3, 28.5]] },
];
const GEO_LABELS = [
  ['秦　嶺', 108.2, 33.55], ['大巴山', 107.8, 31.7], ['太行山', 113.4, 37.4], ['祁連山', 99.5, 38.0], ['南　嶺', 112.5, 24.8],
  ['青藏高原', 98.8, 31.5], ['巴蜀', 105.5, 30.0], ['中原', 115.0, 34.6], ['江東', 119.8, 30.6], ['荊州', 111.6, 29.7],
  ['長江', 108.0, 30.55], ['黃河', 107.2, 39.6], ['東　海', 124.0, 29.0], ['雲貴高原', 104.8, 26.6],
];

function boxF(lon, lat, cx, cy, rx, ry, soft) {
  const m = Math.max(Math.abs(lon - cx) / rx, Math.abs(lat - cy) / ry);
  return smoothstep(1, 1 - soft, m);
}

// 地形高度（未乘比例），並回傳生態資訊
export function elevInfo(lon, lat) {
  const n = N.fbm(lon * 0.9, lat * 0.9, 5);
  const n2 = N.ridge(lon * 1.6, lat * 1.6, 4);
  let h = 0.35 + n * 0.25;
  const plat = smoothstep(104.3, 101.0, lon + n * 0.9);
  h += plat * (3.3 + n2 * 1.3);
  const loess = boxF(lon, lat, 108.5, 37.2, 4.6, 2.3, 0.45);
  h += loess * (0.9 + n2 * 0.5);
  const yungui = boxF(lon, lat, 105.3, 26.0, 4.2, 2.4, 0.5);
  h += yungui * (1.2 + n2 * 0.7);
  // 平原壓平
  const plain = Math.max(boxF(lon, lat, 116, 35.3, 2.7, 3.0, 0.5), boxF(lon, lat, 113.0, 30.5, 1.4, 0.8, 0.6), boxF(lon, lat, 119.6, 31.6, 1.9, 1.3, 0.5), boxF(lon, lat, 117, 33, 2, 1, 0.6));
  h = lerp(h, 0.28 + n * 0.08, plain * 0.85);
  let mtn = 0;
  for (const r of RIDGES) {
    const d = distToPolyline(lon, lat, r.p);
    if (d < r.w * 3) mtn += r.a * Math.exp(-(d * d) / (r.w * r.w)) * (0.65 + 0.7 * n2);
  }
  h += mtn;
  // 四川盆地
  const basin = Math.exp(-(((lon - 105.3) ** 2) / 3.6 + ((lat - 30.1) ** 2) / 2.2));
  h = lerp(h, 0.5 + n * 0.12, basin * 0.92);
  // 河流
  let river = 0;
  for (const k in RIVERS) {
    const R = RIVERS[k];
    const d = distToPolyline(lon, lat, R.pts);
    river = Math.max(river, smoothstep(R.w * 0.9, R.w * 0.15, d));
  }
  h -= river * (h * 0.55 + 0.18);
  for (const L of LAKES) {
    const e = ((lon - L.lon) / L.rx) ** 2 + ((lat - L.lat) / L.ry) ** 2;
    if (e < 1.6) h = lerp(h, -0.35, smoothstep(1.6, 0.8, e));
  }
  // 海
  const jl = lon + N.noise(lon * 3, lat * 3) * 0.18, jt = lat + N.noise(lon * 3 + 9, lat * 3) * 0.18;
  let sea = pointInPoly(jl, jt, SEA);
  const tw = ((lon - 120.95) / 0.55) ** 2 + ((lat - 23.65) / 1.6) ** 2;
  if (tw < 1) { sea = false; h = 0.15 + (1 - tw) * 2.0 * (0.6 + n2 * 0.6); }
  const dc = distToPolyline(jl, jt, COAST);
  if (sea) h = -0.25 - Math.min(dc, 1.5) * 0.9;
  else if (tw >= 1) h = h * smoothstep(0, 0.7, dc) + 0.05 * (1 - smoothstep(0, 0.7, dc));
  return { h, plat, loess, river, n, sea, coast: !sea && dc < 0.25 };
}
export function heightAtXZ(x, z) { const [lon, lat] = toLL(x, z); return elevInfo(lon, lat).h * YS; }

const C = (h) => new THREE.Color(h);
const COL = {
  beach: C(0xd9c999), north: C(0x9aa65e), south: C(0x5c9445), loess: C(0xc7a56a), hill: C(0x76804a),
  mtn: C(0x857660), rock: C(0x9a948c), snow: C(0xf1f2f6), plateau: C(0xa89c72), seabed: C(0x2d5c78), river: C(0x4b8ab5),
};

export class WorldMap {
  constructor(app) {
    this.app = app;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 1, 1200);
    this.camera.position.set(0, 165, 150);
    this.labelRoot = document.getElementById('labels-map');
    this.labels = new CSS2DRenderer({ element: this.labelRoot });
    this.labels.setSize(innerWidth, innerHeight);
    this.controls = new OrbitControls(this.camera, app.renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, maxPolarAngle: 1.22, minDistance: 22, maxDistance: 280, screenSpacePanning: false });
    this.controls.target.set(0, 0, 8);
    this.controls.enabled = false;
    this.cities = {};
    this.time = 0;
    this.hover = null; this.selected = null;
    this.onSelect = null;
    this.armies = [];
    this.build();
  }

  build() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xdfe8ff, 0x4a3a28, 1.1));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
    sun.position.set(-80, 140, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 110, bottom: -110, near: 10, far: 400 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.3;
    s.add(sun);
    this.buildTerrain();
    this.buildWater();
    this.buildRivers();
    this.buildRoads();
    this.buildCities();
    this.buildLabels();
    this.buildClouds();
    // 桌面
    const table = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.9 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -6.01; table.receiveShadow = true;
    s.add(table);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.1, 40), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }));
    ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 10;
    s.add(ring); this.selRing = ring;
  }

  buildTerrain() {
    const SEGX = 300, SEGZ = 257;
    const geo = new THREE.PlaneGeometry(W, H, SEGX, SEGZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const n = pos.count;
    this.vInfo = { land: new Uint8Array(n), base: new Float32Array(n * 3), x: new Float32Array(n), z: new Float32Array(n) };
    const cityH = {};
    for (const [id, c] of Object.entries(CITIES)) cityH[id] = Math.max(0.12, elevInfo(c.lon, c.lat).h);
    this.cityH = cityH;
    const col = new Float32Array(n * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const [lon, lat] = toLL(x, z);
      const e = elevInfo(lon, lat);
      let h = e.h;
      // 城池周圍平整
      for (const [id, c] of Object.entries(CITIES)) {
        const [cx, cz] = toXZ(c.lon, c.lat);
        const d = Math.hypot(x - cx, z - cz);
        const r = 2.4 + c.size * 0.5;
        if (d < r * 1.8) h = lerp(h, cityH[id], smoothstep(r * 1.8, r, d));
      }
      let y = h * YS;
      const edge = Math.abs(x) > W / 2 - 0.5 || Math.abs(z) > H / 2 - 0.5;
      if (edge) y = -6;
      pos.setY(i, y);
      // 色彩
      const lt = smoothstep(30.5, 35.5, lat);
      tmp.copy(COL.south).lerp(COL.north, lt);
      tmp.lerp(COL.loess, clamp(e.loess * 0.85, 0, 1));
      const yh = y;
      if (e.sea || y < 0.05) tmp.copy(COL.seabed);
      else if (e.coast && yh < 1.2) tmp.lerp(COL.beach, 0.7);
      if (yh > 2.6) tmp.lerp(COL.hill, smoothstep(2.6, 4.5, yh));
      if (yh > 4.5) tmp.lerp(COL.mtn, smoothstep(4.5, 7, yh));
      if (e.plat > 0.4 && yh > 6) tmp.lerp(COL.plateau, 0.75 * smoothstep(6, 8.5, yh));
      if (yh > 11) tmp.lerp(COL.rock, 0.6 * smoothstep(11, 13, yh));
      if (yh > 13.6) tmp.lerp(COL.snow, smoothstep(13.6, 15.5, yh));
      if (e.river > 0.5 && !e.sea) tmp.lerp(COL.river, 0.5);
      const v = 0.92 + e.n * 0.16;
      tmp.multiplyScalar(v);
      if (edge) tmp.set(0x5a4230);
      this.vInfo.base[i * 3] = tmp.r; this.vInfo.base[i * 3 + 1] = tmp.g; this.vInfo.base[i * 3 + 2] = tmp.b;
      this.vInfo.land[i] = (!e.sea && y > 0.05 && !edge) ? 1 : 0;
      this.vInfo.x[i] = x; this.vInfo.z[i] = z;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
    mesh.receiveShadow = true; mesh.castShadow = true;
    this.scene.add(mesh);
    this.terrain = mesh;
    // 底座
    const base = new THREE.Mesh(new THREE.BoxGeometry(W, 6, H), new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.95 }));
    base.position.y = -3.05;
    this.scene.add(base);
    // 邊框
    const frameM = new THREE.MeshStandardMaterial({ color: 0x7a1f14, roughness: 0.5, metalness: 0.2 });
    const goldM = new THREE.MeshStandardMaterial({ color: 0xc9a04a, roughness: 0.35, metalness: 0.7 });
    for (const [w, d, x, z] of [[W + 6, 3, 0, -H / 2 - 1.5], [W + 6, 3, 0, H / 2 + 1.5], [3, H, -W / 2 - 1.5, 0], [3, H, W / 2 + 1.5, 0]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, 7.5, d), frameM); f.position.set(x, -2.4, z); f.castShadow = true; f.receiveShadow = true; this.scene.add(f);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2), goldM); gl.position.set(x, 1.4, z); this.scene.add(gl);
    }
    this.recolor();
  }

  buildWater() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d'); const img = g.createImageData(256, 256);
    const WN = makeNoise(3);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const f = (u, v) => WN.fbm(u / 32, v / 32, 3);
      const dx = f(x + 1, y) - f(x - 1, y), dy = f(x, y + 1) - f(x, y - 1);
      const i = (y * 256 + x) * 4;
      img.data[i] = 128 + dx * 600; img.data[i + 1] = 128 + dy * 600; img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const nm = new THREE.CanvasTexture(cv); nm.wrapS = nm.wrapT = THREE.RepeatWrapping; nm.repeat.set(10, 9);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, H - 1), new THREE.MeshStandardMaterial({ color: 0x2b6f9c, roughness: 0.18, metalness: 0.15, normalMap: nm, normalScale: new THREE.Vector2(0.5, 0.5), transparent: true, opacity: 0.88 }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.02;
    water.receiveShadow = true;
    this.scene.add(water);
    this.waterNM = nm;
  }

  buildRivers() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3f8cc4, roughness: 0.2, metalness: 0.1, emissive: 0x0c2840, emissiveIntensity: 0.6 });
    for (const [name, R] of Object.entries(RIVERS)) {
      const pts = [];
      for (let i = 0; i < R.pts.length - 1; i++) {
        const [a, b] = [R.pts[i], R.pts[i + 1]];
        const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.12);
        for (let s = 0; s < steps; s++) {
          const lon = lerp(a[0], b[0], s / steps), lat = lerp(a[1], b[1], s / steps);
          const [x, z] = toXZ(lon, lat);
          const y = Math.max(0.05, heightAtXZ(x, z)) + 0.1;
          pts.push(new THREE.Vector3(x, y / 0.4, z));
        }
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 2, R.w * 0.85, 5, false), mat);
      tube.scale.set(1, 0.4, 1);
      tube.receiveShadow = true;
      this.scene.add(tube);
    }
    // 湖泊用水面
    for (const L of LAKES) {
      const [x, z] = toXZ(L.lon, L.lat);
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), mat);
      m.scale.set(L.rx * SX * 1.05, L.ry * SZ * 1.05, 1);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.12, z);
      this.scene.add(m);
    }
  }

  buildRoads() {
    const mat = new THREE.LineDashedMaterial({ color: 0x5a3b1e, dashSize: 0.8, gapSize: 0.5, transparent: true, opacity: 0.85 });
    for (const [a, b] of ROADS) {
      const A = CITIES[a], B = CITIES[b];
      const [ax, az] = toXZ(A.lon, A.lat), [bx, bz] = toXZ(B.lon, B.lat);
      const pts = [];
      const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.8);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = lerp(ax, bx, t), z = lerp(az, bz, t);
        pts.push(new THREE.Vector3(x, Math.max(0.2, heightAtXZ(x, z)) + 0.25, z));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
      line.computeLineDistances();
      this.scene.add(line);
    }
  }

  cityPos(id) {
    const c = CITIES[id];
    const [x, z] = toXZ(c.lon, c.lat);
    return new THREE.Vector3(x, this.cityH[id] * YS, z);
  }

  buildCities() {
    const st = this.app.state;
    for (const [id, c] of Object.entries(CITIES)) {
      const owner = st?.owners?.[id] || c.owner;
      const m = makeCityModel(c.size, FACTIONS[owner].color);
      m.scale.setScalar(1.25);
      m.position.copy(this.cityPos(id));
      this.scene.add(m);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(2.6 + c.size * 0.4, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(m.position); hit.userData.city = id;
      this.scene.add(hit);
      // 外層交給 CSS2D 定位，內層負責樣式與放大效果（避免 transform 動畫造成標籤延遲）
      const wrap = document.createElement('div');
      wrap.className = 'label-anchor';
      const lab = document.createElement('div');
      lab.className = `city-label s${c.size}`;
      lab.innerHTML = `<span class="dot"></span><span class="nm">${c.name}</span>`;
      lab.onclick = (e) => { e.stopPropagation(); this.select(id); };
      wrap.appendChild(lab);
      const obj = new CSS2DObject(wrap);
      obj.position.copy(m.position).add(new THREE.Vector3(0, 3.2 + c.size * 0.6, 0));
      this.scene.add(obj);
      this.cities[id] = { model: m, hit, label: lab, obj };
    }
    this.refreshCityColors();
  }

  buildLabels() {
    for (const [t, lon, lat] of GEO_LABELS) {
      const [x, z] = toXZ(lon, lat);
      const d = document.createElement('div');
      d.className = 'geo-label' + (t.length <= 2 && !['長江', '黃河'].includes(t) ? ' region' : '');
      d.textContent = t;
      const o = new CSS2DObject(d);
      o.position.set(x, Math.max(1, heightAtXZ(x, z)) + 1.5, z);
      this.scene.add(o);
    }
    this.factionLabels = {};
    for (const f of ['wei', 'shu', 'wu']) {
      const d = document.createElement('div');
      d.className = 'faction-label f' + f;
      d.textContent = FACTIONS[f].name;
      const o = new CSS2DObject(d);
      this.scene.add(o);
      this.factionLabels[f] = o;
    }
  }

  buildClouds() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    for (let i = 0; i < 14; i++) {
      const x = 30 + Math.random() * 68, y = 45 + Math.random() * 38, r = 18 + Math.random() * 22;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }
    const tx = new THREE.CanvasTexture(cv);
    this.clouds = [];
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0.28, depthWrite: false }));
      sp.scale.set(34, 18, 1);
      sp.position.set((Math.random() - 0.5) * W, 26 + Math.random() * 10, (Math.random() - 0.5) * H);
      sp.userData.v = 0.6 + Math.random() * 0.8;
      this.scene.add(sp); this.clouds.push(sp);
    }
  }

  // 依城池歸屬重新著色疆域
  recolor() {
    const st = this.app.state;
    const owners = st?.owners || Object.fromEntries(Object.entries(CITIES).map(([k, c]) => [k, c.owner]));
    const cs = Object.entries(CITIES).map(([id, c]) => { const [x, z] = toXZ(c.lon, c.lat); return { x, z, f: owners[id], w: 1 + c.size * 0.12 }; });
    const fcol = {}; const fdark = {};
    for (const k in FACTIONS) { fcol[k] = new THREE.Color(FACTIONS[k].color); fdark[k] = new THREE.Color(FACTIONS[k].color).multiplyScalar(0.45); }
    const col = this.terrain.geometry.attributes.color;
    const V = this.vInfo;
    const tmp = new THREE.Color();
    const best = {};
    for (let i = 0; i < V.land.length; i++) {
      tmp.setRGB(V.base[i * 3], V.base[i * 3 + 1], V.base[i * 3 + 2]);
      if (V.land[i]) {
        for (const k in best) best[k] = Infinity;
        const x = V.x[i], z = V.z[i];
        for (const c of cs) {
          const d = Math.hypot(x - c.x, z - c.z) / c.w;
          if (!(d >= best[c.f])) best[c.f] = d;
        }
        let f1 = null, d1 = Infinity, d2 = Infinity;
        for (const k in best) { const d = best[k]; if (d < d1) { d2 = d1; d1 = d; f1 = k; } else if (d < d2) d2 = d; }
        if (f1 && d1 < 34) {
          const fade = smoothstep(34, 22, d1);
          tmp.lerp(fcol[f1], 0.36 * fade);
          if (d2 - d1 < 0.9) tmp.lerp(fdark[f1], 0.75 * fade);
          else if (d2 - d1 < 1.8) tmp.lerp(fcol[f1], 0.35 * fade);
        }
      }
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
  }

  refreshCityColors() {
    const st = this.app.state;
    const cnt = {}, sx = {}, sz = {};
    for (const [id, c] of Object.entries(this.cities)) {
      const owner = st?.owners?.[id] || CITIES[id].owner;
      c.model.userData.flagMat.color.set(FACTIONS[owner].color);
      c.model.userData.flagMat.emissive.set(FACTIONS[owner].color);
      c.label.dataset.f = owner;
      c.label.style.setProperty('--fc', FACTIONS[owner].css);
      const mine = st?.faction === owner;
      c.label.classList.toggle('mine', !!mine);
      c.label.classList.toggle('attackable', !!(st?.faction && st.canAttack && st.canAttack(id)));
      cnt[owner] = (cnt[owner] || 0) + 1;
      const p = c.model.position; sx[owner] = (sx[owner] || 0) + p.x; sz[owner] = (sz[owner] || 0) + p.z;
    }
    for (const f of ['wei', 'shu', 'wu']) {
      const o = this.factionLabels?.[f]; if (!o) continue;
      if (!cnt[f]) { o.visible = false; continue; }
      o.visible = true;
      const x = sx[f] / cnt[f], z = sz[f] / cnt[f];
      o.position.set(x, Math.max(2, heightAtXZ(x, z)) + 9, z);
    }
  }

  async changeOwner(city, f, animate = true) {
    const c = this.cities[city];
    if (animate) {
      await this.flyTo(city, 55, 1200);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1, 48), new THREE.MeshBasicMaterial({ color: FACTIONS[f].color, transparent: true, side: THREE.DoubleSide, depthTest: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.copy(c.model.position).add(new THREE.Vector3(0, 0.5, 0)); ring.renderOrder = 11;
      this.scene.add(ring);
      tween(1600, t => { ring.scale.setScalar(1 + t * 14); ring.material.opacity = 1 - t; }, ease.out).then(() => this.scene.remove(ring));
      await tween(500, t => { c.model.scale.setScalar(1.25 * (1 + Math.sin(t * Math.PI) * 0.4)); });
    }
    this.recolor();
    this.refreshCityColors();
    if (animate) await sleep(600);
  }

  flyTo(target, dist = 60, ms = 1500, dir = new THREE.Vector3(0, 0.78, 0.62)) {
    const tgt = typeof target === 'string' ? this.cityPos(target) : target;
    const fromP = this.camera.position.clone(), fromT = this.controls.target.clone();
    const toT = tgt.clone();
    const toP = tgt.clone().add(dir.clone().normalize().multiplyScalar(dist));
    return tween(ms, t => {
      this.camera.position.lerpVectors(fromP, toP, t);
      this.controls.target.lerpVectors(fromT, toT, t);
      this.camera.lookAt(this.controls.target);
    });
  }
  overview(ms = 1500) {
    // 直式螢幕視野較窄：拉遠鏡頭以看見整個天下
    const a = this.camera.aspect, k = a < 1 ? Math.min(1.9, 1 / Math.pow(a, 0.75)) : 1;
    this.controls.maxDistance = 280 * k;
    return this.flyTo(new THREE.Vector3(0, 0, 6), 215 * k, ms);
  }

  // 行軍動畫
  async march(from, to, f, ms = 2600) {
    const A = this.cityPos(from), B = this.cityPos(to);
    const mid = A.clone().lerp(B, 0.5);
    this.flyTo(mid, Math.max(45, A.distanceTo(B) * 1.6), 900);
    const grp = new THREE.Group();
    const color = FACTIONS[f].color;
    const geo = soldierGeometry('inf');
    const tm = new THREE.MeshStandardMaterial({ color, vertexColors: true }), bm = new THREE.MeshStandardMaterial({ vertexColors: true });
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Group();
      s.add(new THREE.Mesh(geo.tint, tm), new THREE.Mesh(geo.base, bm));
      s.position.set((i % 3 - 1) * 0.9, 0, Math.floor(i / 3) * 0.9 + 1.2);
      s.userData.ph = Math.random() * 6;
      grp.add(s);
    }
    const gen = makeHero(FACTIONS[f].leader, color); gen.scale.setScalar(0.9); gen.position.z = -0.8; grp.add(gen);
    const ban = makeBanner(FACTIONS[f].name, FACTIONS[f].css, 4.5, 1.6); ban.position.set(1.2, 0, -0.6); grp.add(ban);
    grp.scale.setScalar(0.8);
    grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(grp);
    const army = { grp, ban };
    this.armies.push(army);
    const dir = B.clone().sub(A); dir.y = 0;
    grp.rotation.y = Math.atan2(-dir.x, -dir.z);
    await tween(ms, t => {
      const x = lerp(A.x, B.x, t), z = lerp(A.z, B.z, t);
      grp.position.set(x, Math.max(0.3, heightAtXZ(x, z)) + 0.1, z);
      grp.children.forEach(s => { if (s.userData.ph != null) s.position.y = Math.abs(Math.sin(t * 60 + s.userData.ph)) * 0.25; });
    }, ease.linear);
    this.scene.remove(grp);
    this.armies = this.armies.filter(a => a !== army);
  }

  select(id) {
    this.selected = id;
    if (id) {
      const p = this.cities[id].model.position;
      this.selRing.position.set(p.x, p.y + 0.4, p.z);
      this.selRing.visible = true;
    } else this.selRing.visible = false;
    for (const [k, c] of Object.entries(this.cities)) c.label.classList.toggle('sel', k === id);
    this.onSelect && this.onSelect(id);
  }

  setActive(on) {
    this.active = on;
    this.labelRoot.style.display = on ? '' : 'none';
    this.controls.enabled = on && !this.locked;
  }
  lock(on) { this.locked = on; this.controls.enabled = this.active && !on; }

  pick(ev) {
    const r = this.app.renderer.domElement.getBoundingClientRect();
    const m = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(m, this.camera);
    const hits = ray.intersectObjects(Object.values(this.cities).map(c => c.hit));
    return hits.length ? hits[0].object.userData.city : null;
  }

  onPointer(ev, type) {
    if (!this.active || this.locked) return;
    if (type === 'move') {
      const id = this.pick(ev);
      if (id !== this.hover) {
        if (this.hover) this.cities[this.hover].label.classList.remove('hover');
        this.hover = id;
        if (id) this.cities[id].label.classList.add('hover');
        this.app.renderer.domElement.style.cursor = id ? 'pointer' : '';
      }
    } else if (type === 'click') {
      const id = this.pick(ev);
      if (id) this.select(id);
    }
  }

  update(dt) {
    this.time += dt;
    if (this.controls.enabled) this.controls.update();
    // 限制鏡頭目標
    const t = this.controls.target;
    t.x = clamp(t.x, -W / 2, W / 2); t.z = clamp(t.z, -H / 2, H / 2); t.y = clamp(t.y, 0, 10);
    if (this.waterNM) this.waterNM.offset.set(this.time * 0.006, this.time * 0.004);
    for (const c of this.clouds) { c.position.x += c.userData.v * dt; if (c.position.x > W / 2 + 20) c.position.x = -W / 2 - 20; }
    if (this.selRing.visible) { this.selRing.rotation.z += dt; const s = 1 + Math.sin(this.time * 4) * 0.08; this.selRing.scale.setScalar(s); }
    for (const a of this.armies) waveBanner(a.ban, this.time);
    const camD = this.camera.position.distanceTo(t);
    this.labelRoot.classList.toggle('far', camD > 170);
    this.labelRoot.classList.toggle('near', camD < 70);
  }

  render(renderer) {
    renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.labels.setSize(w, h); }
}
