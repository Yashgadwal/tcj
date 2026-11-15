/**
 * TCJ Gourmet Store - Ultra-Realistic 3D Virtual Supermarket (Three.js WebGL)
 * 5 Distinct Themed Departments with Realistic Product Textures, Glass Chillers & Clickable Category Hotspots
 */

(function() {
  let scene, camera, renderer, storeGroup;
  let hotspots = [];
  let raycaster, mouse;
  let canvasContainer;
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let targetRotationY = 0;
  let targetRotationX = 0.15;
  let isInitialized = false;

  const CATEGORY_HOTSPOTS = [
    {
      id: 'chocolates',
      name: 'Dubai Chocolates',
      emoji: '🍫',
      color: 0x84cc16,
      pos: [-3.0, 1.3, -1.0],
      cameraTarget: [-2.0, 1.2, 2.5]
    },
    {
      id: 'international-drinks',
      name: 'Cold Sips & Chillers',
      emoji: '🥤',
      color: 0x0284c7,
      pos: [-1.5, 1.5, -2.5],
      cameraTarget: [-1.0, 1.3, 1.8]
    },
    {
      id: 'korean-snacks',
      name: 'Korean Buldak Ramen',
      emoji: '🍜',
      color: 0xef4444,
      pos: [0, 1.3, -1.2],
      cameraTarget: [0, 1.1, 2.8]
    },
    {
      id: 'chips-snacks',
      name: 'Exotic Chips & Takis',
      emoji: '🥨',
      color: 0xd97706,
      pos: [1.6, 1.4, -2.2],
      cameraTarget: [1.2, 1.2, 1.8]
    },
    {
      id: 'gourmet',
      name: 'Gourmet & Candies',
      emoji: '🍯',
      color: 0xb45309,
      pos: [3.0, 1.3, -1.0],
      cameraTarget: [2.0, 1.2, 2.5]
    }
  ];

  window.initThreeStore = function() {
    if (isInitialized) return;
    canvasContainer = document.getElementById('three-store-canvas-container');
    if (!canvasContainer || typeof THREE === 'undefined') return;

    isInitialized = true;

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfff8e9);

    const width = canvasContainer.clientWidth || 900;
    const height = canvasContainer.clientHeight || 520;

    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.8, 7.8);
    camera.lookAt(0, 0.6, 0);

    // 2. WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    canvasContainer.innerHTML = '';
    canvasContainer.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 3. Supermarket Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8e9, 1.1);
    scene.add(ambientLight);

    const ceilingLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
    ceilingLight1.position.set(0, 8, 4);
    ceilingLight1.castShadow = true;
    scene.add(ceilingLight1);

    const neonCyanLight = new THREE.PointLight(0xa8dfff, 1.6, 9);
    neonCyanLight.position.set(-2, 2.2, -1);
    scene.add(neonCyanLight);

    const neonGoldLight = new THREE.PointLight(0xffd45c, 1.6, 9);
    neonGoldLight.position.set(2, 2.2, -1);
    scene.add(neonGoldLight);

    // 4. Texture Loader
    const textureLoader = new THREE.TextureLoader();
    const storeTextures = {
      choco: textureLoader.load('assets/mockup/food-dubai-chocolate.png'),
      prime: textureLoader.load('assets/mockup/food-prime-drink.png'),
      buldak: textureLoader.load('assets/mockup/food-buldak-ramen.png'),
      takis: textureLoader.load('assets/mockup/food-takis.png'),
      spreads: textureLoader.load('assets/mockup/cat-food-spreads.png'),
      logo: textureLoader.load('assets/tcj-official-logo.png')
    };

    // 5. Store Master Environment
    storeGroup = new THREE.Group();
    scene.add(storeGroup);

    buildSupermarketInterior(storeTextures);
    buildInteractiveHotspots();

    // 6. Interaction Handlers
    renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('resize', onWindowResize);

    window.resetStoreCamera = function() {
      if (typeof gsap !== 'undefined') {
        gsap.to(camera.position, { x: 0, y: 2.8, z: 7.8, duration: 1.2, ease: 'power2.out' });
        gsap.to(storeGroup.rotation, { x: 0.15, y: 0, duration: 1.2, ease: 'power2.out' });
      } else {
        camera.position.set(0, 2.8, 7.8);
        storeGroup.rotation.set(0.15, 0, 0);
      }
    };

    animate();
  };

  function buildSupermarketInterior(textures) {
    // Polished Floor
    const floorGeo = new THREE.PlaneGeometry(16, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xfaf4ea, roughness: 0.2, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    storeGroup.add(floor);

    const grid = new THREE.GridHelper(16, 16, 0xb9d98a, 0xe2e8f0);
    grid.position.y = 0.01;
    storeGroup.add(grid);

    // Back Wall with Brand Logo Sign
    const wallGeo = new THREE.PlaneGeometry(16, 6);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 3, -4);
    storeGroup.add(wall);

    const logoPlaneGeo = new THREE.PlaneGeometry(3.6, 1.2);
    const logoMat = new THREE.MeshStandardMaterial({ map: textures.logo, transparent: true });
    const logoMesh = new THREE.Mesh(logoPlaneGeo, logoMat);
    logoMesh.position.set(0, 4.6, -3.8);
    storeGroup.add(logoMesh);

    // 5 Themed Aisles with Real Product Textures
    buildChocolateAisle([-3.0, 0, -1.0], textures.choco);
    buildDrinkChiller([-1.5, 0, -2.5], textures.prime);
    buildRamenAisle([0, 0, -1.2], textures.buldak);
    buildChipsTower([1.6, 0, -2.2], textures.takis);
    buildGourmetCarousel([3.0, 0, -1.0], textures.spreads);
  }

  function buildChocolateAisle(pos, tex) {
    const group = new THREE.Group();
    group.position.set(...pos);

    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x4a2518, roughness: 0.4 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.7), shelfMat);
    shelf.position.y = 1.1;
    group.add(shelf);

    const neonMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, emissive: 0x84cc16, emissiveIntensity: 0.8 });
    const neon = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.25, 0.72), neonMat);
    neon.position.y = 2.2;
    group.add(neon);

    // Stacked textured chocolate displays
    const chocoDecal = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
    for (let s = 0; s < 3; s++) {
      const display = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.45), chocoDecal);
      display.position.set(0, 0.6 + s * 0.55, 0.36);
      group.add(display);
    }
    storeGroup.add(group);
  }

  function buildDrinkChiller(pos, tex) {
    const group = new THREE.Group();
    group.position.set(...pos);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4, roughness: 0.2 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.7), frameMat);
    frame.position.y = 1.2;
    group.add(frame);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xa8dfff,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.0, 0.65), glassMat);
    glass.position.set(0, 1.2, 0.05);
    group.add(glass);

    // Textured Prime & Drinks Decal
    const drinkDecal = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
    for (let r = 0; r < 2; r++) {
      const bottleMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), drinkDecal);
      bottleMesh.position.set(-0.25 + r * 0.5, 1.1, 0.2);
      group.add(bottleMesh);
    }
    storeGroup.add(group);
  }

  function buildRamenAisle(pos, tex) {
    const group = new THREE.Group();
    group.position.set(...pos);

    const ramenMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const ramenShelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.75), ramenMat);
    ramenShelf.position.y = 1.05;
    group.add(ramenShelf);

    const neonMat = new THREE.MeshStandardMaterial({ color: 0xffd45c, emissive: 0xf59e0b, emissiveIntensity: 0.8 });
    const neon = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.25, 0.78), neonMat);
    neon.position.y = 2.1;
    group.add(neon);

    const buldakDecal = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
    for (let r = 0; r < 3; r++) {
      const display = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.42), buldakDecal);
      display.position.set(0, 0.55 + r * 0.5, 0.39);
      group.add(display);
    }
    storeGroup.add(group);
  }

  function buildChipsTower(pos, tex) {
    const group = new THREE.Group();
    group.position.set(...pos);

    const towerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.65), towerMat);
    tower.position.y = 1.15;
    group.add(tower);

    const takisDecal = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
    for (let r = 0; r < 3; r++) {
      const display = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), takisDecal);
      display.position.set(0, 0.55 + r * 0.52, 0.34);
      group.add(display);
    }
    storeGroup.add(group);
  }

  function buildGourmetCarousel(pos, tex) {
    const group = new THREE.Group();
    group.position.set(...pos);

    const standMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.7), standMat);
    stand.position.y = 1.1;
    group.add(stand);

    const crownMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xec4899, emissiveIntensity: 0.7 });
    const crown = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.25, 0.72), crownMat);
    crown.position.y = 2.2;
    group.add(crown);

    const spreadDecal = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
    for (let r = 0; r < 2; r++) {
      const display = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), spreadDecal);
      display.position.set(0, 0.7 + r * 0.65, 0.36);
      group.add(display);
    }
    storeGroup.add(group);
  }

  function buildInteractiveHotspots() {
    CATEGORY_HOTSPOTS.forEach(cat => {
      const pinGroup = new THREE.Group();
      pinGroup.position.set(cat.pos[0], cat.pos[1] + 1.2, cat.pos[2]);

      const sphereMat = new THREE.MeshStandardMaterial({
        color: cat.color,
        emissive: cat.color,
        emissiveIntensity: 0.9,
        roughness: 0.2
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), sphereMat);
      pinGroup.add(sphere);

      const ringMat = new THREE.MeshBasicMaterial({ color: cat.color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 24), ringMat);
      ring.rotation.x = Math.PI / 2;
      pinGroup.add(ring);

      const coneMat = new THREE.MeshStandardMaterial({ color: cat.color });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 12), coneMat);
      cone.position.y = -0.22;
      cone.rotation.x = Math.PI;
      pinGroup.add(cone);

      pinGroup.userData = {
        categoryId: cat.id,
        categoryName: cat.name,
        emoji: cat.emoji,
        cameraTarget: cat.cameraTarget,
        baseY: pinGroup.position.y,
        ringMesh: ring
      };

      storeGroup.add(pinGroup);
      hotspots.push(pinGroup);
    });
  }

  function onMouseMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      targetRotationY += deltaX * 0.005;
      targetRotationX += deltaY * 0.003;
      targetRotationX = Math.max(-0.2, Math.min(0.4, targetRotationX));
      previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      isDragging = true;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function onTouchMove(e) {
    if (isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;
      targetRotationY += deltaX * 0.005;
      targetRotationX += deltaY * 0.003;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function onCanvasClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hotspots, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData.categoryId) {
        obj = obj.parent;
      }
      if (obj && obj.userData.categoryId) {
        handleHotspotSelect(obj.userData);
      }
    }
  }

  function handleHotspotSelect(data) {
    if (typeof tcjSound !== 'undefined' && tcjSound) {
      tcjSound.playWhoosh();
    }

    if (typeof gsap !== 'undefined') {
      gsap.to(camera.position, {
        x: data.cameraTarget[0],
        y: data.cameraTarget[1],
        z: data.cameraTarget[2],
        duration: 1.0,
        ease: 'power3.out'
      });
    }

    if (typeof showToast === 'function') {
      showToast(`${data.emoji} Exploring ${data.categoryName}!`);
    }

    setTimeout(() => {
      if (typeof window.setCategory === 'function') {
        window.setCategory(data.categoryId);
      }
      const prodSec = document.getElementById('products-section');
      if (prodSec) {
        prodSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 700);
  }

  function onWindowResize() {
    if (!canvasContainer || !camera || !renderer) return;
    const width = canvasContainer.clientWidth || 900;
    const height = canvasContainer.clientHeight || 520;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    if (storeGroup) {
      storeGroup.rotation.y += (targetRotationY - storeGroup.rotation.y) * 0.08;
      storeGroup.rotation.x += (targetRotationX - storeGroup.rotation.x) * 0.08;
    }

    hotspots.forEach(pin => {
      pin.position.y = pin.userData.baseY + Math.sin(elapsedTime * 2.5) * 0.08;
      if (pin.userData.ringMesh) {
        const s = 1.0 + Math.sin(elapsedTime * 3.5) * 0.25;
        pin.userData.ringMesh.scale.set(s, s, s);
      }
    });

    renderer.render(scene, camera);
  }
})();
