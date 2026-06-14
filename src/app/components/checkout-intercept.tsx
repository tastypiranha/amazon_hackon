import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Leaf, CheckCircle2,
  CreditCard, Lock, Info
} from "lucide-react";
import { useCart, updateCart } from "../../lib/hooks";
import { useAuthContext } from "../../lib/AuthContext";
import { getListedProducts, ListedProduct, removeListedProduct } from "../../lib/product-store";


function InterceptModal({ onSwitch, onKeep, cartItems }: { onSwitch: () => void; onKeep: () => void; cartItems: any[] }) {
  const [greenPoints, setGreenPoints] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGreenPoints() {
      try {
        const item = cartItems[0];
        const category = item?.products?.category || item?.color || "electrical_appliances";
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/green-points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: category.toLowerCase().replace(/ /g, "_"),
            is_local: true,
            condition: "resell",
            logistics_fee: 0
          })
        });
        const data = await res.json();
        setGreenPoints(data);
      } catch (err) {
        console.error("Green points fetch failed:", err);
      }
      setLoading(false);
    }
    fetchGreenPoints();
  }, [cartItems]);

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
        <div className="h-0.5 w-full bg-gradient-to-r from-green-400 to-emerald-500" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-gray-900 text-sm font-bold">Green Purchase Reward</h2>
              <p className="text-gray-500 text-xs mt-0.5">Earn eco-credits by buying refurbished products</p>
            </div>
          </div>
        </div>

        {/* Green points data */}
        <div className="px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <motion.div className="w-8 h-8 rounded-full border-2 border-green-200 border-t-green-600" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            </div>
          ) : greenPoints ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">You'll Earn</p>
                <p className="text-4xl font-black text-green-700">{greenPoints.final_points}</p>
                <p className="text-sm text-green-600 font-semibold mt-1">Green Credits</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-gray-900">₹{greenPoints.cashback_value_inr}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Cashback Value</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-gray-900">{greenPoints.co2_saved_kg} kg</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">CO₂ Saved</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-xs text-emerald-800">By buying refurbished, you're keeping this product out of landfill and reducing carbon emissions.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Could not calculate green points</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2">
          <motion.button
            onClick={onSwitch}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 text-sm font-bold cursor-pointer transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            <Leaf className="w-4 h-4" />
            Complete Purchase & Earn Credits
          </motion.button>
          <motion.button
            onClick={onKeep}
            className="w-full flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium cursor-pointer transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SuccessState({ switched, onDismiss, finalTotal }: { switched: boolean; onDismiss: () => void; finalTotal: number }) {
  const earnedCredits = Math.round(finalTotal * 0.10); // 10% of amount spent
  
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
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
        <div className="h-0.5 w-full bg-green-500" />
        <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
          <motion.div
            className="w-14 h-14 rounded-full flex items-center justify-center bg-green-100"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
          >
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </motion.div>
          <div>
            <h2 className="text-gray-900 font-bold text-lg">Purchase Successful!</h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              <span className="font-bold text-green-700">{earnedCredits} green credits</span> will be added to your account after <span className="font-bold text-gray-700">7 days</span> (return period).
            </p>
          </div>
        </div>
        <motion.div
          className="h-0.5 bg-green-500"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 6, ease: "linear" }}
        />
      </motion.div>
    </motion.div>
  );
}

// No more hardcoded demo cart

