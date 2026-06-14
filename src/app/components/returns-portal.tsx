import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, RotateCcw, UploadCloud, CheckCircle2, 
  ChevronRight, ArrowLeft, Leaf, Wallet, CreditCard, Box,
  AlertCircle
} from "lucide-react";

// Mock Past Orders
const PAST_ORDERS = [
  {
    id: "ORD-9281A",
    name: "Sony WH-1000XM5",
    brand: "Sony",
    category: "Audio",
    price: 18500,
    date: "Delivered 2 days ago",
    img: "https://images.unsplash.com/photo-1612858249816-5a91a9fb9886?w=400&h=400&fit=crop&auto=format",
    eligible: true,
  },
  {
    id: "ORD-3342B",
    name: "MacBook Pro 14\"",
    brand: "Apple",
    category: "Laptops",
    price: 129000,
    date: "Delivered 15 days ago",
    img: "https://images.unsplash.com/photo-1511385348-a52b4a160dc2?w=400&h=400&fit=crop&auto=format",
    eligible: false, // Past return window
  },
  {
    id: "ORD-7119C",
    name: "JBL Flip 6",
    brand: "JBL",
    category: "Audio",
    price: 6799,
    date: "Delivered yesterday",
    img: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop&auto=format",
    eligible: true,
  }
];

export function ReturnsPortal() {
  const [step, setStep] = useState<"list" | "upload" | "processing" | "result">("list");
  const [selectedOrder, setSelectedOrder] = useState<typeof PAST_ORDERS[0] | null>(null);

  const startReturn = (order: typeof PAST_ORDERS[0]) => {
    setSelectedOrder(order);
    setStep("upload");
  };

  const processReturn = () => {
    setStep("processing");
    setTimeout(() => setStep("result"), 2500); // Simulate AI evaluation
  };

  // Determine return outcome based on the item (simulating Phase 2A/2B decisions)
  const getReturnOutcome = () => {
    if (!selectedOrder) return null;
    
    // Simulate Amazon-Owned (Phase 2A) -> Full refund minus processing
    if (selectedOrder.name.includes("Sony")) {
      return {
        refund: selectedOrder.price - 150, // 150 processing fee
        message: "Your return is approved. The item will be instantly re-listed for local buyers to minimize transport emissions.",
        sustainability: "Saves 2.4 kg CO₂",
        type: "refund"
      };
    }
    
    // Simulate Damaged/Unprofitable -> Route to Circular Economy
    return {
      refund: selectedOrder.price * 0.8, // Partial value as trade-in credits
      message: "This item is heavily used. It has been routed to our Circular Economy partners for responsible recycling/refurbishment.",
      sustainability: "Earned 500 Green Credits",
      type: "credit"
    };
  };

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
                  {PAST_ORDERS.map(order => (
                    <div key={order.id} className={`flex items-center gap-5 p-4 rounded-2xl border ${order.eligible ? 'border-gray-200 hover:border-indigo-300 transition-colors bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                      <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        <img src={order.img} alt={order.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{order.id}</span>
                          <span className="text-xs text-gray-500">{order.date}</span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">{order.name}</h3>
                        <p className="text-xs text-gray-500">{order.brand} • {order.category}</p>
                        <p className="text-sm font-black text-gray-900 mt-1">₹{order.price.toLocaleString("en-IN")}</p>
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
                    <img src={selectedOrder.img} alt={selectedOrder.name} className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Return {selectedOrder.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">Please upload 2-3 clear photos of the item's current condition.</p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-indigo-300 transition-all cursor-pointer group mb-8">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6 text-indigo-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">Click to upload photos</p>
                  <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, HEIC</p>
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
            {step === "result" && selectedOrder && (
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
                      <span className="text-sm font-bold text-gray-900">₹{selectedOrder.price.toLocaleString("en-IN")}</span>
                    </div>
                    {getReturnOutcome()?.type === "refund" ? (
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
                      <span className="text-base font-black text-gray-900">{getReturnOutcome()?.type === "refund" ? "Total Refund" : "Trade-in Value"}</span>
                      <span className="text-2xl font-black text-green-600">
                        {getReturnOutcome()?.type === "refund" ? "₹" : ""}{getReturnOutcome()?.refund.toLocaleString("en-IN")}{getReturnOutcome()?.type === "credit" ? " Credits" : ""}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50/50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5"><Box className="w-5 h-5 text-indigo-600" /></div>
                      <div>
                        <p className="text-sm font-bold text-indigo-900 mb-1">Smart Routing Initiated</p>
                        <p className="text-xs text-indigo-700/80 leading-relaxed mb-3">
                          {getReturnOutcome()?.message}
                        </p>
                        <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                          <Leaf className="w-3 h-3" /> {getReturnOutcome()?.sustainability}
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
