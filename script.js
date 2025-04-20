/**
 * GeoImage Explorer
 * A modern application to view geotagged images on a map
 */
class GeoImageExplorer {
constructor() {
    // Core properties
    this.map = null;
    this.markers = [];
    this.images = [];
    this.currentPreview = null;
    this.overlapGroup = null;
    this.heatmapLayer = null;

    // Initialize components
    this.initMap();
    this.initEventListeners();
    this.initToast();
    this.initMosaicAnalyzer();
    this.initMapScreenshot();
    this.initMapScreenshot(); // Add this line

}

    /**
     * Initialize the map with custom styling
     */
    initMap() {
        this.map = L.map('map', {
            zoomControl: false, // We'll add it in a different position
        }).setView([20, 0], 2);
        
        // Add custom styled tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);
        
        // Add zoom control to the top-right corner
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);
        
        // Add scale control
        L.control.scale({
            imperial: false,
            position: 'bottomleft'
        }).addTo(this.map);
    }

    /**
     * Set up all event listeners for the application
     */
    initEventListeners() {
        // File input handling
        document.getElementById('imageInput').addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('resetView').addEventListener('click', () => this.resetView());
        document.getElementById('searchButton').addEventListener('click', () => this.searchImages());

        // Preview handling
        const closeButton = document.getElementById('closePreview');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeImagePreview());
        }

        // Map drag and drop handling
        const mapOverlay = document.getElementById('mapOverlay');
        const mapContainer = document.querySelector('.map-container');

        mapContainer.addEventListener('dragenter', (e) => {
            e.preventDefault();
            mapOverlay.classList.add('active');
        });

        mapContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        mapContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (e.relatedTarget && !mapContainer.contains(e.relatedTarget)) {
                mapOverlay.classList.remove('active');
            }
        });

        mapContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            mapOverlay.classList.remove('active');
            const files = Array.from(e.dataTransfer.files);
            this.processMultipleImages(files);
        });

        // Close preview on outside click
        document.addEventListener('click', (e) => {
            const preview = document.getElementById('imagePreview');
            const isClickInsidePreview = preview.contains(e.target);
            const isPreviewVisible = !preview.classList.contains('hidden');

            if (isPreviewVisible && !isClickInsidePreview && e.target.tagName !== 'IMG') {
                this.closeImagePreview();
            }
        });

        // Prevent preview closing when clicking inside
        document.getElementById('imagePreview').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Search on Enter key
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchImages();
            }
        });

        // ESC key to close preview
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !document.getElementById('imagePreview').classList.contains('hidden')) {
                this.closeImagePreview();
            }
        });
        
        // Toast close button
        document.getElementById('toastClose').addEventListener('click', () => {
            this.hideToast();
        });
    }
    
    /**
     * Initialize the toast notification system
     */
    initToast() {
        this.toast = document.getElementById('toast');
        this.toastTitle = document.getElementById('toastTitle');
        this.toastMessage = document.getElementById('toastMessage');
        this.toastTimeout = null;
    }
    
    /**
     * Show a toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    showToast(title, message, type = 'info', duration = 3000) {
        // Clear any existing timeout
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        // Set toast content
        this.toastTitle.textContent = title;
        this.toastMessage.textContent = message;
        
        // Remove existing type classes
        this.toast.classList.remove('success', 'error', 'warning', 'info');
        
        // Add the new type class
        this.toast.classList.add(type);
        
        // Update icon
        const iconElement = this.toast.querySelector('.toast-icon i');
        if (iconElement) {
            iconElement.className = ''; // Clear existing classes
            iconElement.classList.add('fas');
            
            // Add appropriate icon class based on type
            switch(type) {
                case 'success':
                    iconElement.classList.add('fa-check-circle');
                    break;
                case 'error':
                    iconElement.classList.add('fa-exclamation-circle');
                    break;
                case 'warning':
                    iconElement.classList.add('fa-exclamation-triangle');
                    break;
                default:
                    iconElement.classList.add('fa-info-circle');
            }
        }
        
        // Show the toast
        this.toast.classList.add('show');
        
        // Set timeout to hide the toast
        this.toastTimeout = setTimeout(() => {
            this.hideToast();
        }, duration);
    }
    
    /**
     * Hide the toast notification
     */
    hideToast() {
        this.toast.classList.remove('show');
    }

    /**
     * Show loading overlay
     * @param {string} message - Optional message to display
     */
    showLoading(message = 'Processing images...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const processingStatus = document.getElementById('processingStatus');
        
        if (processingStatus) {
            processingStatus.textContent = message;
        }
        
        loadingOverlay.classList.remove('hidden');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    /**
     * Update the image counter in the UI
     */
    updateImageCounter() {
        const counter = document.getElementById('imageCounter');
        if (counter) {
            counter.textContent = this.images.length.toString();
        }
    }

    /**
     * Handle image upload from file input
     * @param {Event} event - File input change event
     */
    async handleImageUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        await this.processMultipleImages(files);
    }

    /**
     * Process multiple image files
     * @param {File[]} files - Array of image files
     */
    async processMultipleImages(files) {
        if (!files.length) return;

        this.showLoading(`Processing ${files.length} image${files.length > 1 ? 's' : ''}...`);
        const counterElement = document.getElementById('imageProcessCounter');

        try {
            let processed = 0;
            let validCount = 0;
            
            for (const file of files) {
                // Update processing counter
                processed++;
                if (counterElement) {
                    counterElement.textContent = `Processing image ${processed} of ${files.length}`;
                }
                
                const imageData = await this.processImage(file);
                
                if (imageData !== null) {
                    validCount++;
                    this.images.push(imageData);
                    this.addMarkerToMap(imageData);
                }
            }

            this.updateImageCounter();

            if (this.markers.length > 0) {
                this.map.fitBounds(L.featureGroup(this.markers).getBounds(), {
                    padding: [50, 50],
                    maxZoom: 15
                });
            }

            if (validCount === 0) {
                this.showToast('No GPS Data', 'No valid GPS data found in the uploaded images.', 'warning');
            } else {
                const successMessage = validCount === files.length ? 
                    `Successfully loaded ${validCount} image${validCount > 1 ? 's' : ''}` :
                    `Found location data for ${validCount} of ${files.length} images`;
                
                this.showToast('Images Loaded', successMessage, 'success');
            }
        } catch (error) {
            console.error('Error processing images:', error);
            this.showToast('Processing Error', 'Error processing images. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Process a single image file
     * @param {File} file - Image file
     * @returns {Promise<Object|null>} - Image data object or null if no GPS data
     */
    async processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const image = new Image();
                image.onload = () => {
                    EXIF.getData(image, () => {
                        const exifData = EXIF.getAllTags(image);

                        if (exifData && exifData.GPSLatitude && exifData.GPSLongitude) {
                            const latitude = this.convertDMSToDD(exifData.GPSLatitude, exifData.GPSLatitudeRef);
                            const longitude = this.convertDMSToDD(exifData.GPSLongitude, exifData.GPSLongitudeRef);

                            // Format date for display
                            let timestamp = exifData.DateTimeOriginal || new Date().toISOString().replace('T', ' ').slice(0, 19);
                            if (timestamp && typeof timestamp === 'string') {
                                // Make sure it's in a standardized format
                                timestamp = timestamp.replace(/:/g, '-').slice(0, 10) + ' ' + timestamp.slice(11);
                            }

                            resolve({
                                file: file,
                                name: file.name,
                                latitude: latitude,
                                longitude: longitude,
                                dataUrl: reader.result,
                                timestamp: timestamp,
                                coordinates: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                                altitude: exifData.GPSAltitude ? `${exifData.GPSAltitude} m` : 'Unknown',
                                camera: exifData.Make ? `${exifData.Make} ${exifData.Model || ''}`.trim() : 'Unknown'
                            });
                        } else {
                            console.log('No GPS data found in:', file.name);
                            resolve(null);
                        }
                    });
                };
                image.onerror = () => {
                    console.error('Error loading image:', file.name);
                    resolve(null);
                };
                image.src = reader.result;
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert GPS coordinates from Degrees/Minutes/Seconds to Decimal Degrees
     * @param {Array} dms - Array of degrees, minutes, seconds
     * @param {String} ref - Reference direction (N, S, E, W)
     * @returns {Number} - Decimal degrees
     */
    convertDMSToDD(dms, ref) {
        if (!dms || dms.length < 3) return 0;

        const degrees = dms[0];
        const minutes = dms[1];
        const seconds = dms[2];

        let dd = degrees + minutes/60 + seconds/3600;
        if (ref === 'S' || ref === 'W') dd = -dd;

        return dd;
    }

    /**
     * Add a marker to the map for an image
     * @param {Object} imageData - Image data object
     */
    addMarkerToMap(imageData) {
        // Create a custom icon with a thumbnail preview
        const customIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div class="marker-icon" style="background-image: url(${imageData.dataUrl})"><div class="marker-pulse"></div></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        // Create marker with the custom icon
        const marker = L.marker([imageData.latitude, imageData.longitude], {
            icon: customIcon,
            title: imageData.name
        });

        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'marker-popup';

        const img = document.createElement('img');
        img.src = imageData.dataUrl;
        img.className = 'thumbnail';
        img.alt = imageData.name;
        img.onclick = () => this.showImagePreview(imageData);

        const name = document.createElement('p');
        name.textContent = imageData.name;
        name.style.fontWeight = 'bold';
        name.style.marginTop = '8px';

        const dateInfo = document.createElement('p');
        dateInfo.textContent = imageData.timestamp;
        dateInfo.style.fontSize = '0.8rem';
        dateInfo.style.color = '#666';

        popupContent.appendChild(img);
        popupContent.appendChild(name);
        popupContent.appendChild(dateInfo);

        // Add popup to marker
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        // Add marker to map and store reference
        marker.addTo(this.map);
        this.markers.push(marker);

        // Add marker animation
        setTimeout(() => {
            marker.getElement().classList.add('marker-added');
        }, 10);
    }

    /**
     * Show full image preview
     * @param {Object} imageData - Image data object
     */
    showImagePreview(imageData) {
        const preview = document.getElementById('imagePreview');
        const previewTitle = document.getElementById('previewTitle');
        const previewImage = document.getElementById('previewImage');
        const imageTimestamp = document.getElementById('imageTimestamp');
        const imageCoordinates = document.getElementById('imageCoordinates');

        if (!preview || !previewTitle || !previewImage) {
            console.error('Preview elements not found');
            return;
        }

        try {
            // Set content
            previewTitle.textContent = imageData.name;
            previewImage.src = imageData.dataUrl;
            imageTimestamp.textContent = imageData.timestamp;
            imageCoordinates.textContent = imageData.coordinates;

            // Show preview with animation
            preview.classList.remove('hidden');
            setTimeout(() => {
                preview.classList.add('visible');
            }, 10);

            this.currentPreview = imageData;

            // Pan map to location
            this.map.panTo([imageData.latitude, imageData.longitude], {
                animate: true,
                duration: 1
            });
        } catch (error) {
            console.error('Error showing preview:', error);
            this.showToast('Preview Error', 'Error showing image preview', 'error');
        }
    }

    /**
     * Close image preview
     */
    closeImagePreview() {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.classList.remove('visible');

            // Wait for animation to finish before hiding
            setTimeout(() => {
                preview.classList.add('hidden');
                const previewImage = document.getElementById('previewImage');
                if (previewImage) {
                    previewImage.src = '';
                }
                this.currentPreview = null;
            }, 300);
        }
    }

    /**
     * Reset the map view to show all markers
     */
    resetView() {
        if (this.markers.length > 0) {
            this.map.fitBounds(L.featureGroup(this.markers).getBounds(), {
                padding: [50, 50],
                maxZoom: 15,
                animate: true,
                duration: 1
            });
            this.showToast('View Reset', 'Map view reset to show all images', 'info', 2000);
        } else {
            this.map.setView([20, 0], 2, {
                animate: true,
                duration: 1
            });
            this.showToast('No Images', 'No images loaded yet. Upload some images with GPS data.', 'info');
        }
    }

    /**
     * Search for images by filename
     */
    searchImages() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

        if (!searchTerm) {
            this.resetView();
            return;
        }

        const matchingMarkers = this.markers.filter((marker, index) =>
            this.images[index].name.toLowerCase().includes(searchTerm)
        );

        if (matchingMarkers.length > 0) {
            if (matchingMarkers.length === 1) {
                const marker = matchingMarkers[0];
                marker.openPopup();
                this.map.setView(marker.getLatLng(), 15, {
                    animate: true,
                    duration: 1
                });
                this.showToast('Search Result', `Found 1 matching image`, 'success');
            } else {
                const bounds = L.featureGroup(matchingMarkers).getBounds();
                this.map.fitBounds(bounds, {
                    padding: [50, 50],
                    maxZoom: 15,
                    animate: true,
                    duration: 1
                });
                this.showToast('Search Results', `Found ${matchingMarkers.length} matching images`, 'success');
            }

            // Highlight matching markers
            this.markers.forEach(marker => {
                marker.getElement().classList.remove('marker-highlight');
            });

            matchingMarkers.forEach(marker => {
                marker.getElement().classList.add('marker-highlight');

                // Remove highlight after 2 seconds
                setTimeout(() => {
                    marker.getElement().classList.remove('marker-highlight');
                }, 2000);
            });
        } else {
            this.showToast('No Matches', 'No matching images found.', 'warning');
        }
    }

    /**
     * Export location data for all images
     * @returns {Object} - GeoJSON data
     */
    exportGeoJSON() {
        const features = this.images.map(img => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [img.longitude, img.latitude]
            },
            properties: {
                name: img.name,
                timestamp: img.timestamp,
                altitude: img.altitude,
                camera: img.camera
            }
        }));

        return {
            type: 'FeatureCollection',
            features: features
        };
    }


