"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GARDEN_PHOTOS, type GardenPhotoItem } from "@/data/gardenGallery";

export interface GardenControls {
  forward: boolean;
  backward: boolean;
  lookLeft: boolean;
  lookRight: boolean;
  autoStroll: boolean;
}

interface GardenCanvasProps {
  controls: GardenControls;
  reducedMotion: boolean;
  onSelectPhoto: (item: GardenPhotoItem) => void;
  onProgressChange: (progress: number, nearestPhotoIndex: number) => void;
  onInteraction: () => void;
  onFatalError: () => void;
}

interface FrameRecord {
  root: THREE.Group;
  photo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  backing: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  borderTop: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  borderBottom: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  borderLeft: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  borderRight: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  hitTarget: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  cords: Array<THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>>;
  rings: Array<THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>>;
  glowMaterial: THREE.SpriteMaterial;
  phase: number;
  z: number;
  item: GardenPhotoItem;
}

const clamp = THREE.MathUtils.clamp;

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeCanvasTexture(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D, random: () => number) => void,
  seed = 7,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  draw(context, seededRandom(seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeCobblestoneTexture(kind: "color" | "bump" | "roughness") {
  return makeCanvasTexture(
    768,
    768,
    (context, random) => {
      const background = kind === "color" ? "#a48a75" : kind === "bump" ? "#555555" : "#d4d4d4";
      context.fillStyle = background;
      context.fillRect(0, 0, 768, 768);

      const rows = 10;
      const rowHeight = 768 / rows;
      for (let row = 0; row < rows; row += 1) {
        const offset = row % 2 === 0 ? -45 : 0;
        let x = offset;
        while (x < 768) {
          const stoneWidth = 100 + random() * 75;
          const inset = 5 + random() * 4;
          const y = row * rowHeight + inset;
          const height = rowHeight - inset * 2;
          const radius = 9 + random() * 10;
          context.beginPath();
          context.roundRect(x + inset, y, stoneWidth - inset * 2, height, radius);
          if (kind === "color") {
            const lightness = 54 + Math.floor(random() * 15);
            const hue = 24 + Math.floor(random() * 12);
            context.fillStyle = `hsl(${hue} 22% ${lightness}%)`;
            context.shadowColor = "rgba(55, 36, 30, 0.42)";
            context.shadowBlur = 6;
            context.shadowOffsetY = 3;
          } else if (kind === "bump") {
            const shade = 132 + Math.floor(random() * 68);
            context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
          } else {
            const shade = 175 + Math.floor(random() * 62);
            context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
          }
          context.fill();
          context.shadowColor = "transparent";

          if (kind === "color") {
            context.strokeStyle = "rgba(255, 238, 211, 0.24)";
            context.lineWidth = 2;
            context.stroke();
            for (let grain = 0; grain < 12; grain += 1) {
              const gx = x + inset + random() * Math.max(1, stoneWidth - inset * 2);
              const gy = y + random() * height;
              context.fillStyle = random() > 0.5 ? "#fff0d018" : "#4b302318";
              context.fillRect(gx, gy, 2 + random() * 3, 1 + random() * 2);
            }
          }
          x += stoneWidth;
        }
      }
    },
    kind === "color" ? 11 : kind === "bump" ? 12 : 13,
  );
}

function makeGrassTexture() {
  return makeCanvasTexture(512, 512, (context, random) => {
    const gradient = context.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, "#334d2f");
    gradient.addColorStop(0.5, "#53623b");
    gradient.addColorStop(1, "#253b2a");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    for (let index = 0; index < 8_000; index += 1) {
      const x = random() * 512;
      const y = random() * 512;
      const green = 55 + Math.floor(random() * 65);
      context.strokeStyle = `rgba(${40 + Math.floor(random() * 30)}, ${green}, ${35 + Math.floor(random() * 25)}, ${0.16 + random() * 0.3})`;
      context.lineWidth = 0.5 + random();
      context.beginPath();
      context.moveTo(x, y + 3);
      context.lineTo(x + (random() - 0.5) * 2, y - random() * 5);
      context.stroke();
    }
  }, 21);
}

function makeWoodTexture() {
  return makeCanvasTexture(384, 768, (context, random) => {
    const gradient = context.createLinearGradient(0, 0, 384, 0);
    gradient.addColorStop(0, "#4b3026");
    gradient.addColorStop(0.45, "#76513a");
    gradient.addColorStop(0.7, "#5c3b2d");
    gradient.addColorStop(1, "#3b2722");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 384, 768);
    for (let line = 0; line < 150; line += 1) {
      const x = random() * 384;
      context.strokeStyle = random() > 0.35 ? "#d9a46a18" : "#1f120d28";
      context.lineWidth = 0.5 + random() * 2;
      context.beginPath();
      context.moveTo(x, 0);
      for (let y = 0; y <= 768; y += 28) {
        context.lineTo(x + Math.sin(y * 0.025 + line) * (2 + random() * 4), y);
      }
      context.stroke();
    }
  }, 31);
}

function makeHaloTexture(color: string) {
  return makeCanvasTexture(128, 128, (context) => {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.18, `${color}cc`);
    gradient.addColorStop(0.48, `${color}42`);
    gradient.addColorStop(1, `${color}00`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  });
}

function makePetalTexture() {
  return makeCanvasTexture(128, 128, (context) => {
    context.translate(64, 64);
    context.rotate(-0.35);
    const gradient = context.createRadialGradient(-12, -16, 3, 0, 0, 49);
    gradient.addColorStop(0, "#fff6ee");
    gradient.addColorStop(0.35, "#f7b8bd");
    gradient.addColorStop(1, "#bd657e00");
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, 42);
    context.bezierCurveTo(-48, 18, -45, -35, 0, -44);
    context.bezierCurveTo(45, -35, 48, 18, 0, 42);
    context.fill();
  });
}

