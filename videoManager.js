import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { UIManager } from './uiManager.js';

// Video texture manager
export const VideoManager = {
  videoElement: null,
  videoTexture: null,
  videoState: 'unloaded',
  
  init() {
    UIManager.log('Initializing video');
    this.videoState = 'loading';
    
    this.videoElement = document.getElementById('video-source');
    
    this.videoElement.addEventListener('loadedmetadata', () => {
      UIManager.log('Video metadata loaded');
    });
    
    this.videoElement.addEventListener('canplay', () => {
      UIManager.log('Video can play');
      this.videoState = 'loaded';
      this.createVideoTexture();
    });
    
    this.videoElement.addEventListener('playing', () => {
      UIManager.log('Video playing');
      this.videoState = 'playing';
    });
    
    this.videoElement.addEventListener('error', (e) => {
      const error = e.target.error;
      UIManager.log(`Video error: ${error ? error.message : 'unknown error'}`);
      this.videoState = 'error';
      UIManager.showStatus('Error loading video', false);
    });
    
    this.videoElement.load();
    
    setTimeout(() => {
      if (this.videoState === 'loading') {
        UIManager.log('Video load timeout - continuing anyway');
        this.videoState = 'loaded';
        this.createVideoTexture();
      }
    }, 5000);
  },
  
  createVideoTexture() {
    try {
      UIManager.log('Creating video texture');
      
      this.videoTexture = new THREE.VideoTexture(this.videoElement);
      this.videoTexture.minFilter = THREE.LinearFilter;
      this.videoTexture.magFilter = THREE.LinearFilter;
      this.videoTexture.format = THREE.RGBAFormat;
      this.videoTexture.generateMipmaps = false;
      
      UIManager.log('Video texture created');
    } catch (error) {
      UIManager.log(`Error creating video texture: ${error}`);
    }
  },
  
  startVideoPlayback() {
    if (!this.videoElement || this.videoState === 'playing') return;
    
    UIManager.log('Starting video playback');
    
    this.videoElement.play().then(() => {
      UIManager.log('Video playback started successfully');
      this.videoState = 'playing';
    }).catch(error => {
      UIManager.log(`Failed to autoplay video: ${error}`);
      UIManager.showStatus('Tap screen to start video');
      
      const startVideo = () => {
        this.videoElement.play().then(() => {
          UIManager.log('Video started after user interaction');
          this.videoState = 'playing';
          document.removeEventListener('click', startVideo);
        }).catch(err => {
          UIManager.log(`Video play failed after user interaction: ${err}`);
        });
      };
      
      document.addEventListener('click', startVideo);
    });
  },
  
  checkVideo() {
    if (this.videoElement && this.videoState === 'playing' && this.videoElement.paused) {
      this.videoElement.play().catch(err => {
        UIManager.log(`Video restart failed: ${err}`);
      });
    }
  },
  
  stopVideo() {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoState = 'loaded';
    }
  },
  
  getVideoTexture() {
    return this.videoTexture;
  }
};