/**
 * Initialize the map screenshot functionality
 * This method should be called from the constructor
 */
/**
 * Initialize the map screenshot functionality
 */
/**
 * Initialize the map screenshot functionality
 */
initMapScreenshot() {
    document.getElementById('downloadMap').addEventListener('click', () => {
        this.showLoading('Preparing map screenshot...');

        // Short timeout to allow loading screen to appear
        setTimeout(() => {
            this.captureMapView();
        }, 200);
    });
}


/**
 * Capture and download the current map view
 */
captureMapView() {
    try {
        // Get the map element
        const mapElement = document.getElementById('map');

        // Use html2canvas for reliable capture
        html2canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            scale: 2  // Higher resolution
        }).then(canvas => {
            // Create a timestamp for the filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `geoimage-map-${timestamp}.png`;

            // Convert canvas to blob
            canvas.toBlob(blob => {
                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = filename;
                link.href = url;

                // Trigger download
                document.body.appendChild(link);
                link.click();

                // Clean up
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                this.hideLoading();
                this.showToast('Export Complete', 'Map exported successfully', 'success');
            }, 'image/png');
        }).catch(err => {
            console.error("Canvas export error:", err);
            this.hideLoading();
            this.showToast('Export Failed', 'Could not generate map image', 'error');
        });
    } catch (error) {
        console.error('Map export error:', error);
        this.hideLoading();
        this.showToast('Export Failed', 'Error exporting map', 'error');
    }
}

