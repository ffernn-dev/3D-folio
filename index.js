import * as THREE from 'three';
import TWEEN from 'tween'
//import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/////////////////////////////////
// CAMERA PREDEFINED POSITIONS //
/////////////////////////////////
const camera_pos_model_view = new THREE.Vector3(-1.0246261083048351,6.641607340736049,-9.44884449430009)
const camera_rot_model_view = new THREE.Euler(-3.061500156384304,-0.27015664975960435,-3.120174826947387)
const camera_pos_screen_view = new THREE.Vector3(-7,8,-8)
const camera_rot_screen_view = new THREE.Euler(-3.0757670930639383,0.24271310143223193,3.125750766008166)

///////////////////////////////////////////////////
// VARIABLE SETUP FOR THE OBJECT CLICK DETECTION //
///////////////////////////////////////////////////
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();


///////////////////////////////////
// CAMERA CREATION + SCENE SETUP //
///////////////////////////////////
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.copy(camera_pos_model_view);
camera.quaternion.setFromEuler(camera_rot_model_view);

const scene = new THREE.Scene();

let hologram_origin = new THREE.Vector3()

const loader = new GLTFLoader();
loader.load(
	'Scene.glb',

	// called when the glb file finishes loading
	function ( gltf ) {
	gltf.scene.traverse((object) => {
	  if (object.userData.hidden) {
		object.visible = false;
	  }
	});
		scene.add( gltf.scene );

	scene.getObjectByName("Hologram_Plate").getWorldPosition(hologram_origin)
	// hologram_origin.y += 2
	// camera.position.copy(hologram_origin)
	// // camera.translateY(1)
	// camera.translateZ(11)
	// camera.translateX(2)
	console.log(camera.position)

	// camera.lookAt(hologram_origin.clone().add(new THREE.Vector3(0, 0, 10)))
	console.log(camera.rotation)
	},
	// called while loading is progressing
	function ( xhr ) {
		//pass
	},
	// called when loading has errors
	function ( error ) {
		console.log( error );
	}
);

/////////////////////
// RENDERING SETUP //
/////////////////////
const renderer = new THREE.WebGLRenderer({ antialias: true, physicallyCorrectLights: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

scene.background = new THREE.Color('#1f1f21');
renderer.setClearAlpha(1);

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Main render loop
function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update();
  renderer.render(scene, camera);
}



function animMoveCamera(targetPosition, targetEuler) {
	// Store the initial quaternion
	var startQuaternion = new THREE.Quaternion().copy(camera.quaternion);
  
	// Define the target quaternion
	var targetQuaternion = new THREE.Quaternion().setFromEuler(targetEuler);
  
	// Create a tween to interpolate from the start quaternion to the target quaternion
	var tween = new TWEEN.Tween({t: 0}).to({t: 1}, 1000);
	
	tween.onUpdate(function() {
	  // Use spherical linear interpolation (slerp) to interpolate between the start and target quaternions
	  camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, this.t);
	});
  
	tween.start();
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
	const hologram_device = scene.getObjectByName("Machine")

	switch (intersects[0].object.name) {
	  case "Monitor":
		console.log("Moving to monitor")
		camera.position.copy(camera_pos_screen_view);
		//camera.quaternion.setFromEuler(camera_rot_screen_view);
		camera.lookAt(intersects[0].object.position)
		console.log(camera.rotation)
		break;

	  case "Machine_Collider":
		console.log("Moving to machine")
		camera.position.copy(camera_pos_model_view);
		animMoveCamera(camera_pos_model_view, camera_rot_model_view)
		camera.quaternion.setFromEuler(camera_rot_model_view);
		break;
	}
  }
}
// Add event listeners for mouse move and click
window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('click', onMouseClick, false);
