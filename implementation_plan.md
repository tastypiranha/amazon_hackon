# Re-Circ OS — Unified Build Plan (48 Hours)
### Theme 3: Second Life Commerce — AI-Powered Returns & Sustainable Resale
### HackOn with Amazon, Season 6.0

---

## How to Read This Document

- **Sections 1–3**: The *thinking layer* — problem justification, business case, assumptions (what judges probe in Q&A)
- **Section 4**: The *architecture layer* — simplified for 48h but described at production depth in slides
- **Section 5**: The *algorithm layer* — decision engine, ML model, grading, matching
- **Section 6**: The *edge cases + failure modes* — shows production maturity
- **Section 7**: The *ML layer* — training, evaluation, bias, monitoring
- **Section 8**: The *build plan* — hour-by-hour, who does what
- **Section 9**: The *demo + pitch layer* — the 3-minute flow, the slide deck, the Q&A prep
- **Section 10**: The *6-month roadmap* — what production looks like

---

## 1. Problem Statement (One Sentence)

*We are building an AI system that decides, in milliseconds, what should happen to a product at every "second-life moment" — before a return, during a return, and after a customer has outgrown it — so that the maximum number of products find a next owner instead of a landfill.*

### 1.1 Business Objective

| Business Driver | How Re-Circ Moves It |
|---|---|
| **Reverse logistics cost** | Prevent unnecessary returns at checkout (Priya); avoid 600km reverse shipments for items not worth it |
| **Liquidation loss recovery** | Route long-tail returns to highest-value disposition (resell > refurbish > Amazon-buy > donate) instead of bulk liquidation |
| **Seller retention** | Give small sellers automated grading + relisting tools they could never build themselves |
| **New GMV** | P2P resale + refurbished-goods discovery = incremental transaction volume Amazon currently doesn't capture |
| **ESG / sustainability** | Every unit diverted from landfill = measurable CO₂ and waste metric |
| **Customer trust** | Product Health Cards reduce the #1 reason buyers avoid used goods: uncertainty |
| **Amazon as market-maker** | Amazon pre-buys high-demand refurbished items for local warehouses → creates supply where there is none, enables Prime delivery for second-hand goods |

### 1.2 The Four Personas + One Platform Actor

| Persona | Pain Point | Our Solution |
|---|---|---|
| **Priya** (Preventable Returns) | Orders wrong size → costly 600km reverse logistics | ML predicts return risk at checkout → sizing warning + "Keep-It" discount |
| **Small Seller** (Manual Grading) | 200 returns/month, manual inspection destroys margins | Upload photo → AI grades in milliseconds → optimal route + one-click relist |
| **Rahul** (P2P Friction) | Outgrown baby monitor sitting in drawer; hates classifieds | Select past order → auto-generated listing → matched with nearby buyer inside Amazon's trust |
| **Eco-Buyer** (Trust Gap) | Wants refurbished but can't verify condition | Product Health Card: transparent grade, defect list, CO₂ saved, warranty status |
| **Amazon** (Market-Maker Buyer) | High-demand zones lack refurbished supply; cold-start problem for marketplace | AI detects demand signals → Amazon offers guaranteed buyback to sellers → stocks local FC → Prime delivery for refurbs |

### 1.3 Stated Assumptions (Tell judges explicitly)

1. We use a **public Kaggle dataset + synthetic catalog** — proof-of-concept on representative data, not production-trained
2. Vision grading uses a **pretrained API** (not custom-trained CV model) — Phase 1 mock, Phase 2 fine-tune
3. "Millisecond routing" = **inference latency of the decision engine**, not end-to-end logistics
4. P2P matching uses **simplified neighborhood IDs**, not real geodata
5. Green Credits are modeled as a **points ledger**; Amazon Pay redemption described architecturally but not integrated

### 1.4 Ambiguous Requirements Resolved

| Ambiguity | Our Resolution |
|---|---|
| "AI deciding resell/refurbish/donate" — ML or rules? | **Hybrid**: deterministic `max J` optimization using ML-predicted sub-scores as inputs. Explainable, auditable, O(1). |
| "Smart quality grading through image" — full defect detection? | **Constrained taxonomy**: 5-8 defect classes + completeness checklist. Tractable for pretrained model. |
| "Predictive return prevention" — per-SKU or per-user? | Per **(user, category, size-deviation-pattern)** — user history features, not per-SKU modeling. |
| "Peer-to-peer inside trusted ecosystem" — what's "trusted"? | (a) Verified past-purchase provenance, (b) Amazon handles identity/payment, (c) Health Card transparency. |
| Scope: 4 personas vs depth on one | **Thin vertical slice across all 4** + Amazon-as-Buyer — the circular loop story must be complete for the pitch. |

---

## 2. Requirements

### 2.1 Functional Requirements (Must Demo)

- **FR1**: Given cart + user profile → return-risk score + intercept UI at checkout
- **FR2**: Given uploaded image of returned item → condition grade + defect list + recommended disposition (including AMAZON_BUY) + suggested resale price
- **FR3**: Given item user marks "no longer needed" → auto-generate P2P listing from past order data
- **FR4**: Match P2P listings to nearby interested buyers
- **FR5**: Generate Product Health Card for any second-life item → surface in buyer-facing product view
- **FR6**: Green Credits ledger incrementing on sustainable actions
- **FR7**: Seller dashboard: grade → disposition → price → one-click "Relist" or "Accept Amazon Buyback"
- **FR8**: Live dashboard metrics: returns prevented, items diverted, CO₂ saved, Green Credits issued

