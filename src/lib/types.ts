export interface UserProfile {
  id: string;
  name: string;
  email: string;
  neighborhood: string;
  city: string;
  green_credits: number;
  co2_saved_kg: number;
  trust_score: number;
  tier: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  grade: string;
  original_price: number;
  price: number;
  discount: number;
  co2_saved: number;
  rating: number;
  reviews: number;
  fair_score: number;
  image_url: string;
  tag: string;
  tag_label: string;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  product_id: number;
  variant_size: string;
  variant_color: string;
  status: string;
  price_paid: number;
  order_date: string;
  eligible_for_return: boolean;
  products?: Product; // for joined queries
}

export interface CartItem {
  id: number;
  user_id: string;
  product_id: number;
  size: string;
  color: string;
  quantity: number;
  price: number;
  created_at: string;
  products?: Product;
}

export interface Listing {
  id: number;
  seller_id: string;
  product_id: number;
  title: string;
  ask_price: number;
  condition: string;
  exchange_type: string;
  status: string;
  location: string;
  created_at: string;
  products?: Product;
}

export interface Match {
  id: number;
  listing_id: number;
  buyer_id: string;
  match_score: number;
  distance_km: number;
  eco_impact: number;
  verified: boolean;
  is_top_match: boolean;
  status: string;
  created_at: string;
  listings?: Listing;
}

export interface Return {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  photo_urls: any;
  ai_grade: string;
  disposition_route: string;
  refund_amount: number;
  processing_fee: number;
  co2_saved: number;
  refund_type: string;
  created_at: string;
}

export interface GradingResult {
  id: number;
  product_id: number;
  user_id: string;
  grade: string;
  confidence: number;
  defects: any;
  route_decision: string;
  resale_price: number;
  sku: string;
  category_label: string;
  created_at: string;
}

export interface GreenCreditEntry {
  id: number;
  user_id: string;
  action: string;
  points: number;
  co2_kg: number;
  item_reference: string;
  created_at: string;
}

export interface Event {
  id: number;
  event_type: string;
  text: string;
  icon_name: string;
  color_class?: string;
  bg_class?: string;
  border_class?: string;
  created_at?: string;
}

export interface Donation {
  id?: number;
  donor_id: string;
  title: string;
  description?: string;
  image_url?: string;
  location: string;
  status: string;
  delivery_method?: string;
  transportation_fee?: number;
  created_at?: string;
}
