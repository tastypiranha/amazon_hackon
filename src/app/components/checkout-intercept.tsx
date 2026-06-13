import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Leaf, AlertTriangle, CheckCircle2,
  Package, CreditCard, Lock, Info
} from "lucide-react";
import { ArcGauge } from "./arc-gauge";

const CART = [
  { id: 1, name: "Nike Air Max 270",       size: 7,   color: "Black / White",   price: 12999, qty: 1, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop&auto=format" },
  { id: 2, name: "Lululemon Align Jogger", size: "M", color: "Heathered Navy",  price: 8999, qty: 1, img: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=120&h=120&fit=crop&auto=format" },
];

const RISK_FACTORS = [
  { label: "Past Size 7 returns for this SKU",     value: "38%",   warn: true },
  { label: "Nike silhouette fit variance",          value: "High",  warn: true },
  { label: "Your purchase profile foot width",      value: "Wide",  warn: true },
  { label: "Similar profile return rate vs avg",    value: "3×",    warn: true },
];

function InterceptModal({ onSwitch, onKeep }: { onSwitch: () => void; onKeep: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px]" />
      <motion.div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-gray-900 text-sm font-bold">Return Risk Detected</h2>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">ML ALERT</span>
              </div>
              <p className="text-gray-500 text-xs">XGBoost model flagged a sizing mismatch before processing.</p>
            </div>
          </div>
        </div>

        {/* Arc gauge + risk factors */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            {/* Gauge + label row */}
            <div className="flex items-start gap-4 mb-4">
              <ArcGauge value={72} size={88} danger sublabel="risk" />
              <div className="pt-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Return Probability</p>
                <p className="text-3xl font-black text-amber-600">72%</p>
                <p className="text-xs text-gray-500 mt-0.5">High risk · Size mismatch detected</p>
              </div>
            </div>

            {/* AI risk factors */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">AI Risk Factors</p>
              {RISK_FACTORS.map((f, i) => (
                <motion.div
                  key={f.label}
                  className="flex items-center justify-between bg-white border border-amber-100 rounded-lg px-3 py-2"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                >
                  <span className="text-xs text-gray-600">{f.label}</span>
                  <span className="text-xs font-black text-amber-700 ml-3 flex-shrink-0">{f.value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Eco offer */}
          <div className="border border-green-200 bg-green-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center flex-shrink-0">
                <Leaf className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div>
                <p className="text-gray-800 text-xs font-semibold mb-0.5">
                  Switch to Size 8 for a Green Keep-It Discount
                </p>
                <p className="text-green-700 text-2xl font-bold">5% off</p>
                <p className="text-gray-400 text-[11px] mt-1">Saves ~2.3 kg CO₂ · Applied automatically</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2">
          <motion.button
            onClick={onSwitch}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 text-sm font-bold cursor-pointer transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <Leaf className="w-4 h-4" />
            Switch to Size 8 & Apply Discount
          </motion.button>
          <motion.button
            onClick={onKeep}
            className="w-full flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium cursor-pointer transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            Keep Size 7 & Continue
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SuccessState({ switched, onDismiss }: { switched: boolean; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onClick={onDismiss}
    >
      <motion.div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px]" />
      <motion.div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden cursor-default"
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
      >
        <div className={`h-0.5 w-full ${switched ? "bg-green-500" : "bg-gray-300"}`} />
        <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
          <motion.div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${switched ? "bg-green-100" : "bg-gray-100"}`}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
          >
            <CheckCircle2 className={`w-7 h-7 ${switched ? "text-green-600" : "text-gray-400"}`} />
          </motion.div>
          <div>
            <h2 className="text-gray-900 font-bold">{switched ? "Discount Applied" : "Order Continuing"}</h2>
            <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
              {switched ? "Size updated to 8 · 5% discount applied to cart." : "Continuing with Size 7."}
            </p>
          </div>
          {switched && (
            <motion.div
              className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            >
              <Leaf className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-700 text-sm font-semibold">−2.3 kg CO₂ · ₹650 saved</span>
            </motion.div>
          )}
        </div>
        {/* Auto-dismiss progress bar */}
        <motion.div
          className={`h-0.5 ${switched ? "bg-green-500" : "bg-gray-400"}`}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 3, ease: "linear" }}
        />
      </motion.div>
    </motion.div>
  );
}

export function CheckoutIntercept() {
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<null | "switched" | "kept">(null);

  const displayItems = CART.map(item =>
    result === "switched" && item.id === 1 ? { ...item, size: 8, price: item.price * 0.95 } : item
  );
  const subtotal = displayItems.reduce((s, i) => s + i.price, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-gray-900 text-xl font-bold">Checkout Intercept</h1>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5">
            PRIYA · SESSION #8821
          </span>
        </div>
        <p className="text-gray-400 text-sm">XGBoost return-risk model · triggered at cart review</p>
      </div>

      {/* ML alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-start gap-3 mb-6">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>Re-Circ ML Engine</strong> — 72% return probability detected on Nike Air Max 270 (Size 7).{" "}
          <button onClick={() => result === null && setShowModal(true)} className="underline font-semibold cursor-pointer hover:no-underline">
            Review size recommendation →
          </button>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Cart */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Cart Items</p>
            <span className="text-xs text-gray-400">{CART.length} items</span>
          </div>

          {displayItems.map(item => (
            <motion.div key={item.id} layout className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">Size {item.size}</span>
                  <span className="text-xs text-gray-400">{item.color}</span>
                  {item.id === 1 && result === "switched" && (
                    <motion.span
                      className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-px"
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    >
                      Updated · 5% off
                    </motion.span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">₹{item.price.toLocaleString("en-IN")}</p>
                <p className="text-xs text-gray-400 mt-0.5">Qty {item.qty}</p>
              </div>
            </motion.div>
          ))}

          {/* Risk metrics */}
          <div className="grid grid-cols-3 gap-3 mt-2">
            {[
              { label: "Return Risk",  value: "72%",    color: "text-amber-600" },
              { label: "Affected SKU", value: "1 of 2", color: "text-gray-700" },
              { label: "CO₂ at stake", value: "2.3 kg", color: "text-green-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-3.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden sticky top-4">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Order Summary</p>
            </div>
            <div className="p-5 space-y-3.5">
              {displayItems.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 truncate max-w-[160px]">{item.name}</span>
                  <span className="text-xs font-semibold text-gray-800">₹{item.price.toLocaleString("en-IN")}</span>
                </div>
              ))}

              <div className="border-t border-gray-100 pt-3 space-y-2">
                {result === "switched" && (
                  <motion.div className="flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span className="text-xs text-green-700 font-medium">Green Discount (5%)</span>
                    <span className="text-xs font-bold text-green-700">−₹{Math.round(CART[0].price * 0.05).toLocaleString("en-IN")}</span>
                  </motion.div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Shipping</span>
                  <span className="text-xs font-semibold text-green-600">Free</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <motion.span key={subtotal} className="text-lg font-bold text-gray-900">
                  ₹{Math.round(subtotal).toLocaleString("en-IN")}
                </motion.span>
              </div>

              <motion.button
                onClick={() => result === null && setShowModal(true)}
                disabled={result !== null}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold cursor-pointer transition-colors ${
                  result !== null ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-[#FF9900] hover:bg-amber-500 text-gray-900"
                }`}
                whileTap={result === null ? { scale: 0.98 } : undefined}
              >
                <CreditCard className="w-4 h-4" />
                {result !== null ? "Order Processed" : "Proceed to Payment"}
              </motion.button>

              <div className="flex items-center justify-center gap-1.5 text-gray-400">
                <Lock className="w-3 h-3" />
                <span className="text-[11px]">256-bit SSL · PCI DSS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <InterceptModal
            onSwitch={() => { setShowModal(false); setResult("switched"); }}
            onKeep={() => { setShowModal(false); setResult("kept"); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {result !== null && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuccessState switched={result === "switched"} onDismiss={() => setResult(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
