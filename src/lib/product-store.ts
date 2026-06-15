// Product store using localStorage — persists across page reloads
// When a seller lists via the Seller Hub, the product is added here
// The Discover page reads from this store filtered by user's selected location

export interface ListedProduct {
  id: number;
  name: string;
  category: string;
  condition: string;
  price: number;
  originalPrice: number;
  location: string; // warehouse location where it's listed
  sellerLocation: string;
  imageUrl?: string;
  listedAt: string;
  listingType: "amazon" | "p2p" | "exchange" | "donate"; // how it was listed
  userId?: string; // who listed it
  exchangeValue?: number; // Amazon-calculated item value for exchange matching
}

const STORAGE_KEY = "amazon_relife_products";

let listeners: (() => void)[] = [];

function loadProducts(): ListedProduct[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveProducts(products: ListedProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function addListedProduct(product: ListedProduct) {
  const products = loadProducts();
  products.unshift(product);
  saveProducts(products);
  listeners.forEach(fn => fn());
}

export function getListedProducts(location?: string, listingType?: string): ListedProduct[] {
  const products = loadProducts();
  return products.filter(p => {
    if (location && p.location.toLowerCase() !== location.toLowerCase()) return false;
    if (listingType && p.listingType !== listingType) return false;
    return true;
  });
}

export function clearListedProducts() {
  localStorage.removeItem(STORAGE_KEY);
  listeners.forEach(fn => fn());
}

export function removeListedProduct(id: number) {
  const products = loadProducts();
  const filtered = products.filter(p => p.id !== id);
  saveProducts(filtered);
  listeners.forEach(fn => fn());
}

export function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}


// Purchase history — tracks what each user has bought
export interface PurchaseRecord {
  id: number;
  userId: string;
  productName: string;
  category: string;
  condition: string;
  price: number;
  imageUrl?: string;
  purchaseType: "amazon" | "p2p" | "exchange" | "donate";
  purchasedAt: string;
  sellerUserId?: string; // who sold it (for return notifications)
}

const PURCHASES_KEY = "amazon_relife_purchases";

function loadPurchases(): PurchaseRecord[] {
  try {
    return JSON.parse(localStorage.getItem(PURCHASES_KEY) || "[]");
  } catch { return []; }
}

function savePurchases(purchases: PurchaseRecord[]) {
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
}

export function addPurchase(purchase: PurchaseRecord) {
  const purchases = loadPurchases();
  purchases.unshift(purchase);
  savePurchases(purchases);
}

export function getPurchases(userId: string): PurchaseRecord[] {
  return loadPurchases().filter(p => p.userId === userId);
}
