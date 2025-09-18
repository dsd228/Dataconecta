// sustainability.js - Sustainability and Environmental Impact Features for Dataconecta

class SustainabilityManager {
    constructor() {
        this.carbonFootprint = {
            pageViews: 0,
            dataTransfer: 0,
            serverRequests: 0,
            energyConsumption: 0,
            co2Emissions: 0
        };
        this.greenMetrics = new Map();
        this.ecoOptimizations = new Map();
        this.sustainabilityGoals = new Map();
        this.energyEfficiencyData = new Map();
        this.config = {
            enableCarbonTracking: true,
            enableEcoOptimizations: true,
            enableGreenMetrics: true,
            co2PerKWh: 0.5, // kg CO2 per kWh (average)
            energyPerPageView: 0.0005, // kWh per page view
            dataTransferEmissionFactor: 0.000006 // kg CO2 per byte
        };
        this.init();
    }

    init() {
        this.createSustainabilityInterface();
        this.startCarbonTracking();
        this.implementEcoOptimizations();
        this.setupGreenMetrics();
        this.initializeSustainabilityGoals();
        this.setupEnergyMonitoring();
        this.loadSustainabilityData();
        console.log('Sustainability Manager initialized with environmental tracking');
    }

    createSustainabilityInterface() {
        const sustainabilityContainer = document.createElement('div');
        sustainabilityContainer.id = 'sustainability-container';
        sustainabilityContainer.className = 'sustainability-container';
        sustainabilityContainer.innerHTML = `
            <div class="eco-toggle" id="eco-toggle">
                <i class="bi bi-tree"></i>
                <span class="eco-badge" id="eco-badge">ECO</span>
            </div>
            <div class="eco-panel" id="eco-panel">
                <div class="eco-header">
                    <div class="eco-title">
                        <i class="bi bi-leaf"></i>
                        <h3>Impacto Ambiental</h3>
                    </div>
                    <button class="eco-close" id="eco-close">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="eco-tabs">
                    <button class="eco-tab active" data-tab="carbon">Huella de Carbono</button>
                    <button class="eco-tab" data-tab="energy">Eficiencia</button>
                    <button class="eco-tab" data-tab="goals">Objetivos</button>
                    <button class="eco-tab" data-tab="actions">Acciones</button>
                </div>
                <div class="eco-content">
                    <div class="eco-tab-content active" id="carbon-tab">
                        <div class="carbon-summary">
                            <div class="carbon-metric main">
                                <div class="metric-icon">🌍</div>
                                <div class="metric-info">
                                    <span class="metric-value" id="total-co2">0.00</span>
                                    <span class="metric-unit">kg CO₂</span>
                                    <span class="metric-label">Total de esta sesión</span>
                                </div>
                            </div>
                        </div>
                        <div class="carbon-breakdown">
                            <h4>Desglose de Emisiones</h4>
                            <div class="breakdown-item">
                                <span class="breakdown-label">Transferencia de datos</span>
                                <span class="breakdown-value" id="data-co2">0.00 kg CO₂</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">Procesamiento del servidor</span>
                                <span class="breakdown-value" id="server-co2">0.00 kg CO₂</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">Consumo del dispositivo</span>
                                <span class="breakdown-value" id="device-co2">0.00 kg CO₂</span>
                            </div>
                        </div>
                        <div class="carbon-comparison">
                            <div class="comparison-item">
                                <span class="comparison-icon">🚗</span>
                                <span class="comparison-text">Equivale a <span id="car-equivalent">0</span>m en auto</span>
                            </div>
                            <div class="comparison-item">
                                <span class="comparison-icon">🌳</span>
                                <span class="comparison-text"><span id="tree-offset">0</span> árboles para compensar</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="eco-tab-content" id="energy-tab">
                        <div class="energy-metrics">
                            <h4>Métricas de Eficiencia</h4>
                            <div class="energy-metric">
                                <span class="metric-name">Optimización de imágenes</span>
                                <div class="metric-bar">
                                    <div class="metric-fill" id="image-optimization" style="width: 0%"></div>
                                </div>
                                <span class="metric-percent" id="image-optimization-text">0%</span>
                            </div>
                            <div class="energy-metric">
                                <span class="metric-name">Compresión CSS/JS</span>
                                <div class="metric-bar">
                                    <div class="metric-fill" id="compression" style="width: 0%"></div>
                                </div>
                                <span class="metric-percent" id="compression-text">0%</span>
                            </div>
                            <div class="energy-metric">
                                <span class="metric-name">Lazy Loading</span>
                                <div class="metric-bar">
                                    <div class="metric-fill" id="lazy-loading" style="width: 0%"></div>
                                </div>
                                <span class="metric-percent" id="lazy-loading-text">0%</span>
                            </div>
                            <div class="energy-metric">
                                <span class="metric-name">CDN Utilización</span>
                                <div class="metric-bar">
                                    <div class="metric-fill" id="cdn-usage" style="width: 0%"></div>
                                </div>
                                <span class="metric-percent" id="cdn-usage-text">0%</span>
                            </div>
                        </div>
                        <div class="energy-tips">
                            <h4>Sugerencias de Optimización</h4>
                            <div class="tip-list" id="energy-tips-list"></div>
                        </div>
                    </div>
                    
                    <div class="eco-tab-content" id="goals-tab">
                        <div class="goals-header">
                            <h4>Objetivos de Sostenibilidad 2025</h4>
                            <button id="add-goal" class="eco-btn primary">
                                <i class="bi bi-plus"></i> Nuevo Objetivo
                            </button>
                        </div>
                        <div class="goals-list" id="goals-list"></div>
                        <div class="sustainability-certificate">
                            <div class="certificate-header">
                                <i class="bi bi-award"></i>
                                <h5>Certificación Verde</h5>
                            </div>
                            <div class="certificate-progress">
                                <span>Progreso hacia certificación:</span>
                                <div class="progress-bar">
                                    <div class="progress-fill" id="certification-progress" style="width: 0%"></div>
                                </div>
                                <span id="certification-percent">0%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="eco-tab-content" id="actions-tab">
                        <div class="actions-header">
                            <h4>Acciones Ecológicas</h4>
                            <div class="eco-mode-toggle">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="eco-mode">
                                    <span class="toggle-slider"></span>
                                </label>
                                <span>Modo Eco Activado</span>
                            </div>
                        </div>
                        <div class="eco-actions-grid">
                            <div class="eco-action" onclick="window.sustainabilityManager.enableDarkMode()">
                                <i class="bi bi-moon"></i>
                                <span>Modo Oscuro</span>
                                <small>Reduce consumo de pantalla</small>
                            </div>
                            <div class="eco-action" onclick="window.sustainabilityManager.optimizeImages()">
                                <i class="bi bi-image"></i>
                                <span>Optimizar Imágenes</span>
                                <small>Comprime automáticamente</small>
                            </div>
                            <div class="eco-action" onclick="window.sustainabilityManager.enableLazyLoading()">
                                <i class="bi bi-lightning"></i>
                                <span>Carga Inteligente</span>
                                <small>Reduce transferencia de datos</small>
                            </div>
                            <div class="eco-action" onclick="window.sustainabilityManager.minimizeAnimations()">
                                <i class="bi bi-pause-circle"></i>
                                <span>Reducir Animaciones</span>
                                <small>Ahorra procesamiento</small>
                            </div>
                            <div class="eco-action" onclick="window.sustainabilityManager.enableOfflineMode()">
                                <i class="bi bi-wifi-off"></i>
                                <span>Modo Offline</span>
                                <small>Usa caché local</small>
                            </div>
                            <div class="eco-action" onclick="window.sustainabilityManager.calculateTreeOffset()">
                                <i class="bi bi-tree"></i>
                                <span>Compensar CO₂</span>
                                <small>Planta árboles virtuales</small>
                            </div>
                        </div>
                        <div class="carbon-offset">
                            <h5>Compensación de Carbono</h5>
                            <p>Tu navegación ha sido compensada con:</p>
                            <div class="offset-counter">
                                <span class="offset-number" id="trees-planted">0</span>
                                <span class="offset-label">árboles plantados virtuales</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        sustainabilityContainer.style.display = 'none';
        document.body.appendChild(sustainabilityContainer);
        this.addSustainabilityStyles();
        this.setupSustainabilityEventListeners();
    }

    addSustainabilityStyles() {
        const styles = `
            .sustainability-container {
                position: fixed;
                bottom: 200px;
                right: 20px;
                z-index: 9996;
                font-family: 'Inter', sans-serif;
            }

            .eco-toggle {
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
                transition: transform 0.3s ease;
                position: relative;
            }

            .eco-toggle:hover {
                transform: scale(1.1);
            }

            .eco-toggle i {
                font-size: 20px;
                color: white;
            }

            .eco-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #059669;
                color: white;
                border-radius: 8px;
                padding: 2px 6px;
                font-size: 8px;
                font-weight: bold;
                letter-spacing: 0.5px;
            }

