import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Package, AlertTriangle, CheckCircle2, Camera, Upload, XCircle, Loader2 } from "lucide-react";
import { useAuthContext } from "../../lib/AuthContext";
import { getPurchases, PurchaseRecord } from "../../lib/product-store";
import { addNotification } from "../../lib/notification-store";
import { verifyReturnPhoto } from "../../lib/api";

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  amazon: { label: "Amazon", color: "bg-amber-100 text-amber-700 border-amber-200" },
  p2p: { label: "P2P", color: "bg-green-100 text-green-700 border-green-200" },
  exchange: { label: "Exchange", color: "bg-violet-100 text-violet-700 border-violet-200" },
  donate: { label: "Donation", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

type VerifyState = "idle" | "uploading" | "verifying" | "verified" | "rejected";

export function ReturnsPortal() {
  const { user } = useAuthContext();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [returnedItems, setReturnedItems] = useState<Set<number>>(new Set());
  const [returnConfirm, setReturnConfirm] = useState<PurchaseRecord | null>(null);
  const [returnPhoto, setReturnPhoto] = useState<File | null>(null);
  const [returnPhotoPreview, setReturnPhotoPreview] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPurchases(getPurchases(user?.email || "guest"));
  }, [user]);

  const PROCESSING_FEES: Record<string, number> = {
    delhi: 15, chennai: 18, mumbai: 12, lucknow: 38, kolkata: 28, prayagraj: 45
  };

  const handleReturn = (purchase: PurchaseRecord) => {
    setReturnConfirm(purchase);
    setReturnPhoto(null);
    setReturnPhotoPreview(null);
    setVerifyState("idle");
    setVerifyResult(null);
  };

  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setReturnPhoto(file);
    setReturnPhotoPreview(URL.createObjectURL(file));
    setVerifyState("uploading");
  };

  const handleVerify = async () => {
    if (!returnPhoto || !returnConfirm) return;

    setVerifyState("verifying");

    try {
      // Convert the original product image URL to a File object for the API
      const originalImageUrl = returnConfirm.imageUrl;
      if (!originalImageUrl) {
        setVerifyState("rejected");
        setVerifyResult({ similarity: 0, is_verified: false, verdict: "No original image available for comparison." });
        return;
      }

      // Fetch original image and create a File from it
      const response = await fetch(originalImageUrl);
      const blob = await response.blob();
      const originalFile = new File([blob], "original.jpg", { type: blob.type });

      const result = await verifyReturnPhoto(originalFile, returnPhoto);
      setVerifyResult(result);
      setVerifyState(result.is_verified ? "verified" : "rejected");
    } catch {
      setVerifyState("rejected");
      setVerifyResult({ similarity: 0, is_verified: false, verdict: "Verification failed. Please try again." });
    }
  };

  const confirmReturn = () => {
    if (returnConfirm) {
      setReturnedItems(prev => new Set([...prev, returnConfirm.id]));

      // Deduct green credits earned from this purchase (10% of price paid)
      const creditsKey = `amazon_relife_credits_${user?.email || 'guest'}`;
      const current = JSON.parse(localStorage.getItem(creditsKey) || '{"total_points": 100, "transactions": []}');
      const earnedFromPurchase = Math.round(returnConfirm.price * 0.10);
      current.total_points = Math.max(0, current.total_points - earnedFromPurchase);
      current.transactions = current.transactions || [];
      current.transactions.push({ points: -earnedFromPurchase, type: "return_deduction", date: new Date().toISOString() });
      localStorage.setItem(creditsKey, JSON.stringify(current));

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
      setReturnPhoto(null);
      setReturnPhotoPreview(null);
      setVerifyState("idle");
      setVerifyResult(null);
    }
  };

  const closeModal = () => {
    setReturnConfirm(null);
    setReturnPhoto(null);
    setReturnPhotoPreview(null);
    setVerifyState("idle");
    setVerifyResult(null);
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

      {/* Return Verification Modal */}
      <AnimatePresence>
        {returnConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
            />
            <motion.div
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className={`h-1 w-full ${verifyState === "verified" ? "bg-green-500" : verifyState === "rejected" ? "bg-red-500" : "bg-amber-500"}`} />
              <div className="p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Return Verification</h2>
                    <p className="text-xs text-gray-400">{returnConfirm.productName}</p>
                  </div>
                </div>

                {/* Step 1: Photo Upload */}
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Step 1: Upload a photo of the product you're returning
                  </p>
                  <div
                    className={`border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all ${
                      returnPhotoPreview ? "border-gray-200" : "border-gray-300 hover:border-amber-400 hover:bg-amber-50"
                    }`}
                    onClick={() => !returnPhotoPreview && fileRef.current?.click()}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }}
                    />
                    {!returnPhotoPreview ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <Upload className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-xs font-semibold text-gray-600">Click to upload product photo</p>
                        <p className="text-[10px] text-gray-400">JPG, PNG, WEBP · Must clearly show the product</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <img src={returnPhotoPreview} alt="Return photo" className="w-full h-40 object-cover" />
                        <button
                          onClick={e => { e.stopPropagation(); setReturnPhoto(null); setReturnPhotoPreview(null); setVerifyState("idle"); setVerifyResult(null); }}
                          className="absolute top-2 right-2 bg-white border border-gray-200 rounded-full p-1 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          <XCircle className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Verify Button */}
                {returnPhotoPreview && verifyState === "uploading" && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      Step 2: AI Verification
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      Our AI will compare your photo with the original product image to verify it's the same item.
                    </p>
                    <button
                      onClick={handleVerify}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl py-3 cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4" /> Verify Product Match
                    </button>
                  </motion.div>
                )}

                {/* Verifying state */}
                {verifyState === "verifying" && (
                  <motion.div
                    className="flex flex-col items-center gap-3 py-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  >
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-sm font-semibold text-gray-700">Analyzing product match...</p>
                    <p className="text-[10px] text-gray-400">Comparing with CLIP AI vision model</p>
                  </motion.div>
                )}

                {/* Verified — show refund info and confirm */}
                {verifyState === "verified" && verifyResult && (
                  <motion.div className="space-y-4" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-green-800">Product Verified ✓</p>
                        <p className="text-[10px] text-green-600 mt-0.5">Similarity: {(verifyResult.similarity * 100).toFixed(1)}% (threshold: 85%)</p>
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
                        onClick={closeModal}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmReturn}
                        className="flex-1 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl cursor-pointer transition-colors"
                      >
                        Confirm Return
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Rejected — mismatch */}
                {verifyState === "rejected" && verifyResult && (
                  <motion.div className="space-y-4" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-red-800">Verification Failed</p>
                        <p className="text-[10px] text-red-600 mt-0.5">
                          {verifyResult.similarity > 0
                            ? `Similarity: ${(verifyResult.similarity * 100).toFixed(1)}% (needs ≥85%)`
                            : verifyResult.verdict}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      The uploaded photo does not match the original product. Please upload a clear photo of the exact item you received.
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { setReturnPhoto(null); setReturnPhotoPreview(null); setVerifyState("idle"); setVerifyResult(null); }}
                        className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl cursor-pointer transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Idle state — no photo yet, just show cancel */}
                {verifyState === "idle" && !returnPhotoPreview && (
                  <button
                    onClick={closeModal}
                    className="w-full py-2.5 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
