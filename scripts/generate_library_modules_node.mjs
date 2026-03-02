import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

class NodeFileReader {
  result = null;
  onloadend = null;
  onerror = null;

  _finish(promise) {
    promise
      .then((value) => {
        this.result = value;
        if (this.onloadend) this.onloadend();
      })
      .catch((error) => {
        if (this.onerror) this.onerror(error);
      });
  }

  readAsArrayBuffer(blob) {
    this._finish(blob.arrayBuffer());
  }

  readAsDataURL(blob) {
    this._finish(
      blob.arrayBuffer().then((buffer) => {
        const mime = blob.type || 'application/octet-stream';
        const base64 = Buffer.from(buffer).toString('base64');
        return `data:${mime};base64,${base64}`;
      }),
    );
  }
}

if (!globalThis.FileReader) {
  globalThis.FileReader = NodeFileReader;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/models/library');
const exporter = new GLTFExporter();
const materialCache = new Map();

function keyForMat(name, opts) {
  return JSON.stringify({ name, ...opts });
}

function mat(name, opts) {
  const key = keyForMat(name, opts);
  if (materialCache.has(key)) return materialCache.get(key);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.color[0], opts.color[1], opts.color[2]),
    metalness: opts.metalness ?? 0,
    roughness: opts.roughness ?? 0.6,
    emissive: opts.emissive
      ? new THREE.Color(opts.emissive[0], opts.emissive[1], opts.emissive[2])
      : new THREE.Color(0, 0, 0),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
  material.name = name;
  materialCache.set(key, material);
  return material;
}

