//lucid.app/documents/embeddedchart/d9ac4c82-8cb8-43d2-bd67-c0f5438e2086
import * as THREE from "//cdn.skypack.dev/three@0.131.1/";
import { OrbitControls } from "//cdn.skypack.dev/three@0.131.1/examples/jsm/controls/OrbitControls.js";
import { OimoPhysics } from "//cdn.skypack.dev/three@0.131.1/examples/jsm/physics/OimoPhysics.js";
import { TWEEN } from "//cdn.skypack.dev/three@0.131.1/examples/jsm/libs/tween.module.min.js";
import { GUI } from "//cdn.skypack.dev/three@0.131.1/examples/jsm/libs/dat.gui.module.js";
import Stats from "//cdn.skypack.dev/three@0.131.1/examples/jsm/libs/stats.module.js";
import { Perlin, FBM } from "//assets.codepen.io/697675/three-noise.js?v=131.1";

vis = {
  cfg: {
    demo: true,
    shield: 0,
    type: "oscillator",
    axis: "z",
    bands: { sub: 3, max: 3 },
    //style
    intensity: 1,
    primary: { hex: "#4040c0" },
    accents: { hex: "#c04040" },
    loss: 3,
    //music
    delay: 5,
    iso: 15 / 128
  },
  var: {
    frame: 1,
    time: { start: null, delta: [], tweens: {} },
    resolution: (window.innerWidth + window.innerHeight) / 2,
    freqPeak: [],
    PATH: {
      width: 10,
      min: 0.4,
      axis: null,
      type: null,
      freqBand: {},
      freqPeak: {},
      doRadial: function (seg, tot, freq = 1, seed = 0) {
        seg += 1;
        let PI = Math.PI;
        // total angle
        let angle = (2 * PI) / tot;
        let m = angle * seg;

        // position offsets, primary
        let dist = (vis.var.PATH.width + vis.var.PATH.min * freq) / 2;
        let x = Math.cos(m + seed * 360) * dist;
        let z = Math.sin(m + seed * 360) * dist;

        // rotation radians, secondary
        let deg = (seg / tot) * 360;
        let rad = deg * (PI / 180);

        // clockwise from (-5,0)
        return { x: -x, z: -z || 15, rad: -rad };
        // note: radial amplitude affects directionality
      }
    }
  },
  mat: function material(opts = {}) {
    // material performance
    let type = [
      "MeshStandardMaterial",
      "MeshStandardMaterial",
      "MeshStandardMaterial",
      "MeshPhongMaterial",
      "MeshPhongMaterial"
    ][vis.cfg.loss - 1];
    if (opts.type) {
      // force type (MeshBasicMaterial)
      type = opts.type;
    }
    // type-specific
    opts.roughness = opts.roughness || 0.5;
    opts.metalness = opts.metalness || 0.66;
    opts.shininess = opts.shininess || 150;
    // core
    let mat = new THREE[type]({
      color: opts.color || vis.cfg.primary.col,
      side: opts.side || THREE.FrontSide,
      shadowSide: opts.shadowSide || THREE.BackSide,
      userData: opts
    });
    mat.color.convertSRGBToLinear();
    // mesh-specific
    for (let key in opts) {
      if (mat.hasOwnProperty(key)) {
        mat[key] = opts[key];
      }
    }
    return mat;
    //www.donmccurdy.com/2020/06/17/color-management-in-threejs/
  },
  three: async function () {
    //github.com/lo-th/Oimo.js/
    //codepen.io/ste-vg/pen/BazEQbY
    let vars = vis.var;
    const physics = (vars.physics = await OimoPhysics());

    // COMMON
    const PI = Math.PI;
    // color
    vis.cfg.primary.col = new THREE.Color(
      vis.cfg.primary.hex
    ).convertSRGBToLinear();
    vis.cfg.accents.col = new THREE.Color(
      vis.cfg.accents.hex
    ).convertSRGBToLinear();
    // material
    vis.cfg.primary.mat = vis.mat({
      color: vis.cfg.primary.col,
      flatShading: true
    });
    vis.cfg.accents.mat = vis.mat({
      color: vis.cfg.accents.col,
      flatShading: true
    });

    // SCENE
    const scene = (vars.scene = new THREE.Scene());
    const environ = (vars.environ = new THREE.Group());
    environ.name = "environ";
    scene.add(environ);
    // camera group: camera mount, camera proper, local axis, orbit target
    vars.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      120
    );
    vars.camera.position.set(0, 1, 15);
    scene.add(vars.camera);

    // camera orbit target
    let mount = new THREE.Group();
    let orbit = new THREE.Object3D();
    orbit.position.z = vars.PATH.width;
    vars.camera.userData = {
      mount: mount,
      orbit: orbit
    };
    mount.add(orbit);
    scene.add(mount);

    // catmull render texture (fractal)
    vars.renderCatmull = new THREE.WebGLRenderTarget(256, 256);
    const cameraCatmull = new THREE.OrthographicCamera(-15, 15, 15, -15, 1, 20);
    cameraCatmull.name = "catmull frame";
    cameraCatmull.position.set(0, -90, 0);
    cameraCatmull.lookAt(0, -100, 0);
    vars.cameraCatmull = cameraCatmull;
    scene.add(cameraCatmull);
    // catmull materials
    vars.matCatmullL = vis.mat({
      color: vis.cfg.accents.col,
      type: "LineBasicMaterial"
    });
    vars.matCatmullM = vis.mat({
      color: vis.cfg.accents.col,
      type: "MeshBasicMaterial",
      side: THREE.BackSide
    });

    let maskFractal = vis.mat({
      color: vis.cfg.accents.col,
      map: vis.var.renderCatmull.texture,
      transparent: true,
      alphaTest: 1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, //THREE.AdditiveBlending
      emissive: vis.cfg.primary.col,
      emissiveIntensity: 0.125
    });

    vars.matCatmullT = maskFractal;

    // center
    //var box = new THREE.Box3().setFromObject( mesh );
    //box.center( mesh.position ); // this re-sets the mesh position
    //mesh.position.multiplyScalar( - 1 );
    //

    const renderer = (vars.renderer = new THREE.WebGLRenderer({
      antialias: true
      //precision: "mediump", // lowp washed-out
    }));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio / vis.cfg.loss);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);

    // MATERIALS

    const glass = vis.mat({
      transparent: true,
      opacity: 0.25,
      specular: vis.cfg.primary.col,
      flatShading: true,
      shininess: 50,
      depthWrite: false // no artifact
    });

    // RENDER TEXTURE MIDI PORTAL
    //threejs.org/examples/webgl_rtt.html
    vars.renderMIDI = new THREE.WebGLRenderTarget(256, 256, {
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter
    });

    // portal scene
    const sceneMIDI = (vars.sceneMIDI = new THREE.Scene());
    sceneMIDI.add(vars.camera);
    const light = new THREE.AmbientLight(0xffffff, 40);
    sceneMIDI.add(light);

    // MIDI notes InstancedMesh
    let iso = new THREE.PlaneGeometry(1, 1);
    iso.translate(0, 1, 0); // pivot rotation

    let midi = (vars.midiNote = new THREE.InstancedMesh(
      iso,
      vis.mat({
        // fastest flat-shade
        type: "MeshBasicMaterial",
        depthTest: false
      }),
      Math.floor(vars.resolution / 8) * 5
      //128 * vis.cfg.delay // max count is 128 keys * ~5 seconds
    ));
    midi.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    midi.userData.dummy = new THREE.Object3D();
    midi.name = "MIDI note";
    sceneMIDI.add(midi);

    // LIGHTS
    // frontal accent (audio range color)
    const near = new THREE.PointLight(vis.cfg.accents.col, 16, 20, 2);
    near.position.set(0, 5, 10);
    near.name = "near";
    // direct drama (audio room shadow)
    const far = new THREE.PointLight(vis.cfg.primary.col, 8, 25, 2);
    far.position.set(0, 5, 10);
    far.castShadow = true;
    far.name = "far";
    // low fill (falling peak shadow)
    const low = new THREE.PointLight(vis.cfg.accents.col, 32, 30, 2);
    low.position.set(0, -10, 5);
    low.castShadow = true;
    low.name = "low";
    // shadow sizes
    far.shadow.mapSize = low.shadow.mapSize = new THREE.Vector2(128, 128);
    environ.add(near, far, low);

    // OBJECTS

    // environment audio...
    const plane = new THREE.PlaneGeometry(40, 40, 20, 20);
    plane.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const sky = new THREE.Mesh(
      plane,
      vis.mat({
        flatShading: false
      })
    );
    sky.userData = {
      position: sky.geometry.attributes.position.clone(),
      normal: sky.geometry.attributes.normal.clone()
    };
    sky.name = "audio_hi";
    sky.position.y = 12.5;
    sky.rotation.x = 0.5 * PI;
    sky.receiveShadow = true;

    const sphere = new THREE.IcosahedronGeometry(20, 3);
    sphere.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const skyBox = new THREE.Mesh(
      sphere,
      vis.mat({
        side: THREE.BackSide,
        shininess: 500,
        roughness: 0.25,
        flatShading: true
      })
    );
    skyBox.userData = {
      position: skyBox.geometry.attributes.position.clone(),
      normal: skyBox.geometry.attributes.normal.clone()
    };
    skyBox.name = "audio_lo";
    skyBox.receiveShadow = true;

    environ.add(sky, skyBox);

    // floor...
    const floorL = new THREE.Mesh(new THREE.BoxGeometry(25, 0.2, 25), glass);
    floorL.name = "floor_sleep";
    floorL.position.y = -5;
    floorL.rotation.y = -PI / 4;
    floorL.receiveShadow = true;
    environ.add(floorL);
    physics.addMesh(floorL, 0);

    const floorF = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.2, 40),
      vis.mat()
    );
    floorF.name = "floor_solid";
    floorF.position.z = -20;
    floorF.castShadow = true;
    floorF.receiveShadow = true;
    environ.add(floorF);
    physics.addMesh(floorF, 0);

    const floorN = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 40), glass);
    floorN.name = "floor_glass";
    floorN.position.z = 20;
    //floorN.castShadow = true;
    floorN.receiveShadow = true;
    environ.add(floorN);
    physics.addMesh(floorN, 0);

    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 1.2), vis.mat());
    base.name = "floor_origin";
    base.castShadow = true;
    base.receiveShadow = true;
    environ.add(base);
    physics.addMesh(base, 0);

    // portal...
    const ring = new THREE.RingGeometry(0, 10, 6, 1, 0, PI * 2);
    const portalRT = new THREE.Mesh(
      ring,
      vis.mat({
        map: vars.renderMIDI.texture,
        alphaTest: 0.25,
        emissive: vis.cfg.primary.col,
        emissiveIntensity: 0.125
      })
    );
    portalRT.name = "portal_render";
    const portalGlass = new THREE.Mesh(ring, glass);
    portalGlass.name = "portal_glass";
    portalRT.position.z = portalGlass.position.z = -15;
    environ.add(portalRT, portalGlass);

    // shield...
    const icon = vis.mat({
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      alphaMap: new THREE.TextureLoader().load(
        "//assets.codepen.io/697675/shield_mask.png"
      )
    });
    icon.alphaMap.minFilter = icon.alphaMap.magFilter = THREE.NearestFilter;

    const shield = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), icon);
    shield.name = "shield";
    shield.geometry.rotateX(-PI / 2);
    environ.add(shield);

    const shieldHit = new THREE.Mesh(
      new THREE.BoxGeometry(10, 5, 5),
      vis.mat({
        visible: false,
        wireframe: true,
        type: "MeshBasicMaterial"
      })
    );
    shieldHit.name = "shield_hit";
    environ.add(shieldHit);
    physics.addMesh(shieldHit, 1e6);

    // BANDS, PEAKS
    vis.fpath(true, {
      name: "freqBand"
    });
    vis.fpath(true, {
      name: "freqPeak",
      axis: "x"
    });

    // BEATS MIDI
    const beats = (vars.midiBeat = new THREE.InstancedMesh(
      new THREE.BoxGeometry(vars.PATH.min, vars.PATH.min, vars.PATH.min),
      vis.cfg.primary.mat,
      8
    ));

    beats.userData = {
      idx: [],
      dummy: new THREE.Object3D(),
      color: vis.cfg.primary.col.clone()
    };

    for (let i = beats.count; i--; ) {
      beats.setColorAt(i, beats.userData.color);
      beats.userData.idx[i] = {
        note: {},
        dummy: new THREE.Object3D()
      };
    }
    beats.instanceColor.needsUpdate = true;
    beats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    //
    //beats.castShadow = true;
    beats.name = "MIDI beat";
    vars.scene.add(beats);
    beats.count = 0;

    // OUTPUT
    document.body.appendChild(renderer.domElement);
    vis.stats = new Stats();
    document.body.appendChild(vis.stats.dom);
    vis.gui.controllers = vis.gui.create(vis.cfg);

    //camera range limits
    let controls = (vars.controls = new OrbitControls(
      vars.camera,
      renderer.domElement
    ));
    // limits
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 25;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = PI / 1.75;
    controls.minAzimuthAngle = -PI / 3;
    controls.maxAzimuthAngle = PI / 3;
    controls.update();

    vis.render(performance.now());

    // EVENT LISTENERS
    let optEL = {
      capture: true,
      passive: true
    };

    let resizeTimer;
    vis.ux.resize = function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        let width = window.innerWidth,
          height = window.innerHeight;
        vars.camera.aspect = width / height;
        vars.camera.updateProjectionMatrix();
        vars.renderer.setSize(width, height);
        // res contributes to performance
        vars.resolution = (width + height) / 2;
      }, 250);
    };
    window.addEventListener("resize", vis.ux.resize, optEL);

    document.addEventListener("mousemove", vis.ux.pointer, optEL);

    document
      .getElementById("webaudio")
      .addEventListener("click", vis.WA.button, optEL);

    document
      .getElementById("midiFile")
      .addEventListener("change", vis.MM.button, optEL);

    document
      .getElementById("playback")
      .addEventListener("click", vis.MM.playback, optEL);
  },

  fpath: function (arg, opts = {}) {
    // arg valid: false, power, axis, type...
    let power = typeof arg == "number" ? arg : false;
    let o = opts.o ? opts.o : { x: 0, y: 0, z: 0 };
    // the primary axis central to visuals
    let PATH = vis.var.PATH;
    let axis = opts.axis || vis.cfg.axis;
    PATH.type = vis.cfg.type;
    PATH.axis = vis.cfg.axis;

    // arg==power ? fun blocks : intial max/sub || type/axis select

    let label = power !== false ? "freqPeak" : opts.name || "freqBand";
    //console.log(arg, power, label, opts.name)

    let coord = [];
    let key = PATH[label];
    key.name = opts.name = label;
    // instancedMesh
    // fun blocks or max
    let pSource = power ? power : vis.cfg.bands.max;
    key.count = Math.pow(2, pSource);
    key.mass = label == "freqBand" ? 0 : 100;
    key.width = PATH.width / key.count;
    key.depth = 1;
    // tertiary animation
    if (label == "freqBand" && axis != "x") {
      key.depth = key.count;
      if (axis == "z" && PATH.type == "spectrum") {
        key.depth = key.count / 2;
        key.count = key.count * 2;
      }
    }

    // PLOT COORDS
    let idx = 0,
      tot = key.count * key.depth;
    for (let i = 0, iL = key.depth; i < iL; i++) {
      for (let j = 0, jL = key.count; j < jL; j++) {
        let prc = +(j / key.count).toFixed(3);
        let dummy = new THREE.Object3D();
        //position, centered

        let m = 0;
        if (axis == "x") {
          // type spectrum: frequency analyzer (1d)
          // type oscillator: linear oscillator (1d)
          dummy.position.x = key.width * j;
          dummy.position.x -= (PATH.width - key.width) / 2;
        } else if (axis == "y") {
          // type spectrum: grid spectrograph (2d)
          // type oscillator: radial fractal (2d)
          if (PATH.type == "oscillator") {
            let rot = PATH.doRadial(idx, tot);
            dummy.position.x = rot.x;
            dummy.position.z = rot.z;
            dummy.rotation.y = rot.rad;
            // chance of alternate style
            if (vis.var.frame % 2 == 0) {
              prc = +(idx / tot).toFixed(3);
            }
          } else if (PATH.type == "spectrum") {
            dummy.position.x = key.width * j;
            dummy.position.x -= (PATH.width - key.width) / 2;
            dummy.position.z = i * -PATH.freqBand.width;
          }
        } else if (axis == "z") {
          // starfield, path runner

          // turn 90-deg for square
          dummy.rotation.z += Math.PI / 2;

          if (PATH.type == "oscillator") {
            // scale
            //dummy.scale.set(0.25, 20, 20);
            let rot = PATH.doRadial(Math.floor(idx / key.count), key.count);
            // position, nearly 0 fills gap but vector permits scale
            //dummy.position.set(0, 0, 0)
            dummy.position.x = rot.x / PATH.width;
            dummy.position.z = rot.z / PATH.width;
            //dummy.position.x = 0;
            //dummy.position.z = 0;

            // rotation
            dummy.rotation.y = rot.rad;
            // corner at center
            dummy.rotation.y += Math.PI / 4;
          } else if (PATH.type == "spectrum") {
            let factor = 6;
            let mid = key.count / 4;
            function quad(int) {
              return int % mid;
            }

            // scale
            //dummy.scale.set(0.25, 20, 20);

            // x-pos, centered
            dummy.position.x = key.width * quad(j);
            dummy.position.x -= PATH.freqBand.width / 2 + key.width;
            // z-pos, centered
            dummy.position.z = -PATH.freqBand.width * Math.floor(j / key.depth);
            dummy.position.z += PATH.freqBand.width / 2 + key.width;
            // y-pos, halfpipe

            let jMid = quad(j) < mid / 2 ? 0 : 1;
            let halfpipe = Math.abs(mid / 2 - (quad(j) + jMid));
            dummy.position.y = (halfpipe * factor) / 2;
            dummy.rotation.z +=
              -(Math.PI / 16) * (halfpipe + 1) * (jMid ? -1 : 1);

            // position multiple
            dummy.position.multiply(new THREE.Vector3(factor, 1, factor));
            dummy.position.y -= 10;
          }
        }

        // output
        let offset = new THREE.Vector3(o.x, o.y, o.z);
        dummy.position.add(offset);
        dummy.updateMatrix();

        if (coord[i] == undefined) {
          coord[i] = [];
        }
        coord[i][j] = {
          proto: dummy,
          m: m,
          prc: prc
        };
        idx++;
      }
    }

    coord = coord.flat();
    key.coords = coord;

    if (typeof arg == "string") {
      // mesh reset for axis/type change
      opts.reset = true;
    }
    vis.fmesh(power, opts);
  },
  fmesh: function (power, opts = {}) {
    let vars = vis.var;

    let instancedMesh;
    let PATHs =
      opts.name == "freqBand" ? vars.PATH.freqBand : vars.PATH.freqPeak;

    if(opts.name == "freqPeak" && vars.freqPeak.length >= 4){return}
    if (!opts.reset) {
      // create instancedMesh to limit
      const box = new THREE.BoxGeometry(
        PATHs.width,
        vars.PATH.min,
        vars.PATH.min
      );

      instancedMesh = new THREE.InstancedMesh(
        box,
        vis.cfg.accents.mat,
        PATHs.count * PATHs.depth
      );
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instancedMesh.name = PATHs.name;
      instancedMesh.castShadow = true;
    } else {
      instancedMesh = vars.freqBand;
    }

    let len = PATHs.depth * PATHs.count;
    if (opts.name == "freqBand") {
      // reset custom properties, timeline
      instancedMesh.position.set(0, 0, 0);
      instancedMesh.userData.depth = 0;
      instancedMesh.count = len;

      if (vars.PATH.axis == "z") {
        //random blend mode
        let blend = [
          THREE.AdditiveBlending,
          THREE.SubtractiveBlending,
          THREE.MultiplyBlending
        ];
        vars.matCatmullT.blending =
          blend[Math.floor(Math.random() * blend.length)];
        // material no sides, no shadow
        instancedMesh.material = [vars.matCatmullT, null];
        instancedMesh.castShadow = false;
        // staging assets
        if (vars.PATH.type == "oscillator") {
          instancedMesh.position.set(0, -20, -5);
        }
      } else {
        instancedMesh.material = vis.cfg.accents.mat;
        instancedMesh.castShadow = true;
      }
    }

    // loop instancedMesh from PATH dummy, set color
    let hue = vis.cfg.accents.col.clone();
    let hues = [
      hue.clone().multiplyScalar(0.33),
      hue.clone().multiplyScalar(0.66)
    ];
    instancedMesh.userData.dummy = [];

    while (len--) {
      let coord = PATHs.coords[len];
      if (PATHs.name == "freqBand") {
        instancedMesh.userData.dummy[len] = coord.proto;
      }
      // color bass/treble
      let hue = coord.prc < 0.5 ? hues[0] : hues[1];

      instancedMesh.setMatrixAt(len, coord.proto.matrix);
      instancedMesh.setColorAt(len, hue);
    }
    instancedMesh.instanceColor.needsUpdate = true;
    instancedMesh.instanceMatrix.needsUpdate = true;

    // output mesh, physics
    if (PATHs.name == "freqPeak") {
      vars[PATHs.name].push(instancedMesh);
      vars.physics.addMesh(instancedMesh, PATHs.mass);
    } else {
      vars[PATHs.name] = instancedMesh;
    }

    vars.scene.add(instancedMesh);

    // mesh animation params
    //instancedMesh.userData.depth = 0; // internal timeline
    //instancedMesh.userData.origin = true; // transition state
  },
  fwave: function (vars, bpf) {
    // PATH
    const PATH = vars.PATH;
    const type = PATH.type,
      axis = PATH.axis;
    const max = PATH.freqBand;
    // instancedMesh
    const bands = vars.freqBand,
      peaks = vars.freqPeak[0];
    // accumulate
    let pL = 0;
    let freq = [];
    let catmullRom = [];
    // yOsc to 180-deg in 2s at 60fps
    let t = 60 * 2;
    const seed = (1e-3 + ((vars.frame / t) % t)) / t;

    // depth cycle
    let userData = bands.userData;
    if (userData.depth >= max.depth) {
      userData.depth = 0;
    }
    // count loop
    let i = userData.depth * max.count;
    let iL = i + max.count;
    if ((axis == "y" && type == "oscillator") || axis == "z") {
      if (axis == "z") {
        i = 0;
      }
      iL = max.coords.length;
    }

    // transform PATH dummy(s) by type/axis with WebAudio
    for (; i < iL; i++) {
      let coords = max.coords[i];
      // dummy transform, compound or simple
      let cumulate = axis == "y" && type == "oscillator";
      let dummy = cumulate ? coords.proto : coords.proto.clone();

      // WebAudio analyser
      let data = vis.WA.analyser.data;
      let frequency =
        data[Math.floor((data.length - 1) * coords.prc)];
      freq.push(frequency);
      frequency = (frequency / 256 / 2) * 100;

      // y-oscillator
      let rot = PATH.doRadial(i, max.coords.length, frequency, seed);

      // TRANSFORM BANDS

      let dPos = dummy.position;
      if (axis != "z") {
        // cumulate z could be lerped, yet only y-oscillator uses
        dummy.scale.set(1, 1, 1);
        // position
        if (type == "oscillator") {
          if (axis == "x") {
            dPos.y = (PATH.min / 2) * frequency;
          } else if (axis == "y") {
            dPos.x = rot.x;
            dPos.z = rot.z;
            dPos.y = 0;
          }
        }

        // rotation
        if (axis == "y" && type == "oscillator") {
          //let last = dummy.rotation.y;
          dummy.rotateY(-(6.28319 / 60 / 4));
        }

        // scale
        if (type == "spectrum") {
          dummy.scale.y = 1 + frequency;
        }
      } else {
        // secondary animation param (userData.depth)
        let nFreq = freq[i] / 256,
          nDepth = 0;

        if (type == "spectrum") {
          dummy.scale.set(0.25, 20, 20);
          nDepth = Math.floor(i / max.count) / max.depth;
          let fScale = (nFreq * nDepth) / 2;
          let orbit = new THREE.Vector3();
          vars.camera.userData.orbit.getWorldPosition(orbit);

          // chase camera position and scale tier
          dPos.lerp(orbit, fScale);
          dummy.rotateY((-Math.PI / 4) * nDepth);
          dummy.rotateX((-Math.PI / 8) * nDepth);
          dummy.scale.y *= 1 - fScale;
          dummy.scale.z *= 1 - fScale;
        } else if (type == "oscillator") {
          dummy.scale.set(0.25, 80, 80);
          nDepth = (i % max.count) / max.count;

          // starburst or fractal
          let fractal = dPos.clone();
          fractal.multiply(new THREE.Vector3(1 + nFreq, 1, 1 + nFreq));
          dPos.lerp(fractal, 0.5);

          dummy.rotateZ((-Math.PI / 2) * nDepth);
          dummy.scale.multiplyScalar(1 + nFreq);
        }
        //dummy.position.y += nDepth / 64;
        //if (!userData.origin) {
        //  // halfpipe
        //} else {
        //  // fractal
        //}

        let hue = vis.cfg.primary.col.clone();
        hue.offsetHSL(nFreq, 0, nFreq);
        bands.setColorAt(i, hue);
      }

      // UPDATE BANDS
      dummy.updateMatrix();
      bands.setMatrixAt(i, dummy.matrix);
      //bands.userData.dummy[i].copy(dummy);

      // catmull
      let cPos = axis != "x" ? new THREE.Vector3(rot.x, rot.z, 0) : dPos;
      catmullRom.push(cPos);

      // TRANSFORM PEAKS
      if (peaks && axis != "z") {
        let sub = PATH.freqPeak;

        let iP = i;
        // peaks (0-7) is some factor of bands (0-63)
        let factor = true;
        if (axis == "y") {
          if (type == "spectrum") {
            iP = pL;
          } else if (type == "oscillator" && i % 8 != 0) {
            factor = false;
          }
        }
        if (pL < peaks.count && factor) {
          //let hue = new THREE.Color();
          //bands.getColorAt(i, hue);
          //let p = Math.floor(i / sub.factor);
          let _dummy = dummy.clone();
          // frequency threshold
          if (freq[iP] > bpf * 1.5) {
            let posOff = frequency * (PATH.min / 2);
            if (axis == "z") {
              _dummy.position.z = posOff;
              _dummy.rotation.set(0, 0, 0);
              _dummy.scale.set(1, 0.5, 1);
            } else {
              _dummy.scale.set(1, 1, 1);
              if (type == "oscillator") {
                _dummy.scale.y = 2;
              } else if (type == "spectrum") {
                _dummy.position.y = posOff + PATH.min * 2;
              }

              if (axis == "y" && type == "oscillator") {
                _dummy.scale.set(2, 2, 2);
              } else {
                _dummy.rotation.set(0, 0, 0);
              }
            }
            // color freq exceed

            //hue.multiplyScalar(1.5);
            //peaks.setColorAt(pL, hue);
          }
          // color freq normal
          //peaks.setColorAt(pL, hue);

          // UPDATE PEAKS
          _dummy.updateMatrix();
          peaks.setMatrixAt(pL, _dummy.matrix);
          vars.physics.setMeshPosition(peaks, _dummy.position, pL);
          pL++;
        }
      }
    }
    bands.instanceMatrix.needsUpdate = true;
    peaks.instanceMatrix.needsUpdate = true;
    bands.instanceColor.needsUpdate = true;

    // UPDATE CATMULL
    let catmull = vars.freqCatmull;
    if (catmull != undefined) {
      // CatmullRom dispose
      catmull.geometry.dispose();
      catmull.removeFromParent();
      catmull = null;
    }

    if (type == "oscillator" || axis == "z") {
      // CatmullRom create, every frame
      let spline = new THREE.CatmullRomCurve3(catmullRom);
      spline.closed = axis != "x" ? true : false;
      let points = spline.getPoints(64);

      if (spline.closed) {
        let shape = new THREE.Shape(points);
        let geometry = new THREE.ShapeGeometry(shape);
        catmull = new THREE.Mesh(geometry, vars.matCatmullM);
        catmull.rotateX(1.5708);
        if (axis == "z") {
          catmull.position.y = -100;
        }
      } else {
        let geometry = new THREE.BufferGeometry().setFromPoints(points);
        // CatmullRom to scene
        catmull = new THREE.Line(geometry, vars.matCatmullL);
      }
      catmull.position.y -= 0.01; // !flickr
      vars.scene.add(catmull);
      vars.freqCatmull = catmull;
    }

    // advance secondary iterator
    if (vars.frame % 60 == 0) {
      if (!(axis == "y" && type == "oscillator")) {
        userData.depth++;
      }
    }
  },
  fnoise: function (timestamp, frequency, mesh, type) {
    let geo = mesh.geometry;
    const position = geo.attributes.position;
    const normal = geo.attributes.normal;

    const p = [];
    for (let i = 0; i < position.count; i++) {
      const pos = new THREE.Vector3().fromBufferAttribute(
        mesh.userData.position,
        i
      );
      const norm = new THREE.Vector3().fromBufferAttribute(
        mesh.userData.normal,
        i
      );
      const newPos = pos.clone();

      pos.multiplyScalar(0.125);
      pos.z += timestamp * 0.002;
      const n = vis.WA.noise[type](pos) * frequency;

      newPos.add(norm.multiplyScalar(n));

      p.push(newPos);
    }

    position.copyVector3sArray(p);

    geo.computeVertexNormals();
    geo.attributes.position.needsUpdate = true;
  },
  midi: function (file) {
    //hello-magenta.glitch.me/
    let vars = vis.var;
    let midi = vars.midiNote,
      beats = vars.midiBeat;
    let MM = vis.MM;
    const iso = vis.cfg.iso;
    const delay = vis.cfg.delay;

    // create file or update notes
    if (file) {
      // reset magenta, idle...
      vis.MM.playback("stop");
      let sequence = mm.midiToSequenceProto(file);
      let bins = (sequence.bins = []);
      let last = false;
      for (let i = sequence.notes.length; i--; ) {
        let note = sequence.notes[i];
        //en.wikipedia.org/wiki/File:GMStandardDrumMap.gif
        note.isDrumBD = note.isDrum && (note.pitch == 35 || note.pitch == 36);
        note.duration = note.endTime - note.startTime;

        if (last == false) {
          last = note;
        }
        let sequential = last.startTime >= note.startTime;
        if (note.duration >= 15 || note.duration <= 0) {
          //console.log("note error");
          sequence.notes.splice(i, 1);
          continue;
        }

        // bin notes for render performance
        let bin = Math.floor(note.startTime / delay);
        if (bins[bin] == undefined) {
          bins[bin] = [];
        }
        note.idx = {
          bin: bin,
          i: bins[bin].length
        }; //lookup
        bins[bin].push(note);
      }

      // dynamic timing measure
      let bar = sequence.tempos[0].qpm / 4;
      vars.time.tempo = {
        bar: 60 / bar,
        next: delay
      };

      document.getElementById("midiJSON").value = JSON.stringify(
        sequence,
        undefined,
        2
      );

      // magenta visualizer
      if (MM.mmVis == undefined) {
        MM.mmVis = new mm.PianoRollSVGVisualizer(sequence, MM.dom, MM.config);
      } else {
        MM.mmVis.noteSequence = sequence;
      }

      // magenta svg
      MM.mmVis.svg.setAttribute(
        "viewBox",
        "0 0 " + sequence.totalTime * MM.mmVis.config.pixelsPerTimeStep + " 640"
      );

      // playhead magenta
      MM.mmPlay.start(sequence);
      MM.playback("pause");
      MM.mmPlay.seekTo(0);
      // avoid 2x calls
      return;
    } else if (MM.state == "stopped" && !midi.userData.state) {
      // IDLE PORTAL
      let count = 4;
      let dummy = midi.userData.dummy;
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(4, 4, 4);
      dummy.updateMatrix();
      // center
      let midScale = dummy.scale.x / 2;
      let offset = -count * midScale;
      // distribute
      let idx = 0;
      for (let row = count; row--; ) {
        for (let col = count; col--; ) {
          let x = col * dummy.scale.x + midScale;
          let y = col;
          let z = -row * dummy.scale.z - midScale;
          dummy.position.set(x + offset, y, z - offset);
          dummy.updateMatrix();
          // update one
          midi.setMatrixAt(idx, dummy.matrix);
          idx++;
        }
      }
      // update all
      midi.instanceMatrix.needsUpdate = true;
      midi.count = count * count;
      midi.userData.state = true;
    }

    // RENDER LOOP

    let elapsed = vars.time.elapsed / 1000;

    if (MM.state == "paused" && midi.userData.state < delay) {
      // magenta delay for lead-in
      if (elapsed > delay) {
        midi.userData.state = delay;
        MM.playback("resume");
      } else {
        let countdown = (elapsed - delay).toFixed(2);
        MM.playback("time", countdown);
      }
    }

    if (MM.state == "stopped") {
      // IDLE
      let dummy = midi.userData.dummy;
      for (let i = midi.count; i--; ) {
        midi.getMatrixAt(i, dummy.matrix);
        dummy.position.setFromMatrixPosition(dummy.matrix);
        dummy.position.setY(4 * Math.sin(vars.frame / 30 + i / midi.count) + 5);
        // update
        dummy.updateMatrix();
        midi.setMatrixAt(i, dummy.matrix);
      }
      midi.instanceMatrix.needsUpdate = true;
    } else if (MM.state == "started" || midi.userData.state < delay) {
      // adaptive framerate
      let dropFrame = vars.frame % (vis.cfg.loss * 10) !== 0;
      if (!dropFrame) {
        // DRAW RANGE
        // hard near
        let idx = Math.floor(elapsed / delay) - 2;
        let bins = MM.mmVis.noteSequence.bins;
        // hard far
        let seq = bins.slice(idx > 0 ? idx : 0, idx + 14).flat();
        seq = seq.filter(function (note) {
          // soft near/far, error...
          if (note != null) {
            let limNear = note.startTime > elapsed - delay * 2;
            let limFar = note.endTime < elapsed + delay * 10;
            if (limNear && limFar) {
              return true;
            }
            if (!limNear && note.active && note.isBeat != true) {
              //console.log('cull');
              bins[note.idx.bin][note.idx.i] = null;
            }
          }
        });
        // adjust counts
        seq.sort((a, b) => a.startTime - b.startTime);
        seq = seq.slice(0, midi.instanceMatrix.count);
        midi.count = seq.length;

        // BEATS QPM
        let tempo = vars.time.tempo;
        tempo.avail = elapsed >= tempo.next;
        // MIDI
        let dummy = midi.userData.dummy;
        let x, y, z;
        for (let i = 0; i < seq.length; i++) {
          let note = seq[i];
          const lead = elapsed - note.startTime;
          const grow = note.active ? 3 : 1;
          // transform (for rotation)
          x = note.pitch * iso - (iso * 128) / 2;
          y = lead < 0 ? (-lead * 0.25) ** 2 : 0;
          z = lead;
          // position (and offsets)
          dummy.position.set(x, y + iso * 2, z + note.duration / 2 - delay);
          dummy.rotation.x = z < 0 ? -1.5708 - y / z : -1.5708;
          dummy.scale.set(iso * grow, note.duration, 1);
          // update
          dummy.updateMatrix();
          midi.setMatrixAt(i, dummy.matrix);
          //threejs.org/examples/?q=clip#webgl_clipping_stencil

          if (tempo.avail && !note.isBeat && lead < -delay) {
            // midi delayed
            vis.ux.beat(note);
          }
        }
        midi.instanceMatrix.needsUpdate = true;
      }

      // BEATS
      let index = beats.userData.idx;
      for (let i = beats.count; i--; ) {
        let note = index[i].note;
        let dummy = index[i].dummy;

        // ux / hit

        if (note.active) {
          let scale = dummy.scale;
          let C = 0.96;
          dummy.scale.set(scale.x * C, scale.y * C, scale.z * C);
        } else {
          let scale = note.isDrumBD ? 2 : 1;
          scale *= dummy.userData.hit ? 1.5 : 1;
          dummy.scale.set(scale, scale, scale);
        }
        if (dummy.userData.hit) {
          dummy.userData.hit = false;
          beats.getColorAt(i, beats.userData.color);
          beats.userData.color.multiplyScalar(1.125);
          beats.setColorAt(i, beats.userData.color);
          let rot = Math.PI / 32;
          dummy.rotation.x += rot;
          dummy.rotation.z += rot;
        }

        if (note.old === false) {
          // BEAT is approaching, spiral
          let diff = elapsed - delay - note.startTime;
          dummy.position.x = Math.cos(diff / 2) + note.pitch * iso - 7.5;
          dummy.position.y = Math.sin(diff / 2) + 5;
          dummy.position.z = diff;

          if (dummy.position.z >= 0 || dummy.userData.hits > 10) {
            // BEAT reached playhead, drop
            note.old = elapsed;
            beats.setColorAt(i, vis.cfg.accents.col);
          }
        } else if (note.old !== true) {
          // BEAT timeout, reuse
          if (elapsed - note.old > delay) {
            //console.log("old");
            note.old = true;
            continue;
          }
        }

        // BEAT update

        dummy.updateMatrix();
        beats.setMatrixAt(i, dummy.matrix);
      }
      beats.instanceMatrix.needsUpdate = true;
      beats.instanceColor.needsUpdate = true;
    }
  },
  render: function (timestamp) {
    requestAnimationFrame(vis.render);

    let vars = vis.var;
    vars.frame += 1;
    vis.ux.update(vars, timestamp);

    let WA = vis.WA;
    //if visible and Web Audio or MIDI
    if (document.visibilityState != "hidden") {
      if (WA.analyser!=null) {// && WA.sound?.isPlaying
        WA.analyser.data = WA.analyser.getFrequencyData();
        let data = WA.analyser.data;
        //console.log(data)
        // bass and treble
        const lowerHalfArray = data.slice(0, data.length / 2 - 1);
        const upperHalfArray = data.slice(
          data.length / 2 - 1,
          data.length - 1
        );

        // audio threshold
        let bpf = {};
        bpf.overallAvg = WA.help.avg(data);
        bpf.lowerAvg = WA.help.avg(lowerHalfArray);
        bpf.upperAvg = WA.help.avg(upperHalfArray);
        // TRANSFORMS
        vis.fwave(vars, bpf.overallAvg);
        vis.fnoise(
          timestamp,
          bpf.upperAvg / 16,
          vars.environ.getObjectByName("audio_hi"),
          "get2"
        );
        vis.fnoise(
          timestamp,
          bpf.lowerAvg / 32,
          vars.environ.getObjectByName("audio_lo"),
          "get3"
        );
      }

      vis.midi();
    }

    // render-texture portal
    vars.renderer.setRenderTarget(vars.renderMIDI);
    vars.renderer.clear();
    vars.renderer.render(vars.sceneMIDI, vars.camera);

    // render-texture portal
    if (vis.cfg.axis == "z") {
      vars.renderer.setRenderTarget(vars.renderCatmull);
      vars.renderer.clear();
      vars.renderer.render(vars.scene, vars.cameraCatmull);
    }

    // render scene
    vars.renderer.setRenderTarget(null);
    vars.renderer.render(vars.scene, vars.camera);

    vis.stats.update();
  },
  ux: {
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(1, 1),
    pointer: function (event) {
      vis.ux.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      vis.ux.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    },
    beat: function (note) {
      // threshold
      let goodBeat =
        note.velocity >= 64 &&
        (note.isDrumBD || (!note.isDrum && note.duration > 0.125));
      if (!goodBeat) {
        return;
      }

      // update prototype
      let beats = vis.var.midiBeat;
      let index = beats.userData.idx;
      if (beats.count < beats.instanceMatrix.count) {
        // create
        beats.count++;
      }
      for (let i = 0; i < index.length; i++) {
        let beat = index[i];
        if (beat.note.old === true) {
          // replace
          note.isBeat = true;
          note.old = false;
          beat.note = note;
          beat.dummy.userData.hits = 0;
          beat.dummy.scale.set(1, 1, 1);
          beat.dummy.rotation.set(0, 0, 0);
          beats.setColorAt(i, vis.cfg.primary.col);
          break;
        }
      }
      beats.instanceColor.needsUpdate = true;

      // note: arr.sort() interferes with instanceColor
      // note: no case for beat not added, or inventory of multiples

      if (note.isDrumBD) {
        //return;
      }

      let tempo = vis.var.time.tempo;
      tempo.next += tempo.bar;
      tempo.avail = false;
      // tempo.avail = false on MIDI stop
      // => render => vis.midi
      vis.var.score[1]++;
      document.getElementById("score").innerText =
        vis.var.score[0] + "/" + vis.var.score[1];
    },
    tween: function (tempo, ref, opts = {}) {
      let delay = opts.delay || 0;
      const elapsed = vis.var.time.elapsed + delay;
      let tweens = vis.var.time.tweens;
      let key =
        typeof ref === "string" ? ref : ref.name || ref.constructor.name;
      key += "_" + tempo;

      if (tweens[key] == undefined) {
        tweens[key] = {};
      }
      let meta = tweens[key];

      if (!meta.t) {
        // set initial
        meta.t = tempo;
      } else {
        // time interval
        if (elapsed >= meta.t) {
          // tween or general function
          if (typeof ref === "object") {
            meta.tween = new TWEEN.Tween(ref[opts.prop])
              .to(opts.to, tempo / 2)
              .easing(TWEEN.Easing.Exponential.InOut)
              .start()
              .onUpdate(opts.func || function () {});
          } else {
            opts.func();
          }
          meta.t += tempo;
        }
      }
      // resync time err
      if (Math.abs(meta.t - elapsed) >= tempo * 4) {
        meta.t = elapsed;
      }
    },

    update: function (vars, timestamp) {
      TWEEN.update();
      let ux = vis.ux;

      let time = vars.time;
      // timing audio sync
      if (!time.start) {
        time.start = time.timestamp = timestamp;
      }
      // timing LOD, smoothing
      let delta = (timestamp - time.timestamp) / 60;
      time.delta.push(delta);
      time.delta.splice(0, time.delta.length - 120);
      // audio
      if (
        vis.MM.state == "started" ||
        vars.midiNote.userData.state < vis.cfg.delay
      ) {
        time.elapsed = timestamp - time.start;
      } else {
        time.start += timestamp - time.timestamp;
      }
      time.timestamp = timestamp;

      // raycaster
      ux.raycaster.setFromCamera(ux.mouse, vars.camera);
      let beats = vars.midiBeat;
      const intersections = ux.raycaster.intersectObject(beats);
      if (intersections.length > 0) {
        // hit at physics mesh
        const instanceId = intersections[0].instanceId;
        let userData = beats.userData.idx[instanceId].dummy.userData;
        userData.hit = true;
        userData.hits++;
        if (userData.hits == 10) {
          vars.score[0]++;
        }
      }

      // rotate shield icon and hittest dummy
      let rot = (vis.cfg.shield * -3.14159) / 2;
      vars.environ.getObjectByName("shield").rotation.set(rot, 0, 0);
      let shieldHit = vars.environ.getObjectByName("shield_hit");
      shieldHit.position.set(0, vis.cfg.shield * 5 - 2.5, 2.5);
      shieldHit.rotation.set(0, 0, 0);
      vars.physics.setMeshPosition(shieldHit, shieldHit.position);

      // rotate camera orbit target
      let mount = vars.camera.userData.mount;
      mount.rotateOnAxis(
        // rotate z-orbit on y-axis
        new THREE.Vector3(0, 1, 0),
        -Math.PI / 128
      );
      mount.position.copy(vars.camera.position);

      // tweak sky
      vars.environ.getObjectByName("audio_hi").visible =
        vars.camera.position.y > 10 ? false : true;

      // dynamic LOD and framerates
      if (vis.cfg.demo && vars.frame % 5 == 0) {
        // resolution diff from baseline
        const baseRes = 1080 / vars.resolution;
        // FPS average delta

        let delta = time.delta.reduce((a, b) => b + a) / time.delta.length;
        // multi-factor performance loss rate
        const loss = baseRes + delta;

        let perf = vis.gui.controllers.find((el) => el.property == "loss");

        if (loss != perf.getValue()) {
          //console.log(perfRes, perf.getValue())
          perf.setValue(loss);
        }

        if (
          delta > 3 &&
          vis.MM.state != "stopped" &&
          time.elapsed >= vis.cfg.delay
        ) {
          // test
          vis.MM.playback("pause", "slow! resume");
        }
      }

      if (vis.cfg.demo && vars.frame % 60 == 0) {
        // DEMO
        // tempo at MIDI bpm or default
        const tempo = time.tempo ? time.tempo.bar * 1000 : 2000;

        // random camera position
        ux.tween(tempo * 4, vars.camera, {
          prop: "position",
          to: {
            x: Math.cos(time.elapsed) * 10,
            y: Math.random() * 20 + 5,
            z: Math.random() * 20 + 10
          },
          func: function () {
            vars.camera.lookAt(0, 5, 0);
            vars.controls.update();
          }
        });

        // random light color
        ux.tween(tempo, vars.environ.getObjectByName("low"), {
          prop: "color",
          to: {
            r: Math.random(),
            g: Math.random(),
            b: Math.random()
          }
        });

        // cycle type
        let tFrame = tempo * 16;
        ux.tween(tFrame, "type", {
          func: function () {
            let type = vis.gui.controllers.find((el) => el.property == "type");
            let value = type.getValue();
            value =
              value == "oscillator"
                ? type.setValue("spectrum")
                : type.setValue("oscillator");
          }
        });

        // cycle axis
        ux.tween(tFrame, "axis", {
          delay: tFrame / 2,
          func: function () {
            let axis = vis.gui.controllers.find((el) => el.property == "axis");
            let value = axis.getValue();
            if (value == "x") {
              axis.setValue("y");
            } else if (value == "y") {
              axis.setValue("z");
            } else {
              axis.setValue("x");
            }
          }
        });

        // fun blocks
        ux.tween(tempo * 32, "freq_blocks", {
          func: function () {
            if (vis.cfg.axis === "z") {
              return false;
            }
            const randPeak = Math.floor(Math.random() * 3) + 1;
            vis.fpath(randPeak, {
              o: {
                x: 0,
                y: 15,
                z: 0
              }
            });
          }
        });

        // other effects...
      }
    }
  },
  MM: {
    // Magenta Music MIDI
    state: "stopped",
    button: function (e) {
      if (!vis.MM.gesture) {
        vis.MM.mmPlay = vis.MM.mmPlay();
        vis.MM.gesture = true;
      }

      const files = e.target ? e.target.files : e;
      if (files.length > 0) {
        //parse file
        const file = files[0];
        document.querySelector("#midiLabel span").textContent = file.name;
        const reader = new FileReader();
        reader.onload = function (e) {
          vis.midi(e.target.result);
        };
        reader.readAsArrayBuffer(file);
      }
    },
    playback: function (event, value = "") {
      let MM = vis.MM;
      // control from button
      if (event.type == "click") {
        let state = MM.mmPlay.getPlayState();
        // presumptive click toggles
        switch (state) {
          case "paused":
            event = "resume";
            break;
          case "started":
            event = "pause";
            break;
          case "stopped":
            event = "start";
            break;
        }
      }

      // control from trigger
      switch (event) {
        // idle... paused, started, stopped
        case "time":
          value = value + " \u29D7";
          break;
        case "start":
          MM.button(document.getElementById("midiFile").files);
          value = "restart" + " \u23EE";
          break;
        case "pause":
          MM.mmPlay.pause();
          value = (value || "resume") + " \u25B6";
          break;
        case "resume":
          MM.mmPlay.resume();
          value = "pause" + " \u23F8";
          break;
        case "stop":
          MM.mmPlay.stop();
          // MIDI reset
          if (MM.mmVis) {
            MM.mmVis.clearActiveNotes();
            MM.mmVis.clear();
            MM.mmVis.noteSequence = null;
          }
          // BEATS reset
          let vars = vis.var;
          vars.time.tempo = null;
          vars.time.start = null;
          vars.midiNote.userData.state = false;
          vars.midiBeat.count = 0;
          vars.midiBeat.userData.idx.forEach((beat) => (beat.note.old = true));
          vars.score = [0, 0];
          value = "restart" + " \u23EE";
          break;
      }

      let status = document.getElementById("playback");
      status.innerText = value;
      MM.state = MM.mmPlay.getPlayState();
    },
    config: {
      noteHeight: 8,
      pixelsPerTimeStep: 16, // like a note width
      noteSpacing: 1,
      noteRGB: "128, 128, 128",
      activeNoteRGB: "0, 255, 0"
    },
    dom: document.getElementById("magenta"),
    mmPlay: function () {
      return new mm.Player(false, {
        run: (note) => {
          // PianoRoll Visualizer
          vis.MM.mmVis.redraw(note);
          // error test in MM.midi
          note.active = true;

          // mmPlay time in successive sequences does not reset
          // elapsed is 5 seconds later, in milliseconds
          let time = vis.var.time;
          let elapsed = note.startTime + vis.cfg.delay;
          elapsed *= 1000;
          if (Math.abs(elapsed - time.elapsed) > 125) {
            // clock fluctuate limit
            //console.log("resync time");
            time.start = performance.now() - elapsed;
          }

          // light up shield icon
          if (note.isDrumBD) {
            note.duration = note.duration > 0.125 || 0.125;
            new TWEEN.Tween(vis.var.environ.getObjectByName("shield").material)
              .to(
                {
                  opacity: [note.velocity / 128, 0.25] //keyframes
                },
                note.duration * 1000
              )
              .yoyo(true)
              .start();
          }
        },
        stop: () => {
          vis.MM.playback("stop");
        }
      });
    }
  },
  WA: {
    //farazzshaikh.github.io/three-noise/example/index.html
    noise: new Perlin(Math.random()),
    sound: null,
    analyser: null,
    help: {
      avg: function (arr) {
        let total = arr.reduce(function (sum, b) {
          return sum + b;
        });
        return total / arr.length;
      },
      max: function (arr) {
        return arr.reduce(function (a, b) {
          return Math.max(a, b);
        });
      }
    },
    button: function (e) {
      let WA = vis.WA;
      if (!WA.sound) {
        let listener = new THREE.AudioListener();
        vis.var.camera.add(listener);
        WA.sound = new THREE.Audio(listener);

        // THREE Audio
        navigator.mediaDevices
          .getUserMedia({
            audio: true,
            video: false
          })
          .then((stream) => {
            WA.sound.setMediaStreamSource(stream);
            WA.sound.setVolume(0.05);
            WA.sound.hasPlaybackControl = true;
            WA.analyser = new THREE.AudioAnalyser(WA.sound, 32);
            WA.analyser.data = WA.analyser.getFrequencyData();
            //sound.setRefDistance(20);
            //vis.var.max.add(sound)
          });
      }

      const state = e.target.classList;
      if (state.contains("paused")) {
        //play
        state.remove("paused");
        e.target.innerText = "Pause";
        WA.sound.isPlaying = true;
        WA.sound.context.resume()
      } else {
        // pause
        state.add("paused");
        e.target.innerText = "Play";
        WA.sound.isPlaying = false;
        WA.sound.context.suspend()
      }
    }
  },
  gui: {
    create: function (cfg) {
      let gui = new GUI();
      gui.add(cfg, "demo");
      gui.add(cfg, "shield", 0, 1);
      gui.add(cfg, "type", ["spectrum", "oscillator"]).onChange(vis.fpath);
      gui.add(cfg, "axis", ["x", "y", "z"]).onChange(vis.fpath);
      gui
        .add(cfg.bands, "sub", 1, cfg.bands.max)
        .step(1)
        .onFinishChange(vis.fpath);
      // style
      gui.add(cfg, "intensity", 0.5, 1.5).step(0.5).onChange(vis.gui.set);
      gui
        .addColor(cfg.primary, "hex")
        .name("primary")
        .onFinishChange(vis.gui.set);
      gui
        .addColor(cfg.accents, "hex")
        .name("accents")
        .onFinishChange(vis.gui.set);
      gui.add(cfg, "loss", 1, 5).step(1).onChange(vis.gui.set);
      // expose controller
      gui.close();
      return gui.__controllers;
    },
    set: function (value, vars = vis.var) {
      // gui bug: focused selectbox retains text value
      const group = vars.environ;
      let i = group.children.length;
      const prop = this.property;
      //this.object[this.property] = Number(value);

      if (prop === "loss") {
        // performance
        vars.renderer.setPixelRatio(window.devicePixelRatio / (2 * value));
        // set scene params
        const goodFPS = value < 3;
        vars.renderer.antialias = value == 1;
        vars.renderer.shadowMap.type = goodFPS
          ? THREE.PCFSoftShadowMap
          : THREE.BasicShadowMap;
        //group.getObjectByName("far").castShadow = goodFPS;
        // set material quality
        while (i--) {
          let el = group.children[i];
          if (el.type.includes("Mesh")) {
            el.material = vis.mat(el.material.userData);
          }
        }

        if (vis.MM.state != "stopped") {
          vis.MM.mmPlay.polySynth.maxPolyphony = 32 / value;
        }
      }

      if (prop === "intensity") {
        // light intensity
        while (i--) {
          let el = group.children[i];
          if (el.type.includes("Light")) {
            //all set retain original value to scale
            if (el.userData[prop] == undefined && el[prop] != undefined) {
              el.userData[prop] = el[prop];
            }
            el[prop] = el.userData[prop] * value;
          }
        }
      }

      if (prop === "hex") {
        // color scheme
        let thisCol = new THREE.Color(value).convertSRGBToLinear();
        let lastCol = this.object.col;

        while (i--) {
          let el = group.children[i];
          // update light if match
          if (el.type.includes("Light")) {
            if (el.color.getHex() == lastCol.getHex()) {
              el.color = thisCol;
            }
          }
          this.object.col = thisCol;
        }
      }
    }
  }
};

// BEGIN!
vis.three();