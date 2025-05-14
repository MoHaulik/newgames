import { Config } from './config.js';

// UI and logging manager
export const UIManager = {
  debugElement: null,
  
  init() {
    this.debugElement = document.getElementById('debug');
    if (Config.DEBUG) this.debugElement.style.display = 'block';
  },
  
  // Debug logging
  log(message) {
    console.log(message);
    if (Config.DEBUG && this.debugElement) {
      this.debugElement.innerHTML += `${message}<br>`;
      const lines = this.debugElement.innerHTML.split('<br>');
      if (lines.length > 10) {
        this.debugElement.innerHTML = lines.slice(-10).join('<br>');
      }
      this.debugElement.scrollTop = this.debugElement.scrollHeight;
    }
  },
  
  // Show status message
  showStatus(message, autoHide = true) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.style.display = 'block';
    
    this.log(message);
    
    if (autoHide) {
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    }
  }
};

// Initialize on load
UIManager.init();
