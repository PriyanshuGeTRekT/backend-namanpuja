/**
 * Atomic CRM integration.
 *
 * Atomic CRM (https://github.com/marmelab/atomic-crm) is a React-admin +
 * Supabase application. Its data lives in the same Supabase Postgres
 * instance we use, in tables such as `contacts`, `companies`, `deals`,
 * `sales`, `tags` and `dealNotes`.
 *
 * When a booking is created on namanpuja.com we mirror it into the CRM as:
 *   1. a `contact`  — the customer
 *   2. a `deal`     — the booking itself (so the sales team sees it in the pipeline)
 *
 * We talk to Supabase through its PostgREST endpoint using the service-role
 * key, so no extra SDK dependency is required (Node's global `fetch`).
 *
 * NOTE: Atomic CRM's exact column names have shifted across releases
 * (e.g. `email` vs `email_jsonb`). The mapping below targets a recent
 * release; adjust `contactPayload`/`dealPayload` to match your deployment.
 */
import { env } from '../../config/env.js';

interface CrmContactResult {
  id: number;
}
interface CrmDealResult {
  id: number;
}

export interface BookingForCrm {
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pujaName?: string | null;
  cityName?: string | null;
  serviceType: string;
  amount?: number | null;
  currency?: string;
  notes?: string | null;
  preferredDate?: Date | null;
}

function crmHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: env.crm.serviceRoleKey,
    Authorization: `Bearer ${env.crm.serviceRoleKey}`,
    Prefer: 'return=representation',
  };
}

async function crmPost<T>(table: string, body: unknown): Promise<T> {
  const res = await fetch(`${env.crm.supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: crmHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CRM ${table} insert failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as T[];
  return json[0];
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  const first = parts.shift() ?? fullName;
  const last = parts.join(' ') || '-';
  return { first, last };
}

/**
 * Push a booking into Atomic CRM. Returns the created CRM ids, or null when
 * the integration is disabled or fails (failures never block a booking).
 */
export async function syncBookingToCrm(
  booking: BookingForCrm,
): Promise<{ contactId: number; dealId: number } | null> {
  if (!env.crm.enabled) return null;
  if (!env.crm.supabaseUrl || !env.crm.serviceRoleKey) {
    // eslint-disable-next-line no-console
    console.warn('[crm] enabled but SUPABASE_URL / SERVICE_ROLE_KEY missing — skipping sync');
    return null;
  }

  try {
    const { first, last } = splitName(booking.customerName);

    const contact = await crmPost<CrmContactResult>('contacts', {
      first_name: first,
      last_name: last,
      // Atomic CRM stores email/phone as JSONB arrays of { type, value }
      email_jsonb: [{ type: 'Work', email: booking.customerEmail }],
      phone_jsonb: [{ type: 'Work', number: booking.customerPhone }],
      background: `Inbound booking ${booking.reference} from namanpuja.com`,
      sales_id: env.crm.defaultSalesId,
      tags: [],
      status: 'hot',
    });

    const dealName = [booking.pujaName, booking.cityName].filter(Boolean).join(' — ') ||
      `Booking ${booking.reference}`;

    const deal = await crmPost<CrmDealResult>('deals', {
      name: dealName,
      contact_ids: [contact.id],
      category: booking.serviceType,
      stage: 'opportunity',
      amount: booking.amount ?? 0,
      description:
        `Reference: ${booking.reference}\n` +
        `Service: ${booking.serviceType}\n` +
        (booking.preferredDate ? `Preferred date: ${booking.preferredDate.toISOString()}\n` : '') +
        (booking.notes ? `Notes: ${booking.notes}` : ''),
      sales_id: env.crm.defaultSalesId,
      index: 0,
    });

    return { contactId: contact.id, dealId: deal.id };
  } catch (err) {
    // Never let CRM problems break the customer-facing booking flow.
    // eslint-disable-next-line no-console
    console.error('[crm] sync failed:', (err as Error).message);
    return null;
  }
}
