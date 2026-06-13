import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Recycle,
  Leaf,
  Crown,
  CheckCircle2,
  TrendingUp,
  MapPin,
  RefreshCw,
  Zap,
  BarChart2,
  Activity
} from "lucide-react";

// ─── Simple CountUp ──────────────────────────────────────────────────────────
function CountUp({ end, prefix = "", suffix = "" }: { end: number, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    const duration = 1500;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [end]);
  return <span>{prefix}{count.toLocaleString("en-IN")}{suffix}</span>;
}

// ─── Mock Event Data ──────────────────────────────────────────────────────────
const MOCK_EVENTS = [
  { id: 1, text: "Priya's return prevented — Nike Shoes Size 7→8", icon: Shield, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
  { id: 2, text: "Baby Monitor graded A — Amazon Buyback ₹2,070", icon: Crown, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" },
  { id: 3, text: "P2P Match: Neha ↔ Rahul — 2.3km", icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200" },
  { id: 4, text: "+50 Green Credits issued to Rahul", icon: Leaf, color: "text-green-600", bg: "bg-green-100", border: "border-green-200" },
  { id: 5, text: "Kindle Oasis graded B+ — Relisted for ₹12,400", icon: RefreshCw, color: "text-violet-600", bg: "bg-violet-100", border: "border-violet-200" },
];

export function OpsDashboard() {
  const [events, setEvents] = useState(MOCK_EVENTS.slice(0, 3));
  const [eventIndex, setEventIndex] = useState(3);

  // Live feed simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => {
        const nextEvent = { ...MOCK_EVENTS[eventIndex % MOCK_EVENTS.length], id: Date.now() };
        setEventIndex(i => i + 1);
        return [nextEvent, ...prev].slice(0, 6);
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [eventIndex]);

  return (
    <div className="p-8 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold tracking-tight mb-1">Ops Dashboard</h1>
          <p className="text-gray-400 text-sm">Real-time command center for circular economy logistics</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2">
          <motion.div 
            className="w-2 h-2 rounded-full bg-emerald-500" 
            animate={{ opacity: [1, 0.4, 1] }} 
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-xs font-bold text-emerald-700 tracking-wide uppercase">Live Sync Active</span>
        </div>
      </div>

      {/* Top Row: Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {[
          { label: "Returns Prevented", icon: Shield,  color: "text-blue-600", bg: "bg-blue-100", value: 47,   sub: "+12 today" },
          { label: "Items Diverted",    icon: Recycle, color: "text-green-600", bg: "bg-green-100", value: 312,  sub: "from landfill" },
          { label: "CO₂ Saved",         icon: Leaf,    color: "text-emerald-600",bg: "bg-emerald-100", value: 1247, sub: "= 1,386 tree-months", suffix: " kg" },
          { label: "Amazon Buybacks",   icon: Crown,   color: "text-amber-600", bg: "bg-amber-100", value: 89,   sub: "₹2.4L recovered" },
        ].map((m, i) => (
          <motion.div 
            key={m.label}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
          >
            {/* Subtle glow effect in the corner */}
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-xl ${m.bg}`} />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <Activity className="w-4 h-4 text-gray-300" />
            </div>
            
            <div className="relative z-10">
              <p className="text-3xl font-black text-gray-900 tracking-tight mb-1">
                <CountUp end={m.value} suffix={m.suffix} />
              </p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{m.label}</p>
              <p className={`text-[11px] font-semibold mt-2 ${m.color}`}>{m.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Middle Row: Two Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Circular Economy Loop Visualization */}
        <motion.div 
          className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-900">Re-Circ OS Flow</h2>
            <p className="text-xs text-gray-400 mt-1">Live active connections</p>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
            {/* Center Logo */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <motion.div 
                className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center shadow-lg border-4 border-white"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Leaf className="w-6 h-6 text-white" />
              </motion.div>
            </div>

            {/* Orbiting Nodes (Simplified visually as a ring) */}
            <div className="relative w-64 h-64">
              {/* Animated Dashed Ring */}
              <motion.svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" 
                animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              >
                <circle cx="50" cy="50" r="48" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                <motion.circle 
                  cx="50" cy="50" r="48" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="10 300"
                  animate={{ strokeDashoffset: [0, -310] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              </motion.svg>

              {/* 4 Stage Nodes */}
              {[
                { label: "Prevent", pos: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2", icon: Shield, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" },
                { label: "Automate", pos: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2", icon: Zap, color: "text-violet-600", bg: "bg-violet-100", border: "border-violet-200" },
                { label: "Recirculate", pos: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", icon: Recycle, color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200" },
                { label: "Incentivize", pos: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2", icon: Crown, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" },
              ].map((node, i) => (
                <div key={node.label} className={`absolute ${node.pos} flex flex-col items-center z-20`}>
                  <motion.div 
                    className={`w-12 h-12 rounded-full ${node.bg} ${node.border} border-2 flex items-center justify-center bg-white shadow-sm`}
                    animate={{ y: [0, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                  >
                    <node.icon className={`w-5 h-5 ${node.color}`} />
                  </motion.div>
                  <span className="text-[10px] font-bold text-gray-600 mt-2 bg-white px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {node.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right: Live Activity Feed */}
        <motion.div 
          className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        >
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Live Activity Feed</h2>
              <p className="text-xs text-gray-400 mt-0.5">Stream of events processed by OS</p>
            </div>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 p-5 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white pointer-events-none z-10" />
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1 - i * 0.15, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${i === 0 ? event.border : "border-gray-100 bg-white"} shadow-sm transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${event.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <event.icon className={`w-4 h-4 ${event.color}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${i === 0 ? "text-gray-900" : "text-gray-600"}`}>
                        {event.text}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">Just now · Processing time: {(100 + Math.random() * 80).toFixed(0)}ms</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row: Two Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Disposition Distribution */}
        <motion.div 
          className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        >
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Disposition Distribution</h2>
              <p className="text-xs text-gray-400 mt-1">AI automated routing over last 30 days</p>
            </div>
            <BarChart2 className="w-4 h-4 text-gray-400" />
          </div>

          <div className="space-y-4">
            {[
              { label: "Resell directly", val: 45, color: "bg-emerald-500", text: "text-emerald-700" },
              { label: "Amazon Buyback", val: 28, color: "bg-amber-400",   text: "text-amber-700" },
              { label: "Refurbish",      val: 15, color: "bg-blue-500",    text: "text-blue-700" },
              { label: "Donate",         val: 10, color: "bg-teal-500",    text: "text-teal-700" },
              { label: "Liquidate",      val: 2,  color: "bg-gray-400",    text: "text-gray-600" },
            ].map((bar, i) => (
              <div key={bar.label}>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">{bar.label}</span>
                  <span className={`text-[10px] font-black ${bar.text}`}>{bar.val}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${bar.color} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.val}%` }}
                    transition={{ duration: 1.2, delay: 0.6 + i * 0.1, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: Green Credits + Fairness */}
        <motion.div 
          className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Ecosystem Integrity</h2>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex-1">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Green Credits Issued</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black text-emerald-600"><CountUp end={15400} /></p>
                  <p className="text-xs font-semibold text-emerald-700">pts</p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-bold text-gray-900">Fairness Check</p>
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">Return risk model flag rate by region is within ±2% tolerance.</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 flex-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Model Demographic Parity</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { city: "Delhi", rate: 12 },
                { city: "Mumbai", rate: 11 },
                { city: "Bangalore", rate: 13 },
              ].map(r => (
                <div key={r.city} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-xl font-black text-gray-800">{r.rate}%</p>
                  <p className="text-[10px] text-gray-500 font-semibold">{r.city}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
