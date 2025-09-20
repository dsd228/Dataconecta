// Mock database for DataConecta Hub
export const mockData = {
  hub: {
    summary: {
      totalProjects: 24,
      activeDatasets: 8,
      campaignsRunning: 3,
      prototypesCreated: 12,
      totalROI: 156.7,
      avgConversionRate: 3.2
    },
    recentActivity: [
      { id: 1, type: 'data', message: 'Nuevo dataset de ventas Q4 cargado', time: '2 min ago' },
      { id: 2, type: 'ux', message: 'Prototipo móvil completado', time: '15 min ago' },
      { id: 3, type: 'marketing', message: 'Campaña navideña activada', time: '1 hora ago' },
      { id: 4, type: 'data', message: 'Dashboard de KPIs actualizado', time: '2 horas ago' }
    ]
  },
  
  dataAnalysis: {
    datasets: [
      { id: 1, name: 'Ventas Q4 2024', records: 15420, lastUpdated: '2024-12-20', status: 'active' },
      { id: 2, name: 'Customer Analytics', records: 8935, lastUpdated: '2024-12-19', status: 'active' },
      { id: 3, name: 'Marketing Performance', records: 2847, lastUpdated: '2024-12-18', status: 'processing' }
    ],
    charts: {
      salesTrend: [
        { month: 'Ene', sales: 12000, target: 10000 },
        { month: 'Feb', sales: 19000, target: 12000 },
        { month: 'Mar', sales: 15000, target: 14000 },
        { month: 'Abr', sales: 25000, target: 16000 },
        { month: 'May', sales: 22000, target: 18000 },
        { month: 'Jun', sales: 30000, target: 20000 }
      ]
    }
  },
  
  uxui: {
    projects: [
      { id: 1, name: 'E-commerce Mobile App', status: 'in-progress', progress: 75 },
      { id: 2, name: 'Dashboard Redesign', status: 'completed', progress: 100 },
      { id: 3, name: 'Landing Page Optimization', status: 'planning', progress: 25 }
    ],
    uiKits: [
      { id: 1, name: 'Modern Dashboard Kit', components: 45, downloads: 128 },
      { id: 2, name: 'Mobile App Components', components: 62, downloads: 89 },
      { id: 3, name: 'Web Form Elements', components: 34, downloads: 156 }
    ]
  },
  
  marketing: {
    campaigns: [
      { id: 1, name: 'Campaña Navidad 2024', status: 'active', budget: 15000, spent: 8420, roi: 245 },
      { id: 2, name: 'Black Friday Promo', status: 'completed', budget: 25000, spent: 24800, roi: 189 },
      { id: 3, name: 'Q1 2025 Launch', status: 'planning', budget: 20000, spent: 0, roi: 0 }
    ],
    metrics: {
      totalReach: 125000,
      engagement: 4.2,
      conversions: 1847,
      avgROAS: 3.8
    }
  }
}

// Simulated API functions
export const api = {
  async getHubData() {
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate delay
    return mockData.hub
  },
  
  async getDataAnalysis() {
    await new Promise(resolve => setTimeout(resolve, 300))
    return mockData.dataAnalysis
  },
  
  async getUXUIData() {
    await new Promise(resolve => setTimeout(resolve, 400))
    return mockData.uxui
  },
  
  async getMarketingData() {
    await new Promise(resolve => setTimeout(resolve, 350))
    return mockData.marketing
  },
  
  async uploadDataset(file) {
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate upload
    const newDataset = {
      id: Date.now(),
      name: file.name,
      records: Math.floor(Math.random() * 10000) + 1000,
      lastUpdated: new Date().toISOString().split('T')[0],
      status: 'active'
    }
    mockData.dataAnalysis.datasets.push(newDataset)
    return newDataset
  }
}