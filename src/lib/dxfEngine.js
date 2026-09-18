import DxfParser from 'dxf-parser';

const DEFAULT = { kind: 'other', label: 'Other', color: '#94a3b8', height: 0.18, width: 0.05, opacity: 0.9, visible: true };
const RULES = [
  { re: /(WFI|WATER.*INJ|LOOP.*WFI)/i, kind: 'wfi', label: 'WFI', color: '#39bdf8', height: 0.35, width: 0.12, opacity: 1 },
  { re: /(PW|PURIFIED.*WATER)/i, kind: 'pw', label: 'PW', color: '#7dd3fc', height: 0.3, width: 0.1, opacity: 1 },
  { re: /(HVAC|DUCT|SUPPLY.*AIR|RETURN.*AIR)/i, kind: 'hvac', label: 'HVAC', color: '#a8b0ba', height: 0.55, width: 0.35, opacity: 0.42 },
  { re: /(CLEAN.?ROOM|GRADE.?[ABC]|PRESSURE|AIRLOCK|MATERIAL.?AIRLOCK|PALLET.?AIRLOCK)/i, kind: 'cleanroom', label: 'Cleanroom boundaries', color: '#39d98a', height: 3.0, width: 0.16, opacity: 0.32 },
  { re: /(EQUIP|EQUIPMENT|ISOLATOR|FILL|FILL.?FINISH|LYOPH|VIAL|WASHER)/i, kind: 'equipment', label: 'Equipment', color: '#ffb454', height: 1.4, width: 0.15, opacity: 0.95 },
  { re: /(PIP(E|ES)|PROCESS|UTILITY)/i, kind: 'pipes', label: 'Process / Pipes', color: '#c0c8d2', height: 0.25, width: 0.08, opacity: 1 },
  { re: /(ROOF|CEILING|HEPA|FILTER)/i, kind: 'roof', label: 'Ceiling / HEPA', color: '#8b5cf6', height: 0.16, width: 0.1, opacity: 0.28 }
];

export function mapLayer(layerName = '') { return RULES.find((r) => r.re.test(layerName)) ?? { ...DEFAULT, label: layerName || '0' }; }

function point(v) { return { x: Number(v?.x ?? 0), y: Number(v?.y ?? 0), z: Number(v?.z ?? 0) }; }
function sampledCircle(e) { const c = point(e.center); const r = Number(e.radius ?? 1); const n = Math.max(16, Math.min(96, Math.ceil(r * 2))); return Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * Math.PI * 2; return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, z: 0 }; }); }

export function parseDxf(text) {
  const parser = new DxfParser();
  const dxf = parser.parseSync(text);
  const entities = (dxf.entities ?? []).map((e, index) => {
    const layer = e.layer || '0';
    const points = e.type === 'LINE' ? [point(e.start), point(e.end)]
      : (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') ? (e.vertices ?? []).map(point)
      : e.type === 'CIRCLE' ? sampledCircle(e)
      : e.type === 'INSERT' ? [point(e.position || e.start)] : [];
    const blockName = e.name || e.block || e.text || e.type;
    const mapping = mapLayer(layer);
    return { id: `${layer}:${index}`, type: e.type, layer, points, blockName, attributes: e.attribs ?? e.attributes ?? [], mapping: e.type === 'INSERT' && mapping.kind === 'other' ? { ...mapping, kind: 'equipment', label: 'Equipment', color: '#ffb454', height: 1.4, width: 0.15, opacity: 0.95 } : mapping };
  }).filter((e) => e.points.length >= 2 || e.type === 'INSERT');
  return { header: dxf.header ?? {}, layers: dxf.tables?.layer?.layers ?? {}, entities };
}

export function layerSummary(model) {
  return [...new Set(model.entities.map((e) => e.layer))].map((layer) => ({ layer, mapping: mapLayer(layer), count: model.entities.filter((e) => e.layer === layer).length }));
}
