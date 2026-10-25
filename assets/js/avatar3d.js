/* ==========================================================================
   About 头像 3D 模式：Three.js 加载 GLB 模型，头部随鼠标连续旋转
   - 懒加载：首次切到 3D 才下载模型
   - 透明背景融入页面纸色，模型自动居中适配
   - 鼠标 X/Y → 模型平滑旋转（lerp），无跳帧
   ========================================================================== */
(async function () {
  "use strict";
  const wrap = document.querySelector("[data-avatar]");
  if (!wrap) return;
  const c3d = wrap.querySelector("[data-avatar-3d]");
  const btns = wrap.querySelectorAll("[data-mode]");
  if (!c3d || !btns.length) return;

  const DRACO_DECODER = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/";

  let mode = "2d";
  let inited = false, failed = false;
  let renderer, scene, camera, model, mixer;
  let targetRX = 0, targetRY = 0, curRY = 0, curRX = 0, raf = 0;
  let W = 0, H = 0;

  function setMode(m) {
    mode = m;
    wrap.classList.toggle("mode-3d", m === "3d");
    btns.forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-mode") === m);
      b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === m));
    });
    if (m === "3d") init();
    try { localStorage.setItem("avatar-mode", m); } catch (e) {}
  }

  async function init() {
    if (inited) { kick(); return; }
    inited = true;
    try {
      const [THREEmod, GLTFmod, DRACOmod] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/loaders/DRACOLoader.js")
      ]);
      const THREE = THREEmod;
      const { GLTFLoader } = GLTFmod;
      const { DRACOLoader } = DRACOmod;

      const rect = c3d.getBoundingClientRect();
      W = rect.width || 208; H = rect.height || 208;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(W, H);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      c3d.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
      camera.position.set(0, 0.35, 3.2);

      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(2, 3, 3);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff, 1.2);
      rim.position.set(-2, 1, -2);
      scene.add(rim);

      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath(DRACO_DECODER);
      loader.setDRACOLoader(draco);
      const gltf = await loader.loadAsync("assets/models/avatar.glb");
      model = gltf.scene;
      // 居中 + 缩放
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const scale = 2.1 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.y += 0.1;
      scene.add(model);

      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
      }

      new ResizeObserver(function () {
        const r = c3d.getBoundingClientRect();
        W = r.width || 208; H = r.height || 208;
        renderer.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
      }).observe(c3d);

      kick();
    } catch (e) {
      failed = true;
      console.error("3D load failed:", e);
      setMode("2d");
    }
  }

  function loop(t) {
    if (mode !== "3d") { raf = 0; return; }
    curRY += (targetRY - curRY) * 0.12;
    curRX += (targetRX - curRX) * 0.12;
    if (model) { model.rotation.y = curRY; model.rotation.x = curRX; }
    if (mixer) mixer.update(0.016);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  wrap.addEventListener("pointermove", function (e) {
    if (mode !== "3d" || !renderer) return;
    const r = c3d.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    targetRY = x * 1.4;      // 左右转头
    targetRX = -y * 0.5;     // 上下轻微
    kick();
  });
  wrap.addEventListener("pointerleave", function () {
    targetRY = 0; targetRX = 0; kick();
  });

  btns.forEach(function (b) {
    b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); });
  });

  let saved = "2d";
  try { saved = localStorage.getItem("avatar-mode") || "2d"; } catch (e) {}
  if (saved === "3d") setMode("3d");
})();