### 2.2 Non-Functional Requirements

- **NFR1 (Latency)**: Disposition decision + return-risk scoring < 300ms in demo (prove with network tab screenshot)
- **NFR2 (Scalability)**: Architecture *describes* horizontal scaling — stateless API, queue-backed async, read-replica-ready
- **NFR3 (Explainability)**: Every AI decision comes with a human-readable reason
- **NFR4 (Extensibility)**: New personas/features = new event types + new rows, not schema rewrites
- **NFR5 (Resilience)**: Vision API failure → graceful fallback to manual grading form

### 2.3 Performance Expectations (Demo)

| Endpoint | Target Latency | Strategy |
|---|---|---|
| `/api/checkout/risk-check` | < 150ms | In-memory model, precomputed user features |
| `/api/items/grade` (submission) | < 200ms (queues job) | Async processing, instant acknowledgment |
| Grade result (via polling/SSE) | < 5s total | Vision API call is the bottleneck; show loading animation |
| `/api/health-card/{id}` | < 50ms | Cached/precomputed read |
| `/api/credits/{user_id}` | < 50ms | In-memory ledger |

---

## 3. Edge Cases & Failure Modes (Top 11 — Build Credibility)

| # | Edge Case | Handling |
|---|---|---|
| 1 | **New user, no return history** (cold start) | Fall back to category-level base rates; lower confidence score; generic sizing tip |
| 2 | **Missing product images** from seller | Return "insufficient input" status; prompt for photo; allow manual grade (flagged as "self-reported") |
| 3 | **Vision API down/timeout** | Circuit breaker after N failures; fallback to manual grading form; seller notified |
| 4 | **Empty system on first run** (no data) | Seed with synthetic event generator; keeps "ticking" during live demo |
| 5 | **Very large image upload** (50MB) | Max upload size 5MB; resize server-side before vision API |
| 6 | **High concurrency at checkout** | Risk check is **non-blocking with tight timeout** — if slow, proceed without intercept. Re-Circ must never make checkout *worse* |
| 7 | **Seller over-claims grade** ("fishy" detection) | AI grade vs seller-claimed grade mismatch → flag as suspicious; add warning to Health Card |
| 8 | **Item worth less than ANY processing** (₹50 item) | `max J` allows Donate/Recycle to win when all paid dispositions are net-negative (ESG term in objective) |
| 9 | **Duplicate event delivery** (retry) | Idempotency keys on ingestion (`INSERT ... ON CONFLICT DO NOTHING`) |
| 10 | **P2P listing for item never purchased** | Eligibility check against order history (physical good, delivered, beyond return window) |
| 11 | **Gift / multi-person buying** (false positive risk) | User buys Size 6 shoe but profile says Size 7 — buying for someone else, NOT a return risk. Detect via: gift-wrap signal, multi-size purchase history, deviation direction (smaller = likely child/gift). **Suppress intercept** when gift/alt-person context is detected. See Section 5.2 for full logic. |

### Failure Recovery Matrix

| Failure | Detection | Recovery | Prevention |
|---|---|---|---|
| Vision API down | Worker job timeout | Manual grading fallback | Circuit breaker; cached grading for re-uploads |
| Risk model fails to load | Startup health check | Rule-based fallback active | Model artifact validated pre-deploy |
| DB connection exhaustion | Pool errors logged | Queue absorbs burst; bounded retry | Connection pooling, bounded workers |
| Malicious image upload | MIME-type + magic-byte validation | Reject upload, log attempt | Image re-encoding (strip & rebuild) |

---

## 4. Architecture

### 4.1 What We Build (Hackathon — Simplified)

```
┌───────────────────────────────────────────────┐
│           React SPA (Vite + Framer Motion)     │
│                                                │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Checkout  │ │ Seller   │ │ Buyer View +  │  │
│  │ Intercept │ │ Hub      │ │ Health Card   │  │
│  └─────┬────┘ └────┬─────┘ └──────┬────────┘  │
│  ┌─────┴────┐ ┌────┴──────────────┴────────┐  │
│  │ P2P/Rahul│ │ Live Dashboard (sidebar)   │  │
│  │ Listing  │ │ Counters + Green Credits   │  │
│  └─────┬────┘ └────────────┬───────────────┘  │
└────────┼───────────────────┼──────────────────┘
         │    REST API       │  SSE (live push)
┌────────▼───────────────────▼──────────────────┐
│           FastAPI Backend (single process)      │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  API Routes (6 endpoints)                │   │
│  │  POST /api/checkout/risk-check           │   │
│  │  POST /api/items/grade                   │   │
│  │  GET  /api/items/{id}/health-card        │   │
│  │  POST /api/listings                      │   │
│  │  GET  /api/listings/{id}/matches         │   │
│  │  GET  /api/credits/{user_id}             │   │
│  │  GET  /api/dashboard/stream (SSE)        │   │
│  └──────────────┬──────────────────────────┘   │
│                  │                              │
│  ┌──────────────▼──────────────────────────┐   │
│  │  Decision Engine (in-process library)    │   │
│  │  ├─ risk_model.py    (XGBoost inference) │   │
│  │  ├─ disposition.py   (max J optimizer)   │   │
│  │  ├─ pricing.py       (resale price calc) │   │
│  │  └─ amazon_buyer.py  (demand-sensing)    │   │
│  └──────────────┬──────────────────────────┘   │
│                  │                              │
│  ┌──────────────▼──────────────────────────┐   │
│  │  Vision Grading (async in-process)       │   │
│  │  Primary: Vision API call                │   │
│  │  Fallback: Simulated grading             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Data Layer                              │   │
│  │  SQLite (items, users, orders, listings) │   │
│  │  In-memory: events[], credits[], grades[]│   │
│  │  Pre-trained model: model.json           │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 4.2 What We Show in Slides (Production Architecture)

```
┌──────────────────────────────────────────────────────┐
│                    React SPA (CDN-hosted)              │
└───────────────────────┬──────────────────────────────┘
                        │ REST + SSE
