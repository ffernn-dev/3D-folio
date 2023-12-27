import * as THREE from "three";
import TWEEN from "tween";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

///////////////////////////////////////////////////
// VARIABLE SETUP FOR THE OBJECT CLICK DETECTION //
///////////////////////////////////////////////////
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

///////////////////////////////////
// CAMERA CREATION + SCENE SETUP //
///////////////////////////////////
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  10000,
);
camera.position.set(-1.0246261083048351,6.641607340736049,-9.44884449430009)

const scene = new THREE.Scene();
let hologram_origin = new THREE.Vector3();

const loader = new GLTFLoader();
loader.load(
  "Scene.glb",

  // called when the glb file finishes loading
  function (gltf) {
    gltf.scene.traverse((object) => {
      if (object.userData.hidden) {
        object.visible = false;
      }
    });

    scene.add(gltf.scene);

    scene.getObjectByName("Hologram_Plate").getWorldPosition(hologram_origin);
    controls.target.copy(hologram_origin);


    loadModel("blah", "models/thonka.png");
  },
  // called while loading is progressing
  function (xhr) {
    //pass
  },
  // called when loading has errors
  function (error) {
    console.log(error);
  },
);

/////////////////////
// RENDERING SETUP //
/////////////////////
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

scene.background = new THREE.Color("#1f1f21");

window.addEventListener("resize", onWindowResize);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = true;
controls.maxDistance = 12.5;
animate();

// Main render loop
function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
  console.log(controls.getDistance());
  renderer.render(scene, camera);
}

function animMoveCamera(object) {
  var targetTween = new TWEEN.Tween(controls.target)
    .to(object.position, 400)
    .easing(TWEEN.Easing.Quadratic.InOut);

  targetTween.start();
}

function loadModel(modelPath, texturePath) {
  const screen = scene.getObjectByName("Screen");

  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(texturePath);

  screen.material.map = texture;
  screen.material.emissiveMap = texture;
  screen.material.emissive = new THREE.Color(0xffffff);

  screen.material.needsUpdate = true;
}

////////////////////////////
// OBJECT CLICK DETECTION //
////////////////////////////
function onMouseMove(event) {
  // Normalize mouse position into range [-1, 1] and store it in the "mouse" vector2
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
function onMouseClick(event) {
  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  var intersects = raycaster.intersectObjects(scene.children);

  // If there's an intersection
  if (intersects.length > 0) {
    if (["Monitor", "Machine_Collider"].includes(intersects[0].object.name)) {
      animMoveCamera(intersects[0].object);
    }
  }
}
// Add event listeners for mouse move and click
window.addEventListener("mousemove", onMouseMove, false);
window.addEventListener("click", onMouseClick, false);
