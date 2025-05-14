import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { Config } from './config.js';
import { UIManager } from './uiManager.js';

// Scene objects manager
export const SceneObjects = {
  halfSphere: null,
  plane: null,
  characters: [],
  initialPositions: {},
  
  createHalfSphere(scene, videoTexture) {
    UIManager.log('Creating half-sphere');
    
    const geometry = new THREE.SphereGeometry(
      Config.SPHERE_RADIUS,
      Config.SPHERE_SEGMENTS,
      Config.SPHERE_RINGS,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    
    geometry.scale(-1, 1, 1);
    
    const material = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.FrontSide
    });
    
    this.halfSphere = new THREE.Mesh(geometry, material);
    
    this.halfSphere.position.set(0, 0, -0.7);
    this.halfSphere.rotation.x = Math.PI;
    
    scene.add(this.halfSphere);
    
    UIManager.log('Half-sphere created');
  },
  
  createPlane(scene) {
    // Create a floating platform/plane
    const planeGeometry = new THREE.BoxGeometry(0.4, 0.02, 0.2);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      metalness: 0.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9
    });
    
    this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.plane.position.set(0, -0.1, -0.5);
    this.plane.castShadow = true;
    this.plane.receiveShadow = true;
    
    this.plane.userData = {
      isInteractable: true,
      originalPosition: this.plane.position.clone(),
      originalRotation: this.plane.rotation.clone(),
    };
    
    this.initialPositions.plane = this.plane.position.clone();
    
    scene.add(this.plane);
    
    this.createCharacters(this.plane);
  },
  
  createCharacters(plane) {
    for (let i = 0; i < 4; i++) {
      const geometry = new THREE.SphereGeometry(Config.CHARACTER_SIZE, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: Config.CHARACTER_COLORS[i],
        metalness: 0.3,
        roughness: 0.4,
        emissive: Config.CHARACTER_COLORS[i],
        emissiveIntensity: 0.2
      });
      
      const character = new THREE.Mesh(geometry, material);
      
      const posX = (i % 2 === 0) ? -0.1 : 0.1;
      const posZ = (i < 2) ? -0.05 : 0.05;
      character.position.set(posX, 0.03, posZ);
      
      character.userData = {
        isInteractable: true,
        index: i,
        originalPosition: character.position.clone(),
        originalRotation: character.rotation.clone(),
      };
      
      this.initialPositions['character' + i] = character.position.clone();
      
      character.castShadow = true;
      
      this.characters.push(character);
      plane.add(character);
    }
  },
  
  // Animate objects
  animate() {
    // Animate characters not being interacted with
    this.characters.forEach(character => {
      if (!character.userData.isSelected && !character.userData.isMarked) {
        character.rotation.y += 0.01;
      }
    });
    
    // Slowly rotate the half-sphere
    if (this.halfSphere) {
      this.halfSphere.rotation.y += 0.001;
    }
  },
  
  reset() {
    if (this.halfSphere) {
      this.halfSphere.parent.remove(this.halfSphere);
      this.halfSphere.geometry.dispose();
      this.halfSphere.material.dispose();
      this.halfSphere = null;
    }
    
    this.characters = [];
    this.initialPositions = {};
    this.plane = null;
  },
  
  getPlane() {
    return this.plane;
  },
  
  getCharacters() {
    return this.characters;
  },
  
  getAllInteractableObjects() {
    return [this.plane, ...this.characters].filter(obj => obj != null);
  }
};
