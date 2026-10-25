// 劇情舞台：宮殿、軍帳、戰場、城樓、江畔、寢宮、受禪台；人物站位、鏡頭與動作演出
import * as THREE from 'three';
import { GENERALS, FACTIONS } from './data.js';
import { makeHero, NPC } from './figures.js';
import { makeBanner, waveBanner, treeGeometries } from './models.js';
import { tween, ease, clamp, lerp, rand } from './util.js';
import { Q } from './settings.js';

const KINDS = {
  palace: { sky: 0x1a1008, light: 0xffd8a0, fog: [0x1a1008, 20, 60] },
  tent: { sky: 0x2a1a0e, light: 0xffc080, fog: [0x2a1a0e, 15, 40] },
  chamber: { sky: 0x0e0a08, light: 0xffb060, fog: [0x0e0a08, 10, 30] },
  field: { sky: 0x8ab0d8, light: 0xfff0d8, fog: [0xb8c8d0, 40, 160] },
  night: { sky: 0x0a1020, light: 0x8aa0e0, fog: [0x0a1020, 30, 120] },
  wall: { sky: 0x9ab8d8, light: 0xfff0d8, fog: [0xc0ccd0, 50, 200] },
  river: { sky: 0x4a5a78, light: 0xffd0a0, fog: [0x6a7a8a, 30, 150] },
  altar: { sky: 0x8aa8d0, light: 0xfff0d8, fog: [0xc8d0d8, 50, 180] },
};

