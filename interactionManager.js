import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { Config } from './config.js';
import { UIManager } from './uiManager.js';
import { SceneObjects } from './sceneObjects.js';
import { InteractionManager } from './interactionManager.js';

// Interaction manager
export const InteractionManager = {
  scene: null,
  controllers: [],
  camera: null,
  
  selectedObject: null,
  markedObject: null,
  interactionMode: 'none',
  
  activeControllers: new Set(),
  initialControllerPositions: {},
  initialDistance: 0,
  initialRotation: 0,
  initialScale: new THREE.Vector3(),
  grabOffset: new THREE.Vector3(),
  initialObjectPosition: new THREE.Vector3(),
  
  selectHoldTimer: null,
  
  init(scene, controllers, camera) {
    this.scene = scene;
    this.controllers = controllers;
    this.camera = camera;
    this.reset();
  },
  
  reset() {
    this.selectedObject = null;
    this.markedObject = null;
    this.interactionMode = 'none';
    this.activeControllers.clear();
    this.initialControllerPositions = {};
    this.selectHoldTimer = null;
  },
  
  onSelectStart(event) {
    const controller = event.target;
    const controllerPos = new THREE.Vector3();
    controller.getWorldPosition(controllerPos);
    
    this.activeControllers.add(controller.userData.id);
    
    this.selectHoldTimer = setTimeout(() => {
      if (this.markedObject) {
        this.selectedObject = this.markedObject;
        this.interactionMode = 'move';
        
        if (this.selectedObject === SceneObjects.getPlane()) {
          this.initialObjectPosition.copy(this.selectedObject.position);
        } else {
          this.selectedObject.getWorldPosition(this.initialObjectPosition);
        }
        
        this.grabOffset.copy(this.initialObjectPosition).sub(controllerPos);
        
        this.initialControllerPositions[controller.userData.id] = controllerPos.clone();
        
        UIManager.showStatus('Moving object. Use both hands to resize/rotate.');
      } else {
        const intersectedObject = this.findIntersectedObject(controllerPos);
        
        if (intersectedObject) {
          this.selectedObject = intersectedObject;
          this.interactionMode = 'move';
          this.highlightObject(this.selectedObject, true);
          
          if (this.selectedObject === SceneObjects.getPlane()) {
            this.initialObjectPosition.copy(this.selectedObject.position);
          } else {
            this.selectedObject.getWorldPosition(this.initialObjectPosition);
          }
          
          this.grabOffset.copy(this.initialObjectPosition).sub(controllerPos);
          
          this.initialControllerPositions[controller.userData.id] = controllerPos.clone();
          
          UIManager.showStatus('Moving object. Use both hands to resize/rotate.');
        }
      }
    }, Config.HOLD_DURATION);
  },
  
  onSelectEnd(event) {
    const controller = event.target;
    
    this.activeControllers.delete(controller.userData.id);
    
    if (this.selectHoldTimer) {
      clearTimeout(this.selectHoldTimer);
      this.selectHoldTimer = null;
      
      if (this.interactionMode === 'none') {
        const controllerPos = new THREE.Vector3();
        controller.getWorldPosition(controllerPos);
        
        const intersectedObject = this.findIntersectedObject(controllerPos);
        
        if (intersectedObject) {
          if (this.markedObject) {
            this.highlightObject(this.markedObject, false);
          }
          
          if (this.markedObject === intersectedObject) {
            this.markedObject = null;
            UIManager.showStatus('Object unmarked.');
          } else {
            this.markedObject = intersectedObject;
            this.highlightObject(this.markedObject, true);
            UIManager.showStatus('Object marked. Hold select to grab it.');
          }
        }
      }
    }
    
    if (this.interactionMode === 'transform') {
      if (this.activeControllers.size === 1) {
        this.interactionMode = 'move';
        
        const remainingControllerId = Array.from(this.activeControllers)[0];
        const remainingController = this.controllers[remainingControllerId];
        const controllerPos = new THREE.Vector3();
        remainingController.getWorldPosition(controllerPos);
        
        if (this.selectedObject === SceneObjects.getPlane()) {
          this.initialObjectPosition.copy(this.selectedObject.position);
        } else {
          this.selectedObject.getWorldPosition(this.initialObjectPosition);
        }
        
        this.grabOffset.copy(this.initialObjectPosition).sub(controllerPos);
        
        UIManager.showStatus('Transform complete. Still moving object.');
      }
      else if (this.activeControllers.size === 0) {
        this.resetInteraction();
      }
    }
    else if (this.interactionMode === 'move' && this.activeControllers.size === 0) {
      this.resetInteraction();
    }
  },
  
  update(frame) {
    // Check two-controller interaction to switch to transform mode
    if (this.selectedObject && this.interactionMode === 'move' && this.activeControllers.size === 2) {
      this.interactionMode = 'transform';
      
      this.initialDistance = this.getControllerDistance();
      this.initialScale.copy(this.selectedObject.scale);
      
      const leftPos = new THREE.Vector3();
      const rightPos = new THREE.Vector3();
      this.controllers[0].getWorldPosition(leftPos);
      this.controllers[1].getWorldPosition(rightPos);
      const vector = new THREE.Vector3().subVectors(rightPos, leftPos);
      this.initialRotation = Math.atan2(vector.x, vector.z);
      
      UIManager.showStatus('Transforming object (scale/rotate)');
    }
    
    // Handle object interactions
    if (this.selectedObject) {
      this.handleObjectInteraction();
    }
  },
  
  resetInteraction() {
    if (this.selectedObject && this.selectedObject !== this.markedObject) {
      this.highlightObject(this.selectedObject, false);
    }
    
    if (this.markedObject) {
      this.highlightObject(this.markedObject, true);
    }
    
    this.selectedObject = null;
    this.interactionMode = 'none';
    this.activeControllers.clear();
    this.initialControllerPositions = {};
    UIManager.showStatus(this.markedObject ? 'Object still marked. Hold select to grab it.' : 'Tap objects to mark them.');
  },
  
  highlightObject(object, isHighlighted) {
    if (!object || !object.material) return;
    
    // Mark object as selected or marked for other systems
    object.userData.isSelected = isHighlighted && object === this.selectedObject;
    object.userData.isMarked = isHighlighted && object === this.markedObject;
    
    if (isHighlighted) {
      if (Array.isArray(object.material)) {
        object.material.forEach(mat => {
          mat.emissive = new THREE.Color(0x0088ff);
          mat.emissiveIntensity = 0.5;
        });
      } else {
        object.material.emissive = new THREE.Color(0x0088ff);
        object.material.emissiveIntensity = 0.5;
      }
    } else {
      if (Array.isArray(object.material)) {
        object.material.forEach(mat => {
          mat.emissive = new THREE.Color(0x000000);
          mat.emissiveIntensity = 0;
        });
      } else {
        object.material.emissive = new THREE.Color(0x000000);
        object.material.emissiveIntensity = 0;
      }
    }
  },
  
  getControllerDistance() {
    if (this.controllers.length < 2) return 0;
    
    const leftPos = new THREE.Vector3();
    const rightPos = new THREE.Vector3();
    
    this.controllers[0].getWorldPosition(leftPos);
    this.controllers[1].getWorldPosition(rightPos);
    
    return leftPos.distanceTo(rightPos);
  },
  
  findIntersectedObject(controllerPos) {
    let closestObject = null;
    let closestDistance = Config.MAX_INTERACTION_DISTANCE;
    
    const plane = SceneObjects.getPlane();
    if (plane) {
      const planeDistance = controllerPos.distanceTo(plane.position);
      if (planeDistance < closestDistance) {
        closestDistance = planeDistance;
        closestObject = plane;
      }
    }
    
    const characters = SceneObjects.getCharacters();
    const localControllerPos = plane.worldToLocal(controllerPos.clone());
    
    characters.forEach((character) => {
      const worldCharPos = new THREE.Vector3();
      character.getWorldPosition(worldCharPos);
      const distance = controllerPos.distanceTo(worldCharPos);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestObject = character;
      }
    });
    
    return closestObject;
  },
  
  handleObjectInteraction() {
    if (!this.selectedObject) return;
    
    if (this.interactionMode === 'move' && this.activeControllers.size === 1) {
      const controllerId = Array.from(this.activeControllers)[0];
      const controller = this.controllers[controllerId];
      
      const controllerPos = new THREE.Vector3();
      controller.getWorldPosition(controllerPos);
      
      const newPosition = new THREE.Vector3().copy(controllerPos).add(this.grabOffset);
      
      if (this.selectedObject === SceneObjects.getPlane()) {
        this.selectedObject.position.copy(newPosition);
      } 
      else if (SceneObjects.getCharacters().includes(this.selectedObject)) {
        const localPos = SceneObjects.getPlane().worldToLocal(newPosition.clone());
        localPos.y = this.selectedObject.userData.originalPosition.y;
        this.selectedObject.position.copy(localPos);
      }
    }
    
    else if (this.interactionMode === 'transform' && this.activeControllers.size === 2) {
      const currentPositions = [];
      this.controllers.forEach(controller => {
        const pos = new THREE.Vector3();
        controller.getWorldPosition(pos);
        currentPositions[controller.userData.id] = pos;
      });
      
      const currentDistance = this.getControllerDistance();
      
      if (this.initialDistance > 0) {
        let scaleFactor = currentDistance / this.initialDistance;
        scaleFactor = Math.max(Config.MIN_SCALE_FACTOR, Math.min(scaleFactor, Config.MAX_SCALE_FACTOR));
        this.selectedObject.scale.copy(this.initialScale).multiplyScalar(scaleFactor);
      }
      
      const leftPos = currentPositions[0];
      const rightPos = currentPositions[1];
      
      if (leftPos && rightPos) {
        const vector = new THREE.Vector3().subVectors(rightPos, leftPos);
        const currentAngle = Math.atan2(vector.x, vector.z);
        
        const rotationDelta = currentAngle - this.initialRotation;
        this.selectedObject.rotation.y = this.selectedObject.userData.originalRotation.y + rotationDelta;
        
        const midpoint = new THREE.Vector3().addVectors(leftPos, rightPos).multiplyScalar(0.5);
        const forward = new THREE.Vector3(0, 0, -0.05);
        forward.applyQuaternion(this.camera.quaternion);
        midpoint.add(forward);
        
        if (this.selectedObject === SceneObjects.getPlane()) {
          this.selectedObject.position.copy(midpoint);
        } 
        else if (SceneObjects.getCharacters().includes(this.selectedObject)) {
          const targetLocalPos = SceneObjects.getPlane().worldToLocal(midpoint);
          targetLocalPos.y = this.selectedObject.userData.originalPosition.y;
          this.selectedObject.position.copy(targetLocalPos);
        }
      }
    }
  }
};
