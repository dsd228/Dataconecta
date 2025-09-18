// Sustainability and Eco-Friendly Features Monitor

class SustainabilityManager {
    constructor() {
        this.metrics = {
            energyEfficiency: 0,
            dataTransfer: 0,
            cacheHitRate: 0,
            resourceOptimization: 0,
            carbonFootprint: 0,
            greenHosting: false
        };
        this.thresholds = {
            highEnergyUsage: 1000, // milliseconds of CPU-intensive operations
            highDataTransfer: 1048576, // 1MB
            lowCacheHitRate: 0.7 // 70%
        };
        this.optimizations = [];
        this.init();
    }

    init() {
        this.startEnergyMonitoring();
        this.trackDataUsage();
        this.optimizeResources();
        this.implementCaching();
        this.createSustainabilityIndicator();
        this.scheduleReporting();
    }

    startEnergyMonitoring() {
        // Monitor CPU-intensive operations
        const originalSetInterval = window.setInterval;
        const originalSetTimeout = window.setTimeout;
        const originalRequestAnimationFrame = window.requestAnimationFrame;

        let cpuTime = 0;
        const startTime = performance.now();

        // Override timing functions to track usage
        window.setInterval = (callback, delay) => {
            return originalSetInterval(() => {
                const start = performance.now();
                callback();
                cpuTime += performance.now() - start;
                this.metrics.energyEfficiency = cpuTime;
            }, delay);
        };

        window.setTimeout = (callback, delay) => {
            return originalSetTimeout(() => {
                const start = performance.now();
                callback();
                cpuTime += performance.now() - start;
                this.metrics.energyEfficiency = cpuTime;
            }, delay);
        };

        window.requestAnimationFrame = (callback) => {
            return originalRequestAnimationFrame((timestamp) => {
                const start = performance.now();
                callback(timestamp);
                cpuTime += performance.now() - start;
                this.metrics.energyEfficiency = cpuTime;
            });
        };

        // Monitor page visibility to reduce background activity
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.reduceBackgroundActivity();
            } else {
                this.resumeNormalActivity();
            }
        });
    }

    trackDataUsage() {
        // Monitor network requests
        if ('PerformanceObserver' in window) {
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'resource') {
                            this.metrics.dataTransfer += entry.transferSize || 0;
                            this.evaluateResourceEfficiency(entry);
                        }
                    }
                    this.updateSustainabilityScoreMethod();
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
            } catch (e) {
                console.warn('Resource monitoring not available');
            }
        }

        // Override fetch to monitor API calls
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const start = performance.now();
            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - start;
                
                // Estimate data transfer
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    this.metrics.dataTransfer += parseInt(contentLength);
                }
                
                this.logNetworkRequest(args[0], duration, response.status);
                return response;
            } catch (error) {
                this.logNetworkRequest(args[0], performance.now() - start, 'error');
                throw error;
            }
        };
    }

    evaluateResourceEfficiency(entry) {
        const efficiency = {
            name: entry.name,
            size: entry.transferSize,
            duration: entry.duration,
            cached: entry.transferSize === 0,
            optimized: false
        };

        // Check if resource is optimized
        if (entry.name.includes('.webp') || entry.name.includes('.avif')) {
            efficiency.optimized = true;
        }

        if (entry.name.includes('.min.') || entry.name.includes('compressed')) {
            efficiency.optimized = true;
        }

        // Flag inefficient resources
        if (entry.transferSize > 1048576 && !efficiency.optimized) { // > 1MB
            this.optimizations.push({
                type: 'large_resource',
                resource: entry.name,
                size: entry.transferSize,
                suggestion: 'Consider compressing or optimizing this resource'
            });
        }

        return efficiency;
    }

    optimizeResources() {
        // Lazy load images
        this.implementLazyLoading();
        
        // Optimize animations based on battery status
        this.optimizeAnimations();
        
        // Reduce polling frequency when on battery
        this.adaptToNetworkConditions();
        
        // Implement efficient caching strategies
        this.optimizeCaching();
    }

    implementLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            });

            // Convert existing images to lazy loading
            const images = document.querySelectorAll('img[src]');
            images.forEach(img => {
                if (!img.closest('.hero-section')) { // Don't lazy load hero images
                    img.dataset.src = img.src;
                    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                    imageObserver.observe(img);
                }
            });
        }
    }

    optimizeAnimations() {
        // Reduce animations when battery is low
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                const updateAnimations = () => {
                    if (battery.level < 0.2 || !battery.charging) {
                        document.body.classList.add('low-power-mode');
                        this.optimizations.push({
                            type: 'power_saving',
                            action: 'Reduced animations due to low battery',
                            batterLevel: battery.level
                        });
                    } else {
                        document.body.classList.remove('low-power-mode');
                    }
                };

                updateAnimations();
                battery.addEventListener('levelchange', updateAnimations);
                battery.addEventListener('chargingchange', updateAnimations);
            });
        }
    }

    adaptToNetworkConditions() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            const optimizeForConnection = () => {
                if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                    // Reduce update frequency
                    this.reducePollingFrequency();
                    this.optimizations.push({
                        type: 'network_optimization',
                        action: 'Reduced polling frequency for slow connection',
                        effectiveType: connection.effectiveType
                    });
                }

                if (connection.saveData) {
                    // Enable data saver mode
                    this.enableDataSaverMode();
                    this.optimizations.push({
                        type: 'data_saver',
                        action: 'Enabled data saver mode',
                        saveData: true
                    });
                }
            };

            optimizeForConnection();
            connection.addEventListener('change', optimizeForConnection);
        }
    }

    implementCaching() {
        // Implement intelligent caching
        const cache = new Map();
        const maxCacheSize = 50;
        let cacheHits = 0;
        let cacheRequests = 0;

        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            cacheRequests++;
            
            // Only cache GET requests
            if (!options.method || options.method === 'GET') {
                const cacheKey = url.toString();
                
                if (cache.has(cacheKey)) {
                    cacheHits++;
                    this.metrics.cacheHitRate = cacheHits / cacheRequests;
                    return Promise.resolve(cache.get(cacheKey).clone());
                }
            }

            const response = await originalFetch(url, options);
            
            // Cache successful GET responses
            if (response.ok && (!options.method || options.method === 'GET')) {
                if (cache.size >= maxCacheSize) {
                    // Remove oldest entry
                    const firstKey = cache.keys().next().value;
                    cache.delete(firstKey);
                }
                cache.set(url.toString(), response.clone());
            }

            this.metrics.cacheHitRate = cacheHits / cacheRequests;
            return response;
        };
    }

    reduceBackgroundActivity() {
        // Pause non-essential animations and timers
        document.body.classList.add('background-mode');
        
        // Reduce chatbot polling
        if (window.dataconectaChatbot) {
            window.dataconectaChatbot.pauseActivity?.();
        }
        
        // Reduce performance monitoring frequency
        if (window.performanceMonitor) {
            window.performanceMonitor.reduceFrequency?.();
        }
    }

    resumeNormalActivity() {
        document.body.classList.remove('background-mode');
        
        if (window.dataconectaChatbot) {
            window.dataconectaChatbot.resumeActivity?.();
        }
        
        if (window.performanceMonitor) {
            window.performanceMonitor.normalFrequency?.();
        }
    }

    reducePollingFrequency() {
        // Implement reduced polling for slow connections
        this.pollingInterval = Math.max(this.pollingInterval * 2, 30000); // Max 30 seconds
    }

    enableDataSaverMode() {
        document.body.classList.add('data-saver-mode');
        
        // Reduce image quality
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.srcset) {
                // Use lowest resolution from srcset
                const sources = img.srcset.split(',');
                if (sources.length > 0) {
                    img.src = sources[0].trim().split(' ')[0];
                }
            }
        });
    }

    optimizeCaching() {
        // Implement service worker caching if available
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                if (registration.active) {
                    registration.active.postMessage({
                        type: 'OPTIMIZE_CACHING',
                        level: this.getSustainabilityLevel()
                    });
                }
            });
        }
    }

    createSustainabilityIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'sustainability-indicator';
        indicator.className = 'sustainability-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #2ed573, #1dd1a1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 999;
            box-shadow: 0 4px 15px rgba(46, 213, 115, 0.3);
        `;
        indicator.innerHTML = '🌱';
        indicator.title = 'Índice de Sostenibilidad';
        
        indicator.addEventListener('click', () => {
            this.showSustainabilityReport();
        });
        
        document.body.appendChild(indicator);
        
        // Update indicator color based on performance
        setInterval(() => {
            this.updateIndicator(indicator);
        }, 5000);
    }

    updateIndicator(indicator) {
        const score = this.getSustainabilityScore();
        
        if (score >= 80) {
            indicator.style.background = 'linear-gradient(135deg, #2ed573, #1dd1a1)';
            indicator.innerHTML = '🌱';
        } else if (score >= 60) {
            indicator.style.background = 'linear-gradient(135deg, #ffa502, #ff9f43)';
            indicator.innerHTML = '⚡';
        } else {
            indicator.style.background = 'linear-gradient(135deg, #ff4757, #ff3838)';
            indicator.innerHTML = '🔋';
        }
        
        indicator.title = `Sostenibilidad: ${score}%`;
    }

    updateSustainabilityScoreMethod() {
        // Method to update sustainability score
        const score = this.getSustainabilityScore();
        this.metrics.sustainabilityScore = score;
    }

    getSustainabilityScore() {
        let score = 100;
        
        // Penalize high energy usage
        if (this.metrics.energyEfficiency > this.thresholds.highEnergyUsage) {
            score -= 20;
        }
        
        // Penalize high data transfer
        if (this.metrics.dataTransfer > this.thresholds.highDataTransfer) {
            score -= 15;
        }
        
        // Penalize low cache hit rate
        if (this.metrics.cacheHitRate < this.thresholds.lowCacheHitRate) {
            score -= 10;
        }
        
        // Bonus for optimizations
        score += Math.min(this.optimizations.length * 2, 15);
        
        return Math.max(0, Math.min(100, score));
    }

    getSustainabilityLevel() {
        const score = this.getSustainabilityScore();
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
    }

    showSustainabilityReport() {
        const report = this.generateReport();
        const modal = document.createElement('div');
        modal.className = 'sustainability-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: var(--primary-dark); padding: 30px; border-radius: 15px; max-width: 500px; border: 2px solid var(--accent-primary);">
                <h3 style="color: var(--text-primary); margin-bottom: 20px;">
                    🌱 Reporte de Sostenibilidad
                </h3>
                <div style="color: var(--text-secondary);">
                    <p><strong>Puntuación:</strong> ${report.score}%</p>
                    <p><strong>Nivel:</strong> ${report.level}</p>
                    <p><strong>Uso de energía:</strong> ${report.energyUsage}ms</p>
                    <p><strong>Transferencia de datos:</strong> ${this.formatBytes(report.dataTransfer)}</p>
                    <p><strong>Tasa de cache:</strong> ${(report.cacheHitRate * 100).toFixed(1)}%</p>
                    <p><strong>Optimizaciones aplicadas:</strong> ${report.optimizations}</p>
                </div>
                <div style="margin-top: 20px;">
                    <h4 style="color: var(--accent-primary);">Recomendaciones:</h4>
                    <ul style="color: var(--text-secondary); font-size: 14px;">
                        ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                <button onclick="this.closest('.sustainability-modal').remove()" 
                        style="background: var(--accent-primary); color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px; cursor: pointer;">
                    Cerrar
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    generateReport() {
        const score = this.getSustainabilityScore();
        const recommendations = [];
        
        if (this.metrics.energyEfficiency > this.thresholds.highEnergyUsage) {
            recommendations.push('Optimizar operaciones que consumen mucha CPU');
        }
        
        if (this.metrics.dataTransfer > this.thresholds.highDataTransfer) {
            recommendations.push('Implementar compresión de datos y optimización de imágenes');
        }
        
        if (this.metrics.cacheHitRate < this.thresholds.lowCacheHitRate) {
            recommendations.push('Mejorar estrategia de caching para reducir transferencias');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Excelente trabajo! Su sitio está optimizado para sostenibilidad');
        }
        
        return {
            score,
            level: this.getSustainabilityLevel(),
            energyUsage: Math.round(this.metrics.energyEfficiency),
            dataTransfer: this.metrics.dataTransfer,
            cacheHitRate: this.metrics.cacheHitRate,
            optimizations: this.optimizations.length,
            recommendations
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    scheduleReporting() {
        // Log sustainability metrics periodically
        setInterval(() => {
            this.logMetrics();
        }, 300000); // Every 5 minutes
    }

    logNetworkRequest(url, duration, status) {
        // Log for sustainability analysis
        console.log(`Network: ${url} - ${duration}ms - ${status}`);
    }

    logMetrics() {
        const report = this.generateReport();
        console.log('Sustainability Metrics:', report);
        
        // Store in localStorage for analysis
        try {
            const stored = JSON.parse(localStorage.getItem('sustainability-metrics') || '[]');
            stored.push({
                timestamp: Date.now(),
                ...report
            });
            
            // Keep only last 24 hours of data
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const filtered = stored.filter(entry => entry.timestamp > oneDayAgo);
            
            localStorage.setItem('sustainability-metrics', JSON.stringify(filtered));
        } catch (e) {
            console.warn('Could not store sustainability metrics');
        }
    }
}

// Add sustainability styles
const sustainabilityStyles = document.createElement('style');
sustainabilityStyles.textContent = `
    .low-power-mode * {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
    }
    
    .background-mode {
        filter: brightness(0.8);
    }
    
    .data-saver-mode img {
        filter: contrast(0.9) brightness(0.9);
    }
    
    .sustainability-indicator:hover {
        transform: scale(1.1);
    }
    
    @media (prefers-reduced-motion: reduce) {
        .sustainability-indicator {
            animation: none !important;
        }
    }
`;
document.head.appendChild(sustainabilityStyles);

// Initialize sustainability manager
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sustainabilityManager = new SustainabilityManager();
    });
} else {
    window.sustainabilityManager = new SustainabilityManager();
}