export class Stage {
  constructor(app) {
    this.app = app;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 500);
    this.actors = new Map();
    this.fx = [];
    this.time = 0;
    this.kind = null;
    this.side = 1;
  }

  clear() {
    for (const o of [...this.scene.children]) this.scene.remove(o);
    this.actors.clear(); this.fx = []; this.banners = [];
  }

  set(kind, opts = {}) {
    this.clear();
    this.kind = kind;
    const K = KINDS[kind] || KINDS.field;
    const s = this.scene;
    s.background = new THREE.Color(K.sky);
    s.fog = new THREE.Fog(...K.fog);
    s.add(new THREE.HemisphereLight(0xffffff, 0x5a4a3a, kind === 'night' ? 0.6 : kind === 'chamber' ? 0.9 : kind === 'palace' || kind === 'tent' ? 1.6 : 1.1));
    const sun = new THREE.DirectionalLight(K.light, kind === 'night' ? 0.9 : 2.2);
    sun.position.set(-6, 12, -8); sun.castShadow = true;
    sun.shadow.mapSize.set(Q().shadow, Q().shadow);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
    s.add(sun);
    this.banners = [];
    const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
    const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; s.add(m); return m; };
    const fac = opts.faction || 'wei';
    const F = FACTIONS[fac];
    const candle = (x, y, z) => {
      add(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 8), M(0x8a2a1a), x, y + 0.45, z);
      const l = new THREE.PointLight(0xffa040, 6, 8, 1.6); l.position.set(x, y + 1.1, z); s.add(l);
      const fl = add(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }), x, y + 1.0, z);
      this.fx.push({ t: 'flicker', l, fl, base: 6 });
    };
    if (kind === 'palace' || kind === 'chamber') {
      add(new THREE.BoxGeometry(40, 0.2, 40), M(0x3a1e12, { roughness: 0.35 }), 0, -0.1, 0);
      add(new THREE.BoxGeometry(14, 0.04, 30), M(0x8a1a14), 0, 0.02, 0);
      for (const x of [-6, 6]) for (const z of [-8, -2, 4, 10]) {
        add(new THREE.CylinderGeometry(0.4, 0.45, 9, 16), M(0x9a2a1e), x, 4.5, z);
        add(new THREE.BoxGeometry(1.1, 0.5, 1.1), M(0xc9a04a, { metalness: 0.6, roughness: 0.4 }), x, 0.25, z);
      }
      add(new THREE.BoxGeometry(30, 0.6, 30), M(0x2a1a10), 0, 9.3, 0).castShadow = false;
      const il = new THREE.PointLight(0xffd8a0, 60, 30, 1.2); il.position.set(0, 7, 3); s.add(il);
      add(new THREE.BoxGeometry(18, 9, 0.3), M(0x5a1e14), 0, 4.5, 13);
      add(new THREE.BoxGeometry(6, 5, 0.1), M(0xc9a04a, { metalness: 0.5, roughness: 0.4 }), 0, 4, 12.8);
      if (kind === 'palace') {
        for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(7 - i, 0.3, 2.4 - i * 0.4), M(0x5a3a2a), 0, 0.15 + i * 0.3, 9.5 + i * 0.4);
        add(new THREE.BoxGeometry(2.2, 1.2, 1.2), M(0xc9a04a, { metalness: 0.6, roughness: 0.35 }), 0, 1.5, 10.6);
        add(new THREE.BoxGeometry(2.4, 2.2, 0.3), M(0xa02a1e), 0, 2.4, 11.2);
        for (const x of [-4.5, 4.5]) candle(x, 0, 9);
        for (const x of [-7.5, 7.5]) { const b = makeBanner(F.name, F.css, 7, 1.8); b.position.set(x, 0, 11); s.add(b); this.banners.push(b); }
      } else {
        // 寢宮：床與帷帳
        add(new THREE.BoxGeometry(2.6, 0.6, 4), M(0x5a2a1a), 0, 0.3, 4);
        add(new THREE.BoxGeometry(2.4, 0.2, 3.8), M(0xe8e0d0), 0, 0.7, 4);
        for (const [x, z] of [[-1.3, 2], [1.3, 2], [-1.3, 6], [1.3, 6]]) add(new THREE.CylinderGeometry(0.07, 0.07, 3, 8), M(0x5a2a1a), x, 1.5, z);
        const cur = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
        add(new THREE.PlaneGeometry(4, 3), cur, 0, 1.5, 6.05);
        for (const x of [-1.35, 1.35]) add(new THREE.PlaneGeometry(4, 3), cur, x, 1.5, 4, Math.PI / 2);
        candle(-3.4, 0, 6.8); candle(3.4, 0, 6.8);
      }
    } else if (kind === 'tent') {
      add(new THREE.CircleGeometry(16, 32), M(0x5a4a32), 0, 0.01, 0).rotation.x = -Math.PI / 2;
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 6, 24, 1, true), M(0xd8c8a0, { side: THREE.BackSide }));
      wall.position.y = 3; s.add(wall);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(10.5, 4, 24, 1, true), M(0xc8b890, { side: THREE.BackSide }));
      roof.position.y = 8; s.add(roof);
      add(new THREE.CylinderGeometry(0.15, 0.15, 10, 8), M(0x5a3a20), 0, 5, 3);
      add(new THREE.BoxGeometry(4, 0.15, 2.4), M(0x6a4a2a), 0, 0.7, 2.6);
      for (const [x, z] of [[-1.8, 1.6], [1.8, 1.6], [-1.8, 3.6], [1.8, 3.6]]) add(new THREE.BoxGeometry(0.12, 1, 0.12), M(0x4a2a1a), x, 0.5, z);
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160;
      const g = cv.getContext('2d'); g.fillStyle = '#d8c090'; g.fillRect(0, 0, 256, 160);
      g.strokeStyle = '#4a7aaa'; g.lineWidth = 4; g.beginPath(); g.moveTo(10, 60); g.bezierCurveTo(80, 40, 150, 110, 250, 90); g.stroke();
      g.strokeStyle = '#7a5a3a'; g.lineWidth = 2; for (let i = 0; i < 20; i++) { g.beginPath(); const x = Math.random() * 256, y = Math.random() * 160; g.moveTo(x, y); g.lineTo(x + 10, y - 8); g.lineTo(x + 20, y); g.stroke(); }
      g.fillStyle = '#a02020'; for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 230, Math.random() * 140, 10, 10);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      add(new THREE.PlaneGeometry(3.6, 2.1), new THREE.MeshStandardMaterial({ map: tx }), 0, 0.79, 2.6).rotation.x = -Math.PI / 2;
      candle(-6.5, 0, 6.5); candle(6.5, 0, 6.5);
      for (const x of [-5, 5]) { const b = makeBanner(F.name, F.css, 5, 1.4); b.position.set(x, 0, 7); s.add(b); this.banners.push(b); }
      // 兵器架
      for (const x of [-7, 7]) { add(new THREE.BoxGeometry(2, 0.1, 0.3), M(0x4a2a1a), x, 1.8, 6); for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.03, 0.03, 3.2, 5), M(0x3a2414), x - 0.75 + i * 0.5, 1.6, 6); }
    } else {
      // 室外
      const groundCol = { field: 0x6a8a3a, night: 0x2a3a2a, wall: 0x8a8070, river: 0x5a6a3a, altar: 0x7a8a4a }[kind] || 0x6a8a3a;
      const gg = new THREE.PlaneGeometry(400, 400, 60, 60); gg.rotateX(-Math.PI / 2);
      const p = gg.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, r > 40 ? (r - 40) * 0.12 * (1 + Math.sin(x * 0.05) * Math.cos(z * 0.04)) : 0); }
      gg.computeVertexNormals();
      add(gg, M(groundCol, { roughness: 1 }), 0, 0, 0);
      if (kind === 'night') {
        const stars = new THREE.BufferGeometry(); const pts = [];
        for (let i = 0; i < 1500; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3 + 0.1, r = 300; pts.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
        stars.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        s.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false, fog: false })));
        candle(-5.5, 0, 7.5); candle(5.5, 0, 7.5);
      }
      if (kind === 'river') {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(400, 120), new THREE.MeshStandardMaterial({ color: 0x2a5a7a, roughness: 0.15, metalness: 0.2 }));
        w.rotation.x = -Math.PI / 2; w.position.set(0, 0.05, 70); s.add(w);
        this.ships = [];
        for (let i = 0; i < 9; i++) {
          const ship = new THREE.Group();
          const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 12), M(0x4a3020)); hull.position.y = 0.6; ship.add(hull);
          const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 5), M(0x8a2a1e)); deck.position.set(0, 2, 1); ship.add(deck);
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9), M(0x3a2414)); mast.position.y = 5; ship.add(mast);
          const sail = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), M(0xe0d4b0, { side: THREE.DoubleSide })); sail.position.set(0, 6, 0.2); sail.rotation.y = Math.PI / 2; ship.add(sail);
          ship.position.set(-48 + i * 12, 0, 45 + (i % 3) * 9); ship.rotation.y = 0.2 * (i % 2 ? 1 : -1);
          ship.traverse(o => { if (o.isMesh) o.castShadow = true; });
          s.add(ship); this.ships.push(ship);
        }
      }
      if (kind === 'wall') {
        add(new THREE.BoxGeometry(60, 1, 8), M(0x8a8070), 0, -0.5, 0);
        for (let x = -29; x <= 29; x += 2.2) add(new THREE.BoxGeometry(1.1, 1.3, 0.6), M(0x6a6252), x, 0.6, -3.8);
        add(new THREE.BoxGeometry(60, 12, 1), M(0x7a7060), 0, -6.5, -4);
        for (const x of [-10, 10]) { const b = makeBanner(F.name, F.css, 7, 1.8); b.position.set(x, 0, -3); s.add(b); this.banners.push(b); }
      }
      if (kind === 'altar') {
        for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(16 - i * 4, 1.2, 16 - i * 4), M(0xb8a888), 0, 0.6 + i * 1.2, 10);
        for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(3, 0.3, 0.8), M(0xa89878), 0, 0.15 + i * 0.6, 1.8 + i * 0.9);
        for (const x of [-9, 9]) for (const z of [0, 8, 16]) { const b = makeBanner(F.name, F.css, 9, 2); b.position.set(x, 0, z); s.add(b); this.banners.push(b); }
      }
      if (kind === 'field' || kind === 'night' || kind === 'river') {
        const tg = treeGeometries();
        const vm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
        const n = 80; const t1 = new THREE.InstancedMesh(tg.trunk, vm, n), t2 = new THREE.InstancedMesh(tg.pineTop, vm, n);
        const d = new THREE.Object3D();
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = 30 + Math.random() * 40; d.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * (kind === 'river' ? -1 : 1) - (kind === 'river' ? 0 : 0)); if (kind === 'river' && d.position.z > 10) d.position.z = -d.position.z; d.scale.setScalar(1.5 + Math.random()); d.updateMatrix(); t1.setMatrixAt(i, d.matrix); t2.setMatrixAt(i, d.matrix); }
        t1.castShadow = t2.castShadow = true; s.add(t1, t2);
        for (let i = 0; i < 6; i++) {
          const tent = add(new THREE.ConeGeometry(2.4, 3, 6), M(0xe0d4b4), -15 + i * 6, 1.5, -14 - (i % 2) * 4);
          if (kind === 'night') tent.material = M(0x8a8070);
        }
        for (const x of [-6, 6]) { const b = makeBanner(F.name, F.css, 7, 1.8); b.position.set(x, 0, 6); s.add(b); this.banners.push(b); }
      }
    }
    this.camera.position.set(0, 3, -10);
    this.camera.lookAt(0, 1.5, 2);
  }

  colorOf(id) {
    const f = GENERALS[id]?.f || NPC[id]?.f || 'wei';
    return FACTIONS[f]?.color || 0x888888;
  }

  // 依序擺放：主位在後方中央，其餘左右排開
  slot(i) {
    if (this.kind === 'chamber') return [[1.8, 3.2, -Math.PI / 2], [-1.8, 3, Math.PI / 2], [0, 0.5, 0], [-2.5, 1, 0.3], [2.5, 1, -0.3]][i % 5];
    const rows = [[0, 6, Math.PI], [-2.6, 2.5, Math.PI * 0.75], [2.6, 2.5, -Math.PI * 0.75], [-3.4, 0, Math.PI * 0.62], [3.4, 0, -Math.PI * 0.62], [-4, -2.5, Math.PI / 2], [4, -2.5, -Math.PI / 2]];
    return rows[i % rows.length];
  }

  addActor(id, x, z, yaw, opts = {}) {
    if (this.actors.has(id)) { const a = this.actors.get(id); a.obj.position.set(x, a.obj.position.y, z); a.obj.rotation.y = yaw; return a; }
    const obj = makeHero(id, this.colorOf(id), { mounted: !!opts.mounted, pose: opts.pose, unarmed: !['field', 'night', 'wall', 'river'].includes(this.kind) });
    obj.position.set(x, opts.y || 0, z); obj.rotation.y = yaw;
    this.scene.add(obj);
    const a = { id, obj, base: obj.position.clone() };
    this.actors.set(id, a);
    return a;
  }
  ensure(id) {
    if (!id || id === 'narr') return null;
    if (this.actors.has(id)) return this.actors.get(id);
    const [x, z, yaw] = this.slot(this.actors.size);
    return this.addActor(id, x, z, yaw + Math.PI);
  }

  // 鏡頭：對準說話者
  shot(id, ms = 700) {
    const a = this.actors.get(id);
    if (!a) return this.wide(ms);
    this.side *= -1;
    if (a.obj.userData.lying) {
      const hp = a.obj.position.clone().add(new THREE.Vector3(0, 0.25, 1.6));
      return this.camTo(hp.clone().add(new THREE.Vector3(-2.2, 1.4, -1.2)), hp, ms);
    }
    const p = a.obj.position, yaw = a.obj.rotation.y;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const h = a.obj.userData.lying ? 0.9 : (a.obj.position.y + 1.62);
    const to = p.clone().addScaledVector(fwd, 3.2).addScaledVector(right, this.side * 1.3); to.y = h + 0.25;
    const look = new THREE.Vector3(p.x, h, p.z);
    return this.camTo(to, look, ms);
  }
  wide(ms = 900) {
    let c = new THREE.Vector3(), n = 0;
    for (const a of this.actors.values()) { c.add(a.obj.position); n++; }
    if (n) c.multiplyScalar(1 / n); else c.set(0, 0, 2);
    const to = new THREE.Vector3(c.x + 3, 4.2, c.z - 10);
    return this.camTo(to, new THREE.Vector3(c.x, 1.4, c.z), ms);
  }
  camTo(pos, look, ms) {
    const fp = this.camera.position.clone();
    const fl = this._look ? this._look.clone() : look.clone();
    return tween(ms, t => { this.camera.position.lerpVectors(fp, pos, t); this._look = fl.clone().lerp(look, t); this.camera.lookAt(this._look); });
  }

  // 動作
  async act(id, action, arg) {
    const a = this.ensure(id); if (!a) return;
    const o = a.obj;
    switch (action) {
      case 'walk': {
        const [x, z] = arg; const from = o.position.clone();
        const yaw = Math.atan2(-(x - from.x), -(z - from.z));
        o.rotation.y = yaw;
        const dur = Math.max(500, from.distanceTo(new THREE.Vector3(x, from.y, z)) * 450);
        await tween(dur, (t) => { o.position.set(lerp(from.x, x, t), from.y + Math.abs(Math.sin(t * dur / 120)) * 0.06, lerp(from.z, z, t)); }, ease.linear);
        o.position.y = from.y;
        break;
      }
      case 'face': { const b = this.actors.get(arg); if (b) o.rotation.y = Math.atan2(-(b.obj.position.x - o.position.x), -(b.obj.position.z - o.position.z)); break; }
      case 'turn': o.rotation.y = arg; break;
      case 'kneel': await tween(600, t => { o.position.y = -0.42 * t; o.rotation.x = -0.12 * t; }); break;
      case 'stand': await tween(500, t => { o.position.y = -0.42 * (1 - t); o.rotation.x = -0.12 * (1 - t); }); break;
      case 'bow': await tween(450, t => { o.rotation.x = -Math.sin(t * Math.PI) * 0.45; }); break;
      case 'lie': o.userData.lying = true; o.rotation.set(Math.PI / 2, 0, 0); o.position.set(arg?.[0] ?? 0, arg?.[1] ?? 0.85, arg?.[2] ?? 3.0); break;
      case 'fall': await tween(700, t => { o.rotation.x = t * Math.PI / 2; o.position.y = -t * 0.2; }, ease.in); o.userData.lying = true; break;
      case 'shake': await tween(500, t => { o.rotation.z = Math.sin(t * 40) * 0.05 * (1 - t); }); break;
      case 'jump': await tween(500, t => { o.position.y = Math.sin(t * Math.PI) * 0.5; }); break;
      case 'leave': await this.act(id, 'walk', arg || [o.position.x * 3, -14]); this.scene.remove(o); this.actors.delete(id); break;
      case 'vanish': this.scene.remove(o); this.actors.delete(id); break;
    }
  }

  // 特效
  effect(kind, arg) {
    const s = this.scene;
    if (kind === 'star') {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffeeaa, fog: false }));
      s.add(star);
      const trail = [];
      for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.45 * (1 - i / 20), 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.8 * (1 - i / 20), fog: false })); s.add(m); trail.push(m); }
      const from = new THREE.Vector3(-60, 70, 80), to = new THREE.Vector3(8, 2, 20);
      const hist = [];
      return tween(3200, t => {
        star.position.lerpVectors(from, to, t); hist.unshift(star.position.clone());
        trail.forEach((m, i) => m.position.copy(hist[Math.min(hist.length - 1, i * 2)]));
      }, ease.in).then(() => { s.remove(star); trail.forEach(m => s.remove(m)); });
    }
    if (kind === 'fire') {
      // 江面燃燒
      for (const ship of this.ships || []) this.fx.push({ t: 'burn', obj: ship, s: Math.random() });
      const l = new THREE.PointLight(0xff6a20, 400, 120, 1.4); l.position.set(0, 8, 50); s.add(l);
      this.fx.push({ t: 'flicker', l, base: 400 });
      return Promise.resolve();
    }
    if (kind === 'lightsOut') {
      for (const f of this.fx) if (f.t === 'flicker') { f.dead = true; f.l.intensity = 0; if (f.fl) f.fl.visible = false; }
      return Promise.resolve();
    }
    if (kind === 'hair') {
      const a = this.actors.get(arg); if (!a) return Promise.resolve();
      const p = a.obj.position;
      const bits = [];
      for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.01), new THREE.MeshBasicMaterial({ color: 0x111111 })); m.position.set(p.x + rand(-0.1, 0.1), 1.9, p.z + rand(-0.1, 0.1)); m.rotation.set(rand(0, 3), rand(0, 3), 0); s.add(m); bits.push([m, rand(-0.4, 0.4), rand(-0.4, 0.4)]); }
      return tween(1500, t => { for (const [m, vx, vz] of bits) { m.position.y = 1.9 - t * 1.9; m.position.x += vx * 0.01; m.position.z += vz * 0.01; m.rotation.x += 0.1; } }).then(() => bits.forEach(([m]) => s.remove(m)));
    }
    if (kind === 'shake') { const c = this.camera.position.clone(); return tween(600, t => { this.camera.position.set(c.x + Math.sin(t * 60) * 0.1 * (1 - t), c.y, c.z); }); }
    return Promise.resolve();
  }

  update(dt) {
    this.time += dt;
    for (const b of this.banners || []) waveBanner(b, this.time);
    for (const f of this.fx) {
      if (f.dead) continue;
      if (f.t === 'flicker') f.l.intensity = f.base * (0.85 + Math.random() * 0.3);
      if (f.t === 'burn' && Math.random() < 0.6) {
        const p = f.obj.position;
        if (!f.flames) {
          f.flames = [];
          for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.5, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff7a20 : 0xffc040, transparent: true, opacity: 0.85 })); m.position.set(p.x + rand(-1.5, 1.5), rand(1, 7), p.z + rand(-5, 5)); this.scene.add(m); f.flames.push(m); }
        }
        for (const m of f.flames) { m.scale.setScalar(0.6 + Math.random() * 0.8); m.position.y += 0.05; if (m.position.y > 9) m.position.y = 1; }
      }
    }
    for (const s of this.ships || []) s.position.y = Math.sin(this.time + s.position.x) * 0.15;
  }
  render(r) { r.render(this.scene, this.camera); }
  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
}
