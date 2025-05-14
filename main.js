import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { Config } from './config.js';
import { VideoManager } from './videoManager.js';
import { SceneObjects } from './sceneObjects.js';
import { UIManager } from './uiManager.js';
import { InteractionManager } from './interactionManager.js';

// Global variables
let camera, scene, renderer;
let xrSession = null;
let xrReferenceSpace = null;
let controllers = [];

// Initialize and connect modules
function init() {
  UIManager.log('Initializing application');
  
  initScene();
  VideoManager.init();
  
  document.getElementById('start-button').addEventListener('click', startAR);
  document.getElementById('exit-ar').addEventListener('click', onSessionEnded);
  
  UIManager.log('Initialization complete');
}

// Initialize Three.js scene
function initScene() {
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(1, 1, 1);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  window.addEventListener('resize', onWindowResize);
  
  UIManager.log('Scene initialized');
}

// Start AR session
function startAR() {
  if (!navigator.xr) {
    UIManager.showStatus('WebXR not supported in this browser', false);
    return;
  }
  
  UIManager.log('Starting AR session');
  
  navigator.xr.isSessionSupported('immersive-ar').then(supported => {
    if (!supported) {
      UIManager.showStatus('AR not supported on this device', false);
      return;
    }
    
    navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'hand-tracking'],
      domOverlay: { root: document.body }
    }).then(onSessionStarted);
  });
}

// Handle AR session start
function onSessionStarted(session) {
  UIManager.log('AR session started');
  xrSession = session;
  
  document.getElementById('start-button').style.display = 'none';
  document.body.classList.add('xr-active');
  
  renderer.xr.setReferenceSpaceType('local');
  renderer.xr.setSession(session);
  
  session.requestReferenceSpace('local').then((referenceSpace) => {
    xrReferenceSpace = referenceSpace;
    
    // Set up controllers
    setupControllers(session);
    
    // Create our objects
    SceneObjects.createHalfSphere(scene, VideoManager.getVideoTexture());
    SceneObjects.createPlane(scene);
    
    // Start video playback
    VideoManager.startVideoPlayback();
    
    // Initialize interaction manager
    InteractionManager.init(scene, controllers, camera);
    
    // Start render loop
    renderer.setAnimationLoop(render);
    
    // Handle session end
    session.addEventListener('end', onSessionEnded);
    
    UIManager.showStatus('AR experience loaded. Tap objects to interact.');
  });
}

function setupControllers(session) {
  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    controller.userData.id = i;
    scene.add(controller);
    
    addHandVisual(controller, i === 0 ? 0x6699ff : 0xff6666);
    
    controller.addEventListener('selectstart', (event) => InteractionManager.onSelectStart(event));
    controller.addEventListener('selectend', (event) => InteractionManager.onSelectEnd(event));
    
    controllers.push(controller);
  }
}

function addHandVisual(controller, color) {
  const handGeometry = new THREE.SphereGeometry(0.025, 16, 16);
  const handMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.5,
    transparent: true,
    opacity: 0.7
  });
  const handMesh = new THREE.Mesh(handGeometry, handMaterial);
  controller.add(handMesh);
}

// Handle AR session end
function onSessionEnded() {
  UIManager.log('AR session ended');
  
  VideoManager.stopVideo();
  
  document.getElementById('start-button').style.display = 'block';
  document.body.classList.remove('xr-active');
  
  xrSession = null;
  xrReferenceSpace = null;
  controllers = [];
  
  SceneObjects.reset();
  InteractionManager.reset();
  
  clearScene();
  
  renderer.setAnimationLoop(null);
  
  UIManager.showStatus('AR session ended');
}

function clearScene() {
  while(scene.children.length > 0) { 
    const object = scene.children[0];
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
    scene.remove(object); 
  }
}

// Handle window resize
function onWindowResize() {
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  if (renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Render function
function render(time, frame) {
  // Verify video is still playing
  VideoManager.checkVideo();
  
  // Animate objects
  SceneObjects.animate();
  
  if (frame) {
    // Handle interactions
    InteractionManager.update(frame);
  }
  
  renderer.render(scene, camera);
}

// Start the application
window.addEventListener('load', init);
