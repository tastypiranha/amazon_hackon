import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Star, ShoppingBag, Heart, Leaf, Shield, Zap,
  Package, CheckCircle2, AlertTriangle, Wallet,
  TrendingUp, Award, Truck, RotateCcw, Info,
  ChevronDown, ChevronRight
} from "lucide-react";
import { ArcGauge } from "./arc-gauge";

const CHECKLIST = [
  { label: "Cosmetic",     ok: true },
  { label: "Packaging",    ok: true },
  { label: "Missing case", ok: false },
  { label: "Working",      ok: true },
];

const TIERS = [
  { level: 1, name: "Eco Starter", kg: 0 },
  { level: 2, name: "Silver",      kg: 15 },
  { level: 3, name: "Gold",        kg: 30 },
  { level: 4, name: "Platinum",    kg: 50 },
];

// ─── CO₂ flash banner ─────────────────────────────────────────────────────────

function CO2Flash({ co2, onDone }: { co2: number; onDone: () => void }) {
  return (
    <motion.div
      className="fixed top-16 left-1/2 z-50 -translate-x-1/2 pointer-events-none"
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={() => setTimeout(onDone, 2200)}
    >
      <div className="flex items-center gap-2.5 bg-green-600 text-white rounded-2xl shadow-xl px-5 py-3">
        <Leaf className="w-4 h-4" />
        <span className="text-sm font-bold">
          🌱 You just saved {co2} kg CO₂ — like not driving 18 km!
        </span>
      </div>
    </motion.div>
  );
}

// ─── Floating credits ─────────────────────────────────────────────────────────

function FloatingCredits({ pts, onDone }: { pts: number; onDone: () => void }) {
  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      style={{ right: "calc(clamp(260px, 22vw, 320px) + 28px)", top: "50%" }}
      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      animate={{ opacity: 0, x: 210, y: -70, scale: 0.75 }}
      transition={{ duration: 0.95, ease: "easeInOut" }}
      onAnimationComplete={onDone}
    >
      <div className="flex items-center gap-1.5 bg-green-600 text-white rounded-full px-4 py-2 shadow-lg">
        <Leaf className="w-3.5 h-3.5" />
        <span className="text-sm font-bold">+{pts} Green Credits</span>
      </div>
    </motion.div>
  );
}

// ─── Health card ──────────────────────────────────────────────────────────────

function HealthCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">Product Health Card</span>
            <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-px">VERIFIED</span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">AI-graded · tap to expand</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-black text-gray-900 leading-none">A-</p>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }}>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-4">
              {/* Arc gauge */}
              <div className="flex items-center gap-5 pt-1">
                <ArcGauge value={94} size={88} color="#16A34A" sublabel="conf." />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">AI Confidence</p>
                  <p className="text-2xl font-black text-green-700">94.2%</p>
                  <p className="text-xs text-gray-400 mt-0.5">Re-Circ Vision v2.4</p>
                </div>
              </div>

              {/* Checklist */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Inspection Checklist</p>
                <div className="grid grid-cols-2 gap-2">
                  {CHECKLIST.map(({ label, ok }) => (
                    <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${ok ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                      <span className={`text-xs font-semibold ${ok ? "text-green-800" : "text-amber-800"}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data tiles */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Shield,  label: "Warranty", value: "8 months" },
                  { icon: Package, label: "Condition", value: "Grade A-" },
                  { icon: Truck,   label: "Dispatch",  value: "Same day" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                    <Icon className="w-4 h-4 text-gray-300 mx-auto mb-1" />
                    <p className="text-sm font-bold text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* CO₂ */}
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <Leaf className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">🌱 Buy this and save <strong>4.2 kg CO₂</strong> vs. buying new</p>
              </div>

              <div className="flex items-center gap-2">
                <Info className="w-3 h-3 text-gray-300 flex-shrink-0" />
                <p className="text-[10px] text-gray-400">RC-2024-8821 · {new Date().toLocaleDateString("en-IN")}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Green Wallet ─────────────────────────────────────────────────────────────

function GreenWallet({ pts, co2 }: { pts: number; co2: number }) {
  const currentTier = TIERS.filter(t => co2 >= t.kg).pop()!;
  const nextTier = TIERS.find(t => t.kg > co2);
  const pct = nextTier
    ? ((co2 - currentTier.kg) / (nextTier.kg - currentTier.kg)) * 100
    : 100;

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="h-0.5 w-full bg-gradient-to-r from-green-400 to-emerald-500" />
      <div className="p-5 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-green-600" />
          </div>
          <span className="text-sm font-bold text-gray-900">Green Wallet</span>
        </div>

        {/* Balance */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Balance</p>
          <div className="flex items-baseline gap-2">
            <motion.span key={pts} className="text-2xl font-black text-gray-900" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              {pts} pts
            </motion.span>
            <span className="text-green-600 text-sm font-bold">= ₹{Math.floor(pts / 10)}</span>
          </div>
        </div>

        {/* Tier badge */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🌿</span>
              <span className="text-sm font-black text-green-800">{currentTier.name}</span>
              <span className="text-[10px] font-bold text-green-600 bg-green-100 border border-green-200 rounded-full px-1.5 py-px">
                Level {currentTier.level}
              </span>
            </div>
            {nextTier && (
              <span className="text-[10px] text-gray-400 font-medium">
                {(nextTier.kg - co2).toFixed(1)} kg to {nextTier.name}
              </span>
            )}
          </div>
          <div className="h-2 bg-white border border-green-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
              animate={{ width: `${Math.min(pct, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {nextTier && (
            <p className="text-[10px] text-gray-400 mt-1.5">
              {nextTier.name} unlocks free shipping on all Re-Circ orders
            </p>
          )}
        </div>

        {/* CO₂ */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">CO₂ Saved</p>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1"><Leaf className="w-3.5 h-3.5 text-green-500" />Your impact</span>
            <motion.span key={co2} className="text-sm font-black text-green-700" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {co2.toFixed(1)} kg
            </motion.span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-green-500" animate={{ width: `${Math.min((co2 / 50) * 100, 100)}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">toward 50 kg Platinum milestone</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: TrendingUp, label: "Rank",     value: "Top 12%" },
            { icon: Award,      label: "Streak",   value: "3 buys" },
            { icon: RotateCcw,  label: "Avoided",  value: "5 returns" },
            { icon: Package,    label: "Recirced", value: "8 items" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
              <Icon className="w-3.5 h-3.5 text-gray-300 mb-1.5" />
              <p className="text-sm font-bold text-gray-900">{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-green-50 border border-green-100 rounded-xl px-3.5 py-3 flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-800">Buy Now earns <strong>+50 pts</strong> · Add to Cart earns <strong>+20 pts</strong></p>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function BuyerView() {
  const [liked, setLiked] = useState(false);
  const [buyState, setBuyState] = useState<"idle" | "carted" | "bought">("idle");
  const [floatPts, setFloatPts] = useState<number | null>(null);
  const [showCO2, setShowCO2] = useState(false);
  const [pts, setPts] = useState(340);
  const [co2, setCo2] = useState(22.1);
  const [activeImg, setActiveImg] = useState(0);

  const images = [
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    "https://images.unsplash.com/photo-1524678714210-9917a6c619c2?w=200&q=80",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&q=80",
  ];

  const award = (p: number) => {
    setFloatPts(p);
    setShowCO2(true);
    setPts(prev => prev + p);
    setCo2(prev => parseFloat((prev + 4.2).toFixed(1)));
  };

  return (
    <div className="p-8">
      {/* Floating elements */}
      <AnimatePresence>
        {showCO2 && <CO2Flash co2={4.2} onDone={() => setShowCO2(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {floatPts !== null && (
          <FloatingCredits pts={floatPts} onDone={() => setFloatPts(null)} />
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span>Marketplace</span><ChevronRight className="w-3 h-3" /><span>Electronics</span><ChevronRight className="w-3 h-3" /><span>Audio</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-gray-900 text-xl font-bold mb-1">Buyer View</h1>
            <p className="text-gray-400 text-sm">Health Card · Green Wallet · Verified Refurbished</p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
            <Wallet className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-bold text-green-700">{pts} pts</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Images + Health Card */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative bg-white border border-gray-100 rounded-2xl overflow-hidden aspect-square">
            <AnimatePresence mode="wait">
              <motion.img key={activeImg} src={images[activeImg]} alt="Product" className="w-full h-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            </AnimatePresence>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 border border-green-200 rounded-full px-2.5 py-1 shadow-sm">
              <Shield className="w-3 h-3 text-green-600" />
              <span className="text-[11px] font-bold text-green-700">Grade A-</span>
            </div>
            <div className="absolute top-3 right-3 bg-green-600 text-white rounded-full px-2.5 py-1 shadow-sm flex items-center gap-1">
              <Leaf className="w-3 h-3" />
              <span className="text-[10px] font-black">Re-Circed</span>
            </div>
            <button onClick={() => setLiked(v => !v)} className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm cursor-pointer">
              <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
            </button>
          </div>

          <div className="flex gap-2">
            {images.map((src, i) => (
              <button key={i} onClick={() => setActiveImg(i)} className={`flex-1 aspect-square rounded-xl overflow-hidden border-2 transition-colors cursor-pointer ${activeImg === i ? "border-green-500" : "border-gray-200 hover:border-gray-300"}`}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          <HealthCard />
        </div>

        {/* Product info */}
        <div className="lg:col-span-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">Sony</span>
              <span className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">Refurbished</span>
            </div>
            <h2 className="text-gray-900 text-2xl leading-snug">Sony WH-1000XM5 Wireless Headphones</h2>
            <p className="text-gray-400 text-sm mt-1.5">Industry-leading noise cancellation · 30hr battery · Multipoint</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < 4 ? "text-[#FF9900] fill-[#FF9900]" : "text-gray-200"}`} />)}
            </div>
            <span className="text-sm font-bold text-blue-600">4.6</span>
            <span className="text-gray-400 text-xs">(2,841 reviews)</span>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-gray-900">₹18,500</span>
              <span className="text-gray-300 line-through text-lg">₹24,990</span>
              <span className="text-sm font-black text-red-600">26% off</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Incl. taxes · Free delivery · 7-day returns</p>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-4">
            {[
              { icon: Leaf,   text: "Saves 4.2 kg CO₂ vs. buying new",       bg: "bg-green-50",  border: "border-green-100",  color: "text-green-600" },
              { icon: Shield, text: "AI-verified · Grade A- · 8 mo warranty", bg: "bg-blue-50",   border: "border-blue-100",   color: "text-blue-600" },
              { icon: Zap,    text: "Earn +50 pts (Buy) or +20 pts (Cart)",   bg: "bg-orange-50", border: "border-orange-100", color: "text-orange-600" },
            ].map(({ icon: Icon, text, bg, border, color }) => (
              <div key={text} className={`flex items-center gap-2.5 ${bg} border ${border} rounded-xl px-3.5 py-2.5`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-3 gap-2">
            {[
              { icon: Truck,     label: "Free Delivery", sub: "By tomorrow" },
              { icon: RotateCcw, label: "7-Day Return",  sub: "No questions" },
              { icon: Shield,    label: "AI Verified",   sub: "Grade A-" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="text-center bg-gray-50 border border-gray-100 rounded-xl p-3">
                <Icon className="w-4 h-4 text-gray-300 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-800">{label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Buy widget + wallet */}
        <div className="lg:col-span-3">
          <div className="sticky top-4 space-y-4">
            {/* Buy widget */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Price</p>
                <p className="text-2xl font-black text-gray-900">₹18,500</p>
                <p className="text-xs text-green-600 font-bold mt-0.5">✓ In stock · Ships today</p>
              </div>

              <AnimatePresence mode="wait">
                {buyState === "idle" && (
                  <motion.div key="idle" className="space-y-2" exit={{ opacity: 0 }}>
                    <motion.button
                      onClick={() => { setBuyState("bought"); award(50); }}
                      className="w-full flex items-center justify-center gap-2 bg-[#FF9900] hover:bg-amber-500 text-gray-900 font-bold rounded-xl py-3 text-sm cursor-pointer transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Buy Now · ₹18,500
                    </motion.button>
                    <motion.button
                      onClick={() => { setBuyState("carted"); award(20); }}
                      className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium cursor-pointer transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Add to Cart · +20 pts
                    </motion.button>
                  </motion.div>
                )}
                {buyState === "carted" && (
                  <motion.div
                    key="carted"
                    className="space-y-2"
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="w-full flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-xl py-3">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 text-sm font-bold">Added to Cart · +20 pts</span>
                    </div>
                    <motion.button
                      onClick={() => { setBuyState("bought"); award(30); }}
                      className="w-full flex items-center justify-center gap-2 bg-[#FF9900] hover:bg-amber-500 text-gray-900 font-bold rounded-xl py-3 text-sm cursor-pointer transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      Buy Now
                    </motion.button>
                  </motion.div>
                )}
                {buyState === "bought" && (
                  <motion.div
                    key="bought"
                    className="w-full flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-xl py-3"
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 text-sm font-bold">Order Confirmed</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <GreenWallet pts={pts} co2={co2} />

            {/* Related */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Also Recirculated</p>
              </div>
              <div className="divide-y divide-gray-100">
                {[{ name: "Bose QC45", grade: "B+", price: "₹14,200" }, { name: "AirPods Pro 2", grade: "A", price: "₹16,900" }].map(item => (
                  <div key={item.name} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400">Grade {item.grade}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-700">{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
