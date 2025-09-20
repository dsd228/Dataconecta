import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  // States
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditingDashboard, setIsEditingDashboard] = useState(false);

  // Refs
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const aiPanelRef = useRef(null);

  // KPI Data
  const [kpiData, setKpiData] = useState({
    visitors: 12856,
    conversionRate: '4.23%',
    revenue: '$15,235',
    bounceRate: '23.1%'
  });

  // Real-time Data Update
  useEffect(() => {
    const interval = setInterval(() => {
      setKpiData(prev => ({
        visitors: Math.max(0, prev.visitors + Math.floor(Math.random() * 101) - 50),
        conversionRate: `${(parseFloat(prev.conversionRate) + (Math.random() * 0.25 - 0.125)).toFixed(2)}%`,
        revenue: `$${Math.max(0, parseInt(prev.revenue.replace('$', '').replace(',', '')) + Math.floor(Math.random() * 300) - 150).toLocaleString()}`,
        bounceRate: `${(parseFloat(prev.bounceRate) + (Math.random() * 0.25 - 0.125)).toFixed(2)}%`
      }));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (aiPanelRef.current && !aiPanelRef.current.contains(event.target) && !event.target.closest('.ai-toggle')) {
        setShowAiPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle Functions
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // Menu Items
  const menuItems = [
    { id: 'dashboard', icon: '🏠', text: 'Dashboard' },
    { id: 'analytics', icon: '📊', text: 'Analytics' },
    { id: 'ux-ui', icon: '🎨', text: 'UX/UI Tools' },
    { id: 'marketing', icon: '📢', text: 'Marketing' },
    { id: 'customer', icon: '👥', text: 'Customer Insights' },
    { id: 'ai', icon: '🤖', text: 'AI Recommendations' },
    { id: 'collab', icon: '💬', text: 'Collaboration' },
    { id: 'settings', icon: '⚙️', text: 'Settings' }
  ];

  // Content Rendering
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Dashboard Overview</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time analytics and insights</p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm">
                  <span className="flex items-center gap-2">
                    <span>📅</span>
                    <span>Last 30 days</span>
                  </span>
                </button>
                <button
                  onClick={() => setIsEditingDashboard(!isEditingDashboard)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="flex items-center gap-2">
                    <span>✨</span>
                    <span>{isEditingDashboard ? 'Save Layout' : 'Customize'}</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { key: 'visitors', title: 'Total Visitors', value: kpiData.visitors.toLocaleString(), icon: '👥', color: 'from-blue-500 to-cyan-500', trend: '+12.5%' },
                { key: 'conversionRate', title: 'Conversion Rate', value: kpiData.conversionRate, icon: '📈', color: 'from-green-500 to-emerald-500', trend: '+5.2%' },
                { key: 'revenue', title: 'Total Revenue', value: kpiData.revenue, icon: '💰', color: 'from-purple-500 to-pink-500', trend: '+8.7%' },
                { key: 'bounceRate', title: 'Bounce Rate', value: kpiData.bounceRate, icon: '📉', color: 'from-orange-500 to-red-500', trend: '-3.4%' }
              ].map((kpi, index) => (
                <div
                  key={kpi.key}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
                >
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-lg">{kpi.icon}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">{kpi.title}</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        {kpi.value}
                      </h3>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        kpi.trend.startsWith('+')
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {kpi.trend}
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 h-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent rounded-full"></div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="w-20 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full"></div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">vs last period</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Charts and other content would go here */}
          </div>
        );

      case 'analytics':
        return <div>Analytics Content</div>;

      case 'ux-ui':
        return <div>UX/UI Content</div>;

      case 'marketing':
        return <div>Marketing Content</div>;

      case 'customer':
        return <div>Customer Insights Content</div>;

      case 'ai':
        return <div>AI Recommendations Content</div>;

      case 'collab':
        return <div>Collaboration Content</div>;

      case 'settings':
        return <div>Settings Content</div>;

      default:
        return (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-4xl">
                  {menuItems.find(item => item.id === activeSection)?.icon || '🛠️'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to {menuItems.find(item => item.id === activeSection)?.text || 'This Section'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                This section is fully equipped with powerful tools to help you achieve your goals.
              </p>
              <button className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                Get Started
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div
          className={`fixed h-full z-50 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } ${darkMode ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-gray-200'} shadow-xl`}
        >
          {/* Sidebar Content */}
        </div>

        {/* Main Content */}
        <div
          className={`flex-1 transition-all duration-300 ease-in-out pt-6 ${
            sidebarCollapsed ? 'ml-20' : 'ml-64'
          }`}
        >
          {/* Header */}
          <header className={`sticky top-6 z-40 rounded-2xl p-5 mb-6 shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            {/* Header Content */}
          </header>

          {/* Main Content Area */}
          <main className="px-4 pb-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