/**
 * Capture using leaflet-image library
 */
captureWithLeafletImage() {
    leafletImage(this.map, (err, canvas) => {
        if (err) {
            console.error('Leaflet-image error:', err);
            this.captureWithHtml2Canvas(); // Fallback to html2canvas
            return;
        }
        this.processMapCanvas(canvas);
    });
}

/**
 * Capture using html2canvas library
 */
captureWithHtml2Canvas() {
    const mapContainer = document.getElementById('map');
    const options = {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: true,
        backgroundColor: null
    };

    html2canvas(mapContainer, options).then(canvas => {
        this.processMapCanvas(canvas);
    }).catch(err => {
        console.error('html2canvas error:', err);
        this.captureWithFallbackMethod(); // Fallback to simple method
    });
}

/**
 * Simple fallback method when libraries aren't available
 */
captureWithFallbackMethod() {
    try {
        const canvas = document.createElement('canvas');
        const mapEl = document.getElementById('map');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions
        canvas.width = mapEl.offsetWidth;
        canvas.height = mapEl.offsetHeight;

        // Draw background
        ctx.fillStyle = '#f2f2f2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add basic info
        ctx.font = '16px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText('Map Export - Basic Version', canvas.width/2, 30);

        // Get current view info
        const bounds = this.map.getBounds();
        ctx.fillText(`View: ${bounds.getSouth().toFixed(4)}°, ${bounds.getWest().toFixed(4)}° to`,
                    canvas.width/2, 60);
        ctx.fillText(`${bounds.getNorth().toFixed(4)}°, ${bounds.getEast().toFixed(4)}°`,
                    canvas.width/2, 85);

        // Draw simple markers
        this.markers.forEach(marker => {
            const pos = this.map.latLngToContainerPoint(marker.getLatLng());
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 8, 0, Math.PI*2);
            ctx.fillStyle = '#4361ee';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        this.processMapCanvas(canvas);
    } catch (error) {
        console.error('Fallback capture failed:', error);
        this.hideLoading();
        this.showToast('Export Failed', 'Could not export map', 'error');
    }
}

/**
 * Process captured canvas and initiate download
 * @param {HTMLCanvasElement} canvas
 */
processMapCanvas(canvas) {
    try {
        // Create filename
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `map-export-${timestamp}.png`;

        // Convert to blob
        canvas.toBlob((blob) => {
            if (!blob) {
                throw new Error('Canvas to blob conversion failed');
            }

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                this.hideLoading();
                this.showToast('Export Complete', 'Map exported successfully', 'success');
            }, 100);
        }, 'image/png');
    } catch (error) {
        console.error('Error processing canvas:', error);
        this.hideLoading();
        this.showToast('Export Error', 'Failed to process map image', 'error');
    }
}

