import { z } from 'zod';
import mongoose from 'mongoose';
import { FormSubmission } from '../models/FormSubmission.js';
import { Puja } from '../models/Puja.js';
import { City } from '../models/City.js';
import { syncBookingToCrm } from '../services/crm/atomicCrm.js';

const formSubmissionSchema = z.object({
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
});

export type FormSubmissionInput = z.infer<typeof formSubmissionSchema>;

async function nextFormSubmissionReference(): Promise<string> {
  const year = new Date().getFullYear();
  const countThisYear = await FormSubmission.countDocuments({
    createdAt: { $gte: new Date(`${year}-01-01T00:00:00.000Z`) },
  });
  const seq = String(countThisYear + 1).padStart(6, '0');
  return `FS-${year}-${seq}`;
}

export async function createFormSubmission(raw: unknown) {
  const input = formSubmissionSchema.parse(raw);

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

  const [puja, city] = await Promise.all([
    pujaIdValid ? Puja.findById(pujaIdValid) : null,
    Promise.resolve(cityDoc),
  ]);

  const reference = await nextFormSubmissionReference();

  // Save STRICTLY in FormSubmission collection (NOT in Booking collection)
  const submission = await new FormSubmission({
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
    pujaName: puja?.name ?? 'General Puja Booking',
    cityName: city?.name ?? 'India',
    status: 'SUBMITTED',
  }).save();

  // Mirror into Atomic CRM
  await syncBookingToCrm({
    reference: submission.reference,
    customerName: submission.customerName,
    customerEmail: submission.customerEmail,
    customerPhone: submission.customerPhone,
    pujaName: puja?.name,
    cityName: city?.name,
    serviceType: submission.serviceType,
    notes: submission.notes,
    preferredDate: submission.preferredDate,
    isPaid: false,
  });

  return submission;
}
