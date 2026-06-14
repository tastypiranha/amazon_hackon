import { useState } from "react";
import { motion } from "motion/react";
import { Gift, MapPin, Search, ChevronRight, CheckCircle2, Heart, UploadCloud } from "lucide-react";
import { useAuthContext } from "../../lib/AuthContext";
import { useDonations, createDonation, claimDonation, insertEvent, awardGreenCredits } from "../../lib/hooks";
import { Donation } from "../../lib/types";

export function DonationHub() {
  const { user } = useAuthContext();
  const { donations, loading, setDonations } = useDonations();
  const [view, setView] = useState<"list" | "donate">("list");
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return <div className="p-8 text-gray-500">Loading donations...</div>;

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !location) return;
    setIsSubmitting(true);

    const newDonation = {
      donor_id: user.id,
      title,
      description,
      location,
      status: 'available',
      image_url: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&h=400&fit=crop', // placeholder
    };

    const inserted = await createDonation(newDonation);
    
    if (inserted.data) {
      // Award credits for donating
      await awardGreenCredits(user.id, 100, 0, "donation_listed");
      
      // Send event to ops dashboard
      await insertEvent({
        event_type: "donation",
        text: `New Donation: ${title}`,
        description: `Listed in ${location}`,
        icon_name: "Heart",
        color_class: "text-rose-600",
        bg_class: "bg-rose-100",
        border_class: "border-rose-200"
      });

      // Optimistically update list so we don't have to wait for websocket bounce back
      setDonations([inserted.data, ...donations]);
      
      setView("list");
      setTitle("");
      setDescription("");
      setLocation("");
    }
    
    setIsSubmitting(false);
  };

  const handleClaim = async (donation: Donation, method: 'manual' | 'amazon') => {
    if (!donation.id) return;
    
    const fee = method === 'amazon' ? 50 : 0;
    await claimDonation(donation.id, method, fee);
    
    // Remove from local UI immediately
    setDonations(donations.filter(d => d.id !== donation.id));

    // Optional event for Ops Dashboard
    const methodText = method === 'amazon' ? 'via Amazon Delivery' : 'via P2P Pickup';
    await insertEvent({
      event_type: "claim",
      text: `Donation Claimed ${methodText}`,
      description: `${donation.title} claimed in ${donation.location}`,
      icon_name: "CheckCircle2",
      color_class: "text-emerald-600",
      bg_class: "bg-emerald-100",
      border_class: "border-emerald-200"
    });
  };

  return (
    <div className="p-8 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-600" />
            </div>
            <h1 className="text-gray-900 text-2xl font-bold tracking-tight">Community Donations</h1>
          </div>
          <p className="text-gray-400 text-sm">Give items a second life. Claim things you need from neighbors.</p>
        </div>
        <div>
          {view === "list" ? (
            <button 
              onClick={() => setView("donate")}
              className="bg-gray-900 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              <Gift className="w-4 h-4" />
              Donate an Item
            </button>
          ) : (
            <button 
              onClick={() => setView("list")}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {view === "donate" ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">List an item for donation</h2>
          <form onSubmit={handleDonate} className="space-y-5">
            
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer mb-6">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                <UploadCloud className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-900">Upload Photo</p>
              <p className="text-xs text-gray-400">Clear photos help items find homes faster.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Item Name</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Vintage Wooden Chair"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-rose-400 focus:bg-white transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Location (Neighborhood/City)</label>
              <input 
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Indiranagar, Bangalore"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-rose-400 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Description (Optional)</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Details about condition, size, or best time for pickup..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-rose-400 focus:bg-white transition-colors min-h-[100px]"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl py-3.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Listing..." : "Publish Donation Listing"} <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-center text-[10px] text-gray-400 mt-3 font-semibold">You will earn 100 Green Credits for listing a donation!</p>
            </div>
          </form>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {donations.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-6 h-6 text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-bold">No active donations nearby</h3>
                <p className="text-sm text-gray-400 mt-1">Be the first to list an item to give away!</p>
              </div>
            ) : (
              donations.map((d, i) => (
                <motion.div 
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    <img src={d.image_url} alt={d.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-rose-600 flex items-center gap-1 shadow-sm">
                      <Heart className="w-3 h-3 fill-rose-600" /> FREE
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{d.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> {d.location}
                    </div>
                    {d.description && <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">{d.description}</p>}
                    
                    <div className="space-y-2">
                      <button 
                        onClick={() => handleClaim(d, 'manual')}
                        className="w-full bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-900 font-bold text-sm py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Claim (Pick Up Manually - Free)
                      </button>
                      <button 
                        onClick={() => handleClaim(d, 'amazon')}
                        className="w-full bg-[#FF9900]/10 hover:bg-[#FF9900] text-[#FF9900] hover:text-white font-bold text-sm py-2.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Claim (Amazon Delivery - ₹50)
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
