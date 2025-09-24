export default function GlassCard({ children }) {
  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-glass p-6">
      {children}
    </div>
  );
}
