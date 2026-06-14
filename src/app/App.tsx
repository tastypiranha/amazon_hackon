import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import rcLogo from "../imports/images__1_.png";
import {
  Leaf, ShoppingCart, Cpu, Shield, Users,
  LayoutDashboard, TrendingUp, BarChart2,
  Search, Star, ShoppingBag, Heart, ChevronRight, Gift,
  Wallet, Zap, MapPin, Clock, Flame, BadgePercent, Sparkles, RotateCcw, ArrowLeftRight
} from "lucide-react";

import { CheckoutIntercept } from "./components/checkout-intercept";
import { SellerHub } from "./components/seller-hub";
import { BuyerView } from "./components/buyer-view";
import { P2PMatching } from "./components/p2p-matching";
import { OpsDashboard } from "./components/ops-dashboard";
import { ReturnsPortal } from "./components/returns-portal";
import { Login } from "./components/login";
import { DonationHub } from "./components/donation-hub";
import { Exchange } from "./components/exchange";

import { useProducts, useP2PNearby, useDonationListener } from "../lib/hooks";
import { useAuthContext } from "../lib/AuthContext";
import { Product, Donation } from "../lib/types";
import { getListedProducts, subscribe as subscribeProducts } from "../lib/product-store";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV = [
  { id: "home",     label: "Discover",           icon: LayoutDashboard },
  { id: "checkout", label: "Checkout Intercept", icon: ShoppingCart },
  { id: "seller",   label: "Seller Hub",         icon: Cpu },
  { id: "p2p",      label: "P2P Matching",       icon: Users },
  { id: "returns",  label: "Returns Portal",     icon: RotateCcw },
  { id: "donations",label: "Donation Hub",       icon: Heart },
  { id: "exchange", label: "Exchange",           icon: ArrowLeftRight },
  { id: "ops",      label: "Ops Dashboard",      icon: BarChart2 },
];

const CATEGORIES = ["All", "Audio", "Footwear", "Wearables", "Laptops", "Cameras", "Phones"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
  "top-pick":    "bg-orange-100 text-orange-700 border-orange-200",
  "lowest":      "bg-blue-100 text-blue-700 border-blue-200",
  "fair":        "bg-emerald-100 text-emerald-700 border-emerald-200",
  "recommended": "bg-violet-100 text-violet-700 border-violet-200",
};

