import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const ISO_POLAR = Math.acos(1 / Math.sqrt(3));
const ISO_AZIMUTH = -Math.PI / 4;

function mat(mapping, xray) { return new THREE.MeshStandardMaterial({ color: mapping.color, transparent: xray || mapping.opacity < 1, opacity: xray ? Math.min(mapping.opacity, 0.16) : mapping.opacity, roughness: 0.72, metalness: mapping.kind === 'wfi' || mapping.kind === 'pw' ? 0.55 : 0.05, depthWrite: !xray }); }
function segmentMesh(a, b, mapping, xray) {
  const A = new THREE.Vector3(a.x, a.y, 0), B = new THREE.Vector3(b.x, b.y, 0), d = B.clone().sub(A), len = d.length();
  if (len < 1e-5) return null;
  const group = new THREE.Group(); group.position.copy(A.clone().add(B).multiplyScalar(0.5));
  if (mapping.kind === 'wfi' || mapping.kind === 'pw' || mapping.kind === 'pipes') {
    const geo = new THREE.CylinderGeometry(mapping.width, mapping.width, len, 10);
    const mesh = new THREE.Mesh(geo, mat(mapping, xray)); mesh.rotation.z = Math.PI / 2; mesh.rotation.y = Math.atan2(d.y, d.x); group.add(mesh);
  } else {
    const geo = new THREE.BoxGeometry(len, mapping.width, mapping.height); const mesh = new THREE.Mesh(geo, mat(mapping, xray)); mesh.rotation.z = Math.atan2(d.y, d.x); mesh.position.z = mapping.height / 2; group.add(mesh);
  }
  return group;
}

export default function CadViewer({ model, visibility, xray, explode, onSelect }) {
  const host = useRef(null); const root = useRef(null); const state = useRef({});
  useEffect(() => {
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b1117');
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x16202a, 2)); const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(30, -20, 50); scene.add(key);
    const grid = new THREE.GridHelper(200, 100, 0x334155, 0x17212b); grid.rotation.x = Math.PI / 2; grid.position.z = -0.02; scene.add(grid);
    const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 1000); camera.position.set(30, -30, 30); camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; host.current.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.enableRotate = true; controls.minPolarAngle = ISO_POLAR - 0.02; controls.maxPolarAngle = ISO_POLAR + 0.02; controls.minAzimuthAngle = ISO_AZIMUTH - 0.02; controls.maxAzimuthAngle = ISO_AZIMUTH + 0.02; controls.enablePan = true;
    state.current = { scene, camera, renderer, controls, grid };
    const resize = () => { const { width, height } = host.current.getBoundingClientRect(); const aspect = width / Math.max(height, 1); const frustum = 25; camera.left = -frustum * aspect; camera.right = frustum * aspect; camera.top = frustum; camera.bottom = -frustum; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); }; resize(); window.addEventListener('resize', resize);
    const tick = () => { controls.update(); renderer.render(scene, camera); state.current.raf = requestAnimationFrame(tick); }; tick();
    const click = (ev) => { if (!root.current) return; const r = renderer.domElement.getBoundingClientRect(); const mouse = new THREE.Vector2(((ev.clientX-r.left)/r.width)*2-1, -((ev.clientY-r.top)/r.height)*2+1); const ray = new THREE.Raycaster(); ray.setFromCamera(mouse, camera); const hit = ray.intersectObjects(root.current.children, true)[0]; if (hit?.object?.userData?.entity) onSelect?.(hit.object.userData.entity); }; renderer.domElement.addEventListener('click', click);
    return () => { cancelAnimationFrame(state.current.raf); window.removeEventListener('resize', resize); renderer.domElement.removeEventListener('click', click); controls.dispose(); renderer.dispose(); host.current?.removeChild(renderer.domElement); };
  }, [onSelect]);

  useEffect(() => {
    const { scene } = state.current; if (!scene) return; if (root.current) scene.remove(root.current); root.current = new THREE.Group();
    if (!model) return;
    const bounds = new THREE.Box3();
    for (const entity of model.entities) {
      const m = entity.mapping; if (!visibility[m.kind]) continue;
      const group = new THREE.Group(); group.userData.entity = entity;
      const z = (explode[m.kind] ?? 0) + (m.kind === 'equipment' ? 0.1 : 0);
      if (entity.type === 'INSERT') {
        const geo = new THREE.BoxGeometry(1.8, 1.2, m.height);
        const mesh = new THREE.Mesh(geo, mat(m, xray));
        mesh.position.set(entity.points[0].x, entity.points[0].y, z + m.height / 2);
        mesh.userData.entity = entity; group.add(mesh);
      } else {
        for (let i=0;i<entity.points.length-1;i++) {
          const child = segmentMesh(entity.points[i], entity.points[i+1], m, xray);
          if (child) { child.position.z += z; child.userData.entity = entity; group.add(child); }
        }
      }
      if (group.children.length) { root.current.add(group); group.traverse(o => { if (o.isMesh) bounds.expandByObject(o); }); }
    }
    scene.add(root.current); if (!bounds.isEmpty()) { const c = bounds.getCenter(new THREE.Vector3()); const size = bounds.getSize(new THREE.Vector3()); const max = Math.max(size.x, size.y, 1); state.current.camera.position.set(c.x + max, c.y - max, c.z + max); state.current.camera.lookAt(c); state.current.controls.target.copy(c); state.current.camera.zoom = Math.min(2.4, 32 / max); state.current.camera.updateProjectionMatrix(); }
  }, [model, visibility, xray, explode]);
  return <div className="viewer" ref={host}><div className="view-badge">ORTHOGRAPHIC · ISO 30°/45°</div>{!model && <div className="empty"><div className="empty-title">Drop a DXF to begin</div><div>Execution view is normalized to drawing extents.</div></div>}</div>;
}