/**
 * Add a subtle watermark to the exported map
 * @param {HTMLCanvasElement} canvas - The canvas to add watermark to
 */
addWatermarkToCanvas(canvas) {
    try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set watermark style
        ctx.font = '14px Inter, sans-serif';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';

        // Create watermark text
        const watermarkText = 'GeoImage Explorer • ' + new Date().toLocaleDateString();

        // Position watermark in bottom-right corner with padding
        const padding = 20;
        const metrics = ctx.measureText(watermarkText);
        const x = canvas.width - metrics.width - padding;
        const y = canvas.height - padding;

        // Draw text
        ctx.fillText(watermarkText, x, y);
    } catch (e) {
        console.warn('Could not add watermark to export:', e);
    }
}


    /**
 * Initialize mosaic analyzer functionality
 */
initMosaicAnalyzer() {
    this.mosaicAnalyzer = new MosaicAnalyzer();

    // Add event listeners for mosaic panel
    document.getElementById('analyzeMosaic').addEventListener('click', () => this.analyzeMosaic());
    document.getElementById('closeMosaicPanel').addEventListener('click', () => this.closeMosaicPanel());

    // Add these event listeners
    document.getElementById('showOverlapGroups').addEventListener('click', () => {
        const groups = this.mosaicAnalyzer.results.overlapGroups;
        this.visualizeOverlapGroups(groups);
    });

    // New button for selecting specific group
    document.getElementById('selectOverlapGroup').addEventListener('click', () => {
        this.showOverlapGroupSelector();
    });

    document.getElementById('showHeatmap').addEventListener('click', () => {
        this.visualizeHeatmap();
    });
}