const GRADE_COLOR: Record<string, string> = {
  "A":  "text-emerald-700 bg-emerald-100 border-emerald-200",
  "A-": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "B+": "text-sky-700 bg-sky-100 border-sky-200",
  "B":  "text-amber-700 bg-amber-100 border-amber-200",
};

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ p, delay = 0, onNav }: { p: Product; delay?: number; onNav: (id: string, productId?: number) => void }) {
  const [liked, setLiked] = useState(false);

  return (
    <motion.div
      className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22 }}
      whileHover={{ y: -2 }}
    >
      {/* Image */}
      <div className="relative bg-gray-50 aspect-[4/3] overflow-hidden">
        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {/* Tag */}
        {p.tag && p.tag_label && (
          <div className={`absolute top-2.5 left-2.5 flex items-center gap-1 border text-[10px] font-black rounded-full px-2 py-0.5 ${TAG_STYLES[p.tag] || TAG_STYLES["fair"]}`}>
            {p.tag === "top-pick" && <Flame className="w-3 h-3" />}
            {p.tag === "lowest" && <BadgePercent className="w-3 h-3" />}
            {p.tag === "fair" && <Sparkles className="w-3 h-3" />}
            {p.tag_label}
          </div>
        )}
        {/* Like */}
        <button
          onClick={e => { e.stopPropagation(); setLiked(v => !v); }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center shadow-sm cursor-pointer"
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
        </button>
        {/* Discount */}
        <div className="absolute bottom-2.5 right-2.5 bg-red-600 text-white text-[10px] font-black rounded-full px-2 py-0.5">
          {p.discount}% off
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5" onClick={() => onNav("buyer", p.id)}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`text-[10px] font-black border rounded-full px-1.5 py-px ${GRADE_COLOR[p.grade] || "bg-gray-100"}`}>
            {p.grade}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">{p.brand}</span>
          <span className="text-gray-200">·</span>
          <span className="text-[10px] text-gray-400">{p.category}</span>
        </div>

        <p className="text-sm font-bold text-gray-900 leading-snug mb-1 line-clamp-2">{p.name}</p>

        <div className="flex items-center gap-1 mb-2.5">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < Math.floor(Number(p.rating) || 0) ? "fill-[#FF9900] text-[#FF9900]" : "text-gray-200"}`} />
            ))}
          </div>
          <span className="text-[10px] text-gray-400">({(p.reviews || 0).toLocaleString()})</span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-lg font-black text-gray-900">₹{Number(p.price).toLocaleString("en-IN")}</span>
          <span className="text-sm text-gray-300 line-through">₹{Number(p.original_price).toLocaleString("en-IN")}</span>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <Leaf className="w-3 h-3 text-green-600 flex-shrink-0" />
          <span className="text-[10px] text-green-700 font-semibold">Saves {p.co2_saved} kg CO₂</span>
          <span className="ml-auto text-[10px] text-gray-400">Fair score: <strong className="text-gray-700">{p.fair_score}</strong></span>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onNav("buyer", p.id); }}
          className="w-full flex items-center justify-center gap-1.5 bg-[#FF9900] hover:bg-amber-500 text-gray-900 font-bold rounded-xl py-2.5 text-xs cursor-pointer transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Buy Now
        </button>
      </div>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, sub, color = "text-gray-400", action }: {
  icon: React.ElementType; title: string; sub: string; color?: string; action?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
      </div>
      {action && (
        <button className="text-xs font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-1 cursor-pointer transition-colors">
          {action} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Nearby P2P card ──────────────────────────────────────────────────────────

function NearbyCard({ item, delay, onNav }: { item: any; delay: number; onNav: (id: string) => void }) {
  const p = item.products || {};
  return (
    <motion.div
      className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex gap-4 p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={() => onNav("p2p")}
    >
      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
        <img src={p.image_url} alt={item.title} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-black border rounded-full px-1.5 py-px ${GRADE_COLOR[item.condition] || "bg-gray-100"}`}>{item.condition}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400"><MapPin className="w-3 h-3" />{item.location}</span>
        </div>
        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">by Seller</p>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-base font-black text-gray-900">₹{Number(item.ask_price).toLocaleString("en-IN")}</span>
          {p.original_price && <span className="text-xs text-gray-300 line-through">₹{Number(p.original_price).toLocaleString("en-IN")}</span>}
          {p.co2_saved && (
            <span className="ml-auto flex items-center gap-0.5 text-[10px] text-green-700 font-semibold">
              <Leaf className="w-3 h-3" />{p.co2_saved} kg CO₂
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Buyer Dashboard (Overview) ───────────────────────────────────────────────

function Overview({ onNav, userLocation }: { onNav: (id: string, productId?: number) => void; userLocation?: string | null }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchFocused, setSearchFocused] = useState(false);
  const [listedProducts, setListedProducts] = useState<import("../lib/product-store").ListedProduct[]>([]);

  const { products, loading } = useProducts(activeCategory === "All" ? undefined : activeCategory);
  const { listings: p2pNearby, loading: p2pLoading } = useP2PNearby();
  const { user } = useAuthContext();

  // Subscribe to in-memory product store (seller-listed products — Amazon owned only for Discover)
  useEffect(() => {
    setListedProducts(getListedProducts(userLocation || undefined, "amazon"));
    const unsub = subscribeProducts(() => {
      setListedProducts(getListedProducts(userLocation || undefined, "amazon"));
    });
    return unsub;
  }, [userLocation]);

  const allProducts = products || [];
  const topPicks = allProducts.filter(p => p.tag === "top-pick" || p.tag === "recommended");
  const lowestPrices = allProducts.filter(p => p.tag === "lowest");
  const fairestDeals = allProducts.filter(p => p.tag === "fair");

  if (loading) {
    return <div className="p-8 text-gray-500">Loading products...</div>;
  }

  return (
    <div className="min-h-full">
      {/* Hero strip */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-gray-900 text-xl font-bold">Good morning, {user?.email || "User"} 👋</p>
            <span className="ml-2 flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-xs font-bold text-green-700">
              <Wallet className="w-3.5 h-3.5" /> {(() => { const c = JSON.parse(localStorage.getItem(`amazon_relife_credits_${user?.email || 'guest'}`) || '{"total_points": 100}'); return `${c.total_points} pts · ₹${Math.round(c.total_points / 10)} cashback ready`; })()}
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-4">Here are today's best refurbished finds, curated just for you.</p>

          {/* Search bar */}
          <div className={`flex items-center gap-3 bg-gray-50 border rounded-xl px-4 py-3 transition-all ${searchFocused ? "border-gray-400 bg-white shadow-sm" : "border-gray-200"}`}>
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              placeholder="Search refurbished products, brands, categories…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <span className="text-[10px] font-bold text-gray-300 bg-gray-200 rounded px-1.5 py-0.5">⌘K</span>
          </div>
        </div>
      </div>

      <div className="px-8 py-7 space-y-10">

        {/* ── Today's Top Picks ───────────────────────────────────────────── */}
        {topPicks.length > 0 && (
          <section>
            <SectionHeader
              icon={Flame} color="text-orange-500"
              title="Today's Top Picks"
              sub="Curated daily · highest demand + best grades"
              action="See all"
            />
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {topPicks.slice(0, 4).map((p, i) => (
                <ProductCard key={p.id} p={p} delay={i * 0.05} onNav={onNav} />
              ))}
            </div>
          </section>
        )}

        {/* ── Lowest Prices ───────────────────────────────────────────────── */}
        {lowestPrices.length > 0 && (
          <section>
            <SectionHeader
              icon={BadgePercent} color="text-blue-500"
              title="Lowest Prices"
              sub="Best-value certified-refurbished items right now"
              action="See all"
            />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {lowestPrices.slice(0, 3).map((p, i) => (
                <motion.div
                  key={p.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group flex gap-4 p-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -1 }}
                  onClick={() => onNav("buyer", p.id)}
                >
                  <div className="w-20 h-20 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-black border rounded-full px-1.5 py-px ${GRADE_COLOR[p.grade] || "bg-gray-100"}`}>{p.grade}</span>
                      <span className="text-[10px] text-gray-400">{p.category}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{p.brand}</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-lg font-black text-gray-900">₹{Number(p.price).toLocaleString("en-IN")}</span>
                      <span className="text-xs text-gray-300 line-through">₹{Number(p.original_price).toLocaleString("en-IN")}</span>
                      <span className="text-xs font-black text-red-600 ml-auto">{p.discount}% off</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Leaf className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span className="text-[10px] text-green-700">Saves {p.co2_saved} kg CO₂</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Fairest Deals ───────────────────────────────────────────────── */}
        {fairestDeals.length > 0 && (
          <section>
            <SectionHeader
              icon={Sparkles} color="text-emerald-600"
              title="Fairest Deals"
              sub="Highest grade-to-price ratio · independently scored"
              action="See all"
            />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {fairestDeals.map((p, i) => (
                <motion.div
                  key={p.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer group"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => onNav("buyer", p.id)}
                >
                  <div className="relative bg-gray-50 h-36 overflow-hidden">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {/* Fair score overlay */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-white/90 border border-emerald-200 rounded-full px-2.5 py-1 shadow-sm">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-700">Fair Score: {p.fair_score}</span>
                    </div>
                    <div className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[10px] font-black rounded-full px-2 py-0.5">{p.discount}% off</div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`text-[10px] font-black border rounded-full px-1.5 py-px ${GRADE_COLOR[p.grade] || "bg-gray-100"}`}>{p.grade}</span>
                      <span className="text-[10px] text-gray-400">{p.brand} · {p.category}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">{p.name}</p>
                    <div className="flex items-center gap-0.5 mb-3">
                      {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < Math.floor(Number(p.rating) || 0) ? "fill-[#FF9900] text-[#FF9900]" : "text-gray-200"}`} />)}
                      <span className="text-[10px] text-gray-400 ml-1">({(p.reviews || 0).toLocaleString()})</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl font-black text-gray-900">₹{Number(p.price).toLocaleString("en-IN")}</span>
                      <span className="text-sm text-gray-300 line-through">₹{Number(p.original_price).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); onNav("buyer", p.id); }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#FF9900] hover:bg-amber-500 text-gray-900 font-bold rounded-xl py-2.5 text-xs cursor-pointer transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Buy · ₹{Number(p.price).toLocaleString("en-IN")}
                      </button>
                      <div className="flex items-center gap-1 text-[10px] text-green-700 font-semibold">
                        <Leaf className="w-3.5 h-3.5 text-green-500" />{p.co2_saved} kg
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Browse by category ──────────────────────────────────────────── */}
        {allProducts.length > 0 && (
          <section>
            <SectionHeader
              icon={Search} color="text-violet-500"
              title="Browse All"
              sub="Filter by category · all AI-graded, all refurbished"
            />

            {/* Category pills */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs font-bold rounded-full px-3.5 py-1.5 border cursor-pointer transition-colors ${
                    activeCategory === cat
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {allProducts.map((p, i) => (
                <ProductCard key={p.id} p={p} delay={i * 0.04} onNav={onNav} />
              ))}
            </div>
          </section>
        )}

        {/* ── Seller-Listed Products (from in-memory store) ────────────── */}
        {listedProducts.length > 0 && (
          <section>
            <SectionHeader
              icon={ShoppingBag} color="text-amber-500"
              title={`Available in ${(userLocation || "your area").charAt(0).toUpperCase() + (userLocation || "your area").slice(1)}`}
              sub="Recently listed by sellers · AI-graded & routed"
            />
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {listedProducts.map((item, i) => (
                <motion.div
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.22 }}
                  whileHover={{ y: -2 }}
                  onClick={() => onNav("checkout", item.id)}
                >
                  {item.imageUrl && (
                    <div className="relative bg-gray-50 aspect-[4/3] overflow-hidden">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 border text-[10px] font-black rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 border-amber-200">
                        <Zap className="w-3 h-3" />
                        Amazon Verified
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 bg-green-600 text-white text-[10px] font-black rounded-full px-2 py-0.5 capitalize">
                        {item.condition}
                      </div>
                    </div>
                  )}
                  <div className="p-3.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-black border rounded-full px-1.5 py-px bg-amber-100 text-amber-700 border-amber-200 capitalize">{item.condition}</span>
                      <span className="text-[10px] text-gray-400 capitalize">{item.category.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-snug mb-1 line-clamp-2">{item.name}</p>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-lg font-black text-gray-900">₹{Number(item.price).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Leaf className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="text-[10px] text-green-700 font-semibold">Eco-certified · {item.location.toUpperCase()}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Near You (P2P) ──────────────────────────────────────────────── */}
        {!p2pLoading && p2pNearby && p2pNearby.length > 0 && (
          <section>
            <SectionHeader
              icon={MapPin} color="text-green-600"
              title="Near You"
              sub="Peer-to-peer listings within 5 km · instant contact"
              action="View all matches"
            />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {p2pNearby.map((item, i) => (
                <NearbyCard key={item.id} item={item} delay={i * 0.07} onNav={onNav} />
              ))}
            </div>

            <motion.div
              className="mt-4 bg-green-50 border border-green-200 rounded-2xl px-6 py-5 flex items-center gap-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            >
              <div className="w-10 h-10 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-900">Have something you no longer need?</p>
                <p className="text-xs text-green-700 mt-0.5">List it in 30 seconds · our AI finds local buyers instantly.</p>
              </div>
              <button
                onClick={() => onNav("p2p")}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                List an item <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </section>
        )}

      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const { user } = useAuthContext();
  return (
    <div className="w-56 flex-shrink-0 bg-[#111827] flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
            <img src={rcLogo} alt="Amazon ReLife" className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-bold tracking-tight">Amazon ReLife</span>
        </div>
        <p className="text-[10px] text-gray-500 mt-1.5 ml-9">Sustainable Commerce Platform</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-2">Platform</p>
        {NAV.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                isActive ? "bg-white/12 text-white font-semibold" : "text-gray-400 hover:text-gray-200 hover:bg-white/6"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-400" : "text-gray-500"}`} />
              <span>{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}

        <div className="pt-4">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-2">Data Sources</p>
          {[{ label: "Integrations", icon: BarChart2 }, { label: "Reports", icon: TrendingUp }].map(({ label, icon: Icon }) => (
            <button key={label} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/6 transition-colors cursor-pointer">
              <Icon className="w-4 h-4 flex-shrink-0 text-gray-600" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-gray-300">{(user?.email || "R")[0].toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-300 truncate">{user?.email || "Rahul Sharma"}</p>
            <p className="text-[10px] text-gray-600 truncate">{(() => { const c = JSON.parse(localStorage.getItem(`amazon_relife_credits_${user?.email || 'guest'}`) || '{"total_points": 100}'); return `${c.total_points} pts · Eco Level ${Math.floor(c.total_points / 500) + 1}`; })()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { session, loading, user } = useAuthContext();
  const [screen, setScreen] = useState("home");
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [notification, setNotification] = useState<Donation | null>(null);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  const LOCATIONS = ["delhi", "chennai", "mumbai", "lucknow", "kolkata", "prayagraj"];

  useDonationListener((newDonation) => {
    // Show notification for donations by other users
    if (newDonation.donor_id !== user?.id) {
      setNotification(newDonation);
      setTimeout(() => setNotification(null), 8000); // auto-hide after 8s
    }
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-[#111827] text-white">Loading...</div>;
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  // Location picker — shows every time until user picks one (resets on reload)
  if (!userLocation) {
    return (
      <div className="flex items-center justify-center h-full bg-[#111827]">
        <motion.div
          className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Select Your Location</h2>
            <p className="text-sm text-gray-400 mt-1">Choose your city to see products available near you</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {LOCATIONS.map(loc => (
              <button
                key={loc}
                onClick={() => setUserLocation(loc)}
                className="bg-gray-50 hover:bg-amber-50 border-2 border-gray-200 hover:border-amber-400 rounded-xl py-4 px-4 text-sm font-bold text-gray-700 hover:text-amber-700 capitalize cursor-pointer transition-all"
              >
                {loc}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const handleNav = (id: string, productId?: number) => {
    if (productId) {
      setSelectedProductId(productId);
    }
    setScreen(id);
  };

  const renderScreen = (id: string) => {
    switch (id) {
      case "checkout": return <CheckoutIntercept selectedProductId={selectedProductId} userLocation={userLocation} />;
      case "returns":  return <ReturnsPortal />;
      case "seller":   return <SellerHub onNav={handleNav} />;
      case "buyer":    return <BuyerView productId={selectedProductId} />;
      case "p2p":      return <P2PMatching onNav={handleNav} />;
      case "donations":return <DonationHub />;
      case "exchange": return <Exchange />;
      case "ops":      return <OpsDashboard />;
      default:         return null;
    }
  };

  return (
    <div className="flex h-full bg-[#111827] relative">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-rose-200 shadow-xl rounded-2xl p-4 flex items-center gap-4 max-w-md w-full"
          >
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Gift className="w-6 h-6 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-0.5">New Donation Nearby</p>
              <p className="text-sm font-bold text-gray-900 truncate">{notification.title}</p>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3"/> {notification.location}</p>
            </div>
            <button 
              onClick={() => { setNotification(null); handleNav("donations"); }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              View
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar active={screen} onChange={(id) => handleNav(id)} />

      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col h-full">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>Amazon ReLife</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-700 font-semibold">
              {NAV.find(n => n.id === screen)?.label ?? "Discover"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold text-emerald-700">All systems live</span>
            </div>
            <span className="text-xs text-gray-400">Last updated: just now</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              className="min-h-full"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {screen === "home" ? <Overview onNav={handleNav} userLocation={userLocation} /> : renderScreen(screen)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
