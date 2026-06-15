// Notification store using localStorage — persists across reloads
// Notifications are per-user

export interface Notification {
  id: number;
  userId: string; // who receives the notification
  type: "sold_amazon" | "sold_p2p" | "exchange_proposed" | "donation_claimed";
  title: string;
  message: string;
  productId?: number; // the other party's product (for exchange — clicking opens checkout)
  read: boolean;
  createdAt: string;
}

const STORAGE_KEY = "amazon_relife_notifications";

let listeners: (() => void)[] = [];

function loadNotifications(): Notification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveNotifications(notifs: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
}

export function addNotification(notif: Omit<Notification, "id" | "read" | "createdAt">) {
  const all = loadNotifications();
  all.unshift({
    ...notif,
    id: Date.now(),
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveNotifications(all);
  listeners.forEach(fn => fn());
}

export function getNotifications(userId: string): Notification[] {
  return loadNotifications().filter(n => n.userId === userId);
}

export function getUnreadCount(userId: string): number {
  return loadNotifications().filter(n => n.userId === userId && !n.read).length;
}

export function markAllRead(userId: string) {
  const all = loadNotifications();
  all.forEach(n => { if (n.userId === userId) n.read = true; });
  saveNotifications(all);
  listeners.forEach(fn => fn());
}

export function subscribeNotifications(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}
