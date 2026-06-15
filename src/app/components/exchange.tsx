import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeftRight, Leaf, MapPin, Package } from "lucide-react";
import { getListedProducts, subscribe, ListedProduct } from "../../lib/product-store";
import { useAuthContext } from "../../lib/AuthContext";

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

function getExchangeFees(locA: string, locB: string) {
  const a = locA.toLowerCase();
  const b = locB.toLowerCase();
  const processingA = PROCESSING_FEES[a] || 15;
  const processingB = PROCESSING_FEES[b] || 15;
  const delivery = (TRANSPORT[a]?.[b] || 0) + (TRANSPORT[b]?.[a] || 0);
  return { processingA, processingB, delivery, total: processingA + processingB + delivery };
}

export function Exchange({ userLocation, onNav }: { userLocation?: string | null; onNav?: (id: string, productId?: number) => void }) {
  const [exchangeProducts, setExchangeProducts] = useState<ListedProduct[]>([]);
  const { user } = useAuthContext();
  const myLocation = (userLocation || "delhi").toLowerCase();
  const myUserId = user?.email || user?.id || "guest";

  useEffect(() => {
    setExchangeProducts(getListedProducts(undefined, "exchange"));
    const unsub = subscribe(() => {
      setExchangeProducts(getListedProducts(undefined, "exchange"));
    });
    return unsub;
  }, []);

  // My products = listed by me (same userId)
  const myProducts = exchangeProducts.filter(p => p.userId === myUserId);
  // Other products = listed by OTHER users
  const otherProducts = exchangeProducts.filter(p => p.userId !== myUserId);

  // For each of my products, find feasible matches from other users (±30% value)
  // Use exchangeValue (Amazon-calculated S_i) instead of seller's asking price
  const matchesForMyProducts = myProducts.map(myItem => {
    const myValue = myItem.exchangeValue || myItem.price;
    const matches = otherProducts.filter(other => {
      const otherValue = other.exchangeValue || other.price;
      const diff = Math.abs(otherValue - myValue) / myValue;
      return diff <= 0.30;
    });
    return { myItem, matches };
  });

  const hasMyListings = myProducts.length > 0;
  const hasMatches = matchesForMyProducts.some(m => m.matches.length > 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-gray-900 text-xl font-bold">Exchange</h1>
          <div className="flex items-center gap-1.5 bg-violet-100 border border-violet-200 rounded-full px-2.5 py-1">
            <ArrowLeftRight className="w-3 h-3 text-violet-600" />
            <span className="text-[10px] font-black text-violet-700">±30% VALUE MATCH</span>
          </div>
          <span className="text-xs text-gray-400 capitalize">Your location: {myLocation}</span>
        </div>
        <p className="text-gray-400 text-sm">Exchange items with users in other cities — pay only delivery + processing fees</p>
      </div>

      {/* User has exchange listings — show matches or waiting state */}
      {hasMyListings && (
        <div className="space-y-4 mb-8">
          {matchesForMyProducts.map(({ myItem, matches }) => (
            <div key={myItem.id} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-4 mb-3">
                {myItem.imageUrl && (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    <img src={myItem.imageUrl} alt={myItem.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-gray-900">{myItem.name}</p>
                  <p className="text-xs text-gray-400">₹{Number(myItem.exchangeValue || myItem.price).toLocaleString("en-IN")} (exchange value) · {myItem.condition}</p>
                </div>
                <span className="ml-auto text-[10px] font-black bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">YOUR LISTING</span>
              </div>
              {matches.length > 0 ? (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-[10px] font-bold text-green-600 uppercase">Matches found!</p>
                  {matches.map(match => {
                    const fees = getExchangeFees(myItem.location, match.location);
                    return (
                      <div key={match.id} className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-green-400 hover:shadow-sm transition-all" onClick={() => onNav?.("checkout", match.id)}>
                        {match.imageUrl && (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            <img src={match.imageUrl} alt={match.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900">{match.name}</p>
                          <p className="text-[10px] text-gray-500">₹{Number(match.exchangeValue || match.price).toLocaleString("en-IN")} (exchange value) · <span className="capitalize">{match.location}</span></p>
                          <p className="text-[10px] text-violet-600 mt-0.5">Fee: ₹{fees.total} (processing ₹{fees.processingA + fees.processingB} + delivery ₹{fees.delivery})</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Leaf className="w-3 h-3 text-green-600" />
                          <span className="text-[10px] text-green-700">−2.4kg CO₂</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-300" />
                  <p className="text-xs text-gray-400">Registered — waiting for different products of similar value</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No listings at all */}
      {!hasMyListings && (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center text-center">
          <ArrowLeftRight className="w-10 h-10 text-gray-200 mb-4" />
          <h2 className="text-lg font-bold text-gray-900">No possible exchanges can be made as of now</h2>
          <p className="text-sm text-gray-400 mt-1">List a product via Seller Hub → Option 3 to register for exchange. When a different product of similar value is listed, it will appear here.</p>
        </div>
      )}
    </div>
  );
}
