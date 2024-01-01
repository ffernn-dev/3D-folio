import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as POSTPROCESSING from "postprocessing"
import TextTexture from '@seregpie/three.text-texture';
import { SSAOEffect } from "realism-effects"

/////////////////////////////////////
// LIST OF VOXEL MODELS TO EXHIBIT //
/////////////////////////////////////
const models = ["chr_knight", "bunker"]
var currentModelIdx = 0

var currentModel

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
const secondaryScene = new THREE.Scene();
let hologram_origin = new THREE.Vector3();


const loader = new GLTFLoader();
loader.load(
	new URL("assets/Scene.glb", import.meta.url).href,
	
	// called when the glb file finishes loading
	function (gltf) {
		gltf.scene.traverse((object) => {
			object.visible = !object.userData.hidden;
		});
		
		scene.add(gltf.scene);
		
		scene.getObjectByName("Hologram_Plate").getWorldPosition(hologram_origin);
		hologram_origin.add(new THREE.Vector3(0, 0.4, 0))
		controls.target.copy(hologram_origin);
		
		loadModel(models[0]);
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
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.autoClear = false;

const composer = new POSTPROCESSING.EffectComposer(renderer)
const ssaoEffect = new SSAOEffect(composer, camera, scene)
const effectPass = new POSTPROCESSING.EffectPass(camera, ssaoEffect)
composer.addPass(effectPass)

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

	renderer.clear();
	renderer.render(scene, camera);
	renderer.render(secondaryScene, camera)
}


function animMoveCamera(object) {
	var targetTween = new TWEEN.Tween(controls.target)
	.to(object.position, 400)
	.easing(TWEEN.Easing.Quadratic.InOut);
	
	targetTween.start();
}

async function loadFile(url) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch file. Status: ${response.status}`);
	}
	
	const csvData = await response.text();
	return csvData;
}

function parseCSV(csvData) {
	const lines = csvData.split('\n');
	const headers = lines[0].split(',');

	const result = [];

	for (let i = 1; i < lines.length; i++) {
	  const currentLine = lines[i].split(',');
	  const entry = {};

	  for (let j = 0; j < headers.length; j++) {
		entry[headers[j]] = currentLine[j];
	  }

	  result.push(entry);
	}

	return result;
}

function calcSunPosition(pitch, yaw, targetCoords) {
	const outputTarget = targetCoords.clone();

	pitch = THREE.MathUtils.degToRad(pitch);
	yaw = THREE.MathUtils.degToRad(yaw);

	// Convert the spherical to cartesian coordiates
	const x = -1 * Math.sin(yaw) * Math.cos(pitch);
	const y = Math.sin(pitch);
	const z = -1 * Math.cos(yaw) * Math.cos(pitch);

	const outputPosition = new THREE.Vector3(x, y, z);
	outputPosition.normalize();
	outputPosition.add(targetCoords);

	return {"position": outputPosition, "target": outputTarget}
}

async function loadModel(name) {
	const path = "models/" + name + "/";
	const screen = scene.getObjectByName("Screen");
	
	const textureLoader = new THREE.TextureLoader();
	const texture = textureLoader.load(path + "render.png");
	
	screen.material.map = texture;
	screen.material.emissiveMap = texture;
	screen.material.emissive = new THREE.Color(0xffffff);
	

	const materialLoader = new MTLLoader();

	materialLoader.load(path + "material.mtl", function (materials) {
		const modelLoader =  new OBJLoader();
		modelLoader.setMaterials(materials);

		modelLoader.load(
			path + "model.obj",
			// called when resource is loaded
			function ( object ) {
				secondaryScene.remove(currentModel)

				object.position.copy(hologram_origin)
				object.rotateY(THREE.MathUtils.degToRad(180))
				secondaryScene.add( object );
				currentModel = object
			},
			// called when loading is in progresses
			function ( xhr ) {
				//pass
			},
			// called when loading has errors
			function ( error ) {
				console.log( error );
			}
		);
	});


	const lightInfoFileURL = path + "light_info.csv"
	const lightingData = parseCSV(await loadFile(lightInfoFileURL))
	// The first line of the light info file is the Sun light. ThreeJS doesn't have the same angle system MagicaVoxel does
	// instead the light always points toward the target wherever it is. In order to mimic Magicavoxel, we set the target of the light
	// to be our little voxel model, and then shoot the light outwards in the direction of the angle.
	const modelSunLight = new THREE.DirectionalLight( new THREE.Color(lightingData[0].color), lightingData[1].strength * 5 );
	
	const [sunPitch, sunYaw] = lightingData[0].data.split(" ");
	
	const sunPositionData = calcSunPosition(sunPitch, sunYaw, hologram_origin);
	modelSunLight.target.position.copy(sunPositionData.target);
	modelSunLight.position.copy(sunPositionData.position);
	modelSunLight.castShadow = true;
	
	// The second line of the light info file is the ambient light. Multiplying strength by 1.3 to match magicavoxel somewhat
	const modelAmbientLight = new THREE.AmbientLight( new THREE.Color(lightingData[1].color), lightingData[1].strength * 1.3 );
	
	secondaryScene.add(modelAmbientLight);
	secondaryScene.add(modelSunLight);
};

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

	if (intersects.length > 0) {
		switch (intersects[0].object.name) {
			case "NextButton":
				currentModelIdx = (currentModelIdx + 1) % models.length;
				loadModel(models[currentModelIdx])
				break;
			case "PrevButton":
				currentModelIdx = (currentModelIdx - 1 + models.length) % models.length;
				loadModel(models[currentModelIdx])
				break;
		}
	}
	
	// // If there's an intersection
	// if (intersects.length > 0) {
	// 	if (["Monitor", "Machine_Collider"].includes(intersects[0].object.name)) {
	// 		animMoveCamera(intersects[0].object);
	// 	}
	// }
}
// Add event listeners for mouse move and click
window.addEventListener("mousemove", onMouseMove, false);
window.addEventListener("click", onMouseClick, false);
