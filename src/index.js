import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/////////////////////////////////////
// LIST OF VOXEL MODELS TO EXHIBIT //
/////////////////////////////////////
const models = ["bunker", "chr_knight"]
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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.autoClear = false;
scene.background = new THREE.Color(0x1c1a1e);

window.addEventListener("resize", onWindowResize);
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}


const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = true;
controls.maxDistance = 15.5;
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

function addBlackOutlineToTexture(texture) {
	var textureWidth = texture.image.width;
	var textureHeight = texture.image.height;

	var canvas = document.createElement('canvas');
	canvas.width = textureWidth + 6; // Add 2 pixels for the black line
	canvas.height = textureHeight + 6; // Add 2 pixels for the black line

	var context = canvas.getContext('2d');
	// draw the existing texture onto the canvas with a one pixel offset
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.drawImage(texture.image, 3, 3, textureWidth, textureHeight);

	var modifiedTexture = new THREE.Texture(canvas);
	modifiedTexture.needsUpdate = true;
	
	return modifiedTexture;
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
	const texture = textureLoader.load(path + "render.png", function (borderlessTexture) {
		const borderedTexture = addBlackOutlineToTexture(borderlessTexture);
		borderedTexture.colorSpace = THREE.SRGBColorSpace;
		var material = new THREE.MeshBasicMaterial({ map: borderedTexture, color: 0xffffff });
		material.toneMapped = false;
		screen.material = material;
		borderedTexture.needsUpdate = true;
	});

	const modelLoader =  new GLTFLoader();
	modelLoader.load(
		path + "model.glb",
		// called when resource is loaded
		function ( gltf ) {
			secondaryScene.remove(currentModel);

			gltf.scene.position.copy(hologram_origin);
			
			var boundingBox = new THREE.Box3().setFromObject(gltf.scene);
			var size = new THREE.Vector3();
			boundingBox.getSize(size);

			// Scale the model down so that it's no bigger than 6 on the x and z, but can be taller (12) on the y axis.
			const largestDimension = Math.max(size.x, size.y, size.z);
			let scaleValue;
			if (largestDimension === size.y && size.y != size.x && size.y > 12) {
				scaleValue = 12 / size.y;
			} else {
				scaleValue = (largestDimension > 6) ? (6 / largestDimension) : 1;
			}

			gltf.scene.scale.multiplyScalar(scaleValue);

			gltf.scene.rotateY(THREE.MathUtils.degToRad(180))
			secondaryScene.add( gltf.scene );
			currentModel = gltf.scene
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
	let modelSunLight = secondaryScene.getObjectByName('modelSunLight');
	let modelAmbientLight = secondaryScene.getObjectByName('modelAmbientLight');	

	const lightInfoFileURL = path + "light_info.csv"
	const lightingData = parseCSV(await loadFile(lightInfoFileURL))
	// The first line of the light info file is the Sun light. ThreeJS doesn't have the same angle system MagicaVoxel does
	// instead the light always points toward the target wherever it is. In order to mimic Magicavoxel, we set the target of the light
	// to be our little voxel model, and then shoot the light outwards in the direction of the angle.
	if (!modelSunLight) {
		modelSunLight = new THREE.DirectionalLight(new THREE.Color(lightingData[0].color), lightingData[1].strength * 5);
		modelSunLight.name = 'modelSunLight';
		secondaryScene.add(modelSunLight);
	} else {
		modelSunLight.color.set(lightingData[0].color);
		modelSunLight.intensity = lightingData[1].strength * 5;
	}
	
	
	const [sunPitch, sunYaw] = lightingData[0].data.split(" ");
	
	const sunPositionData = calcSunPosition(sunPitch, sunYaw, hologram_origin);
	modelSunLight.target.position.copy(sunPositionData.target);
	modelSunLight.position.copy(sunPositionData.position);
	modelSunLight.castShadow = true;
	
	// The second line of the light info file is the ambient light. Multiplying strength by 1.3 to match magicavoxel somewhat
	if (!modelAmbientLight) {
		modelAmbientLight = new THREE.AmbientLight(new THREE.Color(lightingData[1].color), lightingData[1].strength * 1.3);
		modelAmbientLight.name = 'modelAmbientLight';
		secondaryScene.add(modelAmbientLight);
	} else {
		modelAmbientLight.color.set(lightingData[1].color);
		modelAmbientLight.intensity = lightingData[1].strength * 1.3;
	}
	
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
