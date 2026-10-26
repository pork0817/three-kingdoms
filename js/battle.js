// 3D 戰場：地形、部隊模擬、陣型、兵法、攻守城、伏兵、對陣、追擊、求和
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { FACTIONS, GENERALS, TACTICS, WEAPONS, UNIT_TYPES, COUNTER, FORMATIONS, gname } from './data.js';
import { makeNoise, clamp, lerp, smoothstep, rand, pick, sleep, tween, ease, fmt, mulberry32 } from './util.js';
import { makeBanner, waveBanner, treeGeometries, makeWall, makeTent, makeCatapult, makeShip, makeRamCart, makeLogRam, makeLadder, makeSiegeTower } from './models.js';
import { Q } from './settings.js';
import { makeHero, soldierRig, poseAngles, animateHero } from './figures.js';
import { battleLines, bark, logLine } from './dialogue.js';
import { el, say, choose, modal, toast, titleCard, hideDialog, portrait, root } from './ui.js';
import * as SFX from './audio.js';

const V2 = THREE.Vector2;
const SP = { inf: 1.45, spear: 1.45, archer: 1.55, cav: 2.3 };
const COMP = {
  wei: { inf: 0.25, spear: 0.2, cav: 0.35, archer: 0.2 },
  shu: { inf: 0.25, spear: 0.3, cav: 0.2, archer: 0.25 },
  wu: { inf: 0.35, spear: 0.15, cav: 0.1, archer: 0.4 },
  nanman: { inf: 0.6, spear: 0.2, cav: 0.0, archer: 0.2 },
};
const STATE_TXT = { idle: '待命', move: '移動', fight: '交戰', rout: '潰逃', hold: '堅守', hidden: '埋伏', dead: '全滅', wait: '待發', climb: '攀城', gate: '撞門', escaped: '脫離' };

