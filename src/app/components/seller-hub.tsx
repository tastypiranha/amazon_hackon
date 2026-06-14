import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, Cpu, AlertCircle, CheckCircle2, Zap, TrendingUp,
  MapPin, Package, Clock, ChevronRight, Leaf, BarChart2,
  Star, RefreshCw, ShieldAlert, ShieldCheck, ToggleLeft, ToggleRight,
  Edit2
} from "lucide-react";
import { ArcGauge } from "./arc-gauge";
import { useAuthContext } from "../../lib/AuthContext";
import { submitGrading, insertEvent } from "../../lib/hooks";

type Stage = "idle" | "uploading" | "analyzing" | "done" | "flagged";

const PIPELINE_STEPS = [
  "Cosmetic Analysis",
  "Functional Check",
  "Market Routing",
  "Price Discovery",
];

const CONDITIONS = ["Like New", "Good", "Fair", "Poor"] as const;
const EXCHANGE_TYPES = [
  { id: "amazon",      label: "Amazon Buyback",  color: "bg-amber-500 text-white",     border: "border-amber-500" },
  { id: "recommerce",  label: "Recommerce",       color: "bg-blue-600 text-white",      border: "border-blue-500" },
  { id: "p2p",         label: "P2P Listing",      color: "bg-green-600 text-white",     border: "border-green-500" },
] as const;

type ExchangeType = typeof EXCHANGE_TYPES[number]["id"];

const FRAUD_REASONS = [
  "Image metadata mismatch — photo taken 2 years ago",
  "Item description inconsistent with visual grade",
  "Seller account flagged: 3 prior disputes",
];

