// Destructuring desde el global ReactRouterDOM
const { BrowserRouter, Routes, Route, Link } = ReactRouterDOM;

/* ---------- COMPONENTES ---------- */
function GlassCard({ children }) {
  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-glass p-6 my-4">
      {children}
    </div>
  );
}

/* ---------- PÁGINAS ---------- */
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
  React.useEffect(() => {
    const ctx = document.getElementById("myChart");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Enero", "Febrero", "Marzo", "Abril", "Mayo"],
        datasets: [
          {
            label: "Visitas",
            data: [120, 190, 300, 250, 400],
            backgroundColor: "rgba(14, 165, 233, 0.7)",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "white" } } },
        scales: { x: { ticks: { color: "white" } }, y: { ticks: { color: "white" } } },
      },
    });
  }, []);

  return (
    <GlassCard>
      <h2 className="text-xl font-montserrat mb-4">📊 Analytics</h2>
      <canvas id="myChart" width="400" height="200"></canvas>
    </GlassCard>
  );
}

function UX() {
  return <GlassCard>🎨 Biblioteca de componentes UI</GlassCard>;
}

function Marketing() {
  return <GlassCard>📈 Calculadora de ROI y campañas</GlassCard>;
}

/* ---------- APP ---------- */
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

/* ---------- MOUNT ---------- */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