            .eco-panel {
                position: absolute;
                bottom: 60px;
                right: 0;
                width: 400px;
                height: 550px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
            }

            .eco-header {
                background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .eco-title {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .eco-title h3 {
                margin: 0;
                font-size: 1.2rem;
                font-weight: 600;
            }

            .eco-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
            }

            .eco-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .eco-tabs {
                display: flex;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
            }

            .eco-tab {
                flex: 1;
                padding: 10px 5px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.3s ease;
                color: #6c757d;
            }

            .eco-tab.active {
                background: white;
                color: #22C55E;
                border-bottom: 2px solid #22C55E;
                font-weight: 600;
            }

            .eco-content {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }

            .eco-tab-content {
                display: none;
            }

            .eco-tab-content.active {
                display: block;
            }

            .carbon-summary {
                margin-bottom: 20px;
            }

            .carbon-metric.main {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
                border-radius: 12px;
                border: 1px solid #A7F3D0;
            }

            .metric-icon {
                font-size: 2rem;
            }

            .metric-info {
                display: flex;
                flex-direction: column;
            }

            .metric-value {
                font-size: 1.8rem;
                font-weight: 700;
                color: #059669;
            }

            .metric-unit {
                font-size: 0.9rem;
                color: #065F46;
                font-weight: 600;
            }

            .metric-label {
                font-size: 0.8rem;
                color: #6B7280;
            }

            .carbon-breakdown h4 {
                font-size: 1rem;
                margin-bottom: 10px;
                color: #374151;
            }

            .breakdown-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #F3F4F6;
            }

