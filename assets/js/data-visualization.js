// data-visualization.js - Advanced Data Visualization Components for Dataconecta

class DataVisualization {
    constructor() {
        this.charts = new Map();
        this.themes = {
            dark: {
                background: '#0A1128',
                foreground: '#FFFFFF',
                primary: '#00F0FF',
                secondary: '#5271FF',
                grid: 'rgba(255, 255, 255, 0.1)',
                text: '#FFFFFF'
            },
            light: {
                background: '#FFFFFF',
                foreground: '#0A1128',
                primary: '#00F0FF',
                secondary: '#5271FF',
                grid: 'rgba(0, 0, 0, 0.1)',
                text: '#0A1128'
            }
        };
        this.currentTheme = 'dark';
        this.init();
    }

    init() {
        this.createVisualizationComponents();
        this.setupEventListeners();
        this.loadSampleData();
        console.log('Data Visualization system initialized');
    }

    createVisualizationComponents() {
        // Create main visualization container
        const vizContainer = document.createElement('div');
        vizContainer.id = 'data-viz-container';
        vizContainer.className = 'data-viz-container';
        vizContainer.innerHTML = `
            <div class="viz-header">
                <h3>Panel de Visualización de Datos</h3>
                <div class="viz-controls">
                    <button id="viz-refresh" class="viz-btn">
                        <i class="bi bi-arrow-clockwise"></i> Actualizar
                    </button>
                    <button id="viz-fullscreen" class="viz-btn">
                        <i class="bi bi-fullscreen"></i> Pantalla Completa
                    </button>
                    <button id="viz-export" class="viz-btn">
                        <i class="bi bi-download"></i> Exportar
                    </button>
                </div>
            </div>
            <div class="viz-content">
                <div class="viz-grid">
                    <div class="viz-card" id="performance-chart">
                        <div class="viz-card-header">
                            <h4>Rendimiento del Sitio Web</h4>
                            <div class="viz-options">
                                <select id="performance-period">
                                    <option value="7d">Últimos 7 días</option>
                                    <option value="30d">Últimos 30 días</option>
                                    <option value="90d">Últimos 90 días</option>
                                </select>
                            </div>
                        </div>
                        <div class="viz-card-body">
                            <canvas id="performance-canvas"></canvas>
                        </div>
                    </div>
                    
                    <div class="viz-card" id="user-analytics">
                        <div class="viz-card-header">
                            <h4>Analítica de Usuarios</h4>
                            <div class="viz-metrics">
                                <div class="metric">
                                    <span class="metric-value" id="total-users">1,234</span>
                                    <span class="metric-label">Visitantes</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-value" id="bounce-rate">68%</span>
                                    <span class="metric-label">Tasa de Rebote</span>
                                </div>
                            </div>
                        </div>
                        <div class="viz-card-body">
                            <canvas id="user-canvas"></canvas>
                        </div>
                    </div>
                    
                    <div class="viz-card" id="conversion-funnel">
                        <div class="viz-card-header">
                            <h4>Embudo de Conversión</h4>
                        </div>
                        <div class="viz-card-body">
                            <canvas id="funnel-canvas"></canvas>
                        </div>
                    </div>
                    
                    <div class="viz-card" id="revenue-chart">
                        <div class="viz-card-header">
                            <h4>Proyección de Ingresos</h4>
                        </div>
                        <div class="viz-card-body">
                            <canvas id="revenue-canvas"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to body (hidden by default)
        vizContainer.style.display = 'none';
        document.body.appendChild(vizContainer);
        this.addVisualizationStyles();
    }

    addVisualizationStyles() {
        const styles = `
            .data-viz-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--primary-dark);
                z-index: 10000;
                padding: 20px;
                box-sizing: border-box;
                overflow-y: auto;
            }

            .viz-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .viz-header h3 {
                color: var(--text-primary);
                margin: 0;
                font-size: 1.8rem;
                font-weight: 600;
            }

            .viz-controls {
                display: flex;
                gap: 10px;
            }

            .viz-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: var(--text-primary);
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .viz-btn:hover {
                background: var(--accent-primary);
                border-color: var(--accent-primary);
                color: var(--primary-dark);
            }

            .viz-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
            }

            .viz-card {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                backdrop-filter: blur(10px);
            }

            .viz-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .viz-card-header h4 {
                color: var(--text-primary);
                margin: 0;
                font-size: 1.2rem;
                font-weight: 600;
            }

            .viz-options select {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: var(--text-primary);
                padding: 5px 10px;
                border-radius: 6px;
                font-size: 12px;
            }

            .viz-metrics {
                display: flex;
                gap: 20px;
            }

            .metric {
                text-align: center;
            }

            .metric-value {
                display: block;
                font-size: 1.5rem;
                font-weight: bold;
                color: var(--accent-primary);
            }

            .metric-label {
                font-size: 0.9rem;
                color: var(--text-secondary);
            }

            .viz-card-body {
                height: 300px;
                position: relative;
            }

            .viz-card-body canvas {
                width: 100% !important;
                height: 100% !important;
            }

            @media (max-width: 768px) {
                .viz-grid {
                    grid-template-columns: 1fr;
                }
                
                .viz-controls {
                    flex-direction: column;
                    gap: 5px;
                }
                
                .viz-header {
                    flex-direction: column;
                    align-items: stretch;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    setupEventListeners() {
        // Add visualization toggle to navigation
        const navItems = document.querySelectorAll('.navbar-nav');
        if (navItems.length > 0) {
            const vizToggle = document.createElement('li');
            vizToggle.className = 'nav-item';
            vizToggle.innerHTML = `
                <a class="nav-link" href="#" id="viz-toggle">
                    <i class="bi bi-bar-chart"></i> Analytics
                </a>
            `;
            navItems[0].appendChild(vizToggle);

            document.getElementById('viz-toggle').addEventListener('click', (e) => {
                e.preventDefault();
                this.showVisualization();
            });
        }

        // Setup visualization controls
        document.addEventListener('click', (e) => {
            if (e.target.id === 'viz-refresh') {
                this.refreshData();
            } else if (e.target.id === 'viz-fullscreen') {
                this.toggleFullscreen();
            } else if (e.target.id === 'viz-export') {
                this.exportData();
            }
        });

        // Close visualization with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.hideVisualization();
            }
        });

        // Close visualization by clicking outside
        document.getElementById('data-viz-container').addEventListener('click', (e) => {
            if (e.target.id === 'data-viz-container') {
                this.hideVisualization();
            }
        });
    }

    showVisualization() {
        const container = document.getElementById('data-viz-container');
        container.style.display = 'block';
        document.body.style.overflow = 'hidden';
        this.renderAllCharts();
    }

    hideVisualization() {
        const container = document.getElementById('data-viz-container');
        container.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    isVisible() {
        const container = document.getElementById('data-viz-container');
        return container.style.display !== 'none';
    }

    loadSampleData() {
        // Generate sample data for demonstrations
        this.sampleData = {
            performance: this.generatePerformanceData(),
            users: this.generateUserData(),
            funnel: this.generateFunnelData(),
            revenue: this.generateRevenueData()
        };
    }

    generatePerformanceData() {
        const days = 30;
        const data = [];
        const labels = [];
        
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }));
            
            // Simulate page load times (1-5 seconds)
            data.push({
                loadTime: Math.random() * 4 + 1,
                firstContentfulPaint: Math.random() * 2 + 0.5,
                timeToInteractive: Math.random() * 3 + 2
            });
        }
        
        return { labels, data };
    }

    generateUserData() {
        const hours = 24;
        const data = [];
        const labels = [];
        
        for (let i = 0; i < hours; i++) {
            labels.push(`${i}:00`);
            data.push(Math.floor(Math.random() * 100 + 20));
        }
        
        return { labels, data };
    }

    generateFunnelData() {
        return [
            { stage: 'Visitantes', value: 10000, color: '#00F0FF' },
            { stage: 'Interesados', value: 3500, color: '#5271FF' },
            { stage: 'Consultores', value: 1200, color: '#8B5CF6' },
            { stage: 'Propuestas', value: 400, color: '#F59E0B' },
            { stage: 'Conversiones', value: 150, color: '#10B981' }
        ];
    }

    generateRevenueData() {
        const months = 12;
        const data = [];
        const labels = [];
        
        for (let i = months; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            labels.push(date.toLocaleDateString('es-ES', { month: 'long' }));
            
            // Simulate revenue growth
            const baseRevenue = 50000;
            const growth = Math.random() * 0.3 + 0.9; // 90-120% of previous
            data.push(baseRevenue * growth * (1 + i * 0.1));
        }
        
        return { labels, data };
    }

    renderAllCharts() {
        this.renderPerformanceChart();
        this.renderUserChart();
        this.renderFunnelChart();
        this.renderRevenueChart();
    }

    renderPerformanceChart() {
        const canvas = document.getElementById('performance-canvas');
        const ctx = canvas.getContext('2d');
        
        // Simple chart implementation (would use Chart.js in production)
        this.drawLineChart(ctx, this.sampleData.performance, {
            title: 'Tiempo de Carga (segundos)',
            color: this.themes[this.currentTheme].primary
        });
    }

    renderUserChart() {
        const canvas = document.getElementById('user-canvas');
        const ctx = canvas.getContext('2d');
        
        this.drawBarChart(ctx, this.sampleData.users, {
            title: 'Usuarios por Hora',
            color: this.themes[this.currentTheme].secondary
        });
    }

    renderFunnelChart() {
        const canvas = document.getElementById('funnel-canvas');
        const ctx = canvas.getContext('2d');
        
        this.drawFunnelChart(ctx, this.sampleData.funnel);
    }

    renderRevenueChart() {
        const canvas = document.getElementById('revenue-canvas');
        const ctx = canvas.getContext('2d');
        
        this.drawAreaChart(ctx, this.sampleData.revenue, {
            title: 'Ingresos Proyectados (€)',
            color: this.themes[this.currentTheme].primary
        });
    }

    drawLineChart(ctx, data, options) {
        const { width, height } = ctx.canvas;
        const theme = this.themes[this.currentTheme];
        
        // Clear canvas
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw line
        if (data.data && data.data.length > 0) {
            ctx.strokeStyle = options.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            const maxValue = Math.max(...data.data.map(d => d.loadTime));
            
            data.data.forEach((point, index) => {
                const x = (width / (data.data.length - 1)) * index;
                const y = height - (point.loadTime / maxValue) * height;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
        
        // Add title
        ctx.fillStyle = theme.text;
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(options.title, width / 2, 20);
    }

    drawBarChart(ctx, data, options) {
        const { width, height } = ctx.canvas;
        const theme = this.themes[this.currentTheme];
        
        // Clear canvas
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        if (data.data && data.data.length > 0) {
            const barWidth = width / data.data.length * 0.8;
            const maxValue = Math.max(...data.data);
            
            data.data.forEach((value, index) => {
                const x = (width / data.data.length) * index + (width / data.data.length - barWidth) / 2;
                const barHeight = (value / maxValue) * (height - 40);
                const y = height - barHeight - 20;
                
                // Draw bar
                ctx.fillStyle = options.color;
                ctx.fillRect(x, y, barWidth, barHeight);
                
                // Draw value label
                ctx.fillStyle = theme.text;
                ctx.font = '12px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
            });
        }
        
        // Add title
        ctx.fillStyle = theme.text;
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(options.title, width / 2, 20);
    }

    drawFunnelChart(ctx, data) {
        const { width, height } = ctx.canvas;
        const theme = this.themes[this.currentTheme];
        
        // Clear canvas
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        if (data && data.length > 0) {
            const stageHeight = (height - 40) / data.length;
            const maxValue = data[0].value;
            
            data.forEach((stage, index) => {
                const stageWidth = (stage.value / maxValue) * (width - 100);
                const x = (width - stageWidth) / 2;
                const y = 20 + index * stageHeight;
                
                // Draw stage rectangle
                ctx.fillStyle = stage.color;
                ctx.fillRect(x, y, stageWidth, stageHeight - 10);
                
                // Draw stage label
                ctx.fillStyle = theme.text;
                ctx.font = '12px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(
                    `${stage.stage}: ${stage.value.toLocaleString()}`,
                    width / 2,
                    y + stageHeight / 2
                );
            });
        }
    }

    drawAreaChart(ctx, data, options) {
        const { width, height } = ctx.canvas;
        const theme = this.themes[this.currentTheme];
        
        // Clear canvas
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        if (data.data && data.data.length > 0) {
            const maxValue = Math.max(...data.data);
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, options.color + '80');
            gradient.addColorStop(1, options.color + '20');
            
            // Draw area
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, height);
            
            data.data.forEach((value, index) => {
                const x = (width / (data.data.length - 1)) * index;
                const y = height - (value / maxValue) * (height - 40);
                ctx.lineTo(x, y);
            });
            
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
            
            // Draw line
            ctx.strokeStyle = options.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            data.data.forEach((value, index) => {
                const x = (width / (data.data.length - 1)) * index;
                const y = height - (value / maxValue) * (height - 40);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
        
        // Add title
        ctx.fillStyle = theme.text;
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(options.title, width / 2, 20);
    }

    refreshData() {
        this.loadSampleData();
        this.renderAllCharts();
        
        // Update metrics
        document.getElementById('total-users').textContent = Math.floor(Math.random() * 5000 + 1000).toLocaleString();
        document.getElementById('bounce-rate').textContent = Math.floor(Math.random() * 30 + 50) + '%';
        
        console.log('Data refreshed');
    }

    toggleFullscreen() {
        const container = document.getElementById('data-viz-container');
        
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.log('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    exportData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            performance: this.sampleData.performance,
            users: this.sampleData.users,
            funnel: this.sampleData.funnel,
            revenue: this.sampleData.revenue
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `dataconecta-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        console.log('Data exported');
    }

    // Real-time data updates
    startRealTimeUpdates() {
        setInterval(() => {
            if (this.isVisible()) {
                // Update only current hour in user chart
                const currentHour = new Date().getHours();
                this.sampleData.users.data[currentHour] = Math.floor(Math.random() * 100 + 20);
                this.renderUserChart();
                
                // Update metrics
                const currentUsers = parseInt(document.getElementById('total-users').textContent.replace(',', ''));
                const change = Math.floor(Math.random() * 20 - 10); // -10 to +10
                document.getElementById('total-users').textContent = Math.max(0, currentUsers + change).toLocaleString();
            }
        }, 10000); // Every 10 seconds
    }
}

// Initialize Data Visualization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dataVisualization = new DataVisualization();
    window.dataVisualization.startRealTimeUpdates();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataVisualization;
}