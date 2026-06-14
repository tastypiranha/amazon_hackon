import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, RotateCcw, UploadCloud, CheckCircle2, 
  ChevronRight, ArrowLeft, Leaf, Wallet, CreditCard, Box,
  AlertCircle
} from "lucide-react";
import { useAuthContext } from "../../lib/AuthContext";
import { usePastOrders, createReturn, awardGreenCredits, insertEvent } from "../../lib/hooks";
import { comparePhotos, classifyImage } from "../../lib/api";

// Mock Past Orders
const DEMO_PAST_ORDERS = [
  {
    id: "ORD-9281A",
    products: {
      name: "Sony WH-1000XM5",
      brand: "Sony",
      category: "Audio",
      image_url: "https://images.unsplash.com/photo-1612858249816-5a91a9fb9886?w=400&h=400&fit=crop&auto=format"
    },
    price: 18500,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    eligible: true,
  },
  {
    id: "ORD-3342B",
    products: {
      name: "MacBook Pro 14\"",
      brand: "Apple",
      category: "Laptops",
      image_url: "https://images.unsplash.com/photo-1511385348-a52b4a160dc2?w=400&h=400&fit=crop&auto=format"
    },
    price: 129000,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    eligible: false, // Past return window
  },
  {
    id: "ORD-7119C",
    products: {
      name: "JBL Flip 6",
      brand: "JBL",
      category: "Audio",
      image_url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop&auto=format"
    },
    price: 6799,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    eligible: true,
  }
];

