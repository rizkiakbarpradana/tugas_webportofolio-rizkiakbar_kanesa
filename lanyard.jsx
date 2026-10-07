import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import profilePhotoUrl from './foto-saya.jpeg';
import './style.css';

const CARD_ASPECT = 1.46;
const STRAP_SEGMENTS = 24;

function getGreeting() {
  const hour = new Date().getHours();
  const text = hour < 12
    ? 'Good morning'
    : hour < 17
      ? 'Good afternoon'
      : hour < 21
        ? 'Good evening'
        : 'Good night';

  return `${text} ${hour < 17 ? '☀️' : '🌙'}`;
}

function createLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;

  const context = canvas.getContext('2d');
  if (!context) {
    console.error('Could not create the ID card label texture.');
    return null;
  }

  context.fillStyle = 'rgba(17, 24, 39, 0.42)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0, 0, 0, 0.8)';
  context.shadowBlur = 12;
  context.font = '700 72px system-ui, sans-serif';
  context.fillText('Malang, Indonesia', canvas.width / 2, canvas.height / 2, canvas.width - 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStrapTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;

  const context = canvas.getContext('2d');
  if (!context) {
    console.error('Could not create the ID lanyard texture.');
    return null;
  }

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#111925');
  gradient.addColorStop(0.22, '#26364a');
  gradient.addColorStop(0.5, '#34475e');
  gradient.addColorStop(0.78, '#243449');
  gradient.addColorStop(1, '#111925');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(255, 255, 255, 0.14)';
  context.fillRect(0, 0, canvas.width, 10);
  context.fillRect(0, canvas.height - 10, canvas.width, 10);
  context.fillStyle = '#f8fafc';
  context.font = '700 112px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0, 0, 0, 0.8)';
  context.shadowBlur = 10;
  context.fillText('RIZKI AKBAR PRADANA', canvas.width / 2, canvas.height / 2, canvas.width - 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeStrapGeometry() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((STRAP_SEGMENTS + 1) * 2 * 3);
  const uvs = new Float32Array((STRAP_SEGMENTS + 1) * 2 * 2);
  const indices = [];

  for (let index = 0; index < STRAP_SEGMENTS; index += 1) {
    const start = index * 2;
    indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function makeCardGeometry() {
  const shape = new THREE.Shape();
  const halfWidth = 0.5;
  const halfHeight = CARD_ASPECT / 2;
  const radius = 0.055;

  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    depth: 0.03,
    steps: 1
  });
  geometry.translate(0, 0, -0.03);
  return geometry;
}

// Jarak kartu dari atas hero (px). HARUS sama dengan padding-top hero di CSS (blok FINAL HERO FIX).
const TOP_DESKTOP = 170;
const TOP_MOBILE = 196;

// Lebar kartu (px) menurut lebar layar. Nilai yang sama dipakai di CSS (padding-top hero HP/tablet).
function getCardWidthPixels(heroHeight) {
  const vw = window.innerWidth;
  if (vw <= 480) return Math.min(vw * 0.5, 180);
  if (vw < 861) return Math.min(vw * 0.42, 220);

  const base = Math.min(Math.max(vw * 0.2, 220), 300);
  // Di laptop: batasi supaya kartu selalu muat di dalam tinggi hero (tidak terpotong).
  const fit = (heroHeight - TOP_DESKTOP - 40) / CARD_ASPECT;
  return Math.max(200, Math.min(base, fit));
}

function LanyardScene() {
  const cardRef = useRef(null);
  const strapRef = useRef(null);
  const drag = useRef({
    active: false,
    moved: false,
    offset: new THREE.Vector3(),
    previous: new THREE.Vector3()
  });
  const velocity = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const strapGeometry = useMemo(makeStrapGeometry, []);
  const cardGeometry = useMemo(makeCardGeometry, []);
  const labelTexture = useMemo(createLabelTexture, []);
  const strapTexture = useMemo(createStrapTexture, []);
  const photoTexture = useLoader(THREE.TextureLoader, profilePhotoUrl);
  const { camera, size, viewport } = useThree();

  photoTexture.colorSpace = THREE.SRGBColorSpace;
  photoTexture.wrapS = THREE.ClampToEdgeWrapping;
  photoTexture.wrapT = THREE.ClampToEdgeWrapping;
  photoTexture.center.set(0.5, 0.5);

  const getLayout = () => {
    const pixelsPerUnit = size.height / viewport.height;
    const width = getCardWidthPixels(size.height) / pixelsPerUnit;
    const height = width * CARD_ASPECT;
    const topPixels = window.innerWidth <= 860 ? TOP_MOBILE : TOP_DESKTOP;
    const x = window.innerWidth >= 861 ? viewport.width * 0.22 : 0;
    const y = viewport.height / 2 - (topPixels + (height * pixelsPerUnit) / 2) / pixelsPerUnit;

    return { width, height, x, y, pixelsPerUnit };
  };

  useEffect(() => {
  const imageAspect = photoTexture.image.width / photoTexture.image.height;
  const photoAspect = 0.91 / 1.1;

  if (imageAspect > photoAspect) {
    photoTexture.repeat.set(photoAspect / imageAspect, 1);
  } else {
    photoTexture.repeat.set(1, imageAspect / photoAspect);
  }
  // Rata atas supaya kepala tidak terpotong; kelebihan dipotong dari bawah.
  photoTexture.offset.set((1 - photoTexture.repeat.x) / 2, (1 - photoTexture.repeat.y) * 0.85);

  photoTexture.needsUpdate = true;
}, [photoTexture]);
  
  useEffect(() => () => {
    strapGeometry.dispose();
    cardGeometry.dispose();
    labelTexture?.dispose();
    strapTexture?.dispose();
  }, [cardGeometry, labelTexture, strapGeometry, strapTexture]);

  useFrame((_, delta) => {
    if (!cardRef.current || !strapRef.current) return;

    const card = cardRef.current;
    const { width, height, x, y, pixelsPerUnit } = getLayout();
    const step = Math.min(delta, 0.04);
    const cardHeight = width * CARD_ASPECT;

    card.scale.set(width, width, width * 0.65);
    target.current.set(x, y, 0);

    if (!drag.current.active) {
      velocity.current.x += (target.current.x - card.position.x) * 19 * step;
      velocity.current.y += (target.current.y - card.position.y) * 19 * step;
      velocity.current.multiplyScalar(Math.exp(-4.8 * step));
      card.position.addScaledVector(velocity.current, step);
      card.rotation.z += (-velocity.current.x * 0.035 - card.rotation.z) * Math.min(1, step * 5);
      card.rotation.x += (velocity.current.y * 0.018 - card.rotation.x) * Math.min(1, step * 4);
      card.rotation.y += (-velocity.current.x * 0.012 - card.rotation.y) * Math.min(1, step * 4);
    }

    const anchor = new THREE.Vector3(x, viewport.height / 2 + 0.22, 0.08);
    const end = new THREE.Vector3(0, width * 0.76, 0).applyQuaternion(card.quaternion).add(card.position);
    const distance = Math.max(0.1, anchor.y - end.y);
    const sway = THREE.MathUtils.clamp(velocity.current.x * 0.16, -width * 0.9, width * 0.9);
    const control1 = new THREE.Vector3(anchor.x + sway, anchor.y - distance * 0.35, 0.08);
    const control2 = new THREE.Vector3(end.x - sway * 0.42, end.y + distance * 0.28, 0.08);
    const positions = strapGeometry.attributes.position.array;
    const strapWidth = width * 0.11;

    for (let index = 0; index <= STRAP_SEGMENTS; index += 1) {
      const t = index / STRAP_SEGMENTS;
      const inverse = 1 - t;
      const point = new THREE.Vector3()
        .addScaledVector(anchor, inverse ** 3)
        .addScaledVector(control1, 3 * inverse ** 2 * t)
        .addScaledVector(control2, 3 * inverse * t ** 2)
        .addScaledVector(end, t ** 3);
      const tangent = new THREE.Vector3()
        .subVectors(end, anchor)
        .normalize();
      const side = new THREE.Vector3(tangent.y, -tangent.x, 0).normalize().multiplyScalar(strapWidth / 2);
      const offset = index * 6;
      const uvOffset = index * 4;

      positions[offset] = point.x + side.x;
      positions[offset + 1] = point.y + side.y;
      positions[offset + 2] = point.z;
      positions[offset + 3] = point.x - side.x;
      positions[offset + 4] = point.y - side.y;
      positions[offset + 5] = point.z;
      strapGeometry.attributes.uv.array[uvOffset] = t;
      strapGeometry.attributes.uv.array[uvOffset + 1] = 0;
      strapGeometry.attributes.uv.array[uvOffset + 2] = t;
      strapGeometry.attributes.uv.array[uvOffset + 3] = 1;
    }

    strapGeometry.attributes.position.needsUpdate = true;
    strapGeometry.attributes.uv.needsUpdate = true;
    strapGeometry.computeVertexNormals();

    const greeting = document.getElementById('profileGreeting');
    if (greeting) {
      const greetingPosition = new THREE.Vector3(card.position.x, card.position.y + height / 2 + 0.24, 0);
      greetingPosition.project(camera);
      greeting.style.left = `${(greetingPosition.x + 1) * size.width / 2}px`;
      greeting.style.top = `${(1 - greetingPosition.y) * size.height / 2}px`;
    }

    const halfWidth = viewport.width / 2 - width / 2;
    const halfHeight = viewport.height / 2 - height / 2;
    card.position.x = THREE.MathUtils.clamp(card.position.x, -halfWidth, halfWidth);
    card.position.y = THREE.MathUtils.clamp(card.position.y, -halfHeight, halfHeight);
  });

  const startDrag = (event) => {
    event.stopPropagation();
    event.target.setPointerCapture?.(event.pointerId);
    document.body.style.cursor = 'grabbing';
    drag.current.active = true;
    drag.current.moved = false;
    drag.current.offset.copy(cardRef.current.position).sub(event.point);
    drag.current.previous.copy(cardRef.current.position);
    velocity.current.set(0, 0, 0);
  };

  const moveDrag = (event) => {
    if (!drag.current.active || !cardRef.current) return;
    event.stopPropagation();

    const next = event.point.clone().add(drag.current.offset);
    const { width } = getLayout();
    const halfWidth = viewport.width / 2 - width / 2;
    const halfHeight = viewport.height / 2 - (width * CARD_ASPECT) / 2;
    next.x = THREE.MathUtils.clamp(next.x, -halfWidth, halfWidth);
    next.y = THREE.MathUtils.clamp(next.y, -halfHeight, halfHeight);
    drag.current.moved ||= next.distanceTo(drag.current.previous) > 0.04;
    velocity.current.copy(next).sub(drag.current.previous).multiplyScalar(18);
    cardRef.current.position.copy(next);
    drag.current.previous.copy(next);
  };

  const finishDrag = (event) => {
    if (!drag.current.active) return;
    event.stopPropagation();
    event.target.releasePointerCapture?.(event.pointerId);
    drag.current.active = false;
    document.body.style.cursor = '';

    if (!drag.current.moved) {
      window.dispatchEvent(new Event('profile-card-click'));
    }
  };

  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight position={[-3, 5, 7]} intensity={2.4} />
      <directionalLight position={[4, -2, 4]} intensity={0.65} />
      <mesh ref={strapRef} geometry={strapGeometry} frustumCulled={false}>
        <meshStandardMaterial map={strapTexture} roughness={0.48} metalness={0.18} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.16]} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial />
      </mesh>
      <group
        ref={cardRef}
      >
        <mesh
          position={[0, 0, 0.11]}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <planeGeometry args={[1.5, 1.8]} />
          <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
        </mesh>
        <mesh geometry={cardGeometry} castShadow>
          <meshStandardMaterial color="#f4f5f7" roughness={0.28} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.1, 0.016]}>
          <planeGeometry args={[0.91, 1.1]} />
          <meshBasicMaterial map={photoTexture} toneMapped={false} />
        </mesh>
        {labelTexture && (
          <mesh position={[0, -0.565, 0.017]}>
            <planeGeometry args={[0.91, 0.22]} />
            <meshBasicMaterial map={labelTexture} transparent toneMapped={false} />
          </mesh>
        )}
        <mesh position={[0, 0.755, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.105, 0.018, 8, 24]} />
          <meshStandardMaterial color="#aab4c0" roughness={0.24} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.69, 0.046]}>
          <boxGeometry args={[0.2, 0.08, 0.045]} />
          <meshStandardMaterial color="#c4ccd5" roughness={0.25} metalness={0.8} />
        </mesh>
      </group>
    </>
  );
}

function LanyardCard() {
  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    const interval = window.setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      <Canvas
        aria-label="Rizki Akbar Pradana's 3D profile ID card with Malang, Indonesia. Drag to move."
        camera={{ position: [0, 0, 10], fov: 50 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
        fallback={<div className="profile-card-fallback">3D ID card is not available in this browser.</div>}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.domElement.setAttribute('tabindex', '0');
        }}
      >
        <Suspense fallback={null}>
          <LanyardScene />
        </Suspense>
      </Canvas>
      <div id="profileGreeting" className="profile-greeting" role="status" aria-live="polite">
        <span>{greeting}</span>
      </div>
    </>
  );
}

class CardBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('ID card gagal dirender:', error); }
  render() {
    return this.state.failed
      ? <div className="profile-card-fallback">Kartu 3D tidak bisa dimuat.</div>
      : this.props.children;
  }
}

const root = document.getElementById('profileCard');
if (root) createRoot(root).render(<CardBoundary><LanyardCard /></CardBoundary>);


