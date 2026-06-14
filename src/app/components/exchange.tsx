import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeftRight, Leaf, MapPin, Star, CheckCircle2,
  ChevronRight, Package, Filter, Search, Zap,
  Plus, Clock, Shield, MessageCircle, TrendingUp
} from "lucide-react";
import { findExchangeMatches as findBackendMatches, checkoutExchange } from "../../lib/api";

const LISTINGS = [
  {
    id: "e1",
    have: { name: "Sony WH-1000XM5", category: "Audio",    condition: "Good",     img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&h=120&fit=crop" },
    want: { name: "Apple AirPods Pro", category: "Audio",   condition: "Any" },
    distance: "1.8 km", rating: 4.8, verified: true, postedAgo: "2h ago",
    co2: 3.2, fairScore: 94, top: true,
  },
  {
    id: "e2",
    have: { name: "Nike Air Max 270",  category: "Footwear", condition: "Like New", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop" },
    want: { name: "Adidas Ultraboost", category: "Footwear", condition: "Good" },
    distance: "3.1 km", rating: 4.6, verified: true, postedAgo: "5h ago",
    co2: 1.8, fairScore: 88, top: false,
  },
  {
    id: "e3",
    have: { name: "Instant Pot Duo",   category: "Kitchen",  condition: "Good",     img: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=120&h=120&fit=crop" },
    want: { name: "Air Fryer (any brand)", category: "Kitchen", condition: "Good" },
    distance: "4.5 km", rating: 4.5, verified: false, postedAgo: "1d ago",
    co2: 4.1, fairScore: 82, top: false,
  },
  {
    id: "e4",
    have: { name: "Apple Watch SE",    category: "Wearables", condition: "Like New", img: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=120&h=120&fit=crop" },
    want: { name: "Fitbit Sense 2",    category: "Wearables", condition: "Good" },
    distance: "2.6 km", rating: 4.9, verified: true, postedAgo: "3h ago",
    co2: 5.0, fairScore: 97, top: true,
  },
];

const MY_ITEMS = [
  { id: "m1", name: "Levi's 511 Jeans", category: "Apparel",     condition: "Good",     img: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=80&h=80&fit=crop" },
  { id: "m2", name: "JBL Flip 6",       category: "Audio",       condition: "Like New", img: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=80&h=80&fit=crop" },
  { id: "m3", name: "Instant Pot Duo",  category: "Kitchen",     condition: "Good",     img: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=80&h=80&fit=crop" },
];

const CATEGORIES = ["All", "Audio", "Footwear", "Wearables", "Kitchen", "Apparel"];

const STATS = [
  { label: "Active Exchanges", value: "3,840",  icon: ArrowLeftRight, color: "text-violet-600" },
  { label: "Matches Today",    value: "218",    icon: Zap,            color: "text-[#FF9900]" },
  { label: "CO₂ Saved",       value: "61.4 t", icon: Leaf,           color: "text-green-600" },
  { label: "Avg Fair Score",   value: "91",     icon: TrendingUp,     color: "text-sky-600" },
];

type Tab = "browse" | "post";
type ContactStep = "idle" | "composing" | "sent";

function FairScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : score >= 80 ? "bg-sky-100 text-sky-700 border-sky-200"
    : "bg-amber-100 text-amber-700 border-amber-200";
  return (
    <span className={`text-[10px] font-black border rounded-full px-2 py-0.5 ${color}`}>
      Fair {score}
    </span>
  );
}

function ListingCard({ listing, delay }: { listing: typeof LISTINGS[0]; delay: number }) {
  const [contactStep, setContactStep] = useState<ContactStep>("idle");
  const [msg, setMsg] = useState("");

  return (
    <motion.div
      className={`bg-white border rounded-2xl overflow-hidden transition-all ${listing.top ? "border-violet-300 shadow-sm" : "border-gray-100 hover:border-gray-300 hover:shadow-sm"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      {listing.top && <div className="h-0.5 w-full bg-gradient-to-r from-violet-400 to-purple-400" />}

      <div className="p-4">
        {/* Have → Want */}
        <div className="flex items-center gap-3 mb-4">
          {/* Have */}
          <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex-shrink-0">
              <img src={listing.have.img} alt={listing.have.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Offering</p>
              <p className="text-xs font-bold text-gray-900 truncate">{listing.have.name}</p>
              <span className="text-[10px] text-gray-400">{listing.have.condition}</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center">
            <ArrowLeftRight className="w-3.5 h-3.5 text-violet-600" />
          </div>

          {/* Want */}
          <div className="flex-1 bg-violet-50 border border-violet-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">Wants</p>
            <p className="text-xs font-bold text-violet-900 truncate">{listing.want.name}</p>
            <span className="text-[10px] text-violet-400">{listing.want.condition}</span>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{listing.distance}</span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><Star className="w-3 h-3 fill-[#FF9900] text-[#FF9900]" />{listing.rating}</span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{listing.postedAgo}</span>
          {listing.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
          <span className="ml-auto"><FairScoreBadge score={listing.fairScore} /></span>
        </div>

        {/* Eco */}
        <div className="flex items-center gap-1.5 mb-3">
          <Leaf className="w-3.5 h-3.5 text-green-600" />
          <span className="text-[11px] text-green-700 font-semibold">Exchange saves {listing.co2} kg CO₂</span>
        </div>

        {/* Contact flow */}
        <AnimatePresence mode="wait">
          {contactStep === "idle" && (
            <motion.button
              key="idle"
              onClick={() => setContactStep("composing")}
              className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold cursor-pointer transition-colors ${
                listing.top
                  ? "bg-violet-600 hover:bg-violet-700 text-white"
                  : "border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
              }`}
              whileTap={{ scale: 0.98 }}
              exit={{ opacity: 0 }}
            >
              <MessageCircle className="w-3.5 h-3.5" /> Propose Exchange
            </motion.button>
          )}

          {contactStep === "composing" && (
            <motion.div key="compose" className="space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }} style={{ overflow: "hidden" }}>
              <textarea
                autoFocus
                rows={2}
                value={msg}
                onChange={e => setMsg(e.target.value)}
                placeholder="Hi! I'm interested in exchanging your item. I have a similar one in great condition…"
                className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 resize-none outline-none focus:border-gray-400 placeholder-gray-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setContactStep("sent")}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2 text-xs font-bold cursor-pointer transition-colors"
                >
                  Send Proposal
                </button>
                <button onClick={() => setContactStep("idle")} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {contactStep === "sent" && (
            <motion.div key="sent" className="flex items-center justify-center gap-2 rounded-xl py-2.5 bg-green-50 border border-green-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-bold text-green-700">Proposal Sent!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function PostListing() {
  const [selectedItem, setSelectedItem] = useState<typeof MY_ITEMS[0] | null>(null);
  const [wantItem, setWantItem] = useState("");
  const [wantCategory, setWantCategory] = useState("Any");
  const [wantCondition, setWantCondition] = useState("Any");
  const [posted, setPosted] = useState(false);

  if (posted) {
    return (
      <motion.div className="flex flex-col items-center text-center max-w-sm mx-auto py-10" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div className="w-20 h-20 rounded-full bg-violet-100 border-2 border-violet-300 flex items-center justify-center mb-6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.1 }}>
          <ArrowLeftRight className="w-9 h-9 text-violet-600" />
        </motion.div>
        <h2 className="text-gray-900 text-xl font-bold mb-2">Listing Posted!</h2>
        <p className="text-gray-400 text-sm mb-6">Your exchange listing is live. We'll notify you when a matching offer comes in.</p>
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          {[
            { label: "Est. matches", value: "3–5",     color: "text-violet-600" },
            { label: "CO₂ to save",  value: "~2.8 kg", color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
              <p className={`text-lg font-black ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setPosted(false)} className="flex items-center gap-2 bg-[#FF9900] hover:bg-amber-500 text-gray-900 font-bold rounded-xl px-6 py-3 text-sm cursor-pointer transition-colors">
          Post Another <Plus className="w-4 h-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Step 1 */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Step 1 · What are you offering?</p>
        <div className="space-y-2">
          {MY_ITEMS.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`flex items-center gap-4 bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                selectedItem?.id === item.id ? "border-violet-400 ring-1 ring-violet-200 bg-violet-50/30" : "border-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                <p className="text-[10px] text-gray-400">{item.category} · {item.condition}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedItem?.id === item.id ? "border-violet-500 bg-violet-500" : "border-gray-300"}`}>
                {selectedItem?.id === item.id && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2 */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Step 2 · What do you want in return?</p>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">Item name</label>
            <input
              value={wantItem}
              onChange={e => setWantItem(e.target.value)}
              placeholder="e.g. Apple AirPods Pro, Adidas Ultraboost…"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">Category</label>
              <select value={wantCategory} onChange={e => setWantCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none cursor-pointer">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">Condition</label>
              <select value={wantCondition} onChange={e => setWantCondition(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none cursor-pointer">
                {["Any", "Like New", "Good", "Fair"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Shield,      label: "Verified listing",   sub: "AI-checked condition" },
          { icon: Leaf,        label: "Eco-tracked",        sub: "CO₂ impact logged" },
          { icon: Zap,         label: "Instant matching",   sub: "AI finds offers fast" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
            <Icon className="w-4 h-4 text-gray-300 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <motion.button
        onClick={() => { if (selectedItem && wantItem) setPosted(true); }}
        disabled={!selectedItem || !wantItem}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold cursor-pointer transition-colors ${
          selectedItem && wantItem ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
        whileTap={selectedItem && wantItem ? { scale: 0.98 } : undefined}
      >
        <ArrowLeftRight className="w-4 h-4" /> Post Exchange Listing
      </motion.button>
    </div>
  );
}

export function Exchange() {
  const [tab, setTab] = useState<Tab>("browse");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = LISTINGS.filter(l =>
    (activeCategory === "All" || l.have.category === activeCategory || l.want.category === activeCategory) &&
    (l.have.name.toLowerCase().includes(search.toLowerCase()) || l.want.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-gray-900 text-xl font-bold">Exchange</h1>
            <div className="flex items-center gap-1.5 bg-violet-100 border border-violet-200 rounded-full px-2.5 py-1">
              <motion.div className="w-1.5 h-1.5 rounded-full bg-violet-500" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
              <span className="text-[10px] font-black text-violet-700">LIVE</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Swap what you have for what you want · AI-matched · zero cash needed</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {([
          { id: "browse", label: "Browse Exchanges" },
          { id: "post",   label: "Post a Listing"  },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm font-bold rounded-xl px-5 py-2.5 border cursor-pointer transition-colors ${
              tab === t.id
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {tab === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Search + category */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search items to exchange…"
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <button className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl px-3.5 py-2.5 text-xs font-medium cursor-pointer transition-colors">
                <Filter className="w-3.5 h-3.5" /> Filter
              </button>
            </div>

            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`text-xs font-bold rounded-full px-3.5 py-1.5 border cursor-pointer transition-colors ${
                    activeCategory === cat ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filtered.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} delay={i * 0.06} />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-2 flex flex-col items-center py-16 text-center">
                  <ArrowLeftRight className="w-10 h-10 text-gray-200 mb-4" />
                  <p className="text-sm text-gray-400">No exchange listings found. Try a different search.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === "post" && (
          <motion.div key="post" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PostListing />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