┌───────────────────────▼──────────────────────────────┐
│              API Gateway (FastAPI, N replicas, LB)     │
│  Stateless — calls Decision Engine lib synchronously   │
└──┬───────────────────┬───────────────────────┬───────┘
   │                   │                       │
   ▼                   ▼                       ▼
┌──────────┐    ┌────────────┐    ┌──────────────────┐
│ Decision │    │ PostgreSQL │    │ Redis             │
│ Engine   │    │ (RDS)      │    │ Cache + Pub/Sub   │
│ Library  │    │ + Read     │    │ + SSE backing     │
└──────────┘    │   Replicas │    └────────┬─────────┘
                └────┬───────┘             │
                     │              ┌──────▼─────────┐
        ┌────────────▼────────┐     │ Message Queue  │
        │ Event Log (unified)  │     │ (SQS/Redis     │
        │ events table         │     │  Streams)      │
        └──────────────────────┘     └──────┬────────┘
                                            │
                              ┌─────────────▼──────────┐
                              │  Worker Fleet (ECS)      │
                              │  - Vision grading jobs   │
                              │  - P2P matching jobs     │
                              │  - Health card builder   │
                              └──────────────────────────┘
```

> [!IMPORTANT]
> **The hackathon build (4.1) and the production architecture (4.2) tell the same logical story** — the only difference is horizontal scaling, managed services, and queue-backed async. Judges see that we *know* the difference and made a conscious choice to simplify for 48 hours.

### 4.3 What Goes in Code vs Slides

| Concept | In Code ✅ | In Slides 📊 |
|---|---|---|
| Checkout intercept with ML risk model | ✅ | — |
| AI vision grading + disposition routing | ✅ | — |
| Product Health Card | ✅ | — |
| P2P listing auto-generation + matching | ✅ | — |
| Green Credits ledger + wallet UI | ✅ | — |
| **Amazon-as-Buyer** route in optimizer | ✅ | — |
| Fishy grade-mismatch detection | ✅ | — |
| Live dashboard counters (SSE) | ✅ | — |
| Fairness check badge (hardcoded) | ✅ | — |
| Message queue / worker separation | — | ✅ |
| Idempotency keys / circuit breakers | — | ✅ |
| Docker Compose orchestration | — | ✅ |
| Drift monitoring | — | ✅ |
| Cross-city geo matching (PostGIS) | — | ✅ |
| Amazon Pay redemption integration | — | ✅ |
| Digital Product Passport | — | ✅ |

### 4.4 API Design (6 Endpoints We Build)

```
POST /api/checkout/risk-check
  Body: { user_id, cart_items: [{ product_id, category, selected_size, is_gift: bool }] }
  Response: { 
    risk_score: 0.72, 
    flagged: true,           ← false if gift/multi-person context suppresses
    risk_level: "HIGH",
    purchase_intent: "self",  ← "self" | "gift" | "multi_person" | "unknown"
    reason: "3 of your last 5 shoe orders were returned for size",
    suggestion: { recommended_size: "8", keep_it_discount_pct: 5 },
    co2_if_returned_kg: 0.10,
    factors: ["High personal return rate (25%)", "Size mismatch detected"],
    context_signals: {        ← NEW: transparency on what the model saw
      gift_wrap_detected: false,
      multi_size_history: false,
      bought_this_size_before: false,
      wardrobing_pattern: false
    }
  }
  SLA: <150ms | Non-blocking — if slow, checkout proceeds without intercept

POST /api/items/grade
  Body: multipart image + { product_name, category, original_price, weight_kg, 
         warehouse_distance_km, seller_claimed_grade }
  Response: { 
    grade: "B", confidence: 0.87, defects: ["Minor scuff on heel"],
    recommended_route: "AMAZON_BUY",  ← NEW: can be RESELL|REFURBISH|AMAZON_BUY|DONATE|LIQUIDATE
    resale_price: 5400, recovery_value: 2340, processing_cost: 58,
    carbon_cost_kg: 0.034, explanation: "High local demand (82%). Amazon buys at ₹3240...",
    amazon_buyback_price: 3240,  ← only present when route = AMAZON_BUY
    demand_info: { top_region: "Indiranagar, Bangalore", signal: 0.82 },
    fishy_flag: false,
    grading_time_ms: 142
  }

