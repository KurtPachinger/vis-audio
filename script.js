//app.lucidchart.com/documents/embeddedchart/3f7e7bc1-0c58-42bf-be89-3be942767b0c

import * as THREE from "https://unpkg.com/three@0.126.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.126.0/examples/jsm/controls/OrbitControls.js";
import { AmmoPhysics } from "https://unpkg.com/three@0.126.0/examples/jsm/physics/AmmoPhysics.js";
import { GUI } from "https://unpkg.com/three@0.126.0/examples/jsm/libs/dat.gui.module.js";
import Stats from "https://unpkg.com/three@0.126.0/examples/jsm/libs/stats.module.js";

vis = {
  var: { bpf: {}, peaks: [] },
  set: {
    demo: true,
    type: "spectrum",
    axis: "x",
    shield: false,
    bands: { sub: 3, max: 3 },
    mass: 100,
    //style
    perf: 3,
    intensity: 1,
    fog: 0.05,
    primary: { hex: "#4040c0" },
    accents: { hex: "#c04040" }
  },
  mat: function material(opts = {}) {
    // material performance
    let type = [
      "MeshStandardMaterial",
      "MeshPhongMaterial",
      "MeshLambertMaterial"
    ][vis.set.perf - 1];
    // type-specific
    opts.roughness = opts.roughness || 0.5;
    opts.metalness = opts.metalness || 0.66;
    opts.shininess = opts.shininess || 150;
    opts.flatShading = opts.flatShading || false;
    // core
    let mat = new THREE[type]({
      color: opts.color || vis.set.primary.col,
      side: opts.side || THREE.FrontSide,
      shadowSide: opts.shadowSide || THREE.BackSide,
      userData: opts
    });
    // mesh-specific
    for (var key in opts) {
      if (mat.hasOwnProperty(key)) {
        mat[key] = opts[key];
      }
    }
    return mat;
  },
  three: async function () {
    //threejs.org/examples/?q=phys#physics_ammo_instancing
    //github.com/kripken/ammo.js
    //codepen.io/ste-vg/pen/BazEQbY
    const physics = (vis.var.physics = await AmmoPhysics());

    //common
    const PI = Math.PI;
    vis.set.primary.col = new THREE.Color(vis.set.primary.hex);
    vis.set.accents.col = new THREE.Color(vis.set.accents.hex);

    // SCENE
    const scene = (vis.var.scene = new THREE.Scene());
    const group = (vis.var.group = new THREE.Group());
    group.name = "group";
    scene.add(group);
    let camera = (vis.var.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    ));
    camera.position.set(0, 1, 15);
    scene.add(camera);

    const renderer = (vis.var.renderer = new THREE.WebGLRenderer({
      antialias: true
    }));
    renderer.localClippingEnabled = true;
    renderer.setPixelRatio(window.devicePixelRatio / vis.set.perf);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    //renderer.physicallyCorrectLights = true;
    //renderer.outputEncoding = THREE.sRGBEncoding;
    //renderer.toneMapping = THREE.ACESFilmicToneMapping;

    //camera range limits
    let controls = (vis.var.controls = new OrbitControls(
      camera,
      renderer.domElement
    ));
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 22.5;
    controls.minPolarAngle = PI / 2.5;
    controls.maxPolarAngle = PI / 1.83;
    controls.minAzimuthAngle = -PI / 3;
    controls.maxAzimuthAngle = PI / 3;
    controls.target.set(0, 3, 0);
    controls.update();

    scene.fog = new THREE.FogExp2(0x000000, vis.set.fog);

    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);

    // MATERIALS
    vis.var.matBand = vis.mat({
      color: vis.set.accents.col,
      specular: vis.set.accents.col
    });

    const glass = vis.mat({
      transparent: true,
      opacity: 0.25,
      specular: vis.set.primary.col,
      shininess: 50,
      depthWrite: false // no artifact
    });

    // RENDER TEXTURE BPM PORTAL
    //threejs.org/examples/webgl_rtt.html
    vis.var.rtTexture = new THREE.WebGLRenderTarget(96, 96, {
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter
    });

    const sceneBPM = (vis.var.sceneBPM = new THREE.Scene());
    sceneBPM.add(camera);
    const light = new THREE.AmbientLight(0xffffff, 20);
    sceneBPM.add(light);

    const BPM = (vis.var.BPM = new THREE.Group());
    group.name = "BPM";
    sceneBPM.add(BPM);

    function cubeBPM(count = 4, off = 1) {
      //note: do instancedMesh
      let sub = 10 / 4;
      for (let i = 0; i < count; i++) {
        for (let j = 0; j < count; j++) {
          const cubeBPM = new THREE.Mesh(
            new THREE.BoxGeometry(sub, sub, sub),
            vis.mat({
              color: new THREE.Color(0xffffff),
              emissive: new THREE.Color(0xffffff)
            })
          );
          let x = sub * j - (10 - sub) / 2;
          let y = i * (sub / count);
          let z = -i * sub;
          cubeBPM.position.set(x * off, y * off, z * off);
          //cubeBPM.scale.set(0.5, 0.5, 0.5);
          cubeBPM.userData.position = cubeBPM.position.clone();
          BPM.add(cubeBPM);
        }
      }
    }
    cubeBPM(4, 2);
    // note: perceptual worlds x is half, z is double
    BPM.position.set(0, 3, 0);
    sceneBPM.add(BPM);

    // OBJECTS

    //floor
    const floorL = new THREE.Mesh(new THREE.BoxGeometry(25, 0.2, 25), glass);
    floorL.name = "floor_low_sleep";
    floorL.position.y = -5;
    floorL.rotation.y = -PI / 4;
    floorL.receiveShadow = true;
    group.add(floorL);
    physics.addMesh(floorL, 0);

    const floorF = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.2, 40),
      vis.mat()
    );
    floorF.name = "floor_far_solid";
    floorF.position.z = -20;
    floorF.castShadow = true;
    floorF.receiveShadow = true;
    group.add(floorF);
    physics.addMesh(floorF, 0);

    const floorN = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 40), glass);
    floorN.name = "floor_near_glass";
    floorN.position.z = 20;
    floorN.castShadow = true;
    floorN.receiveShadow = true;
    group.add(floorN);
    physics.addMesh(floorN, 0);

    // frequency
    const freqL = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.0, 10),
      vis.mat({
        transparent: true,
        opacity: 0.25,
        alphaMap: new THREE.TextureLoader().load(
          "//assets.codepen.io/697675/shield_mask.png"
        )
      })
    );
    freqL.name = "freq_low_effect";
    freqL.rotation.y = -PI / 4;
    group.add(freqL);
    physics.addMesh(freqL, 0);

    const ring = new THREE.RingGeometry(0, 10, 6, 1, 0, PI * 2);
    const freqF = new THREE.Mesh(
      ring,
      vis.mat({
        map: vis.var.rtTexture.texture,
        alphaTest: 0.5,
        shininess: 10
      })
    );
    freqF.name = "freq_far_PORTAL";
    const freqF2 = new THREE.Mesh(ring, glass);
    freqF2.name = "freq_far_rim";
    freqF.position.z = freqF2.position.z = -15;
    group.add(freqF, freqF2);

    const freqN = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.4, 1.2),
      vis.mat()
    );
    freqN.name = "freq_near_base";
    freqN.castShadow = true;
    freqN.receiveShadow = true;
    group.add(freqN);
    physics.addMesh(freqN, 0);

    // environment audio
    const sky = (vis.var.sky = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40, 20, 20),
      vis.mat({ flatShading: false })
    ));
    sky.name = "sky";
    sky.position.y = 12.5;
    sky.rotation.x = 0.5 * PI;
    sky.receiveShadow = true;

    const ball = new THREE.IcosahedronGeometry(20, 4);
    const skybox = (vis.var.skybox = new THREE.Mesh(
      ball,
      vis.mat({
        side: THREE.BackSide,
        shininess: 300,
        roughness: 0.33
      })
    ));
    skybox.name = "skybox";
    skybox.receiveShadow = true;

    const clipPlanes = [
      new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), 5)
    ];

    const wire = new THREE.Mesh(
      ball,
      vis.mat({
        side: THREE.BackSide,
        wireframe: true,
        flatShading: false,
        shininess: 500,
        roughness: 0.125,
        clippingPlanes: clipPlanes,
        clipIntersection: true
      })
    );
    wire.name = "skybox_wireframe";
    group.add(sky, skybox, wire);

    
    // LIGHTS

    // frontal accent (audio range color)
    const near = new THREE.PointLight(vis.set.accents.col, 6, 15, 1);
    near.position.set(0, 5, 7.5);
    near.castShadow = true;
    near.name = "near";
    // direct drama (audio room shadow)
    const far = new THREE.PointLight(vis.set.primary.col, 4, 15, 1);
    far.position.set(0, 5, 0);
    far.castShadow = true;
    far.name = "far";
    // low fill (falling peak shadow)
    const low = new THREE.PointLight(vis.set.accents.col, 6, 30, 1);
    low.position.set(0, -5, 7.5);
    low.castShadow = true;
    low.name = "low";
    // shadow quality

    // shadow sizes
    near.shadow.mapSize = new THREE.Vector2(32, 32);
    far.shadow.mapSize = new THREE.Vector2(96, 96);
    low.shadow.mapSize = new THREE.Vector2(96, 96);

    group.add(near, far, low);

    // FREQUENCY BANDS
    vis.fband(false, "y", "spectrum");

    // OUTPUT
    vis.stats = new Stats();
    document.body.appendChild(vis.stats.dom);
    document.body.appendChild(renderer.domElement);
    gui(vis.set);
    
    vis.var.LOD = {
      res: Math.min(window.innerWidth, window.innerHeight),
      FPS: [0]
    };

    vis.render();

    let resizeTimer;
    window.addEventListener(
      "resize",
      function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          vis.var.camera.aspect = window.innerWidth / window.innerHeight;
          vis.var.camera.updateProjectionMatrix();
          vis.var.renderer.setSize(window.innerWidth, window.innerHeight);

          // res contributes to performance
          vis.var.LOD.res = Math.min(window.innerWidth, window.innerHeight);
        }, 250);
      },
      false
    );
  },
  audio: function (ctx) {
    //codepen.io/prakhar625/pen/zddKRj
    //codepen.io/team/keyframers/pen/MWwPWEK
    ctx.resume();

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => ctx.createMediaStreamSource(stream))
      .then((source) => {
        source.connect(vis.var.analyser);
      });
  },
  path: function (axis = vis.set.axis, type = vis.set.type) {
    // the primary axis central to visuals
    const unit = { max: 10, sub: 0.4, axis: axis, type: type };
    const max = { count: Math.pow(2, vis.set.bands.max), name: "bands" };
    const sub = { count: Math.pow(2, vis.set.bands.sub), name: "peaks" };
    // segment
    max.width = unit.max / max.count;
    sub.width = unit.max / sub.count;
    // relative factorial
    max.factor = 1;
    sub.factor = max.count / sub.count;
    // relative distribution
    max.distribute = max.factor / max.count;
    sub.distribute = sub.factor / max.count;
    // tertiary transforms
    max.depth = sub.depth = 1;
    if ((axis == "y" && type == "spectrum") || axis == "z") {
      max.depth = max.count;
    }

    // coordinates, offsets
    sub.coords = coords(sub, { y: unit.sub });
    max.coords = coords(max, { y: 0 });

    function coords(segs, o) {
      let coord = [];
      let rot = 0;

      const angle = (2 * Math.PI) / segs.count;

      for (let i = 0; i < segs.depth; i++) {
        let seg = 0;
        for (let j = 0; j < segs.count; j++) {
          let m, x, y, z;
          m = angle * seg++; //so
          if (axis == "x") {
            // type spectrum: frequency analyzer (1d)
            // type oscillator: linear oscillator (1d)
            x = segs.width * j - (unit.max - segs.width) / 2;
            y = 0;
            z = 0;
          } else if (axis == "y") {
            // type spectrum: grid spectrograph (2d)
            // type oscillator: radial fractal (2d)
            if (type == "oscillator") {
              x = Math.cos(m) * ((unit.max + unit.sub) / 2);
              y = 0;
              z = Math.sin(m) * ((unit.max + unit.sub) / 2);
              // rotation
              const deg = 90 / (Math.PI / m) / 2;
              const rad = 2 * deg * (Math.PI / 90);
              rot = -rad;
            } else if (type == "spectrum") {
              x = segs.width * j - (unit.max - segs.width) / 2;
              y = 0;
              z = i * -max.width;
            }
          } else if (axis == "z") {
            // starfield, path runner
            x = segs.width * j - (unit.max - segs.width) / 2;
            y = i * max.width;
            z = -unit.max * 3 - unit.sub * i; //-z is far
          }

          if (coord[i] == undefined) {
            coord[i] = [];
          }
          coord[i][j] = {
            m: m,
            pos: new THREE.Vector3(x, y + (o.y || 0), z), // offset
            rot: rot,
            prc: +(j / segs.count).toFixed(4)
          };
        }
      }

      coord = coord.flat();
      return coord;
    }

    // reset internal timeline
    if (vis.var.bands) {
      vis.var.bands.userData.depth = 1;
      // note: render f1d PATH unload before PATH/fband/place...
      //vis.var.bands.userData.unload = vis.var.PATH.max;
    }

    const PATH = (vis.var.PATH = {
      unit: unit,
      sub: sub,
      max: max
    });

    return PATH;
  },
  fband: function (sub, axis, type) {
    // update path data from settings
    // fix: new peaks visible next transition
    const PATH = sub != false ? vis.var.PATH : vis.path(axis, type);

    if (sub === false) {
      // bands at max quantity, once (no mass)
      place(PATH.max, 0);
    } else {
      // peaks at sub quantity, on-demand
      place(PATH.sub, vis.set.mass);
    }

    function place(PATHs, mass) {
      //threejs.org/examples/#webgl_instancing_dynamic
      // bug: InstancedMesh itemSize/count index...? first is reference?

      const box = new THREE.BoxGeometry(
        PATHs.width,
        PATH.unit.sub,
        PATH.unit.sub
      );
      // note: box.translateY for scale affects physics
      const instancedMesh = new THREE.InstancedMesh(
        box,
        vis.var.matBand,
        PATHs.count * PATHs.depth
      );
      instancedMesh.name = PATHs.name;
      instancedMesh.castShadow = true;
      

      // attributes from PATH data
      const color = new THREE.Color();
      const matrix = new THREE.Matrix4();
      
      let catmull = [];
      for (let i = 0; i < PATHs.depth * PATHs.count; i++) {
        const coord = PATHs.coords[i];
        const prc = (i / PATHs.depth) * PATHs.distribute;
        color.getHSL(instancedMesh.material.color);
        color.offsetHSL(0, 0, prc);

        // update mesh matrix
        instancedMesh.setColorAt(i, color);
        matrix.makeRotationAxis(new THREE.Vector3(0, 1, 0), coord.rot);
        matrix.setPosition(coord.pos);
        instancedMesh.setMatrixAt(i, matrix);
        
        catmull.push(coord.pos); // note: depth vertices ignored?
          
      }
      
      // note: duplicate index 0 at end to close
      //jsfiddle.net/f2Lommf5/3775/
      //catmull.push(catmull[0]);
      
      
      if (PATHs.name == "bands") {
        //threejs.org/docs/index.html#api/en/extras/curves/CatmullRomCurve3
        const curve = new THREE.CatmullRomCurve3(catmull, false, "chordal");
        const points = curve.getPoints( PATH.sub.count );
        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        const mat = new THREE.LineBasicMaterial( { color : vis.set.primary.col } );
        // Create the final object to add to the scene
        const curveObject = vis.var.curve = new THREE.Line( geometry, mat );
        vis.var.group.add(curveObject);
      }

      // instancedMesh output
      instancedMesh.instanceColor.needsUpdate = true;
      instancedMesh.userData.depth = 1; // reset internal timeline
      //instancedMesh.userData.unload = false; // reset internal timeline
      
      try {
        if (PATHs.name == "peaks") {
          vis.var[PATHs.name].push(instancedMesh);
        } else {
          vis.var[PATHs.name] = instancedMesh;
        }
        vis.var.group.add(instancedMesh);
        vis.var.physics.addMesh(instancedMesh, mass);
      } catch (error) {
        console.error("memory access out of bounds", error);
      }
      // note: dispose of old mesh/physics...?
      // renderer.info.programs.length
      
    }
  },
  f1d: function (PATH, bpf) {
    //threejs.org/examples/webgl_instancing_performance.html
    //developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API

    // pointer
    const bands = vis.var.bands;
    const peaks = vis.var.peaks[vis.var.peaks.length - 1];
    // shorter
    const unit = PATH.unit;
    const max = PATH.max;
    // live
    const type = vis.set.type;
    const axis = vis.set.axis;
    // transform
    let matrix = new THREE.Matrix4();
    let position = new THREE.Vector3();
    //let rotation = new THREE.Euler();
    let quaternion = new THREE.Quaternion();
    let scale = new THREE.Vector3(1, 1, 1);

    // depth cycle
    let userData = bands.userData;
    if (userData.depth > max.depth) {
      userData.depth = 1;
    }

    let click = unit.sub / 4;
    let freq = [];
    
    // group curve
    let catmull = vis.var.curve.geometry.getAttribute("position");
    let posY = 0;

    for (let i = 0; i < max.count; i++) {
      // depth cycle index for tertiary animation
      let depthStep = i + max.count * (userData.depth - 1);
      let depth = max.depth == 1 ? i : depthStep;
      let coords = max.coords[depth];
      
      
      // audio analyser
      let frequency = data[Math.round(data.length * max.coords[depth].prc)];
      freq.push(frequency);
      frequency = (frequency / 256 / 2) * 100;
      // matrix in
      bands.getMatrixAt(depth, matrix);
      matrix.decompose(position, quaternion, scale);

      // TRANSFORM BANDS
      // position
      if (axis != "z") {
        position = coords.pos.clone();
        if (type == "oscillator") {
          // amplitude
          if (axis == "x") {
            position.y = (unit.sub / 2) * frequency;// perceptual posY
          } else if (axis == "y") {
            position.x =
              Math.cos(coords.m) * ((unit.max + unit.sub * frequency) / 2);
            position.z =
              Math.sin(coords.m) * ((unit.max + unit.sub * frequency) / 2);
          }
        }
      } else {
        if (type == "oscillator") {
          // out then up
          if (position.z > -unit.max * 2) {
            position.z -= click * frequency;
          } else if (position.y < unit.max * 2) {
            position.y += click * frequency;
          }
        } else {
          // down then in
          if (position.y > 0) {
            position.y -= click * frequency;
            if (position.y < 0) {
              position.y = 0;
            }
          } else if (position.z < -unit.max) {
            //coords.pos.z
            position.z += click * frequency;
          }
        }
      }

      // rotation
      if (axis == "y" && type == "oscillator") {
        // rotate m
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), coords.rot);
      } else {
        quaternion = new THREE.Quaternion();
      }

      // scale
      if (axis != "z") {
        scale.x = scale.y = scale.z = 1;
      }
      if (axis == "z") {
        if (type == "oscillator") {
          scale.z = 1 + frequency * click * 10;
        } else {
          scale.z = 1;
        }
      } else if (type == "spectrum") {
        // amplitude
        scale.y = 1 + frequency;
      }
      

      // Catmull Spline
      if(!(axis=="y"&&type=="oscillator")){posY = (unit.sub / 2) * frequency;}
      catmull.setXYZ(i, position.x, posY, position.z);
      

      try {
        if (vis.var.analyser.context.state != "running") {
          return;
        }
        
        // UPDATE BANDS
        matrix.compose(position, quaternion, scale);
        bands.setMatrixAt(depth, matrix);
        //vis.var.physics.setMeshPosition(bands, position, i);
        bands.instanceMatrix.needsUpdate = true;

        
        let sub = PATH.sub;
        if (peaks != undefined && (i + 1) % sub.factor == 0) {
          let fct = (i + 1) / PATH.sub.factor - 1;
          // fix: matrix of peaks at factor overwrite matrix of depth
          peaks.getMatrixAt(fct, matrix);

          scale = new THREE.Vector3(1, 1, 1);
          // fix: exclude z, y-oscillator

          if (axis != "z" && freq[i]>=16) {
            if (freq[i] >= bpf.overallAvg * 2) {
              // peak threshold and behavior
              if (type == "spectrum") {
                position.y = (unit.sub / 2) * frequency + unit.sub * 2;
              } else {
                if (axis != "y") {
                  scale.y = 1 + unit.sub * 2;
                } else {
                  scale.x = 1 + unit.sub * 2;
                }
              }
            }
          }

          // UPDATE COLOR
          //bands.setColorAt(depth, color);

          // UPDATE PEAKS
          matrix.compose(position, quaternion, scale);
          peaks.setMatrixAt(fct, matrix);
          peaks.instanceMatrix.needsUpdate = true;
          vis.var.physics.setMeshPosition(peaks, position, fct);
        }
      } catch (error) {
        console.error('OOM', error);
      }
    }
    catmull.needsUpdate = true;

    if (vis.var.renderer.info.render.frame % 60 == 0) {
      //if(vis.set.axis=="y" && vis.set.type == "spectrum"){
      // FPS permanence
      userData.depth++;
      //}
    }
  },
  f2d: function (mesh, distortionFr) {
    const g = mesh.geometry;
    const pos = g.getAttribute("position");
    const v = new THREE.Vector3();
    for (let vIdx = 0; vIdx < pos.count; vIdx++) {
      v.fromBufferAttribute(pos, vIdx);
      const time = Date.now();
      const distance = noise.noise2D(v.x, v.y + time / 10000) * distortionFr;
      pos.array[vIdx * 3 + 2] = v.y = distance;
    }
    g.attributes.position.needsUpdate = true;
    g.groupsNeedUpdate = true;
  },
  f3d: function (mesh, bassFr, treFr) {
    const g = mesh.geometry;
    const pos = g.getAttribute("position");
    const v = new THREE.Vector3();
    for (let vIdx = 0; vIdx < pos.count; vIdx++) {
      v.fromBufferAttribute(pos, vIdx);

      const offset = g.parameters.radius;
      const time = window.performance.now();
      v.normalize();
      const rf = 0.0001;
      const distance =
        offset +
        noise.noise3D(
          v.x + time * rf * 7,
          v.y + time * rf * 8,
          v.z + time * rf * 9
        ) *
          bassFr +
        treFr;
      v.multiplyScalar(distance);

      pos.array[vIdx * 3] = v.x;
      pos.array[vIdx * 3 + 1] = v.y;
      pos.array[vIdx * 3 + 2] = v.z;
    }
    g.attributes.position.needsUpdate = true;
    g.groupsNeedUpdate = true;
  },
  render: function () {
    requestAnimationFrame(vis.render);
    const vars = vis.var;

    // skip hidden
    if (document.visibilityState == "hidden") {
      return;
    }
    //vis.var.analyser.context.state=="running"

    // spectrum bins
    vars.analyser.getByteFrequencyData(data);

    const lowerHalfArray = data.slice(0, data.length / 2 - 1);
    const upperHalfArray = data.slice(data.length / 2 - 1, data.length - 1);

    let bpf = vars.bpf;
    bpf.overallAvg = avg(data);
    bpf.lowerMax = max(lowerHalfArray);
    bpf.lowerAvg = avg(lowerHalfArray);
    bpf.upperMax = max(upperHalfArray);
    bpf.upperAvg = avg(upperHalfArray);

    bpf.lowerMaxFr = bpf.lowerMax / lowerHalfArray.length;
    bpf.lowerAvgFr = bpf.lowerAvg / lowerHalfArray.length;
    bpf.upperMaxFr = bpf.upperMax / upperHalfArray.length;
    bpf.upperAvgFr = bpf.upperAvg / upperHalfArray.length;

    // TRANSFORMS
    vis.f1d(vars.PATH, bpf);
    vis.f2d(vars.sky, modulate(bpf.upperAvg, 0, 255, 0.25, 2));
    vis.f3d(
      vars.skybox,
      modulate(Math.pow(bpf.lowerAvg, 0.8), 0, 255, 0, 2),
      modulate(bpf.lowerMax, 0, 255, 0, 1.5)
    );

    vis.demo();

    // render-texture
    vars.renderer.setRenderTarget(vars.rtTexture);
    vars.renderer.clear();
    vars.renderer.render(vars.sceneBPM, vars.camera);
    // main
    vars.renderer.setRenderTarget(null);
    vars.renderer.render(vars.scene, vars.camera);
    //threejs.org/docs/#examples/en/postprocessing/EffectComposer

    vis.stats.update();
  }
};

