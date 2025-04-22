/**
 * MosaicAnalyzer.js
 * A module to analyze geotagged images and determine suitability for creating mosaic maps
 */
class MosaicAnalyzer {
    constructor() {
        this.images = [];
        this.overlapThreshold = 0.0002; // ~22 meters at the equator
        this.densityThresholds = {
            low: 10,      // Images per sq km
            medium: 30,   // Images per sq km
            high: 100     // Images per sq km
        };
        this.results = {
            totalImages: 0,
            overlapGroups: [],
            coverageArea: 0,
            averageDensity: 0,
            suitability: 0,
            recommendation: '',
            detailedAnalysis: {}
        };
    }

    /**
     * Load images data for analysis
     * @param {Array} images - Array of image objects with latitude and longitude
     */
    loadImages(images) {
        this.images = images;
        this.results.totalImages = images.length;
        return this;
    }

    /**
     * Run full analysis on the loaded images
     * @returns {Object} Analysis results
     */
    analyze() {
        if (this.images.length === 0) {
            return {
                error: 'No images to analyze',
                suitability: 0,
                recommendation: 'Upload geotagged images to analyze mosaic potential'
            };
        }

        this._findOverlapGroups();
        this._calculateCoverageArea();
        this._calculateAverageDensity();
        this._evaluateSuitability();
        this._generateRecommendation();

        return this.results;
    }

    /**
     * Find groups of overlapping images
     * @private
     */
    _findOverlapGroups() {
        // Create a mapping of images to their groups
        const imageGroups = new Map();
        const groups = [];

        // First pass - group images that overlap
        for (let i = 0; i < this.images.length; i++) {
            const img1 = this.images[i];
            let foundGroup = false;

            // Check if this image overlaps with any existing groups
            for (let j = 0; j < groups.length; j++) {
                const group = groups[j];
                for (const groupImg of group) {
                    if (this._imagesOverlap(img1, groupImg)) {
                        group.push(img1);
                        imageGroups.set(img1, j);
                        foundGroup = true;
                        break;
                    }
                }
                if (foundGroup) break;
            }

            // If no overlap with existing groups, create a new group
            if (!foundGroup) {
                const newGroupIndex = groups.length;
                groups.push([img1]);
                imageGroups.set(img1, newGroupIndex);
            }
        }

        // Second pass - merge groups that have common images
        let mergeOccurred;
        do {
            mergeOccurred = false;
            for (let i = 0; i < groups.length; i++) {
                if (!groups[i].length) continue;

                for (let j = i + 1; j < groups.length; j++) {
                    if (!groups[j].length) continue;

                    let shouldMerge = false;

                    // Check if any image in group i overlaps with any image in group j
                    for (const imgI of groups[i]) {
                        for (const imgJ of groups[j]) {
                            if (this._imagesOverlap(imgI, imgJ)) {
                                shouldMerge = true;
                                break;
                            }
                        }
                        if (shouldMerge) break;
                    }

                    if (shouldMerge) {
                        // Merge group j into group i
                        for (const img of groups[j]) {
                            groups[i].push(img);
                            imageGroups.set(img, i);
                        }
                        groups[j] = []; // Empty the merged group
                        mergeOccurred = true;
                    }
                }
            }
        } while (mergeOccurred);

        // Filter out empty groups and format the results
        this.results.overlapGroups = groups
            .filter(group => group.length > 0)
            .map(group => ({
                count: group.length,
                images: group.map(img => ({
                    name: img.name,
                    coordinates: [img.latitude, img.longitude]
                })),
                center: this._calculateGroupCenter(group),
                boundingBox: this._calculateGroupBoundingBox(group)
            }));

        // Sort groups by size (largest first)
        this.results.overlapGroups.sort((a, b) => b.count - a.count);

        // Calculate detailed statistics
        this.results.detailedAnalysis.groupStats = {
            totalGroups: this.results.overlapGroups.length,
            largestGroup: this.results.overlapGroups.length > 0 ?
                this.results.overlapGroups[0].count : 0,
            averageGroupSize: this.results.overlapGroups.length > 0 ?
                this.results.overlapGroups.reduce((sum, group) => sum + group.count, 0) /
                this.results.overlapGroups.length : 0,
            singleImageGroups: this.results.overlapGroups.filter(group => group.count === 1).length
        };
    }