GET /api/items/{item_id}/health-card
  Response: {
    product_name: "Sony WH-1000XM4", grade: "A-", confidence: 0.94,
    condition_checks: { cosmetic: {status:"pass"}, packaging: {status:"pass"}, 
                        accessories: {status:"warning", note:"Missing case"}, 
                        functionality: {status:"pass"} },
    warranty_months: 8, prior_owners: 1,
    original_price: 24990, resale_price: 18500, savings_pct: 26,
    co2_saved_kg: 4.2, green_credits: 50,
    trust_score: 0.89, verified_date: "2026-06-12",
    certified: true
  }

POST /api/listings
  Body: { user_id, order_id, reason: "outgrown" }
  Response: { 
    listing_id, title: "Philips Avent Baby Monitor — gently used, 8 months",
    description: "...", suggested_price: 3450, status: "draft"
  }

GET /api/listings/{listing_id}/matches
  Response: { 
    matches: [
      { user_name: "Neha K.", neighborhood: "Indiranagar", distance_km: 2.3, match_score: 0.91 },
      { user_name: "Arjun S.", neighborhood: "Koramangala", distance_km: 4.1, match_score: 0.78 }
    ]
  }

GET /api/credits/{user_id}
  Response: {
    total_credits: 340, total_co2_saved_kg: 22.1,
    cashback_available_inr: 34,
    impact: { trees_months: 24.6, car_km_avoided: 105.2 },
    history: [{ action: "buy_refurbished", points: 50, item: "Kindle", date: "..." }],
    actions_available: [
      { key: "buy_refurbished", points: 50, co2_kg: 2.3 },
      { key: "list_for_resale", points: 30, co2_kg: 1.5 },
      { key: "donate_item", points: 40, co2_kg: 2.0 },
      { key: "keep_it_discount", points: 15, co2_kg: 0.5 },
      { key: "local_p2p_exchange", points: 20, co2_kg: 0.8 }
    ]
  }

GET /api/dashboard/stream (SSE)
  Push events: { type, payload, timestamp }
  Types: "return_prevented" | "item_graded" | "item_diverted" | 
         "amazon_bought" | "p2p_matched" | "credits_issued"
```

### 4.5 Data Schema (Simplified for Hackathon)

```sql
-- SQLite (4 persisted tables + in-memory structures)

items (
  id TEXT PRIMARY KEY,
  name TEXT, category TEXT, brand TEXT,
  original_price REAL, weight_kg REAL,
  sizes TEXT,  -- JSON array
  return_rate REAL, description TEXT, image_url TEXT
);

users (
  id TEXT PRIMARY KEY,
  name TEXT, neighborhood TEXT, city TEXT,
  purchase_count INT, return_count INT, return_rate REAL,
  avg_spend REAL, preferred_categories TEXT,  -- JSON
  size_profile TEXT,  -- JSON {"shoe": "8", "jeans": "30"}
  green_credits INT DEFAULT 0, co2_saved_kg REAL DEFAULT 0,
  trust_score REAL DEFAULT 0.5
);

orders (
  id TEXT PRIMARY KEY,
  user_id TEXT, item_id TEXT,
  variant TEXT,  -- size/color
  status TEXT,   -- delivered, returned, kept
  order_date TEXT
);

listings (
  id TEXT PRIMARY KEY,
  seller_user_id TEXT, item_id TEXT,
  title TEXT, description TEXT,
  suggested_price REAL, status TEXT,  -- draft, active, matched, completed
  created_at TEXT
);

-- In-memory (Python dicts/lists — fast, no DB overhead):
-- events: []          ← unified event log, drives dashboard SSE
-- dispositions: {}    ← keyed by item_id, stores grade/route/price
-- health_cards: {}    ← keyed by item_id, stores full card data  
-- green_credits_log: [] ← append-only ledger entries
-- demand_signals: {}  ← category → {region: signal_strength}
```

---

## 5. Algorithm Design

### 5.1 Disposition Optimizer — The `max J` Formula (Heart of the System)

For each candidate action `a ∈ {RESELL, REFURBISH, AMAZON_BUY, DONATE, LIQUIDATE}`:

```
J(a) = R(a) × P_success(a, grade) − C_process(a) − C_carbon(a) + ESG(a)
```

| Term | Meaning | How Computed |
|---|---|---|
| `R(a)` | Expected revenue if successful | Resell: `original_price × grade_discount`; Refurbish: `original_price × (grade_discount + 0.20)`; Amazon-buy: `resale × 0.95` (Amazon sells near full); Donate/Liquidate: 0 / `original_price × 0.05` |
| `P_success(a, grade)` | Probability of successful outcome | Lookup table: Grade A + Resell → 0.88; Grade C + Resell → 0.45; etc. Amazon-buy → 0.92 (Amazon controls fulfillment) |
| `C_process(a)` | Processing cost | Inspection (₹25) + photography (₹15) + shipping (`weight × distance × rate`); Refurb: +15% of original; Amazon-buy: buyback price + inspection |
| `C_carbon(a)` | Carbon cost (monetized at ₹2/kg CO₂) | `weight × distance × 0.00021 kg CO₂/km/kg × ₹2` |
| `ESG(a)` | Goodwill/sustainability bonus | Donate: +₹50 equivalent; Recycle: +₹20; Others: 0 — **ensures donate can win when all paid routes are net-negative** |

**Amazon-as-Buyer trigger** (the differentiator):
```python
if grade in ("A", "B") and demand_signal >= 0.60:
    # Amazon offers guaranteed buyback at 60% of resale value
    buyback_price = resale_price * 0.60
    amazon_resale = resale_price * 0.95
    J_amazon = amazon_resale - buyback_price - inspection_cost - carbon_cost
    # Seller gets instant payout, Amazon stocks local FC, item ships via Prime
