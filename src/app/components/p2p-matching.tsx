import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Package, MapPin, Leaf, Users, ShoppingBag
} from "lucide-react";

import { useAuthContext } from "../../lib/AuthContext";
import { getListedProducts, subscribe, ListedProduct } from "../../lib/product-store";

// ─── Main ─────────────────────────────────────────────────────────────────────

export function P2PMatching({ onNav, userLocation }: { onNav?: (id: string, productId?: number) => void; userLocation?: string | null }) {
  const { user } = useAuthContext();
  const [p2pProducts, setP2pProducts] = useState<ListedProduct[]>([]);

  useEffect(() => {
    // Filter by user's location — P2P is local only
    setP2pProducts(getListedProducts(userLocation || undefined, "p2p"));
    const unsub = subscribe(() => {
      setP2pProducts(getListedProducts(userLocation || undefined, "p2p"));
    });
    return unsub;
  }, [userLocation]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-gray-900 text-xl font-bold">P2P Local Listings</h1>
          <div className="flex items-center gap-1.5 bg-green-100 border border-green-200 rounded-full px-2.5 py-1">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-green-500" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
            <span className="text-[10px] font-black text-green-700">LIVE</span>
          </div>
        </div>
        <p className="text-gray-400 text-sm">Products listed by sellers for local pickup or delivery in their area</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">P2P Listings</p>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{p2pProducts.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Locations</p>
            <MapPin className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{new Set(p2pProducts.map(p => p.location)).size}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CO₂ Saved</p>
            <Leaf className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{(p2pProducts.length * 2.4).toFixed(1)} kg</p>
        </div>
      </div>

      {/* Listings */}
      {p2pProducts.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center text-center">
          <Package className="w-10 h-10 text-gray-200 mb-4" />
          <h2 className="text-lg font-bold text-gray-900">No P2P listings yet</h2>
          <p className="text-sm text-gray-400 mt-1">When a seller chooses "List Locally" in the Seller Hub, their product will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {p2pProducts.map((item, i) => (
            <motion.div
              key={item.id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onNav?.("checkout", item.id)}
            >
              {item.imageUrl && (
                <div className="relative bg-gray-50 aspect-[4/3] overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 border text-[10px] font-black rounded-full px-2 py-0.5 bg-green-100 text-green-700 border-green-200">
                    <Users className="w-3 h-3" />
                    P2P Local
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-gray-900 text-white text-[10px] font-black rounded-full px-2 py-0.5 capitalize">
                    {item.condition}
                  </div>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-black border rounded-full px-1.5 py-px bg-green-100 text-green-700 border-green-200 capitalize">{item.condition}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{item.category.replace(/_/g, " ")}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 leading-snug mb-2">{item.name}</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xl font-black text-gray-900">₹{Number(item.price).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-green-600" />
                    <span className="text-[10px] text-green-700 font-semibold capitalize">{item.location}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{new Date(item.listedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