/**
 * Analyze the current images for mosaic potential
 */
analyzeMosaic() {
    if (this.images.length === 0) {
        this.showToast('No Images', 'Upload some images first to analyze mosaic potential', 'warning');
        return;
    }

    this.showLoading('Analyzing mosaic potential...');

    // Prepare image data for analysis
    const imageData = this.images.map(img => ({
        name: img.name,
        latitude: img.latitude,
        longitude: img.longitude
    }));

    // Run analysis
    setTimeout(() => {
        try {
            const results = this.mosaicAnalyzer.loadImages(imageData).analyze();
            this.displayMosaicResults(results);
            this.showMosaicPanel();
        } catch (error) {
            console.error('Mosaic analysis error:', error);
            this.showToast('Analysis Error', 'Failed to analyze mosaic potential', 'error');
        } finally {
            this.hideLoading();
        }
    }, 100); // Small delay to allow loading indicator to show
}

/**
 * Display mosaic analysis results in the panel
 * @param {Object} results - Analysis results from MosaicAnalyzer
 */
displayMosaicResults(results) {
    // Update basic metrics
    document.getElementById('suitabilityScore').textContent = results.suitability;
    document.getElementById('mosaicRecommendation').textContent = results.recommendation;
    document.getElementById('totalImagesValue').textContent = results.totalImages;
    document.getElementById('overlapGroupsValue').textContent = results.overlapGroups.length;

    // Update coverage and density
    document.getElementById('coverageValue').textContent = results.coverageArea.toFixed(2) + ' km²';
    document.getElementById('densityValue').textContent = results.averageDensity.toFixed(1);

    // Update optimal settings
    const zoomInfo = this.mosaicAnalyzer.getOptimalZoomLevel();
    document.getElementById('optimalZoomValue').textContent = zoomInfo.zoom;
    document.getElementById('estimatedSizeValue').textContent = zoomInfo.pixelCoverage;

    // Update best region if available
    if (results.overlapGroups.length > 0) {
        const bestGroup = results.overlapGroups[0];
        document.getElementById('bestRegionValue').textContent =
            `${bestGroup.center[0].toFixed(6)}, ${bestGroup.center[1].toFixed(6)}`;
        document.getElementById('overlapCoverageValue').textContent =
            `${Math.round((bestGroup.count / results.totalImages) * 100)}%`;
    }

    // Add event listeners for visualization buttons
    document.getElementById('showOverlapGroups').addEventListener('click', () => {
        this.visualizeOverlapGroups(results.overlapGroups);
    });

    document.getElementById('showHeatmap').addEventListener('click', () => {
        this.visualizeHeatmap();
    });
}

/**
 * Show the mosaic analysis panel
 */
showMosaicPanel() {
    const panel = document.getElementById('mosaicPanel');
    panel.classList.remove('hidden');
    setTimeout(() => {
        panel.classList.add('visible');
    }, 10);
}

/**
 * Close the mosaic analysis panel
 */
closeMosaicPanel() {
    const panel = document.getElementById('mosaicPanel');
    panel.classList.remove('visible');
    setTimeout(() => {
        panel.classList.add('hidden');
    }, 300);
}