// HELPERS
function fractionate(val, minVal, maxVal) {
  return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
  var fr = fractionate(val, minVal, maxVal);
  var delta = outMax - outMin;
  return outMin + fr * delta;
}

function avg(arr) {
  var total = arr.reduce(function (sum, b) {
    return sum + b;
  });
  return total / arr.length;
}

function max(arr) {
  return arr.reduce(function (a, b) {
    return Math.max(a, b);
  });
}

function gui(set) {
  let gui = (vis.gui = new GUI());
  gui.add(set, "demo");
  gui.add(set, "shield").onChange(guiSet);
  gui.add(set, "type", ["spectrum", "oscillator"]).onChange(function () {
    vis.path();
  });
  gui.add(set, "axis", ["x", "y", "z"]).onChange(function () {
    vis.path();
  });
  gui.add(set.bands, "sub", 1, set.bands.max).step(1).onFinishChange(vis.fband);
  // style
  gui.add(set, "perf", 1, 3).step(1).onChange(guiSet);
  gui.add(set, "intensity", 0.5, 2).step(0.5).onChange(guiSet);
  gui.addColor(set.primary, "hex").listen().name("primary").onChange(guiSet);
  gui.addColor(set.accents, "hex").name("accents").onChange(guiSet);

  function guiSet(value) {
    const vars = vis.var;
    const group = vars.group;
    //this.object[this.property] = Number(value);

    let prop = this.property;

    if (prop == "shield") {
      // tied to demo...
      let shield = vis.var.group.getObjectByName("freq_low_effect");
      let rotate = value == true ? -Math.PI / 2 : 0;
      TweenMax.to(shield.rotation, 1, {
        x: rotate,
        y: -Math.PI / 4,
        z: 0,
        ease: Bounce.easeOut
      });
      
      // note: update physics rotation?
      
    }
    

    if (prop == "perf") {
      const perfLim = value <= 2;
      vars.renderer.setPixelRatio(
        window.devicePixelRatio / ((1.5 * value) / 1)
      );

      // details
      vars.renderer.antialias = perfLim;
      group.getObjectByName("floor_far_solid").receiveShadow = perfLim;
      group.getObjectByName("floor_near_glass").receiveShadow = perfLim;
      group.getObjectByName("sky").receiveShadow = perfLim;

      for (let i = 0; i < group.children.length; i++) {
        let el = group.children[i];
        if (el.type.includes("Mesh")) {
          el.material = vis.mat(el.material.userData);
        }
      }
    }

    // adjust property
    if (prop == "intensity") {
      for (let i = 0; i < group.children.length; i++) {
        let el = group.children[i];
        if (el.type.includes("Light")) {
          //all set retain original value to scale
          if (el.userData[prop] == undefined && el[prop] != undefined) {
            el.userData[prop] = el[prop];
          }
          //update current
          el[prop] = el.userData[prop] * value;
        }
      }
    }

    if (prop == "hex") {
      let old = this.object.col.getHex();
      let col = (this.object.col = new THREE.Color(value));
      // adjust color
      // bug: fix bug where identical value makes sticky
      // bug: use label
      for (let i = 0; i < group.children.length; i++) {
        let el = group.children[i];
        // mesh or light...
        if (el.material && el.material.color.getHex() == old) {
          el.material.color = col;
          el.material.userData.color = col;
        } else if (el.color && el.color.getHex() == old) {
          el.color = col;
          el.userData.color = col;
        }
      }
    }
    
    vis.var.curve.material.visible = (vis.set.type=="oscillator") ? true : false;
    
  }
}