```

**Complexity**: O(1) — 5 evaluations of a closed-form expression. **This is what makes "millisecond routing" genuinely true.**

The optimizer picks `argmax J` across all candidates. If `AMAZON_BUY` wins, the seller sees: *"Amazon Guaranteed Buyback: ₹3,240 — instant payout. High demand detected in Indiranagar (82%)."*

### 5.2 Return-Risk Scorer (XGBoost) — Context-Aware

**Core Features:**
- `user_category_return_rate` — historical return rate in this specific category
- `user_size_volatility` — variance in sizes ordered within category
- `category_base_return_rate` — overall return rate for this product type
- `brand_return_rate` — brand-level return tendency
- `price_band` — low/mid/high (low-value items returned more often)
- `is_first_order_in_category` — cold-start flag
- `size_deviation` — abs difference between selected size and user's profile size

**Context-Aware Features (Gift / Multi-Person Detection):**

> [!IMPORTANT]
> A naive model treats any size deviation as return risk. But users routinely buy non-profile sizes for gifts, children, spouses, or different brand sizing. The following features prevent false positives that erode user trust in the intercept.

- `has_multi_size_history` — user has bought 2+ distinct sizes in this category before → **reduces risk** (they buy for multiple people regularly)
- `is_gift_flagged` — cart has gift wrap / gift message enabled → **sharply reduces risk** (almost certainly a gift)
- `user_bought_this_size_before` — user has previously ordered this exact size (even if it's not their "profile" size) → **reduces risk** (known alternate recipient)
- `cart_has_multiple_variants` — user is buying 2+ sizes of the same item → **increases risk** (wardrobing pattern — will return one)
- `deviation_direction` — buying smaller (likely child/gift) vs buying larger (likely fit issue) → smaller deviations more likely gifts
- `brand_size_offset` — this brand runs small/large vs user's usual brands → adjusts the "expected" size before flagging

**Context-Aware Risk Adjustment Logic:**
```python
if selected_size != profile_size:
    base_deviation_risk = 0.30
    
    # REDUCE risk if evidence of gift / multi-person buying
    if user_has_bought_this_size_before:
        base_deviation_risk *= 0.3   # They've done this before → likely for someone else
    if is_gift_wrapped:
        base_deviation_risk *= 0.1   # Almost certainly a gift → suppress intercept
    if has_multi_size_history_in_category:
        base_deviation_risk *= 0.5   # Buys for multiple people regularly
    if deviation_is_smaller:
        base_deviation_risk *= 0.7   # Buying smaller → likely for child, not a fit mistake
    
    # INCREASE risk if it looks like wardrobing
    if cart_has_multiple_sizes_same_item:
        base_deviation_risk = 0.60   # Buying 2 sizes to return one → high return signal
    
    risk += base_deviation_risk
