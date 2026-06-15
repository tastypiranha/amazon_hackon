// ============================================================================
// API Client — connects React frontend to FastAPI backend (main.py)
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Classify Image ──────────────────────────────────────────────────────────

export async function classifyImage(imageFile: File, category: string) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('category', category);

  const res = await fetch(`${API_URL}/api/classify`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// ─── Warehouse Decision ──────────────────────────────────────────────────────

export async function getDecision(sellerLoc: string, category: string, sellerPrice: number, condition: string) {
  const res = await fetch(`${API_URL}/api/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller_loc: sellerLoc,
      category,
      seller_price: sellerPrice,
      condition,
    }),
  });
  return res.json();
}

// ─── Checkout (Amazon-owned) ─────────────────────────────────────────────────

export async function checkoutAmazon(sellingPrice: number, category: string, condition: string, warehouseLoc: string) {
  const res = await fetch(`${API_URL}/api/checkout/amazon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selling_price: sellingPrice,
      product_category: category,
      condition,
      warehouse_loc: warehouseLoc,
    }),
  });
  return res.json();
}

// ─── Checkout (Seller-owned) ─────────────────────────────────────────────────

export async function checkoutSeller(sellerPrice: number, category: string, condition: string, sellerLoc: string) {
  const res = await fetch(`${API_URL}/api/checkout/seller`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller_price: sellerPrice,
      product_category: category,
      condition,
      seller_loc: sellerLoc,
    }),
  });
  return res.json();
}

// ─── Checkout (Donation) ─────────────────────────────────────────────────────

export async function checkoutDonation(donorLoc: string, receiverLoc: string) {
  const res = await fetch(`${API_URL}/api/checkout/donation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      donor_loc: donorLoc,
      receiver_loc: receiverLoc,
    }),
  });
  return res.json();
}

// ─── Checkout (Exchange) ─────────────────────────────────────────────────────

export async function checkoutExchange(partyALoc: string, partyBLoc: string) {
  const res = await fetch(`${API_URL}/api/checkout/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      party_a_loc: partyALoc,
      party_b_loc: partyBLoc,
    }),
  });
  return res.json();
}

// ─── Donate ──────────────────────────────────────────────────────────────────

export async function listDonation(donorLoc: string, category: string, description: string = '') {
  const res = await fetch(`${API_URL}/api/donate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      donor_loc: donorLoc,
      category,
      description,
    }),
  });
  return res.json();
}

// ─── Exchange Matches ────────────────────────────────────────────────────────

export async function findExchangeMatches(sellerLoc: string, category: string, condition: string, sellerPrice: number) {
  const res = await fetch(`${API_URL}/api/exchange/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seller_loc: sellerLoc,
      category,
      condition,
      seller_price: sellerPrice,
    }),
  });
  return res.json();
}

// ─── Compare Photos ──────────────────────────────────────────────────────────

export async function comparePhotos(image1: File, image2: File) {
  const formData = new FormData();
  formData.append('image1', image1);
  formData.append('image2', image2);

  const res = await fetch(`${API_URL}/api/compare`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// ─── Green Points ────────────────────────────────────────────────────────────

export async function calculateGreenPoints(category: string, isLocal: boolean, condition: string, logisticsFee: number = 0) {
  const res = await fetch(`${API_URL}/api/green-points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category,
      is_local: isLocal,
      condition,
      logistics_fee: logisticsFee,
    }),
  });
  return res.json();
}

// ─── Trust Score ─────────────────────────────────────────────────────────────

export async function getTrustScore(profile: {
  lifetime_green_points: number;
  total_listings: number;
  accurate_condition_listings: number;
  total_returns: number;
  damaged_returns: number;
  p2p_scheduled: number;
  p2p_completed: number;
}) {
  const res = await fetch(`${API_URL}/api/trust-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  return res.json();
}

// ─── Pricing Info ────────────────────────────────────────────────────────────

export async function getPrices(category: string, location: string, condition: string) {
  const res = await fetch(`${API_URL}/api/prices/${category}/${location}/${condition}`);
  return res.json();
}

// ─── Health Check ────────────────────────────────────────────────────────────

export async function healthCheck() {
  const res = await fetch(`${API_URL}/api/health`);
  return res.json();
}

// ─── Return Prediction ───────────────────────────────────────────────────────

export async function predictReturn(category: string, condition: string, price: number, location: string, ownership: string = "amazon") {
  const params = new URLSearchParams({
    category,
    condition,
    price: String(price),
    location,
    ownership,
  });
  const res = await fetch(`${API_URL}/api/return-predict?${params}`);
  return res.json();
}

// ─── Return Photo Verification ───────────────────────────────────────────────

export async function verifyReturnPhoto(originalImage: File, returnImage: File) {
  const formData = new FormData();
  formData.append('original_image', originalImage);
  formData.append('return_image', returnImage);

  const res = await fetch(`${API_URL}/api/return-verify`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}
