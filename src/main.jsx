// SPA entrypoint: React + React Router + Tailwind + Chart.js (via CDN)
const {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation
} = window.ReactRouterDOM;

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <div className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/marketing" element={<MarketingTools />} />
            <Route path="/ux-ui" element={<UXUITools />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

// NavBar
function NavBar() {
  const location = useLocation();
  const navItems = [
    { to: "/", label: "Inicio" },
    { to: "/analytics", label: "Data Analytics" },
    { to: "/marketing", label: "Marketing" },
    { to: "/ux-ui", label: "UX/UI" }
  ];
  return (
    <nav className="bg-slate-800 bg-opacity-80 shadow-glass px-4 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center space-x-2">
        <img src="./logo.svg" alt="Logo" className="h-8 w-8" />
        <span className="font-montserrat font-bold text-xl tracking-wide">DataConecta</span>
      </Link>
      <div className="flex space-x-4">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`font-semibold transition-colors px-3 py-1 rounded-md ${
              location.pathname === item.to
                ? "bg-indigo-600 text-white"
                : "hover:bg-slate-700"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

// Home Page
function Home() {
  return (
    <section className="text-center space-y-10">
      <div>
        <img src="./logo.svg" alt="Logo" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-4xl font-montserrat font-extrabold mb-2">Bienvenido a DataConecta Hub</h1>
        <p className="text-lg text-slate-200">Plataforma todo en uno para <b>Data Analytics</b>, <b>Marketing</b> y <b>UX/UI</b>.</p>
      </div>
      <div className="flex flex-col md:flex-row justify-center gap-8">
        <FeatureCard
          title="Data Analytics"
          icon="📊"
          desc="Visualiza y analiza tus datos con dashboards interactivos y gráficos."
          link="/analytics"
        />
        <FeatureCard
          title="Marketing"
          icon="📣"
          desc="Gestiona campañas, genera links UTM y envía newsletters fácilmente."
          link="/marketing"
        />
        <FeatureCard
          title="UX/UI"
          icon="🧑‍💻"
          desc="Recoge feedback de usuarios y haz tests de experiencia y satisfacción."
          link="/ux-ui"
        />
      </div>
    </section>
  );
}

function FeatureCard({ title, icon, desc, link }) {
  return (
    <Link to={link} className="bg-slate-800 bg-opacity-70 rounded-xl shadow-glass p-6 flex-1 min-w-[220px] hover:scale-105 hover:shadow-xl transition-all">
      <div className="text-4xl mb-2">{icon}</div>
      <h2 className="font-bold text-xl mb-1">{title}</h2>
      <p className="text-slate-300">{desc}</p>
    </Link>
  );
}

// AnalyticsDashboard
function AnalyticsDashboard() {
  React.useEffect(() => {
    // Simple demo data, you can upgrade or make dynamic!
    const ctx = document.getElementById('mainChart');
    if (window.myMainChart) window.myMainChart.destroy();
    window.myMainChart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
        datasets: [{
          label: 'Visitas',
          data: [320, 450, 390, 510, 600, 700, 850],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.2)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#fff' } }
        },
        scales: {
          x: { ticks: { color: '#fff' }, grid: { display: false } },
          y: { ticks: { color: '#fff' }, grid: { color: 'rgba(99,102,241,0.2)' } }
        }
      }
    });
  }, []);
  return (
    <section>
      <h1 className="font-montserrat text-2xl font-bold mb-4">Dashboard de Datos</h1>
      <div className="bg-slate-800/80 rounded-xl p-6 mb-8 shadow-glass">
        <canvas id="mainChart" height="100"></canvas>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-2">Sube tus propios datos (CSV):</h2>
        <CSVUploader />
      </div>
    </section>
  );
}

// CSVUploader (simple file reader, shows first 5 rows)
function CSVUploader() {
  const [preview, setPreview] = React.useState(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const rows = evt.target.result.split('\n').map(line => line.split(','));
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <input type="file" accept=".csv" className="mb-2" onChange={handleFile} />
      {preview && (
        <table className="w-full bg-slate-700 rounded-md text-sm mt-2">
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                {row.map((col, j) => (
                  <td className="border px-2 py-1 border-slate-600" key={j}>{col}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// MarketingTools
function MarketingTools() {
  return (
    <section>
      <h1 className="font-montserrat text-2xl font-bold mb-6">Herramientas de Marketing</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <NewsletterForm />
        <UTMGenerator />
      </div>
    </section>
  );
}

// NewsletterForm
function NewsletterForm() {
  // This form is for demo. To make it work, set up EmailJS or Formspree and update the 'action' attribute.
  return (
    <div className="bg-slate-800/80 rounded-xl p-6 shadow-glass">
      <h2 className="font-bold text-lg mb-2">Enviar Newsletter</h2>
      <form action="https://formspree.io/f/mwkgkrqw" method="POST" target="_blank">
        <input type="email" name="email" required placeholder="Email destinatario" className="mb-2 w-full px-3 py-2 rounded bg-slate-700 text-white" />
        <input type="text" name="subject" required placeholder="Asunto" className="mb-2 w-full px-3 py-2 rounded bg-slate-700 text-white" />
        <textarea name="message" required placeholder="Mensaje" className="mb-2 w-full px-3 py-2 rounded bg-slate-700 text-white"></textarea>
        {/* To: in real use, change endpoint or connect EmailJS */}
        <button type="submit" className="bg-indigo-600 px-4 py-2 rounded font-bold hover:bg-indigo-700 transition">Enviar</button>
      </form>
      <p className="mt-2 text-xs text-slate-400">* Demo: Los mensajes se envían mediante Formspree.<br/>Configura tu propio endpoint para producción.</p>
    </div>
  );
}

// UTMGenerator
function UTMGenerator() {
  const [values, setValues] = React.useState({
    url: '',
    source: '',
    medium: '',
    campaign: '',
    utm: ''
  });

  function handleChange(e) {
    setValues({ ...values, [e.target.name]: e.target.value });
  }
  function generateUTM() {
    const { url, source, medium, campaign } = values;
    if (!url) return;
    const params = [
      `utm_source=${encodeURIComponent(source)}`,
      `utm_medium=${encodeURIComponent(medium)}`,
      `utm_campaign=${encodeURIComponent(campaign)}`
    ].filter(Boolean).join('&');
    setValues({ ...values, utm: url + (url.includes('?') ? '&' : '?') + params });
  }
  return (
    <div className="bg-slate-800/80 rounded-xl p-6 shadow-glass">
      <h2 className="font-bold text-lg mb-2">Generador de links UTM</h2>
      <input name="url" placeholder="URL base" value={values.url} onChange={handleChange}
        className="mb-2 w-full px-3 py-2 rounded bg-slate-700 text-white" />
      <input name="source" placeholder="utm_source" value={values.source} onChange={handleChange}
        className="mb-2 w-full px-3 py-2 rounded bg-slate-700 text-white" />
      <input name="medium" placeholder="utm_medium" value={values.medium} onChange={handleChange}
        className="mb-2 w-full px-3 py-2 rounded bg-slate-700 text-white" />
      <input name="campaign" placeholder="utm_campaign" value={values.campaign} onChange={handleChange}
        className="mb-2 w-full px-3 py-2 rounded bg-slate-700 text-white" />
      <button onClick={generateUTM} className="bg-indigo-600 px-4 py-2 rounded font-bold hover:bg-indigo-700 transition mb-2">Generar link</button>
      {values.utm && (
        <div className="bg-slate-700 text-xs break-all p-2 rounded">{values.utm}</div>
      )}
    </div>
  );
}

// UXUITools
function UXUITools() {
  return (
    <section>
      <h1 className="font-montserrat text-2xl font-bold mb-6">Herramientas UX/UI</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <FeedbackForm />
        <ABTestDemo />
      </div>
    </section>
  );
}

// FeedbackForm
function FeedbackForm() {
  const [sent, setSent] = React.useState(false);
  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
    // Demo: save to localStorage, in real use connect to backend or Google Forms
    const entry = {
      name: e.target.name.value,
      feedback: e.target.feedback.value,
      date: new Date().toISOString()
    };
    const prev = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    localStorage.setItem('feedbacks', JSON.stringify([entry, ...prev]));
    e.target.reset();
    setTimeout(() => setSent(false), 3000);
  }
  return (
    <div className="bg-slate-800/80 rounded-xl p-6 shadow-glass">
      <h2 className="font-bold text-lg mb-2">Feedback de usuario</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Tu nombre (opcional)" className="mb-2 w-full px-3 py-2 rounded bg-slate-700 text-white" />
        <textarea name="feedback" required placeholder="Describe tu experiencia o sugerencia..." className="mb-2 w-full px-3 py-2 rounded bg-slate-700 text-white"></textarea>
        <button type="submit" className="bg-indigo-600 px-4 py-2 rounded font-bold hover:bg-indigo-700 transition">Enviar feedback</button>
      </form>
      {sent && <div className="mt-2 text-green-400 font-bold">¡Gracias por tu feedback!</div>}
      <FeedbackList />
    </div>
  );
}
function FeedbackList() {
  const [feedbacks, setFeedbacks] = React.useState([]);
  React.useEffect(() => {
    setFeedbacks(JSON.parse(localStorage.getItem('feedbacks') || '[]').slice(0, 3));
  }, []);
  if (!feedbacks.length) return null;
  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2 text-slate-300 text-sm">Últimos feedbacks:</h3>
      <ul>
        {feedbacks.map((f, i) => (
          <li key={i} className="mb-1 px-2 py-1 bg-slate-700 rounded text-xs">
            <span className="font-bold">{f.name || "Anónimo"}:</span> {f.feedback}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ABTestDemo
function ABTestDemo() {
  // Simple demo: shows random version, asks which prefieren
  const [version] = React.useState(Math.random() > 0.5 ? "A" : "B");
  const [vote, setVote] = React.useState(null);
  function handleVote(res) {
    setVote(res);
    // Save to localStorage for demo
    const prev = JSON.parse(localStorage.getItem('abtest') || '{}');
    prev[version] = (prev[version] || 0) + 1;
    localStorage.setItem('abtest', JSON.stringify(prev));
  }
  // Show stats
  const stats = JSON.parse(localStorage.getItem('abtest') || '{}');
  return (
    <div className="bg-slate-800/80 rounded-xl p-6 shadow-glass">
      <h2 className="font-bold text-lg mb-2">Mini Test A/B</h2>
      <div className="mb-2">
        <span className="font-bold">Estás viendo la versión {version}</span>
        <div className={`my-2 p-4 rounded ${version==="A"?"bg-indigo-500/50":"bg-green-500/40"}`}>
          {version === "A"
            ? <span>Botón azul destacado:</span>
            : <span>Botón verde destacado:</span>
          }
          <br />
          <button className={`mt-2 px-3 py-1 rounded font-bold ${version === "A" ? "bg-indigo-600" : "bg-green-600"} text-white`}>
            Comprar ahora
          </button>
        </div>
      </div>
      {!vote ? (
        <div>
          <button onClick={() => handleVote("like")} className="bg-slate-600 px-3 py-1 rounded mr-2 hover:bg-slate-500">Me gusta esta versión</button>
          <button onClick={() => handleVote("dislike")} className="bg-slate-600 px-3 py-1 rounded hover:bg-slate-500">Prefiero otra</button>
        </div>
      ) : (
        <div className="text-green-400 font-bold">¡Gracias por tu opinión!</div>
      )}
      <div className="mt-3 text-xs text-slate-400">
        Stats: Versión A: {stats.A||0}, Versión B: {stats.B||0}
      </div>
    </div>
  );
}

// NotFound
function NotFound() {
  return (
    <div className="text-center">
      <h2 className="font-montserrat text-2xl font-bold mb-4">404 - Página no encontrada</h2>
      <Link to="/" className="text-indigo-400 underline">Volver al inicio</Link>
    </div>
  );
}

// Footer
function Footer() {
  return (
    <footer className="text-center py-4 text-slate-400 text-xs">
      © {new Date().getFullYear()} DataConecta Hub · Hecho con ❤️ para la comunidad
    </footer>
  );
}

// Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
