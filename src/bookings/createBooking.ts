import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { syncBookingToCrm } from '../services/crm/atomicCrm.js';

const bookingSchema = z.object({
  serviceType: z.enum(['EPUJA', 'HOME_VISIT', 'BOTH']).default('HOME_VISIT'),
  customerName: z.string().min(2, 'Name is required'),
  customerEmail: z.string().email('A valid email is required'),
  customerPhone: z.string().min(6, 'A valid phone number is required'),
  notes: z.string().optional(),
  preferredDate: z.coerce.date().optional(),
  preferredTime: z.string().optional(),
  addressLine: z.string().optional(),
  pincode: z.string().optional(),
  pujaId: z.string().optional(),
  cityId: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

/** Generate a human-friendly booking reference like NP-2026-000123. */
async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const countThisYear = await prisma.booking.count({
    where: { createdAt: { gte: new Date(`${year}-01-01T00:00:00.000Z`) } },
  });
  const seq = String(countThisYear + 1).padStart(6, '0');
  return `NP-${year}-${seq}`;
}

export async function createBooking(raw: unknown) {
  const input = bookingSchema.parse(raw);

  // Resolve amount + names from the puja/city for the record and CRM deal.
  const [puja, city] = await Promise.all([
    input.pujaId ? prisma.puja.findUnique({ where: { id: input.pujaId } }) : null,
    input.cityId ? prisma.city.findUnique({ where: { id: input.cityId } }) : null,
  ]);

  const reference = await nextReference();

  const booking = await prisma.booking.create({
    data: {
      reference,
      serviceType: input.serviceType,
      customerName: input.customerName,
      customerEmail: input.customerEmail.toLowerCase(),
      customerPhone: input.customerPhone,
      notes: input.notes,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      addressLine: input.addressLine,
      pincode: input.pincode,
      pujaId: puja?.id,
      cityId: city?.id,
      amount: puja?.basePrice ?? undefined,
      currency: puja?.currency ?? 'INR',
    },
  });

  // Mirror into Atomic CRM (non-blocking on failure).
  const crm = await syncBookingToCrm({
    reference: booking.reference,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    pujaName: puja?.name,
    cityName: city?.name,
    serviceType: booking.serviceType,
    amount: puja?.basePrice ? Number(puja.basePrice) : null,
    currency: booking.currency,
    notes: booking.notes,
    preferredDate: booking.preferredDate,
  });

  if (crm) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { crmContactId: crm.contactId, crmDealId: crm.dealId, crmSyncedAt: new Date() },
    });
  }

  return booking;
}