export function CheckoutIntercept({ selectedProductId, userLocation }: { selectedProductId?: number; userLocation?: string | null }) {
  const { user } = useAuthContext();
  const { cart, loading } = useCart(user?.id || "");

  const [result, setResult] = useState<null | "switched" | "kept">(null);
  const [useGreenCredits, setUseGreenCredits] = useState(false);
  const [purchased, setPurchased] = useState(false);

  if (loading) return <div className="p-8 text-gray-500">Loading cart...</div>;

  // Check if a product from the store was selected
  const allListedProducts = getListedProducts();
  const selectedProduct = selectedProductId ? allListedProducts.find(p => p.id === selectedProductId) : null;

  // Build cart items: use selected product if available, else DB cart
  let cartItems: any[];
  if (selectedProduct) {
    cartItems = [{
      id: selectedProduct.id,
      products: { name: selectedProduct.name, image_url: selectedProduct.imageUrl || "" },
      size: "—",
      color: selectedProduct.condition,
      price: selectedProduct.price,
      quantity: 1,
    }];
  } else if (cart.length > 0) {
    cartItems = cart;
  } else {
    cartItems = [];
  }

  // If cart is empty or purchase completed, show empty state
  if (cartItems.length === 0 || purchased) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center py-20">
        <CreditCard className="w-10 h-10 text-gray-200 mb-4" />
        <h2 className="text-lg font-bold text-gray-900">Your cart is empty</h2>
        <p className="text-sm text-gray-400 mt-1">Browse products in Discover and add them to checkout.</p>
      </div>
    );
  }

  const displayItems = cartItems.map(item =>
    result === "switched" && item.id === 1 ? { ...item, size: 8, price: item.price * 0.95 } : item
  );
  
  const subtotal = displayItems.reduce((s, i) => s + (i.price * i.quantity), 0);

  // Transaction fee = processing fee at buyer's location
  const PROCESSING_FEES: Record<string, number> = {
    delhi: 15, chennai: 18, mumbai: 12, lucknow: 38, kolkata: 28, prayagraj: 45
  };
  const transactionFee = PROCESSING_FEES[(userLocation || "delhi").toLowerCase()] || 15;

  // Load user's available green credits (initialize with 100 if new user)
  const creditsKey = `amazon_relife_credits_${user?.email || 'guest'}`;
  if (!localStorage.getItem(creditsKey)) {
    localStorage.setItem(creditsKey, JSON.stringify({ total_points: 100, transactions: [] }));
  }
  const storedCredits = JSON.parse(localStorage.getItem(creditsKey) || '{"total_points": 100}');
  const availablePoints = storedCredits.total_points || 100;
  const creditDiscount = Math.min(availablePoints / 10, subtotal + transactionFee); // 10 pts = ₹1
  const finalTotal = useGreenCredits ? Math.max(0, Math.round(subtotal + transactionFee - creditDiscount)) : Math.round(subtotal + transactionFee);

  const handlePay = async () => {
    setResult("switched");
    
    // Deduct green credits if used
    if (useGreenCredits && creditDiscount > 0) {
      const pointsUsed = Math.round(creditDiscount * 10);
      const current = JSON.parse(localStorage.getItem(creditsKey) || '{"total_points": 100, "transactions": []}');
      current.total_points = Math.max(0, current.total_points - pointsUsed);
      current.transactions.push({ points: -pointsUsed, type: "redeemed", date: new Date().toISOString() });
      localStorage.setItem(creditsKey, JSON.stringify(current));
    }

    // Award new green credits for this eco-purchase
    try {
      const item = cartItems[0];
      const category = item?.products?.category || item?.color || "electrical_appliances";
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/green-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category.toLowerCase().replace(/ /g, "_"),
          is_local: true,
          condition: "resell",
          logistics_fee: 0
        })
      });
      const data = await res.json();
      
      const current = JSON.parse(localStorage.getItem(creditsKey) || '{"total_points": 0, "transactions": []}');
      current.total_points += data.final_points;
      current.transactions.push({ points: data.final_points, co2_kg: data.co2_saved_kg, cashback: data.cashback_value_inr, type: "earned", date: new Date().toISOString() });
      localStorage.setItem(creditsKey, JSON.stringify(current));
    } catch (err) {
      console.error("Failed to award green credits:", err);
    }

    // Remove product from store after popup dismisses
    if (selectedProductId) {
      setTimeout(() => {
        removeListedProduct(selectedProductId);
        setPurchased(true);
      }, 6500);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-gray-900 text-xl font-bold">Checkout Intercept</h1>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5 uppercase">
            {(user?.email || "User").split('@')[0]} · SESSION #8821
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Cart */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Cart Items</p>
            <span className="text-xs text-gray-400">{cartItems.length} items</span>
          </div>

          {displayItems.map(item => (
            <motion.div key={item.id} layout className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={item.products?.image_url} alt={item.products?.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.products?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 capitalize">{item.color}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">₹{Number(item.price).toLocaleString("en-IN")}</p>
                <p className="text-xs text-gray-400 mt-0.5">Qty {item.quantity}</p>
              </div>
            </motion.div>
          ))}
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
                  <span className="text-xs text-gray-600 truncate max-w-[160px]">{item.products?.name}</span>
                  <span className="text-xs font-semibold text-gray-800">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                </div>
              ))}

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Transaction Fee</span>
                  <span className="text-xs font-semibold text-gray-700">₹{transactionFee}</span>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={useGreenCredits} 
                      onChange={e => setUseGreenCredits(e.target.checked)}
                      className="w-3.5 h-3.5 accent-green-600 cursor-pointer"
                    />
                    <span className="text-xs text-green-700 font-medium">Use Green Credits ({availablePoints} pts = ₹{Math.round(creditDiscount)})</span>
                  </label>
                  {useGreenCredits && (
                    <span className="text-xs font-bold text-green-700">−₹{Math.round(creditDiscount).toLocaleString("en-IN")}</span>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <motion.span key={finalTotal} className="text-lg font-bold text-gray-900">
                  ₹{finalTotal.toLocaleString("en-IN")}
                </motion.span>
              </div>

              <motion.button
                onClick={() => result === null && handlePay()}
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
        {result !== null && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuccessState switched={result === "switched"} onDismiss={() => setResult(null)} finalTotal={finalTotal} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
