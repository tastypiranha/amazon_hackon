-- Make sure to run schema.sql first, and create at least one user in auth.users and copy their UUID to replace 'YOUR-UUID-HERE'

-- Insert Products
INSERT INTO products (name, brand, category, grade, original_price, price, discount, co2_saved, rating, reviews, fair_score, image_url, tag, tag_label) VALUES
('Sony WH-1000XM5', 'Sony', 'Audio', 'A-', 24990, 18500, 26, 4.2, 4.6, 2841, 96, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80', 'top-pick', 'Top Pick'),
('Nike Air Force 1', 'Nike', 'Footwear', 'B+', 10995, 5999, 45, 2.1, 4.4, 1203, 91, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', 'lowest', 'Lowest Price'),
('Apple Watch SE', 'Apple', 'Wearables', 'A', 29900, 19800, 34, 3.8, 4.7, 4102, 98, 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&q=80', 'fair', 'Fairest Deal'),
('MacBook Pro 14"', 'Apple', 'Laptops', 'B+', 199900, 129000, 35, 18.4, 4.8, 892, 89, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80', 'recommended', 'Recommended'),
('JBL Flip 6', 'JBL', 'Audio', 'A-', 11999, 6799, 43, 1.6, 4.5, 3210, 94, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80', 'lowest', 'Lowest Price'),
('Sony A7 III', 'Sony', 'Cameras', 'A', 189990, 124000, 35, 12.1, 4.9, 412, 97, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80', 'fair', 'Fairest Deal'),
('Nike Air Max 270', 'Nike', 'Footwear', 'B+', 12999, 6999, 46, 2.3, 4.3, 876, 88, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', 'lowest', 'Lowest Price'),
('Apple Watch Ultra', 'Apple', 'Wearables', 'A', 89900, 58000, 35, 5.9, 4.8, 301, 99, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&q=80', 'fair', 'Fairest Deal');

-- Insert Events
INSERT INTO events (event_type, text, icon_name, color_class, bg_class, border_class) VALUES
('return_prevented', 'Priya''s return prevented — Nike Shoes Size 7→8', 'Shield', 'text-blue-600', 'bg-blue-100', 'border-blue-200'),
('ai_graded', 'Baby Monitor graded A — Amazon Buyback ₹2,070', 'Crown', 'text-amber-600', 'bg-amber-100', 'border-amber-200'),
('p2p_match', 'P2P Match: Neha ↔ Rahul — 2.3km', 'MapPin', 'text-emerald-600', 'bg-emerald-100', 'border-emerald-200'),
('green_credits', '+50 Green Credits issued to Rahul', 'Leaf', 'text-green-600', 'bg-green-100', 'border-green-200'),
('relisted', 'Kindle Oasis graded B+ — Relisted for ₹12,400', 'RefreshCw', 'text-purple-600', 'bg-purple-100', 'border-purple-200');

-- Note: user-specific data (orders, listings, cart) will need to be inserted via the app or using a real user ID.
