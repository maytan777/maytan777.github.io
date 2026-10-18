import * as THREE from 'three';

// Modelo de obra vial aislado sobre el fondo del visor. El perfil de terreno
// solo sirve para calcular las cotas de apoyo; no se dibuja la topografía.
export function createRoadScene(materials) {
  const { concrete, steel, galvanized, asphalt, whitePaint, yellowPaint, waterMaterial, grainTexture } = materials;
  const group = new THREE.Group();
  group.name = 'Carretera de montaña con obras de drenaje';
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const up = v(0, 1, 0);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
  const shoulderMaterial = new THREE.MeshStandardMaterial({
    color: 0x99917a, roughness: 1, map: grainTexture(65, 192, 50)
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202b2b, roughness: 0.9 });
  const drainConcrete = concrete.clone();
  drainConcrete.side = THREE.DoubleSide;
  const guardMetal = galvanized.clone();
  guardMetal.side = THREE.DoubleSide;

  const route = new THREE.CatmullRomCurve3([
    v(-122, 12, 74), v(-90, 14, 72), v(-52, 17, 84), v(-12, 20, 73),
    v(20, 23, 45), v(55, 26, 44), v(89, 29, 61), v(110, 32, 34),
    v(95, 34, 7), v(54, 36, -1), v(15, 38, -7), v(-25, 40, 7),
    v(-64, 42, 0), v(-96, 44, -17), v(-100, 47, -44),
    v(-70, 49, -61), v(-31, 52, -52), v(6, 54, -65), v(46, 56, -72), v(105, 59, -90)
  ], false, 'centripetal');
  route.arcLengthDivisions = 1800;
  const length = route.getLength();
  const steps = Math.ceil(length / 1.05);
  const frames = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const p = route.getPointAt(u);
    const tangent = route.getTangentAt(u);
    const t = v(tangent.x, 0, tangent.z).normalize();
    const before = route.getTangentAt(Math.max(0, u - 0.003));
    const after = route.getTangentAt(Math.min(1, u + 0.003));
    const bend = before.x * after.z - before.z * after.x;
    const frame = { p, t, n: v(-t.z, 0, t.x), s: u * length,
      bank: THREE.MathUtils.clamp(bend * 0.15, -0.065, 0.065) };
    frames.push(frame);
  }
  function frameAt(s) {
    return frames[Math.max(0, Math.min(steps, Math.round(s / length * steps)))];
  }
  function point(f, offset, lift = 0) {
    return v(f.p.x + f.n.x * offset,
      f.p.y + f.bank * offset - Math.abs(offset) * 0.018 + lift,
      f.p.z + f.n.z * offset);
  }
  const bridges = [
    { s: length * 0.115, span: 20 }, { s: length * 0.77, span: 18 }
  ].map(feature => ({ ...feature, f: frameAt(feature.s) }));
  const culverts = [0.27, 0.48, 0.91].map(u => ({ s: length * u, f: frameAt(length * u) }));
  const drainageFeatures = [...bridges, ...culverts];
  const onBridge = s => bridges.some(b => Math.abs(s - b.s) < b.span / 2);

  function originalHeight(x, z) {
    const ridge = 22 * Math.exp(-((x + 45) ** 2 / 4800 + (z + 85) ** 2 / 1600));
    return 13 + (85 - z) * 0.205 + ridge
      + 5 * Math.sin(x / 43) * Math.cos(z / 37)
      + 2.5 * Math.sin(x / 17 + z / 27);
  }
  // Quebradas transversales: bajo los dos puentes, el terreno queda abierto.
  function naturalHeight(x, z) {
    let h = originalHeight(x, z);
    for (const feature of drainageFeatures) {
      const { f } = feature;
      const dx = x - f.p.x, dz = z - f.p.z;
      const along = dx * f.t.x + dz * f.t.z;
      const across = dx * f.n.x + dz * f.n.z;
      const isBridge = Boolean(feature.span);
      const half = isBridge ? feature.span * 0.32 : 1.6;
      const influence = Math.exp(-((along / (half + Math.abs(across) * 0.045)) ** 4))
        * (1 - THREE.MathUtils.smoothstep(Math.abs(across), isBridge ? 34 : 12, isBridge ? 48 : 20));
      const bed = f.p.y - (isBridge ? 9.5 : 3.3) + across * 0.015;
      h = THREE.MathUtils.lerp(h, Math.min(h, bed), influence);
    }
    return h;
  }

  const walls = [
    { a: length * 0.17, b: length * 0.235 },
    { a: length * 0.585, b: length * 0.665 }
  ].map(w => {
    const f = frameAt((w.a + w.b) / 2);
    const plus = point(f, 12), minus = point(f, -12);
    const side = naturalHeight(plus.x, plus.z) < naturalHeight(minus.x, minus.z) ? 1 : -1;
    return { ...w, side };
  });
  function wallAt(s, side) {
    return walls.find(w => s >= w.a && s <= w.b && w.side === side);
  }
  function mesh(name, geometry, material, castShadow = true) {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.castShadow = castShadow;
    object.receiveShadow = true;
    group.add(object);
    return object;
  }
  function box(name, size, pos, material, heading = 0) {
    const object = mesh(name, cube, material);
    object.scale.set(...size);
    object.position.copy(pos);
    object.rotation.y = heading;
    return object;
  }
  function bar(name, start, end, radius, material) {
    const dir = end.clone().sub(start);
    const object = mesh(name, cylinder, material, false);
    object.position.copy(start).add(end).multiplyScalar(0.5);
    object.scale.set(radius, dir.length(), radius);
    object.quaternion.setFromUnitVectors(up, dir.normalize());
    return object;
  }
  function instances(name, geometry, material, pieces, castShadow = true) {
    if (!pieces.length) return;
    const object = new THREE.InstancedMesh(geometry, material, pieces.length);
    const transform = new THREE.Object3D();
    object.name = name;
    pieces.forEach((piece, i) => {
      transform.position.copy(piece.p);
      transform.rotation.set(0, piece.heading || 0, 0);
      transform.scale.set(...piece.size);
      transform.updateMatrix();
      object.setMatrixAt(i, transform.matrix);
    });
    object.castShadow = castShadow;
    object.receiveShadow = true;
    group.add(object);
    return object;
  }

  // Barridos con peralte y bombeo: todas las capas siguen las mismas curvas.
  function sweep(name, profile, material, a = 0, b = length, skip = () => false, close = false) {
    const sectionFrames = frames.filter(f => f.s >= a && f.s <= b);
    const positions = [], indices = [], uv = [];
    sectionFrames.forEach(f => {
      profile.forEach(([offset, lift]) => {
        positions.push(...point(f, offset, lift).toArray());
        uv.push(f.s / 5, offset / 5);
      });
    });
    const n = profile.length;
    for (let i = 0; i < sectionFrames.length - 1; i++) {
      if (skip((sectionFrames[i].s + sectionFrames[i + 1].s) / 2)) continue;
      for (let j = 0; j < (close ? n : n - 1); j++) {
        const next = (j + 1) % n;
        const x = i * n + j, y = i * n + next, z = (i + 1) * n + j, w = (i + 1) * n + next;
        indices.push(x, y, z, y, w, z);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(name, geometry, material, false);
  }
  sweep('Base granular y bermas', [[-4.45, -0.13], [0, -0.13], [4.45, -0.13]], shoulderMaterial, 0, length, onBridge);
  sweep('Calzada asfaltada con curvas y peraltes', [[-3.5, 0.065], [0, 0.065], [3.5, 0.065]], asphalt);
  for (const side of [-1, 1]) {
    const center = side * 0.13;
    sweep('Doble eje amarillo', [[center - 0.045, 0.075], [center + 0.045, 0.075]], yellowPaint);
    const edge = side * 3.3;
    sweep('Marca de borde de calzada', [[edge - 0.055, 0.076], [edge + 0.055, 0.076]], whitePaint);
    const ditch = [[4.45, 0], [4.8, -0.65], [5.25, -0.65], [5.7, 0.05]].map(([o, y]) => [o * side, y]);
    if (side < 0) ditch.reverse();
    sweep('Cuneta revestida trapezoidal', ditch, drainConcrete, 0, length,
      s => onBridge(s) || culverts.some(c => Math.abs(c.s - s) < 2.4));
  }

  // Dos puentes cortos de losa sobre quebradas, con estribos y guardavías.
  bridges.forEach((b, index) => {
    const start = b.s - b.span / 2, end = b.s + b.span / 2;
    sweep(`Tablero del puente corto ${index + 1}`, [[-4.6, 0.025], [4.6, 0.025], [4.6, -1.25], [-4.6, -1.25]], drainConcrete, start, end, () => false, true);
    for (const offset of [-3.2, 3.2]) {
      sweep('Vigas del puente corto', [[offset - 0.25, -1.2], [offset + 0.25, -1.2], [offset + 0.25, -1.9], [offset - 0.25, -1.9]], drainConcrete, start, end, () => false, true);
    }
    for (const s of [start, end]) {
      const f = frameAt(s), heading = -Math.atan2(f.t.z, f.t.x);
      const baseY = Math.min(naturalHeight(f.p.x, f.p.z), f.p.y - 3.5) - 0.4;
      const height = f.p.y - 1.5 - baseY;
      box('Estribo de puente corto', [1.8, height, 9.4], v(f.p.x, baseY + height / 2, f.p.z), concrete, heading);
      box('Zapata de puente corto', [3, 0.65, 10.5], v(f.p.x, baseY - 0.3, f.p.z), concrete, heading);
    }
    // Agua y lecho del cauce por debajo del tablero.
    const positions = [], indices = [];
    for (let k = 0; k <= 42; k++) {
      const across = -42 + k * 2;
      const bend = Math.sin(across / 12) * 1.1;
      for (const edge of [-1.6, 1.6]) {
        const p = b.f.p.clone().addScaledVector(b.f.n, across).addScaledVector(b.f.t, bend + edge);
        p.y = Math.min(originalHeight(p.x, p.z) - 0.05, b.f.p.y - 9.35 + across * 0.015);
        positions.push(...p.toArray());
      }
      if (k < 42) { const a = k * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const water = new THREE.BufferGeometry();
    water.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    water.setIndex(indices);
    water.computeVertexNormals();
    const material = waterMaterial.clone();
    material.side = THREE.DoubleSide;
    mesh('Agua de quebrada bajo el puente', water, material, false);
  });

  // Tres alcantarillas dobles: tubos huecos, cabezales CON huecos y soleras.
  const pipeMaterial = concrete.clone();
  pipeMaterial.side = THREE.DoubleSide;
  const pipeOuter = new THREE.CylinderGeometry(0.92, 0.92, 16, 20, 1, true);
  const pipeInner = new THREE.CylinderGeometry(0.7, 0.7, 16, 20, 1, true);
  const pipeRing = new THREE.RingGeometry(0.7, 0.92, 24);
  const headShape = new THREE.Shape();
  headShape.moveTo(-2.5, -1.1);
  headShape.lineTo(2.5, -1.1); headShape.lineTo(2.5, 1.65); headShape.lineTo(-2.5, 1.65); headShape.closePath();
  for (const x of [-1.15, 1.15]) {
    const hole = new THREE.Path();
    hole.absarc(x, 0, 0.7, 0, Math.PI * 2, true);
    headShape.holes.push(hole);
  }
  const headGeometry = new THREE.ExtrudeGeometry(headShape, { depth: 0.4, bevelEnabled: false });
  culverts.forEach(c => {
    const f = c.f, heading = -Math.atan2(f.t.z, f.t.x);
    for (const shift of [-1.15, 1.15]) {
      const p = f.p.clone().addScaledVector(f.t, shift);
      p.y = f.p.y - 1.8;
      for (const geometry of [pipeOuter, pipeInner]) {
        const tube = mesh('Tubo hueco de alcantarilla', geometry, pipeMaterial, false);
        tube.position.copy(p);
        tube.quaternion.setFromUnitVectors(up, f.n);
      }
      for (const side of [-1, 1]) {
        const ring = mesh('Boca circular de alcantarilla', pipeRing, drainConcrete, false);
        ring.position.copy(p).addScaledVector(f.n, side * 8.03);
        ring.quaternion.setFromUnitVectors(v(0, 0, 1), f.n);
      }
    }
    for (const side of [-1, 1]) {
      const p = f.p.clone().addScaledVector(f.n, side * 8);
      p.y -= 1.8;
      const head = mesh('Cabezal perforado de alcantarilla doble', headGeometry, drainConcrete);
      head.position.copy(p); head.rotation.y = heading;
      const apron = f.p.clone().addScaledVector(f.n, side * 9.1);
      apron.y -= 2.85;
      box('Solera de salida de alcantarilla', [5.6, 0.18, 3.4], apron, concrete, heading);
      for (const sign of [-1, 1]) {
        const wing = p.clone().addScaledVector(f.t, sign * 2.7).addScaledVector(f.n, side * 1.2);
        wing.y -= 0.15;
        box('Aleta de alcantarilla', [0.3, 1.8, 2.8], wing, concrete, heading + sign * side * 0.25);
      }
    }
  });

  // Mampostería con juntas visibles y mechinales en dos tramos de contención.
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = stoneCanvas.height = 128;
  const ctx = stoneCanvas.getContext('2d');
  ctx.fillStyle = '#6c6d63'; ctx.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 8; row++) {
    for (let col = -1; col < 4; col++) {
      const shade = 128 + ((row * 13 + col * 7) % 28);
      ctx.fillStyle = `rgb(${shade},${shade},${shade - 7})`;
      ctx.fillRect(col * 40 + (row % 2) * 20 + 1, row * 16 + 1, 38, 14);
    }
  }
  const stoneMap = new THREE.CanvasTexture(stoneCanvas);
  stoneMap.wrapS = stoneMap.wrapT = THREE.RepeatWrapping;
  stoneMap.repeat.set(1.6, 1);
  stoneMap.colorSpace = THREE.SRGBColorSpace;
  const masonry = new THREE.MeshStandardMaterial({ color: 0xb5b2a1, map: stoneMap, roughness: 1 });
  walls.forEach(w => {
    for (let s = w.a; s <= w.b; s += 2) {
      if (onBridge(s)) continue;
      const f = frameAt(s), p = point(f, w.side * 5.75, -0.1);
      const bottom = Math.min(naturalHeight(p.x, p.z) - 0.4, p.y - 2.8);
      const heading = -Math.atan2(f.t.z, f.t.x);
      box('Muro de contención de mampostería', [2.02, p.y - bottom, 1.25], v(p.x, (p.y + bottom) / 2, p.z), masonry, heading);
      box('Coronación del muro', [2.04, 0.22, 1.45], p.clone().add(v(0, 0.11, 0)), concrete, heading);
      if (Math.round(s - w.a) % 4 === 0) {
        const a = point(f, w.side * 6.4, -1.5), b = a.clone().addScaledVector(f.n, w.side * 0.12);
        bar('Mechinal de drenaje del muro', a, b, 0.13, dark);
      }
    }
  });

  // Guardavías metálicos en el lado de caída y en ambos bordes de los puentes.
  const guardPosts = [], delineators = [];
  for (const side of [-1, 1]) {
    const lowerSide = s => {
      const f = frameAt(s), p = point(f, side * 12);
      return onBridge(s) || wallAt(s, side) || naturalHeight(p.x, p.z) < f.p.y - 2;
    };
    sweep('Guardavía metálico siguiendo las curvas', [[side * 4.2, 0.6], [side * 4.25, 0.73], [side * 4.2, 0.88]], guardMetal,
      0, length, s => !lowerSide(s));
    for (let s = 2; s < length - 2; s += 4) {
      const f = frameAt(s), heading = -Math.atan2(f.t.z, f.t.x);
      if (lowerSide(s)) guardPosts.push({ size: [0.1, 0.8, 0.12], p: point(f, side * 4.23, 0.35), heading });
      if (Math.round((s - 2) / 4) % 4 === 0 && !onBridge(s)) {
        delineators.push({ size: [0.12, 0.95, 0.16], p: point(f, side * 4.4, 0.45), heading });
      }
    }
  }
  instances('Postes de guardavías', cube, galvanized, guardPosts);
  instances('Hitos delineadores de curvas', cube, whitePaint, delineators);

  // Paneles de chevrón en las curvas cerradas.
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 128; signCanvas.height = 80;
  const signCtx = signCanvas.getContext('2d');
  signCtx.fillStyle = '#ebc551'; signCtx.fillRect(0, 0, 128, 80);
  signCtx.strokeStyle = '#20292b'; signCtx.lineWidth = 16;
  signCtx.beginPath(); signCtx.moveTo(30, 7); signCtx.lineTo(75, 40); signCtx.lineTo(30, 73); signCtx.stroke();
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const signMaterial = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.85, side: THREE.DoubleSide });
  for (const center of [length * 0.345, length * 0.64]) {
    for (let j = -2; j <= 2; j++) {
      const f = frameAt(center + j * 4), p = point(f, -4.5, 1.45);
      bar('Poste de señal de curva', point(f, -4.5, 0), p.clone().add(v(0, 0.25, 0)), 0.055, galvanized);
      const board = mesh('Señal de curva con chevrón', new THREE.PlaneGeometry(1.25, 0.8), signMaterial, false);
      board.position.copy(p); board.rotation.y = -Math.atan2(f.t.z, f.t.x);
    }
  }

  return {
    group, length, frames, bridges, culverts, walls, onBridge,
    homeDirection: v(0.5, 0.95, 1).normalize(),
    title: 'Carretera de montaña · Obras viales',
    description: 'Curvas, drenaje y contención · Modelo conceptual 3D'
  };
}