export function ReturnsPortal() {
  const { user } = useAuthContext();
  const { orders, loading } = usePastOrders(user?.id || "");

  const [step, setStep] = useState<"list" | "upload" | "processing" | "result">("list");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  if (loading) return <div className="p-8 text-gray-500">Loading orders...</div>;

  const displayOrders = orders.length > 0 ? orders.map(o => ({
    ...o,
    eligible: new Date(o.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  })) : DEMO_PAST_ORDERS;

  const startReturn = (order: any) => {
    setSelectedOrder(order);
    setStep("upload");
  };

  const processReturn = async () => {
    setStep("processing");
    
    try {
      // If the user uploaded an image, try to classify it via backend
      if (uploadedFile) {
        const classResult = await classifyImage(uploadedFile, "electrical_appliances");
        if (classResult && !classResult.error) {
          setComparisonResult(classResult);
        }
      }
    } catch (err) {
      console.error("Backend classification failed, continuing with mock:", err);
    }

    // Continue with return processing
    if (user && selectedOrder) {
      await createReturn({
        order_id: typeof selectedOrder.id === 'number' ? selectedOrder.id : 1,
        user_id: user.id,
        reason: "Customer preference",
        condition_notes: "Item is in original condition, uploading photos.",
        status: "pending_grading"
      });

      await insertEvent({
        type: "return_initiated",
        title: "Return Request Created",
        description: `User requested return for ${selectedOrder.products?.name}`,
        metadata: { order_id: selectedOrder.id }
      });

      const outcome = getReturnOutcome(selectedOrder);
      if (outcome?.type === "credit") {
        await awardGreenCredits(user.id, 500, 0, "circular_economy_trade_in");
      }
    }
    setStep("result");
  };

  // Determine return outcome based on the item (simulating Phase 2A/2B decisions)
  const getReturnOutcome = (order: any) => {
    if (!order) return null;
    
    // Simulate Amazon-Owned (Phase 2A) -> Full refund minus processing
    if (order.products?.name.includes("Sony")) {
      return {
        refund: order.price - 150, // 150 processing fee
        message: "Your return is approved. The item will be instantly re-listed for local buyers to minimize transport emissions.",
        sustainability: "Saves 2.4 kg CO₂",
        type: "refund"
      };
    }
    
    // Simulate Damaged/Unprofitable -> Route to Circular Economy
    return {
      refund: order.price * 0.8, // Partial value as trade-in credits
      message: "This item is heavily used. It has been routed to our Circular Economy partners for responsible recycling/refurbishment.",
      sustainability: "Earned 500 Green Credits",
      type: "credit"
    };
  };

  const outcome = getReturnOutcome(selectedOrder);

  return (
    <div className="min-h-full bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
            <RotateCcw className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Returns & Exchanges</h1>
          <p className="text-gray-500 text-sm mt-1">Hassle-free returns powered by AI valuation.</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: ORDER LIST */}
            {step === "list" && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              >
                <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Orders</h2>
                <div className="space-y-4">
                  {displayOrders.map((order: any) => (
                    <div key={order.id} className={`flex items-center gap-5 p-4 rounded-2xl border ${order.eligible ? 'border-gray-200 hover:border-indigo-300 transition-colors bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                      <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        <img src={order.products?.image_url} alt={order.products?.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{order.id}</span>
                          <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">{order.products?.name}</h3>
                        <p className="text-xs text-gray-500">{order.products?.brand} • {order.products?.category}</p>
                        <p className="text-sm font-black text-gray-900 mt-1">₹{Number(order.price).toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        {order.eligible ? (
                          <button 
                            onClick={() => startReturn(order)}
                            className="bg-gray-900 hover:bg-indigo-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Return Item
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">Return Window Closed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2: CONDITION UPLOAD */}
            {step === "upload" && selectedOrder && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              >
                <button onClick={() => setStep("list")} className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-900 mb-6 transition-colors cursor-pointer">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
                </button>
                
                <div className="flex gap-6 mb-8">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                    <img src={selectedOrder.products?.image_url} alt={selectedOrder.products?.name} className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Return {selectedOrder.products?.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">Please upload 2-3 clear photos of the item's current condition.</p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-indigo-300 transition-all cursor-pointer group mb-8"
                  onClick={() => document.getElementById('return-upload')?.click()}
                >
                  <input 
                    id="return-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setUploadedFile(f);
                    }}
                  />
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6 text-indigo-500" />
                  </div>
                  {uploadedFile ? (
                    <>
                      <p className="text-sm font-bold text-green-700">✓ {uploadedFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">Click to change</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-gray-900">Click to upload photos</p>
                      <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, HEIC</p>
                    </>
                  )}
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={processReturn}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors cursor-pointer"
                  >
                    Submit for AI Evaluation <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PROCESSING */}
            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="py-20 flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6" />
                <h2 className="text-lg font-bold text-gray-900 mb-2">AI Assessing Condition...</h2>
                <p className="text-sm text-gray-500 max-w-sm">Our vision models are comparing your photos against the original listing to verify the grade and calculate your refund.</p>
              </motion.div>
            )}

            {/* STEP 4: RESULT */}
            {step === "result" && selectedOrder && outcome && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Return Approved</h2>
                
                {/* Consumer Facing Clean Breakdown */}
                <div className="max-w-md mx-auto mt-8 bg-gray-50 border border-gray-200 rounded-3xl overflow-hidden text-left">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-semibold text-gray-600">Original Price</span>
                      <span className="text-sm font-bold text-gray-900">₹{Number(selectedOrder.price).toLocaleString("en-IN")}</span>
                    </div>
                    {outcome.type === "refund" ? (
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-gray-400"/> Processing Fee</span>
                        <span className="text-sm font-bold text-red-600">- ₹150</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-gray-400"/> Condition Depreciation</span>
                        <span className="text-sm font-bold text-red-600">- 20%</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <span className="text-base font-black text-gray-900">{outcome.type === "refund" ? "Total Refund" : "Trade-in Value"}</span>
                      <span className="text-2xl font-black text-green-600">
                        {outcome.type === "refund" ? "₹" : ""}{outcome.refund.toLocaleString("en-IN")}{outcome.type === "credit" ? " Credits" : ""}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50/50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5"><Box className="w-5 h-5 text-indigo-600" /></div>
                      <div>
                        <p className="text-sm font-bold text-indigo-900 mb-1">Smart Routing Initiated</p>
                        <p className="text-xs text-indigo-700/80 leading-relaxed mb-3">
                          {outcome.message}
                        </p>
                        <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                          <Leaf className="w-3 h-3" /> {outcome.sustainability}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-center gap-4">
                  <button 
                    onClick={() => { setStep("list"); setSelectedOrder(null); }}
                    className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
