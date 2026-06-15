import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Leaf, CheckCircle2, CreditCard, Lock, ShoppingBag, Users, ArrowLeftRight, Heart, Shield, AlertTriangle, TrendingDown } from "lucide-react";
import { useAuthContext } from "../../lib/AuthContext";
import { getListedProducts, removeListedProduct, addPurchase } from "../../lib/product-store";
import { addNotification, getNotifications } from "../../lib/notification-store";
import { predictReturn } from "../../lib/api";

const PROCESSING_FEES: Record<string, number> = {
  delhi: 15, chennai: 18, mumbai: 12, lucknow: 38, kolkata: 28, prayagraj: 45
};
const TRANSPORT: Record<string, Record<string, number>> = {
  delhi: { delhi: 0, chennai: 95, mumbai: 75, lucknow: 35, kolkata: 80, prayagraj: 45 },
  chennai: { delhi: 95, chennai: 0, mumbai: 65, lucknow: 85, kolkata: 80, prayagraj: 85 },
  mumbai: { delhi: 75, chennai: 65, mumbai: 0, lucknow: 70, kolkata: 90, prayagraj: 65 },
  lucknow: { delhi: 35, chennai: 85, mumbai: 70, lucknow: 0, kolkata: 55, prayagraj: 15 },
  kolkata: { delhi: 80, chennai: 80, mumbai: 90, lucknow: 55, kolkata: 0, prayagraj: 45 },
  prayagraj: { delhi: 45, chennai: 85, mumbai: 65, lucknow: 15, kolkata: 45, prayagraj: 0 },
};

