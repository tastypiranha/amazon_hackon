import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package, MapPin, Clock, ChevronRight, Leaf, Zap,
  Users, CheckCircle2, Radio, Star, MessageCircle,
  Filter, Search, ShoppingBag, ArrowRight, MoreHorizontal,
  Edit2, Send, CalendarClock
} from "lucide-react";

type RowState = "idle" | "listing" | "matching" | "matched";
type ExchangeType = "meetup" | "ship";

const CONDITIONS = ["Like New", "Good", "Fair", "Poor"] as const;

const ORDERS = [
  { id: "o1", name: "Sony WH-1000XM5",           category: "Audio",     price: 24990, date: "Jan 2024", monthsAgo: 13, sku: "SNY-XM5-BLK",  highlight: true },
  { id: "o2", name: "Philips Avent Baby Monitor",  category: "Baby & Kids",price: 8499,  date: "Oct 2023", monthsAgo: 8,  sku: "PHL-AVENT-VM", highlight: true },
  { id: "o3", name: "Levi's 511 Slim Jeans",       category: "Apparel",   price: 3499,  date: "Sep 2023", monthsAgo: 9,  sku: "LVI-511-32W",  highlight: true },
  { id: "o4", name: "Instant Pot Duo 7-in-1",      category: "Kitchen",   price: 7999,  date: "Aug 2023", monthsAgo: 10, sku: "IP-DUO-6QT",   highlight: true },
  { id: "o5", name: "Nike Air Max 270",             category: "Footwear",  price: 12999, date: "Jun 2023", monthsAgo: 12, sku: "NK-AM270-8UK", highlight: true },
];

const MATCHES = [
  { name: "Neha K.",  initials: "NK", location: "Indiranagar", distance: "2.3 km", score: 96, eco: "−3.1 kg CO₂", verified: true,  top: true },
  { name: "Arjun M.", initials: "AM", location: "Koramangala", distance: "4.1 km", score: 81, eco: "−2.8 kg CO₂", verified: false, top: false },
];

// ─── Floating credits ─────────────────────────────────────────────────────────

function FloatingCredits({ label, onDone }: { label: string; onDone: () => void }) {
  return (
    <motion.div
      className="absolute z-20 top-2 right-2 pointer-events-none"
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -40, scale: 0.8 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      onAnimationComplete={onDone}
    >
      <div className="flex items-center gap-1 bg-green-600 text-white rounded-full px-3 py-1 shadow-md text-xs font-bold">
        <Leaf className="w-3 h-3" /> {label}
      </div>
    </motion.div>
  );
}

// ─── Circle score ─────────────────────────────────────────────────────────────

