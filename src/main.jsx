const { BrowserRouter, Routes, Route, Link } = ReactRouterDOM;

function App() {
  return (
    <BrowserRouter basename="/">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white/10 backdrop-blur-xl p-4 flex flex-col">
          <h1 className="font-montserrat font-bold text-xl mb-6">DataConecta</h1>
          <nav className="space-y-2">
            <Link to="/" className="nav-item">🏠 Inicio</Link>
            <Link to="/analytics" className="nav-item">📊 Analytics</Link>
            <Link to="/ux" className="nav-item">🎨 UX/UI</Link>
            <Link to="/marketing" className="nav-item">📈 Marketing</Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ux" element={<UX />} />
            <Route path="/marketing" element={<Marketing />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

/* Pages */
function Home() {
  return (
    <div>
      <h2 className="text-2xl font-montserrat mb-4">Bienvenido a DataConecta Hub</h2>
      <GlassCard>
        <p>Centraliza tus herramientas de Analytics, UX y Marketing.</p>
      </GlassCard>
    </div>
  );
}

function Analytics() {
  return <GlassCard>📊 Aquí va un gráfico interactivo (Chart.js/Recharts)</GlassCard>;
}

function UX() {
  return <GlassCard>🎨 Biblioteca de componentes UI</GlassCard>;
}

function Marketing() {
  return <GlassCard>📈 Calculadora de ROI y campañas</GlassCard>;
}

/* Components */
function GlassCard({ children }) {
  return (
    <div className="glass-card p-6 my-4">
      {children}
    </div>
  );
}

/* Mount App */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
