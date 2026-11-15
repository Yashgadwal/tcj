/**
 * TCJ Gourmet Store - Ultra-Realistic Three.js 3D Hero Experience
 * Realistic Textured Dubai Pistachio Chocolate Bar, Floating 3D Snack Packages (Prime, Buldak, Takis),
 * 3D Pistachios with Shells, Kataifi Strands, Glossy Candies & Puffy Clouds
 */

(function() {
  let scene, camera, renderer;
  let heroGroup, chocolateGroup, chocoLeftHalf, chocoRightHalf, pistachioCore;
  let floatingElements = [];
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isMobile = window.innerWidth < 768;
  let canvasContainer;
  let isDragging = false;
  let previousMousePos = { x: 0, y: 0 };
  let manualRot = { x: 0, y: 0 };
  let isInitialized = false;

  window.initThreeHero = function() {
    if (isInitialized) return;
    canvasContainer = document.getElementById('three-hero-canvas-container');
    if (!canvasContainer || typeof THREE === 'undefined') return;

    isInitialized = true;
    isMobile = window.innerWidth < 768;

    // 1. Scene & Camera Setup
    scene = new THREE.Scene();
    
    const width = canvasContainer.clientWidth || window.innerWidth;
    const height = canvasContainer.clientHeight || window.innerHeight;
    
    camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    // 2. WebGL Renderer with Filmic Tone Mapping & High-DPI
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    canvasContainer.innerHTML = '';
    canvasContainer.appendChild(renderer.domElement);

    // 3. Studio Food Commercial Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8e9, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(5, 7, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const goldRimLight = new THREE.DirectionalLight(0xffd45c, 1.4);
    goldRimLight.position.set(-6, -2, -3);
    scene.add(goldRimLight);

    const pistachioFill = new THREE.PointLight(0x84cc16, 2.2, 10);
    pistachioFill.position.set(1.5, 0, 3.2);
    scene.add(pistachioFill);

    // 4. Hero Master Group
    heroGroup = new THREE.Group();
    // Desktop: positioned on middle-right portion of screen. Mobile: centered
    heroGroup.position.set(isMobile ? 0 : 1.6, isMobile ? 0.2 : 0, 0);
    scene.add(heroGroup);

    // 5. Load Real Product Textures
    const textureLoader = new THREE.TextureLoader();
    const textures = {
      dubaiChoco: textureLoader.load('assets/mockup/food-dubai-chocolate.png'),
      prime: textureLoader.load('assets/mockup/food-prime-drink.png'),
      buldak: textureLoader.load('assets/mockup/food-buldak-ramen.png'),
      takis: textureLoader.load('assets/mockup/food-takis.png'),
      logo: textureLoader.load('assets/tcj-official-logo.png')
    };

    // 6. Build Giant Realistic 3D Dubai Chocolate Bar
    buildRealisticChocolateBar(textures);

    // 7. Build Floating 3D Snack Packages & Particles
    buildFloatingElements(textures);

    // 8. Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // Interactive Drag to Rotate
    renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePos = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
    renderer.domElement.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePos.x;
        const deltaY = e.clientY - previousMousePos.y;
        manualRot.y += deltaX * 0.008;
        manualRot.x += deltaY * 0.008;
        previousMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    animate();
  };

  /**
   * Builds the Giant Realistic 3D Dubai Pistachio Chocolate Bar
   */
  function buildRealisticChocolateBar(textures) {
    chocolateGroup = new THREE.Group();

    // Glossy Belgian Chocolate Material
    const chocolateMat = new THREE.MeshStandardMaterial({
      color: 0x3d1f14,
      roughness: 0.22,
      metalness: 0.08,
      bumpScale: 0.05
    });

    // Textured Front Decal with Dubai Chocolate photograph
    const frontTexturedMat = new THREE.MeshStandardMaterial({
      map: textures.dubaiChoco,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true
    });

    // Emerald Pistachio Cream Material (Gooey, rich green)
    const pistachioMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.38,
      metalness: 0.05,
      emissive: 0x4d7c0f,
      emissiveIntensity: 0.3
    });

    // Toasted Kataifi Strands Material
    const kataifiMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.55,
      metalness: 0.15
    });

    // --- LEFT HALF ---
    chocoLeftHalf = new THREE.Group();
    const leftBase = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.7, 0.42), chocolateMat);
    chocoLeftHalf.add(leftBase);

    // Bevelled Chocolate Grid Squares (3 rows x 2 columns)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        const sq = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.12), chocolateMat);
        sq.position.set(-0.35 + c * 0.65, -0.8 + r * 0.8, 0.24);
        chocoLeftHalf.add(sq);
      }
    }

    // Textured Face Plane
    const leftFace = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), frontTexturedMat);
    leftFace.position.set(0, 0, 0.31);
    chocoLeftHalf.add(leftFace);

    chocoLeftHalf.position.set(-0.7, 0, 0);
    chocolateGroup.add(chocoLeftHalf);

    // --- RIGHT HALF ---
    chocoRightHalf = new THREE.Group();
    const rightBase = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.7, 0.42), chocolateMat);
    chocoRightHalf.add(rightBase);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 2; c++) {
        const sq = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.12), chocolateMat);
        sq.position.set(-0.35 + c * 0.65, -0.8 + r * 0.8, 0.24);
        chocoRightHalf.add(sq);
      }
    }

    const rightFace = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), frontTexturedMat);
    rightFace.position.set(0, 0, 0.31);
    chocoRightHalf.add(rightFace);

    chocoRightHalf.position.set(0.7, 0, 0);
    chocolateGroup.add(chocoRightHalf);

    // --- PISTACHIO & KATAIFI INTERIOR CORE ---
    pistachioCore = new THREE.Group();
    const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 0.35), pistachioMat);
    pistachioCore.add(coreMesh);

    // Golden Kataifi pastry threads bursting from seam
    for (let i = 0; i < 35; i++) {
      const strand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.35 + Math.random() * 0.45, 6),
        kataifiMat
      );
      strand.position.set(
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.3,
        0.18 + Math.random() * 0.12
      );
      strand.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      pistachioCore.add(strand);
    }
    chocolateGroup.add(pistachioCore);

    // Initial 3D Tilt
    chocolateGroup.rotation.set(0.18, -0.32, 0.06);
    heroGroup.add(chocolateGroup);
  }

  /**
   * Builds Floating 3D Snack Packages (Prime, Buldak, Takis), Pistachios, Candies & Puffy Clouds
   */
  function buildFloatingElements(textures) {
    // 1. Floating 3D Prime Hydration Bottle
    const primeMat = new THREE.MeshStandardMaterial({
      map: textures.prime,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true
    });
    const primeBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.0, 16), primeMat);
    const primeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    primeCap.position.y = 0.58;
    const primeGroup = new THREE.Group();
    primeGroup.add(primeBottle);
    primeGroup.add(primeCap);
    primeGroup.position.set(-2.8, 1.4, 0.5);
    primeGroup.rotation.set(0.3, 0.4, -0.2);
    primeGroup.userData = { baseY: 1.4, speed: 1.1, rotSpeedY: 0.01, phase: 0.5 };
    scene.add(primeGroup);
    floatingElements.push(primeGroup);

    // 2. Floating 3D Buldak Ramen Package
    const buldakMat = new THREE.MeshStandardMaterial({
      map: textures.buldak,
      roughness: 0.35,
      transparent: true
    });
    const buldakPack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.22), buldakMat);
    buldakPack.position.set(2.8, -1.2, 0.8);
    buldakPack.rotation.set(-0.2, -0.4, 0.15);
    buldakPack.userData = { baseY: -1.2, speed: 0.9, rotSpeedY: -0.012, phase: 1.2 };
    scene.add(buldakPack);
    floatingElements.push(buldakPack);

    // 3. Floating 3D Takis Fuego Bag
    const takisMat = new THREE.MeshStandardMaterial({
      map: textures.takis,
      roughness: 0.3,
      transparent: true
    });
    const takisPack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.2), takisMat);
    takisPack.position.set(2.6, 1.6, -0.5);
    takisPack.rotation.set(0.25, 0.3, -0.15);
    takisPack.userData = { baseY: 1.6, speed: 1.3, rotSpeedY: 0.015, phase: 2.1 };
    scene.add(takisPack);
    floatingElements.push(takisPack);

    // 4. Realistic 3D Pistachios with Opened Shells (14 units)
    const nutMat = new THREE.MeshStandardMaterial({ color: 0xb9d98a, roughness: 0.45 });
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xd4b996, roughness: 0.65 });

    for (let i = 0; i < 14; i++) {
      const pGroup = new THREE.Group();
      
      const nutGeo = new THREE.SphereGeometry(0.18, 12, 12);
      nutGeo.scale(1, 1.4, 0.8);
      const nut = new THREE.Mesh(nutGeo, nutMat);
      pGroup.add(nut);

      const shellGeo = new THREE.SphereGeometry(0.2, 12, 12, 0, Math.PI);
      shellGeo.scale(1.05, 1.45, 0.85);
      const shell = new THREE.Mesh(shellGeo, shellMat);
      shell.position.z = -0.04;
      pGroup.add(shell);

      const radius = 2.2 + Math.random() * 2.4;
      const angle = (i / 14) * Math.PI * 2;
      pGroup.position.set(
        Math.cos(angle) * radius + (isMobile ? 0 : 1.6),
        Math.sin(angle) * (radius * 0.7),
        (Math.random() - 0.5) * 2.5
      );

      pGroup.userData = {
        baseY: pGroup.position.y,
        speed: 0.8 + Math.random() * 1.2,
        rotSpeedX: (Math.random() - 0.5) * 0.03,
        rotSpeedY: (Math.random() - 0.5) * 0.03,
        phase: Math.random() * Math.PI * 2
      };

      scene.add(pGroup);
      floatingElements.push(pGroup);
    }

    // 5. Crispy Golden Kataifi Strands (30 floating threads)
    const kataifiMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    for (let i = 0; i < 30; i++) {
      const strand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.4 + Math.random() * 0.6, 6),
        kataifiMat
      );
      strand.position.set(
        (Math.random() - 0.5) * 5 + (isMobile ? 0 : 1.6),
        (Math.random() - 0.5) * 4.5,
        (Math.random() - 0.5) * 3
      );
      strand.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      strand.userData = {
        baseY: strand.position.y,
        speed: 1.0 + Math.random() * 1.5,
        rotSpeedX: (Math.random() - 0.5) * 0.04,
        rotSpeedY: (Math.random() - 0.5) * 0.04,
        phase: Math.random() * Math.PI * 2
      };
      scene.add(strand);
      floatingElements.push(strand);
    }

    // 6. Colourful Glossy Candies (16 spheres & donuts)
    const candyColors = [0xf472b6, 0xffd45c, 0xa8dfff, 0x84cc16, 0xf97316];
    for (let i = 0; i < 16; i++) {
      const candyMat = new THREE.MeshStandardMaterial({
        color: candyColors[i % candyColors.length],
        roughness: 0.15,
        metalness: 0.1
      });
      const geo = (i % 3 === 0) ? new THREE.TorusGeometry(0.15, 0.06, 12, 24) : new THREE.SphereGeometry(0.16, 16, 16);
      const candy = new THREE.Mesh(geo, candyMat);
      candy.position.set(
        (Math.random() - 0.5) * 6 + (isMobile ? 0 : 1.6),
        (Math.random() - 0.5) * 4.5,
        (Math.random() - 0.5) * 2.8
      );
      candy.userData = {
        baseY: candy.position.y,
        speed: 0.9 + Math.random() * 1.1,
        rotSpeedX: (Math.random() - 0.5) * 0.025,
        rotSpeedY: (Math.random() - 0.5) * 0.025,
        phase: Math.random() * Math.PI * 2
      };
      scene.add(candy);
      floatingElements.push(candy);
    }

    // 7. Puffy 3D Clouds (Soft cream & white clusters)
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      opacity: 0.85,
      transparent: true
    });

    for (let c = 0; c < 4; c++) {
      const cloudGroup = new THREE.Group();
      const numPuffs = 4 + Math.floor(Math.random() * 3);
      for (let p = 0; p < numPuffs; p++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.35, 12, 12), cloudMat);
        puff.position.set((p - numPuffs / 2) * 0.35, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
        cloudGroup.add(puff);
      }
      cloudGroup.position.set(
        (c % 2 === 0 ? -3.5 : 3.5) + (Math.random() - 0.5) * 1.5,
        (c < 2 ? 2.5 : -2.5) + (Math.random() - 0.5) * 1.2,
        -1.5 - Math.random() * 2
      );
      cloudGroup.userData = {
        baseY: cloudGroup.position.y,
        baseX: cloudGroup.position.x,
        speed: 0.4 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      };
      scene.add(cloudGroup);
      floatingElements.push(cloudGroup);
    }
  }

  function onMouseMove(e) {
    mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onTouchMove(e) {
    if (e.touches && e.touches.length > 0) {
      mouse.targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 1.5;
      mouse.targetY = -(e.touches[0].clientY / window.innerHeight - 0.5) * 1.5;
    }
  }

  function onWindowResize() {
    if (!canvasContainer || !camera || !renderer) return;
    isMobile = window.innerWidth < 768;
    const width = canvasContainer.clientWidth || window.innerWidth;
    const height = canvasContainer.clientHeight || window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (heroGroup) {
      heroGroup.position.x = isMobile ? 0 : 1.6;
      heroGroup.position.y = isMobile ? 0.2 : 0;
    }
  }

  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Damped mouse parallax
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Chocolate Floating & Mouse-Responsive Rotation
    if (chocolateGroup) {
      chocolateGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.12;

      const targetRotX = 0.18 + mouse.y * 0.28 + manualRot.x;
      const targetRotY = -0.32 + mouse.x * 0.45 + manualRot.y;
      chocolateGroup.rotation.x += (targetRotX - chocolateGroup.rotation.x) * 0.06;
      chocolateGroup.rotation.y += (targetRotY - chocolateGroup.rotation.y) * 0.06;

      // Subtle breathing crack reveal on mouse movement
      if (chocoLeftHalf && chocoRightHalf) {
        const crackOffset = 0.02 + Math.abs(mouse.x) * 0.06;
        chocoLeftHalf.position.x = -0.7 - crackOffset;
        chocoRightHalf.position.x = 0.7 + crackOffset;
        chocoRightHalf.rotation.y = crackOffset * 0.5;
      }
    }

    // Animate all floating elements
    floatingElements.forEach(el => {
      const u = el.userData;
      if (!u) return;

      if (u.baseY !== undefined) {
        el.position.y = u.baseY + Math.sin(elapsedTime * u.speed + u.phase) * 0.15;
      }
      if (u.baseX !== undefined) {
        el.position.x = u.baseX + Math.cos(elapsedTime * (u.speed * 0.5) + u.phase) * 0.2;
      }
      if (u.rotSpeedX) el.rotation.x += u.rotSpeedX;
      if (u.rotSpeedY) el.rotation.y += u.rotSpeedY;
    });

    renderer.render(scene, camera);
  }
})();
