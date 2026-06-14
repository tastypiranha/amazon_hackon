import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart, Leaf, MapPin, Package, CheckCircle2,
  Search, Filter, Upload, Clock, Star,
  Gift, Users, ArrowRight, Plus, MessageCircle,
  Camera, Edit2, MoreHorizontal
} from "lucide-react";
import { createDonation } from "../../lib/hooks";
import { useAuthContext } from "../../lib/AuthContext";
import { listDonation, checkoutDonation } from "../../lib/api";

// ─── Data ─────────────────────────────────────────────────────────────────────

const AVAILABLE = [
  {
    id: "d1", name: "Philips Baby Monitor", category: "Baby & Kids",
    condition: "Good", postedAgo: "1h ago", distance: "1.2 km",
    rating: 4.9, verified: true, claimed: false,
    description: "Used for 8 months, fully functional. All accessories included. No longer needed.",
    co2: 3.1,
    img: "https://images.unsplash.com/photo-1566004100631-35d015d6a491?w=400&h=300&fit=crop&auto=format",
  },
  {
    id: "d2", name: "Levi's 511 Slim Jeans (32W)", category: "Apparel",
    condition: "Like New", postedAgo: "3h ago", distance: "2.8 km",
    rating: 4.7, verified: true, claimed: false,
    description: "Worn twice. Too big after weight loss. Great condition, no fading.",
    co2: 0.8,
    img: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=300&fit=crop&auto=format",
  },
  {
    id: "d3", name: "Instant Pot Duo 6Qt", category: "Kitchen",
    condition: "Good", postedAgo: "6h ago", distance: "3.5 km",
    rating: 4.6, verified: false, claimed: false,
    description: "Moving to a smaller apartment. Works perfectly, cleaned and ready.",
    co2: 4.4,
    img: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=300&fit=crop&auto=format",
  },
  {
    id: "d4", name: "JBL Flip 6 Speaker", category: "Audio",
    condition: "Fair", postedAgo: "1d ago", distance: "4.1 km",
    rating: 4.5, verified: true, claimed: false,
    description: "Minor scuff on the side, but sounds great. Charger included.",
    co2: 1.6,
    img: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop&auto=format",
  },
  {
    id: "d5", name: "Children's Books (set of 12)", category: "Books",
    condition: "Good", postedAgo: "2d ago", distance: "0.9 km",
    rating: 4.8, verified: true, claimed: false,
    description: "Ages 4–8. Gently used, no torn pages. Great for a young reader.",
    co2: 0.4,
    img: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop&auto=format",
  },
  {
    id: "d6", name: "IKEA Study Desk", category: "Furniture",
    condition: "Good", postedAgo: "2d ago", distance: "5.0 km",
    rating: 4.4, verified: false, claimed: false,
    description: "LINNMON table top with ADILS legs. Minor surface scratches, sturdy.",
    co2: 12.0,
    img: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop&auto=format",
  },
];

const CATEGORIES = ["All", "Baby & Kids", "Apparel", "Kitchen", "Audio", "Books", "Furniture", "Electronics"];

const CONDITIONS = ["Like New", "Good", "Fair"] as const;

const STATS = [
  { label: "Items Available", value: "2,840",  icon: Gift,  color: "text-rose-500" },
  { label: "Donated This Week", value: "318",  icon: Heart, color: "text-rose-500" },
  { label: "CO₂ Avoided",      value: "61 t",  icon: Leaf,  color: "text-green-600" },
  { label: "Active Donors",    value: "1,200+",icon: Users, color: "text-blue-600" },
];

type Tab = "browse" | "donate";
type ClaimStep = "idle" | "composing" | "claimed";

// ─── Claim flow on card ───────────────────────────────────────────────────────

