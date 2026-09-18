# Pharma CAD Isometric

A client-side DXF → Three.js isometric viewer for injectable cGMP facility coordination. It classifies common pharma layers, renders utilities and boundaries as 3D systems, and provides X-Ray, layer isolation, exploded vertical coordination, and click inspection.

## Run locally

```bash
npm install
npm run dev
```

## Supported CAD workflow

Browsers do not have a permissive, production-grade open-source DWG parser. Use **AutoCAD/BricsCAD → Save As → DXF (ASCII)**, or connect a conversion service before parsing. A self-hosted open-source option is a small LibreCAD/ODA File Converter worker that accepts a DWG, converts it to ASCII DXF, and returns the DXF bytes; keep that service separate from the viewer and validate file size/type before passing the result into `parseDxf`.

The UI intentionally rejects DWG with an actionable instruction instead of silently failing.

## Architecture

- `src/lib/dxfEngine.js`: parse and normalize LINE, LWPOLYLINE, POLYLINE, CIRCLE, and basic INSERT metadata; map layer names to pharma systems.
- `src/components/CadViewer.jsx`: scene lifecycle, OrthographicCamera, fixed isometric OrbitControls, optimized per-entity meshes.
- `src/App.jsx`: execution-team control panel, visibility, X-Ray, exploded vertical systems, selection inspector.

## Layer conventions

Layer classification is case-insensitive and regex-based. Extend `RULES` in `src/lib/dxfEngine.js` for project standards such as `GRADEC_WALL`, `FF_EQUIP`, or `AHU-03`. In a regulated workflow, prefer an explicit project layer mapping file over heuristics and retain the original layer name in every exported coordination record.

## Deployment

1. Create a GitHub repository named `pharma-cad-isometric`.
2. Push this folder to the `main` branch.
3. The included workflow builds and deploys to GitHub Pages. In repository settings, set Pages source to **GitHub Actions**.
4. For Vercel, import the repository; its default Vite build settings work. The Vite base path is `/` on Vercel and `/pharma-cad-isometric/` in GitHub Actions.

This viewer is for design coordination and execution readability; verify dimensions, pressure cascades, materials, and GMP release status against approved discipline models and drawings.