function CircleScore({ value, top }: { value: number; top?: boolean }) {
  const size = 52; const r = (size - 8) / 2; const circ = 2 * Math.PI * r; const dash = (value / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={5} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={top ? "#F59E0B" : "#16A34A"} strokeWidth={5} strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - dash }} transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }} />
      </svg>
      <span className={`absolute text-xs font-black tabular-nums ${top ? "text-amber-600" : "text-green-700"}`}>{value}%</span>
    </div>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ match, delay }: { match: typeof MATCHES[0]; delay: number }) {
  const [step, setStep] = useState<"idle" | "composing" | "sent">("idle");
  const [msg, setMsg] = useState("");
  const [showCredits, setShowCredits] = useState(false);

  const handleConnect = () => setStep("composing");
  const handleSend = () => {
    setStep("sent");
    setShowCredits(true);
  };

  return (
    <motion.div
      className={`relative bg-white rounded-xl border overflow-hidden ${match.top ? "border-amber-300 shadow-sm" : "border-gray-100"}`}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 28 }}
    >
      {match.top && <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 to-orange-400" />}

      {/* Floating credits */}
      <AnimatePresence>
        {showCredits && <FloatingCredits label="+30 Green Credits" onDone={() => setShowCredits(false)} />}
      </AnimatePresence>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 border-2 ${match.top ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-gray-100 border-gray-200 text-gray-600"}`}>
            {match.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900">{match.name}</span>
              {match.verified && <span className="text-[10px] font-black text-blue-700 bg-blue-100 border border-blue-200 rounded-full px-2 py-px">VERIFIED</span>}
              {match.top && <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-px">TOP MATCH</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3 text-gray-300" />{match.location}</span>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">{match.distance}</span>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-green-700 font-semibold flex items-center gap-1"><Leaf className="w-3 h-3" />{match.eco}</span>
            </div>
            <div className="flex items-center gap-0.5 mt-2">
              {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < 4 ? "fill-[#FF9900] text-[#FF9900]" : "text-gray-200"}`} />)}
              <span className="text-[10px] text-gray-400 ml-1">4.8 · 23 trades</span>
            </div>
          </div>
          <CircleScore value={match.score} top={match.top} />
        </div>

        {/* Connect flow */}
        <AnimatePresence mode="wait">
          {step === "idle" && (
            <motion.div key="idle" className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2" exit={{ opacity: 0 }}>
              <motion.button
                onClick={handleConnect}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold cursor-pointer transition-colors ${match.top ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
                whileTap={{ scale: 0.97 }}
              >
                <MessageCircle className="w-3.5 h-3.5" /> Connect
              </motion.button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-300 cursor-pointer transition-colors">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {step === "composing" && (
            <motion.div
              key="composing"
              className="mt-3 pt-3 border-t border-gray-100 space-y-2.5"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <textarea
                autoFocus
                rows={2}
                value={msg}
                onChange={e => setMsg(e.target.value)}
                placeholder="Hi! I'd like to sell this item. Are you still interested?"
                className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 resize-none outline-none focus:border-gray-400 placeholder-gray-400"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSend}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-xs font-bold cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Confirm & Send
                </button>
                <button
                  onClick={() => setStep("idle")}
                  className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-2 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
              <button className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-lg py-2 text-xs font-medium cursor-pointer transition-colors">
                <CalendarClock className="w-3.5 h-3.5" /> Schedule Meetup Instead
              </button>
            </motion.div>
          )}

          {step === "sent" && (
            <motion.div
              key="sent"
              className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-2 rounded-lg py-2 bg-green-50 border border-green-200"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-bold text-green-700">Offer Sent · +30 Credits earned</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Listing summary ──────────────────────────────────────────────────────────

function ListingSummary({ order, state, onMatch }: {
  order: typeof ORDERS[0];
  state: RowState;
  onMatch: () => void;
}) {
  const [askPrice, setAskPrice] = useState(String(Math.round(order.price * 0.55)));
  const [editingPrice, setEditingPrice] = useState(false);
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>("Good");
  const [exchange, setExchange] = useState<ExchangeType>("meetup");

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: "hidden" }}
    >
      <div className="px-5 pb-4 pt-3 bg-green-50/60 border-t border-green-100">
        <div className="flex items-start gap-4">
          {/* Listing card */}
          <div className="flex-1 bg-white border border-green-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Auto-generated P2P listing</span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {/* Item — read only */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Item</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{order.name}</p>
              </div>

              {/* Ask price — editable */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Ask Price</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-bold text-gray-800">₹</span>
                  {editingPrice ? (
                    <input
                      autoFocus
                      className="text-xs font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded px-1.5 py-0.5 w-24 outline-none"
                      value={askPrice}
                      onChange={e => setAskPrice(e.target.value.replace(/[^0-9]/g, ""))}
                      onBlur={() => setEditingPrice(false)}
                    />
                  ) : (
                    <button onClick={() => setEditingPrice(true)} className="flex items-center gap-1 group cursor-pointer">
                      <span className="text-xs font-bold text-gray-800">{Number(askPrice).toLocaleString("en-IN")}</span>
                      <Edit2 className="w-3 h-3 text-gray-300 group-hover:text-green-500 transition-colors" />
                    </button>
                  )}
                </div>
              </div>

              {/* Condition — dropdown */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Condition</p>
                <select
                  value={condition}
                  onChange={e => setCondition(e.target.value as typeof CONDITIONS[number])}
                  className="mt-0.5 text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none cursor-pointer"
                >
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Pickup */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Pickup</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">Whitefield, Bengaluru</p>
              </div>
            </div>

            {/* Exchange type */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Exchange Type</p>
              <div className="flex gap-2">
                {(["meetup", "ship"] as ExchangeType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setExchange(t)}
                    className={`flex-1 text-xs font-bold rounded-lg py-2 border cursor-pointer transition-colors ${
                      exchange === t
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {t === "meetup" ? "P2P Meetup" : "Ship Only"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <Leaf className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <span className="text-xs text-green-800">Local P2P saves ~3.1 kg CO₂ vs. standard return</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col items-center gap-3 pt-1 min-w-[90px]">
            {state === "listing" && (
              <div className="flex flex-col items-center gap-2">
                <motion.div className="w-8 h-8 rounded-full border-2 border-green-200 border-t-green-600" animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                <p className="text-[10px] font-medium text-gray-400 text-center">Scanning buyers…</p>
              </div>
            )}
            {state === "matching" && (
              <motion.button
                onClick={onMatch}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.97 }}
              >
                <Users className="w-3.5 h-3.5" /> Find Matches
              </motion.button>
            )}
            {state === "matched" && (
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">Matched!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Order row ────────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: typeof ORDERS[0] }) {
  const [rowState, setRowState] = useState<RowState>("idle");
  const [showMatches, setShowMatches] = useState(false);
  const isExpanded = rowState !== "idle";

  return (
    <motion.div layout className={`border-b border-gray-100 last:border-0 transition-colors ${isExpanded ? "bg-green-50/40" : "hover:bg-gray-50/60"}`}>
      <div className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center">
        <div className="col-span-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
            <Package className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{order.name}</p>
            <p className="text-[10px] text-gray-400 mt-px">{order.sku}</p>
          </div>
        </div>
        <div className="col-span-2">
          <span className="text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">{order.category}</span>
        </div>
        <div className="col-span-2">
          <p className="text-sm font-bold text-gray-800">₹{order.price.toLocaleString("en-IN")}</p>
        </div>
        <div className="col-span-2 flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-gray-300" />
          <span className="text-xs text-gray-400">{order.date} · {order.monthsAgo}mo</span>
        </div>
        <div className="col-span-2 flex justify-end">
          <AnimatePresence mode="wait">
            {rowState === "idle" && (
              <motion.button
                key="btn"
                onClick={() => { setRowState("listing"); setTimeout(() => setRowState("matching"), 1800); }}
                className="text-xs font-bold rounded-lg px-3 py-1.5 border bg-green-600 border-green-600 text-white hover:bg-green-700 cursor-pointer whitespace-nowrap transition-colors"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                whileTap={{ scale: 0.97 }}
              >
                I don't need this
              </motion.button>
            )}
            {rowState !== "idle" && (
              <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                {rowState === "listing" && <><motion.div className="w-2 h-2 rounded-full bg-green-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} /><span className="text-[11px] font-bold text-green-700">Listing…</span></>}
                {rowState === "matching" && <span className="text-[11px] font-black text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5">SCANNING</span>}
                {rowState === "matched"  && <span className="text-[11px] font-black text-green-700 bg-green-100 border border-green-200 rounded-full px-2.5 py-0.5">2 MATCHES</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <ListingSummary
            order={order}
            state={rowState}
            onMatch={() => { setRowState("matched"); setShowMatches(true); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMatches && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-6 bg-gray-50 border-t border-gray-100">
              <motion.div className="flex items-center gap-3 py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <div className="w-8 h-8 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-bold text-sm">2 matches found within 5 km!</p>
                  <p className="text-xs text-gray-400 mt-0.5">Ranked by proximity · AI score · eco-impact</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 bg-green-100 border border-green-200 rounded-full px-2.5 py-1">
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-green-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  <span className="text-[10px] font-black text-green-700">LIVE</span>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MATCHES.map((m, i) => <MatchCard key={m.name} match={m} delay={0.12 + i * 0.1} />)}
              </div>

              {/* Mini map */}
              <motion.div className="mt-3 bg-white border border-gray-100 rounded-xl h-28 relative overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                <div className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(circle at 40% 55%, rgba(34,197,94,0.5) 0%, transparent 50%), radial-gradient(circle at 62% 40%, rgba(245,158,11,0.4) 0%, transparent 38%)" }} />
                <div className="absolute" style={{ left: "38%", top: "40%" }}>
                  <div className="w-3.5 h-3.5 rounded-full bg-green-600 border-2 border-white shadow-md relative">
                    <motion.div className="absolute inset-0 rounded-full bg-green-500" animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
                  </div>
                  <p className="text-[9px] font-bold text-gray-600 mt-1 -ml-1">You</p>
                </div>
                <div className="absolute" style={{ left: "52%", top: "50%" }}>
                  <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-md" />
                  <p className="text-[9px] font-bold text-amber-700 mt-0.5 -ml-2.5">Neha K.</p>
                </div>
                <div className="absolute" style={{ left: "62%", top: "28%" }}>
                  <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow-md" />
                  <p className="text-[9px] font-semibold text-gray-500 mt-0.5 -ml-3">Arjun M.</p>
                </div>
                <div className="absolute bottom-2 right-3">
                  <span className="text-[10px] text-gray-400 font-medium">5 km radius · Bengaluru</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function P2PMatching() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-gray-900 text-xl font-bold">P2P Order Matching</h1>
          <div className="flex items-center gap-1.5 bg-green-100 border border-green-200 rounded-full px-2.5 py-1">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-green-500" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
            <span className="text-[10px] font-black text-green-700">LIVE</span>
          </div>
        </div>
        <p className="text-gray-400 text-sm">All past purchases are listable · click any row to generate an instant P2P listing</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Orders",  value: "23",      icon: ShoppingBag, color: "text-gray-400" },
          { label: "Items Listed",  value: "4",       icon: Package,     color: "text-blue-500" },
          { label: "P2P Matches",   value: "11",      icon: Users,       color: "text-green-600" },
          { label: "CO₂ Saved",     value: "34.2 kg", icon: Leaf,        color: "text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-amber-600" />
        </div>
        <p className="text-sm text-amber-900 flex-1">
          <strong>All items are listable.</strong> Hover any row and click "I don't need this" — our AI auto-generates the listing in seconds.
        </p>
        <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="col-span-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</div>
          <div className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</div>
          <div className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid</div>
          <div className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Purchased</div>
          <div className="col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</div>
        </div>

        <div>{ORDERS.map(o => <OrderRow key={o.id} order={o} />)}</div>

        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-400">Showing 5 of 23 orders</span>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer transition-colors">
            Load more <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
