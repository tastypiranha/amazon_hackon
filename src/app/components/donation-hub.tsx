import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Heart, Leaf, MapPin, Package, Gift } from "lucide-react";
import { getListedProducts, subscribe, ListedProduct } from "../../lib/product-store";
import { useAuthContext } from "../../lib/AuthContext";

export function DonationHub({ onNav }: { onNav?: (id: string, productId?: number) => void }) {
  const [donations, setDonations] = useState<ListedProduct[]>([]);
  const { user } = useAuthContext();

  useEffect(() => {
    setDonations(getListedProducts(undefined, "donate"));
    const unsub = subscribe(() => {
      setDonations(getListedProducts(undefined, "donate"));
    });
    return unsub;
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-gray-900 text-xl font-bold">Donation Hub</h1>
          {donations.length > 0 && (
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 rounded-full px-2.5 py-0.5">
              {donations.length} ITEMS AVAILABLE
            </span>
          )}
        </div>
        <p className="text-gray-400 text-sm">Browse items people are giving away free — pay only delivery fees</p>
      </div>

      {donations.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 flex flex-col items-center text-center">
          <Gift className="w-10 h-10 text-gray-200 mb-4" />
          <h2 className="text-lg font-bold text-gray-900">No donations available yet</h2>
          <p className="text-sm text-gray-400 mt-1">When sellers choose "Donate" in the Seller Hub, their products will appear here for free.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {donations.map((item, i) => (
            <motion.div
              key={item.id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onNav?.("checkout", item.id)}
            >
              {item.imageUrl && (
                <div className="relative bg-gray-50 aspect-[4/3] overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2.5 left-2.5 bg-rose-500 text-white text-[10px] font-black rounded-full px-2 py-0.5">
                    FREE
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-gray-900 text-white text-[10px] font-black rounded-full px-2 py-0.5 capitalize">
                    {item.condition}
                  </div>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-black border rounded-full px-1.5 py-px bg-rose-100 text-rose-700 border-rose-200 capitalize">{item.condition}</span>
                  <span className="text-[10px] text-gray-400 capitalize">{item.category.replace(/_/g, " ")}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 leading-snug mb-2">{item.name}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-rose-600" />
                    <span className="text-[10px] text-rose-700 font-semibold capitalize">{item.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Leaf className="w-3 h-3 text-green-600" />
                    <span className="text-[10px] text-green-700 font-semibold">Saves CO₂</span>
                  </div>
                </div>
                {item.userId && item.userId !== (user?.email || "guest") && (
                  <p className="text-[10px] text-gray-400 mt-2">Donated by {item.userId}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