/**
 * Visualize overlap groups on the map
 * @param {Array} groups - Array of overlap groups
 */
visualizeOverlapGroups(groups) {
    // Clear any existing group visualizations
    this.clearOverlapVisualizations();

    // Create a feature group for all visualizations
    this.overlapGroup = L.featureGroup().addTo(this.map);

    // Add a polygon for each group's bounding box
    groups.forEach((group, index) => {
        if (group.count > 1) { // Only show groups with multiple images
            const bounds = [
                [group.boundingBox.southwest[0], group.boundingBox.southwest[1]],
                [group.boundingBox.northeast[0], group.boundingBox.northeast[1]]
            ];

            const color = this.getColorForIndex(index);

            const rect = L.rectangle(bounds, {
                color: color,
                fillColor: color,
                fillOpacity: 0.2,
                weight: 2
            }).addTo(this.overlapGroup);

            // Add a label with the group size
            const center = group.center;
            const label = L.marker(center, {
                icon: L.divIcon({
                    className: 'overlap-group-label',
                    html: `<div>${group.count} images</div>`,
                    iconSize: [60, 30]
                })
            }).addTo(this.overlapGroup);
        }
    });

    // Fit the map to show all groups
    this.map.fitBounds(this.overlapGroup.getBounds(), {
        padding: [50, 50],
        maxZoom: 15
    });

    this.showToast('Overlap Groups', `Visualizing ${groups.length} overlap groups`, 'success');
}

/**
 * Visualize image density as a heatmap
 */
/**
 * Visualize image density as a heatmap
 */
visualizeHeatmap() {
    // Clear any existing visualizations
    this.clearOverlapVisualizations();
    this.clearHeatmap();

    // Get heatmap data from analyzer
    const heatmapData = this.mosaicAnalyzer.getHeatmapData();

    // Create heatmap layer - check if L.heatLayer exists
    if (typeof L.heatLayer === 'undefined') {
        // Fallback if heatmap plugin not loaded
        this.showToast('Plugin Missing', 'Heatmap plugin not loaded. Please add Leaflet Heat plugin.', 'error');

        // Create a manual visualization using circles instead
        this.heatmapLayer = L.featureGroup().addTo(this.map);

        heatmapData.forEach(point => {
            L.circle([point[0], point[1]], {
                radius: 50,
                color: '#f72585',
                fillColor: '#f72585',
                fillOpacity: 0.4,
                weight: 1
            }).addTo(this.heatmapLayer);
        });
    } else {
        // Use proper heatmap plugin
        this.heatmapLayer = L.heatLayer(heatmapData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
        }).addTo(this.map);
    }

    this.showToast('Density Heatmap', 'Showing image density visualization', 'success');
}

/**
 * Enhanced method to show overlap group selection dialog
 */
