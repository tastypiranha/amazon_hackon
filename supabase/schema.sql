-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. users / profiles (Extends Supabase Auth users)
create table user_profiles (
  id uuid references auth.users(id) primary key,
  name text,
  email text,
  neighborhood text,
  city text,
  green_credits integer default 0,
  co2_saved_kg numeric default 0,
  trust_score integer default 100,
  tier text default 'Eco Starter',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. products
create table products (
  id integer primary key generated always as identity,
  name text not null,
  brand text not null,
  category text not null,
  grade text,
  original_price numeric not null,
  price numeric not null,
  discount numeric,
  co2_saved numeric,
  rating numeric,
  reviews integer,
  fair_score integer,
  image_url text,
  tag text,
  tag_label text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. orders
create table orders (
  id text primary key,
  user_id uuid references auth.users(id),
  product_id integer references products(id),
  variant_size text,
  variant_color text,
  status text not null, -- 'delivered', 'returned', 'kept'
  price_paid numeric not null,
  order_date timestamp with time zone default timezone('utc'::text, now()) not null,
  eligible_for_return boolean default false
);

-- 4. cart_items
create table cart_items (
  id integer primary key generated always as identity,
  user_id uuid references auth.users(id),
  product_id integer references products(id),
  size text,
  color text,
  quantity integer default 1,
  price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. listings
create table listings (
  id integer primary key generated always as identity,
  seller_id uuid references auth.users(id),
  product_id integer references products(id),
  title text not null,
  ask_price numeric not null,
  condition text not null,
  exchange_type text not null, -- 'meetup', 'ship'
  status text default 'active', -- 'draft', 'active', 'matched', 'completed'
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. matches
create table matches (
  id integer primary key generated always as identity,
  listing_id integer references listings(id),
  buyer_id uuid references auth.users(id),
  match_score integer,
  distance_km numeric,
  eco_impact numeric,
  verified boolean default false,
  is_top_match boolean default false,
  status text default 'pending', -- 'pending', 'accepted', 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. returns
create table returns (
  id uuid primary key default uuid_generate_v4(),
  order_id text references orders(id),
  user_id uuid references auth.users(id),
  reason text,
  photo_urls jsonb,
  ai_grade text,
  disposition_route text,
  refund_amount numeric,
  processing_fee numeric,
  co2_saved numeric,
  refund_type text, -- 'credit', 'refund'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. grading_results
create table grading_results (
  id integer primary key generated always as identity,
  product_id integer references products(id),
  user_id uuid references auth.users(id),
  grade text,
  confidence numeric,
  defects jsonb,
  route_decision text,
  resale_price numeric,
  sku text,
  category_label text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. green_credits_log
create table green_credits_log (
  id integer primary key generated always as identity,
  user_id uuid references auth.users(id),
  action text not null,
  points integer not null,
  co2_kg numeric,
  item_reference text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. events
create table events (
  id integer primary key generated always as identity,
  event_type text not null,
  text text not null,
  icon_name text,
  color_class text,
  bg_class text,
  border_class text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security
alter table user_profiles enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table cart_items enable row level security;
alter table listings enable row level security;
alter table matches enable row level security;
alter table returns enable row level security;
alter table grading_results enable row level security;
alter table green_credits_log enable row level security;
alter table events enable row level security;

-- Policies (Simplified for hackathon)
create policy "Public products are viewable by everyone." on products for select using (true);
create policy "Public events are viewable by everyone." on events for select using (true);
create policy "Users can view own profile." on user_profiles for select using (auth.uid() = id);
create policy "Users can update own profile." on user_profiles for update using (auth.uid() = id);
create policy "Users can insert own profile." on user_profiles for insert with check (auth.uid() = id);

create policy "Users can view own orders." on orders for select using (auth.uid() = user_id);
create policy "Users can insert own orders." on orders for insert with check (auth.uid() = user_id);

create policy "Users can view own cart." on cart_items for select using (auth.uid() = user_id);
create policy "Users can manage own cart." on cart_items for all using (auth.uid() = user_id);

create policy "Listings are viewable by everyone." on listings for select using (true);
create policy "Users can manage own listings." on listings for all using (auth.uid() = seller_id);

create policy "Matches are viewable by everyone." on matches for select using (true);
create policy "Matches are insertable by everyone." on matches for insert with check (true);

create policy "Users can view own returns." on returns for select using (auth.uid() = user_id);
create policy "Users can insert own returns." on returns for insert with check (auth.uid() = user_id);

create policy "Grading results are viewable by everyone." on grading_results for select using (true);
create policy "Grading results are insertable by authenticated users." on grading_results for insert with check (auth.role() = 'authenticated');

create policy "Users can view own credit log." on green_credits_log for select using (auth.uid() = user_id);
create policy "Users can insert own credit log." on green_credits_log for insert with check (auth.uid() = user_id);

-- Enable Realtime for Events
alter publication supabase_realtime add table events;

-- 11. donations
create table donations (
  id integer primary key generated always as identity,
  donor_id uuid references auth.users(id),
  title text not null,
  description text,
  image_url text,
  location text not null,
  status text default 'available', -- 'available', 'claimed'
  delivery_method text, -- 'manual', 'amazon'
  transportation_fee numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table donations enable row level security;
create policy "Donations are viewable by everyone." on donations for select using (true);
create policy "Users can insert own donations." on donations for insert with check (auth.uid() = donor_id);
create policy "Users can update donations." on donations for update using (true);

alter publication supabase_realtime add table donations;

-- 12. exchanges
create table exchanges (
  id integer primary key generated always as identity,
  
  -- The item Party A is offering
  initiator_id uuid references auth.users(id),
  initiator_listing_id integer references listings(id),
  initiator_item_value numeric not null,
  
  -- The item Party B owns (the nationwide match)
  target_id uuid references auth.users(id),
  target_listing_id integer references listings(id),
  target_item_value numeric not null,
  
  -- Logistics tracking
  delivery_method text not null, -- 'manual' (same city) or 'amazon_handles'
  initiator_fee numeric not null, -- Cost Party A pays
  target_fee numeric not null,    -- Cost Party B pays
  
  -- Exchange lifecycle
  status text default 'pending', -- 'pending', 'accepted', 'rejected', 'completed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table exchanges enable row level security;
create policy "Users can view exchanges they are part of." on exchanges 
  for select using (auth.uid() = initiator_id or auth.uid() = target_id);
create policy "Users can initiate exchanges." on exchanges 
  for insert with check (auth.uid() = initiator_id);
create policy "Users can update exchanges." on exchanges 
  for update using (auth.uid() = initiator_id or auth.uid() = target_id);

alter publication supabase_realtime add table exchanges;