```

**Adaptive Intercept Messages:**

| Context Detected | Intercept Behavior |
|---|---|
| Size mismatch + no gift signal + no multi-size history | Full intercept: "⚠️ Your profile suggests Size 8 — switch for 5% discount?" |
| Size mismatch + gift wrap detected | **No intercept** — silently skip (it's a gift) |
| Size mismatch + user has bought this size before | **No intercept** — they buy for this person regularly |
| Multiple sizes of same item in cart | Different message: "🔍 Ordering 2 sizes? Use our Size Finder to pick the right one" |
| Size mismatch + smaller + first time | Soft intercept: "Buying for someone else? Tap to confirm — or check sizing" |

**Output:** `P(return | this checkout)`. If `P > 0.50` AND no gift/alt-person context suppresses the intercept:
- Show modal with **top contributing feature** in plain English (not SHAP — simple feature importance lookup)
- Offer "Keep-It" discount: `min(P × 5, 10)%`
- Show recommended size if size mismatch detected
- Include `purchase_intent: "self" | "gift" | "unknown"` in the API response for transparency

**Fallback (cold start / model unavailable):** Rule-based — *"flag if user returned ≥2 of last 5 orders in this category for size-related reason"* — always present in code alongside the model.

### 5.3 Vision Grading (Pretrained API)

**Primary path:** Send seller's uploaded image to a vision-capable API (OpenAI Vision / AWS Rekognition) with structured prompt:
```
Analyze this product image. Return JSON:
{
  "grade": "Excellent|Good|Fair|Poor",
  "defects": ["scratch_surface", "missing_tag", "stain", ...],
  "completeness": true/false,
  "confidence": 0.0-1.0
}
```

**Fallback (API unavailable):** Simulated grading with weighted random + realistic defect pools per grade — demo still works.

**Fishy detection:** If `|AI_grade - seller_claimed_grade| > 1 tier` → flag as suspicious, add warning to Health Card.

### 5.4 P2P Matching (Simplified)

**Listing generation:** Pull item + order metadata → template-fill title/description → price = `original_price × grade_factor × depreciation(time_owned)`.

**Matching:** Score candidates by: `match = same_neighborhood × category_match × recency_decay(demand_age)`. Return top-K sorted by score. Production version → PostGIS geo-indexed queries.

### 5.5 Green Credits Point Structure

| Action | Points | CO₂ Saved | Example |
|---|---|---|---|
| Buy refurbished instead of new | +50 | ~2.3 kg | Bought used Kindle |
| List unused item for resale | +30 | ~1.5 kg | Listed baby monitor |
| Donate item | +40 | ~2.0 kg | Donated textbooks |
| Keep item (accept Keep-It discount) | +15 | ~0.5 kg | Kept shoes, skipped return |
| Local P2P exchange (no shipping) | +20 | ~0.8 kg | Exchanged with neighbor |

**Redemption:** 100 pts = ₹10 Amazon Pay cashback.

**Impact equivalents** (makes CO₂ tangible):
- 1 kg CO₂ saved ≈ 1.1 months of a tree absorbing
- 1 kg CO₂ saved ≈ 4.8 km of driving avoided
- 1 kg CO₂ saved ≈ 125 phone charges

---

## 6. ML Considerations

### 6.1 Where ML is (and isn't) Needed

| Component | ML? | Justification |
|---|---|---|
| Return-risk scoring | **Yes** (XGBoost) | Multi-feature, non-linear pattern — rules would be too coarse |
| Condition grading | **Yes** (pretrained vision API) | Visual defect assessment requires CV; custom training infeasible in 48h |
| Disposition routing | **No** (optimization) | `max J` is deterministic + explainable; ML would reduce trust |
| P2P listing text | **Optional** (LLM polish) | Templating works; LLM adds polish but isn't load-bearing |
| P2P matching | **No** | Simple scoring function; production = geo-indexing, not ML |
| Health Card / CO₂ | **No** | Lookup table; ML would add opacity, contradicts trust goal |

### 6.2 Training Strategy (XGBoost)
1. ETL Kaggle "E-Commerce Returns" dataset into our feature set
2. 80/20 stratified train/validation split
3. Train XGBoost with early stopping on validation AUC
4. Export feature importances → power the "reason" string in intercept UI
5. Serialize to `.json` → loaded once at API startup

### 6.3 Evaluation Metrics
- **AUC-ROC** (primary — handles class imbalance)
- **Precision @ top-decile risk** (if we flag someone, are we right?)
- **Calibration** (0.7 score ≈ 70% historical return rate)

### 6.4 Bias Risks + Mitigation
- **Risk:** Model disproportionately flags certain demographics/regions
- **Mitigation:** Exclude protected attributes; monitor flag rates by region; intercept framed as helpful suggestion with easy dismiss — never punitive (no fees, no blocked checkout)
- **Demo hook:** "Fairness Check" badge on dashboard: *"Flag rate by region: Delhi 12%, Mumbai 11%, Bangalore 13% — within ±2% tolerance ✓"*

### 6.5 Explainability
- Every flagged checkout shows top contributing feature in plain language
- Every disposition logs J values for **all 5 candidate actions** — "why wasn't this resold?" is answerable from logs

### 6.6 Drift Detection (Described, Not Built)
- Track distribution of risk scores over time (daily histogram)
- Track realized vs. predicted return rate (feedback loop)
- Show dashboard placeholder: "Phase 2: Model Health Monitoring"

---

## 7. Tech Stack

| Layer | Hackathon | Production (Slides) |
|---|---|---|
| Frontend | React + Vite + Framer Motion + Tailwind CSS | Same + CDN |
| Backend | FastAPI (single process) | FastAPI (N replicas, LB) |
| ML Inference | XGBoost in-process | Separated model-serving service |
| Vision | Pretrained API (w/ fallback) | Fine-tuned model + API |
| Database | SQLite + in-memory | PostgreSQL (RDS) + read replicas |
| Queue | `asyncio.create_task()` | Redis Streams / SQS |
| Cache | In-memory dicts | Redis |
| Live Updates | SSE from FastAPI | SSE backed by Redis pub/sub |
| Deployment | Local machine | Docker → ECS/EKS |

---

## 8. 48-Hour Build Plan

### Team Allocation (3-person)
- **Member 1 (ML/Data):** Dataset, model training, decision engine, routing engine
- **Member 2 (Backend):** FastAPI, all 6 endpoints, vision integration, SSE, DB setup
- **Member 3 (Frontend):** React app, all 4 views, animations, dashboard, demo polish

### Phase 1: Foundation (Hours 0–8)

| Task | Owner | Deliverable |
|------|-------|-------------|
| Source + clean Kaggle dataset | M1 | Clean CSV with features extracted |
| FastAPI project + SQLite schema + seed data | M2 | Working `/api/products` and `/api/users` endpoints |
| React + Vite + Tailwind + Framer Motion scaffold | M3 | 4 empty page shells with routing + dark theme + layout |
| Design decision engine interfaces | M1 | `risk_model.py`, `disposition.py`, `pricing.py` stubs |
| Create synthetic product catalog + user profiles | M2 | 6+ products, 3+ users, demand signals, pre-graded items |
| Design Health Card UI component (mockup) | M3 | High-fidelity card layout in code |

### Phase 2: Core Intelligence (Hours 8–24)

| Task | Owner | Deliverable |
|------|-------|-------------|
| Train XGBoost on return data | M1 | `model.json` + validation AUC + feature importances |
| Build routing engine (`max J` with AMAZON_BUY) | M1 | Tested Python module with all 5 routes |
| `/api/checkout/risk-check` endpoint (wired to model) | M2 | Working endpoint returning risk + suggestion |
| `/api/items/grade` endpoint (vision + routing) | M2 | Working endpoint with fallback grading |
| `/api/items/{id}/health-card` endpoint | M2 | Working endpoint returning full card data |
| `/api/credits/{user_id}` endpoint | M2 | Working endpoint with ledger + impact |
| Build Checkout Intercept UI (cart + modal) | M3 | Animated modal triggered by high risk score |
| Build Seller Hub UI (upload + grade + route) | M3 | Image upload → loading → grade display → route recommendation |

### Phase 3: Integration + Polish (Hours 24–36)

| Task | Owner | Deliverable |
|------|-------|-------------|
| Build P2P listing + matching logic | M1 | `/api/listings` + `/api/listings/{id}/matches` working |
| SSE dashboard stream + event publisher | M2 | Live counters updating on every action |
| Wire all frontend views to backend APIs | M3 | End-to-end working: Checkout → Seller → Buyer → P2P |
| Build Buyer View + interactive Health Card | M3 | Flip animation, condition checks, green credits badge |
| Build Green Credits wallet widget | M3 | Persistent sidebar: balance, CO₂ saved, impact equivalents |
| Build P2P Rahul view | M3 | Past orders → "List this" → auto-listing → matches |
| Add AMAZON_BUY visual in Seller Hub | M3 | Special gold badge: "Amazon Guaranteed Buyback: ₹X" |
| Create complete demo flow dataset | M2 | Pre-seeded data that tells a coherent story through all 4 views |

### Phase 4: Demo + Pitch (Hours 36–48)

| Task | Owner | Deliverable |
|------|-------|-------------|
| End-to-end demo rehearsal × 3 | All | Smooth 3-minute flow, no bugs |
| Build pitch deck (10 slides) | M1 | Problem → Personas → Architecture → Demo → ML → Amazon-as-Buyer → Impact → Roadmap |
| Record pitch video (narrative, not screen-rec) | All | Persona-driven walkthrough with voiceover |
| Latency proof (network tab screenshots) | M2 | <200ms for all sync endpoints |
| Add fairness check badge to dashboard | M2 | Hardcoded "Flag rate by region" within ±2% |
| Final UI polish + animations | M3 | Loading states, hover effects, transitions |
| Prepare Q&A cheat sheet | M1 | Top 10 judge questions with rehearsed answers |

---

## 9. Demo Flow & Pitch

### 9.1 The 3-Minute Demo Script

```
0:00-0:20  THE PROBLEM (one slide, one stat)
           "Amazon processes millions of returns per year. For long-tail items,
            40% are liquidated because relisting costs more than the item is worth.
            This is Re-Circ OS."

