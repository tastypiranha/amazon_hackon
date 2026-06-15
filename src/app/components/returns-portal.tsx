import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuthContext } from "../../lib/AuthContext";
import { getPurchases, PurchaseRecord } from "../../lib/product-store";
import { addNotification } from "../../lib/notification-store";

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  amazon: { label: "Amazon", color: "bg-amber-100 text-amber-700 border-amber-200" },
  p2p: { label: "P2P", color: "bg-green-100 text-green-700 border-green-200" },
  exchange: { label: "Exchange", color: "bg-violet-100 text-violet-700 border-violet-200" },
  donate: { label: "Donation", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ReturnRiskMeter({ purchase }: { purchase: PurchaseRecord }) {
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    async function fetchPrediction() {
      try {
        const ownershipMap: Record<string, string> = { amazon: "amazon", p2p: "seller", exchange: "exchange", donate: "donate" };
        const res = await fetch(`${API_URL}/api/return-predict?category=${encodeURIComponent(purchase.category)}&condition=${encodeURIComponent(purchase.condition)}&price=${purchase.price}&location=delhi&ownership=${ownershipMap[purchase.purchaseType] || "amazon"}`);
        const data = await res.json();
        setPrediction(data);
      } catch { /* silently fail */ }
    }
    fetchPrediction();
  }, [purchase]);

  if (!prediction) return null;

  const prob = prediction.return_probability || 0;

  return (
    <div className="mt-2">
      <span className="text-xs text-gray-500">Return Prediction: <span className="font-bold text-gray-900">{prob}%</span></span>
    </div>
  );
}

export function ReturnsPortal() {
  const { user } = useAuthContext();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [returnedItems, setReturnedItems] = useState<Set<number>>(new Set());
  const [returnConfirm, setReturnConfirm] = useState<PurchaseRecord | null>(null);

  useEffect(() => {
    setPurchases(getPurchases(user?.email || "guest"));
  }, [user]);

  const PROCESSING_FEES: Record<string, number> = {
    delhi: 15, chennai: 18, mumbai: 12, lucknow: 38, kolkata: 28, prayagraj: 45
  };

  const handleReturn = (purchase: PurchaseRecord) => {
    setReturnConfirm(purchase);
  };

  const confirmReturn = () => {
    if (returnConfirm) {
      setReturnedItems(prev => new Set([...prev, returnConfirm.id]));
      
      // Notify seller (only for p2p, exchange, donate — not amazon)
      if (returnConfirm.purchaseType !== "amazon" && returnConfirm.sellerUserId) {
        addNotification({
          userId: returnConfirm.sellerUserId,
          type: "sold_p2p",
          title: "Item Returned",
          message: `${user?.email || "A buyer"} has returned your "${returnConfirm.productName}". Refund processed.`,
        });
      }
      
      setReturnConfirm(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-gray-900 text-xl font-bold">History & Returns</h1>
        </div>
        <p className="text-gray-400 text-sm">All your purchases across Amazon, P2P, Exchange, and Donations</p>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center text-center">
          <Package className="w-10 h-10 text-gray-200 mb-4" />
          <h2 className="text-lg font-bold text-gray-900">No purchase history yet</h2>
          <p className="text-sm text-gray-400 mt-1">Products you buy from Discover, P2P, Exchange, or Donation will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Purchase History</p>
            <span className="text-xs text-gray-400">{purchases.length} orders</span>
          </div>
          <div className="divide-y divide-gray-100">
            {purchases.map((purchase, i) => {
              const badge = TYPE_BADGE[purchase.purchaseType] || TYPE_BADGE.amazon;
              const daysAgo = Math.floor((Date.now() - new Date(purchase.purchasedAt).getTime()) / (1000 * 60 * 60 * 24));
              const returnEligible = daysAgo <= 7;
              const isReturned = returnedItems.has(purchase.id);

              return (
                <motion.div
                  key={purchase.id}
                  className="px-5 py-4"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                      {purchase.imageUrl && <img src={purchase.imageUrl} alt={purchase.productName} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold border rounded-full px-1.5 py-px ${badge.color}`}>{badge.label}</span>
                        <span className="text-[10px] text-gray-400">{new Date(purchase.purchasedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{purchase.productName}</p>
                      <p className="text-xs text-gray-400 capitalize">{purchase.category.replace(/_/g, " ")} · {purchase.condition}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">₹{Number(purchase.price).toLocaleString("en-IN")}</p>
                      {isReturned ? (
                        <span className="text-[10px] font-bold text-gray-400">Returned</span>
                      ) : returnEligible ? (
                        <button
                          onClick={() => handleReturn(purchase)}
                          className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 cursor-pointer hover:bg-red-100 transition-colors"
                        >
                          Return Item
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400">Return window closed</span>
                      )}
                    </div>
                  </div>
                  {/* Return Prediction Meter */}
                  {!isReturned && returnEligible && <ReturnRiskMeter purchase={purchase} />}
                  {isReturned && (
                    <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs text-green-700 font-medium">Return processed. Green credits deducted from escrow.</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {returnConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px]" onClick={() => setReturnConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="h-1 w-full bg-red-500" />
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Confirm Return</h2>
                  <p className="text-xs text-gray-400">{returnConfirm.productName}</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Amount Paid</span>
                  <span className="text-xs font-bold text-gray-900">₹{Number(returnConfirm.price).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Transaction Fee (non-refundable)</span>
                  <span className="text-xs font-bold text-red-600">−₹{PROCESSING_FEES["delhi"] || 15}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Refund Amount</span>
                  <span className="text-lg font-black text-green-700">₹{(returnConfirm.price - (PROCESSING_FEES["delhi"] || 15)).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400">Green credits earned from this purchase will be deducted from your account.</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setReturnConfirm(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReturn}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer transition-colors"
                >
                  Confirm Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