document.getElementById("click").addEventListener("click", playback, false);
//document.addEventListener("visibilitychange", playback, false);

function playback(e) {
  
    const ctx = vis.var.analyser.context;
    const state = e.target.classList;
    if (state.contains("small")) {
      if (!state.contains("paused")) {
        state.add("paused");
        e.target.innerText = "Play";
        ctx.suspend();
        return;
      } else {
        state.remove("paused");
        e.target.innerText = "Pause";
        ctx.resume();
      }
    } else {
      e.target.innerText = "Pause";
      state.add("small");
    }
    vis.audio(ctx);

}

vis.demo = function () {
  if (!vis.set.demo) {
    TweenMax.killAll();
    return;
  }
  // note: focused select retains text

  const frame = vis.var.renderer.info.render.frame;

  if (frame % 30 == 0) {
    let LOD = vis.var.LOD;
    // FPS -15s
    LOD.FPS = LOD.FPS.slice(-30);
    let now = performance.now() / 1000;
    LOD.FPS.push(now);
    // average delta
    let delta = [];
    for (let i = 1; i < LOD.FPS.length; i++) {
      delta.push(LOD.FPS[i] - LOD.FPS[i - 1]);
    }
    delta = delta.reduce((a, b) => b + a) / delta.length;
    // resolution diff from baseline
    let res = 720 / LOD.res;

    //console.log('delta='+delta, 'res='+res, 'perf='+(res+delta-1));
    let combined = res + delta;

    let perf = vis.gui.__controllers.find((el) => el.property == "perf");
    if (combined != perf.getValue()) {
      //console.log(perfRes, perf.getValue())
      perf.setValue(combined);
    }
  }

  if (frame % 900 == 0) {
    // camera 9s
    TweenMax.to(vis.var.camera.position, 6, {
      x: Math.cos(frame) * 30 + 5,
      y: Math.random() * 30,
      z: Math.random() * 30,
      ease: Power2.easeIn
    });
  }
  vis.var.camera.lookAt(0, 3, 0);
  vis.var.controls.update();

  if (frame % 300 == 0) {
    // low light 3s
    let near = vis.var.group.getObjectByName("low");
    const color = new THREE.Color();
    color.setRGB(Math.random(), Math.random(), Math.random());
    TweenMax.to(near.color, 2, {
      r: color.r,
      g: color.g,
      b: color.b,
      ease: Power2.easeIn
    });
  }

  if (frame % 1500 == 0) {
    // toggle type 15s
    let type = vis.gui.__controllers.find((el) => el.property == "type");
    let value = type.getValue();
    value =
      value == "oscillator" ? type.setValue("spectrum") : type.setValue("oscillator");

    if (frame % 3000 == 0) {
      let axis = vis.gui.__controllers.find((el) => el.property == "axis");
      let value = axis.getValue();
      if (value == "x") {
        axis.setValue("y");
      } else if (value == "y") {
        axis.setValue("z");
      } else {
        axis.setValue("x");
      }
    }

    // synchronous portal effect
    if (vis.set.axis == "z") {
      let cubes = vis.var.BPM.children;
      let off = vis.set.type == "oscillator" ? -10 : 0;

      for (let i = 0; i < cubes.length; i++) {
        let cube = cubes[i];
        TweenMax.to(cube.position, 5, {
          z: cube.userData.position.z + Math.floor(i / 4) * off,
          ease: Power2.easeIn
        });
      }
    }

    // test on-demand peaks intermittently
    if (vis.var.analyser.context.state == "running") {
      if (vis.set.axis != "z" && vis.set.type == "spectrum") {
        // new bands
        vis.fband(3, vis.set.axis, vis.set.type);
      }
    }
  }
};

const noise = new SimplexNoise();
data = new Uint8Array(16 * 4);

window.AudioContext = window.AudioContext||window.webkitAudioContext;
context = new window.AudioContext();
vis.var.analyser = new AnalyserNode(context, {
  minDecibels: -90,
  maxDecibels: -10,
  fftSize: 512,
  smoothingTimeConstant: 0.5
});
vis.var.analyser.context.suspend();

// BEGIN!
vis.three();