    /**
     * Check if two images overlap based on geographic distance
     * @param {Object} img1 - First image with lat/long
     * @param {Object} img2 - Second image with lat/long
     * @returns {Boolean} Whether the images overlap
     * @private
     */
    _imagesOverlap(img1, img2) {
        // Calculate distance between two points using the Haversine formula
        const distance = this._calculateDistance(
            img1.latitude, img1.longitude,
            img2.latitude, img2.longitude
        );

        // Consider images overlapping if they're within threshold distance
        return distance <= this.overlapThreshold;
    }

    /**
     * Calculate distance between two points using the Haversine formula
     * @param {Number} lat1 - Latitude of first point
     * @param {Number} lon1 - Longitude of first point
     * @param {Number} lat2 - Latitude of second point
     * @param {Number} lon2 - Longitude of second point
     * @returns {Number} Distance in degrees (can be converted to km)
     * @private
     */
    _calculateDistance(lat1, lon1, lat2, lon2) {
        return Math.sqrt(
            Math.pow(lat2 - lat1, 2) +
            Math.pow(lon2 - lon1, 2)
        );
    }

    /**
     * Calculate the center point of a group of images
     * @param {Array} group - Array of image objects
     * @returns {Array} [latitude, longitude] of the center
     * @private
     */
    _calculateGroupCenter(group) {
        const sumLat = group.reduce((sum, img) => sum + img.latitude, 0);
        const sumLon = group.reduce((sum, img) => sum + img.longitude, 0);

        return [
            sumLat / group.length,
            sumLon / group.length
        ];
    }

    /**
     * Calculate the bounding box of a group of images
     * @param {Array} group - Array of image objects
     * @returns {Object} Bounding box with min/max lat/lon
     * @private
     */
    _calculateGroupBoundingBox(group) {
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        for (const img of group) {
            minLat = Math.min(minLat, img.latitude);
            maxLat = Math.max(maxLat, img.latitude);
            minLon = Math.min(minLon, img.longitude);
            maxLon = Math.max(maxLon, img.longitude);
        }

        return {
            southwest: [minLat, minLon],
            northeast: [maxLat, maxLon],
            width: maxLon - minLon,
            height: maxLat - minLat,
            area: (maxLat - minLat) * (maxLon - minLon)
        };
    }

    /**
     * Calculate the total coverage area of all images
     * @private
     */
    _calculateCoverageArea() {
        if (this.images.length === 0) {
            this.results.coverageArea = 0;
            return;
        }

        // Find overall bounding box
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        this.images.forEach(img => {
            minLat = Math.min(minLat, img.latitude);
            maxLat = Math.max(maxLat, img.latitude);
            minLon = Math.min(minLon, img.longitude);
            maxLon = Math.max(maxLon, img.longitude);
        });

        // Calculate approximate area in square kilometers
        // using the haversine formula
        const latDist = this._haversineDistance(minLat, minLon, maxLat, minLon);
        const lonDist = this._haversineDistance(minLat, minLon, minLat, maxLon);

        this.results.coverageArea = latDist * lonDist;

        // Store bounding box for reference
        this.results.detailedAnalysis.boundingBox = {
            southwest: [minLat, minLon],
            northeast: [maxLat, maxLon],
            widthKm: lonDist,
            heightKm: latDist,
            areaKm2: this.results.coverageArea
        };
    }