function box(name, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(name, radius, depth, position, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 16), material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeFloor() {
  const root = new THREE.Group();
  root.name = 'library_floor';
  const floorMat = mat('floor_mat', { color: [0.12, 0.16, 0.24], metalness: 0.1, roughness: 0.35 });
  const seamMat = mat('seam_mat', { color: [0.2, 0.24, 0.28], metalness: 0.15, roughness: 0.45 });
  root.add(box('floor_base', [36, 0.16, 82], [0, -0.08, 0], floorMat));
  for (let x = -16; x <= 16; x += 4) {
    root.add(box(`seam_x_${x}`, [0.04, 0.17, 82], [x, -0.079, 0], seamMat));
  }
  for (let z = -40; z <= 40; z += 4) {
    root.add(box(`seam_z_${z}`, [36, 0.17, 0.04], [0, -0.079, z], seamMat));
  }
  return root;
}

function makeMezzanine() {
  const root = new THREE.Group();
  root.name = 'library_mezzanine';
  const deckMat = mat('deck_mat', { color: [0.28, 0.33, 0.38], metalness: 0.25, roughness: 0.5 });
  const railMat = mat('rail_mat', { color: [0.46, 0.52, 0.58], metalness: 0.45, roughness: 0.35 });
  const postMat = mat('post_mat', { color: [0.36, 0.42, 0.48], metalness: 0.35, roughness: 0.45 });

  root.add(box('deck', [1, 0.25, 1], [0, -0.125, 0], deckMat));
  root.add(box('beam_l', [1, 0.2, 0.06], [0, 0.1, -0.47], postMat));
  root.add(box('beam_r', [1, 0.2, 0.06], [0, 0.1, 0.47], postMat));

  for (const sign of [-1, 1]) {
    root.add(box(`rail_top_${sign}`, [1, 0.05, 0.03], [0, 0.72, 0.47 * sign], railMat));
    for (let i = 0; i < 9; i += 1) {
      const x = -0.45 + i * 0.1125;
      root.add(cylinder(`rail_post_${sign}_${i}`, 0.012, 0.66, [x, 0.39, 0.47 * sign], railMat));
    }
  }

  for (const sx of [-0.42, 0.42]) {
    for (const sz of [-0.42, 0.42]) {
      root.add(box(`support_${sx}_${sz}`, [0.05, 0.9, 0.05], [sx, -0.55, sz], postMat));
    }
  }

  return root;
}

function makeTower() {
  const root = new THREE.Group();
  root.name = 'library_tower';
  const frame = mat('tower_frame', { color: [0.34, 0.4, 0.46], metalness: 0.45, roughness: 0.35 });
  const shelf = mat('tower_shelf', { color: [0.25, 0.31, 0.36], metalness: 0.25, roughness: 0.48 });

  const postCoords = [
    [-1.05, -0.72],
    [1.05, -0.72],
    [-1.05, 0.72],
    [1.05, 0.72],
  ];
  postCoords.forEach(([px, pz], i) => {
    root.add(box(`post_${i}`, [0.12, 8, 0.12], [px, 4, pz], frame));
  });

  [0.4, 2.0, 3.6, 5.2, 6.8].forEach((y) => {
    root.add(box(`brace_x_${y}`, [2.2, 0.08, 0.08], [0, y, -0.72], frame));
    root.add(box(`brace_x2_${y}`, [2.2, 0.08, 0.08], [0, y, 0.72], frame));
  });

  const levels = [0.2, 1.8, 3.4, 5.0, 6.6];
  const colors = [
    [0.84, 0.78, 0.72],
    [0.6, 0.72, 0.84],
    [0.78, 0.62, 0.66],
    [0.67, 0.76, 0.66],
    [0.58, 0.56, 0.74],
    [0.8, 0.69, 0.52],
  ];

  levels.forEach((y, li) => {
    root.add(box(`deck_${li}`, [2.2, 0.1, 1.5], [0, y, 0], shelf));
    for (let bi = 0; bi < 10; bi += 1) {
      const h = 0.24 + (((li * 17 + bi * 11) % 100) / 100) * 0.38;
      const x = -0.92 + bi * 0.205;
      const z = -0.08 + (((li * 19 + bi * 7) % 5) - 2) * 0.045;
      const c = colors[(li + bi) % colors.length];
      root.add(
        box(`book_${li}_${bi}`, [0.16, h, 0.2], [x, y + 0.05 + h * 0.5, z], mat(`book_${li}_${bi}`, { color: c, roughness: 0.75 })),
      );
    }
  });

  return root;
}

function makeBridge() {
  const root = new THREE.Group();
  root.name = 'library_bridge';
  const deck = mat('bridge_deck', { color: [0.34, 0.4, 0.46], metalness: 0.45, roughness: 0.4 });
  const rail = mat('bridge_rail', { color: [0.46, 0.53, 0.59], metalness: 0.5, roughness: 0.35 });

  root.add(box('deck', [16, 0.22, 1.4], [0, -0.11, 0], deck));
  for (const sign of [-1, 1]) {
    root.add(box(`rail_top_${sign}`, [16, 0.05, 0.03], [0, 0.65, sign * 0.62], rail));
    for (let i = 0; i < 33; i += 1) {
      const x = -7.8 + i * 0.49;
      root.add(cylinder(`rail_post_${sign}_${i}`, 0.01, 0.62, [x, 0.33, sign * 0.62], rail));
    }
  }

  return root;
}

function makeStairStep() {
  const root = new THREE.Group();
  root.name = 'library_stair_step';
  const stair = mat('stair_mat', { color: [0.38, 0.42, 0.5], metalness: 0.2, roughness: 0.62 });
  const edge = mat('stair_edge', { color: [0.58, 0.64, 0.72], metalness: 0.35, roughness: 0.45 });
  root.add(box('step', [6.4, 0.24, 0.84], [0, -0.12, 0], stair));
  root.add(box('edge', [6.4, 0.05, 0.06], [0, 0.03, -0.39], edge));
  return root;
}

function makeRailing() {
  const root = new THREE.Group();
  root.name = 'library_railing';
  const rail = mat('railing_mat', { color: [0.45, 0.52, 0.58], metalness: 0.5, roughness: 0.32 });
  root.add(box('rail_top', [0.08, 0.06, 46], [0, 0.8, 0], rail));
  for (let i = 0; i < 38; i += 1) {
    const z = -22.5 + i * 1.22;
    root.add(cylinder(`post_${i}`, 0.014, 1.62, [0, -0.01, z], rail));
  }
  return root;
}

function makeBackWall() {
  const root = new THREE.Group();
  root.name = 'library_back_wall';
  const wall = mat('back_wall', { color: [0.26, 0.31, 0.39], metalness: 0.18, roughness: 0.5 });
  const beam = mat('back_beam', { color: [0.38, 0.46, 0.56], metalness: 0.35, roughness: 0.4 });
  root.add(box('wall', [35.2, 11, 0.5], [0, 0, 0], wall));
  [-4, -1.2, 1.6, 4.4].forEach((y) => {
    root.add(box(`beam_${y}`, [35.2, 0.12, 0.56], [0, y, 0], beam));
  });
  return root;
}

function makeEntryWall() {
  const root = new THREE.Group();
  root.name = 'library_entry_wall';
  const wall = mat('entry_wall', { color: [0.44, 0.51, 0.57], metalness: 0.3, roughness: 0.45 });
  root.add(box('wall', [12, 1.8, 0.1], [0, 0, 0], wall));
  return root;
}

function makeWindowWall() {
  const root = new THREE.Group();
  root.name = 'library_window_wall';
  const frame = mat('window_frame', { color: [0.38, 0.46, 0.56], metalness: 0.35, roughness: 0.4 });
  const glass = mat('window_glass', {
    color: [0.86, 0.92, 1],
    roughness: 0.05,
    emissive: [0.55, 0.72, 1],
    emissiveIntensity: 0.8,
  });

  root.add(box('frame_outer', [12, 9, 0.2], [0, 0, 0], frame));
  root.add(box('glass_panel', [11.4, 8.4, 0.08], [0, 0, 0.04], glass));
  [-4, 0, 4].forEach((x) => {
    root.add(box(`mullion_v_${x}`, [0.1, 8.8, 0.22], [x, 0, 0], frame));
  });
  [-3, 0, 3].forEach((y) => {
    root.add(box(`mullion_h_${y}`, [11.8, 0.1, 0.22], [0, y, 0], frame));
  });
  return root;
}

async function exportGroup(group, fileName) {
  const glb = await exporter.parseAsync(group, {
    binary: true,
    onlyVisible: true,
    trs: false,
  });
  if (!(glb instanceof ArrayBuffer)) {
    throw new Error(`Unexpected non-binary GLTF output for ${fileName}`);
  }
  const outPath = path.join(OUT_DIR, fileName);
  await fs.writeFile(outPath, Buffer.from(glb));
  console.log(`Exported ${outPath}`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await exportGroup(makeFloor(), 'library-floor.glb');
  await exportGroup(makeMezzanine(), 'library-mezzanine.glb');
  await exportGroup(makeTower(), 'library-tower.glb');
  await exportGroup(makeBridge(), 'library-bridge.glb');
  await exportGroup(makeStairStep(), 'library-stair-step.glb');
  await exportGroup(makeRailing(), 'library-railing.glb');
  await exportGroup(makeBackWall(), 'library-back-wall.glb');
  await exportGroup(makeEntryWall(), 'library-entry-wall.glb');
  await exportGroup(makeWindowWall(), 'library-window-wall.glb');
  console.log('All library module GLBs generated.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
