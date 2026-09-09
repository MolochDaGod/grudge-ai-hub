#!/usr/bin/env bash
# Grudge play env — run on local agent, coder.grudge-studio.com, or a Linux shell.
# Browser Legion cannot npm install (nodeRunner=false). Use this when you have Node.

set -euo pipefail

SLUG="${1:-grudge-play}"
ROOT="${2:-$PWD/$SLUG}"

echo "==> $SLUG  three@0.185 + rapier@0.19 + puter.js"
mkdir -p "$ROOT/src" "$ROOT/scripts" "$ROOT/public"
cd "$ROOT"

if [[ ! -f package.json ]]; then
  cat > package.json <<'JSON'
{
  "name": "grudge-play",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": {
    "three": "0.185.0",
    "@dimforge/rapier3d-compat": "^0.19.0"
  },
  "devDependencies": { "vite": "^6.2.0" }
}
JSON
fi

if [[ ! -f index.html ]]; then
  cat > index.html <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Grudge Play</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>html,body,#app{margin:0;height:100%;background:#0b0b0f}</style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
HTML
fi

if [[ ! -f src/main.js ]]; then
  cat > src/main.js <<'JS'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

const app = document.getElementById('app')
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
app.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b0b0f)
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200)
camera.position.set(4, 3, 6)
camera.lookAt(0, 1, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const sun = new THREE.DirectionalLight(0xff8a3d, 1.1)
sun.position.set(6, 10, 4)
scene.add(sun)

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(20, 0.2, 20),
  new THREE.MeshStandardMaterial({ color: 0x1a1a22 })
)
ground.position.y = -0.1
scene.add(ground)

const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.35, 1.1, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0xff6a00 })
)
body.position.set(0, 1.1, 0)
scene.add(body)

await RAPIER.init()
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1, 10))
const capsule = world.createCollider(
  RAPIER.ColliderDesc.capsule(0.55, 0.35).setTranslation(0, 1.1, 0)
)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

function tick() {
  world.step()
  const t = capsule.translation()
  body.position.set(t.x, t.y, t.z)
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}
tick()

console.info('[grudge-play] three', THREE.REVISION, 'rapier ready')
JS
fi

npm install
echo "==> npm run dev"
echo "    then deploy folder to Puter /grudge-studio/$SLUG → *.puter.site"
echo "    Legion attach: director + animator @ https://ai.grudge-studio.com"