            .breakdown-label {
                font-size: 0.85rem;
                color: #6B7280;
            }

            .breakdown-value {
                font-size: 0.85rem;
                font-weight: 600;
                color: #374151;
            }

            .carbon-comparison {
                margin-top: 15px;
                padding: 12px;
                background: #FEF3C7;
                border-radius: 8px;
                border-left: 4px solid #F59E0B;
            }

            .comparison-item {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 5px;
                font-size: 0.85rem;
                color: #92400E;
            }

            .comparison-icon {
                font-size: 1.2rem;
            }

            .energy-metrics h4 {
                font-size: 1rem;
                margin-bottom: 15px;
                color: #374151;
            }

            .energy-metric {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
            }

            .metric-name {
                font-size: 0.8rem;
                color: #6B7280;
                min-width: 100px;
            }

            .metric-bar {
                flex: 1;
                height: 8px;
                background: #E5E7EB;
                border-radius: 4px;
                overflow: hidden;
            }

            .metric-fill {
                height: 100%;
                background: linear-gradient(90deg, #22C55E, #16A34A);
                transition: width 0.5s ease;
            }

            .metric-percent {
                font-size: 0.8rem;
                font-weight: 600;
                color: #374151;
                min-width: 35px;
                text-align: right;
            }

            .energy-tips {
                margin-top: 20px;
            }

            .energy-tips h4 {
                font-size: 1rem;
                margin-bottom: 10px;
                color: #374151;
            }

            .tip-item {
                padding: 8px 12px;
                background: #F0FDF4;
                border-radius: 6px;
                margin-bottom: 8px;
                border-left: 3px solid #22C55E;
            }

            .tip-text {
                font-size: 0.85rem;
                color: #166534;
                line-height: 1.4;
            }

            .goals-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .goals-header h4 {
                font-size: 1rem;
                margin: 0;
                color: #374151;
            }

            .eco-btn {
                padding: 6px 12px;
                border: 1px solid #D1D5DB;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 0.8rem;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .eco-btn:hover {
                background: #F9FAFB;
                transform: translateY(-1px);
            }

            .eco-btn.primary {
                background: #22C55E;
                color: white;
                border-color: #22C55E;
            }

            .eco-btn.primary:hover {
                background: #16A34A;
            }

            .goal-item {
                padding: 12px;
                background: white;
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                margin-bottom: 10px;
            }

            .goal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .goal-title {
                font-size: 0.9rem;
                font-weight: 600;
                color: #374151;
            }

            .goal-status {
                font-size: 0.8rem;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: 600;
            }

            .goal-status.completed {
                background: #D1FAE5;
                color: #065F46;
            }

            .goal-status.in-progress {
                background: #FEF3C7;
                color: #92400E;
            }

            .goal-status.pending {
                background: #F3F4F6;
                color: #6B7280;
            }

            .goal-progress {
                margin-top: 8px;
            }

            .progress-bar {
                height: 6px;
                background: #E5E7EB;
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 5px;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #22C55E, #16A34A);
                transition: width 0.5s ease;
            }

            .sustainability-certificate {
                margin-top: 20px;
                padding: 15px;
                background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
                border-radius: 10px;
                border: 1px solid #F59E0B;
            }

            .certificate-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
            }