function makeFallbackPhoto(item: GardenPhotoItem) {
  return makeCanvasTexture(700, 860, (context) => {
    const gradient = context.createLinearGradient(0, 0, 700, 860);
    gradient.addColorStop(0, "#fffaf0");
    gradient.addColorStop(0.55, "#f6dfcf");
    gradient.addColorStop(1, "#e6b4ad");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 700, 860);

    context.strokeStyle = "#c69655";
    context.lineWidth = 12;
    context.strokeRect(30, 30, 640, 800);
    context.strokeStyle = "#fff8e4";
    context.lineWidth = 4;
    context.strokeRect(48, 48, 604, 764);

    context.fillStyle = "#b8787b";
    for (const [x, y, rotation] of [
      [95, 105, -0.6],
      [610, 110, 0.6],
      [100, 755, -2.3],
      [605, 750, 2.3],
    ] as const) {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      for (let petal = 0; petal < 7; petal += 1) {
        context.rotate((Math.PI * 2) / 7);
        context.beginPath();
        context.ellipse(0, -18, 10, 23, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#a97945";
    context.font = "86px Georgia, serif";
    context.fillText("♡", 350, 322);
    context.direction = "rtl";
    context.fillStyle = "#76504c";
    context.font = "700 48px Amiri, serif";
    context.fillText("صورة قادمة قريبا", 350, 460);
    context.font = "32px Amiri, serif";
    context.fillStyle = "#9e7065";
    context.fillText(item.caption ?? "ذكرى جميلة", 350, 548);
    context.direction = "ltr";
    context.font = "700 34px Georgia, serif";
    context.fillStyle = "#b18452";
    context.fillText(String(item.id).padStart(2, "0"), 350, 690);
  }, item.id + 100);
}

function makePlaqueTexture() {
  return makeCanvasTexture(1200, 520, (context) => {
    const gradient = context.createLinearGradient(0, 0, 1200, 520);
    gradient.addColorStop(0, "#6c442c");
    gradient.addColorStop(0.45, "#b48249");
    gradient.addColorStop(0.55, "#c69a5b");
    gradient.addColorStop(1, "#62402d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 520);
    context.strokeStyle = "#ffe6a4";
    context.lineWidth = 18;
    context.strokeRect(28, 28, 1144, 464);
    context.strokeStyle = "#6d432d";
    context.lineWidth = 4;
    context.strokeRect(50, 50, 1100, 420);
    context.direction = "rtl";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff7df";
    context.shadowColor = "#4c291e";
    context.shadowBlur = 12;
    const message =
      "في الختام يا مبدأي و منتهاي، اتمنى الرحلة تكون عجبتك و اتمنى اكون عملت شي يليق بجمالك و قلبك الحلو حبيبي و تذكري دايما حبيب قلبي انا الحلو ما يليق بيه إلا حلو و الغالي ما يليق بيه إلا الزين قلبي كل عام و قلبي بخير يا ناس و كل عام و دنيتي بخير يا ناس 🤍";
    const maxTextWidth = 1020;
    const maxTextHeight = 280;
    let fontSize = 42;
    let lineHeight = 0;
    let lines: string[] = [];

    while (true) {
      context.font = `700 ${fontSize}px Amiri, serif`;
      lines = [];
      let currentLine = "";

      for (const word of message.split(" ")) {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        if (currentLine && context.measureText(nextLine).width > maxTextWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = nextLine;
        }
      }

      if (currentLine) lines.push(currentLine);
      lineHeight = fontSize * 1.28;
      if (lines.length * lineHeight <= maxTextHeight || fontSize === 30) break;
      fontSize -= 2;
    }

    const firstLineY = 64 + (maxTextHeight - lines.length * lineHeight) / 2 + lineHeight / 2;
    lines.forEach((line, index) => {
      context.fillText(line, 600, firstLineY + index * lineHeight, maxTextWidth);
    });
    context.direction = "ltr";
    context.font = "58px 'Aref Ruqaa', Amiri, serif";
    context.fillText("Mijo", 600, 408);
  });
}

function setShadow(object: THREE.Object3D, cast = true, receive = false) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

export default function GardenCanvas({
  controls,
  reducedMotion,
  onSelectPhoto,
  onProgressChange,
  onInteraction,
  onFatalError,
}: GardenCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef(controls);
  const reducedMotionRef = useRef(reducedMotion);
  const selectPhotoRef = useRef(onSelectPhoto);
  const progressRef = useRef(onProgressChange);
  const interactionRef = useRef(onInteraction);
  const fatalErrorRef = useRef(onFatalError);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    selectPhotoRef.current = onSelectPhoto;
    progressRef.current = onProgressChange;
    interactionRef.current = onInteraction;
    fatalErrorRef.current = onFatalError;
  }, [onFatalError, onInteraction, onProgressChange, onSelectPhoto]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let animationFrame = 0;
    let disposed = false;
    const textures = new Set<THREE.Texture>();
    const frameRecords: FrameRecord[] = [];
    const clickTargets: THREE.Object3D[] = [];
    const eventCleanups: Array<() => void> = [];

    const trackTexture = <T extends THREE.Texture>(texture: T) => {
      textures.add(texture);
      return texture;
    };

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      eventCleanups.forEach((remove) => remove());

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene?.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
          if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) {
            geometries.add(object.geometry);
          }
          const objectMaterial = object.material;
          if (Array.isArray(objectMaterial)) {
            objectMaterial.forEach((material) => materials.add(material));
          } else if (objectMaterial instanceof THREE.Material) {
            materials.add(objectMaterial);
          }
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      textures.clear();

      if (renderer) {
        renderer.renderLists.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };

    try {
      const photoCount = GARDEN_PHOTOS.length;
      const pairCount = Math.max(1, Math.ceil(photoCount / 2));
      const frameSpacing = 4.25;
      const entranceZ = 4;
      const firstFrameZ = -5.5;
      const lastFrameZ = firstFrameZ - (pairCount - 1) * frameSpacing;
      const gazeboZ = lastFrameZ - 10;
      const minCameraZ = gazeboZ + 5;
      const worldNearZ = entranceZ + 7;
      const worldFarZ = gazeboZ - 10;
      const worldLength = worldNearZ - worldFarZ;
      const worldCenterZ = (worldNearZ + worldFarZ) / 2;

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.setAttribute("role", "application");
      renderer.domElement.setAttribute(
        "aria-label",
        "حديقة ثلاثية الأبعاد. اسحبي للتلفت واستخدمي أزرار الحركة للمشي.",
      );
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xd9a296);
      scene.fog = new THREE.FogExp2(0xc8978d, 0.0125);

      const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 260);
      camera.position.set(0, 1.65, entranceZ);
      camera.rotation.order = "YXZ";

      const skyMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          cream: { value: new THREE.Color(0xffe7b4) },
          peach: { value: new THREE.Color(0xe9a082) },
          rose: { value: new THREE.Color(0x98758e) },
        },
        vertexShader: `
          varying vec3 vDirection;
          void main() {
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 cream;
          uniform vec3 peach;
          uniform vec3 rose;
          varying vec3 vDirection;
          void main() {
            float heightMix = smoothstep(-0.08, 0.72, vDirection.y);
            vec3 horizon = mix(cream, peach, smoothstep(-0.04, 0.28, vDirection.y));
            vec3 sky = mix(horizon, rose, heightMix);
            vec3 sunDirection = normalize(vec3(0.0, 0.08, -1.0));
            float sunGlow = pow(max(dot(normalize(vDirection), sunDirection), 0.0), 78.0);
            float haze = pow(max(dot(normalize(vDirection), sunDirection), 0.0), 8.0);
            sky += vec3(1.0, 0.64, 0.32) * sunGlow * 1.8;
            sky += vec3(1.0, 0.36, 0.22) * haze * 0.2;
            gl_FragColor = vec4(sky, 1.0);
          }
        `,
      });
      const sky = new THREE.Mesh(new THREE.SphereGeometry(155, 40, 24), skyMaterial);
      scene.add(sky);

      const haloTexture = trackTexture(makeHaloTexture("#fff4b0"));
      const sunMaterial = new THREE.SpriteMaterial({
        map: haloTexture,
        color: 0xffc16f,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sun = new THREE.Sprite(sunMaterial);
      sun.position.set(0, 6.2, gazeboZ - 12);
      sun.scale.set(15, 15, 1);
      scene.add(sun);

      const hemisphere = new THREE.HemisphereLight(0xffd4a0, 0x4e4030, 2.45);
      scene.add(hemisphere);
      const sunlight = new THREE.DirectionalLight(0xffc47a, 3.25);
      sunlight.position.set(-9, 15, 9);
      sunlight.target.position.set(0, 0, worldCenterZ);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.set(2048, 2048);
      sunlight.shadow.camera.left = -18;
      sunlight.shadow.camera.right = 18;
      sunlight.shadow.camera.top = 22;
      sunlight.shadow.camera.bottom = -8;
      sunlight.shadow.camera.near = 1;
      sunlight.shadow.camera.far = 90;
      sunlight.shadow.bias = -0.00035;
      scene.add(sunlight, sunlight.target);

      const cameraLamp = new THREE.PointLight(0xffc982, 2.8, 12, 1.8);
      cameraLamp.position.set(0, 2.25, entranceZ - 1);
      scene.add(cameraLamp);

      const grassTexture = trackTexture(makeGrassTexture());
      grassTexture.wrapS = THREE.RepeatWrapping;
      grassTexture.wrapT = THREE.RepeatWrapping;
      grassTexture.repeat.set(12, Math.max(8, worldLength / 5));
      grassTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const groundGeometry = new THREE.PlaneGeometry(42, worldLength + 6, 42, 90);
      const groundPositions = groundGeometry.attributes.position as THREE.BufferAttribute;
      for (let index = 0; index < groundPositions.count; index += 1) {
        const x = groundPositions.getX(index);
        const z = groundPositions.getY(index);
        const edgeWeight = THREE.MathUtils.smoothstep(Math.abs(x), 2.5, 18);
        const height = -0.18 + edgeWeight * (Math.sin(x * 0.43) * 0.28 + Math.sin(z * 0.17 + x) * 0.16);
        groundPositions.setZ(index, height);
      }
      groundGeometry.computeVertexNormals();
      const groundMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        color: 0x6f7c4c,
        roughness: 0.96,
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.z = worldCenterZ;
      ground.receiveShadow = true;
      scene.add(ground);

      const pathColor = trackTexture(makeCobblestoneTexture("color"));
      const pathBump = trackTexture(makeCobblestoneTexture("bump"));
      const pathRoughness = trackTexture(makeCobblestoneTexture("roughness"));
      for (const texture of [pathColor, pathBump, pathRoughness]) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2.2, Math.max(7, worldLength / 3.2));
        texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
      }
      const pathMaterial = new THREE.MeshStandardMaterial({
        map: pathColor,
        bumpMap: pathBump,
        bumpScale: 0.12,
        roughnessMap: pathRoughness,
        roughness: 0.92,
        color: 0xf0c9a9,
      });
      const path = new THREE.Mesh(new THREE.PlaneGeometry(4.25, worldLength), pathMaterial);
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, 0.025, worldCenterZ);
      path.receiveShadow = true;
      scene.add(path);

      const edgeCountPerSide = Math.ceil(worldLength / 0.62);
      const edgeGeometry = new THREE.BoxGeometry(0.32, 0.22, 0.54);
      const edgeMaterial = new THREE.MeshStandardMaterial({
        color: 0xb39a7f,
        roughness: 0.96,
      });
      const pathEdges = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, edgeCountPerSide * 2);
      const edgeMatrix = new THREE.Matrix4();
      const edgeQuaternion = new THREE.Quaternion();
      const edgeScale = new THREE.Vector3();
      for (let index = 0; index < edgeCountPerSide; index += 1) {
        const z = worldNearZ - index * 0.62;
        for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
          const side = sideIndex === 0 ? -1 : 1;
          edgeQuaternion.setFromEuler(new THREE.Euler(0, side * 0.025 * Math.sin(index), 0));
          edgeScale.set(1, 0.85 + (index % 3) * 0.06, 1);
          edgeMatrix.compose(new THREE.Vector3(side * 2.24, 0.11, z), edgeQuaternion, edgeScale);
          pathEdges.setMatrixAt(index * 2 + sideIndex, edgeMatrix);
        }
      }
      pathEdges.castShadow = true;
      pathEdges.receiveShadow = true;
      scene.add(pathEdges);

      const random = seededRandom(2026);
      const treeCount = Math.max(28, pairCount * 4);
      const trunkGeometry = new THREE.CylinderGeometry(0.13, 0.24, 2.8, 7);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x694630, roughness: 1 });
      const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
      const foliageGeometry = new THREE.IcosahedronGeometry(1, 1);
      const foliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x405b39,
        roughness: 0.92,
      });
      const foliage = new THREE.InstancedMesh(foliageGeometry, foliageMaterial, treeCount * 2);
      const blossomGeometry = new THREE.IcosahedronGeometry(0.42, 1);
      const blossomMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8a4aa,
        roughness: 0.84,
      });
      const blossoms = new THREE.InstancedMesh(blossomGeometry, blossomMaterial, treeCount);
      const instanceMatrix = new THREE.Matrix4();
      const instanceQuaternion = new THREE.Quaternion();
      const instanceScale = new THREE.Vector3();
      let blossomIndex = 0;
      for (let index = 0; index < treeCount; index += 1) {
        const side = index % 2 === 0 ? -1 : 1;
        const z = worldNearZ - 4 - (index / treeCount) * (worldLength - 7) + (random() - 0.5) * 3;
        const x = side * (6.1 + random() * 6.8);
        const isCypress = index % 3 === 0;
        const treeHeight = isCypress ? 1.25 + random() * 0.45 : 0.86 + random() * 0.32;
        instanceQuaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI, 0));
        instanceScale.set(treeHeight, treeHeight, treeHeight);
        instanceMatrix.compose(new THREE.Vector3(x, 1.22 * treeHeight, z), instanceQuaternion, instanceScale);
        trunks.setMatrixAt(index, instanceMatrix);

        for (let layer = 0; layer < 2; layer += 1) {
          const layerScale = isCypress
            ? new THREE.Vector3(0.78 - layer * 0.1, 1.8 - layer * 0.25, 0.78 - layer * 0.1)
            : new THREE.Vector3(1.65 - layer * 0.2, 1.05 - layer * 0.08, 1.45 - layer * 0.16);
          layerScale.multiplyScalar(treeHeight);
          instanceMatrix.compose(
            new THREE.Vector3(x + (layer ? 0.15 * side : 0), 3.15 * treeHeight + layer * 0.75, z),
            instanceQuaternion,
            layerScale,
          );
          foliage.setMatrixAt(index * 2 + layer, instanceMatrix);
        }

        if (!isCypress) {
          const blossomScale = 0.65 + random() * 0.38;
          instanceScale.set(blossomScale, blossomScale * 0.8, blossomScale);
          instanceMatrix.compose(
            new THREE.Vector3(x - side * 0.3, 4.25 * treeHeight, z + 0.22),
            instanceQuaternion,
            instanceScale,
          );
          blossoms.setMatrixAt(blossomIndex, instanceMatrix);
          blossomIndex += 1;
        }
      }
      blossoms.count = blossomIndex;
      for (const mesh of [trunks, foliage, blossoms]) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);
      }

      const bushCount = Math.max(54, pairCount * 8);
      const bushGeometry = new THREE.IcosahedronGeometry(0.58, 1);
      const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x52653b, roughness: 0.9 });
      const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
      const bloomGeometry = new THREE.IcosahedronGeometry(0.11, 1);
      const bloomMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.75,
        vertexColors: true,
      });
      const blooms = new THREE.InstancedMesh(bloomGeometry, bloomMaterial, bushCount * 3);
      const bloomColors = [new THREE.Color(0xf1a1ae), new THREE.Color(0xffe0bd), new THREE.Color(0xdc7f72)];
      for (let index = 0; index < bushCount; index += 1) {
        const side = index % 2 === 0 ? -1 : 1;
        const z = worldNearZ - 2 - random() * (worldLength - 4);
        const x = side * (2.85 + random() * 2.25);
        const scale = 0.58 + random() * 0.72;
        instanceQuaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI, 0));
        instanceScale.set(scale * 1.3, scale * 0.82, scale);
        instanceMatrix.compose(new THREE.Vector3(x, 0.38 * scale, z), instanceQuaternion, instanceScale);
        bushes.setMatrixAt(index, instanceMatrix);

        for (let flower = 0; flower < 3; flower += 1) {
          const angle = random() * Math.PI * 2;
          const radius = 0.25 + random() * 0.38;
          const flowerScale = 0.75 + random() * 0.7;
          instanceScale.setScalar(flowerScale);
          instanceMatrix.compose(
            new THREE.Vector3(
              x + Math.cos(angle) * radius * scale,
              0.58 * scale + random() * 0.48,
              z + Math.sin(angle) * radius * scale,
            ),
            instanceQuaternion,
            instanceScale,
          );
          const bloomInstance = index * 3 + flower;
          blooms.setMatrixAt(bloomInstance, instanceMatrix);
          blooms.setColorAt(bloomInstance, bloomColors[(index + flower) % bloomColors.length]);
        }
      }
      bushes.castShadow = true;
      bushes.receiveShadow = true;
      blooms.castShadow = true;
      bushes.instanceMatrix.needsUpdate = true;
      blooms.instanceMatrix.needsUpdate = true;
      if (blooms.instanceColor) blooms.instanceColor.needsUpdate = true;
      scene.add(bushes, blooms);

      const fallenPetalCount = Math.max(85, pairCount * 12);
      const fallenPetalGeometry = new THREE.PlaneGeometry(0.15, 0.08);
      const fallenPetalMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0a0aa,
        roughness: 0.85,
        side: THREE.DoubleSide,
        vertexColors: true,
      });
      const fallenPetals = new THREE.InstancedMesh(
        fallenPetalGeometry,
        fallenPetalMaterial,
        fallenPetalCount,
      );
      const petalColors = [new THREE.Color(0xf5b2b8), new THREE.Color(0xffd2c8), new THREE.Color(0xd87989)];
      for (let index = 0; index < fallenPetalCount; index += 1) {
        const side = random() > 0.5 ? -1 : 1;
        const x = side * (1.35 + random() * 0.7);
        const z = worldNearZ - random() * worldLength;
        instanceQuaternion.setFromEuler(
          new THREE.Euler(-Math.PI / 2 + random() * 0.12, random() * Math.PI, random() * 0.2),
        );
        instanceScale.setScalar(0.65 + random() * 0.8);
        instanceMatrix.compose(new THREE.Vector3(x, 0.055, z), instanceQuaternion, instanceScale);
        fallenPetals.setMatrixAt(index, instanceMatrix);
        fallenPetals.setColorAt(index, petalColors[index % petalColors.length]);
      }
      fallenPetals.instanceMatrix.needsUpdate = true;
      if (fallenPetals.instanceColor) fallenPetals.instanceColor.needsUpdate = true;
      scene.add(fallenPetals);

      const woodTexture = trackTexture(makeWoodTexture());
      woodTexture.wrapS = THREE.RepeatWrapping;
      woodTexture.wrapT = THREE.RepeatWrapping;
      woodTexture.repeat.set(1, 4);
      woodTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const woodMaterial = new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: 0x80583d,
        roughness: 0.8,
        metalness: 0.06,
      });
      const vineMaterial = new THREE.MeshStandardMaterial({ color: 0x3e6038, roughness: 0.95 });
      const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4a0, toneMapped: false });
      const sharedHaloMaterial = new THREE.SpriteMaterial({
        map: haloTexture,
        color: 0xffc66d,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const archZs: number[] = [];
      for (let z = -8; z > gazeboZ + 7; z -= 12) archZs.push(z);
      const fairyMaterials: THREE.MeshBasicMaterial[] = [];

      for (const [archIndex, z] of archZs.entries()) {
        const arch = new THREE.Group();
        arch.position.z = z;
        const postGeometry = new THREE.CylinderGeometry(0.11, 0.14, 3.25, 8);
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(postGeometry, woodMaterial);
          post.position.set(side * 2.65, 1.62, 0);
          arch.add(post);
        }
        const archCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-2.65, 3.15, 0),
          new THREE.Vector3(-2.2, 4.12, 0),
          new THREE.Vector3(0, 4.72, 0),
          new THREE.Vector3(2.2, 4.12, 0),
          new THREE.Vector3(2.65, 3.15, 0),
        ]);
        const archTop = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 40, 0.11, 8, false), woodMaterial);
        arch.add(archTop);

        for (let vine = 0; vine < 18; vine += 1) {
          const point = archCurve.getPoint(vine / 17);
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), vineMaterial);
          leaf.position.copy(point).add(new THREE.Vector3(0, Math.sin(vine) * 0.09, 0.04));
          leaf.scale.set(1.3, 0.65, 0.8);
          arch.add(leaf);
        }

        const cordPoints: THREE.Vector3[] = [];
        for (let bulbIndex = 0; bulbIndex < 11; bulbIndex += 1) {
          const t = bulbIndex / 10;
          const x = THREE.MathUtils.lerp(-2.5, 2.5, t);
          const y = 4.12 - Math.sin(t * Math.PI) * 0.7;
          cordPoints.push(new THREE.Vector3(x, y, 0.12));
          const localBulbMaterial = bulbMaterial.clone();
          fairyMaterials.push(localBulbMaterial);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), localBulbMaterial);
          bulb.position.set(x, y, 0.12);
          const glow = new THREE.Sprite(sharedHaloMaterial);
          glow.position.copy(bulb.position);
          glow.scale.set(0.48, 0.48, 1);
          arch.add(bulb, glow);
        }
        const cordGeometry = new THREE.BufferGeometry().setFromPoints(cordPoints);
        const cord = new THREE.Line(
          cordGeometry,
          new THREE.LineBasicMaterial({ color: 0x6d4d3d, transparent: true, opacity: 0.8 }),
        );
        arch.add(cord);
        const archLight = new THREE.PointLight(0xffc878, 1.1, 8, 2);
        archLight.position.set(0, 3.75, 0);
        arch.add(archLight);
        setShadow(arch, true, false);
        scene.add(arch);
      }

      const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xc99a4d,
        metalness: 0.62,
        roughness: 0.3,
      });
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0xf2d9ad,
        metalness: 0.18,
        roughness: 0.58,
      });
      const supportMaterial = new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: 0x684532,
        metalness: 0.12,
        roughness: 0.72,
      });
      const textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin("anonymous");
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

      const updateFrameDimensions = (record: FrameRecord, imageAspect: number) => {
        const aspect = clamp(imageAspect, 0.65, 1.55);
        const photoHeight = 1.48;
        const photoWidth = photoHeight * aspect;
        const frameWidth = photoWidth + 0.24;
        const frameHeight = photoHeight + 0.36;
        const centerY = -1.5;
        const frameTop = centerY + frameHeight / 2;
        const cordLength = Math.max(0.35, -frameTop);

        record.photo.geometry.dispose();
        record.photo.geometry = new THREE.PlaneGeometry(photoWidth, photoHeight);
        record.photo.position.set(0, centerY + 0.03, 0.072);

        record.backing.geometry.dispose();
        record.backing.geometry = new THREE.BoxGeometry(frameWidth, frameHeight, 0.12);
        record.backing.position.set(0, centerY, 0);

        const horizontalGeometry = () => new THREE.BoxGeometry(frameWidth + 0.08, 0.12, 0.13);
        const verticalGeometry = () => new THREE.BoxGeometry(0.12, frameHeight, 0.13);
        record.borderTop.geometry.dispose();
        record.borderTop.geometry = horizontalGeometry();
        record.borderTop.position.set(0, centerY + frameHeight / 2, 0.075);
        record.borderBottom.geometry.dispose();
        record.borderBottom.geometry = horizontalGeometry();
        record.borderBottom.position.set(0, centerY - frameHeight / 2, 0.075);
        record.borderLeft.geometry.dispose();
        record.borderLeft.geometry = verticalGeometry();
        record.borderLeft.position.set(-frameWidth / 2, centerY, 0.075);
        record.borderRight.geometry.dispose();
        record.borderRight.geometry = verticalGeometry();
        record.borderRight.position.set(frameWidth / 2, centerY, 0.075);

        record.hitTarget.geometry.dispose();
        record.hitTarget.geometry = new THREE.PlaneGeometry(frameWidth + 0.14, frameHeight + 0.14);
        record.hitTarget.position.set(0, centerY, 0.095);

        record.cords.forEach((cord, index) => {
          const cordX = (index === 0 ? -1 : 1) * Math.min(frameWidth * 0.32, 0.58);
          cord.geometry.dispose();
          cord.geometry = new THREE.CylinderGeometry(0.012, 0.012, cordLength, 6);
          cord.position.set(cordX, -cordLength / 2, 0);
          record.rings[index].position.set(cordX, frameTop + 0.03, 0.08);
        });
      };

      GARDEN_PHOTOS.forEach((item, index) => {
        const sideSign = item.side === "left" ? -1 : 1;
        const row = Math.floor(index / 2);
        const z = firstFrameZ - row * frameSpacing;

        const support = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.14, 3.5, 8), supportMaterial);
        post.position.set(sideSign * 3.78, 1.75, z);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.12, 0.13), supportMaterial);
        arm.position.set(sideSign * 3.33, 3.45, z);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), goldMaterial);
        cap.position.set(sideSign * 3.78, 3.53, z);
        support.add(post, arm, cap);
        setShadow(support, true, false);
        scene?.add(support);

        const root = new THREE.Group();
        root.position.set(sideSign * 2.96, 3.4, z);
        root.rotation.y = item.side === "left" ? Math.PI / 2 - 0.17 : -Math.PI / 2 + 0.17;

        const fallbackTexture = trackTexture(makeFallbackPhoto(item));
        fallbackTexture.anisotropy = Math.min(8, maxAnisotropy);
        const photoMaterial = new THREE.MeshStandardMaterial({
          map: fallbackTexture,
          color: 0xffffff,
          roughness: 0.7,
          emissive: new THREE.Color(0x6b3c2c),
          emissiveIntensity: 0.08,
          side: THREE.DoubleSide,
        });
        const photo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), photoMaterial);
        const backing = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.12), frameMaterial);
        const borderTop = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.13), goldMaterial);
        const borderBottom = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.13), goldMaterial);
        const borderLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.13), goldMaterial);
        const borderRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.13), goldMaterial);
        const hitTarget = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
        );
        const cords = [-1, 1].map(
          () =>
            new THREE.Mesh(
              new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6),
              new THREE.MeshStandardMaterial({ color: 0xd6b06a, metalness: 0.34, roughness: 0.48 }),
            ),
        );
        const rings = [-1, 1].map(
          () => new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 6, 14), goldMaterial),
        );
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 9, 8), bulbMaterial);
        bulb.position.set(0, -0.08, 0.1);
        const glowMaterial = sharedHaloMaterial.clone();
        const glow = new THREE.Sprite(glowMaterial);
        glow.position.set(0, -0.08, 0.08);
        glow.scale.set(0.64, 0.64, 1);
        const clasp = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 18), goldMaterial);
        clasp.position.set(0, -0.2, 0.03);

        root.add(
          backing,
          photo,
          borderTop,
          borderBottom,
          borderLeft,
          borderRight,
          hitTarget,
          ...cords,
          ...rings,
          bulb,
          glow,
          clasp,
        );
        setShadow(root, true, false);
        hitTarget.castShadow = false;
        photo.castShadow = false;

        const record: FrameRecord = {
          root,
          photo,
          backing,
          borderTop,
          borderBottom,
          borderLeft,
          borderRight,
          hitTarget,
          cords,
          rings,
          glowMaterial,
          phase: random() * Math.PI * 2,
          z,
          item,
        };
        hitTarget.userData.frameRecord = record;
        clickTargets.push(hitTarget);
        frameRecords.push(record);
        updateFrameDimensions(record, 700 / 860);
        scene?.add(root);

        textureLoader.load(
          item.src,
          (loadedTexture) => {
            if (disposed) {
              loadedTexture.dispose();
              return;
            }
            loadedTexture.colorSpace = THREE.SRGBColorSpace;
            loadedTexture.anisotropy = maxAnisotropy;
            loadedTexture.needsUpdate = true;
            trackTexture(loadedTexture);
            const image = loadedTexture.image as {
              naturalWidth?: number;
              naturalHeight?: number;
              width?: number;
              height?: number;
            };
            const width = image.naturalWidth ?? image.width ?? 1;
            const height = image.naturalHeight ?? image.height ?? 1;
            photoMaterial.map = loadedTexture;
            photoMaterial.needsUpdate = true;
            fallbackTexture.dispose();
            textures.delete(fallbackTexture);
            updateFrameDimensions(record, width / Math.max(1, height));
          },
          undefined,
          () => {
            // The procedural fallback is already visible.
          },
        );
      });

      const gazebo = new THREE.Group();
      gazebo.position.z = gazeboZ;
      const gazeboPostGeometry = new THREE.CylinderGeometry(0.16, 0.22, 4.6, 10);
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(gazeboPostGeometry, woodMaterial);
        pillar.position.set(side * 3.35, 2.3, 0);
        gazebo.add(pillar);
      }
      const gazeboCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.35, 4.5, 0),
        new THREE.Vector3(-2.4, 5.65, 0),
        new THREE.Vector3(0, 6.2, 0),
        new THREE.Vector3(2.4, 5.65, 0),
        new THREE.Vector3(3.35, 4.5, 0),
      ]);
      gazebo.add(new THREE.Mesh(new THREE.TubeGeometry(gazeboCurve, 50, 0.18, 10, false), goldMaterial));
      const plaqueTexture = trackTexture(makePlaqueTexture());
      plaqueTexture.anisotropy = Math.min(8, maxAnisotropy);
      const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(6.6, 2.85),
        new THREE.MeshStandardMaterial({
          map: plaqueTexture,
          emissiveMap: plaqueTexture,
          emissive: new THREE.Color(0x5f2c18),
          emissiveIntensity: 0.32,
          roughness: 0.42,
          metalness: 0.12,
        }),
      );
      plaque.position.set(0, 2.65, 0.08);
      gazebo.add(plaque);
      const plaqueGlow = new THREE.PointLight(0xffb860, 3.2, 13, 1.7);
      plaqueGlow.position.set(0, 3, 1.2);
      gazebo.add(plaqueGlow);
      for (let flower = 0; flower < 38; flower += 1) {
        const t = flower / 37;
        const point = gazeboCurve.getPoint(t);
        const bloom = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.17 + (flower % 3) * 0.025, 1),
          new THREE.MeshStandardMaterial({
            color: [0xf3a3ac, 0xffddba, 0xd97770][flower % 3],
            roughness: 0.8,
          }),
        );
        bloom.position.copy(point).add(new THREE.Vector3(0, Math.sin(flower * 1.7) * 0.14, 0.08));
        gazebo.add(bloom);
      }
      setShadow(gazebo, true, false);
      plaque.castShadow = false;
      scene.add(gazebo);

      const petalTexture = trackTexture(makePetalTexture());
      const fallingPetalCount = Math.max(70, pairCount * 10);
      const fallingPetalPositions = new Float32Array(fallingPetalCount * 3);
      const fallingPetalSpeeds = new Float32Array(fallingPetalCount);
      for (let index = 0; index < fallingPetalCount; index += 1) {
        fallingPetalPositions[index * 3] = (random() - 0.5) * 18;
        fallingPetalPositions[index * 3 + 1] = 0.8 + random() * 7;
        fallingPetalPositions[index * 3 + 2] = worldNearZ - random() * worldLength;
        fallingPetalSpeeds[index] = 0.12 + random() * 0.3;
      }
      const fallingPetalGeometry = new THREE.BufferGeometry();
      const fallingPetalAttribute = new THREE.BufferAttribute(fallingPetalPositions, 3);
      fallingPetalGeometry.setAttribute("position", fallingPetalAttribute);
      const fallingPetalMaterial = new THREE.PointsMaterial({
        map: petalTexture,
        color: 0xffc0c6,
        size: 0.18,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        alphaTest: 0.05,
        sizeAttenuation: true,
      });
      const fallingPetals = new THREE.Points(fallingPetalGeometry, fallingPetalMaterial);
      scene.add(fallingPetals);

      const fireflyCount = Math.max(55, pairCount * 8);
      const fireflyPositions = new Float32Array(fireflyCount * 3);
      const fireflyBase = new Float32Array(fireflyCount * 3);
      for (let index = 0; index < fireflyCount; index += 1) {
        const side = random() > 0.5 ? -1 : 1;
        const positionIndex = index * 3;
        fireflyPositions[positionIndex] = side * (2.4 + random() * 5.5);
        fireflyPositions[positionIndex + 1] = 0.45 + random() * 3.6;
        fireflyPositions[positionIndex + 2] = worldNearZ - random() * worldLength;
      }
      fireflyBase.set(fireflyPositions);
      const fireflyGeometry = new THREE.BufferGeometry();
      const fireflyAttribute = new THREE.BufferAttribute(fireflyPositions, 3);
      fireflyGeometry.setAttribute("position", fireflyAttribute);
      const fireflyMaterial = new THREE.PointsMaterial({
        map: haloTexture,
        color: 0xffd06f,
        size: 0.32,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
      scene.add(fireflies);

      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();
      let hoveredRecord: FrameRecord | null = null;
      let pointerState:
        | {
            id: number;
            startX: number;
            startY: number;
            lastX: number;
            lastY: number;
            moved: boolean;
          }
        | undefined;
      let targetYaw = 0;
      let currentYaw = 0;
      let targetPitch = 0;
      let currentPitch = 0;
      let targetZ = entranceZ;
      let walkPhase = 0;
      const pressedKeys = new Set<string>();

      const setPointerNdc = (clientX: number, clientY: number) => {
        const bounds = renderer!.domElement.getBoundingClientRect();
        pointerNdc.x = ((clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
        pointerNdc.y = -((clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1;
      };

      const findFrameAt = (clientX: number, clientY: number) => {
        setPointerNdc(clientX, clientY);
        raycaster.setFromCamera(pointerNdc, camera);
        const intersection = raycaster.intersectObjects(clickTargets, false)[0];
        return (intersection?.object.userData.frameRecord as FrameRecord | undefined) ?? null;
      };

      const setHoveredFrame = (record: FrameRecord | null) => {
        if (hoveredRecord === record) return;
        if (hoveredRecord) {
          hoveredRecord.photo.material.emissiveIntensity = 0.08;
          hoveredRecord.glowMaterial.opacity = 0.58;
        }
        hoveredRecord = record;
        renderer!.domElement.style.cursor = record ? "pointer" : "grab";
        if (record) {
          record.photo.material.emissiveIntensity = 0.32;
          record.glowMaterial.opacity = 0.95;
        }
      };

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0 && event.pointerType === "mouse") return;
        renderer!.domElement.setPointerCapture(event.pointerId);
        renderer!.domElement.style.cursor = "grabbing";
        pointerState = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          moved: false,
        };
        interactionRef.current();
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!pointerState || pointerState.id !== event.pointerId) {
          if (event.pointerType === "mouse") setHoveredFrame(findFrameAt(event.clientX, event.clientY));
          return;
        }
        const deltaX = event.clientX - pointerState.lastX;
        const deltaY = event.clientY - pointerState.lastY;
        const distance = Math.hypot(event.clientX - pointerState.startX, event.clientY - pointerState.startY);
        if (distance >= 6) pointerState.moved = true;
        targetYaw -= deltaX * 0.0045;
        targetPitch = clamp(targetPitch - deltaY * 0.0035, -0.42, 0.48);
        pointerState.lastX = event.clientX;
        pointerState.lastY = event.clientY;
      };

      const finishPointer = (event: PointerEvent, allowSelection: boolean) => {
        if (!pointerState || pointerState.id !== event.pointerId) return;
        const shouldSelect = allowSelection && !pointerState.moved;
        pointerState = undefined;
        if (renderer!.domElement.hasPointerCapture(event.pointerId)) {
          renderer!.domElement.releasePointerCapture(event.pointerId);
        }
        const record = findFrameAt(event.clientX, event.clientY);
        setHoveredFrame(event.pointerType === "mouse" ? record : null);
        if (shouldSelect && record) selectPhotoRef.current(record.item);
      };

      const onPointerUp = (event: PointerEvent) => finishPointer(event, true);
      const onPointerCancel = (event: PointerEvent) => finishPointer(event, false);
      const onPointerLeave = (event: PointerEvent) => {
        if (!pointerState) setHoveredFrame(null);
        if (pointerState && event.pointerType !== "mouse") finishPointer(event, false);
      };
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        interactionRef.current();
        targetZ = clamp(targetZ - event.deltaY * 0.009, minCameraZ, entranceZ);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
          event.preventDefault();
          pressedKeys.add(key);
          interactionRef.current();
        }
      };
      const onKeyUp = (event: KeyboardEvent) => pressedKeys.delete(event.key.toLowerCase());
      const onBlur = () => pressedKeys.clear();
      const onContextLost = (event: Event) => {
        event.preventDefault();
        fatalErrorRef.current();
      };

      const canvas = renderer.domElement;
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerCancel);
      canvas.addEventListener("pointerleave", onPointerLeave);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("webglcontextlost", onContextLost);
      window.addEventListener("keydown", onKeyDown, { passive: false });
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", onBlur);
      eventCleanups.push(
        () => canvas.removeEventListener("pointerdown", onPointerDown),
        () => canvas.removeEventListener("pointermove", onPointerMove),
        () => canvas.removeEventListener("pointerup", onPointerUp),
        () => canvas.removeEventListener("pointercancel", onPointerCancel),
        () => canvas.removeEventListener("pointerleave", onPointerLeave),
        () => canvas.removeEventListener("wheel", onWheel),
        () => canvas.removeEventListener("webglcontextlost", onContextLost),
        () => window.removeEventListener("keydown", onKeyDown),
        () => window.removeEventListener("keyup", onKeyUp),
        () => window.removeEventListener("blur", onBlur),
      );

      const resize = () => {
        const width = Math.max(1, container.clientWidth);
        const height = Math.max(1, container.clientHeight);
        renderer!.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      const clock = new THREE.Clock();
      let lastProgressTime = -Infinity;
      let lastProgressValue = -1;
      let lastNearest = -1;

      const animate = () => {
        if (disposed || !renderer || !scene) return;
        animationFrame = window.requestAnimationFrame(animate);
        const delta = Math.min(0.05, clock.getDelta());
        const elapsed = clock.elapsedTime;
        const currentControls = controlsRef.current;

        const keyboardForward = pressedKeys.has("w") || pressedKeys.has("arrowup");
        const keyboardBackward = pressedKeys.has("s") || pressedKeys.has("arrowdown");
        const movingForward = currentControls.forward || keyboardForward || currentControls.autoStroll;
        const movingBackward = currentControls.backward || keyboardBackward;
        const moveDirection = (movingForward ? 1 : 0) - (movingBackward ? 1 : 0);
        const moveSpeed = currentControls.autoStroll && !currentControls.forward && !keyboardForward ? 0.72 : 2.35;
        if (moveDirection !== 0) {
          targetZ = clamp(targetZ - moveDirection * moveSpeed * delta, minCameraZ, entranceZ);
          walkPhase += delta * (currentControls.autoStroll ? 4 : 7.5);
        }

        const lookLeft = currentControls.lookLeft || pressedKeys.has("a") || pressedKeys.has("arrowleft");
        const lookRight = currentControls.lookRight || pressedKeys.has("d") || pressedKeys.has("arrowright");
        targetYaw += ((lookLeft ? 1 : 0) - (lookRight ? 1 : 0)) * delta * 1.18;

        currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 9, delta);
        currentPitch = THREE.MathUtils.damp(currentPitch, targetPitch, 9, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 7, delta);
        const isActuallyMoving = Math.abs(camera.position.z - targetZ) > 0.003 || moveDirection !== 0;
        const headBob =
          !reducedMotionRef.current && isActuallyMoving ? Math.sin(walkPhase) * 0.018 : 0;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.65 + headBob, 10, delta);
        camera.rotation.set(currentPitch, currentYaw, 0, "YXZ");
        cameraLamp.position.set(camera.position.x, camera.position.y + 0.55, camera.position.z - 1.1);

        if (!reducedMotionRef.current) {
          frameRecords.forEach((record, index) => {
            record.root.rotation.z = Math.sin(elapsed * 0.72 + record.phase) * 0.018;
            record.glowMaterial.opacity =
              record === hoveredRecord ? 0.95 : 0.5 + Math.sin(elapsed * 1.4 + index) * 0.1;
          });
          fairyMaterials.forEach((material, index) => {
            material.color.setHSL(0.115, 0.92, 0.69 + Math.sin(elapsed * 2 + index * 0.8) * 0.05);
          });

          for (let index = 0; index < fallingPetalCount; index += 1) {
            const positionIndex = index * 3;
            fallingPetalPositions[positionIndex + 1] -= fallingPetalSpeeds[index] * delta;
            fallingPetalPositions[positionIndex] += Math.sin(elapsed * 0.8 + index) * delta * 0.09;
            if (fallingPetalPositions[positionIndex + 1] < 0.18) {
              fallingPetalPositions[positionIndex + 1] = 6 + random() * 2;
              fallingPetalPositions[positionIndex] = (random() - 0.5) * 18;
            }
          }
          fallingPetalAttribute.needsUpdate = true;

          for (let index = 0; index < fireflyCount; index += 1) {
            const positionIndex = index * 3;
            fireflyPositions[positionIndex] =
              fireflyBase[positionIndex] + Math.sin(elapsed * 0.45 + index * 2.1) * 0.24;
            fireflyPositions[positionIndex + 1] =
              fireflyBase[positionIndex + 1] + Math.sin(elapsed * 0.8 + index) * 0.18;
          }
          fireflyAttribute.needsUpdate = true;
          fireflyMaterial.opacity = 0.58 + Math.sin(elapsed * 1.65) * 0.16;
        }

        const progress = clamp((entranceZ - camera.position.z) / (entranceZ - minCameraZ), 0, 1);
        let nearest = 0;
        let nearestDistance = Infinity;
        frameRecords.forEach((record, index) => {
          const distance = Math.abs(record.z - camera.position.z);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = index;
          }
        });
        const now = performance.now();
        if (
          now - lastProgressTime > 90 &&
          (Math.abs(progress - lastProgressValue) > 0.002 || nearest !== lastNearest)
        ) {
          lastProgressTime = now;
          lastProgressValue = progress;
          lastNearest = nearest;
          progressRef.current(progress, nearest);
        }

        renderer.render(scene, camera);
      };
      animate();
    } catch {
      cleanup();
      fatalErrorRef.current();
      return;
    }

    return cleanup;
  }, []);

  return <div ref={containerRef} className="absolute inset-0 touch-none bg-[#8f6d67]" />;
}