// —— 粒子 ——
class Particles {
  constructor(scene, max, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max); this.grow = new Float32Array(max); this.a0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('rgba', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: innerHeight * 0.9 } },
      vertexShader: `attribute float size; attribute vec4 rgba; varying vec4 vC; uniform float uScale;
        void main(){ vC=rgba; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=max(0.0,size)*uScale/max(1.0,-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); if(r>0.5) discard; float a=smoothstep(0.5,0.05,r); gl_FragColor=vec4(vC.rgb,vC.a*a); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = g;
  }
  emit(x, y, z, vx, vy, vz, life, size, r, g, b, a = 1, grav = 0, grow = 0) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3);
    this.col.set([r, g, b, a], i * 4); this.size[i] = size;
    this.life[i] = life; this.maxLife[i] = life; this.grav[i] = grav; this.grow[i] = grow; this.a0[i] = a;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const j = --this.n;
        if (i !== j) {
          this.pos.copyWithin(i * 3, j * 3, j * 3 + 3); this.vel.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.col.copyWithin(i * 4, j * 4, j * 4 + 4);
          for (const arr of [this.size, this.life, this.maxLife, this.grav, this.grow, this.a0]) arr[i] = arr[j];
        }
        i--; continue;
      }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] += this.grow[i] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.col[i * 4 + 3] = this.a0[i] * Math.min(1, t * 2.5);
    }
    this.geo.setDrawRange(0, this.n);
    for (const k of ['position', 'rgba', 'size']) this.geo.attributes[k].needsUpdate = true;
  }
}

let UID = 1;

export class Battle {
  constructor(app, state, cfg) {
    this.app = app; this.state = state; this.cfg = cfg;
    this.pf = state.faction; this.ef = cfg.enemy.faction;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.5, 2000);
    this.labelRoot = document.getElementById('labels-battle');
    this.labelRoot.innerHTML = '';
    this.labels = new CSS2DRenderer({ element: this.labelRoot });
    this.labels.setSize(innerWidth, innerHeight);
    this.controls = new OrbitControls(this.camera, app.renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.1, maxPolarAngle: 1.42, minDistance: 12, maxDistance: 320 });
    this.controls.enabled = false;
    this.time = 0; this.simT = 0; this.speed = 1; this.paused = true; this.phase = 'setup';
    this.squads = [];
    this.sides = {};
    this.arrows = []; this.boulders = []; this.fires = []; this.catapults = [];
    this.logs = [];
    this.keys = {};
    this.terrain = cfg.terrain || 'plains';
    this.naval = this.terrain === 'naval';
    this.D = state.D || { enemy: 1, atk: 1 };
    this.boats = [];
    this.siege = this.terrain === 'siege';
    this.noise = makeNoise(cfg.seed || 11);
    this.rng = mulberry32(cfg.seed || 5);
    this.result = null;
  }

  // ———————————————— 場景 ————————————————
  heightRaw(x, z) {
    const N = this.noise, c = this.cfg;
    let h = N.fbm(x * 0.012, z * 0.012, 4) * 2.2 + N.fbm(x * 0.05, z * 0.05, 2) * 0.4;
    const r = Math.hypot(x, z);
    if (this.naval) {
      const ax = Math.abs(x + N.fbm(z * 0.006, 2) * 30);
      return -7 + smoothstep(150, 215, ax) * (12 + N.ridge(x * 0.02, z * 0.02, 3) * 14) + smoothstep(230, 330, r) * 30;
    }
    if (c.beach) {
      const sx = -130 + N.fbm(z * 0.01, 5) * 18;
      h = lerp(h, -6, smoothstep(sx + 20, sx - 20, x));
    }
    if (c.riverMid) {
      const rz = N.fbm(x * 0.008, 9) * 10;
      h = lerp(h, -2.0, smoothstep(17, 7, Math.abs(z - rz)));
    }
    h += smoothstep(230, 330, r) * (35 + N.ridge(x * 0.01, z * 0.01, 3) * 40);
    if (this.terrain === 'mountain') {
      const ax = Math.abs(x + N.fbm(z * 0.01, 3.3) * 14);
      h += smoothstep(24, 80, ax) * (26 + N.ridge(x * 0.02, z * 0.02, 4) * 22);
      h += smoothstep(80, 140, ax) * 20;
    }
    if (c.hill) {
      const hz = c.hill === 'e' ? -55 : 55;
      const d = Math.hypot(x, z - hz);
      h += 20 * Math.exp(-(d * d) / (34 * 34)) + N.fbm(x * 0.05, z * 0.05) * 2 * Math.exp(-(d * d) / 2000);
    }
    if (c.river) {
      const rx = 118 + N.fbm(z * 0.01, 7) * 20;
      const d = Math.abs(x - rx);
      h = lerp(h, -2.5, smoothstep(22, 9, d));
    }
    if (this.siege) {
      // 城內平坦
      const dzw = (z - this.zw) * this.sgnAtt;
      if (dzw < 5) h = lerp(h, 0.4, smoothstep(5, -4, dzw));
      h = lerp(h, 0.3, smoothstep(30, 0, Math.abs(z - this.zw)) * 0.8);
    }
    return h;
  }
  buildHeightGrid() {
    const S = 321, ext = 340;
    this.hg = { S, ext, data: new Float32Array(S * S) };
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = -ext + (i / (S - 1)) * ext * 2, z = -ext + (j / (S - 1)) * ext * 2;
      this.hg.data[j * S + i] = this.heightRaw(x, z);
    }
  }
  ground(x, z) {
    const h = this.groundRaw(x, z);
    return this.naval ? Math.max(h, 1.3) : h;
  }
  inRiver(x, z) { return this.cfg.riverMid && this.groundRaw(x, z) < -0.8; }
  groundRaw(x, z) {
    const { S, ext, data } = this.hg;
    const fx = clamp((x + ext) / (ext * 2) * (S - 1), 0, S - 1.001), fz = clamp((z + ext) / (ext * 2) * (S - 1), 0, S - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const a = data[j * S + i], b = data[j * S + i + 1], c = data[(j + 1) * S + i], d = data[(j + 1) * S + i + 1];
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  forestAt(x, z) {
    const c = this.cfg; let d = 0;
    if (this.terrain === 'mountain') d = Math.max(d, smoothstep(26, 45, Math.abs(x)) * (1 - smoothstep(95, 120, Math.abs(x))) * 0.8);
    const near = (side) => { const zc = side === 'p' ? 70 : -70; return Math.exp(-(((x) ** 2) / (90 ** 2) + ((z - zc) ** 2) / (40 ** 2))); };
    if (c.forest === 'p' || c.forest === 'e') d = Math.max(d, near(c.forest) * 0.95);
    if (c.forest === 'sides') d = Math.max(d, smoothstep(50, 80, Math.abs(x)) * 0.9);
    if (c.forest === 'all') d = Math.max(d, 0.55);
    return d * (0.6 + 0.5 * this.noise.fbm(x * 0.03, z * 0.03 + 40, 2) + 0.2);
  }
  campAt(x, z) {
    const c = this.cfg; if (!c.camps) return 0;
    const zc = c.camps === 'p' ? 95 : -95;
    return (Math.abs(x) < 80 && Math.abs(z - zc) < 30) ? 1 : 0;
  }

  build() {
    const c = this.cfg, s = this.scene;
    this.attSide = this.siege ? (c.attacker === 'enemy' ? 'e' : 'p') : null;
    this.defSide = this.siege ? (this.attSide === 'p' ? 'e' : 'p') : null;
    this.zw = this.siege ? (this.defSide === 'e' ? -40 : 40) : 0;
    this.sgnAtt = this.siege ? (this.attSide === 'p' ? 1 : -1) : 1; // 由城牆指向攻方
    this.wallH = 11;
    this.buildHeightGrid();
    // 天空
    const tod = c.time || 'day';
    const skyCols = { day: [0x6fa7e0, 0xe9e2cf], dusk: [0x3a3f6a, 0xf0a060], night: [0x0a0f22, 0x2a3050], dawn: [0x7a8ac0, 0xf2c8a0] }[tod];
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(skyCols[0]) }, bot: { value: new THREE.Color(skyCols[1]) } },
      vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h=normalize(vP).y; gl_FragColor=vec4(mix(bot,top,smoothstep(-0.05,0.5,h)),1.0); }',
    }));
    s.add(sky);
    s.fog = new THREE.Fog(skyCols[1], 260, 900);
    this.weather = c.weather || null;
    if (this.weather === 'fog') { s.fog = new THREE.Fog(0xc8ccd0, 30, 240); }
    if (this.weather === 'rain') { s.fog = new THREE.Fog(0x8a9098, 60, 420); }
    if (this.weather === 'snow') { s.fog = new THREE.Fog(0xdde2e8, 60, 420); }
    this.visR = (tod === 'night' ? 110 : Infinity);
    if (this.weather === 'fog') this.visR = Math.min(this.visR, 85);
    this.wind = c.wind ? new V2(...c.wind).normalize() : null;
    const sunI = { day: 2.6, dusk: 1.6, night: 0.5, dawn: 1.8 }[tod];
    s.add(new THREE.HemisphereLight(tod === 'night' ? 0x4a5a8a : 0xdfe9ff, 0x4a3a22, tod === 'night' ? 0.5 : 1.0));
    const sun = new THREE.DirectionalLight(tod === 'dusk' ? 0xffb070 : tod === 'night' ? 0x8aa0ff : 0xfff2dd, sunI);
    sun.position.set(tod === 'dusk' ? -160 : -90, tod === 'dusk' ? 70 : 160, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(Q().shadow, Q().shadow);
    Object.assign(sun.shadow.camera, { left: -190, right: 190, top: 190, bottom: -190, near: 10, far: 600 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4;
    s.add(sun); s.add(sun.target);
    this.sun = sun;
    // 火光
    this.fireLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff7a2a, 0, 70, 1.5); s.add(l); return l; });
    this.buildGround();
    this.buildFlora();
    if (this.siege) this.buildCity();
    if (c.camps) this.buildCamps();
    this.particlesAdd = new Particles(s, 6000, true);
    this.particlesN = new Particles(s, 5000, false);
    // 箭矢
    const ag = new THREE.BoxGeometry(0.06, 0.06, 1.6);
    this.arrowMesh = new THREE.InstancedMesh(ag, new THREE.MeshBasicMaterial({ color: 0x2a1e12 }), 1500);
    this.arrowMesh.count = 0; this.arrowMesh.frustumCulled = false;
    s.add(this.arrowMesh);
    // 批次
    this.batches = {};
    for (const side of ['p', 'e']) for (const type of Object.keys(UNIT_TYPES)) {
      const ut = this.naval && type === 'cav' ? 'inf' : type;
      const parts = soldierRig(ut, side === 'p' ? this.pf : this.ef, side === 'p' ? this.state.weapons : (this.cfg.enemy.weapons || []));
      const col = FACTIONS[side === 'p' ? this.pf : this.ef].color;
      const tm = new THREE.MeshStandardMaterial({ color: col, vertexColors: true, roughness: 0.75 });
      const bm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.15 });
      const mk = (g, m) => { if (!g) return null; const im = new THREE.InstancedMesh(g, m, 900); im.castShadow = true; im.receiveShadow = false; im.count = 0; im.frustumCulled = false; s.add(im); return im; };
      this.batches[side + type] = { kind: ut, mounted: ut === 'cav', list: [], parts: parts.map(p => ({ ...p, meshes: [mk(p.tint, tm), mk(p.base, bm)].filter(Boolean) })) };
    }
    // 選取圈
    const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.15, 48), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.visible = false; s.add(ring); this.selRing = ring;
    const mk = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.2, 32), new THREE.MeshBasicMaterial({ color: 0x9cf, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    mk.rotation.x = -Math.PI / 2; mk.visible = false; s.add(mk); this.moveMarker = mk;
    this.raycaster = new THREE.Raycaster();
  }

  buildGround() {
    const segs = 220, size = 680;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const tod = this.cfg.time || 'day';
    const grassA = new THREE.Color(this.cfg.grass || (this.terrain === 'mountain' ? 0x5d7a3a : 0x7a9a48)), grassB = new THREE.Color(0x9aa85a);
    const dirt = new THREE.Color(0x8a7350), rock = new THREE.Color(0x857d70), snow = new THREE.Color(0xe8e8ee), mud = new THREE.Color(0x5a4a36);
    const t = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = this.groundRaw(x, z);
      pos.setY(i, h);
      const n = this.noise.fbm(x * 0.04, z * 0.04, 3);
      t.copy(grassA).lerp(grassB, clamp(0.5 + n, 0, 1));
      // 道路/踩踏
      if (!this.siege && this.terrain !== 'mountain') t.lerp(dirt, smoothstep(10, 2, Math.abs(x + n * 8)) * 0.35);
      if (this.terrain === 'mountain') t.lerp(dirt, smoothstep(22, 6, Math.abs(x)) * 0.45);
      const hl = this.groundRaw(x - 2, z), hr = this.groundRaw(x + 2, z), hu = this.groundRaw(x, z - 2), hd = this.groundRaw(x, z + 2);
      const slope = Math.hypot(hr - hl, hd - hu) / 4;
      t.lerp(rock, smoothstep(0.55, 1.1, slope));
      if (h > 48) t.lerp(snow, smoothstep(48, 60, h));
      if (h < -0.8) t.lerp(mud, 0.7);
      if (this.siege && Math.abs(z - this.zw) < 14) t.lerp(dirt, 0.6);
      if (this.siege && (z - this.zw) * this.sgnAtt < -4) t.lerp(new THREE.Color(0x9a8f7a), 0.75);
      if (tod === 'night') t.multiplyScalar(0.7);
      t.multiplyScalar(0.9 + n * 0.15);
      col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
    m.receiveShadow = true;
    this.scene.add(m);
    this.groundMesh = m;
    if (this.naval || this.cfg.riverMid || this.cfg.beach) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(this.naval ? 900 : 900, this.naval ? 900 : (this.cfg.beach ? 900 : 60)), new THREE.MeshStandardMaterial({ color: this.naval ? 0x2a5a78 : 0x3a7aa8, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.88 }));
      w.rotation.x = -Math.PI / 2; w.position.set(this.cfg.beach ? -560 : 0, this.naval ? 0.2 : -0.7, 0); w.receiveShadow = true; this.scene.add(w); this.water = w;
    }
    if (this.cfg.river) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(60, 700), new THREE.MeshStandardMaterial({ color: 0x3a7aa8, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 }));
      w.rotation.x = -Math.PI / 2; w.position.set(118, -0.9, 0); this.scene.add(w);
      // 戰船
      const hull = new THREE.MeshStandardMaterial({ color: 0x5a3a22 }), sail = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, side: THREE.DoubleSide });
      for (let i = 0; i < 6; i++) {
        const b = new THREE.Group();
        const hb = new THREE.Mesh(new THREE.BoxGeometry(5, 1.6, 16), hull); hb.position.y = 0.3; b.add(hb);
        const ms = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10), hull); ms.position.y = 5; b.add(ms);
        const sl = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), sail); sl.position.set(0, 6, 0.3); sl.rotation.y = Math.PI / 2; b.add(sl);
        const zz = (i - 2.5) * 50;
        b.position.set(118 + rand(-6, 6), -0.9, zz);
        b.traverse(o => { if (o.isMesh) o.castShadow = true; });
        this.scene.add(b);
      }
    }
  }

  buildFlora() {
    const tg = treeGeometries();
    const ptsP = [], ptsR = [];
    const rnd = this.rng;
    for (let k = 0; k < 9000 * Q().trees; k++) {
      const x = (rnd() - 0.5) * 640, z = (rnd() - 0.5) * 640;
      const r = Math.hypot(x, z);
      let d = this.forestAt(x, z);
      if (this.groundRaw(x, z) < 0.2) continue;
      if (r > 200) d = Math.max(d, 0.25);
      if (this.siege && (z - this.zw) * this.sgnAtt < 10 && Math.abs(x) < 150) d = 0;
      if (this.siege && Math.abs(z - this.zw) < 30) d *= 0.1;
      if (this.campAt(x, z)) d *= 0.6;
      if (this.cfg.river && Math.abs(x - 118) < 26) d = 0;
      if (this.terrain !== 'mountain' && Math.abs(x) < 40 && Math.abs(z) < 110 && !this.cfg.forest) d *= 0.1;
      if (rnd() < d * 0.9) {
        const h = this.ground(x, z);
        if (h > 52) continue;
        (rnd() < 0.55 ? ptsP : ptsR).push([x, h, z, 0.8 + rnd() * 0.9, rnd() * 6.28]);
      }
    }
    const mk = (geo, mat, pts) => {
      const m = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length));
      const d = new THREE.Object3D();
      pts.forEach((p, i) => { d.position.set(p[0], p[1] - 0.2, p[2]); d.scale.setScalar(p[3] * 1.6); d.rotation.y = p[4]; d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
      m.count = pts.length; m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
    };
    const vm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    mk(tg.trunk, vm, [...ptsP, ...ptsR]);
    mk(tg.pineTop, vm, ptsP);
    mk(tg.roundTop, vm, ptsR);
    // 草叢、岩石
    const grass = new THREE.ConeGeometry(0.35, 0.55, 4); grass.translate(0, 0.25, 0);
    const gm = new THREE.InstancedMesh(grass, new THREE.MeshStandardMaterial({ color: 0x7c9a48, roughness: 1 }), 7000);
    const rock = new THREE.DodecahedronGeometry(1, 0);
    const rm = new THREE.InstancedMesh(rock, new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 1, flatShading: true }), 500);
    const d = new THREE.Object3D(); let gi = 0, ri = 0;
    for (let k = 0; k < Q().grass; k++) {
      const x = (rnd() - 0.5) * 420, z = (rnd() - 0.5) * 420; const h = this.groundRaw(x, z);
      if (h < 0.3) continue;
      if (h < -0.5 || (this.siege && (z - this.zw) * this.sgnAtt < 6)) continue;
      d.position.set(x, h, z); d.rotation.set(0, rnd() * 6, 0); d.scale.set(1, 0.6 + rnd(), 1); d.updateMatrix(); gm.setMatrixAt(gi++, d.matrix);
    }
    for (let k = 0; k < 500; k++) {
      const x = (rnd() - 0.5) * 500, z = (rnd() - 0.5) * 500; const h = this.ground(x, z);
      const slope = Math.abs(this.ground(x + 2, z) - this.ground(x - 2, z));
      if (slope < 1 && rnd() < 0.7) continue;
      if (this.siege && Math.abs(z - this.zw) < 20) continue;
      d.position.set(x, h, z); d.rotation.set(rnd() * 3, rnd() * 3, 0); d.scale.setScalar(0.5 + rnd() * 2.2); d.updateMatrix(); rm.setMatrixAt(ri++, d.matrix);
    }
    gm.count = gi; rm.count = ri; rm.castShadow = true; rm.receiveShadow = true;
    this.scene.add(gm, rm);
  }

  buildCity() {
    const c = this.cfg;
    const dfac = this.defSide === 'p' ? this.pf : this.ef;
    const wall = makeWall(300, this.wallH, FACTIONS[dfac].css, c.cityName || '城');
    wall.position.set(0, 0.3, this.zw);
    if (this.sgnAtt < 0) wall.rotation.y = Math.PI;
    wall.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(wall);
    this.wall = wall;
    const gh = (c.gateHP || 4000) * (this.defSide === 'p' ? 1.8 * (1 + 0.35 * ((c.wallLevel || 1) - 1)) : 1);
    this.gate = { hp: gh, max: gh, broken: false, mesh: wall.userData.gate };
    // 城內建築
    const roofM = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.6 });
    const wallM = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.9 });
    const redM = new THREE.MeshStandardMaterial({ color: 0x8f2a1f, roughness: 0.7 });
    for (let i = 0; i < 70; i++) {
      const x = rand(-140, 140), dz = rand(18, 140);
      if (Math.abs(x) < 16 && dz < 70) continue;
      const z = this.zw - this.sgnAtt * dz;
      const w = rand(6, 14), dd = rand(6, 12), h = rand(4, 8);
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), Math.random() < 0.2 ? redM : wallM); b.position.y = h / 2; g.add(b);
      const r = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, dd) * 0.78, 3.5, 4), roofM); r.position.y = h + 1.75; r.rotation.y = Math.PI / 4; r.scale.set(w / Math.max(w, dd), 1, dd / Math.max(w, dd)); g.add(r);
      g.position.set(x, this.ground(x, z), z);
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.scene.add(g);
    }
    // 城牆兩端延伸的山
    if (this.attSide && this.hasWeapon(this.attSide, 'catapult')) {
      for (const sx of [-30, 30]) {
        const cp = makeCatapult();
        const z = this.zw + this.sgnAtt * 95;
        cp.position.set(sx, this.ground(sx, z), z);
        cp.rotation.y = this.sgnAtt > 0 ? 0 : Math.PI;
        this.scene.add(cp);
        this.catapults.push({ mesh: cp, t: rand(2, 5) });
      }
    }
  }

  buildCamps() {
    const side = this.cfg.camps;
    const geo = makeTent();
    const zc = side === 'p' ? 95 : -95;
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 120);
    const d = new THREE.Object3D(); let i = 0;
    for (let x = -75; x <= 75; x += 12) for (let z = -24; z <= 24; z += 12) {
      if (Math.random() < 0.25) continue;
      const px = x + rand(-3, 3), pz = zc + z + rand(-3, 3);
      d.position.set(px, this.ground(px, pz), pz); d.scale.setScalar(rand(0.9, 1.3)); d.updateMatrix(); m.setMatrixAt(i++, d.matrix);
    }
    m.count = i; m.castShadow = true; this.scene.add(m);
    // 營寨柵欄
    const fm = new THREE.MeshStandardMaterial({ color: 0x6b4a2b });
    for (let x = -85; x <= 85; x += 2.2) for (const dz of [-30, 30]) {
      const z = zc + dz;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 3, 5), fm); p.position.set(x, this.ground(x, z) + 1.4, z); p.castShadow = true; this.scene.add(p);
    }
    for (let i2 = 0; i2 < 5; i2++) {
      const b = makeBanner(FACTIONS[side === 'p' ? this.pf : this.ef].name, FACTIONS[side === 'p' ? this.pf : this.ef].css, 8, 2.2);
      const x = -60 + i2 * 30; b.position.set(x, this.ground(x, zc), zc + (side === 'p' ? 28 : -28));
      this.scene.add(b); (this.decoBanners ||= []).push(b);
    }
  }

  hasWeapon(side, w) {
    if (w === 'ladder') return true;
    if (side === 'p') return this.state.hasWeapon(w);
    return (this.cfg.enemy.weapons || []).includes(w);
  }

  // ———————————————— 部隊 ————————————————
  makeSquad(side, o) {
    const sq = {
      id: UID++, side, type: o.type, general: o.general || null, troops: o.troops, max: o.troops, morale: o.morale ?? 100,
      pos: new V2(0, 0), yaw: side === 'p' ? 0 : Math.PI, wave: o.wave || 1, released: false,
      hidden: !!o.ambush, ambush: !!o.ambush, wallSquad: !!o.wall, onWall: !!o.wall, climbT: 0,
      state: 'wait', order: 'auto', target: null, moveTo: null, dead: false, routed: false, escaped: false,
      engaged: false, attackers: 0, loss: 0, killed: 0, soldiers: [], fireCd: rand(0, 1), leader: !!o.leader,
      reinforcement: !!o.reinforcement, revealed: !o.ambush,
    };
    return sq;
  }
  genStat(sq, k) { const g = GENERALS[sq.general]; return g ? g[k] : 50; }
  stats(sq) {
    const T = UNIT_TYPES[sq.type], S = this.sides[sq.side];
    const F = FORMATIONS[S.formation]?.mods || { atk: 1, def: 1, spd: 1 };
    let atk = T.atk * F.atk, def = T.def * F.def, spd = T.speed * F.spd, range = T.range;
    if (sq.type === 'archer') { atk *= F.archer || 1; range *= F.range || 1; }
    const war = this.genStat(sq, 'war'), lead = this.genStat(sq, 'lead');
    atk *= 1 + (war - 65) / 140; def *= 1 + (lead - 65) / 140;
    const W = (w) => this.hasWeapon(sq.side, w);
    if (sq.type === 'cav' && W('armor')) def *= 1.3;
    if (sq.type === 'cav' && W('horse')) { spd *= 1.2; atk *= 1.1; }
    if (sq.type === 'inf' && W('rattan')) def *= 1.25;
    if (sq.type === 'cav' && this.hasWeapon(sq.side === 'p' ? 'e' : 'p', 'caltrop') && !sq.engaged) spd *= 0.7;
    if (sq.confusedUntil > this.simT) { atk *= 0.5; spd *= 0.3; }
    if (sq.type === 'archer' && W('crossbow')) atk *= 1.4;
    if (sq.type === 'spear' && W('spear')) atk *= 1.25;
    if (this.cfg.river && W('warship')) atk *= 1.15;
    for (const b of S.buffs) {
      if (b.until < this.simT) continue;
      if (b.filter && !b.filter(sq)) continue;
      if (b.atk) atk *= b.atk; if (b.def) def *= b.def; if (b.spd) spd *= b.spd;
    }
    if (sq.wallSquad) { def *= 2.3 * (sq.side === 'p' ? 1 + 0.1 * ((this.cfg.wallLevel || 1) - 1) : 1); range *= 1.15; }
    if (sq.side === 'e') atk *= this.D.atk || 1;
    else atk *= 1 + 0.05 * (this.state.training || 0);
    if (sq.type === 'archer' && this.weather === 'rain') atk *= 0.8;
    if (this.inRiver(sq.pos.x, sq.pos.y)) { spd *= 0.45; def *= 0.8; }
    if (S.asleep) def *= 0.6;
    if (S.chained) { spd *= 0.6; def *= 1.1; }
    if (S.lastStand) atk *= 1.25;
    if (S.reckless) def *= 0.88;
    if (sq.routed) spd *= 1.25;
    if (S.marching && !sq.engaged) def *= 0.85;
    return { atk, def, spd, range };
  }

  layoutSquad(sq) {
    const perSoldier = this.perSoldier;
    const n = clamp(Math.ceil(sq.troops / perSoldier), 6, 140);
    const sp = SP[sq.type];
    sq.soldiers = [];
    if (sq.wallSquad) {
      const w = n * 1.15;
      for (let i = 0; i < n; i++) sq.soldiers.push(this.newSoldier(sq, (i - (n - 1) / 2) * 1.15, rand(-1.2, 0.6), 0));
      sq.radius = w / 2; sq.cols = n; sq.rows = 1;
    } else {
      const cols = Math.ceil(Math.sqrt(n * 2.2)), rows = Math.ceil(n / cols);
      for (let i = 0; i < n; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        sq.soldiers.push(this.newSoldier(sq, (c - (cols - 1) / 2) * sp, (r - (rows - 1) / 2) * sp, r));
      }
      sq.radius = Math.max(cols, rows) * sp / 2 + 0.5; sq.cols = cols; sq.rows = rows;
      sq.depth = rows * sp;
    }
  }
  newSoldier(sq, lx, lz, row = 0) {
    return { lx, lz, row, x: 0, z: 0, y: 0, vx: 0, vz: 0, yaw: sq.yaw, alive: true, deadT: 0, ph: Math.random() * 6.28, jx: rand(-0.2, 0.2), jz: rand(-0.2, 0.2), lean: 0, gone: false, fx: 0,
      wph: Math.random() * 6.28, at: Math.random(), atRate: 0.85 + Math.random() * 0.35, act: 'idle', foe: null };
  }
  placeSoldiers(sq) {
    const c = Math.cos(sq.yaw), s = Math.sin(sq.yaw);
    for (const so of sq.soldiers) {
      so.x = sq.pos.x + c * so.lx + s * so.lz + so.jx;
      so.z = sq.pos.y - s * so.lx + c * so.lz + so.jz;
      so.yaw = sq.yaw;
    }
  }

  addSquadVisual(sq) {
    const fac = sq.side === 'p' ? this.pf : this.ef;
    const F = FACTIONS[fac];
    const grp = new THREE.Group();
    const g = GENERALS[sq.general];
    if (g) {
      const gm = makeHero(sq.general, F.color, { mounted: !sq.wallSquad });
      gm.scale.setScalar(1.3);
      grp.add(gm); sq.genModel = gm;
    }
    const txt = g ? (g.banner || g.name[0]) : F.name;
    const ban = makeBanner(txt, F.css, sq.leader ? 9 : 7, sq.leader ? 2.6 : 2.0);
    ban.position.set(1.4, 0, 0.8);
    grp.add(ban); sq.banner = ban;
    if (sq.leader) {
      const big = makeBanner(F.name, F.css, 11, 3.2); big.position.set(-2, 0, 1.2); grp.add(big); sq.banner2 = big;
    }
    grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(grp); sq.group = grp;
    if (this.naval) {
      const L = Math.max(14, (sq.depth || 6) + 10), W = Math.max(7, (sq.cols || 6) * SP[sq.type] + 3);
      const ship = makeShip(L, W, F.color, sq.leader);
      this.scene.add(ship); sq.ship = ship;
    }
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6, 10), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.sq = sq; this.scene.add(hit); sq.hit = hit;
    const lab = document.createElement('div');
    lab.className = 'squad-label';
    lab.style.setProperty('--sc', F.css);
    lab.innerHTML = `<div class="sn">${sq.leader ? '帥·' : ''}${g ? g.name : UNIT_TYPES[sq.type].name}<span class="st"></span></div><div class="sb"><div></div></div><div class="sm"><div></div></div>`;
    lab.onpointerdown = (e) => { e.stopPropagation(); this.clickSquad(sq, e); };
    const obj = new CSS2DObject(lab); this.scene.add(obj);
    sq.label = lab; sq.labelObj = obj;
  }
  removeSquadVisual(sq) {
    if (sq.ship) { this.scene.remove(sq.ship); sq.ship = null; }
    if (sq.group) this.scene.remove(sq.group);
    if (sq.hit) this.scene.remove(sq.hit);
    if (sq.labelObj) { this.scene.remove(sq.labelObj); sq.label.remove(); }
  }
  rebuildBatches() {
    for (const b of Object.values(this.batches)) b.list = [];
    for (const sq of this.squads) for (const so of sq.soldiers) { so.sq = sq; this.batches[sq.side + sq.type].list.push(so); }
    for (const b of Object.values(this.batches)) { const n = Math.min(900, b.list.length); for (const p of b.parts) for (const m of p.meshes) m.count = n; }
  }

  setupSides() {
    const c = this.cfg, E = c.enemy;
    this.sides.p = { id: 'p', faction: this.pf, formation: 'yulin', tactics: [...this.state.tactics], cd: {}, buffs: [], init: 0, lastStand: false, reckless: false };
    this.sides.e = { id: 'e', faction: this.ef, formation: E.formation || 'yulin', tactics: E.tactics || ['volley', 'drum'], cd: {}, buffs: [], init: 0, lastStand: false, reckless: !!c.enemyReckless, marching: !!c.enemyMarching };
    this.enemyLeader = E.leader;
    const maxT = Math.max(E.troops, Math.min(this.state.troops, c.maxTroops || 1e9));
    this.perSoldier = Math.max(20, Math.ceil(maxT / Q().soldierCap));
    this.sides.e.asleep = c.nightRaid === 'p';
    this.sides.e.chained = c.chained === 'e'; this.sides.p.chained = c.chained === 'p';
  }

  anchor(side) {
    if (this.siege) {
      if (side === this.attSide) return new V2(0, this.zw + this.sgnAtt * 78);
      return new V2(0, this.zw - this.sgnAtt * 26);
    }
    return new V2(0, side === 'p' ? 70 : -70);
  }

  createEnemySquads() {
    const c = this.cfg, E = c.enemy;
    const comp0 = E.comp || COMP[this.ef] || COMP.wei;
    const comp = this.naval ? { ...comp0, inf: (comp0.inf || 0) + (comp0.cav || 0), cav: 0 } : comp0;
    const ok = (g) => GENERALS[g] && !this.state.dead.includes(g) && !this.state.generals.includes(g) && !this.state.prisoners.includes(g);
    const gens = (E.generals || []).filter(ok);
    const leader = ok(E.leader) ? E.leader : gens[0];
    this.enemyLeader = leader;
    if (c.enemyAmbush?.generals) c.enemyAmbush.generals = c.enemyAmbush.generals.filter(ok);
    if (c.reinforce && c.reinforce.general && !(c.reinforce.side === 'p' ? this.state.generals.includes(c.reinforce.general) || !this.state.dead.includes(c.reinforce.general) : ok(c.reinforce.general))) c.reinforce.general = null;
    const ambush = c.enemyAmbush;
    E.troops = Math.round(E.troops * (this.D.enemy || 1));
    let mainTroops = E.troops;
    const out = [];
    if (ambush) {
      const share = ambush.share || 0.3;
      const at = Math.round(E.troops * share);
      mainTroops -= at;
      const ag = ambush.generals || [];
      for (let i = 0; i < (ambush.count || 2); i++) {
        out.push(this.makeSquad('e', { type: i % 2 ? 'cav' : 'inf', troops: Math.round(at / (ambush.count || 2)), general: ag[i], ambush: true, wave: 1 }));
      }
    }
    let n = clamp(Math.max(gens.length, Math.ceil(mainTroops / 6000)), 3, 6);
    const types = [];
    const keys = Object.keys(comp).filter(k => comp[k] > 0);
    // 依比例分配兵種
    const counts = {}; keys.forEach(k => counts[k] = 0);
    for (let i = 0; i < n; i++) {
      let best = keys[0], bs = -1e9;
      for (const k of keys) { const s = comp[k] - counts[k] / n; if (s > bs) { bs = s; best = k; } }
      counts[best]++; types.push(best);
    }
    // 排序：前排步/槍、騎在翼、弓在後
    const order = { spear: 0, inf: 1, cav: 2, archer: 3 };
    types.sort((a, b) => order[a] - order[b]);
    const genPool = [leader, ...gens.filter(g => g !== leader)].filter(Boolean);
    const squads = types.map((t, i) => this.makeSquad('e', { type: t, troops: Math.round(mainTroops / n), morale: c.enemyMorale, wave: i < Math.ceil(n / 2) ? 1 : (i < n - 1 ? 2 : 3) }));
    // 指派武將：主帥在中間的部隊
    const leadIdx = squads.findIndex(s => s.type === 'inf' || s.type === 'spear');
    const li = leadIdx >= 0 ? leadIdx : 0;
    if (leader) { squads[li].general = leader; squads[li].leader = true; }
    let gi = 0;
    const rest = genPool.filter(g => g !== leader && !(ambush?.generals || []).includes(g));
    squads.forEach((s, i) => { if (i !== li && gi < rest.length) s.general = rest[gi++]; });
    if (this.siege && this.defSide === 'e') {
      squads.forEach(s => { if (s.type === 'archer') { s.wallSquad = true; s.onWall = true; } });
      if (!squads.some(s => s.wallSquad)) { squads[squads.length - 1].type = 'archer'; squads[squads.length - 1].wallSquad = true; squads[squads.length - 1].onWall = true; }
    }
    out.push(...squads);
    return out;
  }

  defaultPlayerRows() {
    const c = this.cfg, st = this.state;
    const avail = Math.min(st.troops, c.maxTroops || st.troops);
    const gens = st.generals.filter(g => GENERALS[g] && !(this.injured || []).includes(g)).sort((a, b) => (GENERALS[b].war + GENERALS[b].lead) - (GENERALS[a].war + GENERALS[a].lead));
    let leader = c.playerLeader && st.generals.includes(c.playerLeader) ? c.playerLeader : gens[0];
    const others = (c.playerGenerals || []).filter(g => st.generals.includes(g) && g !== leader);
    for (const g of gens) if (!others.includes(g) && g !== leader) others.push(g);
    const n = clamp(Math.ceil(avail / 5000), 3, 6);
    const types = this.siege && this.attSide === 'p' ? ['inf', 'spear', 'archer', 'inf', 'archer', 'cav'] :
      this.siege ? ['inf', 'archer', 'archer', 'spear', 'inf', 'cav'] : this.naval ? ['inf', 'archer', 'spear', 'archer', 'inf', 'archer'] : ['spear', 'inf', 'cav', 'archer', 'cav', 'archer'];
    const rows = [];
    for (let i = 0; i < n; i++) rows.push({ type: types[i], general: i === 0 ? leader : (others[i - 1] || ''), troops: Math.floor(avail / n / 500) * 500, wave: i < 3 ? 1 : 2, ambush: false });
    // 鐵律：主將所在部隊為步兵
    rows[0].type = this.siege && this.defSide === 'p' ? 'inf' : rows[0].type;
    return rows;
  }

  applyPlayerRows(rows) {
    for (const sq of this.squads.filter(s => s.side === 'p' && !s.reinforcement)) this.removeSquadVisual(sq);
    this.squads = this.squads.filter(s => s.side !== 'p' || s.reinforcement);
    rows.forEach((r, i) => {
      if (r.troops <= 0) return;
      if (this.naval && r.type === 'cav') r.type = 'inf';
      const sq = this.makeSquad('p', { type: r.type, troops: r.troops, general: r.general || null, wave: r.wave, ambush: r.ambush, leader: i === 0, morale: this.cfg.playerMorale });
      if (this.siege && this.defSide === 'p' && r.type === 'archer') { sq.wallSquad = true; sq.onWall = true; }
      this.squads.push(sq);
    });
    this.rows = rows;
    this.layoutSide('p');
  }

  layoutSide(side) {
    const S = this.sides[side];
    const F = FORMATIONS[S.formation];
    const list = this.squads.filter(s => s.side === side && !s.reinforcement);
    const an = this.anchor(side);
    const yaw = side === 'p' ? (this.siege && this.attSide === 'e' ? 0 : 0) : Math.PI;
    const faceYaw = this.siege ? (side === this.attSide ? (this.sgnAtt > 0 ? 0 : Math.PI) : (this.sgnAtt > 0 ? Math.PI : 0)) : yaw;
    let normalIdx = 0, wallIdx = 0, ambIdx = 0;
    const slots = F.slots.map((p, i) => ({ p, i }));
    const leadSlot = slots.reduce((a, b) => (b.p[0] ** 2 + (b.p[1] - 0.5) ** 2 < a.p[0] ** 2 + (a.p[1] - 0.5) ** 2 ? b : a)).i;
    const order = [leadSlot, ...slots.map(s => s.i).filter(i => i !== leadSlot)];
    const hasLeader = list.some(s => s.leader && !s.wallSquad && !s.ambush);
    if (!hasLeader) order.push(order.shift());
    const wallCount = list.filter(s => s.wallSquad).length;
    for (const sq of list) {
      this.layoutSquad(sq);
      sq.yaw = faceYaw;
      if (sq.wallSquad) {
        const span = 140;
        const x = wallCount === 1 ? -30 : -span / 2 + (wallIdx++ / Math.max(1, wallCount - 1)) * span;
        const xx = Math.abs(x) < 14 ? x + 22 * Math.sign(x || 1) : x;
        sq.pos.set(xx, this.zw + this.sgnAtt * 1.2);
      } else if (sq.ambush) {
        const sideX = ambIdx++ % 2 ? 1 : -1;
        const base = side === 'p' ? 1 : -1;
        if (this.terrain === 'mountain') sq.pos.set(sideX * rand(48, 58), base * rand(-10, 15));
        else sq.pos.set(sideX * rand(70, 85), base * rand(0, 25));
        sq.yaw = sideX > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        const sl = F.slots[sq.leader ? leadSlot : order[(hasLeader ? 1 : 0) + (normalIdx++) % (F.slots.length - (hasLeader ? 1 : 0))] ?? 0];
        const spacing = 21;
        let lx = sl[0] * spacing, lz = sl[1] * spacing;
        if (this.siege && side === this.defSide) { lz = Math.abs(lz) * 0.6; lx *= 0.8; }
        const c = Math.cos(faceYaw), s = Math.sin(faceYaw);
        sq.pos.set(an.x + c * lx + s * lz, an.y - s * lx + c * lz);
        if (this.cfg.enemyMarching && side === 'e') sq.pos.set(rand(-4, 4), -95 - normalIdx * 20);
      }
      sq.home = sq.pos.clone();
      this.placeSoldiers(sq);
      if (!sq.group) this.addSquadVisual(sq);
    }
    this.rebuildBatches();
  }

  // ———————————————— 每幀 ————————————————
  update(dt) {
    this.time += dt;
    if (this.controls.enabled) {
      // WASD 平移
      const k = this.keys, mv = new THREE.Vector3();
      const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
      if (k.KeyW) mv.add(fwd); if (k.KeyS) mv.sub(fwd); if (k.KeyD) mv.add(right); if (k.KeyA) mv.sub(right);
      if (mv.lengthSq()) { mv.normalize().multiplyScalar(dt * 80); this.camera.position.add(mv); this.controls.target.add(mv); }
      this.controls.update();
    }
    if (!this.paused && this.phase === 'fight') {
      let left = dt * this.speed;
      while (left > 0) { const h = Math.min(left, 0.05); this.sim(h); left -= h; }
    }
    this.updateVisuals(dt, this.paused ? 0 : dt * this.speed);
    if (this.phase === 'fight' && (this._hudT = (this._hudT || 0) + dt) > 0.2) { this._hudT = 0; this.updateHUD(); }
  }

  enemiesOf(side) { return this.squads.filter(s => s.side !== side && !s.dead && !s.escaped); }
  visibleTarget(s, by) {
    if (s.dead || s.escaped || (s.hidden && !s.revealed && s.side === 'e') || (s.hidden && s.side === 'p')) return false;
    return !by || this.visibleTo(by, s);
  }
  visibleTo(side, s) {
    if (this.visR === Infinity || s.side === side) return true;
    if (s.engaged || s._seenT > this.simT) return true;
    for (const o of this.squads) if (o.side === side && !o.dead && !o.escaped && o.pos.distanceTo(s.pos) < this.visR) { s._seenT = this.simT + 2; return true; }
    return false;
  }

  outside(z) { return (z - this.zw) * this.sgnAtt > 0; }

  sim(dt) {
    this.simT += dt;
    const c = this.cfg;
    // 波次釋放（敵）
    const E = this.sides.e, P = this.sides.p;
    for (const sq of this.squads) {
      if (sq.side !== 'e' || sq.released || sq.dead) continue;
      if (sq.hidden) continue;
      let rel = false;
      if (this.siege && this.defSide === 'e') rel = sq.wallSquad || this.gate.broken || this.squads.some(p => p.side === 'p' && !p.dead && !this.outside(p.pos.y));
      else if (c.enemyHold && !E.reckless) rel = this.enemiesOf('e').some(p => p.pos.distanceTo(sq.pos) < 75) || this.simT > (c.enemyHold === true ? 9999 : c.enemyHold);
      else if (E.reckless || c.enemyMarching) rel = true;
      else rel = sq.wave === 1 || (sq.wave === 2 && (this.simT > 22 || this.sideLossRatio('e') > 0.15)) || (sq.wave === 3 && (this.simT > 45 || this.sideLossRatio('e') > 0.3));
      if (this.siege && this.attSide === 'e') rel = sq.wave === 1 || (sq.wave === 2 && this.simT > 15) || this.simT > 35;
      if (rel) { sq.released = true; sq.state = 'idle'; }
    }
    // 敵伏兵觸發
    for (const sq of this.squads) {
      if (sq.side !== 'e' || !sq.hidden || sq.dead) continue;
      const near = this.squads.some(p => p.side === 'p' && !p.dead && p.released && p.pos.distanceTo(sq.pos) < (this.cfg.enemyAmbush?.revealed ? 35 : 60));
      const advanced = this.squads.filter(p => p.side === 'p' && p.released && !p.dead).some(p => p.pos.y < 5);
      if (near || advanced || this.simT > (this.cfg.enemyAmbush?.at || 50)) this.triggerAmbush('e');
    }
    // 玩家伏兵自動觸發
    for (const sq of this.squads) {
      if (sq.side !== 'p' || !sq.hidden || sq.dead) continue;
      if (this.squads.some(e => e.side === 'e' && !e.dead && !e.hidden && e.pos.distanceTo(sq.pos) < 38)) this.triggerAmbush('p');
    }
    for (const side of ['p', 'e']) {
      if (!this.squads.some(s => s.side === side && s.hidden && !s.dead)) continue;
      if (!this.squads.some(s => s.side === side && !s.hidden && !s.dead && !s.escaped && !s.routed)) this.triggerAmbush(side);
    }
    // 援軍
    if (c.reinforce && !this._reinf && this.simT > c.reinforce.at) {
      this._reinf = true;
      const R = c.reinforce;
      const side = R.side || 'p';
      const types = R.types || ['cav', 'inf'];
      types.forEach((t, i) => {
        const sq = this.makeSquad(side, { type: t, troops: Math.round(R.troops / types.length), general: i === 0 ? R.general : (R.generals?.[i - 1]), wave: 1, reinforcement: true });
        this.layoutSquad(sq);
        const zEdge = (side === 'p' ? 150 : -150) * (R.rear ? -1.2 : 1);
        sq.pos.set((i - (types.length - 1) / 2) * 30 + (R.x || 0), this.siege ? this.anchor(side).y + (side === this.attSide ? this.sgnAtt * 50 : -this.sgnAtt * 50) : zEdge);
        sq.yaw = (side === 'p') !== !!R.rear ? 0 : Math.PI;
        sq.released = true; sq.state = 'idle';
        this.squads.push(sq); this.placeSoldiers(sq); this.addSquadVisual(sq);
        if (R.shock) for (const o of this.squads) if (o.side !== side && !o.dead) o.morale -= R.shock;
        if (side === 'p') this.sides.p.init += sq.troops; else this.sides.e.init += sq.troops;
      });
      this.rebuildBatches();
      this.log(side, R.msg || `${gname(R.general)}率援軍${fmt(R.troops)}趕到戰場！`);
      SFX.horn();
      for (const sq of this.squads) if (sq.side !== side && !sq.dead) sq.morale -= 10;
    }
    // 夜襲：敵軍熟睡
    if (this.sides.e.asleep) {
      if (this.squads.some(s => s.side === 'e' && s.attackers > 0 || s.side === 'e' && s.loss > 0) || this.simT > 35) {
        this.sides.e.asleep = false;
        for (const s of this.squads) if (s.side === 'e' && !s.dead) { s.released = true; s.morale -= 25; }
        this.log('p', '敵軍從睡夢中驚醒，營中大亂！');
        SFX.horn();
      }
    }
    // 火船
    for (const b of this.boats) {
      if (b.done) continue;
      const tg = b.target && !b.target.dead ? b.target : this.enemiesOf(b.by).sort((a, c) => a.pos.distanceTo(b.pos) - c.pos.distanceTo(b.pos))[0];
      if (!tg) { b.done = true; continue; }
      b.target = tg;
      const d = new V2().subVectors(tg.pos, b.pos); const len = d.length();
      let spd = 15;
      if (this.wind) spd *= 1 + 0.6 * Math.max(0, d.clone().normalize().dot(this.wind));
      b.pos.addScaledVector(d, Math.min(1, spd * dt / Math.max(len, 0.01)));
      if (len < tg.radius + 6) {
        b.done = true;
        const chained = this.sides[tg.side].chained;
        this.fires.push({ pos: tg.pos.clone(), r: 20, until: this.simT + 14, by: b.by, power: b.power * (chained ? 1.5 : 1), spread: 2, canSpread: true, bonus: chained ? 0.8 : 0.2, naval: true });
        if (!this._fsLog || this.simT - this._fsLog > 6) { this._fsLog = this.simT; this.log(b.by, chained ? '火船撞入敵陣！敵艦以鐵索相連，無法散開！' : '火船撞上敵艦，烈焰沖天！'); }
        SFX.fireSound(0.6);
      }
    }
    // 斷水
    if (c.waterCut) for (const sq of this.squads) if (sq.side === c.waterCut && !sq.dead && !sq.routed) sq.morale -= dt * (this.hasWeapon(sq.side, 'muniu') ? 0.12 : 0.35);

    // —— 行動 ——
    for (const sq of this.squads) { sq.attackers = 0; sq.engaged = false; }
    for (const sq of this.squads) {
      if (sq.dead || sq.escaped) continue;
      if (!sq.released && !sq.hidden && !sq.wallSquad && this.enemiesOf(sq.side).some(e => this.visibleTarget(e) && e.pos.distanceTo(sq.pos) < sq.radius + e.radius + 14)) {
        sq.released = true; sq.state = 'idle';
        if (sq.side === 'p') { this.log('p', `${this.sqName(sq)}遭敵襲擊，被迫迎戰！`); this.buildCards(); }
      }
      if (!sq.released || sq.hidden) { sq.state = sq.hidden ? 'hidden' : 'wait'; continue; }
      if (sq.routed) { this.doRout(sq, dt); continue; }
      this.doSquad(sq, dt);
    }
    // —— 傷亡結算 ——
    for (const sq of this.squads) {
      if (sq.loss > 0 && !sq.dead) {
        const l = Math.min(sq.loss, sq.troops);
        sq.troops -= l;
        const mf = this.sides[sq.side].lastStand ? 60 : 95;
        sq.morale -= (l / sq.max) * mf * (sq.attackers > 1 ? 1.25 : 1) * (sq.wallSquad || (this.siege && sq.side === this.defSide) ? 0.6 : 1);
        sq.loss = 0;
        if (sq.troops <= 1) this.wipeOut(sq);
        else if (sq.morale <= 0 && !sq.routed) this.rout(sq);
      } else if (!sq.dead && !sq.routed && !sq.engaged && sq.morale < 100) sq.morale += dt * 0.4;
      sq.morale = clamp(sq.morale, -5, 120);
    }
    // 城門
    if (this.siege && !this.gate.broken && this.gate.hp <= 0) {
      this.gate.broken = true;
      this.log(this.attSide, '城門被攻破了！');
      SFX.drumRoll(4, 0.18);
      const gm = this.gate.mesh;
      tween(800, t => { gm.rotation.x = -t * 1.45; gm.position.y = (this.wallH - 1) / 2 * (1 - t * 0.7); });
      const gp = this.gatePos();
      for (let i = 0; i < 60; i++) this.particlesN.emit(gp.x + rand(-6, 6), rand(1, 6), gp.y + rand(-4, 4), rand(-3, 3), rand(1, 4), rand(-3, 3), rand(2, 4), rand(4, 8), 0.55, 0.5, 0.42, 0.7, -0.2, 3);
      for (const sq of this.squads) if (sq.side === this.defSide && !sq.dead) sq.morale -= 20;
    }
    // 投石車
    for (const cp of this.catapults) {
      cp.t -= dt;
      if (cp.t <= 0) {
        cp.t = rand(4.5, 6.5);
        const tgts = this.squads.filter(s => s.side === this.defSide && !s.dead && s.wallSquad);
        const from = cp.mesh.position;
        let to;
        let tgt = tgts.length && Math.random() < 0.75 ? pick(tgts) : null;
        if (tgt) to = new THREE.Vector3(tgt.pos.x + rand(-6, 6), this.wallH + 1, tgt.pos.y);
        else { const gp = this.gatePos(); to = new THREE.Vector3(gp.x + rand(-4, 4), 5, gp.y); }
        this.launchBoulder(new THREE.Vector3(from.x, from.y + 5, from.z), to, 2.4, () => {
          if (tgt && !tgt.dead) { tgt.loss += 30 + Math.random() * 50; tgt.morale -= 3; }
          else if (!tgt && !this.gate.broken) this.gate.hp -= 220;
        });
        const arm = cp.mesh.userData.arm;
        tween(300, t => arm.rotation.x = -0.5 + t * 1.6).then(() => tween(1200, t => arm.rotation.x = 1.1 - t * 1.6));
      }
    }
    // 火
    for (const f of this.fires) {
      if (f.until < this.simT) continue;
      if (this.weather === 'rain') f.power = Math.min(f.power, 0.25);
      for (const sq of this.squads) {
        if (sq.dead || sq.side === f.by) continue;
        const d = sq.pos.distanceTo(f.pos);
        if (d < f.r + sq.radius * 0.6) {
          const mult = Math.min(4, 1 + this.forestAt(sq.pos.x, sq.pos.y) * 1.6 + this.campAt(sq.pos.x, sq.pos.y) * 0.7 + (f.bonus || 0));
          sq.loss += (sq.troops * 0.0055 + 6) * mult * f.power * dt * (sq.type === 'inf' && this.hasWeapon(sq.side, 'rattan') ? 1.5 : 1);
          sq.morale -= dt * 1.1 * Math.min(mult, 2.5);
          if (!sq.routed && sq.order !== 'move' && sq.side === 'e' && Math.random() < dt * 0.2) { sq.moveTo = new V2(sq.pos.x + rand(-30, 30), sq.pos.y + (sq.side === 'p' ? 30 : -30)); }
        }
      }
      // 蔓延
      f.spread -= dt;
      if (f.spread <= 0 && f.canSpread) {
        f.spread = 4.5;
        const near = this.squads.filter(s => s.side !== f.by && !s.dead && s.pos.distanceTo(f.pos) < (f.naval && this.sides[s.side].chained ? 80 : 55) && s.pos.distanceTo(f.pos) > f.r && (this.forestAt(s.pos.x, s.pos.y) + this.campAt(s.pos.x, s.pos.y) > 0.35 || (f.naval && this.sides[s.side].chained) || (f.naval && Math.random() < 0.3)) && (!this.wind || new V2().subVectors(s.pos, f.pos).normalize().dot(this.wind) > -0.3));
        if (near.length && this.fires.filter(x => x.until > this.simT).length < 5) {
          const t = pick(near);
          this.fires.push({ pos: t.pos.clone(), r: 16, until: this.simT + 10, by: f.by, power: f.power * 0.8, spread: 4.5, canSpread: f.power > 0.6, bonus: f.bonus });
          if (!this._spreadLog || this.simT - this._spreadLog > 8) { this._spreadLog = this.simT; this.log(f.by, '火勢蔓延！連營皆燃！'); }
        }
      }
    }
    // 冷卻 & 敵 AI 兵法
    this._aiT = (this._aiT || 0) + dt;
    if (this._aiT > 1) { this._aiT = 0; this.enemyAI(); }
    this.checkEnd();
  }

  sideLossRatio(side) {
    const S = this.sides[side]; if (!S.init) return 0;
    const cur = this.squads.filter(s => s.side === side && !s.dead && !s.escaped).reduce((a, s) => a + s.troops, 0);
    return 1 - cur / S.init;
  }
  sideTroops(side) { return this.squads.filter(s => s.side === side && !s.dead && !s.escaped).reduce((a, s) => a + s.troops, 0); }
  sideMorale(side) {
    const l = this.squads.filter(s => s.side === side && !s.dead && !s.escaped);
    const t = l.reduce((a, s) => a + s.troops, 0);
    if (!t) return 0;
    return l.reduce((a, s) => a + Math.max(0, s.morale) * s.troops * (s.routed ? 0 : 1), 0) / t;
  }

  gatePos() { return new V2(0, this.zw + this.sgnAtt * 4.5); }

  chooseTarget(sq) {
    const foes = this.enemiesOf(sq.side).filter(s => this.visibleTarget(s, sq.side));
    if (!foes.length) return null;
    let best = null, bd = 1e9;
    const isArch = sq.type === 'archer';
    for (const f of foes) {
      let d = sq.pos.distanceTo(f.pos);
      if (f.routed) d += 40;
      if (sq.type === 'cav' && f.type === 'archer') d *= 0.7;
      if (sq.type === 'spear' && f.type === 'cav') d *= 0.8;
      if (sq.wallSquad && (f.climbing || f.onWall)) d *= 0.3;
      if (this.siege) {
        // 攻方近戰無雲梯時不能打城上守軍
        if (f.wallSquad && !isArch && sq.side === this.attSide && !this.canClimb(sq)) d += 1e5;
        if (sq.wallSquad && !f.onWall && !this.inRangeOfWall(sq, f)) d += 500;
        if (sq.side === this.defSide && !sq.wallSquad && !isArch && this.outside(f.pos.y) && !this.gate.broken && !sq.sally) d += 400;
      }
      if (d < bd) { bd = d; best = f; }
    }
    if (best && bd > 1e4) return null;
    return best;
  }
  canClimb(sq) { return (sq.type === 'inf' || sq.type === 'spear') && sq.siegeMode !== 'ram' && this.hasWeapon(sq.side, 'ladder'); }
  inRangeOfWall(sq, f) { return sq.pos.distanceTo(f.pos) < this.stats(sq).range + sq.radius + f.radius; }

  moveToward(sq, goal, spd, dt) {
    let g = goal;
    if (this.siege && !sq.onWall) {
      const sOut = this.outside(sq.pos.y), gOut = this.outside(g.y);
      if (sOut !== gOut) {
        const canPass = this.gate.broken || this.gateOpen || (sq.side === this.defSide && sq.sally);
        const front = new V2(0, this.zw + (sOut ? 1 : -1) * this.sgnAtt * 9);
        if (canPass) {
          const inCorr = Math.abs(sq.pos.x) < 5 && Math.abs(sq.pos.y - this.zw) < 10;
          g = inCorr ? new V2(0, this.zw - (sOut ? 1 : -1) * this.sgnAtt * 12) : front;
        } else g = front;
      }
    }
    const d = new V2().subVectors(g, sq.pos);
    const len = d.length();
    if (len < 0.3) return 0;
    const step = Math.min(len, spd * dt);
    // 地形坡度減速
    const h0 = this.ground(sq.pos.x, sq.pos.y), h1 = this.ground(sq.pos.x + d.x / len * 3, sq.pos.y + d.y / len * 3);
    const slow = this.naval ? 1 : clamp(1 - Math.max(0, h1 - h0) / 6, 0.45, 1);
    sq.pos.addScaledVector(d, step * slow / len);
    // 同陣營互斥
    for (const o of this.squads) {
      if (o === sq || o.dead || o.side !== sq.side || o.hidden || o.wallSquad || o.climbing || o.onWall) continue;
      if (this.siege && (sq.siegeMode === 'ram' || o.siegeMode === 'ram') && sq.pos.distanceTo(this.gatePos()) < 40) continue;
      const dd = sq.pos.distanceTo(o.pos), min = (sq.radius + o.radius) * 0.8;
      if (dd < min && dd > 0.01) sq.pos.addScaledVector(new V2().subVectors(sq.pos, o.pos), (min - dd) / dd * 0.25);
    }
    // 城牆阻擋
    if (this.siege && !sq.onWall) {
      const inGate = Math.abs(sq.pos.x) < 5.5 && (sq.side === this.defSide || this.gate.broken);
      const rel = (sq.pos.y - this.zw) * this.sgnAtt;
      const prevOut = this.outside(sq.pos.y - d.y * step / len);
      if (!inGate && Math.abs(rel) < 4.5) sq.pos.y = this.zw + this.sgnAtt * (prevOut ? 4.5 : -4.5);
    }
    sq.yaw = lerpAngle(sq.yaw, Math.atan2(-d.x, -d.y), Math.min(1, dt * 4));
    return len;
  }

  doSquad(sq, dt) {
    const st = this.stats(sq);
    sq.state = 'idle';
    if (sq.confusedUntil > this.simT) { sq.state = 'hold'; this.fightInRange(sq, st, dt, false); return; }
    // 攀城
    if (sq.climbing) {
      sq.climbT += dt; sq.state = 'climb';
      sq.loss += sq.troops * 0.0025 * dt;
      if (sq.climbT > 9) { sq.climbing = false; sq.onWall = true; this.log(sq.side, `${this.sqName(sq)}登上城頭！`); }
      return;
    }
    if (sq.onWall && !sq.wallSquad && !this.squads.some(o => o.side !== sq.side && o.wallSquad && !o.dead && !o.routed)) {
      sq.onWall = false; sq.pos.y = this.zw - this.sgnAtt * 8; this.placeSoldiers(sq);
    }
    if (sq.order === 'move' && sq.moveTo) {
      const l = this.moveToward(sq, sq.moveTo, st.spd, dt);
      sq.state = 'move';
      if (l < 1) { sq.order = 'hold'; sq.moveTo = null; }
      this.fightInRange(sq, st, dt, false);
      return;
    }
    if (sq.order === 'retreat') {
      const l = this.moveToward(sq, sq.home, st.spd * 1.1, dt); sq.state = 'move';
      if (l < 2) { sq.order = 'hold'; if (this.siege && !this.outside(sq.pos.y)) sq.sally = false; }
      return;
    }
    if (sq.moveTo && sq.order === 'auto') { // AI 避火
      const l = this.moveToward(sq, sq.moveTo, st.spd, dt); sq.state = 'move'; if (l < 2) sq.moveTo = null; return;
    }
    if (sq.order === 'hold' || (sq.wallSquad)) {
      this.fightInRange(sq, st, dt, sq.wallSquad);
      if (!sq.engaged) sq.state = sq.wallSquad ? 'hold' : 'hold';
      return;
    }
    // 自動 / 指定目標
    let tgt = sq.target && !sq.target.dead && !sq.target.escaped && this.visibleTarget(sq.target) ? sq.target : null;
    if (!tgt || (sq.order === 'auto' && Math.random() < dt * 0.5)) {
      const t2 = this.chooseTarget(sq);
      if (!tgt || (t2 && t2.pos.distanceTo(sq.pos) < tgt.pos.distanceTo(sq.pos) * 0.6)) tgt = t2;
      if (sq.order === 'attack' && sq.target && !sq.target.dead) tgt = sq.target;
    }
    sq.target = tgt;
    // 攻城：無目標或目標為城牆守軍
    if (this.siege && sq.side === this.attSide && sq.type !== 'archer' && !this.gate.broken && !sq.onWall) {
      const wallT = tgt && tgt.wallSquad;
      if (!tgt || wallT || !this.outside(tgt.pos.y)) {
        if (wallT && this.canClimb(sq)) {
          const base = new V2(clamp(tgt.pos.x + ((sq.id % 3) - 1) * 14, -140, 140), this.zw + this.sgnAtt * 7);
          const l = this.moveToward(sq, base, st.spd, dt); sq.state = 'move';
          if (l < 4 + sq.radius * 0.5) { sq.climbing = true; sq.climbT = 0; this.log(sq.side, `${this.sqName(sq)}架起雲梯攀城！`); }
          return;
        }
        // 撞門：撞門部隊各有一條路線，讓衝車或撞木的前端正好抵住城門
        const gp = this.gatePos();
        if (sq.engine === undefined) this.assignEngine(sq);
        const rammers = this.squads.filter(o => o.side === sq.side && o.siegeMode === 'ram' && !o.dead && !o.routed).sort((a, b) => a.id - b.id);
        const lane = Math.max(0, rammers.indexOf(sq));
        const ramming = sq.siegeMode === 'ram';
        const back = (sq.depth || 6) / 2 + (ramming ? (sq.engine === 'cart' ? 6 : 3.5) : 3);
        const spot = new V2(gp.x + (ramming ? (lane === 0 ? 0 : (lane % 2 ? 5 : -5)) : ((sq.id % 3) - 1) * 9), gp.y + this.sgnAtt * back);
        const l = this.moveToward(sq, spot, st.spd, dt);
        if (l < 3.5) {
          sq.state = 'gate'; sq.engaged = true;
          // 每秒破門量：衝車 40、撞木 18、徒手 4，隨兵力略增
          const em = ramming ? (sq.engine === 'cart' ? 40 : 18) : 4;
          this.gate.hp -= em * (0.4 + sq.troops / 6000) * st.atk * dt;
          if (sq.engineMesh?.userData.log && Math.sin(this.time * 4 + sq.id) > 0.97 && Math.random() < 0.5) SFX.drum(0.35);
          if (Math.random() < dt * 3) SFX.clash(0.12);
          if (Math.random() < dt * 4) this.particlesN.emit(gp.x + rand(-5, 5), rand(1, 4), gp.y, rand(-1, 1), rand(1, 2), rand(-1, 1), 1.5, 4, 0.6, 0.55, 0.45, 0.6, 0, 2);
        } else sq.state = 'move';
        this.fightInRange(sq, st, dt, true);
        return;
      }
    }
    if (!tgt) {
      // 無敵可見：守方原地，其餘朝敵軍方向搜索前進
      if (this.siege && sq.side === this.defSide) { sq.state = 'hold'; return; }
      const foes = this.enemiesOf(sq.side).filter(e => !e.hidden);
      if (foes.length && sq.order === 'auto' && !sq.wallSquad) {
        const c = foes.reduce((a, e) => a.add(e.pos), new V2()).multiplyScalar(1 / foes.length);
        if (c.distanceTo(sq.pos) > 25) { this.moveToward(sq, c, st.spd * 0.7, dt); sq.state = 'move'; return; }
      }
      sq.state = 'idle';
      return;
    }
    const d = sq.pos.distanceTo(tgt.pos);
    const reach = sq.radius + tgt.radius + st.range;
    if (sq.type === 'archer') {
      const close = this.enemiesOf(sq.side).find(e => this.visibleTarget(e) && e.type !== 'archer' && !e.wallSquad && e.pos.distanceTo(sq.pos) < sq.radius + e.radius + 3);
      if (close) { this.melee(sq, close, st, dt, 0.45); return; }
      if (d > reach * 0.92) { this.moveToward(sq, tgt.pos, st.spd, dt); sq.state = 'move'; }
      if (d <= reach) this.shoot(sq, tgt, st, dt);
      return;
    }
    if (d > reach) {
      if (sq.wallSquad) return;
      this.moveToward(sq, tgt.pos, st.spd * (this.charging(sq) ? 1.25 : 1), dt); sq.state = 'move';
      this.fightInRange(sq, st, dt, false);
    } else {
      if (sq.onWall && !tgt.onWall && !tgt.wallSquad) {
        // 城頭清空後下城
        sq.onWall = false; sq.pos.y = this.zw - this.sgnAtt * 8;
      }
      this.melee(sq, tgt, st, dt, 1);
    }
  }
  charging(sq) { return sq.type === 'cav'; }

  fightInRange(sq, st, dt, rangedOnly) {
    const foes = this.enemiesOf(sq.side).filter(e => this.visibleTarget(e, sq.side));
    let best = null, bd = 1e9;
    for (const f of foes) {
      const d = sq.pos.distanceTo(f.pos) - sq.radius - f.radius;
      if (d < bd) { bd = d; best = f; }
    }
    if (!best) return;
    if (sq.type === 'archer' || sq.wallSquad && sq.type === 'archer') {
      if (bd < st.range) this.shoot(sq, best, st, dt);
    } else if (!rangedOnly && bd < st.range) {
      if (this.siege && best.wallSquad && !sq.onWall) return;
      if (this.siege && sq.wallSquad && !best.onWall) return;
      this.melee(sq, best, st, dt, 1);
    } else if (sq.wallSquad && best.onWall && bd < st.range) this.melee(sq, best, st, dt, 1);
  }

  crossWall(a, b) {
    if (!this.siege || this.gate.broken || this.gateOpen) return false;
    if (a.onWall || b.onWall || a.wallSquad || b.wallSquad || a.climbing || b.climbing) return false;
    return this.outside(a.pos.y) !== this.outside(b.pos.y);
  }
  melee(sq, tgt, st, dt, mult) {
    if (this.crossWall(sq, tgt)) return;
    const ts = this.stats(tgt);
    if (!sq._fought) { sq._fought = true; if (sq.general && Math.random() < 0.6) this.barkAt(sq, 'charge'); }
    sq.engaged = true; sq.state = 'fight'; sq.fightWith = tgt;
    tgt.attackers++;
    let m = COUNTER[sq.type][tgt.type] * mult;
    const hd = this.ground(sq.pos.x, sq.pos.y) - this.ground(tgt.pos.x, tgt.pos.y);
    if (hd > 4) m *= 1.25; else if (hd < -4) m *= 0.82;
    const F = FORMATIONS[this.sides[sq.side].formation].mods;
    if (F.flank && tgt.attackers > 1) m *= F.flank;
    if (tgt.attackers > 1) m *= 1.12;
    if (tgt.routed) m *= 1.8;
    if (tgt.wallSquad && sq.onWall) m *= 0.5;
    if (sq.wallSquad && tgt.onWall) m *= 1.4;
    if (this.charging(sq) && this.sides[sq.side].buffs.some(b => b.id === 'charge' && b.until > this.simT)) m *= 1.2;
    const dmg = sq.troops * 0.0105 * st.atk * m / ts.def * dt;
    tgt.loss += dmg; sq.killed += dmg;
    if (!sq.wallSquad) sq.yaw = lerpAngle(sq.yaw, Math.atan2(-(tgt.pos.x - sq.pos.x), -(tgt.pos.y - sq.pos.y)), Math.min(1, dt * 3));
    if (Math.random() < dt * 2.2) SFX.clash(0.06 + Math.random() * 0.08);
    if (Math.random() < dt * 6) {
      const mx = (sq.pos.x + tgt.pos.x) / 2 + rand(-4, 4), mz = (sq.pos.y + tgt.pos.y) / 2 + rand(-4, 4);
      const y = this.ground(mx, mz) + 1.5 + (sq.onWall ? this.wallH : 0);
      for (let i = 0; i < 5; i++) this.particlesAdd.emit(mx, y, mz, rand(-4, 4), rand(1, 5), rand(-4, 4), 0.35, 0.5, 1, 0.85, 0.4, 1, 9);
      this.particlesN.emit(mx, y - 1.2, mz, rand(-1, 1), rand(0.5, 1.5), rand(-1, 1), 2.5, 3, 0.62, 0.55, 0.42, 0.35, 0, 2);
    }
  }

  shoot(sq, tgt, st, dt) {
    sq.engaged = true; sq.state = 'fight'; sq.fightWith = tgt;
    const ts = this.stats(tgt);
    let m = COUNTER.archer[tgt.type];
    if (tgt.wallSquad) m *= 0.5;
    if (tgt.siegeMode === 'ram' && tgt.engine === 'cart' && !this.gate.broken) m *= 0.45;
    if (sq.wallSquad) m *= 1.2;
    if (tgt.climbing) m *= 2.5;
    if (tgt.wallSquad && this.siege && sq.side === this.attSide && this.hasWeapon(sq.side, 'tower')) m *= 1.6;
    const hd = this.ground(sq.pos.x, sq.pos.y) - this.ground(tgt.pos.x, tgt.pos.y) + (sq.wallSquad ? this.wallH : 0);
    if (hd > 5) m *= 1.2;
    const dmg = sq.troops * 0.0085 * st.atk * m / ts.def * dt;
    tgt.loss += dmg; sq.killed += dmg;
    if (!sq.wallSquad) sq.yaw = lerpAngle(sq.yaw, Math.atan2(-(tgt.pos.x - sq.pos.x), -(tgt.pos.y - sq.pos.y)), Math.min(1, dt * 3));
    sq.fireCd -= dt;
    if (sq.fireCd <= 0) {
      sq.fireCd = 1.1 + Math.random() * 0.4;
      this.volleyVisual(sq, tgt, Math.min(14, Math.ceil(sq.soldiers.filter(s => s.alive).length / 3)));
    }
  }

  volleyVisual(sq, tgt, n) {
    const alive = sq.soldiers.filter(s => s.alive), talive = tgt.soldiers.filter(s => s.alive);
    if (!alive.length) return;
    if (Math.random() < 0.3) SFX.whoosh(0.07);
    for (let i = 0; i < n; i++) {
      const a = pick(alive), b = talive.length ? pick(talive) : { x: tgt.pos.x, z: tgt.pos.y, y: this.ground(tgt.pos.x, tgt.pos.y) };
      const from = new THREE.Vector3(a.x, a.y + 1.6, a.z), to = new THREE.Vector3(b.x + rand(-1.5, 1.5), (b.y || 0) + 0.5, b.z + rand(-1.5, 1.5));
      const dist = from.distanceTo(to);
      this.arrows.push({ from, to, t: -Math.random() * 0.25, dur: dist / 50 + 0.35, arc: dist * 0.22 });
    }
  }

  launchBoulder(from, to, dur, onHit) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: 0x6a645a, flatShading: true }));
    m.castShadow = true; this.scene.add(m);
    this.boulders.push({ m, from, to, t: 0, dur, arc: from.distanceTo(to) * 0.35, onHit });
  }

  doRout(sq, dt) {
    sq.state = 'rout';
    const st = this.stats(sq);
    let edge;
    if (this.siege && sq.side === this.defSide) edge = new V2(sq.pos.x * 1.1, this.zw - this.sgnAtt * 260);
    else if (this.siege) edge = new V2(sq.pos.x * 1.2, this.zw + this.sgnAtt * 260);
    else edge = new V2(sq.pos.x * 1.3 + (sq.id % 2 ? 20 : -20), sq.side === 'p' ? 260 : -260);
    if (sq.onWall && sq.wallSquad) { sq.wallSquad = false; sq.onWall = false; sq.pos.y = this.zw - this.sgnAtt * 8; }
    this.moveToward(sq, edge, st.spd * 1.15, dt);
    if (Math.abs(sq.pos.y) > 215 || Math.abs(sq.pos.x) > 240) {
      sq.escaped = true; sq.state = 'escaped';
      this.sides[sq.side].escaped = (this.sides[sq.side].escaped || 0) + sq.troops;
      for (const so of sq.soldiers) so.gone = true;
      this.removeSquadVisual(sq);
    }
  }

  rout(sq) {
    sq.routed = true; sq.target = null; sq.order = 'auto';
    this.log(sq.side === 'p' ? 'e' : 'p', logLine('rout', this.sqName(sq)));
    if (sq.general) this.barkAt(sq, 'rout');
    for (const o of this.squads) if (o.side === sq.side && !o.dead && o !== sq && o.pos.distanceTo(sq.pos) < 50) o.morale -= sq.leader ? 18 : 6;
    if (sq.leader) for (const o of this.squads) if (o.side === sq.side && !o.dead) o.morale -= 10;
  }
  wipeOut(sq) {
    sq.dead = true; sq.troops = 0; sq.state = 'dead';
    this.log(sq.side === 'p' ? 'e' : 'p', logLine('wipe', this.sqName(sq)));
    if (sq.general) {
      const pc = sq.side === 'e' ? (this.pursuing ? 0.55 : 0.4) : 0.25;
      if (Math.random() < pc) {
        (sq.side === 'e' ? this.capturedE : this.capturedP).push(sq.general);
        this.log(sq.side === 'p' ? 'e' : 'p', logLine('capture', gname(sq.general)));
      }
    }
    for (const o of this.squads) if (o.side === sq.side && !o.dead) o.morale -= sq.leader ? 30 : 6;
    if (sq.genModel) tween(800, t => { sq.genModel.rotation.z = t * 1.5; sq.genModel.position.y = -t * 1.2; });
    if (sq.banner) tween(900, t => { sq.banner.rotation.z = -t * 1.4; });
    setTimeout(() => { if (sq.labelObj) { this.scene.remove(sq.labelObj); sq.label.remove(); } }, 1500);
  }

  triggerAmbush(side) {
    const list = this.squads.filter(s => s.side === side && s.hidden && !s.dead);
    if (!list.length) return;
    const revealed = side === 'e' && this.cfg.enemyAmbush?.revealed;
    for (const sq of list) { sq.hidden = false; sq.revealed = true; sq.released = true; sq.state = 'idle'; sq.order = 'auto'; sq.label?.classList.remove('hidden-sq'); if (sq.general) setTimeout(() => this.barkAt(sq, 'ambush'), 300); }
    this.sides[side].buffs.push({ id: 'ambush', atk: 1.5, until: this.simT + 12, filter: s => list.includes(s) });
    const foe = side === 'p' ? 'e' : 'p';
    const marching = this.sides[foe].marching;
    const shock = revealed ? 4 : (marching ? 38 : 22);
    for (const s of this.squads) if (s.side === foe && !s.dead) s.morale -= shock;
    if (marching && !revealed) {
      this.sides[foe].buffs.push({ id: 'disarray', def: 0.72, atk: 0.85, until: this.simT + 25 });
      this.sides[foe].marching = false;
      setTimeout(() => this.log(side, '敵軍行軍隊列被截為數段，首尾不能相顧！'), 600);
    }
    this.log(side, revealed ? '敵軍伏兵現身，但早已被我軍識破！' : (side === 'p' ? '伏兵四起！殺聲震天，敵軍大亂！' : '中伏了！山林中殺出敵軍伏兵！'));
    SFX.drumRoll(8, 0.15); SFX.horn();
    this.rebuildBatches();
    if (side === 'e' && !revealed) this.camShake = 1;
  }

  // ———————————————— 兵法 ————————————————
  canUse(side, id) {
    const S = this.sides[side];
    if (!S.tactics.includes(id)) return false;
    if ((S.cd[id] || 0) > this.simT) return false;
    const mine = this.squads.filter(s => s.side === side && !s.dead && !s.routed && !s.escaped);
    if (id === 'charge') return mine.some(s => s.type === 'cav' && s.released);
    if (id === 'volley') return mine.some(s => s.type === 'archer' && s.released);
    if (id === 'ambush') return this.squads.some(s => s.side === side && s.hidden && !s.dead);
    if (id === 'rockfall') return this.rockfallTargets(side).length > 0;
    if (id === 'fireship') return this.naval;
    if (id === 'water') return !S.usedWater && !!(this.cfg.river || this.cfg.riverMid) && !this.naval;
    if (id === 'firearrow') return mine.some(s => s.type === 'archer' && s.released && s.engaged) && this.weather !== 'rain';
    if (id === 'trap') return this.enemiesOf(side).some(s => s.type === 'cav' && !s.dead);
    if (id === 'confuse') return this.enemiesOf(side).some(s => this.visibleTarget(s, side) && !s.routed);
    if (id === 'raid') return false;
    return true;
  }
  rockfallTargets(side) {
    const foes = this.enemiesOf(side).filter(e => this.visibleTarget(e));
    if (this.siege && side === this.defSide) return foes.filter(f => this.outside(f.pos.y) && Math.abs(f.pos.y - this.zw) < 22 || f.climbing);
    const highs = this.squads.filter(s => s.side === side && !s.dead);
    return foes.filter(f => highs.some(h => this.ground(h.pos.x, h.pos.y) - this.ground(f.pos.x, f.pos.y) > 6 && h.pos.distanceTo(f.pos) < 55));
  }

  useTactic(side, id, target) {
    if (!this.canUse(side, id)) return false;
    const S = this.sides[side], T = TACTICS[id];
    const L = GENERALS[side === 'p' ? this.playerLeader : this.enemyLeader];
    const intF = 1 + ((L?.int || 60) - 70) / 80;
    S.cd[id] = this.simT + T.cd;
    const mine = this.squads.filter(s => s.side === side && !s.dead && !s.routed);
    const who = side === 'p' ? '我軍' : '敵軍';
    switch (id) {
      case 'charge':
        S.buffs.push({ id, atk: 1.5, spd: 1.6, until: this.simT + 8, filter: s => s.type === 'cav' });
        for (const s of mine) if (s.type === 'cav') { s.released = true; s.order = 'auto'; s.hidden = false; if (s.general) this.barkAt(s, 'charge'); }
        SFX.drumRoll(6, 0.12);
        break;
      case 'volley':
        for (const s of mine) if (s.type === 'archer' && s.released) {
          const t = s.target && !s.target.dead ? s.target : this.chooseTarget(s);
          if (!t) continue;
          t.loss += s.troops * 0.06 * intF; t.morale -= 8;
          this.volleyVisual(s, t, 40);
        }
        SFX.whoosh(0.3);
        break;
      case 'fire': {
        let t = target;
        if (!t) {
          const foes = this.enemiesOf(side).filter(e => this.visibleTarget(e));
          t = foes.sort((a, b) => (this.forestAt(b.pos.x, b.pos.y) + this.campAt(b.pos.x, b.pos.y)) - (this.forestAt(a.pos.x, a.pos.y) + this.campAt(a.pos.x, a.pos.y)))[0];
        }
        if (!t) return false;
        const bonus = (side === 'p' && this.cfg.fireBonus === 'p') || (side === 'e' && this.cfg.fireBonus === 'e') ? 1.2 : 0;
        this.fires.push({ pos: t.pos.clone(), r: 20, until: this.simT + 13, by: side, power: intF, spread: 3, canSpread: true, bonus });
        SFX.fireSound(0.5);
        break;
      }
      case 'ambush': this.triggerAmbush(side); break;
      case 'feint': {
        const foe = side === 'p' ? 'e' : 'p';
        S.buffs.push({ id, atk: 1.3, until: this.simT + 12 });
        this.sides[foe].buffs.push({ id: 'feinted', def: 0.8, until: this.simT + 12 });
        for (const s of this.squads) if (s.side === foe && !s.dead && !s.wallSquad) { s.released = true; s.order = 'auto'; }
        break;
      }
      case 'drum':
        for (const s of mine) s.morale = Math.min(110, s.morale + 22 * intF);
        const ld = mine.find(s => s.leader) || mine[0]; if (ld) this.barkAt(ld, 'rally');
        SFX.drumRoll(10, 0.2);
        break;
      case 'fireship': {
        const mine2 = this.squads.filter(s => s.side === side && !s.dead);
        const front = mine2.reduce((a, s) => a.add(s.pos), new V2()).multiplyScalar(1 / Math.max(1, mine2.length));
        const foes = this.enemiesOf(side).filter(e => this.visibleTarget(e));
        for (let i = 0; i < 5; i++) {
          const m = makeShip(10, 5, 0x6a4a2a);
          m.scale.setScalar(0.7);
          this.scene.add(m);
          const pos = new V2(front.x + (i - 2) * 16, front.y + (side === 'p' ? -18 : 18));
          this.boats.push({ mesh: m, pos, target: foes[i % Math.max(1, foes.length)], by: side, power: intF, done: false });
        }
        SFX.fireSound(0.4);
        break;
      }
      case 'shield':
        S.buffs.push({ id, def: 1.6, until: this.simT + 10 });
        break;
      case 'firearrow': {
        for (const s of mine) if (s.type === 'archer' && s.released) {
          const t = s.target && !s.target.dead ? s.target : this.chooseTarget(s); if (!t) continue;
          t.loss += s.troops * 0.03 * intF; t.morale -= 6; this.volleyVisual(s, t, 30);
          this.fires.push({ pos: t.pos.clone(), r: 12, until: this.simT + 8, by: side, power: 0.6 * intF, spread: 4, canSpread: this.forestAt(t.pos.x, t.pos.y) > 0.4 });
        }
        SFX.fireSound(0.3);
        break;
      }
      case 'trap': {
        const foe = side === 'p' ? 'e' : 'p';
        this.sides[foe].buffs.push({ id: 'trapped', spd: 0.5, def: 0.8, until: this.simT + 15, filter: s => s.type === 'cav' });
        for (const s of this.enemiesOf(side)) if (s.type === 'cav') { s.loss += s.troops * 0.04; s.morale -= 8; }
        break;
      }
      case 'decoy': {
        const foe = side === 'p' ? 'e' : 'p';
        this.sides[foe].buffs.push({ id: 'decoyed', atk: 0.85, until: this.simT + 12 });
        for (const s of this.enemiesOf(side)) s.morale -= 12 * intF;
        if (!this._decoyBanners) {
          this._decoyBanners = true;
          const an = this.anchor(side), F = FACTIONS[side === 'p' ? this.pf : this.ef];
          for (let i = 0; i < 10; i++) { const b = makeBanner(F.name, F.css, 8, 2); const x = an.x + (i - 4.5) * 14, z = an.y + (side === 'p' ? 40 : -40); b.position.set(x, this.ground(x, z), z); this.scene.add(b); (this.decoBanners ||= []).push(b); }
        }
        break;
      }
      case 'water': {
        S.usedWater = true;
        this.doFlood(side === 'p' ? 'e' : 'p', 0.85);
        break;
      }
      case 'confuse': {
        const foes = this.enemiesOf(side).filter(e => this.visibleTarget(e, side) && !e.routed).sort((a, b) => b.troops - a.troops);
        const t = target || foes[0]; if (!t) return false;
        const resist = (GENERALS[t.general]?.int || 50) / 200;
        if (Math.random() < 0.85 - resist) { t.confusedUntil = this.simT + 6 + intF * 4; t.morale -= 10; this.barkAt(t, 'rout', '……軍中有變？！'); this.log(side, `${this.sqName(t)}中了擾亂之計，陷入混亂！`); }
        else this.log(side === 'p' ? 'e' : 'p', `${this.sqName(t)}識破了擾亂之計！`);
        break;
      }
      case 'encircle': {
        S.buffs.push({ id, atk: 1.25, until: this.simT + 12 });
        for (const s of this.enemiesOf(side)) if (s.attackers > 0) s.morale -= 10;
        break;
      }
      case 'medic': {
        for (const s of mine) { const heal = Math.min(s.max - s.troops, s.max * 0.07 * intF); s.troops += heal; s.morale = Math.min(110, s.morale + 6); }
        break;
      }
      case 'rockfall': {
        const tg = this.rockfallTargets(side);
        const oil = this.siege && side === this.defSide && this.hasWeapon(side, 'oil');
        for (const t of tg) {
          t.loss += (t.troops * 0.09 * intF + 40) * (oil ? 1.6 : 1); t.morale -= 12;
          if (oil && t.engine === 'cart' && t.pos.distanceTo(this.gatePos()) < 30) { t.engine = 'log'; this.removeEngine(t); this.log(side, `火油傾瀉而下，${this.sqName(t)}的衝車被焚毀！`); this.fires.push({ pos: t.pos.clone(), r: 10, until: this.simT + 6, by: side, power: 0.6, spread: 9, canSpread: false }); }
          if (t.climbing) { t.climbing = false; t.climbT = 0; }
          for (let i = 0; i < 4; i++) {
            const from = new THREE.Vector3(t.pos.x + rand(-8, 8), (this.siege ? this.wallH + 3 : this.ground(t.pos.x, t.pos.y) + 25), this.siege ? this.zw : t.pos.y + rand(-20, 20));
            this.launchBoulder(from, new THREE.Vector3(t.pos.x + rand(-6, 6), this.ground(t.pos.x, t.pos.y), t.pos.y + rand(-5, 5)), 1 + Math.random() * 0.5, null);
          }
        }
        break;
      }
    }
    this.log(side, `${who}施展【${T.name}】！`);
    if (side === 'p') this.refreshTacticBtns();
    return true;
  }

  enemyAI() {
    const S = this.sides.e;
    if (this.cfg.noEnemyTactics) return;
    const morale = this.sideMorale('e');
    const tryUse = (id, p) => { if (S.tactics.includes(id) && this.canUse('e', id) && Math.random() < p) this.useTactic('e', id); };
    if (morale < 55) tryUse('drum', 0.4);
    if (this.squads.some(s => s.side === 'e' && s.type === 'archer' && s.engaged)) tryUse('volley', 0.2);
    if (this.squads.some(s => s.side === 'e' && s.type === 'cav' && s.released && !s.dead && this.enemiesOf('e').some(p => p.pos.distanceTo(s.pos) < 70))) tryUse('charge', 0.2);
    const pin = this.enemiesOf('e').some(p => this.forestAt(p.pos.x, p.pos.y) + this.campAt(p.pos.x, p.pos.y) > 0.4);
    if (this.simT > 12) tryUse('fire', pin ? 0.3 : 0.05);
    if (this.squads.filter(s => s.side === 'e' && s.engaged).length >= 2) tryUse('shield', 0.15);
    tryUse('rockfall', 0.35);
    if (this.simT > 10) { tryUse('decoy', 0.06); tryUse('trap', this.enemiesOf('e').some(s => s.type === 'cav' && s.state === 'move') ? 0.25 : 0); tryUse('firearrow', 0.12); tryUse('encircle', 0.05); }
    if (this.sideLossRatio('e') > 0.35) tryUse('medic', 0.2);
    if (this.simT > 35) tryUse('fireship', 0.2);
    if (this.simT > 20) tryUse('feint', 0.03);
  }

  // ———————————————— 視覺 ————————————————
  updateVisuals(rdt, sdt) {
    for (const sq of this.squads) sq._hideV = (sq.hidden && sq.side === 'e' && !sq.revealed && !this.cfg.enemyAmbush?.revealed) || (sq.side === 'e' && this.phase === 'fight' && !this.visibleTo('p', sq));
    this.updateNaval(rdt);
    this.updateWeather(rdt);
    this.updateSiegeGear(rdt);
    const dummy = this._d || (this._d = new THREE.Object3D());
    const t = this.time;
    for (const sq of this.squads) sq._spd = this.stats(sq).spd;
    if (sdt > 0) { this.separate(); if ((this._pairT = (this._pairT || 0) - sdt) <= 0) { this._pairT = 0.4; this.pairAll(); } }
    const R = this._R || (this._R = new THREE.Matrix4()), PM = this._PM || (this._PM = new THREE.Matrix4());
    const Qt = this._Q || (this._Q = new THREE.Quaternion()), Eu = this._E || (this._E = new THREE.Euler()), V3 = this._V3 || (this._V3 = new THREE.Vector3());
    const SC = new THREE.Vector3(1.25, 1.25, 1.25), ONE = new THREE.Vector3(1, 1, 1), ZERO = this._Z || (this._Z = new THREE.Matrix4().makeScale(0, 0, 0));
    const pose = this._pose || (this._pose = { aR: [0, 0, 0], aL: [0, 0, 0], h: [0, 0, 0, 0] });
    for (const [key, b] of Object.entries(this.batches)) {
      const n = Math.min(900, b.list.length);
      for (let i = 0; i < n; i++) {
        const so = b.list[i], sq = so.sq;
        if (so.gone || sq._hideV) { for (const p of b.parts) for (const m of p.meshes) m.setMatrixAt(i, ZERO); continue; }
        this.updateSoldier(so, sq, sdt, rdt);
        const p = poseAngles(b.kind === 'cav' ? 'cav' : b.kind, so.alive ? so.act : 'idle', so.wph, so.at, b.mounted, pose);
        const fwx = -Math.sin(so.yaw), fwz = -Math.cos(so.yaw), lg = so.alive ? p.lunge * 1.25 : 0;
        Eu.set(so.alive ? p.lean : so.fall, so.yaw, 0, 'YXZ'); Qt.setFromEuler(Eu);
        R.compose(V3.set(so.x + fwx * lg, so.y + (b.mounted || !so.alive ? 0 : p.bob), so.z + fwz * lg), Qt, SC);
        for (const part of b.parts) {
          let ax = 0, ay = 0, az = 0, yo = part.rider && b.mounted ? p.bob : 0;
          if (so.alive) {
            if (part.name === 'armR') { ax = p.aR[0]; ay = p.aR[1]; az = p.aR[2]; }
            else if (part.name === 'armL') { ax = p.aL[0]; ay = p.aL[1]; az = p.aL[2]; }
            else if (part.name === 'legL') ax = p.lL;
            else if (part.name === 'legR') ax = p.lR;
            else if (part.idx != null) ax = p.h[part.idx];
          } else if (part.name === 'armR' || part.name === 'armL') ax = 0.9;
          Eu.set(ax, ay, az, 'XYZ'); Qt.setFromEuler(Eu);
          PM.compose(V3.set(part.pivot.x, part.pivot.y + yo, part.pivot.z), Qt, ONE).premultiply(R);
          for (const m of part.meshes) m.setMatrixAt(i, PM);
        }
      }
      for (const part of b.parts) for (const m of part.meshes) m.instanceMatrix.needsUpdate = true;
    }
    // 殺傷對應的士兵死亡
    for (const sq of this.squads) {
      if (!sq.soldiers.length) continue;
      const want = sq.dead ? 0 : Math.ceil(sq.troops / this.perSoldier);
      let alive = sq.soldiers.filter(s => s.alive);
      while (alive.length > Math.max(want, 0)) {
        let k;
        if (sq.fightWith && !sq.fightWith.dead) {
          const fx = sq.fightWith.pos.x, fz = sq.fightWith.pos.y;
          alive.sort((a, b) => ((a.x - fx) ** 2 + (a.z - fz) ** 2) - ((b.x - fx) ** 2 + (b.z - fz) ** 2));
          k = alive[Math.floor(Math.random() * Math.min(alive.length, 6))];
        } else k = pick(alive);
        k.alive = false; k.deadT = 0; k.fall = 0;
        alive = alive.filter(s => s !== k);
      }
      // 群組（將軍、旗）
      if (sq.group && !sq.escaped) {
        const visible = !sq._hideV;
        sq.group.visible = visible;
        const c = Math.cos(sq.yaw), s = Math.sin(sq.yaw);
        const back = (sq.depth || 4) / 2 + 2.5;
        const gx = sq.pos.x + s * back * (sq.wallSquad ? 0 : 1), gz = sq.pos.y + c * back * (sq.wallSquad ? 0 : 1) + (sq.wallSquad ? -this.sgnAtt * 2 : 0);
        const gy = this.ground(gx, gz) + (sq.onWall || sq.wallSquad ? this.wallH + 0.3 : 0);
        if (!sq.dead && !this._parleyLock) { sq.group.position.lerp(new THREE.Vector3(gx, gy, gz), Math.min(1, rdt * 4)); sq.group.rotation.y = sq.yaw; }
        if (sq.genModel && !sq.dead && !this._parleyLock) {
          const ga = sq.routed ? 'rout' : sq.state === 'move' || sq.state === 'climb' ? 'run' : sq.state === 'fight' ? (sq.type === 'archer' ? 'shoot' : 'fight') : 'idle';
          sq._gph = (sq._gph || 0) + rdt * (ga === 'run' || ga === 'rout' ? 9 : 0) * (this.paused ? 0 : this.speed);
          animateHero(sq.genModel, ga, sq._gph, t * 0.9 + sq.id * 0.37);
        }
        if (sq.banner) waveBanner(sq.banner, t);
        if (sq.banner2) waveBanner(sq.banner2, t);
        sq.hit.position.set(sq.pos.x, this.ground(sq.pos.x, sq.pos.y) + 2 + (sq.wallSquad ? this.wallH : 0), sq.pos.y);
        sq.hit.scale.set(sq.radius + 2, 1, sq.radius + 2);
        if (sq.labelObj && !sq.dead) {
          sq.labelObj.position.set(gx, gy + (sq.leader ? 13 : 10), gz);
          sq.labelObj.visible = visible;
          const sb = sq._sb || (sq._sb = sq.label.querySelector('.sb > div')), sm = sq._sm || (sq._sm = sq.label.querySelector('.sm > div'));
          sb.style.width = (sq.troops / sq.max * 100) + '%';
          sm.style.width = clamp(sq.morale, 0, 100) + '%';
          sq.label.querySelector('.st').textContent = ' ' + fmt(sq.troops);
          sq.label.classList.toggle('sel', sq === this.selected);
          sq.label.classList.toggle('hidden-sq', sq.hidden);
        }
        // 騎兵揚塵
        if (sq.type === 'cav' && (sq.state === 'move' || sq.state === 'rout') && sdt > 0 && Math.random() < 0.6) {
          const so = pick(sq.soldiers);
          if (so && so.alive) this.particlesN.emit(so.x, so.y + 0.3, so.z, rand(-1, 1), rand(0.5, 1.5), rand(-1, 1), 2.5, 3, 0.7, 0.62, 0.48, 0.35, 0, 2.5);
        }
      }
    }
    for (const b of this.decoBanners || []) waveBanner(b, t);
    // 箭矢
    const am = this.arrowMesh; let ai = 0;
    const tmpV = new THREE.Vector3(), nx = new THREE.Vector3();
    this.arrows = this.arrows.filter(a => {
      a.t += sdt;
      if (a.t > a.dur) return false;
      if (a.t < 0) return true;
      const u = a.t / a.dur;
      tmpV.lerpVectors(a.from, a.to, u); tmpV.y += Math.sin(u * Math.PI) * a.arc;
      const u2 = Math.min(1, u + 0.02);
      nx.lerpVectors(a.from, a.to, u2); nx.y += Math.sin(u2 * Math.PI) * a.arc;
      if (ai < 1500) { dummy.position.copy(tmpV); dummy.scale.setScalar(1); dummy.lookAt(nx); dummy.updateMatrix(); am.setMatrixAt(ai++, dummy.matrix); }
      return true;
    });
    am.count = ai; am.instanceMatrix.needsUpdate = true;
    // 投石
    this.boulders = this.boulders.filter(b => {
      b.t += sdt;
      const u = Math.min(1, b.t / b.dur);
      b.m.position.lerpVectors(b.from, b.to, u); b.m.position.y += Math.sin(u * Math.PI) * b.arc * (b.from.y > b.to.y + 10 ? 0.15 : 1);
      b.m.rotation.x += sdt * 5;
      if (u >= 1) {
        this.scene.remove(b.m);
        for (let i = 0; i < 18; i++) this.particlesN.emit(b.to.x, b.to.y + 1, b.to.z, rand(-5, 5), rand(2, 7), rand(-5, 5), rand(1.5, 3), rand(3, 6), 0.55, 0.5, 0.42, 0.7, 4, 2);
        SFX.drum(0.5);
        b.onHit && b.onHit();
        return false;
      }
      return true;
    });
    // 火焰
    let li = 0;
    for (const f of this.fires) {
      if (f.until < this.simT) continue;
      const k = sdt > 0 ? 14 : 3;
      for (let i = 0; i < k; i++) {
        const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * f.r;
        const x = f.pos.x + Math.cos(a) * r, z = f.pos.y + Math.sin(a) * r, y = this.ground(x, z);
        this.particlesAdd.emit(x, y + rand(0, 2), z, rand(-0.5, 0.5), rand(3, 8), rand(-0.5, 0.5), rand(0.6, 1.3), rand(2.5, 5.5), 1, rand(0.35, 0.6), 0.1, 0.9, -2, -2);
        if (Math.random() < 0.12) this.particlesN.emit(x, y + 5, z, rand(-1, 1), rand(3, 6), rand(-1, 1), rand(2.5, 4), rand(4, 7), 0.2, 0.18, 0.17, 0.28, -0.3, 3);
      }
      if (li < 3) { const L = this.fireLights[li++]; L.position.set(f.pos.x, this.ground(f.pos.x, f.pos.y) + 8, f.pos.y); L.intensity = 900 + Math.random() * 500; L.distance = 90; }
    }
    for (; li < 3; li++) this.fireLights[li].intensity = 0;
    this.particlesAdd.update(sdt || rdt * 0.2);
    this.particlesN.update(sdt || rdt * 0.2);
    // 選取
    if (this.selected && !this.selected.dead && !this.selected.escaped) {
      const s = this.selected; this.selRing.visible = true;
      this.selRing.position.set(s.pos.x, this.ground(s.pos.x, s.pos.y) + 0.5 + (s.onWall || s.wallSquad ? this.wallH : 0), s.pos.y);
      this.selRing.scale.setScalar(s.radius + 2);
    } else this.selRing.visible = false;
    if (this.moveMarker.visible) { this.moveMarker.material.opacity -= rdt; if (this.moveMarker.material.opacity <= 0) this.moveMarker.visible = false; }
    if (this.camShake > 0) { this.camShake -= rdt; this.camera.position.x += Math.sin(t * 60) * this.camShake * 0.6; }
  }

  updateNaval(rdt) {
    if (!this.naval && !this.boats.length) return;
    const t = this.time;
    for (const sq of this.squads) {
      if (!sq.ship) continue;
      if (sq.escaped) { this.scene.remove(sq.ship); sq.ship = null; continue; }
      const p = sq.pos;
      sq.ship.position.set(p.x, sq.dead ? Math.max(-6, sq.ship.position.y - rdt * 0.8) : Math.sin(t * 1.3 + sq.id) * 0.15, p.y);
      sq.ship.rotation.y = sq.yaw;
      sq.ship.rotation.z = Math.sin(t * 0.9 + sq.id) * 0.03 + (sq.dead ? 0.25 : 0);
      sq.ship.visible = !sq._hideV;
    }
    for (const b of this.boats) {
      if (!b.mesh) continue;
      if (b.done) { this.scene.remove(b.mesh); b.mesh = null; continue; }
      b.mesh.position.set(b.pos.x, 0.1, b.pos.y);
      if (b.target) b.mesh.rotation.y = Math.atan2(-(b.target.pos.x - b.pos.x), -(b.target.pos.y - b.pos.y));
      for (let i = 0; i < 4; i++) this.particlesAdd.emit(b.pos.x + rand(-2, 2), rand(1, 4), b.pos.y + rand(-4, 4), rand(-0.5, 0.5), rand(3, 7), rand(-0.5, 0.5), rand(0.6, 1.1), rand(2.5, 4.5), 1, rand(0.35, 0.6), 0.1, 0.9, -2, -2);
    }
    // 連環船：鐵索
    for (const side of ['p', 'e']) {
      if (!this.sides[side]?.chained) continue;
      const ships = this.squads.filter(s => s.side === side && s.ship && !s.dead);
      if (!this._chain) this._chain = {};
      let line = this._chain[side];
      if (!line) { line = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x222222 })); this.scene.add(line); this._chain[side] = line; }
      const pts = [];
      for (let i = 0; i < ships.length; i++) for (let j = i + 1; j < ships.length; j++) {
        if (ships[i].pos.distanceTo(ships[j].pos) < 45) { const a = ships[i].pos, b = ships[j].pos; pts.push(a.x, 1.6, a.y, b.x, 1.6, b.y, a.x, 2.2, a.y, b.x, 2.2, b.y); }
      }
      line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    }
  }
  updateWeather(rdt) {
    if (this.weather !== 'rain' && this.weather !== 'snow') return;
    if (!this.rain) {
      const n = Q().grass > 3000 ? 3000 : 1200, snow = this.weather === 'snow';
      const g = new THREE.BufferGeometry(); const arr = new Float32Array(n * 6);
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.rain = { n, arr, g, snow, seeds: Array.from({ length: n }, () => [rand(-80, 80), rand(0, 60), rand(-80, 80)]) };
      const m = snow ? new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 }) : new THREE.LineBasicMaterial({ color: 0xaab4c8, transparent: true, opacity: 0.5 });
      this.rain.obj = snow ? new THREE.Points(g, m) : new THREE.LineSegments(g, m);
      this.rain.obj.frustumCulled = false;
      this.scene.add(this.rain.obj);
    }
    const R = this.rain, c = this.controls.target;
    const fall = R.snow ? 4 : 60;
    for (let i = 0; i < R.n; i++) {
      const s = R.seeds[i];
      s[1] -= fall * rdt; if (R.snow) { s[0] += Math.sin(this.time + i) * rdt; }
      if (s[1] < 0) { s[1] = 60; s[0] = rand(-80, 80); s[2] = rand(-80, 80); }
      const x = c.x + s[0], y = c.y + s[1], z = c.z + s[2];
      R.arr.set([x, y, z, x - (this.wind ? this.wind.x : 0.3), y + (R.snow ? 0.01 : 1.6), z - (this.wind ? this.wind.y : 0)], i * 6);
    }
    R.g.attributes.position.needsUpdate = true;
  }
  // —— 攻城器具 ——
  assignEngine(sq) {
    if (!(sq.type === 'inf' || sq.type === 'spear')) { sq.engine = null; return; }
    this._carts = this._carts || {};
    const n = this._carts[sq.side] || 0;
    if (this.hasWeapon(sq.side, 'ram') && n < 2) { this._carts[sq.side] = n + 1; sq.engine = 'cart'; } else sq.engine = 'log';
  }
  // 開戰時分配攻城任務：有衝車的部隊撞門，其餘部隊架雲梯攀城
  assignSiegeRoles() {
    if (!this.siege) return;
    const list = this.squads.filter(s => s.side === this.attSide && (s.type === 'inf' || s.type === 'spear') && !s.dead).sort((a, b) => b.troops - a.troops);
    const rams = 2;
    list.forEach((s, i) => {
      if (s.siegeMode) return;
      s.siegeMode = i < rams ? 'ram' : 'climb';
      if (s.siegeMode === 'ram') this.assignEngine(s);
    });
  }
  removeEngine(sq) { if (sq.engineMesh) { this.scene.remove(sq.engineMesh); sq.engineMesh = null; } }
  updateSiegeGear(rdt) {
    if (!this.siege) return;
    const gp = this.gatePos();
    for (const sq of this.squads) {
      // 撞門器具：攻方步兵、槍兵在城門未破前推著衝車或扛著撞木
      if (sq.side === this.attSide && sq.siegeMode === 'ram' && !this.gate.broken && !sq.dead && !sq.routed && !sq.escaped && !sq.onWall && !sq.climbing && this.phase !== 'setup') {
        if (sq.engine === undefined) this.assignEngine(sq);
        if (sq.engine && !sq.engineMesh) { sq.engineMesh = sq.engine === 'cart' ? makeRamCart() : makeLogRam(); sq.engineMesh.traverse(o => { if (o.isMesh) o.castShadow = true; }); this.scene.add(sq.engineMesh); }
        if (sq.engineMesh) {
          const fx = -Math.sin(sq.yaw), fz = -Math.cos(sq.yaw), off = (sq.depth || 6) / 2 + (sq.engine === 'cart' ? 4.5 : 2.2);
          const x = sq.pos.x + fx * off, z = sq.pos.y + fz * off;
          const m = sq.engineMesh;
          m.position.lerp(new THREE.Vector3(x, this.ground(x, z), z), Math.min(1, rdt * 3));
          m.rotation.y = sq.yaw;
          const log = m.userData.log;
          if (log) log.position.z = sq.state === 'gate' ? Math.sin(this.time * 4 + sq.id) * 0.9 : 0;
          if (sq.state === 'gate' && Math.sin(this.time * 4 + sq.id) > 0.95 && Math.random() < 0.3) for (let i = 0; i < 6; i++) this.particlesN.emit(gp.x + rand(-4, 4), rand(1, 5), gp.y, rand(-2, 2), rand(1, 3), rand(-1, 1), 1.5, 3.5, 0.55, 0.5, 0.42, 0.6, 0, 2);
        }
      } else if (sq.engineMesh) this.removeEngine(sq);
      // 雲梯
      const climbing = (sq.climbing || (sq.onWall && !sq.wallSquad)) && !sq.dead;
      if (climbing && !sq.ladders) {
        sq.ladders = [-5, 0, 5].map(dx => { const l = makeLadder(this.wallH + 1.6); this.scene.add(l); return { l, dx }; });
      }
      if (sq.ladders) {
        if (!climbing) { sq.ladders.forEach(o => this.scene.remove(o.l)); sq.ladders = null; }
        else for (const o of sq.ladders) {
          const x = sq.pos.x + o.dx, z = this.zw + this.sgnAtt * 6.2;
          o.l.position.set(x, this.ground(x, z), z); o.l.rotation.set(-this.sgnAtt * 0.24, 0, 0);
        }
      }
      // 井闌
      if (sq.side === this.attSide && sq.type === 'archer' && this.hasWeapon(sq.side, 'tower') && !sq.dead && !sq.escaped) {
        if (!sq.towerMesh) { sq.towerMesh = makeSiegeTower(this.wallH + 2); this.scene.add(sq.towerMesh); }
        const fx = -Math.sin(sq.yaw), fz = -Math.cos(sq.yaw), off = (sq.depth || 6) / 2 + 4;
        const x = sq.pos.x + fx * off, z = sq.pos.y + fz * off;
        sq.towerMesh.position.lerp(new THREE.Vector3(x, this.ground(x, z), z), Math.min(1, rdt * 2)); sq.towerMesh.rotation.y = sq.yaw;
      } else if (sq.towerMesh && (sq.dead || sq.escaped)) { this.scene.remove(sq.towerMesh); sq.towerMesh = null; }
    }
    // 守軍出城時城門開啟
    const open = !this.gate.broken && this.squads.some(s => s.side === this.defSide && s.sally && !s.dead && Math.abs(s.pos.x) < 14 && Math.abs(s.pos.y - this.zw) < 18);
    if (open !== this.gateOpen) {
      this.gateOpen = open;
      const gm = this.gate.mesh, h0 = (this.wallH - 1) / 2;
      tween(500, t => { gm.position.y = open ? h0 + t * (this.wallH - 2) : (this.wallH - 2) * (1 - t) + h0; });
      this.log(this.defSide, open ? '城門大開，守軍出城突擊！' : '城門關閉！');
    }
  }
  canClimbFor(sq) { return this.canClimb(sq) && this.squads.some(o => o.side !== sq.side && o.wallSquad && !o.dead) && sq.target?.wallSquad; }

  // 士兵之間的推擠（空間雜湊）
  separate() {
    const cell = 2, H = new Map();
    for (const b of Object.values(this.batches)) for (const so of b.list) {
      if (!so.alive || so.gone || so.sq.onWall || so.sq.wallSquad) continue;
      const k = Math.floor(so.x / cell) * 73856093 ^ Math.floor(so.z / cell) * 19349663;
      let arr = H.get(k); if (!arr) H.set(k, arr = []); arr.push(so);
    }
    for (const arr of H.values()) {
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], c = arr[j];
        const min = (a.sq.type === 'cav' || c.sq.type === 'cav') ? 1.5 : 0.85;
        const dx = c.x - a.x, dz = c.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-6) { const d = Math.sqrt(d2), push = (min - d) * 0.5 / d; a.x -= dx * push; a.z -= dz * push; c.x += dx * push; c.z += dz * push; }
      }
    }
  }
  // 前排士兵一對一配對敵兵
  pairAll() {
    for (const sq of this.squads) {
      for (const so of sq.soldiers) if (so.foe && (!so.foe.alive || so.foe.sq !== sq.fightWith)) so.foe = null;
      const T = sq.fightWith;
      if (sq.wallSquad || !sq.engaged || !T || T.dead || sq.state !== 'fight' || (sq.type === 'archer' && !this.archerMelee(sq))) continue;
      const rx = Math.cos(sq.yaw), rz = -Math.sin(sq.yaw);
      const front = sq.soldiers.filter(so => so.alive && so.row < (sq.type === 'cav' ? 3 : 2));
      if (!front.length) continue;
      const foes = T.soldiers.filter(so => so.alive);
      if (!foes.length) continue;
      foes.sort((a, b) => ((a.x - sq.pos.x) ** 2 + (a.z - sq.pos.y) ** 2) - ((b.x - sq.pos.x) ** 2 + (b.z - sq.pos.y) ** 2));
      const near = foes.slice(0, Math.max(front.length, Math.ceil(foes.length * 0.5)));
      const lat = (o) => o.x * rx + o.z * rz;
      front.sort((a, b) => lat(a) - lat(b)); near.sort((a, b) => lat(a) - lat(b));
      front.forEach((so, i) => { so.foe = near[Math.min(near.length - 1, Math.floor(i * near.length / front.length))]; });
    }
  }
  archerMelee(sq) { if (sq.wallSquad) return false; return this.enemiesOf(sq.side).some(e => this.visibleTarget(e) && e.type !== 'archer' && !e.wallSquad && e.pos.distanceTo(sq.pos) < sq.radius + e.radius + 3); }

  updateSoldier(so, sq, dt, rdt) {
    if (!so.alive) {
      so.deadT += dt;
      so.fall = Math.min(1, so.deadT / 0.5) * 1.5;
      const gy = this.ground(so.x, so.z) + (sq.onWall || sq.wallSquad ? this.wallH : 0);
      so.y = gy + 0.12 - Math.max(0, so.deadT - 9) * 0.25;
      if (so.deadT > 13) so.gone = true;
      so.act = 'dead';
      return;
    }
    const c = Math.cos(sq.yaw), s = Math.sin(sq.yaw);
    let tx = sq.pos.x + c * so.lx + s * so.lz + so.jx, tz = sq.pos.y - s * so.lx + c * so.lz + so.jz;
    const base = sq._spd || 7;
    let face = sq.yaw, act = 'idle', faceLock = false;
    const melee = !sq.wallSquad && sq.engaged && sq.fightWith && !sq.fightWith.dead && sq.state === 'fight' && (sq.type !== 'archer' || this.archerMelee(sq));
    const shooting = sq.engaged && sq.state === 'fight' && sq.type === 'archer' && !melee;
    if (sq.routed) {
      tx += Math.cos(so.ph) * 5; tz += Math.sin(so.ph) * 5;
    } else if (melee) {
      const T = sq.fightWith;
      const dx = T.pos.x - sq.pos.x, dz = T.pos.y - sq.pos.y, d = Math.hypot(dx, dz) || 1;
      const push = Math.max(0, d - (sq.radius + T.radius) * 0.62);
      if (so.foe && so.foe.alive) {
        const f = so.foe, fx = so.x - f.x, fz = so.z - f.z, fd = Math.hypot(fx, fz) || 1;
        const gap = sq.type === 'cav' ? 2.1 : 1.15;
        tx = f.x + fx / fd * gap; tz = f.z + fz / fd * gap;
        face = Math.atan2(-(f.x - so.x), -(f.z - so.z)); faceLock = true;
        if (fd < gap + 1.6) act = 'fight';
      } else {
        tx += dx / d * push * 0.9; tz += dz / d * push * 0.9;
        face = Math.atan2(-dx, -dz);
      }
    } else if (shooting) {
      const T = sq.fightWith;
      if (T) { face = Math.atan2(-(T.pos.x - so.x), -(T.pos.y - so.z)); faceLock = true; }
      act = 'shoot';
    }
    if (sq.climbing) { const prog = clamp(sq.climbT / 9, 0, 1); tz = this.zw + this.sgnAtt * (4.5 - prog * 2); }
    if (sq.onWall && !sq.wallSquad) tz = this.zw + so.lz * 0.15;
    if (dt > 0) {
      // 轉向與加減速（不再瞬間移動）
      const dx = tx - so.x, dz = tz - so.z, dd = Math.hypot(dx, dz);
      const maxSpd = base * (sq.routed ? 1.3 : dd > 4 ? 1.3 : 1.05);
      const want = dd < 0.08 ? 0 : Math.min(maxSpd, dd * 2.2);
      const wvx = dd > 0 ? dx / dd * want : 0, wvz = dd > 0 ? dz / dd * want : 0;
      const acc = (sq.type === 'cav' ? 11 : 16) * dt;
      let ax = wvx - so.vx, az = wvz - so.vz; const al = Math.hypot(ax, az);
      if (al > acc) { ax *= acc / al; az *= acc / al; }
      so.vx += ax; so.vz += az;
      so.x += so.vx * dt; so.z += so.vz * dt;
      const spd = Math.hypot(so.vx, so.vz);
      if (spd > 0.5 && act !== 'fight' && act !== 'shoot') {
        act = sq.routed || spd > base * 1.1 ? (sq.routed ? 'rout' : 'run') : 'walk';
        if (!faceLock) face = Math.atan2(-so.vx, -so.vz);
      }
      const turn = (sq.type === 'cav' ? 3 : 6) * dt;
      let dy = ((face - so.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      so.yaw += clamp(dy, -turn, turn);
      const stride = sq.type === 'cav' ? 3.0 : 1.35;
      so.wph += spd * dt * (Math.PI * 2 / stride) * (act === 'idle' ? 0 : 1);
      so.at += dt * so.atRate * (act === 'shoot' ? 0.8 : 1);
    }
    so.act = act;
    let gy = this.ground(so.x, so.z);
    if (sq.onWall || sq.wallSquad) gy += this.wallH + 0.3;
    if (sq.climbing) gy += clamp(sq.climbT / 9, 0, 1) * this.wallH;
    so.y = gy;
  }

  // 武將喊話氣泡
  barkAt(sq, kind, text) {
    if (!sq || !sq.label || sq.dead || sq._hideV) return;
    if ((sq._barkT || 0) > this.time) return;
    sq._barkT = this.time + 10;
    const msg = text || bark(kind, sq.general);
    if (!msg) return;
    const b = document.createElement('div'); b.className = 'bubble bark'; b.textContent = msg;
    sq.label.prepend(b);
    setTimeout(() => b.remove(), 2600);
  }

  // ———————————————— 介面 ————————————————
  sqName(sq) { return (sq.side === 'p' ? '' : '敵') + (GENERALS[sq.general]?.name || UNIT_TYPES[sq.type].name) + '部'; }
  log(side, msg) {
    if (!this.logEl) return;
    const d = el('div', side === 'p' ? 'p' : 'e', msg, this.logEl);
    while (this.logEl.children.length > 7) this.logEl.firstChild.remove();
    setTimeout(() => d.remove(), 9000);
  }

  buildHUD() {
    const R = root();
    const pc = FACTIONS[this.pf].css, ec = FACTIONS[this.ef].css;
    this.hud = el('div', 'battle-hud passthru', '', R);
    this.hud.style.cssText = 'position:absolute;inset:0;';
    this.hud.style.setProperty('--pc', pc); this.hud.style.setProperty('--ec', ec);
    const top = el('div', 'b-top', `
      <div class="b-side"><div class="nm"><span style="color:${pc}">${FACTIONS[this.pf].full}${this.playerLeader ? '・' + gname(this.playerLeader) : ''}</span><span class="pt"></span></div>
        <div class="bar"><div class="pb" style="background:${pc};width:100%"></div></div><div class="bar morale"><div class="pm" style="width:100%"></div></div></div>
      <div><div class="b-vs">戰</div><div class="b-timer">0:00</div></div>
      <div class="b-side"><div class="nm"><span class="et"></span><span style="color:${ec}">${FACTIONS[this.ef].full}${this.enemyLeader ? '・' + gname(this.enemyLeader) : ''}</span></div>
        <div class="bar"><div class="eb" style="background:${ec};width:100%;margin-left:auto"></div></div><div class="bar morale"><div class="em" style="width:100%;margin-left:auto"></div></div></div>`, this.hud);
    top.style.pointerEvents = 'auto';
    this.logEl = el('div', 'b-log', '', this.hud);
    this.cardsEl = el('div', 'b-cards', '', this.hud); this.cardsEl.style.pointerEvents = 'auto';
    this.ordersEl = el('div', 'b-orders', '', this.hud); this.ordersEl.style.pointerEvents = 'auto';
    this.rightEl = el('div', 'b-right', '', this.hud); this.rightEl.style.pointerEvents = 'auto';
    const left = el('div', 'b-left', '', this.hud); left.style.pointerEvents = 'auto';
    const sp = el('div', 'row', '', left);
    const spBtns = [['⏸', 0], ['1×', 1], ['2×', 2], ['3×', 3]].map(([t, v]) => {
      const b = el('button', 'btn small' + (v === 1 ? ' active' : ''), t, sp);
      b.onclick = () => { this.setSpeed(v); };
      return b;
    });
    this.spBtns = spBtns;
    const r2 = el('div', 'row', '', left);
    const w2 = el('button', 'btn small', '第二波出擊', r2); w2.onclick = () => this.releaseWave(2);
    const w3 = el('button', 'btn small', '第三波出擊', r2); w3.onclick = () => this.releaseWave(3);
    const r3 = el('div', 'row', '', left);
    el('button', 'btn small primary', '全軍突擊', r3).onclick = () => { this.releaseWave(9); for (const s of this.mySquads()) { s.order = 'auto'; s.moveTo = null; } this.log('p', '全軍突擊！'); SFX.drumRoll(8, 0.14); };
    el('button', 'btn small', '鳴金收兵', r3).onclick = () => { for (const s of this.mySquads()) if (!s.wallSquad) { s.order = 'retreat'; } this.log('p', '鳴金收兵，全軍後撤！'); };
    const r4 = el('div', 'row', '', left);
    el('button', 'btn small danger', '撤退 / 議和', r4).onclick = () => this.playerBroken(true);
    el('div', '', '<span style="font-size:11px;color:#b9a77a">左鍵點選部隊 → 點地面移動 / 點敵軍攻擊　右鍵拖曳旋轉　WASD 移動鏡頭　空白鍵暫停</span>', left);
    this.buildCards();
    this.refreshTacticBtns();
  }
  mySquads() { return this.squads.filter(s => s.side === 'p' && !s.dead && !s.escaped); }
  setSpeed(v) {
    if (v === 0) { this.paused = !this.paused; } else { this.speed = v; this.paused = false; }
    this.spBtns.forEach((b, i) => b.classList.toggle('active', i === 0 ? this.paused : (!this.paused && [0, 1, 2, 3][i] === this.speed)));
  }
  releaseWave(w) {
    let n = 0;
    for (const s of this.squads) if (s.side === 'p' && !s.dead && !s.released && !s.hidden && s.wave <= w) { s.released = true; s.state = 'idle'; n++; }
    if (n) { this.log('p', w === 9 ? '全軍出擊！' : `第${w === 2 ? '二' : '三'}波部隊出擊！`); SFX.drumRoll(5, 0.2); }
    this.buildCards();
  }

  buildCards() {
    if (!this.cardsEl) return;
    this.cardsEl.innerHTML = '';
    for (const sq of this.squads.filter(s => s.side === 'p')) {
      const c = el('div', 'scard', '', this.cardsEl);
      c.onclick = () => this.select(sq);
      sq.card = c;
    }
    this.updateCards();
  }
  updateCards() {
    for (const sq of this.squads.filter(s => s.side === 'p')) {
      const c = sq.card; if (!c) continue;
      const T = UNIT_TYPES[sq.type];
      const st = sq.dead ? 'dead' : sq.escaped ? 'escaped' : sq.routed ? 'rout' : sq.hidden ? 'hidden' : !sq.released ? 'wait' : sq.state;
      c.className = 'scard' + (sq === this.selected ? ' sel' : '') + (sq.dead || sq.escaped ? ' dead' : '') + (sq.routed ? ' rout' : '');
      c.innerHTML = `${!sq.released && !sq.hidden && !sq.dead ? `<span class="wave">第${'一二三'[sq.wave - 1] || '一'}波</span>` : ''}
        <div class="hd"><span><span class="ty">${T.icon}</span>${GENERALS[sq.general]?.name || T.name}</span>${sq.leader ? '<b style="color:#ffd36a">帥</b>' : ''}</div>
        <div class="bar" style="height:6px"><div style="width:${sq.troops / sq.max * 100}%;background:${FACTIONS[this.pf].css}"></div></div>
        <div class="bar morale" style="height:4px"><div style="width:${clamp(sq.morale, 0, 100)}%"></div></div>
        <div class="stt">${fmt(sq.troops)}・${STATE_TXT[st] || st}</div>`;
    }
  }
  updateOrders() {
    const o = this.ordersEl; if (!o) return;
    o.innerHTML = '';
    const sq = this.selected;
    if (!sq || sq.side !== 'p' || sq.dead) return;
    const mk = (t, fn, on) => { const b = el('button', 'btn small' + (on ? ' active' : ''), t, o); b.onclick = fn; };
    if (this.siege && this.defSide === 'p' && !sq.wallSquad && !this.gate.broken) mk(sq.sally ? '回城' : '出城突擊', () => { sq.sally = !sq.sally; sq.order = sq.sally ? 'auto' : 'retreat'; sq.released = true; this.updateOrders(); }, sq.sally);
    if (!sq.released && !sq.hidden) mk('出擊', () => { sq.released = true; sq.state = 'idle'; this.buildCards(); this.updateOrders(); });
    if (sq.hidden) mk('伏兵殺出', () => this.useTactic('p', 'ambush'));
    mk('自動進攻', () => { sq.order = 'auto'; sq.moveTo = null; sq.released = true; this.updateOrders(); }, sq.order === 'auto');
    mk('堅守', () => { sq.order = 'hold'; this.updateOrders(); }, sq.order === 'hold');
    if (!sq.wallSquad) mk('後撤', () => { sq.order = 'retreat'; this.updateOrders(); }, sq.order === 'retreat');
  }
  refreshTacticBtns() {
    if (!this.rightEl) return;
    this.rightEl.innerHTML = '';
    this.tacBtns = {};
    for (const id of this.sides.p.tactics) {
      const T = TACTICS[id];
      const b = el('div', 'tbtn', `${T.icon}<small>${T.name}</small><div class="cdov"></div>`, this.rightEl);
      b.title = T.desc;
      b.onclick = () => {
        if (!this.canUse('p', id)) { toast(id === 'ambush' ? '沒有埋伏中的部隊' : id === 'rockfall' ? '沒有處於下方的敵軍' : '尚在冷卻或無法使用', 'bad'); return; }
        if (id === 'fire') { this.armed = this.armed === 'fire' ? null : 'fire'; b.classList.toggle('armed', !!this.armed); this.hint(this.armed ? '點選要縱火的敵軍部隊' : null); return; }
        this.useTactic('p', id);
      };
      this.tacBtns[id] = b;
    }
  }
  hint(text) {
    if (this.hintEl) this.hintEl.remove();
    this.hintEl = null;
    if (text) this.hintEl = el('div', 'b-hint', text, this.hud);
  }
  updateHUD() {
    if (!this.hud) return;
    const pt = this.sideTroops('p'), et = this.sideTroops('e');
    const q = (s) => this.hud.querySelector(s);
    q('.pt').textContent = fmt(pt); q('.et').textContent = fmt(et);
    q('.pb').style.width = (pt / Math.max(1, this.sides.p.init) * 100) + '%';
    q('.eb').style.width = (et / Math.max(1, this.sides.e.init) * 100) + '%';
    q('.pm').style.width = this.sideMorale('p') + '%';
    q('.em').style.width = this.sideMorale('e') + '%';
    const m = Math.floor(this.simT / 60), s = Math.floor(this.simT % 60);
    q('.b-timer').textContent = `${m}:${String(s).padStart(2, '0')}${this.siege && !this.gate.broken ? `　城門 ${Math.max(0, Math.round(this.gate.hp / this.gate.max * 100))}%` : ''}`;
    this.updateCards();
    for (const [id, b] of Object.entries(this.tacBtns || {})) {
      const T = TACTICS[id];
      const rem = (this.sides.p.cd[id] || 0) - this.simT;
      b.querySelector('.cdov').style.height = rem > 0 ? (rem / T.cd * 100) + '%' : '0%';
      b.classList.toggle('cd', !this.canUse('p', id));
    }
  }

  select(sq) {
    this.selected = sq;
    this.updateCards(); this.updateOrders();
  }
  clickSquad(sq, e) {
    if (this.phase !== 'fight') return;
    if (sq.side === 'p') { this.select(sq); return; }
    if (this.armed === 'fire') {
      this.useTactic('p', 'fire', sq);
      this.armed = null; this.hint(null); this.tacBtns.fire?.classList.remove('armed');
      return;
    }
    if (this.selected && this.selected.side === 'p' && !this.selected.dead) {
      const s = this.selected;
      s.target = sq; s.order = 'attack'; s.moveTo = null; s.released = true; s.hidden = false;
      this.log('p', logLine('attack', this.sqName(s), this.sqName(sq)));
      this.updateOrders();
    }
  }

  onPointer(ev, type) {
    if (type === 'down') { this._down = { x: ev.clientX, y: ev.clientY, b: ev.button }; return; }
    if (type !== 'up' || !this._down) return;
    const moved = Math.hypot(ev.clientX - this._down.x, ev.clientY - this._down.y) > 6;
    const btn = this._down.b; this._down = null;
    if (moved || btn !== 0 || this.phase !== 'fight') return;
    const r = this.app.renderer.domElement.getBoundingClientRect();
    const m = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(m, this.camera);
    const hits = this.raycaster.intersectObjects(this.squads.filter(s => s.hit && !s.dead && !s.escaped && this.visibleTarget(s) || (s.side === 'p' && s.hit && !s.dead)).map(s => s.hit));
    if (hits.length) { this.clickSquad(hits[0].object.userData.sq, ev); return; }
    const g = this.raycaster.intersectObject(this.groundMesh);
    if (g.length && this.selected && this.selected.side === 'p' && !this.selected.dead && !this.selected.wallSquad) {
      const p = g[0].point;
      const s = this.selected;
      s.moveTo = new V2(p.x, p.z); s.order = 'move'; s.target = null; s.released = true;
      if (s.hidden) { s.hidden = false; s.revealed = true; }
      this.moveMarker.position.set(p.x, p.y + 0.4, p.z); this.moveMarker.visible = true; this.moveMarker.material.opacity = 1;
      this.updateOrders();
    }
  }
  onKey(ev, down) {
    this.keys[ev.code] = down;
    if (down && this.phase === 'fight') {
      if (ev.code === 'Space') { this.setSpeed(0); ev.preventDefault(); }
      if (ev.code === 'Digit1') this.setSpeed(1);
      if (ev.code === 'Digit2') this.setSpeed(2);
      if (ev.code === 'Digit3') this.setSpeed(3);
    }
  }

  // ———————————————— 流程 ————————————————
  camTo(pos, target, ms = 1500) {
    const fp = this.camera.position.clone(), ft = this.controls.target.clone();
    return tween(ms, t => {
      this.camera.position.lerpVectors(fp, pos, t);
      this.controls.target.lerpVectors(ft, target, t);
      this.camera.lookAt(this.controls.target);
    });
  }

  async run() {
    this.capturedE = []; this.capturedP = [];
    this.setupSides();
    this.build();
    const es = this.createEnemySquads();
    this.squads.push(...es);
    this.layoutSide('e');
    if (this.cfg.enemyLeaderExposed) {
      const L = this.squads.find(s => s.side === 'e' && s.leader);
      if (L) { L.troops = Math.round(L.troops * 0.35); L.max = L.troops; L.pos.y += 42; L.home = L.pos.clone(); this.layoutSquad(L); this.placeSoldiers(L); this.rebuildBatches(); }
    }
    this.playerRows = this.defaultPlayerRows();
    this.playerLeader = this.playerRows[0].general;
    this.applyPlayerRows(this.playerRows);
    this.app.setView(this);
    this.labelRoot.style.display = '';
    // 開場
    const c = this.cfg;
    this.camera.position.set(-160, 90, -200); this.controls.target.set(0, 0, -40); this.camera.lookAt(this.controls.target);
    SFX.music('battle');
    SFX.drumRoll(6, 0.35);
    titleCard(c.name || '交戰', c.sub || `${FACTIONS[this.pf].full} vs ${FACTIONS[this.ef].full}`, 2600);
    await this.orbitIntro();
    if (c.intro) for (const [sp, tx] of c.intro) await say(sp, tx);
    hideDialog();
    // 對陣
    const pre = await this.parley();
    if (pre) return pre;
    // 布陣
    await this.deployUI();
    // 開戰
    return await this.fight();
  }

  // 開場：環繞戰場一圈後直接進入戰鬥視角，可跳過
  orbitIntro() {
    this._skip = false;
    const btn = el('button', 'btn skip-btn', '跳過 ▶▶', root());
    btn.onclick = () => { this._skip = true; document.querySelectorAll('.title-card').forEach(t => t.remove()); };
    const end = new THREE.Vector3(0, 60, this.siege && this.attSide === 'e' ? 125 : 150), endT = new THREE.Vector3(0, 0, this.siege ? this.zw * 0.4 : 15);
    const r0 = 230, D = 7500;
    return new Promise(res => {
      const t0 = performance.now();
      const step = () => {
        const u = this._skip ? 1 : Math.min(1, (performance.now() - t0) / D);
        const e = ease.inOut(u);
        const th = e * Math.PI * 2;
        const r = lerp(r0, end.z, smoothstep(0.75, 1, u));
        const h = lerp(110, end.y, smoothstep(0.6, 1, u));
        this.camera.position.set(Math.sin(th) * r, h, Math.cos(th) * r);
        this.controls.target.lerpVectors(new THREE.Vector3(0, 0, 0), endT, smoothstep(0.7, 1, u));
        this.camera.lookAt(this.controls.target);
        if (u < 1) requestAnimationFrame(step); else { btn.remove(); res(); }
      };
      step();
    });
  }

  // —— 陣前對話 ——
  async parley() {
    const c = this.cfg;
    const pl = this.squads.find(s => s.side === 'p' && s.leader), el2 = this.squads.find(s => s.side === 'e' && s.leader) || this.squads.find(s => s.side === 'e' && !s.hidden);
    const P = GENERALS[this.playerLeader], E = GENERALS[this.enemyLeader];
    const k = await choose('兩軍對壘，旌旗蔽日。', [
      { text: '陣前會談：雙方主將出陣於兩軍之間', hint: '可勸降、激將、單挑' },
      { text: '遠處叫陣：於陣前高聲喊話', hint: '可激將、鼓舞士氣' },
      { text: '不必多言，擂鼓布陣！' },
    ]);
    if (k === 2) return null;
    let meet = k === 0;
    let pg, eg, pgPos, egPos;
    if (meet && pl?.group && el2?.group) {
      pgPos = pl.group.position.clone(); egPos = el2.group.position.clone();
      const midZ = (pgPos.z + egPos.z) / 2;
      const pTo = new THREE.Vector3(0, this.ground(0, midZ + 6), midZ + 6), eTo = new THREE.Vector3(0, this.ground(0, midZ - 6), midZ - 6);
      this.camTo(new THREE.Vector3(26, this.ground(0, midZ) + 9, midZ), new THREE.Vector3(0, this.ground(0, midZ) + 3, midZ), 2600);
      const pa = pgPos.clone(), ea = egPos.clone();
      this._parleyLock = true;
      await tween(2600, t => {
        pl.group.position.lerpVectors(pa, pTo, t); el2.group.position.lerpVectors(ea, eTo, t);
        pl.group.rotation.y = 0; el2.group.rotation.y = Math.PI;
        if (pl.genModel) animateHero(pl.genModel, t < 0.95 ? 'run' : 'idle', t * 40, 0);
        if (el2.genModel) animateHero(el2.genModel, t < 0.95 ? 'run' : 'idle', t * 40, 0);
      });
      this._parleyLock = true;
    } else {
      const z = pl ? pl.pos.y : 60;
      await this.camTo(new THREE.Vector3(10, 14, z + 22), new THREE.Vector3(0, 6, z - 60), 1800);
    }
    // 敵方開場白
    const gen = battleLines({ P: this.playerLeader, E: this.enemyLeader, pf: this.pf, ef: this.ef, year: this.state.year, cfg: c,
      pT: this.sideTroops('p'), eT: this.sideTroops('e'), rel: FACTIONS[this.ef]?.major ? this.state.getRel(this.pf, this.ef) : -20 });
    const L = { ...gen, ...(c.parley || {}) };
    const eSay = (txt) => this.enemyLeader ? say(this.enemyLeader, txt) : say('narr', `敵陣中有人高聲喝道：「${txt}」`);
    for (const l of L.enemyOpen) await eSay(l);
    if (c.parley?.playerOpen) for (const l of c.parley.playerOpen) await say(this.playerLeader, l);
    const opts = [];
    if (meet) opts.push({ text: '勸降：「識時務者為俊傑……」', hint: `成功率取決於智力與兵力對比`, v: 'persuade', disabled: c.noSurrender || c.parley?.noSurrender });
    opts.push({ text: '激將：當眾辱罵敵將，使其失去冷靜', hint: '敵軍士氣下降，可能令其冒進', v: 'taunt' });
    opts.push({ text: '鼓舞：向我軍將士陳說大義', hint: '我軍士氣提升', v: 'rally' });
    if (meet && this.squads.some(s => s.side === 'e' && s.general && !s.hidden)) opts.push({ text: '單挑：派猛將與敵將一決高下', hint: '勝者大振士氣', v: 'duel' });
    const v = opts[await choose('如何應對？', opts)].v;
    const pt = this.sideTroops('p'), et = this.sideTroops('e');
    let res = null;
    if (v === 'persuade') {
      await say(this.playerLeader, L.persuade);
      const chance = clamp(0.05 + ((P?.int || 60) - (E?.int || 60)) / 160 + (pt / et - 1) * 0.25 + (c.surrenderBonus || 0) - (E?.ruler ? 0.25 : 0), 0, 0.65);
      if (Math.random() < chance) {
        await eSay(L.surrender);
        res = { result: 'win', surrender: true, pLost: 0, eLost: 0, captives: Math.round(et * 0.75), capturedGenerals: this.squads.filter(s => s.side === 'e' && s.general).map(s => s.general), lostGenerals: [], gold: Math.round(et * 0.05), enemyFaction: this.ef, participants: [], deployed: 0 };
      } else {
        await eSay(L.refuse);
        for (const s of this.squads) if (s.side === 'e') s.morale += 5;
      }
    } else if (v === 'taunt') {
      await say(this.playerLeader, L.taunt);
      const wise = (E?.int || 60) >= 85;
      if (wise) {
        await eSay(L.tauntWise);
        for (const s of this.squads) if (s.side === 'e') s.morale -= 4;
      } else {
        await eSay(L.tauntAngry);
        this.sides.e.reckless = true;
        for (const s of this.squads) if (s.side === 'e') s.morale -= 12;
        toast('敵將大怒，敵軍冒進、防禦下降', 'good');
      }
    } else if (v === 'rally') {
      await say(this.playerLeader, L.rally);
      for (const s of this.squads) if (s.side === 'p') s.morale = Math.min(115, s.morale + 15);
      SFX.drumRoll(6, 0.2);
      toast('我軍士氣大振！', 'good');
    } else if (v === 'duel') {
      await this.duel(pl, el2);
    }
    hideDialog();
    // 歸位
    if (this._parleyLock && pl?.group) {
      const pa = pl.group.position.clone(), ea = el2.group.position.clone();
      this.camTo(new THREE.Vector3(0, 60, 140), new THREE.Vector3(0, 0, 10), 2000);
      await tween(1800, t => { pl.group.position.lerpVectors(pa, pgPos, t); el2.group.position.lerpVectors(ea, egPos, t); pl.group.rotation.y = Math.PI; el2.group.rotation.y = 0; });
      this._parleyLock = false;
    }
    return res;
  }

  async duel(pl, el2) {
    const st = this.state;
    const cands = st.generals.filter(g => GENERALS[g]).sort((a, b) => GENERALS[b].war - GENERALS[a].war).slice(0, 5);
    const eCands = this.squads.filter(s => s.side === 'e' && s.general && !s.hidden).map(s => s.general).sort((a, b) => GENERALS[b].war - GENERALS[a].war);
    const champ = eCands[0];
    if (!champ) return;
    const i = await choose(`敵方出陣的是【${GENERALS[champ].name}】（武力 ${GENERALS[champ].war}）。派誰出戰？`, cands.map(g => ({ text: `${GENERALS[g].name}　武力 ${GENERALS[g].war}`, hint: GENERALS[g].title })));
    const mine = cands[i];
    await say(mine, `吾乃${GENERALS[mine].name}！${GENERALS[champ].name}，可敢與我一戰！`);
    await say(champ, '有何不敢！看刀！');
    hideDialog();
    // 動畫：兩騎對衝三回合
    const mid = pl?.group ? pl.group.position.clone().lerp(el2.group.position, 0.5) : new THREE.Vector3(0, 0, 0);
    const A = makeHero(mine, FACTIONS[this.pf].color), B = makeHero(champ, FACTIONS[this.ef].color);
    A.scale.setScalar(1.3); B.scale.setScalar(1.3);
    A.traverse(o => o.isMesh && (o.castShadow = true)); B.traverse(o => o.isMesh && (o.castShadow = true));
    this.scene.add(A, B);
    if (pl?.group) pl.group.visible = false; if (el2?.group) el2.group.visible = false;
    const y = this.ground(mid.x, mid.z);
    this.camTo(new THREE.Vector3(mid.x + 30, y + 10, mid.z + 8), new THREE.Vector3(mid.x, y + 2, mid.z), 1200);
    const pw = clamp(0.5 + (GENERALS[mine].war - GENERALS[champ].war) / 36, 0.1, 0.9);
    const win = Math.random() < pw;
    const rounds = ['第一回合', '第二回合', '第三回合'];
    for (let r = 0; r < 3; r++) {
      const dir = r % 2 ? -1 : 1;
      await tween(1100, t => {
        const za = mid.z + dir * lerp(14, -14, t), zb = mid.z - dir * lerp(14, -14, t);
        A.position.set(mid.x - 1.4, this.ground(mid.x, za), za); B.position.set(mid.x + 1.4, this.ground(mid.x, zb), zb);
        A.rotation.y = dir > 0 ? 0 : Math.PI; B.rotation.y = dir > 0 ? Math.PI : 0;
        const near = Math.abs(t - 0.5) < 0.16;
        animateHero(A, near ? 'fight' : 'run', t * 30, (t - 0.5) * 3.2 + 0.5); animateHero(B, near ? 'fight' : 'run', t * 30 + 1, (t - 0.5) * 3.2 + 0.5);
        if (Math.abs(t - 0.5) < 0.03) {
          SFX.clash(0.5);
          for (let k = 0; k < 30; k++) this.particlesAdd.emit(mid.x, y + 3.5, mid.z, rand(-6, 6), rand(0, 7), rand(-6, 6), 0.5, 0.8, 1, 0.9, 0.5, 1, 10);
        }
      }, ease.inOut);
      if (r < 2) toast(`${rounds[r]}：雙方不分勝負！`);
    }
    const loser = win ? B : A;
    await tween(700, t => { loser.rotation.z = t * 1.4; loser.position.y -= 0.02; });
    if (win) {
      toast(`${GENERALS[mine].name}力斬敵將！`, 'good');
      await say(mine, `${GENERALS[champ].name}不過如此！`);
      for (const s of this.squads) { if (s.side === 'e') s.morale -= 25; else s.morale = Math.min(120, s.morale + 15); }
      if (Math.random() < 0.5) { this.capturedE.push(champ); toast(`生擒${GENERALS[champ].name}！`, 'good'); }
      const sq = this.squads.find(s => s.general === champ); if (sq) { sq.general = null; sq.morale -= 15; if (sq.label) sq.label.querySelector('.sn').firstChild.textContent = UNIT_TYPES[sq.type].name; if (sq.genModel) sq.genModel.visible = false; }
    } else {
      toast(`${GENERALS[mine].name}落敗負傷！`, 'bad');
      await say(champ, `哈哈哈！${FACTIONS[this.pf].name}軍竟無一合之將？`);
      for (const s of this.squads) { if (s.side === 'p') s.morale -= 20; else s.morale = Math.min(120, s.morale + 15); }
      (this.injured ||= []).push(mine);
      if (Math.random() < 0.3) { this.capturedP.push(mine); toast(`${GENERALS[mine].name}被敵軍擒去！`, 'bad'); }
      if (this.playerLeader === mine) { /* 主帥負傷仍可指揮 */ }
    }
    this.scene.remove(A, B);
    if (pl?.group) pl.group.visible = true; if (el2?.group) el2.group.visible = true;
  }

  // —— 布陣介面 ——
  deployUI() {
    return new Promise(resolve => {
      const st = this.state, c = this.cfg;
      const avail = Math.min(st.troops, c.maxTroops || st.troops);
      const allowAmbush = (st.hasTactic('ambush') || c.allowAmbush) && (this.terrain === 'mountain' || c.forest || c.allowAmbush) && !this.siege && !this.naval;
      if (allowAmbush && c.allowAmbush && c.enemyMarching && !this._ambushDefaulted) { this._ambushDefaulted = true; this.playerRows.forEach((r, i) => { if (i >= 2) r.ambush = true; }); }
      const rows = this.playerRows.map(r => ({ ...r }));
      if (this._ambushDefaulted && !this._ambushApplied) { this._ambushApplied = true; this.applyPlayerRows(rows); }
      const injured = this.injured || [];
      for (const r of rows) if (injured.includes(r.general)) r.general = '';
      const lost = this.capturedP || [];
      this.camTo(new THREE.Vector3(70, 90, 170), new THREE.Vector3(0, 0, 20), 1500);
      const panel = el('div', 'panel deploy', '', root());
      const draw = () => {
        const used = rows.reduce((a, r) => a + r.troops, 0);
        const gopts = (sel) => `<option value="">（無將）</option>` + st.generals.filter(g => GENERALS[g] && !injured.includes(g) && !lost.includes(g)).map(g => {
          const G = GENERALS[g]; const taken = rows.some(r => r.general === g && r.general !== sel);
          return `<option value="${g}" ${g === sel ? 'selected' : ''} ${taken ? 'disabled' : ''}>${G.name}（武${G.war}/統${G.lead}）</option>`;
        }).join('');
        const fsvg = (f) => {
          const s = FORMATIONS[f].slots;
          return `<svg width="60" height="40" viewBox="-3.2 -3.2 6.4 6.4">${s.map((p, i) => `<rect x="${p[0] - 0.4}" y="${p[1] - 0.3}" width="0.8" height="0.6" fill="${i === 0 ? '#ffd36a' : '#c9a04a'}" opacity="0.9"/>`).join('')}</svg>`;
        };
        panel.innerHTML = `<h3>排兵布陣　<span style="font-size:13px;color:#cdb88a">${c.name || ''}</span></h3>
          <div class="sec-title">陣型</div>
          <div class="formations">${Object.entries(FORMATIONS).map(([k, f]) => `<div class="fbtn ${this.sides.p.formation === k ? 'on' : ''}" data-f="${k}">${fsvg(k)}${f.name}</div>`).join('')}</div>
          <div class="fdesc">${FORMATIONS[this.sides.p.formation].desc}</div>
          <div class="sec-title">部隊編制（第一隊為主帥）　敵軍約 ${fmt(this.sides.e.init || this.sideTroops('e'))}</div>
          ${rows.map((r, i) => `<div class="sq-row" data-i="${i}">
              <div class="ix">${i === 0 ? '帥' : i + 1}</div>
              <select class="ty">${Object.entries(UNIT_TYPES).filter(([k]) => !(this.naval && k === 'cav')).map(([k, t]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
              <select class="gn">${gopts(r.general)}</select>
              <div class="tn">${fmt(r.troops)}</div>
              <div class="sub"><input type="range" class="tr" min="0" max="${avail}" step="500" value="${r.troops}" style="flex:1">
                <select class="wv" style="width:76px">${[1, 2, 3].map(w => `<option value="${w}" ${r.wave === w ? 'selected' : ''}>第${'一二三'[w - 1]}波</option>`).join('')}</select>
                ${allowAmbush && i > 0 ? `<label class="am-lbl"><input type="checkbox" class="am" ${r.ambush ? 'checked' : ''}>設為伏兵</label>` : ''}
                ${i > 0 ? '<button class="btn small rm">✕</button>' : ''}
              </div></div>`).join('')}
          ${rows.length < 6 ? '<button class="btn small add">＋ 增加部隊</button>' : ''}
          <div class="sum"><span>已編入：<b style="color:${used > avail ? '#ff8a7a' : '#fff'}">${fmt(used)}</b> / 可用 ${fmt(avail)}</span><span>剩餘預備 ${fmt(Math.max(0, st.troops - used))}</span></div>
          ${this.adviceHTML(allowAmbush)}
          <div class="sec-title">本戰可用兵法（戰鬥中點右側按鈕施放）</div>
          <div class="tactic-list">${st.tactics.map(t => `<span class="tac-ic">${TACTICS[t].icon}</span>【${TACTICS[t].name}】${TACTICS[t].desc}${this.tacticUsable(t) ? '' : ' <span class="adv-no">（本戰無法使用）</span>'}`).join('<br>')}</div>
          <div class="sec-title">兵器（自動生效）</div>
          <div class="tactic-list">【雲梯】基本軍備${st.weapons.length ? '<br>' + st.weapons.map(w => `【${WEAPONS[w].name}】${WEAPONS[w].desc}`).join('<br>') : ''}</div>
          <div class="modal-btns"><button class="btn primary go" ${used > avail || used <= 0 ? 'disabled' : ''}>擂鼓開戰</button></div>`;
        panel.querySelectorAll('.fbtn').forEach(b => b.onclick = () => { this.sides.p.formation = b.dataset.f; this.applyPlayerRows(rows); draw(); });
        panel.querySelectorAll('.sq-row').forEach(rowEl => {
          const i = +rowEl.dataset.i, r = rows[i];
          rowEl.querySelector('.ty').onchange = (e) => { r.type = e.target.value; this.applyPlayerRows(rows); draw(); };
          rowEl.querySelector('.gn').onchange = (e) => { r.general = e.target.value; if (i === 0) this.playerLeader = r.general || this.playerLeader; this.applyPlayerRows(rows); draw(); };
          const tr = rowEl.querySelector('.tr');
          tr.oninput = (e) => { r.troops = +e.target.value; rowEl.querySelector('.tn').textContent = fmt(r.troops); };
          tr.onchange = () => { this.applyPlayerRows(rows); draw(); };
          rowEl.querySelector('.wv').onchange = (e) => { r.wave = +e.target.value; this.applyPlayerRows(rows); };
          const am = rowEl.querySelector('.am'); if (am) am.onchange = (e) => { r.ambush = e.target.checked; this.applyPlayerRows(rows); draw(); };
          const rm = rowEl.querySelector('.rm'); if (rm) rm.onclick = () => { rows.splice(i, 1); this.applyPlayerRows(rows); draw(); };
        });
        const add = panel.querySelector('.add');
        if (add) add.onclick = () => {
          const free = st.generals.find(g => GENERALS[g] && !rows.some(r => r.general === g) && !injured.includes(g) && !lost.includes(g)) || '';
          rows.push({ type: 'inf', general: free, troops: Math.max(0, Math.min(3000, avail - rows.reduce((a, r) => a + r.troops, 0))), wave: 2, ambush: false });
          this.applyPlayerRows(rows); draw();
        };
        const os = panel.querySelector('.open-shop');
        if (os) os.onclick = () => this.app.openShop('auto', () => { this.sides.p.tactics = [...new Set([...this.sides.p.tactics, ...st.tactics])]; draw(); });
        panel.querySelector('.go').onclick = () => {
          if (!rows[0].general) { const g = st.generals.find(g => !rows.some(r => r.general === g) && !injured.includes(g)); rows[0].general = g || ''; }
          this.playerLeader = rows[0].general || this.playerLeader;
          this.applyPlayerRows(rows);
          panel.remove(); resolve();
        };
      };
      draw();
    });
  }

  // 本戰是否可能用上某兵法（布陣時判斷）
  tacticUsable(t) {
    if (t === 'fireship') return this.naval;
    if (t === 'water') return !!(this.cfg.river || this.cfg.riverMid) && !this.naval;
    if (t === 'rockfall') return (this.siege && this.defSide === 'p') || this.terrain === 'mountain' || !!this.cfg.hill;
    if (t === 'ambush') return (this.terrain === 'mountain' || this.cfg.forest || this.cfg.allowAmbush) && !this.siege && !this.naval;
    if (t === 'fire' || t === 'firearrow') return this.weather !== 'rain';
    if (t === 'raid') return false;
    if (t === 'charge') return !this.naval;
    return true;
  }
  // 軍師建言：列出建言中提到的兵法／兵器，標示是否擁有、怎麼用、去哪裡取得
  adviceHTML(allowAmbush) {
    const c = this.cfg, st = this.state;
    let txt = c.tips || '';
    const hasCity = /城/.test(c.tips || '');
    if (this.siege && this.attSide === 'p' && !hasCity) txt += (txt ? '　' : '') + '攻城戰：開戰時兵力最多的步兵／槍兵負責撞門（有衝車就推衝車，最多兩隊，否則扛撞木），其餘部隊同時架雲梯攀城，兩路並進。井闌、霹靂車可壓制城頭守軍。';
    if (this.siege && this.defSide === 'p' && !hasCity) txt += (txt ? '　' : '') + '守城戰：弓兵自動佈於城牆。敵軍逼近城下時可用滾木礌石；火油可焚毀衝車。城門未破前，守軍需下令「出城突擊」才能出城。';
    if (!txt) return '';
    const rows = [];
    const seen = new Set();
    const HOW = { fire: '戰鬥中點右側「火」，再點要縱火的敵軍', confuse: '戰鬥中點右側「亂」，自動選擇最強的敵軍', ambush: '布陣時在部隊列勾選「設為伏兵」；開戰後點右側「伏」或待敵軍接近自動殺出' };
    for (const [id, t] of Object.entries(TACTICS)) {
      if (!txt.includes(t.name) || seen.has(t.name)) continue; seen.add(t.name);
      const has = st.hasTactic(id) || (id === 'ambush' && allowAmbush);
      rows.push(has ? `<div class="adv-row ok">✔ 【${t.name}】${id === 'ambush' ? '本戰可以設伏' : '已習得'}：${HOW[id] || `戰鬥中點右側「${t.icon}」按鈕施放`}</div>`
        : `<div class="adv-row no">✘ 【${t.name}】尚未習得：可在「市集 → 兵書」以 ${t.price} 金購買${id === 'ambush' ? '（本戰地形不適合設伏）' : ''}</div>`);
    }
    for (const [id, w] of Object.entries(WEAPONS)) {
      if (!txt.includes(w.name) || seen.has(w.name)) continue; seen.add(w.name);
      const has = this.hasWeapon('p', id);
      rows.push(has ? `<div class="adv-row ok">✔ 【${w.name}】已擁有（自動生效）</div>` : `<div class="adv-row no">✘ 【${w.name}】未擁有：可在「市集 → 兵器」以 ${w.price} 金購買</div>`);
    }
    if (/伏兵/.test(txt) && !seen.has('伏兵')) rows.push(allowAmbush ? '<div class="adv-row ok">✔ 本戰可以設伏：在部隊列勾選「設為伏兵」</div>' : '<div class="adv-row no">✘ 本戰無法設伏</div>');
    const missing = rows.some(r => r.includes('adv-row no') && r.includes('市集'));
    return `<div class="advice"><div class="sec-title">軍師建言</div><div class="adv-txt">${txt}</div>${rows.join('')}${missing && this.app.openShop ? `<button class="btn small open-shop">前往市集購買（持有 ${fmt(st.gold)} 金）</button>` : ''}</div>`;
  }

  async fight() {
    for (const s of this.squads) {
      if (s.side === 'p' && s.wave === 1 && !s.hidden) { s.released = true; s.state = 'idle'; }
      if (s.side === 'p' && this.siege && this.defSide === 'p' && !s.wallSquad) s.order = 'hold';
      if (s.side === 'p' && s.hidden && !this.sides.p.tactics.includes('ambush')) this.sides.p.tactics.push('ambush');
    }
    this.sides.p.init = this.squads.filter(s => s.side === 'p').reduce((a, s) => a + s.troops, 0);
    this.sides.e.init = this.squads.filter(s => s.side === 'e').reduce((a, s) => a + s.troops, 0);
    this.deployed = this.sides.p.init;
    this.assignSiegeRoles();
    if (this.siege && this.attSide === 'p') {
      const r = this.squads.filter(s => s.side === 'p' && s.siegeMode === 'ram');
      if (r.length) this._roleMsg = `${r.map(s => this.sqName(s)).join('、')}${this.hasWeapon('p', 'ram') ? '推衝車' : '扛撞木'}撞門，其餘部隊同時架雲梯攀城`;
    }
    this.phase = 'fight';
    this.paused = false;
    this.controls.enabled = true;
    this.buildHUD();
    this.camTo(new THREE.Vector3(0, 70, (this.siege && this.attSide === 'e') ? 120 : 150), new THREE.Vector3(0, 0, this.siege ? this.zw * 0.5 : 10), 1200);
    SFX.drumRoll(10, 0.18); SFX.horn();
    this.log('p', '擂鼓進軍！');
    if (this._roleMsg) this.log('p', this._roleMsg);
    if (this.cfg.waterCut === 'p') this.log('e', '我軍水道被斷，士氣逐漸低落！');
    if (this.state.food <= 0) { for (const s of this.squads) if (s.side === 'p') s.morale = Math.min(s.morale, 70); this.log('e', '我軍糧草斷絕，士卒飢疲！'); }
    if (this.cfg.flood) this.doFlood(this.cfg.flood);
    if (this.cfg.playerLeaderExposed) {
      const L = this.squads.find(s => s.side === 'p' && s.leader);
      if (L) { L.troops = Math.round(L.troops * 0.25); L.max = L.troops; L.pos.y -= 45; L.home = L.pos.clone(); this.layoutSquad(L); this.placeSoldiers(L); this.rebuildBatches(); this.buildCards(); this.log('e', `${GENERALS[L.general]?.name || '主帥'}僅率少數輕兵在前修補鹿角！`); }
    }
    if (this.sides.e.asleep) this.log('p', '夜色掩護，我軍悄悄逼近敵營……');
    if (this.weather === 'rain') this.log('p', '大雨滂沱：火攻難以奏效，弓弩威力下降。');
    if (this.weather === 'fog') this.log('p', '大霧瀰漫，視野受阻，小心敵軍突襲。');
    if (this.cfg.waterCut === 'e') this.log('p', '敵軍水源已斷，軍心渙散！');
    return new Promise(resolve => { this.resolveFight = resolve; });
  }

  doFlood(side, k = 0.6) {
    for (const s of this.squads) if (s.side === side && !s.dead) { s.troops *= k; s.max *= k; s.morale -= 30 * (1 - k) / 0.4; }
    this.sides[side].init *= k;
    this.log(side === 'e' ? 'p' : 'e', '秋雨連綿，漢水暴漲！洪水灌入營寨！');
    const w = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x5a6a5a, transparent: true, opacity: 0.75, roughness: 0.2 }));
    w.rotation.x = -Math.PI / 2; w.position.y = -3; this.scene.add(w);
    tween(3000, t => { w.position.y = -3 + Math.sin(t * Math.PI) * 4.2; }).then(() => this.scene.remove(w));
    SFX.whoosh(0.5);
  }
  checkEnd() {
    if (this.ending) return;
    const broken = (side) => {
      const l = this.squads.filter(s => s.side === side && !s.dead && !s.escaped);
      if (!l.length) return true;
      const active = l.filter(s => !s.routed);
      if (!active.length) return true;
      const tr = this.sideTroops(side) / Math.max(1, this.sides[side].init);
      return this.sideMorale(side) < 10 || tr < 0.16;
    };
    if (this.pursuing) {
      this.pursueT -= 0.05;
      const left = this.squads.filter(s => s.side === 'e' && !s.dead && !s.escaped && (s.routed || s.ambushCounter));
      const counter = this.squads.filter(s => s.side === 'e' && s.ambushCounter && !s.dead && !s.escaped && !s.routed);
      if (this.pursueT <= 0 || (!left.length && !counter.length)) this.finish('win');
      return;
    }
    if (broken('e')) { this.enemyBroken(); return; }
    if (broken('p')) { this.playerBroken(false); return; }
    if (this.simT > (this.cfg.timeLimit || 330)) {
      if (this.siege) this.finish(this.attSide === 'p' ? 'lose' : 'win', '時間已盡，' + (this.attSide === 'p' ? '城池久攻不下，只得退兵。' : '敵軍久攻不下，退兵而去。'));
      else this.finish(this.sideTroops('p') / this.sides.p.init > this.sideTroops('e') / this.sides.e.init ? 'win' : 'lose', '日暮西山，兩軍各自收兵。');
    }
  }

  async enemyBroken() {
    this.ending = true; this.paused = true;
    const fleeing = this.squads.filter(s => s.side === 'e' && !s.dead && !s.escaped);
    if (!fleeing.length) { this.finish('win'); return; }
    for (const s of fleeing) if (!s.routed) this.rout(s);
    const opts = [{ text: '乘勝追擊！', hint: '擴大戰果、俘獲更多，但可能中伏', v: 'pursue' }, { text: '窮寇莫追，鳴金收兵', hint: '穩妥收場', v: 'stop' }];
    if (this.cfg.pursuitNote) await say('narr', this.cfg.pursuitNote);
    const i = await choose('敵軍潰敗，四散奔逃！', opts);
    hideDialog();
    if (opts[i].v === 'stop') { this.finish('win'); return; }
    this.pursuing = true; this.pursueT = 22; this.ending = false; this.paused = false;
    this.sides.p.buffs.push({ id: 'pursue', spd: 1.3, atk: 1.2, until: this.simT + 30 });
    for (const s of this.mySquads()) if (!s.wallSquad) { s.released = true; s.order = 'auto'; s.hidden = false; s.moveTo = null; }
    this.log('p', '全軍追擊！');
    SFX.drumRoll(8, 0.14);
    const L = GENERALS[this.enemyLeader];
    const risk = this.cfg.pursuitAmbush ?? clamp(((L?.int || 60) - 72) / 90, 0, 0.3);
    if (Math.random() < risk) {
      setTimeout(() => this.spawnCounterAmbush(), 5000 / this.speed);
    }
  }
  spawnCounterAmbush() {
    if (!this.pursuing) return;
    const c = this.cfg;
    const troops = Math.round(this.sides.e.init * (c.counterShare || 0.18));
    const gens = c.counterGenerals || [];
    const center = this.mySquads().reduce((a, s) => a.add(s.pos), new V2()).multiplyScalar(1 / Math.max(1, this.mySquads().length));
    [-1, 1].forEach((sx, i) => {
      const sq = this.makeSquad('e', { type: i ? 'cav' : 'inf', troops: Math.round(troops / 2), general: gens[i] || null, wave: 1, reinforcement: true });
      sq.ambushCounter = true;
      this.layoutSquad(sq);
      sq.pos.set(center.x + sx * 70, center.y - 30);
      sq.yaw = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      sq.released = true; sq.state = 'idle';
      this.squads.push(sq); this.placeSoldiers(sq); this.addSquadVisual(sq);
    });
    this.rebuildBatches();
    for (const s of this.mySquads()) s.morale -= 18;
    this.log('e', c.counterMsg || '追擊中伏！敵軍伏兵殺出！');
    SFX.horn(); SFX.drumRoll(8, 0.15);
    this.camShake = 1;
    this.pursueT = 30;
  }

  async playerBroken(voluntary) {
    if (this.ending) return;
    this.ending = true; this.paused = true;
    const st = this.state;
    const et = this.sideTroops('e');
    const cost = Math.round(et * 0.07 + 300);
    const opts = [
      { text: '撤退：保全殘部，逃回本陣', hint: '撤退途中會有部分損失', v: 'flee' },
      { text: `求和：遣使議和（需金 ${cost}）`, hint: this.peaceTried ? '已遭拒絕' : `目前持有 ${st.gold} 金`, v: 'peace', disabled: this.peaceTried || st.gold < cost || this.cfg.noPeace },
    ];
    if (!this.sides.p.lastStand && !voluntary) opts.push({ text: '背水一戰：死戰到底！', hint: '士氣回復、攻擊大增；再敗則全軍覆沒', v: 'last' });
    if (voluntary) opts.push({ text: '繼續作戰', v: 'cont' });
    const i = await choose(voluntary ? '主公，要撤兵嗎？' : '我軍陣腳大亂，敗象已露！', opts);
    const v = opts[i].v;
    if (v === 'cont') { this.ending = false; this.paused = false; return; }
    if (v === 'flee') {
      for (const s of this.mySquads()) { const extra = s.troops * 0.22; s.troops -= extra; this.sides.p.fleeLoss = (this.sides.p.fleeLoss || 0) + extra; if (s.general && Math.random() < 0.08) this.capturedP.push(s.general); }
      this.finish('lose', '我軍且戰且退，狼狽撤回。');
    } else if (v === 'peace') {
      this.peaceTried = true;
      const L = GENERALS[this.playerLeader];
      const chance = clamp(0.35 + ((L?.int || 60) - 70) / 100 + (this.cfg.peaceBonus || 0) - (this.sideMorale('e') - 60) / 200, 0.1, 0.8);
      await say(this.playerLeader, '兩國交兵，生靈塗炭。我願獻上金帛，暫且罷兵如何？');
      if (Math.random() < chance) {
        await say(this.enemyLeader || 'narr', '……也罷，念你誠意，今日暫且收兵。');
        hideDialog();
        st.gold -= cost;
        this.finish('peace', `雙方議和罷兵。（花費 ${cost} 金）`);
      } else {
        await say(this.enemyLeader || 'narr', '哼，事到如今才想求和？晚了！');
        hideDialog();
        for (const s of this.mySquads()) s.morale -= 10;
        for (const s of this.squads) if (s.side === 'e') s.morale += 10;
        this.ending = false; this.paused = false;
        if (!voluntary) setTimeout(() => { if (!this.ending) this.playerBroken(false); }, 200);
      }
    } else if (v === 'last') {
      this.sides.p.lastStand = true;
      for (const s of this.mySquads()) { s.morale = 55; if (s.routed) { s.routed = false; s.order = 'auto'; } s.released = true; }
      this.log('p', '背水一戰！將士死戰不退！');
      SFX.drumRoll(12, 0.12); SFX.horn();
      this.ending = false; this.paused = false;
      this._lastStandT = this.simT;
    }
  }

  finish(result, msg) {
    if (this.done) return;
    this.done = true; this.ending = true; this.paused = true; this.pursuing = false;
    const pLeft = this.sideTroops('p') + (this.sides.p.escaped || 0);
    const eLeft = this.sideTroops('e') + (this.sides.e.escaped || 0);
    const pLost = Math.round(this.sides.p.init - pLeft);
    const eLost = Math.round(this.sides.e.init - eLeft);
    const routedLeft = this.squads.filter(s => s.side === 'e' && s.routed && !s.dead && !s.escaped).reduce((a, s) => a + s.troops, 0);
    let captives = 0, gold = 0;
    if (result === 'win') {
      captives = Math.round(eLost * 0.22 + routedLeft * 0.5);
      gold = Math.round(this.sides.e.init * 0.035 + (this.cfg.goldBonus || 0));
      if (this.sides.p.lastStand && this.sides.p.lastStand) gold = Math.round(gold * 0.8);
    }
    if (result === 'lose' && this.sides.p.lastStand && this.sideTroops('p') / this.sides.p.init < 0.2) {
      for (const s of this.squads) if (s.side === 'p' && s.general && !s.dead && Math.random() < 0.3) this.capturedP.push(s.general);
    }
    this.resolveFight({
      result, msg, pLost: Math.max(0, pLost), eLost: Math.max(0, eLost), captives, gold,
      capturedGenerals: [...new Set(this.capturedE)], lostGenerals: [...new Set(this.capturedP)], deployed: this.deployed, enemyFaction: this.ef,
      participants: this.squads.filter(s => s.side === 'p' && s.general).map(s => s.general),
    });
  }

  dispose() {
    this.controls.dispose();
    if (this.hud) this.hud.remove();
    this.labelRoot.innerHTML = '';
    this.labelRoot.style.display = 'none';
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  render(renderer) { renderer.render(this.scene, this.camera); this.labels.render(this.scene, this.camera); }
  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.labels.setSize(w, h); for (const p of [this.particlesAdd, this.particlesN]) if (p) p.mat.uniforms.uScale.value = h * 0.9; }
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// —— 戰果畫面：套用到 GameState ——
export async function showResults(state, res, cfg) {
  const win = res.result === 'win', peace = res.result === 'peace';
  const F = state.F;
  let html = `<div class="result-big ${win ? 'win' : 'lose'}">${win ? '勝' : peace ? '和' : '敗'}</div>
    <h2>${cfg.name || ''}${win ? '　大獲全勝' : peace ? '　議和罷兵' : '　兵敗'}</h2>
    ${res.msg ? `<p style="text-align:center">${res.msg}</p>` : ''}
    ${res.surrender ? '<p style="text-align:center;color:#ffd36a">敵軍不戰而降！</p>' : ''}
    <div class="res-grid">
      <div><span class="k">我軍出陣</span>　${fmt(res.deployed || 0)}</div><div><span class="k">我軍損失</span>　${fmt(res.pLost)}</div>
      <div><span class="k">敵軍損失</span>　${fmt(res.eLost)}</div><div><span class="k">俘虜敵兵</span>　${fmt(res.captives)}</div>
      <div><span class="k">繳獲錢財</span>　${fmt(res.gold)} 金</div><div><span class="k">剩餘兵力</span>　${fmt(Math.max(0, state.troops - res.pLost))}</div>
    </div>`;
  if (res.lostGenerals.length) html += `<p style="color:#ff9a8a">被俘將領：${res.lostGenerals.map(gname).join('、')}</p>`;
  state.troops = Math.max(0, state.troops - res.pLost);
  for (const g of res.lostGenerals) state.captured(g, res.enemyFaction);
  for (const g of res.participants || []) state.addLoyalty(g, win ? 4 : -3);
  if (res.gold) state.gold += res.gold;
  await modal(html, [{ text: res.captives > 0 || res.capturedGenerals.length ? '處置俘虜' : '繼續', primary: true }]);
  if (res.captives > 0) {
    const k = await modal(`<h2>處置降卒</h2><p>俘獲敵兵 <b>${fmt(res.captives)}</b> 人。</p>`, [
      { text: '收編入伍（兵力 +' + fmt(Math.round(res.captives * 0.8)) + '）', primary: true, value: 0 },
      { text: '發放路費遣返（名望 +5）', value: 1 },
    ]);
    if (k === 0) { state.troops += Math.round(res.captives * 0.8); toast(`收編降卒 ${fmt(Math.round(res.captives * 0.8))}`, 'good'); }
    else { state.renown += 5; toast('仁義之名遠播，名望 +5', 'good'); }
  }
  for (const g of res.capturedGenerals) {
    if (state.generals.includes(g) || state.dead.includes(g)) continue;
    const G = GENERALS[g];
    if (cfg.captiveScript?.[g]) { const sc = cfg.captiveScript[g]; if (Array.isArray(sc)) await cfg.runSteps?.(sc); else await sc(state); hideDialog(); continue; }
    const isRuler = G.ruler || ['caocao', 'caopi', 'caorui', 'liubei', 'sunquan'].includes(g);
    const k = await modal(`<div style="display:flex;gap:16px;align-items:center">${portrait(g, 100)}<div><h2 style="text-align:left;margin:0">俘獲${isRuler ? '敵國之主' : '敵將'}【${G.name}】</h2>
      <p>${FACTIONS[res.enemyFaction || G.f]?.full || ''}・${G.title}　武力 ${G.war}　統率 ${G.lead}　智力 ${G.int}　忠誠可能 ${isRuler ? '無' : '有'}</p></div></div>`, isRuler ? [
      { text: '索取贖金（金 +3000）', primary: true, value: 3 }, { text: '以禮釋放（名望 +8、關係改善）', value: 1 }, { text: '斬首（名望 -15）', danger: true, value: 2 },
    ] : [
      { text: '招降', primary: true, value: 0 }, { text: '釋放（名望 +3）', value: 1 }, { text: '斬首（名望 -5）', danger: true, value: 2 },
    ]);
    if (k === 3) { state.gold += 3000; toast(`${G.name}交付贖金三千，被放歸`, 'gold'); continue; }
    if (isRuler && k === 1) { state.renown += 8; if (res.enemyFaction) state.addRel(state.faction, res.enemyFaction, 25); toast(`以禮釋放${G.name}`, 'good'); continue; }
    if (isRuler && k === 2) { state.kill(g); state.renown -= 15; state.flags['killed_' + g] = true; toast(`${G.name}被斬首！天下震動`, 'bad'); continue; }
    if (k === 0) {
      const ch = G.ruler || G.loyal ? 0.03 : clamp(0.35 + (state.renown - 50) / 150 + (90 - G.int) / 300, 0.1, 0.85);
      if (Math.random() < ch) { await say(g, '敗軍之將，承蒙不棄，願效犬馬之勞！'); hideDialog(); state.recruit(g, 50); }
      else { await say(g, `吾受${FACTIONS[G.f].name}主厚恩，豈能事二主！要殺便殺！`); hideDialog(); state.prisoners.push(g); toast(`${G.name}拒降，收押獄中`, 'bad'); }
    } else if (k === 1) { state.renown += 3; toast(`釋放${G.name}，名望 +3`, 'good'); }
    else { state.kill(g); state.renown -= 5; for (const x of state.generals) if (GENERALS[x]?.f === G.f) state.addLoyalty(x, -8); toast(`${G.name}被斬首`, 'bad'); }
  }
  state.emit('hud');
}
