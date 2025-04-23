// welcome-component.js - Handles the welcome message functionality for GeoImage Explorer

// Function to create and inject the welcome message HTML
function initWelcomeMessage() {
  // Create the welcome message element
  const welcomeHTML = `
    <div id="welcomeMessage" class="welcome-container">
      <div class="welcome-header">
        <i class="fas fa-globe-americas"></i>
        <h2>Welcome to GeoImage Explorer</h2>
      </div>
      <p class="welcome-description">
        Visualize and analyze your geotagged photos on an interactive map. Discover patterns, create mosaics, and explore your photography from a geographic perspective.
      </p>
      <div class="features-grid">
        <div class="feature-item">
          <i class="fas fa-map-marked-alt"></i>
          <div class="feature-text">
            <h4>Map Visualization</h4>
            <p>See where all your photos were taken on an interactive map</p>
          </div>
        </div>
        <div class="feature-item">
          <i class="fas fa-th"></i>
          <div class="feature-text">
            <h4>Mosaic Analysis</h4>
            <p>Find sets of overlapping images perfect for panoramas</p>
          </div>
        </div>
        <div class="feature-item">
          <i class="fas fa-object-group"></i>
          <div class="feature-text">
            <h4>Overlap Groups</h4>
            <p>Identify images that can be stitched together</p>
          </div>
        </div>
        <div class="feature-item">
          <i class="fas fa-fire"></i>
          <div class="feature-text">
            <h4>Density Heatmap</h4>
            <p>Visualize concentration of images across locations</p>
          </div>
        </div>
      </div>
      <div class="welcome-buttons">
        <button id="getStartedButton" class="welcome-button primary">Get Started</button>
        <button id="watchTutorialButton" class="welcome-button secondary">Watch Tutorial</button>
      </div>
    </div>

    <!-- Help button -->
    <div class="help-button" id="helpButton">
      <i class="fas fa-question"></i>
    </div>

    <!-- Tooltip container -->
    <div id="tooltip" class="tooltip"></div>
  `;

  // Inject HTML into the document
  const mainElement = document.querySelector('main');
  mainElement.insertAdjacentHTML('beforeend', welcomeHTML);

  // Add necessary styles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Welcome message styles */
    .welcome-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 650px;
      background-color: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
      z-index: 1000;
      padding: 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 18px;
      opacity: 1;
      transition: opacity 0.3s ease;
      overflow-y: auto;
      max-height: 90vh;
    }

    .welcome-container.hidden {
      display: none;
    }

    .welcome-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .welcome-header i {
      font-size: 32px;
      color: #4285f4;
    }

    .welcome-header h2 {
      margin: 0;
      color: #333;
      font-weight: 600;
      font-size: 24px;
    }

    .welcome-description {
      color: #555;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 10px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      text-align: left;
      margin: 10px 0;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      border-radius: 8px;
      background-color: #f8f9fa;
    }

    .feature-item i {
      color: #4285f4;
      font-size: 20px;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .feature-text h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .feature-text p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .welcome-buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .welcome-button {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      min-width: 120px;
      touch-action: manipulation; /* Improves touch response */
      -webkit-tap-highlight-color: rgba(0,0,0,0); /* Removes tap highlight on iOS */
    }

    .welcome-button.primary {
      background-color: #4285f4;
      color: white;
    }

    .welcome-button.primary:hover, .welcome-button.primary:active {
      background-color: #3367d6;
    }

    .welcome-button.secondary {
      background-color: #f1f3f4;
      color: #3c4043;
    }

    .welcome-button.secondary:hover, .welcome-button.secondary:active {
      background-color: #e8eaed;
    }

    /* Tooltip styles */
    .tooltip {
      position: absolute;
      background-color: rgba(35, 35, 35, 0.95);
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      max-width: 250px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .tooltip::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: rgba(35, 35, 35, 0.95) transparent transparent transparent;
    }

    .tooltip.top::after {
      top: auto;
      bottom: 100%;
      border-color: transparent transparent rgba(35, 35, 35, 0.95) transparent;
    }

    /* Help button styles */
    .help-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background-color: #4285f4;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      z-index: 900;
      transition: all 0.2s ease;
      touch-action: manipulation; /* Improves touch response */
      -webkit-tap-highlight-color: rgba(0,0,0,0); /* Removes tap highlight on iOS */
    }

    .help-button:hover, .help-button:active {
      background-color: #3367d6;
      transform: scale(1.05);
    }

    /* Media queries for mobile responsiveness */
    @media (max-width: 768px) {
      .welcome-container {
        width: 95%;
        padding: 20px 16px;
        gap: 12px;
      }

      .welcome-header h2 {
        font-size: 20px;
      }

      .welcome-description {
        font-size: 14px;
      }

      .features-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .feature-item {
        padding: 10px;
      }

      .feature-text h4 {
        font-size: 15px;
      }

      .feature-text p {
        font-size: 13px;
      }

      .welcome-button {
        padding: 10px 16px;
        min-width: 110px;
      }

      /* Ensure buttons are easily tappable on mobile */
      .welcome-button, .help-button {
        min-height: 44px; /* Apple's recommended minimum touch target size */
      }
    }

    @media (max-width: 480px) {
      .welcome-container {
        padding: 16px 12px;
        gap: 10px;
      }

      .welcome-header i {
        font-size: 26px;
      }

      .welcome-header h2 {
        font-size: 18px;
      }

      .welcome-description {
        font-size: 13px;
        margin-bottom: 5px;
      }

      .feature-item {
        padding: 8px;
        gap: 8px;
      }

      .feature-item i {
        font-size: 18px;
      }

      .feature-text h4 {
        font-size: 14px;
      }

      .feature-text p {
        font-size: 12px;
      }

      .welcome-buttons {
        gap: 8px;
      }

      .welcome-button {
        padding: 8px 14px;
        font-size: 13px;
        min-width: 100px;
      }

      .help-button {
        width: 44px;
        height: 44px;
        font-size: 20px;
        bottom: 15px;
        right: 15px;
      }
    }
  `;
  document.head.appendChild(styleElement);
}

// Function to set up event listeners for welcome message interactions
function setupWelcomeEvents() {
  const welcomeMessage = document.getElementById('welcomeMessage');
  const getStartedButton = document.getElementById('getStartedButton');
  const watchTutorialButton = document.getElementById('watchTutorialButton');
  const helpButton = document.getElementById('helpButton');
  const tooltipElement = document.getElementById('tooltip');

  // Check if first visit
  const firstVisit = !localStorage.getItem('geoImageExplorerVisited');
  if (!firstVisit) {
    welcomeMessage.classList.add('hidden');
  }

  // Handle welcome message buttons with both click and touch events
  // Get Started button
  getStartedButton.addEventListener('click', handleGetStartedClick);
  getStartedButton.addEventListener('touchend', function(e) {
    e.preventDefault(); // Prevent default behavior
    handleGetStartedClick();
  });

  function handleGetStartedClick() {
    welcomeMessage.style.opacity = '0';
    setTimeout(() => {
      welcomeMessage.classList.add('hidden');
      localStorage.setItem('geoImageExplorerVisited', 'true');
    }, 300);
  }

  // Watch Tutorial button
  watchTutorialButton.addEventListener('click', handleWatchTutorialClick);
  watchTutorialButton.addEventListener('touchend', function(e) {
    e.preventDefault(); // Prevent default behavior
    handleWatchTutorialClick();
  });

  function handleWatchTutorialClick() {
    // Here you would add code to show a tutorial or video
    alert('Not yet, but its easy! :).');
    // Then hide welcome message
    welcomeMessage.classList.add('hidden');
    localStorage.setItem('geoImageExplorerVisited', 'true');
  }

  // Help button shows welcome message again
  helpButton.addEventListener('click', handleHelpButtonClick);
  helpButton.addEventListener('touchend', function(e) {
    e.preventDefault(); // Prevent default behavior
    handleHelpButtonClick();
  });

  function handleHelpButtonClick() {
    welcomeMessage.classList.remove('hidden');
    welcomeMessage.style.opacity = '1';
  }
}

// Function to set up tooltips for interface elements
function setupTooltips() {
  const tooltipElement = document.getElementById('tooltip');
  const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');

  // Detect if user is on a touch device
  let isTouchDevice = false;

  window.addEventListener('touchstart', function onFirstTouch() {
    isTouchDevice = true;
    // Remove event listener after detection
    window.removeEventListener('touchstart', onFirstTouch);
  }, false);

  tooltipTriggers.forEach(trigger => {
    // Mouse events for desktop
    trigger.addEventListener('mouseenter', function(e) {
      if (isTouchDevice) return; // Skip on touch devices

      const tooltip = this.getAttribute('data-tooltip');
      if (!tooltip) return;

      tooltipElement.textContent = tooltip;
      tooltipElement.style.opacity = '1';

      // Position tooltip
      positionTooltip(this, tooltipElement);
    });

    trigger.addEventListener('mouseleave', function() {
      if (isTouchDevice) return; // Skip on touch devices
      tooltipElement.style.opacity = '0';
    });

    // Touch events for mobile
    trigger.addEventListener('touchstart', function(e) {
      // Don't prevent default here as it will block buttons from working
      const tooltip = this.getAttribute('data-tooltip');
      if (!tooltip) return;

      tooltipElement.textContent = tooltip;
      tooltipElement.style.opacity = '1';

      // Position tooltip
      positionTooltip(this, tooltipElement);

      // Hide tooltip after a delay on mobile
      setTimeout(() => {
        tooltipElement.style.opacity = '0';
      }, 2000);
    });
  });

  // Helper function for positioning tooltips
  function positionTooltip(triggerElement, tooltipElement) {
    const rect = triggerElement.getBoundingClientRect();
    const tooltipHeight = tooltipElement.offsetHeight;
    const tooltipWidth = tooltipElement.offsetWidth;

    tooltipElement.style.left = (rect.left + (rect.width / 2) - (tooltipWidth / 2)) + 'px';
    tooltipElement.style.top = (rect.top - tooltipHeight - 10) + 'px';

    // Add direction class
    tooltipElement.className = 'tooltip';
    if (rect.top < tooltipHeight + 20) {
      tooltipElement.classList.add('top');
      tooltipElement.style.top = (rect.bottom + 10) + 'px';
    }
  }
}

// Main function to initialize the welcome component
function initWelcomeComponent() {
  // Create the welcome message elements
  initWelcomeMessage();

  // Set up event listeners
  setupWelcomeEvents();

  // Set up tooltips
  setupTooltips();
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initWelcomeComponent);

// Export functions for potential use in other scripts
export { initWelcomeComponent };