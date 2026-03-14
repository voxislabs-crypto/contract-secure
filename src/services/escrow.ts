const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

export interface EscrowDeal {
  id: string;
  title: string;
  itemDescription: string | null;
  price: number | null;
  sellerName: string | null;
  sellerEmail: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  sellerStripeAccountId: string | null;
  stripeTransferId: string | null;
  paymentStatus: string;
  hasSellerStripeAccount?: boolean;
  sellerPayoutsEnabled?: boolean;
  sellerDetailsSubmitted?: boolean;
  trackingNumber: string | null;
  shortLink: string | null;
  deliveryDeadline: string | null;
  itemPhotoUrl: string | null;
  escrowFeePercent: number;
  createdAt: string;
  auditLogs: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  event: string;
  meta: string | null;
  createdAt: string;
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
    ...opts,
  });
  const body = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

export interface CreateDealInput {
  title: string;
  itemDescription?: string;
  price: number;
  sellerName?: string;
  sellerEmail: string;
  buyerName?: string;
  buyerEmail: string;
  deliveryDeadline?: string;
  itemPhotoUrl?: string;
}

export function createEscrowDeal(data: CreateDealInput) {
  return apiFetch<{ id: string; shortLink: string; shareUrl: string; paymentStatus: string }>(
    '/api/escrow',
    { method: 'POST', body: JSON.stringify(data) }
  );
}

export function getEscrowDeal(id: string) {
  return apiFetch<EscrowDeal>(`/api/escrow/${id}`);
}

export function createSellerConnectLink(id: string): Promise<{ onboardingUrl: string; sellerStripeAccountId: string }> {
  return apiFetch(`/api/escrow/${id}/seller/connect`, { method: 'POST' });
}

export function startPayment(id: string): Promise<{ checkoutUrl: string }> {
  return apiFetch(`/api/escrow/${id}/pay`, { method: 'POST' });
}

export function markShipped(id: string, trackingNumber: string) {
  return apiFetch<{ paymentStatus: string }>(`/api/escrow/${id}/ship`, {
    method: 'POST',
    body: JSON.stringify({ trackingNumber }),
  });
}

export function confirmReceipt(id: string) {
  return apiFetch<{ paymentStatus: string }>(`/api/escrow/${id}/release`, { method: 'POST' });
}

export function openDispute(id: string, reason: string) {
  return apiFetch<{ paymentStatus: string }>(`/api/escrow/${id}/dispute`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
