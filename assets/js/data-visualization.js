// Advanced Data Visualization Components for Dataconecta

class DataVisualization {
    constructor() {
        this.charts = new Map();
        this.animationOptions = {
            duration: 1000,
            easing: 'easeInOutQuart'
        };
        this.colors = {
            primary: '#00F0FF',
            secondary: '#5271FF',
            accent: '#1C2E5C',
            success: '#2ed573',
            warning: '#ffa502',
            danger: '#ff4757',
            gradient: ['#00F0FF', '#5271FF', '#1C2E5C']
        };
        this.init();
    }

    init() {
        this.createDashboardStyles();
        this.initializeCharts();
        this.setupInteractiveElements();
    }

    createDashboardStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .data-dashboard {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(0, 240, 255, 0.2);
                border-radius: 15px;
                padding: 25px;
                margin: 20px 0;
                backdrop-filter: blur(10px);
            }
            
            .chart-container {
                position: relative;
                height: 300px;
                margin: 20px 0;
                background: rgba(255, 255, 255, 0.02);
                border-radius: 10px;
                padding: 15px;
            }
            
            .chart-title {
                color: var(--text-primary);
                font-weight: 600;
                margin-bottom: 15px;
                text-align: center;
            }
            
            .metric-card {
                background: linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(82, 113, 255, 0.1));
                border: 1px solid rgba(0, 240, 255, 0.2);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .metric-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(0, 240, 255, 0.2);
            }
            
            .metric-value {
                font-size: 2.5rem;
                font-weight: bold;
                color: var(--accent-primary);
                margin-bottom: 10px;
                font-family: 'Montserrat', sans-serif;
            }
            
            .metric-label {
                color: var(--text-secondary);
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .metric-change {
                font-size: 0.8rem;
                margin-top: 8px;
                padding: 4px 8px;
                border-radius: 12px;
            }
            
            .metric-change.positive {
                background: rgba(46, 213, 115, 0.2);
                color: #2ed573;
            }
            
            .metric-change.negative {
                background: rgba(255, 71, 87, 0.2);
                color: #ff4757;
            }
            
            .interactive-legend {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                justify-content: center;
                margin-top: 15px;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.9rem;
            }
            
            .legend-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .legend-color {
                width: 12px;
                height: 12px;
                border-radius: 50%;
            }
            
            @keyframes countUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .metric-card.animate {
                animation: countUp 0.6s ease-out;
            }
        `;
        document.head.appendChild(style);
    }

    initializeCharts() {
        // Initialize performance metrics dashboard
        this.createPerformanceDashboard();
        
        // Initialize project success rates
        this.createProjectSuccessChart();
        
        // Initialize industry distribution
        this.createIndustryChart();
        
        // Initialize client satisfaction metrics
        this.createSatisfactionChart();
        
        // Initialize ROI demonstration
        this.createROIChart();
    }

    createPerformanceDashboard() {
        const dashboardHTML = `
            <div class="data-dashboard">
                <h3 class="chart-title">Panel de Rendimiento en Tiempo Real</h3>
                <div class="row g-3">
                    <div class="col-md-3">
                        <div class="metric-card" data-metric="projects">
                            <div class="metric-value" id="projects-count">0</div>
                            <div class="metric-label">Proyectos Completados</div>
                            <div class="metric-change positive">+15% este mes</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card" data-metric="satisfaction">
                            <div class="metric-value" id="satisfaction-rate">0%</div>
                            <div class="metric-label">Satisfacción Cliente</div>
                            <div class="metric-change positive">+3% vs anterior</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card" data-metric="industries">
                            <div class="metric-value" id="industries-count">0</div>
                            <div class="metric-label">Industrias Atendidas</div>
                            <div class="metric-change positive">+2 nuevas</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="metric-card" data-metric="experience">
                            <div class="metric-value" id="experience-years">0+</div>
                            <div class="metric-label">Años de Experiencia</div>
                            <div class="metric-change positive">Creciendo</div>
                        </div>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="performance-chart"></canvas>
                </div>
            </div>
        `;

        const container = document.querySelector('.hero-section') || document.body;
        const dashboardElement = document.createElement('div');
        dashboardElement.innerHTML = dashboardHTML;
        
        // Insert after hero section
        if (container.nextSibling) {
            container.parentNode.insertBefore(dashboardElement, container.nextSibling);
        } else {
            container.parentNode.appendChild(dashboardElement);
        }

        // Animate counters
        this.animateCounters();
        
        // Create performance chart
        this.createPerformanceChart();
    }

    animateCounters() {
        const counters = [
            { id: 'projects-count', target: 120, suffix: '' },
            { id: 'satisfaction-rate', target: 98, suffix: '%' },
            { id: 'industries-count', target: 15, suffix: '+' },
            { id: 'experience-years', target: 5, suffix: '+' }
        ];

        counters.forEach(counter => {
            const element = document.getElementById(counter.id);
            if (element) {
                this.animateValue(element, 0, counter.target, 2000, counter.suffix);
            }
        });
    }

    animateValue(element, start, end, duration, suffix = '') {
        const range = end - start;
        const minTimer = 50;
        const stepTime = Math.abs(Math.floor(duration / range));
        const timer = Math.max(stepTime, minTimer);
        
        const startTime = new Date().getTime();
        const endTime = startTime + duration;
        
        const run = () => {
            const now = new Date().getTime();
            const remaining = Math.max((endTime - now) / duration, 0);
            const value = Math.round(end - (remaining * range));
            
            element.textContent = value + suffix;
            
            if (value !== end) {
                requestAnimationFrame(run);
            }
        };
        
        run();
    }

    createPerformanceChart() {
        const ctx = document.getElementById('performance-chart');
        if (!ctx) return;

        // Create a simple chart using Canvas API since Chart.js might not be loaded
        this.drawPerformanceChart(ctx);
    }

    drawPerformanceChart(canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        
        // Sample data
        const data = [85, 92, 78, 96, 88, 94, 91, 89, 93, 97, 95, 98];
        const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Calculate coordinates
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        const stepX = chartWidth / (data.length - 1);
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const valueRange = maxValue - minValue;
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Draw chart line
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (stepX * index);
            const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#00F0FF';
        data.forEach((value, index) => {
            const x = padding + (stepX * index);
            const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw labels
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        
        labels.forEach((label, index) => {
            const x = padding + (stepX * index);
            ctx.fillText(label, x, height - 10);
        });
    }

    createProjectSuccessChart() {
        // Implementation for project success visualization
        console.log('Project success chart initialized');
    }

    createIndustryChart() {
        // Implementation for industry distribution chart
        console.log('Industry chart initialized');
    }

    createSatisfactionChart() {
        // Implementation for satisfaction metrics
        console.log('Satisfaction chart initialized');
    }

    createROIChart() {
        // Implementation for ROI demonstration
        console.log('ROI chart initialized');
    }

    setupInteractiveElements() {
        // Add click handlers for metric cards
        document.addEventListener('click', (e) => {
            const metricCard = e.target.closest('.metric-card');
            if (metricCard) {
                this.handleMetricCardClick(metricCard);
            }
        });
        
        // Setup chart interactions
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('.chart-container')) {
                this.showChartTooltip(e);
            }
        });
    }

    handleMetricCardClick(card) {
        const metric = card.getAttribute('data-metric');
        
        // Add animation class
        card.classList.add('animate');
        setTimeout(() => card.classList.remove('animate'), 600);
        
        // Show detailed information
        this.showMetricDetails(metric);
    }

    showMetricDetails(metric) {
        const details = {
            projects: 'Hemos completado más de 120 proyectos exitosos en diversas industrias, manteniendo un enfoque en la calidad y resultados medibles.',
            satisfaction: 'Nuestro índice de satisfacción del cliente del 98% refleja nuestro compromiso con la excelencia en cada proyecto.',
            industries: 'Trabajamos con más de 15 industrias diferentes, adaptando nuestras soluciones a las necesidades específicas de cada sector.',
            experience: 'Con más de 5 años de experiencia en el mercado, hemos desarrollado metodologías probadas y efectivas.'
        };
        
        // Create modal or tooltip with detailed information
        this.showTooltip(details[metric] || 'Información detallada no disponible');
    }

    showTooltip(message) {
        // Simple tooltip implementation
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(10, 17, 40, 0.95);
            color: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #00F0FF;
            max-width: 400px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        `;
        tooltip.textContent = message;
        
        document.body.appendChild(tooltip);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 3000);
        
        // Remove on click
        tooltip.addEventListener('click', () => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
    }

    showChartTooltip(e) {
        // Implementation for chart hover tooltips
        console.log('Chart tooltip triggered', e);
    }

    updateChartData(chartId, newData) {
        // Method to update chart data dynamically
        if (this.charts.has(chartId)) {
            const chart = this.charts.get(chartId);
            // Update chart with new data
            console.log('Updating chart:', chartId, newData);
        }
    }

    exportChart(chartId, format = 'png') {
        // Method to export charts as images
        const canvas = document.getElementById(chartId);
        if (canvas) {
            const link = document.createElement('a');
            link.download = `dataconecta-chart-${chartId}.${format}`;
            link.href = canvas.toDataURL(`image/${format}`);
            link.click();
        }
    }
}

// Initialize data visualization when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dataVisualization = new DataVisualization();
    });
} else {
    window.dataVisualization = new DataVisualization();
}