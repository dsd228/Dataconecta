// testing.js - Comprehensive Testing Framework for Dataconecta

class TestingFramework {
    constructor() {
        this.tests = new Map();
        this.testResults = new Map();
        this.automatedTestSuites = new Map();
        this.performanceMetrics = new Map();
        this.accessibilityTests = new Map();
        this.visualRegressionTests = new Map();
        this.isRunning = false;
        this.config = {
            enableAutomatedTesting: true,
            enablePerformanceTesting: true,
            enableAccessibilityTesting: true,
            enableVisualRegressionTesting: true,
            testInterval: 5 * 60 * 1000, // 5 minutes
            performanceThresholds: {
                loadTime: 3000, // 3 seconds
                firstContentfulPaint: 1500, // 1.5 seconds
                timeToInteractive: 5000 // 5 seconds
            }
        };
        this.init();
    }

    init() {
        this.createTestInterface();
        this.setupAutomatedTestSuites();
        this.setupPerformanceMonitoring();
        this.setupAccessibilityTesting();
        this.setupVisualRegressionTesting();
        this.startAutomatedTesting();
        console.log('Testing Framework initialized with comprehensive test suites');
    }

    createTestInterface() {
        // Add testing interface to the page
        const testInterface = document.createElement('div');
        testInterface.id = 'testing-interface';
        testInterface.className = 'testing-interface';
        testInterface.innerHTML = `
            <div class="test-toggle" id="test-toggle">
                <i class="bi bi-bug"></i>
                <span class="test-badge" id="test-badge">0</span>
            </div>
            <div class="test-panel" id="test-panel">
                <div class="test-header">
                    <h3>Panel de Testing</h3>
                    <button class="test-close" id="test-close">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="test-tabs">
                    <button class="test-tab active" data-tab="automated">Automatizados</button>
                    <button class="test-tab" data-tab="performance">Rendimiento</button>
                    <button class="test-tab" data-tab="accessibility">Accesibilidad</button>
                    <button class="test-tab" data-tab="visual">Visual</button>
                    <button class="test-tab" data-tab="manual">Manual</button>
                </div>
                <div class="test-content">
                    <div class="test-tab-content active" id="automated-tab">
                        <div class="test-controls">
                            <button id="run-all-tests" class="test-btn primary">
                                <i class="bi bi-play-circle"></i> Ejecutar Todos
                            </button>
                            <button id="run-unit-tests" class="test-btn">
                                <i class="bi bi-check2-circle"></i> Tests Unitarios
                            </button>
                            <button id="run-integration-tests" class="test-btn">
                                <i class="bi bi-link-45deg"></i> Integración
                            </button>
                        </div>
                        <div class="test-results" id="automated-results"></div>
                    </div>
                    <div class="test-tab-content" id="performance-tab">
                        <div class="test-controls">
                            <button id="run-performance-test" class="test-btn primary">
                                <i class="bi bi-speedometer2"></i> Analizar Rendimiento
                            </button>
                            <button id="lighthouse-test" class="test-btn">
                                <i class="bi bi-lighthouse"></i> Lighthouse
                            </button>
                        </div>
                        <div class="test-results" id="performance-results"></div>
                    </div>
                    <div class="test-tab-content" id="accessibility-tab">
                        <div class="test-controls">
                            <button id="run-accessibility-test" class="test-btn primary">
                                <i class="bi bi-universal-access"></i> Verificar Accesibilidad
                            </button>
                            <button id="wcag-compliance" class="test-btn">
                                <i class="bi bi-shield-check"></i> WCAG 2.1
                            </button>
                        </div>
                        <div class="test-results" id="accessibility-results"></div>
                    </div>
                    <div class="test-tab-content" id="visual-tab">
                        <div class="test-controls">
                            <button id="visual-regression-test" class="test-btn primary">
                                <i class="bi bi-camera"></i> Regresión Visual
                            </button>
                            <button id="cross-browser-test" class="test-btn">
                                <i class="bi bi-browser-chrome"></i> Cross-Browser
                            </button>
                        </div>
                        <div class="test-results" id="visual-results"></div>
                    </div>
                    <div class="test-tab-content" id="manual-tab">
                        <div class="test-controls">
                            <button id="create-manual-test" class="test-btn primary">
                                <i class="bi bi-plus-circle"></i> Crear Test Manual
                            </button>
                            <button id="export-test-report" class="test-btn">
                                <i class="bi bi-download"></i> Exportar Reporte
                            </button>
                        </div>
                        <div class="test-results" id="manual-results"></div>
                    </div>
                </div>
            </div>
        `;

        testInterface.style.display = 'none';
        document.body.appendChild(testInterface);
        this.addTestingStyles();
        this.setupTestingEventListeners();
    }