    /**
     * Calculate the haversine distance between two points in kilometers
     * @param {Number} lat1 - Latitude of first point
     * @param {Number} lon1 - Longitude of first point
     * @param {Number} lat2 - Latitude of second point
     * @param {Number} lon2 - Longitude of second point
     * @returns {Number} Distance in kilometers
     * @private
     */
    _haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this._toRadians(lat2 - lat1);
        const dLon = this._toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this._toRadians(lat1)) * Math.cos(this._toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {Number} degrees - Angle in degrees
     * @returns {Number} Angle in radians
     * @private
     */
    _toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Calculate the average density of images per square kilometer
     * @private
     */
    _calculateAverageDensity() {
        if (this.results.coverageArea <= 0) {
            this.results.averageDensity = 0;
            return;
        }

        this.results.averageDensity = this.images.length / this.results.coverageArea;

        // Determine density category
        let densityCategory;
        if (this.results.averageDensity < this.densityThresholds.low) {
            densityCategory = 'low';
        } else if (this.results.averageDensity < this.densityThresholds.medium) {
            densityCategory = 'medium';
        } else if (this.results.averageDensity < this.densityThresholds.high) {
            densityCategory = 'high';
        } else {
            densityCategory = 'very high';
        }

        this.results.detailedAnalysis.density = {
            imagesPerKm2: this.results.averageDensity,
            category: densityCategory
        };
    }

    /**
     * Evaluate overall suitability for creating a mosaic map
     * @private
     */
    _evaluateSuitability() {
        // Base score out of 100
        let score = 0;

        // Factor 1: Number of images (max 20 points)
        const imageCount = Math.min(this.images.length, 100);
        score += (imageCount / 100) * 20;

        // Factor 2: Overlap percentage (max 40 points)
        let overlapScore = 0;
        if (this.results.overlapGroups.length > 0) {
            // Calculate how many images are in groups with more than 1 image
            const overlappingImages = this.results.overlapGroups
                .filter(group => group.count > 1)
                .reduce((sum, group) => sum + group.count, 0);

            const overlapPercentage = overlappingImages / this.images.length;
            overlapScore = overlapPercentage * 40;
        }
        score += overlapScore;

        // Factor 3: Density (max 30 points)
        let densityScore = 0;
        if (this.results.averageDensity > 0) {
            if (this.results.averageDensity >= this.densityThresholds.high) {
                densityScore = 30;
            } else if (this.results.averageDensity >= this.densityThresholds.medium) {
                densityScore = 25;
            } else if (this.results.averageDensity >= this.densityThresholds.low) {
                densityScore = 15;
            } else {
                densityScore = 5;
            }
        }
        score += densityScore;

        // Factor 4: Distribution (max 10 points)
        // Based on how evenly spread the images are
        let distributionScore = 0;
        if (this.results.overlapGroups.length > 0) {
            const largestGroupSize = this.results.overlapGroups[0].count;
            const largestGroupPercentage = largestGroupSize / this.images.length;

            // A more even distribution (lower percentage in the largest group) scores higher
            distributionScore = 10 * (1 - Math.min(largestGroupPercentage, 0.9));
        }
        score += distributionScore;

        // Round to nearest integer
        this.results.suitability = Math.round(score);

        // Store component scores for detailed analysis
        this.results.detailedAnalysis.scoreComponents = {
            imageCount: Math.round((imageCount / 100) * 20),
            overlap: Math.round(overlapScore),
            density: densityScore,
            distribution: Math.round(distributionScore),
            total: this.results.suitability
        };
    }

    /**
     * Generate recommendation based on analysis
     * @private
     */
    _generateRecommendation() {
        const suitability = this.results.suitability;

        if (this.images.length === 0) {
            this.results.recommendation = 'Upload geotagged images to analyze mosaic potential.';
            return;
        }

        if (this.images.length < 5) {
            this.results.recommendation = 'More images needed: For a good mosaic map, try to collect at least 10-20 geotagged images covering your area of interest.';
            return;
        }

        if (suitability >= 80) {
            this.results.recommendation = 'Excellent mosaic potential! Your images have good overlap and density for creating a high-quality mosaic map. We recommend proceeding with mosaic creation.';
        } else if (suitability >= 60) {
            this.results.recommendation = 'Good mosaic potential. Your images can create a reasonable mosaic map, though there may be some gaps or lower-quality areas. For best results, try adding more images in sparse areas.';
        } else if (suitability >= 40) {
            this.results.recommendation = 'Fair mosaic potential. While a mosaic can be created, expect significant gaps or quality issues. Consider collecting more images with better overlap between them.';
        } else {
            this.results.recommendation = 'Limited mosaic potential. Your current image set is not ideal for creating a cohesive mosaic map. The images may be too spread out or have insufficient overlap. Try collecting more images in a more concentrated area.';
        }

        // Add specific advice based on detailed analysis
        const analysis = this.results.detailedAnalysis;

        if (analysis.density.category === 'low') {
            this.results.recommendation += ' The image density is low; try collecting more images within the same area.';
        }

        if (analysis.groupStats.singleImageGroups > analysis.groupStats.totalGroups * 0.7) {
            this.results.recommendation += ' Many of your images lack overlap with others, which may result in a patchy mosaic. Try capturing images with more overlap between them.';
        }

        // Add suggestion for the best area to focus on
        if (this.results.overlapGroups.length > 0 && this.results.overlapGroups[0].count >= 5) {
            const bestGroup = this.results.overlapGroups[0];
            const centerLat = bestGroup.center[0].toFixed(6);
            const centerLon = bestGroup.center[1].toFixed(6);

            this.results.recommendation += ` Your best mosaic area is centered around ${centerLat}, ${centerLon} with ${bestGroup.count} overlapping images.`;
        }
    }

    /**
     * Get visual representation of image overlap as a heatmap configuration
     * @returns {Array} Array of points for heatmap visualization
     */
    getHeatmapData() {
        // Generate heatmap points based on image density
        return this.images.map(img => {
            return [img.latitude, img.longitude, 1]; // lat, lng, intensity
        });
    }

    /**
     * Get optimal zoom level for creating a mosaic based on image coverage
     * @returns {Object} Optimal zoom level and coverage estimate
     */
    getOptimalZoomLevel() {
        if (this.results.detailedAnalysis.boundingBox) {
            const bb = this.results.detailedAnalysis.boundingBox;
            // Estimate optimal zoom based on coverage area
            let zoom = 15; // Default zoom

            if (bb.areaKm2 > 100) {
                zoom = 12;
            } else if (bb.areaKm2 > 10) {
                zoom = 13;
            } else if (bb.areaKm2 > 1) {
                zoom = 14;
            } else if (bb.areaKm2 > 0.1) {
                zoom = 15;
            } else {
                zoom = 16;
            }

            return {
                zoom: zoom,
                pixelCoverage: this._estimatePixelCoverage(zoom)
            };
        }

        return {
            zoom: 15,
            pixelCoverage: '—'
        };
    }

    /**
     * Estimate pixel coverage at a given zoom level
     * @param {Number} zoom - The zoom level
     * @returns {String} Estimated pixel coverage
     * @private
     */
    _estimatePixelCoverage(zoom) {
        // At zoom level 0, the entire world is 256x256 pixels
        // Each zoom level doubles the dimensions
        const pixelsPerTile = 256;
        const worldPixelWidth = pixelsPerTile * Math.pow(2, zoom);
        const worldPixelHeight = pixelsPerTile * Math.pow(2, zoom);

        // Convert degrees to pixels
        const bb = this.results.detailedAnalysis.boundingBox;
        if (!bb) return '—';

        const latRadians = this._toRadians((bb.northeast[0] + bb.southwest[0]) / 2);
        const pixelsPerLonDegree = worldPixelWidth / 360;
        const pixelsPerLatDegree = worldPixelHeight / 180;

        // Adjust for latitude (Mercator projection distortion)
        const pixelsPerLonRadian = worldPixelWidth / (2 * Math.PI);
        const pixelsPerLatRadian = worldPixelHeight / Math.PI;

        const latAdjustedPixels = pixelsPerLatDegree * (1 / Math.cos(latRadians));

        const widthPixels = bb.width * pixelsPerLonDegree;
        const heightPixels = bb.height * latAdjustedPixels;

        if (widthPixels > 10000 || heightPixels > 10000) {
            return `~${Math.round(widthPixels / 1000)}K × ${Math.round(heightPixels / 1000)}K pixels`;
        } else {
            return `~${Math.round(widthPixels)} × ${Math.round(heightPixels)} pixels`;
        }
    }
}

// Export the analyzer for use in the main application
window.MosaicAnalyzer = MosaicAnalyzer;
