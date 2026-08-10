import { z } from 'zod';
import mongoose from 'mongoose';
import { syncBookingToCrm } from '../services/crm/atomicCrm.js';
import { Booking } from '../models/Booking.js';
import { Puja } from '../models/Puja.js';
import { City } from '../models/City.js';

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
  userId: z.string().optional(),
  paymentId: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

/** Generate a human-friendly booking reference like NP-2026-000123. */
async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const countThisYear = await Booking.countDocuments({
    createdAt: { $gte: new Date(`${year}-01-01T00:00:00.000Z`) },
  });
  const seq = String(countThisYear + 1).padStart(6, '0');
  return `NP-${year}-${seq}`;
}

export async function createBooking(raw: unknown) {
  const input = bookingSchema.parse(raw);

  const pujaIdValid = input.pujaId && mongoose.Types.ObjectId.isValid(input.pujaId) ? input.pujaId : null;
  
  let cityDoc = null;
  if (input.cityId) {
    if (mongoose.Types.ObjectId.isValid(input.cityId)) {
      cityDoc = await City.findById(input.cityId);
    }
    if (!cityDoc) {
      cityDoc = await City.findOne({
        $or: [
          { slug: String(input.cityId).toLowerCase().trim().replace(/\s+/g, '-') },
          { name: new RegExp(`^${input.cityId}$`, 'i') },
        ],
      });
    }
  }

  const userIdValid = input.userId && mongoose.Types.ObjectId.isValid(input.userId) ? input.userId : undefined;

  // Resolve amount + names from the puja/city for the record and CRM deal.
  const [puja, city] = await Promise.all([
    pujaIdValid ? Puja.findById(pujaIdValid) : null,
    Promise.resolve(cityDoc),
  ]);

  const reference = await nextReference();

  const booking = await new Booking({
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
    pujaId: puja?._id,
    cityId: city?._id,
    userId: userIdValid,
    paymentId: input.paymentId,
    amount: (puja as any)?.basePrice ?? undefined,
    currency: (puja as any)?.currency ?? 'INR',
    status: input.paymentId ? 'CONFIRMED' : 'PENDING',
  }).save();

  // Mirror into Atomic CRM (non-blocking on failure).
  const crm = await syncBookingToCrm({
    reference: booking.reference,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    pujaName: puja?.name,
    cityName: city?.name,
    serviceType: booking.serviceType,
    amount: (puja as any)?.basePrice ? Number((puja as any).basePrice) : null,
    currency: booking.currency,
    notes: booking.notes,
    preferredDate: booking.preferredDate,
  });

  if (crm) {
    await Booking.updateOne(
      { _id: booking._id },
      { crmContactId: crm.contactId, crmDealId: crm.dealId, crmSyncedAt: new Date() }
    );
  }

  return booking;
}