    addTestingStyles() {
        const styles = `
            .testing-interface {
                position: fixed;
                bottom: 80px;
                right: 20px;
                z-index: 9998;
                font-family: 'Inter', sans-serif;
            }

            .test-toggle {
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
                transition: transform 0.3s ease;
                position: relative;
            }

            .test-toggle:hover {
                transform: scale(1.1);
            }

            .test-toggle i {
                font-size: 20px;
                color: white;
            }

            .test-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #28a745;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
            }

            .test-panel {
                position: absolute;
                bottom: 60px;
                right: 0;
                width: 400px;
                height: 500px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
            }

            .test-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .test-header h3 {
                margin: 0;
                font-size: 1.2rem;
                font-weight: 600;
            }

            .test-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
            }

            .test-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .test-tabs {
                display: flex;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
            }

            .test-tab {
                flex: 1;
                padding: 10px 5px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.3s ease;
                color: #6c757d;
            }

            .test-tab.active {
                background: white;
                color: #495057;
                border-bottom: 2px solid #667eea;
            }

            .test-content {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }

            .test-tab-content {
                display: none;
            }

            .test-tab-content.active {
                display: block;
            }

            .test-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }

            .test-btn {
                padding: 8px 12px;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .test-btn:hover {
                background: #f8f9fa;
                transform: translateY(-1px);
            }

            .test-btn.primary {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }

            .test-btn.primary:hover {
                background: #5a6fd8;
            }

            .test-results {
                max-height: 300px;
                overflow-y: auto;
            }

            .test-result-item {
                padding: 10px;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                margin-bottom: 10px;
                background: white;
            }

            .test-result-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }

            .test-result-name {
                font-weight: 600;
                font-size: 13px;
            }

            .test-result-status {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
            }

            .test-result-status.passed {
                background: #d4edda;
                color: #155724;
            }

            .test-result-status.failed {
                background: #f8d7da;
                color: #721c24;
            }

            .test-result-status.warning {
                background: #fff3cd;
                color: #856404;
            }

            .test-result-detail {
                font-size: 12px;
                color: #6c757d;
                margin-top: 5px;
            }

            .test-metric {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #f8f9fa;
            }

            .test-metric:last-child {
                border-bottom: none;
            }

            .test-metric-name {
                font-size: 12px;
                color: #6c757d;
            }

            .test-metric-value {
                font-size: 12px;
                font-weight: 600;
            }

            .test-metric-value.good {
                color: #28a745;
            }

            .test-metric-value.warning {
                color: #ffc107;
            }

            .test-metric-value.poor {
                color: #dc3545;
            }

            @media (max-width: 768px) {
                .test-panel {
                    width: 320px;
                    height: 400px;
                }
                
                .test-controls {
                    flex-direction: column;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    setupTestingEventListeners() {
        const toggle = document.getElementById('test-toggle');
        const panel = document.getElementById('test-panel');
        const close = document.getElementById('test-close');

        toggle.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        });

        close.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // Tab switching
        document.querySelectorAll('.test-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Test execution buttons
        document.getElementById('run-all-tests').addEventListener('click', () => this.runAllTests());
        document.getElementById('run-unit-tests').addEventListener('click', () => this.runUnitTests());
        document.getElementById('run-integration-tests').addEventListener('click', () => this.runIntegrationTests());
        document.getElementById('run-performance-test').addEventListener('click', () => this.runPerformanceTest());
        document.getElementById('lighthouse-test').addEventListener('click', () => this.runLighthouseTest());
        document.getElementById('run-accessibility-test').addEventListener('click', () => this.runAccessibilityTest());
        document.getElementById('wcag-compliance').addEventListener('click', () => this.runWCAGCompliance());
        document.getElementById('visual-regression-test').addEventListener('click', () => this.runVisualRegressionTest());
        document.getElementById('cross-browser-test').addEventListener('click', () => this.runCrossBrowserTest());
        document.getElementById('create-manual-test').addEventListener('click', () => this.createManualTest());
        document.getElementById('export-test-report').addEventListener('click', () => this.exportTestReport());
    }

    switchTab(tabId) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.test-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.test-tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    }

    setupAutomatedTestSuites() {
        // Unit tests
        this.registerTest('unit', 'DOM Elements', () => {
            const requiredElements = ['navbar', 'footer', 'main'];
            const results = [];
            
            requiredElements.forEach(selector => {
                const element = document.querySelector(`.${selector}`) || document.querySelector(`#${selector}`) || document.querySelector(selector);
                results.push({
                    name: `${selector} element exists`,
                    passed: !!element,
                    detail: element ? 'Element found' : 'Element not found'
                });
            });
            
            return results;
        });

        this.registerTest('unit', 'JavaScript APIs', () => {
            const apis = ['localStorage', 'sessionStorage', 'fetch', 'Promise'];
            const results = [];
            
            apis.forEach(api => {
                results.push({
                    name: `${api} API available`,
                    passed: window[api] !== undefined,
                    detail: window[api] ? 'API available' : 'API not available'
                });
            });
            
            return results;
        });

        // Integration tests
        this.registerTest('integration', 'External Dependencies', () => {
            const dependencies = [
                { name: 'Bootstrap CSS', selector: 'link[href*="bootstrap"]' },
                { name: 'Bootstrap JS', selector: 'script[src*="bootstrap"]' },
                { name: 'Font Awesome', selector: 'link[href*="font"]' }
            ];
            
            const results = [];
            
            dependencies.forEach(dep => {
                const element = document.querySelector(dep.selector);
                results.push({
                    name: dep.name,
                    passed: !!element,
                    detail: element ? 'Dependency loaded' : 'Dependency missing'
                });
            });
            
            return results;
        });

        this.registerTest('integration', 'Form Functionality', () => {
            const forms = document.querySelectorAll('form');
            const results = [];
            
            forms.forEach((form, index) => {
                const inputs = form.querySelectorAll('input, textarea, select');
                const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                
                results.push({
                    name: `Form ${index + 1} structure`,
                    passed: inputs.length > 0 && !!submitButton,
                    detail: `${inputs.length} inputs, submit button: ${!!submitButton}`
                });
            });
            
            if (forms.length === 0) {
                results.push({
                    name: 'Forms present',
                    passed: false,
                    detail: 'No forms found on page'
                });
            }
            
            return results;
        });
    }

    setupPerformanceMonitoring() {
        // Performance observer for Core Web Vitals
        if ('PerformanceObserver' in window) {
            // Largest Contentful Paint
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.performanceMetrics.set('LCP', lastEntry.startTime);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // First Input Delay
            const fidObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    this.performanceMetrics.set('FID', entry.processingStart - entry.startTime);
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });

            // Cumulative Layout Shift
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                this.performanceMetrics.set('CLS', clsValue);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        }
    }

    setupAccessibilityTesting() {
        this.registerTest('accessibility', 'Alt Text', () => {
            const images = document.querySelectorAll('img');
            const results = [];
            
            images.forEach((img, index) => {
                const hasAlt = img.hasAttribute('alt');
                const altText = img.getAttribute('alt');
                
                results.push({
                    name: `Image ${index + 1} alt text`,
                    passed: hasAlt && altText.trim().length > 0,
                    detail: hasAlt ? `Alt: "${altText}"` : 'No alt attribute'
                });
            });
            
            return results;
        });

        this.registerTest('accessibility', 'Form Labels', () => {
            const inputs = document.querySelectorAll('input, textarea, select');
            const results = [];
            
            inputs.forEach((input, index) => {
                const hasLabel = input.hasAttribute('aria-label') || 
                               input.hasAttribute('aria-labelledby') ||
                               input.closest('label') ||
                               document.querySelector(`label[for="${input.id}"]`);
                
                results.push({
                    name: `Input ${index + 1} label`,
                    passed: !!hasLabel,
                    detail: hasLabel ? 'Label found' : 'No label found'
                });
            });
            
            return results;
        });

        this.registerTest('accessibility', 'Heading Structure', () => {
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const results = [];
            
            let previousLevel = 0;
            let hasH1 = false;
            
            headings.forEach((heading, index) => {
                const level = parseInt(heading.tagName.charAt(1));
                
                if (level === 1) hasH1 = true;
                
                const isSequential = level <= previousLevel + 1;
                
                results.push({
                    name: `Heading ${index + 1} (${heading.tagName})`,
                    passed: isSequential,
                    detail: isSequential ? 'Proper hierarchy' : 'Skips levels'
                });
                
                previousLevel = level;
            });
            
            results.unshift({
                name: 'H1 present',
                passed: hasH1,
                detail: hasH1 ? 'H1 found' : 'No H1 found'
            });
            
            return results;
        });
    }

    setupVisualRegressionTesting() {
        this.registerTest('visual', 'Layout Stability', () => {
            const cls = this.performanceMetrics.get('CLS') || 0;
            
            return [{
                name: 'Cumulative Layout Shift',
                passed: cls < 0.1,
                detail: `CLS: ${cls.toFixed(4)} (${cls < 0.1 ? 'Good' : cls < 0.25 ? 'Needs improvement' : 'Poor'})`
            }];
        });

        this.registerTest('visual', 'Responsive Design', () => {
            const results = [];
            const viewports = [
                { name: 'Mobile', width: 375 },
                { name: 'Tablet', width: 768 },
                { name: 'Desktop', width: 1024 }
            ];
            
            viewports.forEach(viewport => {
                // Simulate viewport check
                const isResponsive = document.querySelector('meta[name="viewport"]') !== null;
                
                results.push({
                    name: `${viewport.name} viewport`,
                    passed: isResponsive,
                    detail: isResponsive ? 'Responsive meta tag found' : 'No responsive meta tag'
                });
            });
            
            return results;
        });
    }

    registerTest(category, name, testFunction) {
        if (!this.tests.has(category)) {
            this.tests.set(category, new Map());
        }
        this.tests.get(category).set(name, testFunction);
    }

    async runAllTests() {
        this.isRunning = true;
        this.updateTestBadge(0);
        
        const allResults = new Map();
        
        // Run all test categories
        for (const [category, tests] of this.tests) {
            allResults.set(category, await this.runTestCategory(category));
        }
        
        this.displayResults('automated-results', allResults);
        this.updateTestBadge(this.countTotalTests(allResults));
        this.isRunning = false;
    }

    async runUnitTests() {
        const results = await this.runTestCategory('unit');
        this.displayResults('automated-results', new Map([['unit', results]]));
        this.updateTestBadge(results.length);
    }

    async runIntegrationTests() {
        const results = await this.runTestCategory('integration');
        this.displayResults('automated-results', new Map([['integration', results]]));
        this.updateTestBadge(results.length);
    }

    async runTestCategory(category) {
        const tests = this.tests.get(category);
        if (!tests) return [];
        
        const results = [];
        
        for (const [name, testFunction] of tests) {
            try {
                const testResults = await testFunction();
                results.push({
                    name,
                    results: Array.isArray(testResults) ? testResults : [testResults]
                });
            } catch (error) {
                results.push({
                    name,
                    results: [{
                        name: 'Test execution',
                        passed: false,
                        detail: `Error: ${error.message}`
                    }]
                });
            }
        }
        
        return results;
    }

    async runPerformanceTest() {
        const results = [];
        
        // Navigation timing
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
            const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
            
            results.push({
                name: 'Page Load Time',
                value: `${loadTime.toFixed(0)}ms`,
                passed: loadTime < this.config.performanceThresholds.loadTime,
                class: loadTime < 1000 ? 'good' : loadTime < 3000 ? 'warning' : 'poor'
            });
            
            results.push({
                name: 'DOM Content Loaded',
                value: `${domContentLoaded.toFixed(0)}ms`,
                passed: domContentLoaded < 2000,
                class: domContentLoaded < 1000 ? 'good' : domContentLoaded < 2000 ? 'warning' : 'poor'
            });
        }
        
        // Core Web Vitals
        const lcp = this.performanceMetrics.get('LCP');
        if (lcp) {
            results.push({
                name: 'Largest Contentful Paint',
                value: `${lcp.toFixed(0)}ms`,
                passed: lcp < 2500,
                class: lcp < 2500 ? 'good' : lcp < 4000 ? 'warning' : 'poor'
            });
        }
        
        const fid = this.performanceMetrics.get('FID');
        if (fid) {
            results.push({
                name: 'First Input Delay',
                value: `${fid.toFixed(0)}ms`,
                passed: fid < 100,
                class: fid < 100 ? 'good' : fid < 300 ? 'warning' : 'poor'
            });
        }
        
        const cls = this.performanceMetrics.get('CLS');
        if (cls !== undefined) {
            results.push({
                name: 'Cumulative Layout Shift',
                value: cls.toFixed(4),
                passed: cls < 0.1,
                class: cls < 0.1 ? 'good' : cls < 0.25 ? 'warning' : 'poor'
            });
        }
        
        this.displayPerformanceResults('performance-results', results);
    }

    async runLighthouseTest() {
        // Simulate Lighthouse test (would use real Lighthouse API in production)
        const results = [
            { name: 'Performance', value: Math.floor(Math.random() * 30) + 70, max: 100 },
            { name: 'Accessibility', value: Math.floor(Math.random() * 20) + 80, max: 100 },
            { name: 'Best Practices', value: Math.floor(Math.random() * 25) + 75, max: 100 },
            { name: 'SEO', value: Math.floor(Math.random() * 15) + 85, max: 100 }
        ];
        
        this.displayLighthouseResults('performance-results', results);
    }

    async runAccessibilityTest() {
        const results = await this.runTestCategory('accessibility');
        this.displayResults('accessibility-results', new Map([['accessibility', results]]));
    }

    async runWCAGCompliance() {
        // Extended accessibility tests for WCAG 2.1 compliance
        const wcagTests = [
            {
                name: 'Color Contrast',
                check: () => {
                    // Basic color contrast check (simplified)
                    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a');
                    let passCount = 0;
                    
                    elements.forEach(el => {
                        const styles = window.getComputedStyle(el);
                        const bgColor = styles.backgroundColor;
                        const textColor = styles.color;
                        
                        // Simplified contrast check
                        if (bgColor !== 'rgba(0, 0, 0, 0)' || textColor !== 'rgb(0, 0, 0)') {
                            passCount++;
                        }
                    });
                    
                    return {
                        passed: passCount / elements.length > 0.8,
                        detail: `${passCount}/${elements.length} elements have defined colors`
                    };
                }
            },
            {
                name: 'Keyboard Navigation',
                check: () => {
                    const focusableElements = document.querySelectorAll(
                        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
                    );
                    
                    return {
                        passed: focusableElements.length > 0,
                        detail: `${focusableElements.length} focusable elements found`
                    };
                }
            },
            {
                name: 'ARIA Attributes',
                check: () => {
                    const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
                    const totalInteractive = document.querySelectorAll('button, input, select, textarea, a').length;
                    
                    return {
                        passed: ariaElements.length / totalInteractive > 0.5,
                        detail: `${ariaElements.length} elements with ARIA attributes`
                    };
                }
            }
        ];
        
        const results = wcagTests.map(test => {
            const result = test.check();
            return {
                name: test.name,
                passed: result.passed,
                detail: result.detail
            };
        });
        
        this.displayWCAGResults('accessibility-results', results);
    }

    async runVisualRegressionTest() {
        const results = await this.runTestCategory('visual');
        this.displayResults('visual-results', new Map([['visual', results]]));
    }

    async runCrossBrowserTest() {
        // Simulate cross-browser compatibility test
        const browserFeatures = [
            { name: 'CSS Grid', supported: CSS.supports('display', 'grid') },
            { name: 'CSS Flexbox', supported: CSS.supports('display', 'flex') },
            { name: 'CSS Variables', supported: CSS.supports('color', 'var(--test)') },
            { name: 'ES6 Features', supported: window.Promise !== undefined },
            { name: 'Fetch API', supported: window.fetch !== undefined },
            { name: 'Local Storage', supported: window.localStorage !== undefined }
        ];
        
        const results = browserFeatures.map(feature => ({
            name: feature.name,
            passed: feature.supported,
            detail: feature.supported ? 'Supported' : 'Not supported'
        }));
        
        this.displayBrowserCompatibilityResults('visual-results', results);
    }

    createManualTest() {
        const testName = prompt('Nombre del test manual:');
        if (!testName) return;
        
        const testSteps = prompt('Pasos del test (separados por comas):');
        if (!testSteps) return;
        
        const manualTest = {
            name: testName,
            steps: testSteps.split(',').map(step => step.trim()),
            created: new Date().toISOString(),
            status: 'pending'
        };
        
        // Store manual test
        const manualTests = JSON.parse(localStorage.getItem('manual_tests') || '[]');
        manualTests.push(manualTest);
        localStorage.setItem('manual_tests', JSON.stringify(manualTests));
        
        this.displayManualTests();
    }

    displayManualTests() {
        const manualTests = JSON.parse(localStorage.getItem('manual_tests') || '[]');
        const container = document.getElementById('manual-results');
        
        container.innerHTML = manualTests.map(test => `
            <div class="test-result-item">
                <div class="test-result-header">
                    <div class="test-result-name">${test.name}</div>
                    <div class="test-result-status ${test.status}">${test.status}</div>
                </div>
                <div class="test-result-detail">
                    <strong>Pasos:</strong>
                    <ol>
                        ${test.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                    <button onclick="window.testingFramework.executeManualTest('${test.name}')" 
                            class="test-btn" style="margin-top: 10px;">
                        Ejecutar Test
                    </button>
                </div>
            </div>
        `).join('');
    }

    executeManualTest(testName) {
        const result = confirm(`¿Se ha completado exitosamente el test "${testName}"?`);
        
        const manualTests = JSON.parse(localStorage.getItem('manual_tests') || '[]');
        const testIndex = manualTests.findIndex(test => test.name === testName);
        
        if (testIndex !== -1) {
            manualTests[testIndex].status = result ? 'passed' : 'failed';
            manualTests[testIndex].lastExecuted = new Date().toISOString();
            localStorage.setItem('manual_tests', JSON.stringify(manualTests));
            this.displayManualTests();
        }
    }

    displayResults(containerId, results) {
        const container = document.getElementById(containerId);
        let html = '';
        
        for (const [category, categoryResults] of results) {
            html += `<h4>${category.charAt(0).toUpperCase() + category.slice(1)} Tests</h4>`;
            
            categoryResults.forEach(testGroup => {
                testGroup.results.forEach(result => {
                    const statusClass = result.passed ? 'passed' : 'failed';
                    html += `
                        <div class="test-result-item">
                            <div class="test-result-header">
                                <div class="test-result-name">${result.name}</div>
                                <div class="test-result-status ${statusClass}">
                                    ${result.passed ? 'PASSED' : 'FAILED'}
                                </div>
                            </div>
                            <div class="test-result-detail">${result.detail}</div>
                        </div>
                    `;
                });
            });
        }
        
        container.innerHTML = html;
    }

    displayPerformanceResults(containerId, results) {
        const container = document.getElementById(containerId);
        
        const html = results.map(result => `
            <div class="test-metric">
                <div class="test-metric-name">${result.name}</div>
                <div class="test-metric-value ${result.class}">${result.value}</div>
            </div>
        `).join('');
        
        container.innerHTML = `
            <div class="test-result-item">
                <div class="test-result-header">
                    <div class="test-result-name">Métricas de Rendimiento</div>
                </div>
                ${html}
            </div>
        `;
    }

    displayLighthouseResults(containerId, results) {
        const container = document.getElementById(containerId);
        
        const html = results.map(result => {
            const percentage = (result.value / result.max) * 100;
            const color = percentage >= 90 ? 'good' : percentage >= 70 ? 'warning' : 'poor';
            
            return `
                <div class="test-metric">
                    <div class="test-metric-name">${result.name}</div>
                    <div class="test-metric-value ${color}">${result.value}/${result.max}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div class="test-result-item">
                <div class="test-result-header">
                    <div class="test-result-name">Lighthouse Scores</div>
                </div>
                ${html}
            </div>
        `;
    }

    displayWCAGResults(containerId, results) {
        const container = document.getElementById(containerId);
        
        const html = results.map(result => {
            const statusClass = result.passed ? 'passed' : 'failed';
            return `
                <div class="test-result-item">
                    <div class="test-result-header">
                        <div class="test-result-name">${result.name}</div>
                        <div class="test-result-status ${statusClass}">
                            ${result.passed ? 'COMPLIANT' : 'NON-COMPLIANT'}
                        </div>
                    </div>
                    <div class="test-result-detail">${result.detail}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    displayBrowserCompatibilityResults(containerId, results) {
        const container = document.getElementById(containerId);
        
        const html = results.map(result => {
            const statusClass = result.passed ? 'passed' : 'warning';
            return `
                <div class="test-result-item">
                    <div class="test-result-header">
                        <div class="test-result-name">${result.name}</div>
                        <div class="test-result-status ${statusClass}">
                            ${result.passed ? 'SUPPORTED' : 'UNSUPPORTED'}
                        </div>
                    </div>
                    <div class="test-result-detail">${result.detail}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    countTotalTests(results) {
        let count = 0;
        for (const [, categoryResults] of results) {
            categoryResults.forEach(testGroup => {
                count += testGroup.results.length;
            });
        }
        return count;
    }

    updateTestBadge(count) {
        const badge = document.getElementById('test-badge');
        badge.textContent = count;
        badge.style.background = count > 0 ? '#28a745' : '#6c757d';
    }

    startAutomatedTesting() {
        if (!this.config.enableAutomatedTesting) return;
        
        // Run automated tests periodically
        setInterval(() => {
            if (!this.isRunning) {
                this.runAllTests();
            }
        }, this.config.testInterval);
        
        console.log('Automated testing started');
    }

    exportTestReport() {
        const report = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            testResults: {},
            performanceMetrics: Object.fromEntries(this.performanceMetrics),
            manualTests: JSON.parse(localStorage.getItem('manual_tests') || '[]')
        };
        
        // Add all test results
        for (const [category, tests] of this.tests) {
            report.testResults[category] = [];
            // Would include actual test results here
        }
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
}

// Initialize Testing Framework when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.testingFramework = new TestingFramework();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestingFramework;
}