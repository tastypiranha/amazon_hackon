import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, Cpu, AlertCircle, CheckCircle2, Zap,
  Package, ChevronRight, BarChart2,
  Star, RefreshCw, ShieldAlert, ShieldCheck, ToggleLeft, ToggleRight
} from "lucide-react";
import { ArcGauge } from "./arc-gauge";
import { useAuthContext } from "../../lib/AuthContext";
import { submitGrading, insertEvent } from "../../lib/hooks";
import { classifyImage, getDecision } from "../../lib/api";
import { addListedProduct } from "../../lib/product-store";

type Stage = "idle" | "uploading" | "analyzing" | "done" | "flagged";

const PIPELINE_STEPS = [
  "Cosmetic Analysis",
  "Functional Check",
  "Market Routing",
  "Price Discovery",
];

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

function GradingResults({ imageUrl, classificationResult, decisionResult, onNav, modelName, selectedCategory, sellerLocation, sellerPrice }: { imageUrl: string; classificationResult?: any; decisionResult?: any; onNav?: (id: string) => void; modelName?: string; selectedCategory?: string; sellerLocation?: string; sellerPrice?: string }) {
  const { user } = useAuthContext();
  const [accepted, setAccepted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [exchange, setExchange] = useState<ExchangeType>("amazon");

  // Real classification data from backend
  const classifiedCondition = classificationResult?.condition || "unknown";
  const confidenceScores = classificationResult?.confidence || {};
  const confidence = confidenceScores[classifiedCondition] 
    ? Math.round(confidenceScores[classifiedCondition] * 100) 
    : 0;
  const category = classificationResult?.category || "";
  
  // Map condition to grade based on what backend returned
  const gradeMap: Record<string, string> = { resell: "A", refurbish: "B+", recycle: "C", refurnish: "B+" };
  const grade = gradeMap[classifiedCondition] || "—";

  // Decision engine data (from /api/decide)
  const isAmazonBuy = decisionResult?.decision === "AMAZON_PURCHASES";
  const kMax = decisionResult?.k_max;
  const bestWarehouse = decisionResult?.best_warehouse;
  const sellingPrice = decisionResult?.selling_price_si;
  const listingPrice = decisionResult?.listing_price_shown;
  const sellerGets = decisionResult?.seller_gets;
  const pricesComparison = decisionResult?.prices_comparison;
  const allKi = decisionResult?.all_ki;

  // For rejected items, show options
  const options = decisionResult?.options;

  const activeExchange = EXCHANGE_TYPES.find(e => e.id === exchange)!;

  const handleAccept = async () => {
    setAccepted(true);
    
    // Add product to the listed products store
    const bestWarehouse = (decisionResult?.best_warehouse || "").toLowerCase() || sellerLocation || "delhi";
    const condition = classifiedCondition || "resell";
    
    // Customer-facing price = S_i at best warehouse (the market selling price)
    // For Amazon buy: it's selling_price_si
    // For Option 1 (lower price): it's prices_comparison[condition] at best warehouse
    let customerPrice: number;
    if (isAmazonBuy) {
      customerPrice = decisionResult?.selling_price_si || parseFloat(sellerPrice || "0");
    } else {
      // Use the selling price for this condition at best warehouse
      customerPrice = decisionResult?.prices_comparison?.[condition] || parseFloat(sellerPrice || "0");
    }

    if (isAmazonBuy || selectedOption === "option_1") {
      addListedProduct({
        id: Date.now(),
        name: modelName || "Unnamed Product",
        category: selectedCategory || "electrical_appliances",
        condition: condition,
        price: customerPrice,
        originalPrice: parseFloat(sellerPrice || "0"),
        location: bestWarehouse,
        sellerLocation: sellerLocation || "delhi",
        imageUrl: imageUrl,
        listedAt: new Date().toISOString(),
        listingType: "amazon",
        userId: user?.email || "guest",
      });
    } else if (selectedOption === "option_2") {
      // P2P local listing — listed at seller's own location
      addListedProduct({
        id: Date.now(),
        name: modelName || "Unnamed Product",
        category: selectedCategory || "electrical_appliances",
        condition: condition,
        price: parseFloat(sellerPrice || "0"),
        originalPrice: parseFloat(sellerPrice || "0"),
        location: sellerLocation || "delhi",
        sellerLocation: sellerLocation || "delhi",
        imageUrl: imageUrl,
        listedAt: new Date().toISOString(),
        listingType: "p2p",
        userId: user?.email || "guest",
      });
    } else if (selectedOption === "option_3") {
      // Exchange listing
      addListedProduct({
        id: Date.now(),
        name: modelName || "Unnamed Product",
        category: selectedCategory || "electrical_appliances",
        condition: condition,
        price: parseFloat(sellerPrice || "0"),
        originalPrice: parseFloat(sellerPrice || "0"),
        location: sellerLocation || "delhi",
        sellerLocation: sellerLocation || "delhi",
        imageUrl: imageUrl,
        listedAt: new Date().toISOString(),
        listingType: "exchange",
        userId: user?.email || "guest",
        exchangeValue: decisionResult?.options?.option_3_exchange?.your_item_value || parseFloat(sellerPrice || "0"),
      });
    } else if (selectedOption === "option_4") {
      // Donation listing
      addListedProduct({
        id: Date.now(),
        name: modelName || "Unnamed Product",
        category: selectedCategory || "electrical_appliances",
        condition: condition,
        price: 0,
        originalPrice: parseFloat(sellerPrice || "0"),
        location: sellerLocation || "delhi",
        sellerLocation: sellerLocation || "delhi",
        imageUrl: imageUrl,
        listedAt: new Date().toISOString(),
        listingType: "donate",
        userId: user?.email || "guest",
      });
    }

    // Log the event (non-blocking)
    if (user) {
      insertEvent({
        type: "grading",
        title: `Item Graded: ${grade}`,
        description: `Condition: ${classifiedCondition} | Selected: ${selectedOption || "amazon_buyback"} | Listed at: ${bestWarehouse}`,
        metadata: { grade, condition: classifiedCondition, selectedOption, k_max: kMax, warehouse: bestWarehouse }
      }).catch(() => {});
    }

    // Navigate to the appropriate page based on selection
    if (onNav) {
      setTimeout(() => {
        if (isAmazonBuy || selectedOption === "option_1") {
          onNav("home"); // Go to Discover — product is now listed there
        } else if (selectedOption === "option_2") {
          onNav("p2p");
        } else if (selectedOption === "option_3") {
          onNav("exchange");
        } else if (selectedOption === "option_4") {
          onNav("donations");
        }
      }, 2000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="border-2 border-amber-300 rounded-2xl overflow-hidden bg-white" initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Routing Decision</span>
              <p className="text-gray-900 font-bold">
                {isAmazonBuy ? "Amazon Guaranteed Buyback" : "Seller Marketplace Options"}
              </p>
            </div>
          </div>

          {isAmazonBuy && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Instant Payout (You Get)</p>
              <span className="text-3xl font-black text-amber-600">₹{Number(sellerGets || 0).toLocaleString("en-IN")}</span>
              <p className="text-xs text-gray-400 mt-1">No auction · Payout within 24 hrs</p>
            </div>
          )}

          {!isAmazonBuy && options && (
            <div className="space-y-3">
              {options.option_1_lower_price && (
                <div 
                  onClick={() => setSelectedOption("option_1")}
                  className={`rounded-xl p-3 cursor-pointer transition-all border-2 ${selectedOption === "option_1" ? "border-blue-500 bg-blue-50 shadow-sm" : "border-blue-200 bg-blue-50/50 hover:border-blue-300"}`}
                >
                  <p className="text-xs font-bold text-blue-900">Option 1: Lower Your Price</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">{options.option_1_lower_price.description}</p>
                  <p className="text-sm font-black text-blue-800 mt-1">Revised: ₹{Number(options.option_1_lower_price.revised_price).toLocaleString("en-IN")}</p>
                </div>
              )}
              {options.option_2_list_locally && (
                <div 
                  onClick={() => setSelectedOption("option_2")}
                  className={`rounded-xl p-3 cursor-pointer transition-all border-2 ${selectedOption === "option_2" ? "border-green-500 bg-green-50 shadow-sm" : "border-green-200 bg-green-50/50 hover:border-green-300"}`}
                >
                  <p className="text-xs font-bold text-green-900">Option 2: List Locally</p>
                  <p className="text-[10px] text-green-700 mt-0.5">{options.option_2_list_locally.description}</p>
                  <p className="text-sm font-black text-green-800 mt-1">Customer pays: ₹{Number(options.option_2_list_locally.customer_pays).toLocaleString("en-IN")}</p>
                </div>
              )}
              {options.option_3_exchange && (
                <div 
                  onClick={() => setSelectedOption("option_3")}
                  className={`rounded-xl p-3 cursor-pointer transition-all border-2 ${selectedOption === "option_3" ? "border-violet-500 bg-violet-50 shadow-sm" : "border-violet-200 bg-violet-50/50 hover:border-violet-300"}`}
                >
                  <p className="text-xs font-bold text-violet-900">Option 3: Exchange</p>
                  <p className="text-[10px] text-violet-700 mt-0.5">{options.option_3_exchange.description}</p>
                  <p className="text-sm font-black text-violet-800 mt-1">Item value: ₹{Number(options.option_3_exchange.your_item_value).toLocaleString("en-IN")}</p>
                </div>
              )}
              {options.option_4_donate && (
                <div 
                  onClick={() => setSelectedOption("option_4")}
                  className={`rounded-xl p-3 cursor-pointer transition-all border-2 ${selectedOption === "option_4" ? "border-rose-500 bg-rose-50 shadow-sm" : "border-rose-200 bg-rose-50/50 hover:border-rose-300"}`}
                >
                  <p className="text-xs font-bold text-rose-900">Option 4: Donate</p>
                  <p className="text-[10px] text-rose-700 mt-0.5">{options.option_4_donate.description}</p>
                </div>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            {!accepted ? (
              <motion.button
                key="accept"
                onClick={handleAccept}
                disabled={!isAmazonBuy && !selectedOption}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold cursor-pointer transition-colors ${
                  !isAmazonBuy && !selectedOption 
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                    : activeExchange.color
                }`}
                whileTap={(!isAmazonBuy && !selectedOption) ? undefined : { scale: 0.98 }}
                exit={{ opacity: 0 }}
              >
                <Zap className="w-4 h-4" />
                {isAmazonBuy
                  ? `Accept Amazon Buyback · ₹${Number(sellerGets || 0).toLocaleString("en-IN")}`
                  : selectedOption 
                    ? `Confirm ${selectedOption === "option_1" ? "Lower Price" : selectedOption === "option_2" ? "List Locally" : selectedOption === "option_3" ? "Exchange" : "Donate"}`
                    : "Select an option above"
                }
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
                  {isAmazonBuy ? "Accepted · ₹" + Number(sellerGets || 0).toLocaleString("en-IN") + " credited · Product listed!" 
                    : selectedOption === "option_1" ? "Transaction Successful · ₹" + Number(decisionResult?.options?.option_1_lower_price?.revised_price || 0).toLocaleString("en-IN") + " credited!"
                    : selectedOption === "option_2" ? "Confirmed · Opening P2P Listing..."
                    : selectedOption === "option_3" ? "Confirmed · Finding Exchange Matches..."
                    : selectedOption === "option_4" ? "Confirmed · Opening Donation Hub..."
                    : "Accepted"
                  }
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Collapsible Backend Calculations */}
      <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden bg-white">
        <button
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <span>Backend Calculations (AI Engine)</span>
          <span className="text-gray-300">{showDetails ? "▲" : "▼"}</span>
        </button>
        {showDetails && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
            {/* Classification confidence */}
            {classificationResult?.confidence && (
              <div className="pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Classification Confidence</p>
                {Object.entries(classificationResult.confidence as Record<string, number>).map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-gray-400 w-16 capitalize">{label}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${label === "resell" ? "bg-green-500" : label === "refurbish" ? "bg-sky-500" : "bg-amber-500"}`} style={{ width: `${Math.round(Number(value) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 w-8 text-right">{Math.round(Number(value) * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
            {/* Price comparison */}
            {decisionResult?.prices_comparison && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Estimated Selling Prices (Best Warehouse)</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(decisionResult.prices_comparison).map(([route, price]) => (
                    <div key={route} className={`text-center p-2 rounded-lg border ${route === classificationResult?.condition ? "border-amber-300 bg-amber-50" : "border-gray-100 bg-gray-50"}`}>
                      <p className="text-sm font-black text-gray-900">₹{Number(price).toLocaleString("en-IN")}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{route}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* K-scores */}
            {decisionResult?.all_ki && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Warehouse K-Scores</p>
                {Object.entries(decisionResult.all_ki).map(([loc, kVal]) => (
                  <div key={loc} className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-gray-400 w-16 uppercase">{loc}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${loc === decisionResult.best_warehouse?.toLowerCase() ? "bg-amber-500" : "bg-gray-300"}`} style={{ width: `${Math.min(Math.max(Number(kVal) / 50, 0), 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 w-14 text-right">{Number(kVal).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Decision metadata */}
            {decisionResult && (
              <div className="text-[10px] text-gray-400 space-y-0.5 pt-1 border-t border-gray-100">
                <p>Decision: {decisionResult.decision} | K-max: {decisionResult.k_max?.toFixed(2)} | Best: {decisionResult.best_warehouse}</p>
                <p>Condition: {classificationResult?.condition} | Category: {classificationResult?.category}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
// ─── Main component ───────────────────────────────────────────────────────────

export function SellerHub({ onNav }: { onNav?: (id: string) => void }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isFraud, setIsFraud] = useState(false);
  const [classificationResult, setClassificationResult] = useState<any>(null);
  const [decisionResult, setDecisionResult] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [modelName, setModelName] = useState("");
  const [sellerLocation, setSellerLocation] = useState("");
  const [sellerPrice, setSellerPrice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const currentFileRef = useRef<File | null>(null);

  const LOCATIONS = ["delhi", "chennai", "mumbai", "lucknow", "kolkata", "prayagraj"];

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    // Convert to base64 so it persists in localStorage across reloads
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    currentFileRef.current = file;
    setStage("uploading");
    
    // Log event to DB (non-blocking)
    insertEvent({
      type: "upload",
      title: "Image Uploaded for Grading",
      description: "Seller uploaded image for automated grading.",
      metadata: { file_name: file.name, fraud_sim: isFraud }
    }).catch(() => {});

    setStage("analyzing");

    try {
      // Call the real backend classify endpoint
      const result = await classifyImage(file, selectedCategory);
      console.log("Classification result:", result);
      
      if (result.error) {
        console.error("Classification error:", result.error);
        // Still set the result so UI shows what went wrong
        setClassificationResult(result);
        setStage(isFraud ? "flagged" : "done");
        return;
      }

      setClassificationResult(result);

      // Now call the decision engine
      try {
        const price = parseFloat(sellerPrice) || 3000;
        const location = sellerLocation || "delhi";
        const decision = await getDecision(location, selectedCategory, price, result.condition);
        console.log("Decision result:", decision);
        setDecisionResult(decision);
      } catch (decErr) {
        console.error("Decision engine failed:", decErr);
        // Continue without decision data — classification still shows
      }

      if (isFraud) {
        setStage("flagged");
        try {
          await insertEvent({
            type: "fraud_alert",
            title: "Fraud Detected in Image",
            description: "System flagged metadata mismatch and description inconsistencies.",
            metadata: { reasons: FRAUD_REASONS }
          });
        } catch {}
      } else {
        setStage("done");
      }
    } catch (err) {
      console.error("Backend call failed:", err);
      // Fallback: still show grading stage
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
    }
  }, [isFraud, selectedCategory, sellerLocation, sellerPrice]);

  const reset = () => {
    setStage("idle");
    setImageUrl(null);
    setClassificationResult(null);
    setDecisionResult(null);
    setSelectedCategory("");
    setModelName("");
    setSellerLocation("");
    setSellerPrice("");
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category selector */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product Category</p>
            </div>
            <div className="p-3 flex gap-2 flex-wrap">
              {[
                { id: "electrical_appliances", label: "Electrical Appliances" },
                { id: "clothing", label: "Clothing" },
                { id: "household_utensils", label: "Household Utensils" },
                { id: "vehicle", label: "Vehicle" },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-xs font-bold rounded-full px-3 py-1.5 border cursor-pointer transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model/Product name input */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product / Model Name</p>
            </div>
            <div className="p-3">
              <input
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                placeholder="e.g. Sony WH-1000XM5, Levi's 511, Honda Activa 6G..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Seller Location */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your Location</p>
            </div>
            <div className="p-3 flex gap-2 flex-wrap">
              {LOCATIONS.map(loc => (
                <button
                  key={loc}
                  onClick={() => setSellerLocation(loc)}
                  className={`text-xs font-bold rounded-full px-3 py-1.5 border cursor-pointer transition-colors capitalize ${
                    sellerLocation === loc
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Seller Price */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your Asking Price (₹)</p>
            </div>
            <div className="p-3">
              <input
                type="number"
                value={sellerPrice}
                onChange={e => setSellerPrice(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Upload zone — only enabled after all fields are filled */}
          <div
            className={`border-2 border-dashed rounded-xl transition-all overflow-hidden ${
              !selectedCategory || !modelName.trim() || !sellerLocation || !sellerPrice
                ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                : dragging ? "border-violet-400 bg-violet-50 cursor-pointer"
                : stage === "idle" ? "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                : "border-gray-200 bg-white cursor-pointer"
            }`}
            onClick={() => {
              if (!selectedCategory || !modelName.trim() || !sellerLocation || !sellerPrice) return;
              if (stage === "idle") fileRef.current?.click();
            }}
            onDragOver={e => { e.preventDefault(); if (stage === "idle" && selectedCategory && modelName.trim() && sellerLocation && sellerPrice) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (!selectedCategory || !modelName.trim() || !sellerLocation || !sellerPrice) return; const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && selectedCategory && modelName.trim() && sellerLocation && sellerPrice) processFile(f); }} />
            <AnimatePresence mode="wait">
              {stage === "idle" && (
                <motion.div key="idle" className="p-8 flex flex-col items-center text-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    {(!selectedCategory || !modelName.trim() || !sellerLocation || !sellerPrice) ? (
                      <>
                        <p className="text-sm font-semibold text-gray-400">Fill in all fields above first</p>
                        <p className="text-xs text-gray-300 mt-1">Category, model name, location & price required</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-700">Drop item photo here</p>
                        <p className="text-xs text-gray-400 mt-1">or click to browse · JPG, PNG, WEBP</p>
                      </>
                    )}
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
                  <GradingResults imageUrl={imageUrl} classificationResult={classificationResult} decisionResult={decisionResult} onNav={onNav} modelName={modelName} selectedCategory={selectedCategory} sellerLocation={sellerLocation} sellerPrice={sellerPrice} />
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