            .certificate-header i {
                color: #F59E0B;
                font-size: 1.2rem;
            }

            .certificate-header h5 {
                margin: 0;
                color: #92400E;
                font-size: 1rem;
            }

            .certificate-progress {
                font-size: 0.85rem;
                color: #92400E;
            }

            .actions-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .actions-header h4 {
                font-size: 1rem;
                margin: 0;
                color: #374151;
            }

            .eco-mode-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.85rem;
                color: #6B7280;
            }

            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 24px;
            }

            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #CBD5E1;
                transition: .4s;
                border-radius: 24px;
            }

            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }

            input:checked + .toggle-slider {
                background-color: #22C55E;
            }

            input:checked + .toggle-slider:before {
                transform: translateX(20px);
            }

            .eco-actions-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 20px;
            }

            .eco-action {
                padding: 12px;
                background: white;
                border: 1px solid #E5E7EB;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
            }

            .eco-action:hover {
                background: #F0FDF4;
                border-color: #22C55E;
                transform: translateY(-2px);
            }

            .eco-action i {
                font-size: 1.5rem;
                color: #22C55E;
                margin-bottom: 5px;
                display: block;
            }

            .eco-action span {
                display: block;
                font-size: 0.85rem;
                font-weight: 600;
                color: #374151;
                margin-bottom: 3px;
            }

            .eco-action small {
                font-size: 0.75rem;
                color: #6B7280;
            }

            .carbon-offset {
                background: #F0FDF4;
                padding: 15px;
                border-radius: 10px;
                border: 1px solid #BBF7D0;
                text-align: center;
            }

            .carbon-offset h5 {
                margin: 0 0 8px 0;
                color: #166534;
                font-size: 1rem;
            }

            .carbon-offset p {
                margin: 0 0 10px 0;
                font-size: 0.85rem;
                color: #16A34A;
            }

            .offset-counter {
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .offset-number {
                font-size: 2rem;
                font-weight: 700;
                color: #166534;
            }

            .offset-label {
                font-size: 0.8rem;
                color: #16A34A;
            }

            @media (max-width: 768px) {
                .eco-panel {
                    width: 350px;
                    height: 500px;
                }
                
                .eco-actions-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    setupSustainabilityEventListeners() {
        const toggle = document.getElementById('eco-toggle');
        const panel = document.getElementById('eco-panel');
        const close = document.getElementById('eco-close');

        toggle.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
            this.updateEcoMetrics();
        });

        close.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // Tab switching
        document.querySelectorAll('.eco-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchEcoTab(tabId);
            });
        });

        // Eco mode toggle
        document.getElementById('eco-mode').addEventListener('change', (e) => {
            this.toggleEcoMode(e.target.checked);
        });

        // Add goal button
        document.getElementById('add-goal').addEventListener('click', () => {
            this.addSustainabilityGoal();
        });
    }

    switchEcoTab(tabId) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.eco-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.eco-tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // Load content for the active tab
        this.loadEcoTabContent(tabId);
    }

    loadEcoTabContent(tabId) {
        switch (tabId) {
            case 'carbon':
                this.updateCarbonMetrics();
                break;
            case 'energy':
                this.updateEnergyMetrics();
                this.updateEnergyTips();
                break;
            case 'goals':
                this.loadSustainabilityGoals();
                this.updateCertificationProgress();
                break;
            case 'actions':
                this.updateCarbonOffset();
                break;
        }
    }

    startCarbonTracking() {
        if (!this.config.enableCarbonTracking) return;

        // Track page views
        this.trackPageView();

        // Track data transfer
        this.trackDataTransfer();

        // Track server requests
        this.trackServerRequests();

        // Update metrics periodically
        setInterval(() => {
            this.calculateCarbonFootprint();
            this.updateCarbonMetrics();
        }, 10000); // Every 10 seconds

        console.log('Carbon footprint tracking started');
    }

    trackPageView() {
        this.carbonFootprint.pageViews++;
        this.carbonFootprint.energyConsumption += this.config.energyPerPageView;
        this.saveCarbonData();
    }

    trackDataTransfer() {
        // Monitor network requests
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            return originalFetch(...args).then(response => {
                // Estimate data transfer size
                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    this.carbonFootprint.dataTransfer += parseInt(contentLength);
                } else {
                    // Estimate based on response type
                    this.carbonFootprint.dataTransfer += 1024; // 1KB estimate
                }
                this.saveCarbonData();
                return response;
            });
        };

        // Monitor image loading
        document.addEventListener('load', (e) => {
            if (e.target.tagName === 'IMG') {
                // Estimate image size
                this.carbonFootprint.dataTransfer += 50 * 1024; // 50KB estimate
                this.saveCarbonData();
            }
        }, true);
    }

    trackServerRequests() {
        // Track AJAX requests
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(...args) {
            this.addEventListener('load', () => {
                window.sustainabilityManager.carbonFootprint.serverRequests++;
                window.sustainabilityManager.saveCarbonData();
            });
            return originalXHROpen.apply(this, args);
        };
    }

    calculateCarbonFootprint() {
        // Calculate CO2 from energy consumption
        const energyCO2 = this.carbonFootprint.energyConsumption * this.config.co2PerKWh;
        
        // Calculate CO2 from data transfer
        const dataCO2 = this.carbonFootprint.dataTransfer * this.config.dataTransferEmissionFactor;
        
        // Calculate CO2 from server requests (estimate)
        const serverCO2 = this.carbonFootprint.serverRequests * 0.0001; // 0.1g per request
        
        this.carbonFootprint.co2Emissions = energyCO2 + dataCO2 + serverCO2;
    }

    implementEcoOptimizations() {
        if (!this.config.enableEcoOptimizations) return;

        this.implementImageOptimization();
        this.implementLazyLoading();
        this.implementCSSOptimization();
        this.implementCacheOptimization();

        console.log('Eco optimizations implemented');
    }

    implementImageOptimization() {
        const images = document.querySelectorAll('img');
        let optimizedCount = 0;

        images.forEach(img => {
            // Add loading="lazy" if not present
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
                optimizedCount++;
            }

            // Optimize image format suggestions
            if (img.src && !img.src.includes('.webp')) {
                // Could suggest WebP format
                this.ecoOptimizations.set('webp-suggestion', {
                    type: 'image-format',
                    impact: 'medium',
                    description: 'Considerar formato WebP para mejor compresión'
                });
            }
        });

        this.ecoOptimizations.set('lazy-loading', {
            type: 'image-optimization',
            optimized: optimizedCount,
            total: images.length,
            percentage: images.length > 0 ? (optimizedCount / images.length) * 100 : 0
        });
    }

    implementLazyLoading() {
        // Implement intersection observer for elements
        if ('IntersectionObserver' in window) {
            const lazyElements = document.querySelectorAll('[data-src]');
            
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                });
            });

            lazyElements.forEach(img => imageObserver.observe(img));

            this.ecoOptimizations.set('intersection-observer', {
                type: 'lazy-loading',
                enabled: true,
                elements: lazyElements.length
            });
        }
    }

    implementCSSOptimization() {
        // Analyze CSS usage
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        const inlineStyles = document.querySelectorAll('style');

        this.ecoOptimizations.set('css-optimization', {
            type: 'css',
            external: stylesheets.length,
            inline: inlineStyles.length,
            suggestion: 'Combinar y minificar archivos CSS'
        });
    }

    implementCacheOptimization() {
        // Check cache headers and suggest improvements
        this.ecoOptimizations.set('cache-optimization', {
            type: 'caching',
            serviceWorker: 'serviceWorker' in navigator,
            localStorage: typeof Storage !== 'undefined',
            suggestion: 'Implementar Service Worker para cache offline'
        });
    }

    setupGreenMetrics() {
        if (!this.config.enableGreenMetrics) return;

        this.greenMetrics.set('performance', this.calculatePerformanceScore());
        this.greenMetrics.set('accessibility', this.calculateAccessibilityScore());
        this.greenMetrics.set('sustainability', this.calculateSustainabilityScore());

        // Update metrics periodically
        setInterval(() => {
            this.updateGreenMetrics();
        }, 30000); // Every 30 seconds

        console.log('Green metrics tracking initialized');
    }

    calculatePerformanceScore() {
        // Basic performance metrics
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
            const score = Math.max(0, 100 - (loadTime / 50)); // Penalize slow loading
            return Math.min(100, score);
        }
        return 0;
    }

    calculateAccessibilityScore() {
        let score = 100;
        
        // Check for alt text
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
        score -= imagesWithoutAlt.length * 5;
        
        // Check for form labels
        const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        score -= inputsWithoutLabels.length * 10;
        
        return Math.max(0, score);
    }

    calculateSustainabilityScore() {
        let score = 100;
        
        // Penalize high data transfer
        if (this.carbonFootprint.dataTransfer > 1024 * 1024) { // > 1MB
            score -= 20;
        }
        
        // Reward optimizations
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        const totalImages = document.querySelectorAll('img');
        if (totalImages.length > 0) {
            score += (lazyImages.length / totalImages.length) * 20;
        }
        
        return Math.max(0, Math.min(100, score));
    }

    initializeSustainabilityGoals() {
        const defaultGoals = [
            {
                id: 1,
                title: 'Reducir emisiones de CO₂ en 25%',
                description: 'Optimizar transferencia de datos y eficiencia energética',
                target: 0.25,
                current: 0.12,
                status: 'in-progress',
                deadline: '2025-06-30'
            },
            {
                id: 2,
                title: 'Implementar lazy loading en todas las imágenes',
                description: 'Mejorar tiempo de carga y reducir consumo de datos',
                target: 100,
                current: 75,
                status: 'in-progress',
                deadline: '2025-03-31'
            },
            {
                id: 3,
                title: 'Certificación verde del sitio web',
                description: 'Obtener certificación de sostenibilidad web',
                target: 100,
                current: 45,
                status: 'in-progress',
                deadline: '2025-12-31'
            }
        ];

        defaultGoals.forEach(goal => {
            this.sustainabilityGoals.set(goal.id, goal);
        });
    }

    setupEnergyMonitoring() {
        // Monitor CPU usage (approximate)
        let lastTime = performance.now();
        let frameCount = 0;

        const monitorPerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) { // Every second
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                // Estimate energy consumption based on FPS
                const energyFactor = fps < 30 ? 0.5 : fps < 60 ? 1.0 : 1.5;
                this.energyEfficiencyData.set('fps', fps);
                this.energyEfficiencyData.set('energyFactor', energyFactor);
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(monitorPerformance);
        };

        requestAnimationFrame(monitorPerformance);
    }

    loadSustainabilityData() {
        const saved = localStorage.getItem('sustainability_data');
        if (saved) {
            const data = JSON.parse(saved);
            this.carbonFootprint = { ...this.carbonFootprint, ...data.carbonFootprint };
            
            // Load goals
            if (data.goals) {
                data.goals.forEach(goal => {
                    this.sustainabilityGoals.set(goal.id, goal);
                });
            }
        }
    }

    saveSustainabilityData() {
        const data = {
            carbonFootprint: this.carbonFootprint,
            goals: Array.from(this.sustainabilityGoals.values()),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('sustainability_data', JSON.stringify(data));
    }

    saveCarbonData() {
        this.saveSustainabilityData();
    }

    updateEcoMetrics() {
        this.calculateCarbonFootprint();
        this.updateCarbonMetrics();
        this.updateEnergyMetrics();
    }

    updateCarbonMetrics() {
        document.getElementById('total-co2').textContent = this.carbonFootprint.co2Emissions.toFixed(3);
        
        // Update breakdown
        const dataCO2 = this.carbonFootprint.dataTransfer * this.config.dataTransferEmissionFactor;
        const serverCO2 = this.carbonFootprint.serverRequests * 0.0001;
        const deviceCO2 = this.carbonFootprint.energyConsumption * this.config.co2PerKWh;
        
        document.getElementById('data-co2').textContent = `${dataCO2.toFixed(4)} kg CO₂`;
        document.getElementById('server-co2').textContent = `${serverCO2.toFixed(4)} kg CO₂`;
        document.getElementById('device-co2').textContent = `${deviceCO2.toFixed(4)} kg CO₂`;
        
        // Update comparisons
        const carEquivalent = Math.round(this.carbonFootprint.co2Emissions * 4000); // 4km per kg CO2
        const treeOffset = Math.ceil(this.carbonFootprint.co2Emissions * 40); // 40 trees per kg CO2
        
        document.getElementById('car-equivalent').textContent = carEquivalent;
        document.getElementById('tree-offset').textContent = treeOffset;
    }

    updateEnergyMetrics() {
        // Image optimization
        const imageOpt = this.ecoOptimizations.get('lazy-loading') || { percentage: 0 };
        document.getElementById('image-optimization').style.width = `${imageOpt.percentage}%`;
        document.getElementById('image-optimization-text').textContent = `${Math.round(imageOpt.percentage)}%`;
        
        // Compression (simulate)
        const compressionScore = Math.random() * 40 + 50; // 50-90%
        document.getElementById('compression').style.width = `${compressionScore}%`;
        document.getElementById('compression-text').textContent = `${Math.round(compressionScore)}%`;
        
        // Lazy loading
        const lazyScore = imageOpt.percentage || 0;
        document.getElementById('lazy-loading').style.width = `${lazyScore}%`;
        document.getElementById('lazy-loading-text').textContent = `${Math.round(lazyScore)}%`;
        
        // CDN usage (simulate)
        const cdnScore = Math.random() * 30 + 60; // 60-90%
        document.getElementById('cdn-usage').style.width = `${cdnScore}%`;
        document.getElementById('cdn-usage-text').textContent = `${Math.round(cdnScore)}%`;
    }

    updateEnergyTips() {
        const tips = [
            'Optimiza imágenes usando formatos modernos como WebP',
            'Implementa lazy loading para reducir carga inicial',
            'Minifica y combina archivos CSS y JavaScript',
            'Utiliza CDN para reducir latencia y consumo energético',
            'Activa el modo oscuro para ahorrar energía de pantalla',
            'Implementa service workers para cache offline'
        ];
        
        const tipsList = document.getElementById('energy-tips-list');
        tipsList.innerHTML = tips.slice(0, 3).map(tip => `
            <div class="tip-item">
                <div class="tip-text">${tip}</div>
            </div>
        `).join('');
    }

    loadSustainabilityGoals() {
        const goalsList = document.getElementById('goals-list');
        
        goalsList.innerHTML = Array.from(this.sustainabilityGoals.values()).map(goal => {
            const progressPercent = (goal.current / goal.target) * 100;
            return `
                <div class="goal-item">
                    <div class="goal-header">
                        <div class="goal-title">${goal.title}</div>
                        <div class="goal-status ${goal.status}">${this.getStatusText(goal.status)}</div>
                    </div>
                    <div class="goal-description">${goal.description}</div>
                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <small>${Math.round(progressPercent)}% completado - Fecha límite: ${this.formatDate(goal.deadline)}</small>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateCertificationProgress() {
        const avgProgress = Array.from(this.sustainabilityGoals.values())
            .reduce((sum, goal) => sum + (goal.current / goal.target), 0) / this.sustainabilityGoals.size * 100;
        
        document.getElementById('certification-progress').style.width = `${avgProgress}%`;
        document.getElementById('certification-percent').textContent = `${Math.round(avgProgress)}%`;
    }

    updateCarbonOffset() {
        const treesPlanted = Math.ceil(this.carbonFootprint.co2Emissions * 40);
        document.getElementById('trees-planted').textContent = treesPlanted;
    }

    addSustainabilityGoal() {
        const title = prompt('Título del objetivo:');
        if (!title) return;
        
        const description = prompt('Descripción:');
        if (!description) return;
        
        const target = parseFloat(prompt('Meta (valor numérico):')) || 100;
        const deadline = prompt('Fecha límite (YYYY-MM-DD):') || '2025-12-31';
        
        const newGoal = {
            id: Date.now(),
            title: title,
            description: description,
            target: target,
            current: 0,
            status: 'pending',
            deadline: deadline
        };
        
        this.sustainabilityGoals.set(newGoal.id, newGoal);
        this.loadSustainabilityGoals();
        this.saveSustainabilityData();
        this.showEcoNotification('Objetivo de sostenibilidad agregado');
    }

    toggleEcoMode(enabled) {
        if (enabled) {
            this.enableEcoMode();
        } else {
            this.disableEcoMode();
        }
    }

    enableEcoMode() {
        document.body.classList.add('eco-mode');
        this.optimizeForEcoMode();
        this.showEcoNotification('Modo Eco activado - Consumo energético reducido');
    }

    disableEcoMode() {
        document.body.classList.remove('eco-mode');
        this.showEcoNotification('Modo Eco desactivado');
    }

    optimizeForEcoMode() {
        // Reduce animations
        this.minimizeAnimations();
        
        // Optimize images
        this.optimizeImages();
        
        // Enable power-saving features
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
    }

    enableDarkMode() {
        document.body.classList.add('dark-mode');
        this.showEcoNotification('Modo oscuro activado - Ahorro energético de pantalla');
    }

    optimizeImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
        });
        this.showEcoNotification('Imágenes optimizadas para eco-eficiencia');
    }

    enableLazyLoading() {
        this.implementLazyLoading();
        this.showEcoNotification('Carga inteligente activada');
    }

    minimizeAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            .eco-mode * {
                animation-duration: 0.1s !important;
                transition-duration: 0.1s !important;
            }
        `;
        document.head.appendChild(style);
        this.showEcoNotification('Animaciones reducidas para ahorrar energía');
    }

    enableOfflineMode() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => {
                    this.showEcoNotification('Modo offline habilitado - Reduce transferencia de datos');
                })
                .catch(() => {
                    this.showEcoNotification('No se pudo habilitar el modo offline');
                });
        } else {
            this.showEcoNotification('Modo offline no soportado en este navegador');
        }
    }

    calculateTreeOffset() {
        const treesNeeded = Math.ceil(this.carbonFootprint.co2Emissions * 40);
        const currentTrees = parseInt(localStorage.getItem('virtual_trees_planted') || '0');
        const newTotal = currentTrees + treesNeeded;
        
        localStorage.setItem('virtual_trees_planted', newTotal.toString());
        this.updateCarbonOffset();
        
        this.showEcoNotification(`¡${treesNeeded} árboles virtuales plantados! Total: ${newTotal}`);
    }

    updateGreenMetrics() {
        this.greenMetrics.set('performance', this.calculatePerformanceScore());
        this.greenMetrics.set('accessibility', this.calculateAccessibilityScore());
        this.greenMetrics.set('sustainability', this.calculateSustainabilityScore());
    }

    getStatusText(status) {
        const statusMap = {
            'completed': 'Completado',
            'in-progress': 'En Progreso',
            'pending': 'Pendiente'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    showEcoNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'eco-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #22C55E, #16A34A);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 99999;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
            animation: slideInFromRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutToRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Export sustainability report
    exportSustainabilityReport() {
        const report = {
            timestamp: new Date().toISOString(),
            carbonFootprint: this.carbonFootprint,
            greenMetrics: Object.fromEntries(this.greenMetrics),
            ecoOptimizations: Object.fromEntries(this.ecoOptimizations),
            sustainabilityGoals: Array.from(this.sustainabilityGoals.values()),
            energyEfficiency: Object.fromEntries(this.energyEfficiencyData)
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sustainability-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showEcoNotification('Reporte de sostenibilidad exportado');
    }
}

// Initialize Sustainability Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sustainabilityManager = new SustainabilityManager();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SustainabilityManager;
}