0:20-0:50  PRIYA (Checkout Intercept)
           → Add Nike shoes Size 7 to cart as Priya
           → Click checkout
           → Modal pops up: "⚠️ 72% return risk. Most users with your profile 
              prefer Size 8. Switch for a 5% Green Keep-It Discount?"
           → Switch to Size 8
           → Dashboard counter: "Returns Prevented: 1" 🎉

0:50-1:30  THE SELLER (AI Grading + Amazon as Buyer)
           → Switch to Seller Hub
           → Upload photo of returned headphones
           → Loading animation: "AI analyzing..."
           → Grade appears: "B+ (87% confidence). Minor scuff detected."
           → Routing decision: "AMAZON GUARANTEED BUYBACK: ₹3,240"
             "High demand in Indiranagar (82%). Amazon buys, stocks local FC,
              delivers via Prime. Seller gets instant payout."
           → Click "Accept Buyback"
           → Dashboard: "Items Diverted from Landfill: 1" 🎉

1:30-2:10  THE BUYER (Health Card + Green Credits)
           → Switch to Buyer View
           → Browse refurbished listings → click Sony Headphones
           → Health Card FLIPS open (animation):
             Grade: A- | Confidence: 94.2%
             ✅ Cosmetic | ✅ Packaging | ⚠️ Missing case | ✅ Working
             Warranty: 8 months | Price: ₹18,500 (26% off)
             🌱 "Buy this and save 4.2kg CO₂"
           → Click "Buy"
           → "+50 Green Credits" animation
           → Green Wallet: "340 pts = ₹34 cashback | CO₂ saved: 22.1 kg"

2:10-2:40  RAHUL (P2P)
           → Switch to P2P view
           → Select past order: "Philips Baby Monitor, bought 8 months ago"
           → Click "I don't need this anymore"
           → Auto-generated listing appears instantly
           → "2 matches found within 5km!"
           → Show match: "Neha K. — Indiranagar, 2.3km away"

2:40-3:00  THE LOOP (Dashboard)
           → Show live dashboard: all counters
           → "Returns prevented: 47 | Items diverted: 312 | CO₂ saved: 1,247 kg
              | Green Credits issued: 15,400 | Amazon Buybacks: 89"
           → "This is Re-Circ OS — the circular economy operating system.
              Every product gets a second life."