function Skel({ className }: { className: string }) {
  return (
    <motion.div
      className={`bg-gray-100 rounded-lg ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.4, repeat: Infinity }}
    />
  );
}

// ─── Analyzing pipeline ───────────────────────────────────────────────────────

function AnalyzingPanel({ isFraud }: { isFraud: boolean }) {
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    const timers = PIPELINE_STEPS.map((_, i) =>
      setTimeout(() => setActiveStep(i), i * 550)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <motion.div
          className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        <div>
          <p className="text-sm font-semibold text-gray-700">
            {isFraud ? "Fraud detection running…" : "EfficientNet-B4 running…"}
          </p>
          <p className="text-xs text-gray-400">
            {isFraud ? "Cross-checking image provenance" : "47 defect classes · grade calibration"}
          </p>
        </div>
      </div>

      {/* 4-step pipeline */}
      <div className="space-y-2">
        {PIPELINE_STEPS.map((step, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <motion.div
              key={step}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border transition-colors ${
                done ? "bg-green-50 border-green-200" :
                active ? "bg-violet-50 border-violet-200" :
                "bg-gray-50 border-gray-100"
              }`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : active ? (
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-violet-300 border-t-violet-600 flex-shrink-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
              )}
              <span className={`text-xs font-semibold ${
                done ? "text-green-700" : active ? "text-violet-700" : "text-gray-400"
              }`}>
                {step}
              </span>
              {active && (
                <motion.span
                  className="ml-auto text-[10px] text-violet-500 font-bold"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  RUNNING
                </motion.span>
              )}
              {done && (
                <span className="ml-auto text-[10px] text-green-600 font-bold">DONE</span>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-2.5 pt-1">
        <Skel className="h-3 w-3/4" />
        <Skel className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// ─── Fraud flagged state ──────────────────────────────────────────────────────

function FlaggedPanel() {
  return (
    <motion.div
      className="p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="border-2 border-red-300 bg-red-50 rounded-2xl overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-red-400 to-rose-500" />
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-gray-900 font-bold">Upload Flagged</p>
                <span className="text-[10px] font-black text-white bg-red-600 rounded-full px-2 py-px">
                  FRAUD DETECTED
                </span>
              </div>
              <p className="text-gray-500 text-sm">
                This listing has been halted. Our integrity engine detected anomalies.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reasons flagged</p>
            {FRAUD_REASONS.map((r, i) => (
              <motion.div
                key={r}
                className="flex items-start gap-2.5 bg-white border border-red-200 rounded-xl px-3.5 py-2.5"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-red-800">{r}</span>
              </motion.div>
            ))}
          </div>

          <div className="bg-white border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 leading-relaxed">
              A review request has been raised. The seller can appeal with additional documentation within 48 hours.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Grading results ──────────────────────────────────────────────────────────

function GradingResults({ imageUrl }: { imageUrl: string }) {
  const { user } = useAuthContext();
  const [accepted, setAccepted] = useState(false);
  const [payout, setPayout] = useState("3,240");
  const [editingPayout, setEditingPayout] = useState(false);
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>("Good");
  const [exchange, setExchange] = useState<ExchangeType>("amazon");

  const activeExchange = EXCHANGE_TYPES.find(e => e.id === exchange)!;

  const handleAccept = async () => {
    setAccepted(true);
    if (!user) return;
    
    // Simulate grading ID
    const returnId = Math.floor(Math.random() * 100) + 1;
    
    await submitGrading({
      return_id: returnId,
      grade: "B+",
      defects: ["Minor scuff detected on Top housing"],
      confidence: 87.2,
      routing_decision: activeExchange.label,
      payout_amount: Number(payout.replace(/,/g, ""))
    });
    
    await insertEvent({
      type: "grading",
      title: "Item Graded: B+",
      description: `Routed to ${activeExchange.label} for ₹${payout}`,
      metadata: { grade: "B+", condition, routing: activeExchange.label }
    });
  };

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Image + grade */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
          <img src={imageUrl} alt="Item" className="w-full h-full object-cover" />
          <motion.div
            className="absolute top-[28%] left-[35%] w-9 h-9"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <div className="w-full h-full rounded-full border-2 border-amber-400 bg-amber-400/10">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-amber-400"
                animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.div>
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-bold bg-amber-100 border border-amber-200 text-amber-800 rounded px-1.5 py-0.5">Scuff region</span>
          </div>
        </div>

        <div className="col-span-3 space-y-3">
          {/* Grade + arc */}
          <motion.div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4" initial={{ x: 8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <ArcGauge value={87} size={80} color="#0EA5E9" sublabel="conf." />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">AI Grade</p>
              <p className="text-5xl font-black text-gray-900 tracking-tight leading-none">B+</p>
              <p className="text-sky-600 text-xs font-bold mt-1">87% confidence</p>
            </div>
          </motion.div>

          {/* Defect */}
          <motion.div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3" initial={{ x: 8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.16 }}>
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-900">Minor scuff detected</p>
              <p className="text-[10px] text-amber-700 mt-0.5">Top housing · Severity: Low</p>
            </div>
            <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 flex-shrink-0">LOW</span>
          </motion.div>

          {/* Stats */}
          <motion.div className="bg-white border border-gray-100 rounded-xl p-3.5 grid grid-cols-3 gap-2" initial={{ x: 8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            {[
              { icon: Package, label: "Condition", value: "Good" },
              { icon: CheckCircle2, label: "Functional", value: "Pass" },
              { icon: BarChart2, label: "Market", value: "High" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon className="w-3.5 h-3.5 text-gray-300 mx-auto mb-1" />
                <p className="text-sm font-bold text-gray-900">{value}</p>
                <p className="text-[10px] text-gray-400">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Checklist */}
      <motion.div className="bg-white border border-gray-100 rounded-xl p-4" initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.24 }}>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Inspection Checklist</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "No major cracks", ok: true },
            { label: "Earcups intact",  ok: true },
            { label: "Cable functional", ok: true },
            { label: "Minor scuff",     ok: false },
          ].map(({ label, ok }) => (
            <div key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${ok ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
              <span className={`text-xs font-medium ${ok ? "text-green-800" : "text-amber-800"}`}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Confidence bars */}
      <motion.div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3" initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Model Confidence</p>
        {[
          { label: "Grade B+",   value: 87, color: "bg-sky-500" },
          { label: "Functional", value: 96, color: "bg-green-500" },
          { label: "Resellable", value: 91, color: "bg-violet-500" },
        ].map(({ label, value, color }, i) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.7, ease: "easeOut", delay: 0.35 + i * 0.08 }} />
            </div>
            <span className="text-xs font-bold text-gray-700 w-8 text-right tabular-nums">{value}%</span>
          </div>
        ))}
      </motion.div>

      {/* Routing Decision */}
      <motion.div className="border-2 border-amber-300 rounded-2xl overflow-hidden bg-white" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.38 }}>
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Routing Decision</span>
              <p className="text-gray-900 font-bold">Amazon Guaranteed Buyback</p>
            </div>
          </div>

          {/* Editable payout */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Instant Payout</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-amber-600">₹</span>
              {editingPayout ? (
                <input
                  autoFocus
                  className="text-3xl font-black text-amber-600 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1 w-36 outline-none"
                  value={payout}
                  onChange={e => setPayout(e.target.value.replace(/[^0-9,]/g, ""))}
                  onBlur={() => setEditingPayout(false)}
                />
              ) : (
                <button
                  onClick={() => setEditingPayout(true)}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <span className="text-3xl font-black text-amber-600">{payout}</span>
                  <Edit2 className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-500 transition-colors" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Tap to adjust · No auction · Payout within 24 hrs</p>
          </div>

          {/* Condition selector */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Item Condition</p>
            <div className="flex gap-2 flex-wrap">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={`text-xs font-bold rounded-full px-3 py-1.5 border cursor-pointer transition-colors ${
                    condition === c
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Exchange type selector */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Exchange Type</p>
            <div className="grid grid-cols-3 gap-2">
              {EXCHANGE_TYPES.map(et => (
                <button
                  key={et.id}
                  onClick={() => setExchange(et.id)}
                  className={`text-xs font-bold rounded-xl px-3 py-2.5 border cursor-pointer transition-all ${
                    exchange === et.id
                      ? `${et.color} ${et.border} shadow-sm`
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context stats */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: TrendingUp, text: "82% local demand", sub: "Indiranagar cluster",  color: "text-green-600" },
              { icon: MapPin,     text: "Amazon FC stock",  sub: "Electronic City node", color: "text-blue-600" },
              { icon: Clock,      text: "Prime eligible",   sub: "Same-day dispatch",    color: "text-violet-600" },
              { icon: Leaf,       text: "−1.8 kg CO₂",     sub: "vs. standard return",  color: "text-green-600" },
            ].map(({ icon: Icon, text, sub, color }) => (
              <div key={text} className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                <Icon className={`w-3.5 h-3.5 ${color} mt-0.5 flex-shrink-0`} />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{text}</p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Accept button — label changes with exchange type */}
          <AnimatePresence mode="wait">
            {!accepted ? (
              <motion.button
                key="accept"
                onClick={handleAccept}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold cursor-pointer transition-colors ${activeExchange.color}`}
                whileTap={{ scale: 0.98 }}
                exit={{ opacity: 0 }}
              >
                <Zap className="w-4 h-4" />
                Accept {activeExchange.label} · ₹{payout}
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </motion.button>
            ) : (
              <motion.div
                key="accepted"
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 bg-green-50 border border-green-200"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              >
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-700 text-sm font-bold">
                  {activeExchange.label} Accepted · Payout Initiated
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Alt routes */}
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Alternative Routes</p>
          <div className="divide-y divide-gray-100">
            {[
              { label: "Recommerce Marketplace", price: "₹2,890", tag: "SLOWER" },
              { label: "Refurbish & Relist",     price: "₹3,050", tag: "2 DAYS" },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <p className="text-xs font-medium text-gray-600 flex-1">{r.label}</p>
                <p className="text-xs font-bold text-gray-800">{r.price}</p>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">{r.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SellerHub() {
  const [stage, setStage] = useState<Stage>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isFraud, setIsFraud] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageUrl(URL.createObjectURL(file));
    setStage("uploading");
    
    // Log event to DB
    await insertEvent({
      type: "upload",
      title: "Image Uploaded for Grading",
      description: "Seller uploaded image for automated grading.",
      metadata: { file_name: file.name, fraud_sim: isFraud }
    });

    setTimeout(() => setStage("analyzing"), 700);
    setTimeout(async () => {
      const finalStage = isFraud ? "flagged" : "done";
      setStage(finalStage);
      if (isFraud) {
        await insertEvent({
          type: "fraud_alert",
          title: "Fraud Detected in Image",
          description: "System flagged metadata mismatch and description inconsistencies.",
          metadata: { reasons: FRAUD_REASONS }
        });
      }
    }, 3400);
  }, [isFraud]);

  const reset = () => {
    setStage("idle");
    setImageUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isActive = stage !== "idle";

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-gray-900 text-xl font-bold">AI Grading & Routing</h1>
            {stage === "done"    && <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-200 rounded-full px-2.5 py-0.5">GRADED</span>}
            {stage === "flagged" && <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-200 rounded-full px-2.5 py-0.5">FLAGGED</span>}
          </div>
          <p className="text-gray-400 text-sm">Upload a return photo · EfficientNet-B4 grades condition · Routes to best buyer</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Fraud simulation toggle */}
          <button
            onClick={() => setIsFraud(v => !v)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 border text-xs font-bold cursor-pointer transition-colors ${
              isFraud
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
            }`}
          >
            {isFraud ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Simulate Dishonest Seller
          </button>
          {isActive && (
            <button onClick={reset} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg px-3.5 py-2 cursor-pointer transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Items Graded Today", value: "284",    delta: "+12%",    up: true },
          { label: "Avg Grade",           value: "B+",     delta: "+1 tier", up: true },
          { label: "Buyback Rate",        value: "68%",    delta: "+4% PoP", up: true },
          { label: "Avg Payout",          value: "₹3,210", delta: "−1% PoP", up: false },
        ].map(({ label, value, delta, up }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
            <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
            <p className={`text-xs font-semibold mt-1 ${up ? "text-green-600" : "text-red-500"}`}>{delta}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upload zone */}
          <div
            className={`border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden ${
              dragging ? "border-violet-400 bg-violet-50"
              : stage === "idle" ? "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              : "border-gray-200 bg-white"
            }`}
            onClick={() => stage === "idle" && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); if (stage === "idle") setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
            <AnimatePresence mode="wait">
              {stage === "idle" && (
                <motion.div key="idle" className="p-8 flex flex-col items-center text-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Drop item photo here</p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse · JPG, PNG, WEBP</p>
                  </div>
                  {isFraud && (
                    <motion.div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <ShieldAlert className="w-3.5 h-3.5" /> Fraud mode active
                    </motion.div>
                  )}
                  {!isFraud && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-3 py-1">
                      <Cpu className="w-3.5 h-3.5" /> EfficientNet-B4 ready
                    </div>
                  )}
                </motion.div>
              )}
              {(stage === "uploading" || stage === "analyzing" || stage === "done" || stage === "flagged") && imageUrl && (
                <motion.div key="preview" className="relative aspect-square" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <img src={imageUrl} alt="Item" className="w-full h-full object-cover" />
                  {(stage === "uploading" || stage === "analyzing") && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <motion.div className="w-10 h-10 rounded-full border-2 border-violet-200 border-t-violet-600" animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                      <p className="text-sm font-semibold text-gray-700">{isFraud ? "Checking authenticity…" : "AI analyzing…"}</p>
                    </div>
                  )}
                  {stage === "done" && (
                    <motion.div className="absolute top-2 right-2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                      <div className="bg-green-100 border border-green-300 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-bold text-green-700">Graded</span>
                      </div>
                    </motion.div>
                  )}
                  {stage === "flagged" && (
                    <motion.div className="absolute top-2 right-2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                      <div className="bg-red-100 border border-red-300 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-xs font-bold text-red-700">Flagged</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Item details */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Details</p>
            </div>
            <div className="divide-y divide-gray-100">
              {[["Category","Electronics · Audio"],["SKU","SNY-WH1000XM5-BLK"],["Return reason","Customer preference"],["Days in warehouse","3 days"],["Seller","AudioZone Bengaluru"]].map(([l,v]) => (
                <div key={l} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-400">{l}</span>
                  <span className="text-xs font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pipeline</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              {PIPELINE_STEPS.map((label, i) => {
                const done = stage === "done" || stage === "flagged" ||
                  (stage === "analyzing" && false); // shown live in analyzing panel
                const stepDone = stage === "done" || stage === "flagged" ? true : false;
                return (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border ${stepDone ? "bg-green-100 border-green-300" : "bg-gray-100 border-gray-200"}`}>
                      {stepDone ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                    </div>
                    <span className={`text-xs ${stepDone ? "text-gray-700 font-semibold" : "text-gray-400"}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Grading Results</span>
              </div>
              {(stage === "uploading" || stage === "analyzing") && (
                <motion.span className="text-[10px] font-black text-violet-700 bg-violet-100 border border-violet-200 rounded-full px-2.5 py-0.5" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  PROCESSING
                </motion.span>
              )}
              {stage === "done"    && <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-200 rounded-full px-2.5 py-0.5">COMPLETE</span>}
              {stage === "flagged" && <span className="text-[10px] font-black text-red-700 bg-red-100 border border-red-200 rounded-full px-2.5 py-0.5">FLAGGED</span>}
            </div>

            <AnimatePresence mode="wait">
              {stage === "idle" && (
                <motion.div key="empty" className="flex flex-col items-center justify-center py-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-100 flex items-center justify-center mb-4">
                    <BarChart2 className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">Upload a photo to begin grading</p>
                </motion.div>
              )}
              {(stage === "uploading" || stage === "analyzing") && (
                <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AnalyzingPanel isFraud={isFraud} />
                </motion.div>
              )}
              {stage === "done" && imageUrl && (
                <motion.div key="results" className="p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <GradingResults imageUrl={imageUrl} />
                </motion.div>
              )}
              {stage === "flagged" && (
                <motion.div key="flagged" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <FlaggedPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