function ClaimButton({ itemName }: { itemName: string }) {
  const [step, setStep] = useState<ClaimStep>("idle");
  const [msg, setMsg] = useState("");

  return (
    <AnimatePresence mode="wait">
      {step === "idle" && (
        <motion.button key="idle" onClick={() => setStep("composing")}
          className="w-full flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-2.5 text-xs font-bold cursor-pointer transition-colors"
          whileTap={{ scale: 0.97 }} exit={{ opacity: 0 }}
        >
          <Heart className="w-3.5 h-3.5" /> Claim This Item
        </motion.button>
      )}
      {step === "composing" && (
        <motion.div key="compose" className="space-y-2"
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0 }} style={{ overflow: "hidden" }}
        >
          <textarea
            autoFocus rows={2}
            value={msg} onChange={e => setMsg(e.target.value)}
            placeholder={`Hi! I'd love to give this ${itemName} a good home. I'll take great care of it…`}
            className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 resize-none outline-none focus:border-gray-400 placeholder-gray-400"
          />
          <div className="flex gap-2">
            <button onClick={() => setStep("claimed")}
              className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg py-2 text-xs font-bold cursor-pointer transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Send Request
            </button>
            <button onClick={() => setStep("idle")} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </motion.div>
      )}
      {step === "claimed" && (
        <motion.div key="done" className="flex items-center justify-center gap-2 rounded-xl py-2.5 bg-green-50 border border-green-200"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-bold text-green-700">Request Sent!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Donation card ────────────────────────────────────────────────────────────

function DonationCard({ item, delay }: { item: typeof AVAILABLE[0]; delay: number }) {
  return (
    <motion.div
      className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all group"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {/* Free badge */}
        <div className="absolute top-2.5 left-2.5 bg-rose-500 text-white text-[10px] font-black rounded-full px-2.5 py-1">
          FREE
        </div>
        {/* Condition */}
        <div className="absolute top-2.5 right-2.5 bg-white/90 border border-gray-200 text-gray-700 text-[10px] font-bold rounded-full px-2 py-0.5 backdrop-blur-sm">
          {item.condition}
        </div>
        {/* CO2 */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-green-600/90 text-white rounded-full px-2.5 py-1 backdrop-blur-sm">
          <Leaf className="w-3 h-3" />
          <span className="text-[10px] font-bold">{item.co2} kg CO₂ saved</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{item.category}</span>
          </div>
          <button className="text-gray-300 hover:text-gray-500 cursor-pointer transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm font-bold text-gray-900 mt-1.5 mb-1">{item.name}</p>
        <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{item.description}</p>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{item.distance}</span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{item.postedAgo}</span>
          {item.verified && (
            <>
              <span className="text-gray-200">·</span>
              <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold"><CheckCircle2 className="w-3 h-3" />Verified</span>
            </>
          )}
        </div>

        <ClaimButton itemName={item.name} />
      </div>
    </motion.div>
  );
}

// ─── Post donation form ───────────────────────────────────────────────────────

function PostDonation() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>("Good");
  const [description, setDescription] = useState("");
  const [posted, setPosted] = useState(false);
  const { user } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageUrl(URL.createObjectURL(file));
  };

  const handleDonate = async () => {
    if (!itemName || !description) return;
    if (!user) {
      alert("You must be logged in to donate an item.");
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await createDonation({
      donor_id: user.id,
      title: itemName,
      category,
      description,
      location: "Your Location", // Mock location for now
      status: 'available',
      image_url: imageUrl || "https://images.unsplash.com/photo-1566004100631-35d015d6a491?w=400&h=300&fit=crop&auto=format" // fallback image
    });

    setIsSubmitting(false);
    if (error) {
      console.error(error);
      alert("Failed to create donation in Supabase!");
      return;
    }
    setPosted(true);
  };

  if (posted) {
    return (
      <motion.div className="flex flex-col items-center text-center max-w-sm mx-auto py-10"
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="w-20 h-20 rounded-full bg-rose-100 border-2 border-rose-300 flex items-center justify-center mb-6"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
        >
          <Heart className="w-9 h-9 text-rose-500 fill-rose-200" />
        </motion.div>
        <h2 className="text-gray-900 text-xl font-bold mb-2">Item Listed for Donation!</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Your <strong className="text-gray-700">{itemName}</strong> is now visible to people nearby. You'll get notified when someone requests it.
        </p>
        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          {[
            { label: "Reach",      value: "5 km",   color: "text-blue-600" },
            { label: "CO₂ saved",  value: "~2 kg",  color: "text-green-600" },
            { label: "Green Pts",  value: "+60",    color: "text-[#FF9900]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
              <p className={`text-lg font-black ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => { setPosted(false); setImageUrl(null); setItemName(""); setDescription(""); }}
          className="flex items-center gap-2 bg-[#FF9900] hover:bg-amber-500 text-gray-900 font-bold rounded-xl px-6 py-3 text-sm cursor-pointer transition-colors"
        >
          Donate Another Item <Plus className="w-4 h-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">

      {/* Photo upload */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Photo</p>
        <div
          className={`border-2 border-dashed rounded-2xl overflow-hidden cursor-pointer transition-all ${
            dragging ? "border-rose-400 bg-rose-50"
            : imageUrl ? "border-gray-200"
            : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"
          }`}
          onClick={() => !imageUrl && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <AnimatePresence mode="wait">
            {!imageUrl ? (
              <motion.div key="empty" className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Drop a photo here</p>
                  <p className="text-xs text-gray-400 mt-1">or click to browse · JPG, PNG, WEBP</p>
                </div>
                <p className="text-[11px] text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-3 py-1">
                  Clear photos get 3× more requests
                </p>
              </motion.div>
            ) : (
              <motion.div key="preview" className="relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <img src={imageUrl} alt="Item" className="w-full h-52 object-cover" />
                <button
                  onClick={e => { e.stopPropagation(); setImageUrl(null); }}
                  className="absolute top-3 right-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Change
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Item details */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Item Details</p>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">Item Name</label>
            <input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="e.g. Sony WH-1000XM5 Headphones"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none cursor-pointer"
              >
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">Condition</label>
              <div className="flex gap-2">
                {CONDITIONS.map(c => (
                  <button key={c} onClick={() => setCondition(c)}
                    className={`flex-1 text-[10px] font-bold rounded-lg py-2.5 border cursor-pointer transition-colors ${
                      condition === c ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-widest block mb-2">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Why are you donating it? Any flaws to mention? What's included?"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 resize-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Eco impact preview */}
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <Leaf className="w-4 h-4 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-800">
          Donating this item keeps it out of landfill and earns you <strong>+60 Green Credits</strong>.
        </p>
      </div>

      {/* Submit */}
      <motion.button
        onClick={async () => { 
          if (itemName && description) {
            try {
              await listDonation("bengaluru", category.toLowerCase(), description);
            } catch (err) {
              console.error("Backend donation call failed:", err);
            }
            setPosted(true); 
          }
        }}
        disabled={!itemName || !description}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold cursor-pointer transition-colors ${
          itemName && description && !isSubmitting
            ? "bg-rose-500 hover:bg-rose-600 text-white"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
        whileTap={itemName && description && !isSubmitting ? { scale: 0.98 } : undefined}
      >
        <Heart className="w-4 h-4" /> {isSubmitting ? "Listing Item..." : "List Item for Donation"}
      </motion.button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DonationHub() {
  const [tab, setTab] = useState<Tab>("browse");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = AVAILABLE.filter(item =>
    (activeCategory === "All" || item.category === activeCategory) &&
    (item.name.toLowerCase().includes(search.toLowerCase()) ||
     item.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-gray-900 text-xl font-bold">Donate</h1>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 rounded-full px-2.5 py-0.5">
              {AVAILABLE.length} ITEMS AVAILABLE
            </span>
          </div>
          <p className="text-gray-400 text-sm">Browse items people are giving away free — or list something of your own</p>
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
          { id: "browse", label: "Browse Donations",      icon: Gift },
          { id: "donate", label: "Donate an Item",        icon: Upload },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 text-sm font-bold rounded-xl px-5 py-2.5 border cursor-pointer transition-colors ${
              tab === t.id
                ? "bg-rose-500 text-white border-rose-500"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* Browse */}
        {tab === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Search + filter */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search available donations…"
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <button className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl px-3.5 py-2.5 text-xs font-medium cursor-pointer transition-colors">
                <Filter className="w-3.5 h-3.5" /> Filter
              </button>
            </div>

            {/* Category pills */}
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

            {/* Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {filtered.map((item, i) => (
                <DonationCard key={item.id} item={item} delay={i * 0.05} />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-3 flex flex-col items-center py-16 text-center">
                  <Gift className="w-10 h-10 text-gray-200 mb-4" />
                  <p className="text-sm text-gray-400">No items found. Try a different search or category.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Post donation */}
        {tab === "donate" && (
          <motion.div key="donate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PostDonation />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