export function CheckoutIntercept({ selectedProductId, userLocation, onNav }: { selectedProductId?: number; userLocation?: string | null; onNav?: (id: string) => void }) {
  const { user } = useAuthContext();
  const [result, setResult] = useState<"success" | null>(null);
  const [useGreenCredits, setUseGreenCredits] = useState(false);
  const [cartEmpty, setCartEmpty] = useState(false);
  const [returnPrediction, setReturnPrediction] = useState<any>(null);

  // Find the selected product
  const allProducts = getListedProducts();
  const product = selectedProductId ? allProducts.find(p => p.id === selectedProductId) : null;

  // Fetch return prediction when product is available
  useEffect(() => {
    if (!product) return;
    const buyerLoc = (userLocation || "delhi").toLowerCase();
    const ownership = product.listingType === "amazon" ? "amazon" : "seller";
    predictReturn(
      product.category.toLowerCase(),
      product.condition.toLowerCase(),
      product.price,
      buyerLoc,
      ownership
    ).then(data => setReturnPrediction(data)).catch(() => setReturnPrediction(null));
  }, [product?.id, userLocation]);

  // If no product selected or cart emptied after purchase, show empty cart
  if (!product || cartEmpty) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center py-20">
        <CreditCard className="w-10 h-10 text-gray-200 mb-4" />
        <h2 className="text-lg font-bold text-gray-900">Your cart is empty</h2>
        <p className="text-sm text-gray-400 mt-1">Browse products in Discover, P2P, or Exchange and click to add to checkout.</p>
      </div>
    );
  }

  // Calculate fees based on listing type
  const buyerLoc = (userLocation || "delhi").toLowerCase();
  const sellerLoc = (product.sellerLocation || product.location || "delhi").toLowerCase();
  const listingType = product.listingType || "amazon";

  let transactionFee = 0;
  let feeLabel = "Transaction Fee";
  let productPrice = product.price;

  if (listingType === "amazon" || listingType === "p2p") {
    transactionFee = PROCESSING_FEES[buyerLoc] || 15;
    feeLabel = "Transaction Fee";
  } else if (listingType === "exchange") {
    const procBuyer = PROCESSING_FEES[buyerLoc] || 15;
    const delivery = TRANSPORT[sellerLoc]?.[buyerLoc] || 0;
    transactionFee = procBuyer + delivery;
    feeLabel = `Exchange Fee (processing ₹${procBuyer} + delivery ₹${delivery})`;
    productPrice = 0; // Exchange = no product cost, only fees
  } else if (listingType === "donate") {
    const procBuyer = PROCESSING_FEES[buyerLoc] || 15;
    const delivery = TRANSPORT[sellerLoc]?.[buyerLoc] || 0;
    transactionFee = procBuyer + delivery;
    feeLabel = `Delivery Fee (processing ₹${procBuyer} + transit ₹${delivery})`;
    productPrice = 0; // Donation = free product, pay delivery only
  }

  // Green credits
  const creditsKey = `amazon_relife_credits_${user?.email || 'guest'}`;
  if (typeof window !== 'undefined' && !localStorage.getItem(creditsKey)) {
    localStorage.setItem(creditsKey, JSON.stringify({ total_points: 100, transactions: [] }));
  }
  const storedCredits = JSON.parse(localStorage.getItem(creditsKey) || '{"total_points": 100}');
  const availablePoints = storedCredits.total_points || 100;
  const total = productPrice + transactionFee;
  const creditDiscount = Math.min(availablePoints / 10, total);
  const finalTotal = useGreenCredits ? Math.max(0, Math.round(total - creditDiscount)) : Math.round(total);

  // Checkout type badge
  const typeBadge = {
    amazon: { label: "Amazon Purchase", icon: ShoppingBag, color: "bg-amber-100 text-amber-700 border-amber-200" },
    p2p: { label: "P2P Purchase", icon: Users, color: "bg-green-100 text-green-700 border-green-200" },
    exchange: { label: "Exchange", icon: ArrowLeftRight, color: "bg-violet-100 text-violet-700 border-violet-200" },
    donate: { label: "Donation Pickup", icon: Heart, color: "bg-rose-100 text-rose-700 border-rose-200" },
  }[listingType] || { label: "Checkout", icon: ShoppingBag, color: "bg-gray-100 text-gray-700 border-gray-200" };

  const BadgeIcon = typeBadge.icon;

  const handlePay = async () => {
    setResult("success");

    // Deduct green credits if used
    if (useGreenCredits && creditDiscount > 0) {
      const pointsUsed = Math.round(creditDiscount * 10);
      const current = JSON.parse(localStorage.getItem(creditsKey) || '{"total_points": 100, "transactions": []}');
      current.total_points = Math.max(0, current.total_points - pointsUsed);
      localStorage.setItem(creditsKey, JSON.stringify(current));
    }

    // Award green credits (10% of amount paid) — escrowed for 7 days
    const earned = Math.round(finalTotal * 0.10);
    const current = JSON.parse(localStorage.getItem(creditsKey) || '{"total_points": 100, "transactions": []}');
    current.total_points += earned;
    current.transactions = current.transactions || [];
    current.transactions.push({ points: earned, type: "earned", date: new Date().toISOString() });
    localStorage.setItem(creditsKey, JSON.stringify(current));

    // Save purchase to history
    addPurchase({
      id: Date.now(),
      userId: user?.email || "guest",
      productName: product.name,
      category: product.category,
      condition: product.condition,
      price: finalTotal,
      imageUrl: product.imageUrl,
      purchaseType: listingType as any,
      purchasedAt: new Date().toISOString(),
      sellerUserId: product.userId || "",
    });

    // Notify the product owner
    const productOwner = product.userId || "";
    const currentUser = user?.email || "guest";
    if (productOwner && productOwner !== currentUser) {
      if (listingType === "amazon" || listingType === "p2p") {
        addNotification({
          userId: productOwner,
          type: "sold_p2p",
          title: "Product Sold!",
          message: `Your "${product.name}" has been purchased by ${currentUser}.`,
        });
      } else if (listingType === "exchange") {
        // Detect if this is a RESPONSE: the current user has an exchange_proposed notification
        // linking to THIS specific product (selectedProductId)
        const myNotifs = getNotifications(currentUser);
        const isResponse = myNotifs.some(n => n.type === "exchange_proposed" && n.productId === selectedProductId);
        
        if (isResponse) {
          // 2nd party paying → exchange complete → notify the initiator (product owner)
          addNotification({
            userId: productOwner,
            type: "donation_claimed",
            title: "Exchange Completed! ✓",
            message: `${currentUser} has paid their fee. Exchange complete — items will be shipped!`,
          });
        } else {
          // 1st party initiating → notify product owner to pay
          const myExchangeProducts = getListedProducts(undefined, "exchange").filter(p => p.userId === currentUser);
          const myProduct = myExchangeProducts[0];
          addNotification({
            userId: productOwner,
            type: "exchange_proposed",
            title: "Exchange Proposed!",
            message: `${currentUser} wants to exchange their "${myProduct?.name || "item"}" for your "${product.name}". Pay your exchange fee to complete.`,
            productId: myProduct?.id,
          });
        }
      } else if (listingType === "donate") {
        addNotification({
          userId: productOwner,
          type: "donation_claimed",
          title: "Donation Claimed!",
          message: `Your "${product.name}" donation has been claimed by ${currentUser}.`,
        });
      }
    }

    // Remove product after delay and show empty cart
    if (selectedProductId) {
      setTimeout(() => {
        removeListedProduct(selectedProductId);
        setResult(null);
        setCartEmpty(true);
      }, 4000);
    }
  };

  // Success popup
  if (result === "success") {
    const earned = Math.round(finalTotal * 0.10);
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <motion.div
          className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
          initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        >
          <div className="h-1 w-full bg-green-500" />
          <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h2 className="text-gray-900 font-bold text-lg">
                {listingType === "exchange" ? "Exchange Initiated!" : listingType === "donate" ? "Donation Claimed!" : "Purchase Successful!"}
              </h2>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                <span className="font-bold text-green-700">{earned} green credits</span> will be added to your account after <span className="font-bold text-gray-700">7 days</span> (return period).
              </p>
              {listingType === "exchange" && (
                <p className="text-xs text-violet-600 mt-2">The other party has been notified. Both fees must be paid for the exchange to complete.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-gray-900 text-xl font-bold">Checkout</h1>
          <span className={`flex items-center gap-1.5 text-[10px] font-bold border rounded-full px-2.5 py-0.5 ${typeBadge.color}`}>
            <BadgeIcon className="w-3 h-3" />
            {typeBadge.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Cart item */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Cart Items</p>
            <span className="text-xs text-gray-400">1 item</span>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
              {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{product.condition} · {product.category.replace(/_/g, " ")}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{productPrice > 0 ? `₹${Number(productPrice).toLocaleString("en-IN")}` : "Free"}</p>
              <p className="text-xs text-gray-400 mt-0.5">Qty 1</p>
            </div>
          </div>

          {/* Return Prediction Card */}
          {returnPrediction && returnPrediction.risk_level !== "NONE" && (
            <motion.div
              className={`rounded-xl border p-4 ${
                returnPrediction.risk_level === "LOW" ? "bg-green-50 border-green-200" :
                returnPrediction.risk_level === "MODERATE" ? "bg-amber-50 border-amber-200" :
                "bg-red-50 border-red-200"
              }`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  returnPrediction.risk_level === "LOW" ? "bg-green-100" :
                  returnPrediction.risk_level === "MODERATE" ? "bg-amber-100" :
                  "bg-red-100"
                }`}>
                  {returnPrediction.risk_level === "LOW" ? (
                    <Shield className={`w-4.5 h-4.5 text-green-600`} />
                  ) : returnPrediction.risk_level === "MODERATE" ? (
                    <AlertTriangle className={`w-4.5 h-4.5 text-amber-600`} />
                  ) : (
                    <TrendingDown className={`w-4.5 h-4.5 text-red-600`} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-bold uppercase tracking-wide ${
                    returnPrediction.risk_level === "LOW" ? "text-green-700" :
                    returnPrediction.risk_level === "MODERATE" ? "text-amber-700" :
                    "text-red-700"
                  }`}>
                    Return Risk: {returnPrediction.risk_level}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">AI-predicted return probability</p>
                </div>
                <div className={`text-xl font-black ${
                  returnPrediction.risk_level === "LOW" ? "text-green-600" :
                  returnPrediction.risk_level === "MODERATE" ? "text-amber-600" :
                  "text-red-600"
                }`}>
                  {returnPrediction.return_probability}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/70 rounded-lg px-2.5 py-2 text-center">
                  <p className="text-[10px] text-gray-400 font-medium">Price</p>
                  <p className="text-xs font-bold text-gray-700 capitalize">{returnPrediction.price_assessment || "fair"}</p>
                </div>
                <div className="bg-white/70 rounded-lg px-2.5 py-2 text-center">
                  <p className="text-[10px] text-gray-400 font-medium">Category</p>
                  <p className="text-xs font-bold text-gray-700 capitalize">{(returnPrediction.category || "").replace(/_/g, " ")}</p>
                </div>
                <div className="bg-white/70 rounded-lg px-2.5 py-2 text-center">
                  <p className="text-[10px] text-gray-400 font-medium">Ownership</p>
                  <p className="text-xs font-bold text-gray-700 capitalize">{returnPrediction.ownership || "amazon"}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden sticky top-4">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Order Summary</p>
            </div>
            <div className="p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 truncate max-w-[160px]">{product.name}</span>
                <span className="text-xs font-semibold text-gray-800">{productPrice > 0 ? `₹${Number(productPrice).toLocaleString("en-IN")}` : "Free"}</span>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{feeLabel}</span>
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
                    <span className="text-xs font-bold text-green-700">−₹{Math.round(creditDiscount)}</span>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">₹{finalTotal.toLocaleString("en-IN")}</span>
              </div>

              <motion.button
                onClick={handlePay}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold cursor-pointer transition-colors bg-[#FF9900] hover:bg-amber-500 text-gray-900"
                whileTap={{ scale: 0.98 }}
              >
                <CreditCard className="w-4 h-4" />
                {listingType === "exchange" ? "Pay Exchange Fee" : listingType === "donate" ? "Pay Delivery Fee" : "Proceed to Payment"}
              </motion.button>

              <div className="flex items-center justify-center gap-1.5 text-gray-400">
                <Lock className="w-3 h-3" />
                <span className="text-[11px]">256-bit SSL · PCI DSS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