showOverlapGroupSelector() {
    // Clear any existing visualizations first
    this.clearOverlapVisualizations();
    this.clearHeatmap();

    const groups = this.mosaicAnalyzer.results.overlapGroups;

    if (!groups || groups.length === 0) {
        this.showToast('No Groups', 'No overlap groups found in current data', 'warning');
        return;
    }

    // Create a modal dialog for group selection
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content group-selector">
            <div class="modal-header">
                <h3>Select Overlap Group</h3>
                <button class="close-button" id="closeGroupSelector">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="group-list">
                    ${groups.map((group, index) => `
                        <div class="group-item" data-index="${index}">
                            <div class="group-color" style="background-color: ${this.getColorForIndex(index)}"></div>
                            <div class="group-info">
                                <div class="group-title">Group ${index + 1}</div>
                                <div class="group-stats">${group.count} images</div>
                            </div>
                            <button class="button secondary view-group-btn" data-index="${index}">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="selector-actions">
                    <button id="showAllGroups" class="button secondary">Show All Groups</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('#closeGroupSelector').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.querySelector('#showAllGroups').addEventListener('click', () => {
        document.body.removeChild(modal);
        this.visualizeOverlapGroups(groups);
    });

    modal.querySelectorAll('.view-group-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.view-group-btn').dataset.index);
            document.body.removeChild(modal);
            this.visualizeSpecificGroup(groups[index], index);
        });
    });
}

/**
 * Visualize a specific overlap group and show its images
 * @param {Object} group - The overlap group to visualize
 * @param {Number} index - The index of the group
 */
/**
 * Visualize a specific overlap group and show its images
 * @param {Object} group - The overlap group to visualize
 * @param {Number} index - The index of the group
 */
visualizeSpecificGroup(group, index) {
    // Show loading indicator
    this.showLoading(`Loading group ${index + 1} with ${group.count} images...`);

    // Clear any existing visualizations
    this.clearOverlapVisualizations();
    this.clearHeatmap();

    // Use setTimeout to allow the loading indicator to appear
    // and to prevent UI freezing during heavy operations
    setTimeout(() => {
        try {
            // Create a feature group for the visualization
            this.overlapGroup = L.featureGroup().addTo(this.map);

            const color = this.getColorForIndex(index);

            // Add a polygon for the group's bounding box
            const bounds = [
                [group.boundingBox.southwest[0], group.boundingBox.southwest[1]],
                [group.boundingBox.northeast[0], group.boundingBox.northeast[1]]
            ];

            const rect = L.rectangle(bounds, {
                color: color,
                fillColor: color,
                fillOpacity: 0.2,
                weight: 2
            }).addTo(this.overlapGroup);

            // Add markers for each image in the group
            group.images.forEach(img => {
                // Find the original image data
                const originalImage = this.images.find(image =>
                    image.name === img.name &&
                    image.latitude === img.coordinates[0] &&
                    image.longitude === img.coordinates[1]
                );

                if (originalImage) {
                    // Create a highlighted marker
                    const highlightIcon = L.divIcon({
                        className: 'custom-map-marker group-highlight',
                        html: `<div class="marker-icon" style="background-image: url(${originalImage.dataUrl}); border-color: ${color};"><div class="marker-pulse" style="background: rgba(${this.hexToRgb(color)}, 0.4);"></div></div>`,
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    });

                    const marker = L.marker([img.coordinates[0], img.coordinates[1]], {
                        icon: highlightIcon,
                        title: img.name
                    }).addTo(this.overlapGroup);

                    marker.on('click', () => {
                        this.showImagePreview(originalImage);
                    });
                }
            });

            // Fit the map to the group bounds
            this.map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 15
            });

            // Show group details panel
            this.showGroupDetailsPanel(group, index);

            this.showToast('Group Visualization', `Showing overlap group ${index + 1} with ${group.count} images`, 'success');
        } catch (error) {
            console.error('Error visualizing group:', error);
            this.showToast('Error', 'Failed to visualize the selected group', 'error');
        } finally {
            // Hide loading indicator
            this.hideLoading();
        }
    }, 100);
}

/**
 * Show a panel with group details and image list
 * @param {Object} group - The overlap group
 * @param {Number} index - The index of the group
 */
showGroupDetailsPanel(group, index) {
    // Remove any existing panel first
    const existingPanel = document.getElementById('groupDetailsPanel');
    if (existingPanel) {
        document.body.removeChild(existingPanel);
    }

    // Create panel element
    const panel = document.createElement('div');
    panel.id = 'groupDetailsPanel';
    panel.className = 'details-panel';

    const color = this.getColorForIndex(index);

    // Format coordinates for center point
    const centerLat = group.center[0].toFixed(6);
    const centerLon = group.center[1].toFixed(6);

    panel.innerHTML = `
        <div class="panel-header" style="border-color: ${color}">
            <h3><i class="fas fa-object-group"></i> Group ${index + 1} Details</h3>
            <button id="closeGroupDetails" class="close-button">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="panel-content">
            <div class="group-stats-container">
                <div class="group-stat">
                    <div class="stat-label">Images</div>
                    <div class="stat-value">${group.count}</div>
                </div>
                <div class="group-stat">
                    <div class="stat-label">Center</div>
                    <div class="stat-value">${centerLat}, ${centerLon}</div>
                </div>
                <div class="group-stat">
                    <div class="stat-label">Area</div>
                    <div class="stat-value">${(group.boundingBox.area * 12321).toFixed(2)} km²</div>
                </div>
            </div>

            <h4>Images in Group (${group.count})</h4>

            <div class="group-image-list">
                ${group.images.map(img => {
                    // Find original image with full data
                    const originalImage = this.images.find(image =>
                        image.name === img.name &&
                        image.latitude === img.coordinates[0] &&
                        image.longitude === img.coordinates[1]
                    );

                    if (originalImage) {
                        return `
                            <div class="group-image-item" data-name="${originalImage.name}">
                                <div class="item-thumbnail" style="background-image: url(${originalImage.dataUrl})"></div>
                                <div class="item-info">
                                    <div class="item-name">${originalImage.name}</div>
                                    <div class="item-coords">${originalImage.coordinates}</div>
                                </div>
                            </div>
                        `;
                    } else {
                        return `
                            <div class="group-image-item">
                                <div class="item-thumbnail missing"></div>
                                <div class="item-info">
                                    <div class="item-name">${img.name}</div>
                                    <div class="item-coords">${img.coordinates.join(', ')}</div>
                                </div>
                            </div>
                        `;
                    }
                }).join('')}
            </div>

            <div class="panel-actions">
                <button id="exportGroupData" class="button secondary">
                    <i class="fas fa-download"></i> Export Group Data
                </button>
                <button id="createMosaicFromGroup" class="button primary">
                    <i class="fas fa-th"></i> Create Mosaic
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    document.getElementById('closeGroupDetails').addEventListener('click', () => {
        document.body.removeChild(panel);
    });

    document.getElementById('exportGroupData').addEventListener('click', () => {
        this.exportGroupData(group, index);
    });

    document.getElementById('createMosaicFromGroup').addEventListener('click', () => {
        this.showToast('Coming Soon', 'Mosaic creation feature coming soon!', 'info');
    });

    // Add click listeners to image items
    panel.querySelectorAll('.group-image-item').forEach(item => {
        item.addEventListener('click', () => {
            const imageName = item.dataset.name;
            const image = this.images.find(img => img.name === imageName);
            if (image) {
                this.showImagePreview(image);
            }
        });
    });

    // Add animation
    setTimeout(() => {
        panel.classList.add('visible');
    }, 10);
}

/**
 * Export data for a specific group
 * @param {Object} group - The overlap group
 * @param {Number} index - Group index
 */
exportGroupData(group, index) {
    // Convert group data to GeoJSON
    const features = group.images.map(img => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [img.coordinates[1], img.coordinates[0]]  // GeoJSON is [lon, lat]
        },
        properties: {
            name: img.name,
            group: index + 1
        }
    }));

    // Add the bounding box as a polygon
    features.push({
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [group.boundingBox.southwest[1], group.boundingBox.southwest[0]],
                [group.boundingBox.northeast[1], group.boundingBox.southwest[0]],
                [group.boundingBox.northeast[1], group.boundingBox.northeast[0]],
                [group.boundingBox.southwest[1], group.boundingBox.northeast[0]],
                [group.boundingBox.southwest[1], group.boundingBox.southwest[0]]
            ]]
        },
        properties: {
            name: `Group ${index + 1} Boundary`,
            imageCount: group.count
        }
    });

    const geoJson = {
        type: 'FeatureCollection',
        features: features
    };

    // Create downloadable file
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geoJson, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `mosaic-group-${index + 1}.geojson`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    this.showToast('Export Complete', `Group ${index + 1} data exported as GeoJSON`, 'success');
}

