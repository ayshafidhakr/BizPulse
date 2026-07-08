import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <span className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          BizPulse
        </span>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">
            Login
          </Link>
          <Link href="/signup" className="text-sm bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-28 gap-6">
        <span className="text-sm bg-emerald-900/40 text-emerald-300 px-4 py-1 rounded-full border border-emerald-700">
          AI-Powered Business Management
        </span>
        <h1 className="text-5xl font-extrabold max-w-3xl leading-tight">
          Run your business smarter.{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Not harder.
          </span>
        </h1>
        <p className="text-gray-400 max-w-xl text-lg">
          Track sales, manage inventory, monitor credit — and ask your AI
          business assistant anything. Built for Indian small businesses.
        </p>
        <Link
          href="/signup"
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl text-lg font-semibold transition shadow-lg shadow-emerald-900/30"
        >
          Start for free →
        </Link>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-8 pb-24 max-w-6xl mx-auto">
        {[
          {
            icon: "📦",
            title: "Smart Inventory",
            desc: "Track stock levels with low stock alerts before you run out.",
            color: "from-emerald-900/30 to-emerald-800/10",
            border: "border-emerald-800/50",
          },
          {
            icon: "💰",
            title: "Sales Tracking",
            desc: "Record every sale in seconds. See daily, weekly, monthly revenue.",
            color: "from-teal-900/30 to-teal-800/10",
            border: "border-teal-800/50",
          },
          {
            icon: "📒",
            title: "Khata / Credit",
            desc: "Track who owes you money and send payment reminders.",
            color: "from-cyan-900/30 to-cyan-800/10",
            border: "border-cyan-800/50",
          },
          {
            icon: "🤖",
            title: "AI Assistant",
            desc: "Ask anything about your business in plain English.",
            color: "from-green-900/30 to-green-800/10",
            border: "border-green-800/50",
          },
        ].map((f) => (
          <div
            key={f.title}
            className={`bg-gradient-to-br ${f.color} border ${f.border} rounded-2xl p-6 flex flex-col gap-3`}
          >
            <span className="text-3xl">{f.icon}</span>
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}