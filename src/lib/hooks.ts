import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Product, Listing, Order, CartItem, Event, UserProfile, Match, Donation, ExchangeOffer } from './types';

// Products
export function useProducts(category?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase.from('products').select('*');
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (!error && data) setProducts(data as Product[]);
      setLoading(false);
    }
    load();
  }, [category]);

  return { products, loading };
}

export function useProduct(id: number) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (!error && data) setProduct(data as Product);
      setLoading(false);
    }
    load();
  }, [id]);

  return { product, loading };
}

// P2P Nearby
export function useP2PNearby() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('listings')
        .select('*, products(*)')
        .eq('status', 'active')
        .limit(3);
      if (!error && data) setListings(data as Listing[]);
      setLoading(false);
    }
    load();
  }, []);

  return { listings, loading };
}

// Orders
export function useOrders(userId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const { data, error } = await supabase
        .from('orders')
        .select('*, products(*)')
        .eq('user_id', userId);
      if (!error && data) setOrders(data as Order[]);
      setLoading(false);
    }
    load();
  }, [userId]);

  return { orders, loading };
}

export function usePastOrders(userId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const { data, error } = await supabase
        .from('orders')
        .select('*, products(*)')
        .eq('user_id', userId)
        .eq('status', 'delivered');
      if (!error && data) setOrders(data as Order[]);
      setLoading(false);
    }
    load();
  }, [userId]);

  return { orders, loading };
}

// Cart
export function useCart(userId: string) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, products(*)')
        .eq('user_id', userId);
      if (!error && data) setCart(data as CartItem[]);
      setLoading(false);
    }
    load();
  }, [userId]);

  return { cart, loading, setCart };
}

// Matches
export function useMatches(listingId: number) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) return;
    async function load() {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('listing_id', listingId);
      if (!error && data) setMatches(data as Match[]);
      setLoading(false);
    }
    load();
  }, [listingId]);

  return { matches, loading };
}

// Events (Realtime)
export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    // Initial fetch
    async function load() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (data) setEvents(data as Event[]);
    }
    load();

    // Subscribe to new events
    const channel = supabase
      .channel('public:events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => {
        setEvents(prev => [payload.new as Event, ...prev].slice(0, 6));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return events;
}

// User Profile
export function useUserProfile(userId: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setProfile(data as UserProfile);
    }
    load();
  }, [userId]);

  return profile;
}

// Mutations
export async function createListing(data: any) {
  return await supabase.from('listings').insert(data);
}

export async function createReturn(data: any) {
  return await supabase.from('returns').insert(data);
}

export async function submitGrading(data: any) {
  return await supabase.from('grading_results').insert(data);
}

export async function updateCart(items: any[]) {
  return await supabase.from('cart_items').upsert(items);
}

export async function insertEvent(data: any) {
  return await supabase.from('events').insert(data);
}

export async function awardGreenCredits(userId: string, points: number, co2_kg: number, action: string) {
  await supabase.from('green_credits_log').insert({ user_id: userId, points, co2_kg, action });
  
  // Need to get current profile to update aggregates - simplify for hackathon
  const { data: profile } = await supabase.from('user_profiles').select('green_credits, co2_saved_kg').eq('id', userId).single();
  if (profile) {
    await supabase.from('user_profiles').update({
      green_credits: profile.green_credits + points,
      co2_saved_kg: Number(profile.co2_saved_kg) + co2_kg
    }).eq('id', userId);
  }
}

// Donations
export function useDonations() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false });
      if (!error && data) setDonations(data as Donation[]);
      setLoading(false);
    }
    load();
  }, []);

  return { donations, loading, setDonations };
}

export function useDonationListener(onNewDonation: (d: Donation) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('public:donations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations' }, payload => {
        onNewDonation(payload.new as Donation);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewDonation]);
}

export async function createDonation(data: Partial<Donation>) {
  return await supabase.from('donations').insert(data).select().single();
}

export async function claimDonation(id: number, deliveryMethod: string = 'manual', fee: number = 0) {
  return await supabase.from('donations').update({ 
    status: 'claimed',
    delivery_method: deliveryMethod,
    transportation_fee: fee
  }).eq('id', id);
}

// Exchange Engine
export async function findExchangeMatches(sellerValue: number, sellerLocation: string) {
  // Finds nationwide active listings to exchange with
  const { data, error } = await supabase
    .from('listings')
    .select('*, products(*)')
    .eq('status', 'active');
    
  if (error || !data) return [];
  
  // Apply the ±30% Amazon value match tolerance
  // In a real app, 'amazon_value' would be pre-calculated in the DB or via Edge Function
  // For this mock, we just use the ask_price as a proxy for the value
  const tolerance = 0.30;
  const matches = data.filter(item => {
    const itemValue = Number(item.ask_price);
    const diffPct = Math.abs(itemValue - sellerValue) / sellerValue;
    return diffPct <= tolerance;
  });
  
  return matches;
}

export async function proposeExchange(offer: Partial<ExchangeOffer>) {
  return await supabase.from('exchanges').insert(offer).select().single();
}

export function useExchangeOffers(userId: string) {
  const [offers, setOffers] = useState<ExchangeOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      // Find exchanges where this user is Party B (target) and it's pending
      const { data, error } = await supabase
        .from('exchanges')
        .select('*')
        .eq('target_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (!error && data) setOffers(data as ExchangeOffer[]);
      setLoading(false);
    }
    load();
    
    // Listen for new incoming exchange offers
    const channel = supabase
      .channel('public:exchanges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'exchanges', filter: `target_id=eq.${userId}` }, payload => {
        if (payload.new.status === 'pending') {
          setOffers(current => [payload.new as ExchangeOffer, ...current]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { offers, loading };
}
