// Performance Monitoring and Analytics

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoadTime: 0,
            domContentLoaded: 0,
            firstPaint: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0,
            firstInputDelay: 0,
            networkConnections: 0,
            resourceLoadTimes: [],
            userInteractions: 0,
            errorsCount: 0
        };
        this.startTime = performance.now();
        this.init();
    }

    init() {
        this.measurePageLoad();
        this.measureCoreWebVitals();
        this.trackUserInteractions();
        this.trackErrors();
        this.trackNetworkRequests();
        this.setupReporting();
    }

    measurePageLoad() {
        // Wait for page to fully load
        window.addEventListener('load', () => {
            const loadTime = performance.now() - this.startTime;
            this.metrics.pageLoadTime = Math.round(loadTime);
            
            // Get navigation timing
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.metrics.domContentLoaded = Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart);
            }
            
            this.sendMetrics('pageLoad');
        });

        // Measure DOM content loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.metrics.domContentLoaded = Math.round(performance.now() - this.startTime);
        });
    }

    measureCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.metrics.largestContentfulPaint = Math.round(lastEntry.startTime);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

                // First Paint & First Contentful Paint
                const paintObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name === 'first-paint') {
                            this.metrics.firstPaint = Math.round(entry.startTime);
                        } else if (entry.name === 'first-contentful-paint') {
                            this.metrics.firstContentfulPaint = Math.round(entry.startTime);
                        }
                    }
                });
                paintObserver.observe({ entryTypes: ['paint'] });

                // Cumulative Layout Shift (CLS)
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            this.metrics.cumulativeLayoutShift += entry.value;
                        }
                    }
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });

                // First Input Delay (FID)
                const fidObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.metrics.firstInputDelay = Math.round(entry.processingStart - entry.startTime);
                        break; // Only need the first input delay
                    }
                });
                fidObserver.observe({ entryTypes: ['first-input'] });

            } catch (e) {
                console.warn('PerformanceObserver not fully supported');
            }
        }
    }

    trackUserInteractions() {
        const interactionEvents = ['click', 'touch', 'keydown', 'scroll'];
        
        interactionEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.metrics.userInteractions++;
            }, { passive: true });
        });

        // Track specific UI interactions
        document.addEventListener('click', (e) => {
            const element = e.target.closest('a, button, [data-action]');
            if (element) {
                this.trackInteraction(element);
            }
        });
    }

    trackInteraction(element) {
        const interaction = {
            type: element.tagName.toLowerCase(),
            text: element.textContent?.trim() || element.getAttribute('aria-label') || '',
            href: element.href || '',
            timestamp: Date.now()
        };

        this.sendMetrics('interaction', interaction);
    }

    trackErrors() {
        window.addEventListener('error', (e) => {
            this.metrics.errorsCount++;
            const errorInfo = {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                timestamp: Date.now()
            };
            this.sendMetrics('error', errorInfo);
        });

        window.addEventListener('unhandledrejection', (e) => {
            this.metrics.errorsCount++;
            const errorInfo = {
                message: e.reason?.message || 'Promise rejection',
                type: 'unhandledrejection',
                timestamp: Date.now()
            };
            this.sendMetrics('error', errorInfo);
        });
    }

    trackNetworkRequests() {
        if ('PerformanceObserver' in window) {
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'resource') {
                            this.metrics.networkConnections++;
                            this.metrics.resourceLoadTimes.push({
                                name: entry.name,
                                duration: Math.round(entry.duration),
                                transferSize: entry.transferSize || 0,
                                type: entry.initiatorType
                            });
                        }
                    }
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
            } catch (e) {
                console.warn('Resource performance monitoring not available');
            }
        }
    }

    setupReporting() {
        // Send metrics periodically
        setInterval(() => {
            this.sendMetrics('periodic');
        }, 30000); // Every 30 seconds

        // Send metrics before page unload
        window.addEventListener('beforeunload', () => {
            this.sendMetrics('pageUnload');
        });

        // Send metrics when page becomes hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.sendMetrics('pageHidden');
            }
        });
    }

    getPerformanceGrade() {
        let score = 100;
        
        // Grade based on Core Web Vitals
        if (this.metrics.largestContentfulPaint > 4000) score -= 20;
        else if (this.metrics.largestContentfulPaint > 2500) score -= 10;
        
        if (this.metrics.firstInputDelay > 300) score -= 20;
        else if (this.metrics.firstInputDelay > 100) score -= 10;
        
        if (this.metrics.cumulativeLayoutShift > 0.25) score -= 20;
        else if (this.metrics.cumulativeLayoutShift > 0.1) score -= 10;
        
        if (this.metrics.pageLoadTime > 5000) score -= 15;
        else if (this.metrics.pageLoadTime > 3000) score -= 8;
        
        if (this.metrics.errorsCount > 0) score -= (this.metrics.errorsCount * 5);
        
        return Math.max(0, Math.min(100, score));
    }

    sendMetrics(eventType, additionalData = {}) {
        const performanceData = {
            eventType,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            connection: this.getConnectionInfo(),
            metrics: { ...this.metrics },
            grade: this.getPerformanceGrade(),
            sessionId: this.getSessionId(),
            ...additionalData
        };

        // Store locally for now (could be sent to analytics service)
        this.storeMetrics(performanceData);
        
        // Log to console in development
        if (window.location.hostname === 'localhost') {
            console.log('Performance Metrics:', performanceData);
        }
    }

    getConnectionInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                saveData: conn.saveData
            };
        }
        return null;
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('dataconecta-session');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('dataconecta-session', sessionId);
        }
        return sessionId;
    }

    storeMetrics(data) {
        try {
            const stored = JSON.parse(localStorage.getItem('dataconecta-metrics') || '[]');
            stored.push(data);
            
            // Keep only last 50 entries
            if (stored.length > 50) {
                stored.splice(0, stored.length - 50);
            }
            
            localStorage.setItem('dataconecta-metrics', JSON.stringify(stored));
        } catch (e) {
            console.warn('Could not store performance metrics');
        }
    }

    getStoredMetrics() {
        try {
            return JSON.parse(localStorage.getItem('dataconecta-metrics') || '[]');
        } catch (e) {
            return [];
        }
    }

    generateReport() {
        const report = {
            summary: {
                averageLoadTime: this.metrics.pageLoadTime,
                performanceGrade: this.getPerformanceGrade(),
                totalInteractions: this.metrics.userInteractions,
                errorsCount: this.metrics.errorsCount,
                resourcesLoaded: this.metrics.networkConnections
            },
            coreWebVitals: {
                lcp: this.metrics.largestContentfulPaint,
                fid: this.metrics.firstInputDelay,
                cls: this.metrics.cumulativeLayoutShift
            },
            recommendations: this.getRecommendations()
        };

        return report;
    }

    getRecommendations() {
        const recommendations = [];
        
        if (this.metrics.largestContentfulPaint > 2500) {
            recommendations.push('Optimize Largest Contentful Paint by compressing images and minimizing render-blocking resources');
        }
        
        if (this.metrics.firstInputDelay > 100) {
            recommendations.push('Improve First Input Delay by reducing JavaScript execution time');
        }
        
        if (this.metrics.cumulativeLayoutShift > 0.1) {
            recommendations.push('Reduce Cumulative Layout Shift by setting size attributes on images and avoiding dynamic content insertion');
        }
        
        if (this.metrics.pageLoadTime > 3000) {
            recommendations.push('Optimize page load time by enabling compression and using a Content Delivery Network');
        }
        
        if (this.metrics.errorsCount > 0) {
            recommendations.push('Fix JavaScript errors to improve user experience');
        }

        return recommendations;
    }
}

// Initialize performance monitoring
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.performanceMonitor = new PerformanceMonitor();
    });
} else {
    window.performanceMonitor = new PerformanceMonitor();
}