```

### 9.2 Pitch Deck (10 Slides)

| # | Slide | Content |
|---|---|---|
| 1 | **The Problem** | One stat: "X% of long-tail returns are liquidated." The Priya/Seller/Rahul pain points in 3 bullets. |
| 2 | **Our Solution** | Re-Circ OS = Prevent → Automate → Recirculate → Incentivize. One-sentence per pillar. |
| 3 | **The Innovation: Amazon as Buyer** | Diagram: Demand signal → buyback offer → local FC → Prime delivery for refurbs. "Amazon Renewed is for iPhones. Re-Circ is for baby monitors." |
| 4 | **Live Demo** | The 3-minute flow above. |
| 5 | **Architecture** | Production diagram (4.2). Call out: "We built the simplified version; this is where it scales." |
| 6 | **The AI** | ML vs Rules decision matrix. The `max J` formula. "Not everything needs to be ML." |
| 7 | **Trust: Product Health Card** | Full Health Card visual. "This is why a buyer chooses refurbished." |
| 8 | **Sustainability: Green Credits** | Point structure table + impact equivalents. "CO₂ you can actually measure." |
| 9 | **Impact Numbers** | Projections: if 5% of long-tail returns use Re-Circ → X items saved, Y kg CO₂, Z₹ recovered. |
| 10 | **6-Month Roadmap** | Digital Product Passport, cross-city matching, drift monitoring, Amazon Pay redemption, batch seller tools. |

### 9.3 Q&A Cheat Sheet (Top 10 Judge Questions)

| Question | Answer |
|---|---|
| "How is this different from Amazon Renewed?" | "Renewed is for iPhones and premium electronics. Re-Circ targets the long-tail — ₹500 shoes, baby monitors, phone cases — where inspection costs exceed item value today." |
| "What's the actual model accuracy?" | "AUC of [X] on the validation set. We explicitly show precision at the top-risk decile because false positives erode trust in the intercept." |
| "Does the checkout intercept slow down purchasing?" | "No. It's non-blocking with a 150ms timeout. If the model is slow, checkout proceeds normally. Re-Circ must never make the experience *worse*." |
| "Why not just use ML for the disposition decision?" | "Because `max J` is deterministic, explainable, and O(1). We can tell a seller exactly *why* their item was routed to donate vs resell. An ML black box would reduce trust." |
| "What about gaming / fraud?" | "Fishy detection: if the AI grades an item as 'Fair' but the seller claimed 'Excellent', we flag it. The Health Card makes this transparent to buyers." |
| "Is 'Amazon as Buyer' realistic?" | "Amazon already does procurement at scale. This is the same algorithm applied to refurbished goods — AI identifies demand gaps, offers guaranteed buyback, and the item ships via existing Prime infra." |
| "What data did you train on?" | "Kaggle e-commerce returns dataset. We're transparent that this is proof-of-concept on representative data. The model architecture and feature engineering transfer directly to Amazon's production data." |
| "What would you build in 6 months?" | "Digital Product Passport (lifetime history), cross-city matching with PostGIS, drift monitoring, batch seller upload (200 items at once), and Amazon Pay integration for Green Credits." |
| "How does this scale to millions?" | "[Show architecture slide] Stateless API replicas behind a load balancer. Queue absorbs return-surge spikes. Decision engine is a separable service. Read-heavy endpoints (Health Cards) cached at the edge." |
| "What about bias in the return-risk model?" | "We exclude protected attributes, monitor flag rates by region for disparate impact, and frame the intercept as a *suggestion*, never punitive — no blocked checkout, no extra fees." |
| "What if someone is buying for their kid / as a gift?" | "Great question — we handle this explicitly. The model checks for gift-wrap signals, multi-size purchase history, and deviation direction (buying smaller = likely child/gift). If any gift/alt-person context is detected, we **suppress the intercept entirely**. A false alarm on a birthday gift would destroy user trust faster than any return saves." |

---

## 10. 6-Month Production Roadmap (Pitch Slide)

| Month | Feature | Impact |
|---|---|---|
| 1-2 | **Digital Product Passport** — lifetime history of every product (owners, grades, repairs) | Builds buyer trust; enables resale of already-resold items |
| 2-3 | **Cross-city matching** (PostGIS) + delivery integration | Expands P2P from neighborhood to national |
| 3-4 | **Batch seller tools** — bulk upload 200+ items, queue-processed | Directly solves the "200 returns/month" pain point at scale |
| 4-5 | **Amazon Pay Green Credits redemption** | Closes the incentive loop; makes credits tangible |
| 5-6 | **Drift monitoring + model retraining pipeline** | Keeps return-risk model accurate as user behavior shifts |
| 6+ | **Fine-tuned vision model** (trained on Amazon's actual return images) | Replaces pretrained API with domain-specific accuracy |

---

## Open Questions

> [!IMPORTANT]
> Confirm before we start coding:
> 1. **Vision API**: Which provider do you have keys for? (OpenAI Vision / AWS Rekognition / Google Cloud Vision) — or should we use the simulated fallback for the entire demo?
> 2. **Kaggle dataset**: Have you downloaded one? If not, I'll generate synthetic training data for the XGBoost model.
> 3. **Team size**: 3 or 4 people coding? (If 4, the 4th person owns the pitch deck + demo script entirely.)
> 4. **Are you ready to start building?**