/**
 * Helper method to convert hex color to RGB
 * @param {String} hex - Hex color string
 * @returns {String} RGB values as "r,g,b"
 */
hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Convert 3-digit hex to 6-digits
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `${r},${g},${b}`;
}

/**
 * Clear overlap group visualizations
 */
clearOverlapVisualizations() {
    if (this.overlapGroup) {
        this.map.removeLayer(this.overlapGroup);
        this.overlapGroup = null;
    }
}

/**
 * Clear heatmap visualization
 */
clearHeatmap() {
    if (this.heatmapLayer) {
        this.map.removeLayer(this.heatmapLayer);
        this.heatmapLayer = null;
    }
}

/**
 * Get a distinct color for visualization based on index
 * @param {Number} index - Index of the group
 * @returns {String} CSS color string
 */
getColorForIndex(index) {
    const colors = [
        '#4361ee', '#3a0ca3', '#7209b7', '#f72585',
        '#4cc9f0', '#4895ef', '#560bad', '#b5179e'
    ];
    return colors[index % colors.length];
}


}

// Initialize the explorer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the viewer
    const geoImageExplorer = new GeoImageExplorer();

    // Make it globally available
    window.geoImageExplorer = geoImageExplorer;

    // Add CSS rule for marker animations
    const style = document.createElement('style');
    style.textContent = `
        .custom-map-marker {
            transition: all 0.3s ease;
        }

        .marker-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-size: cover;
            background-position: center;
            border: 3px solid var(--primary-color);
            box-shadow: 0 0 0 2px rgba(255,255,255,0.5);
            transform: scale(0.5);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .marker-added .marker-icon {
            transform: scale(1);
            opacity: 1;
        }

        .marker-highlight .marker-icon {
            transform: scale(1.2);
            border-color: var(--accent-color);
            box-shadow: 0 0 0 4px rgba(76, 201, 240, 0.6);
        }

        .marker-pulse {
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(67, 97, 238, 0.4);
            opacity: 0;
            transform: scale(1);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% {
                transform: scale(1);
                opacity: 0.6;
            }
            70% {
                transform: scale(2);
                opacity: 0;
            }
            100% {
                transform: scale(1);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});