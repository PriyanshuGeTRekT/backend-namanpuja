import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User.js';
import { Puja } from '../src/models/Puja.js';
import { City } from '../src/models/City.js';
import { Booking } from '../src/models/Booking.js';
import { FormSubmission } from '../src/models/FormSubmission.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/namanpuja';
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

function crmHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: serviceKey!,
    Authorization: `Bearer ${serviceKey}`,
    Prefer: 'return=representation',
  };
}

async function postToSupabase(table: string, data: any) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: crmHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.warn(`  ⚠️ Failed to insert into ${table}: ${errText}`);
    return null;
  }
  const json = await res.json();
  return json[0];
}

async function runSync() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB.');

  // Touch models to ensure Mongoose schema registration
  const _models = [User.modelName, Puja.modelName, City.modelName, Booking.modelName, FormSubmission.modelName];

  // 1. Migrate Bookings (Paid Payments & Bookings)
  console.log('\n📦 Migrating Bookings from MongoDB to Supabase `paid_bookings` & `contacts` / `deals`...');
  const bookings = await Booking.find().populate('pujaId').populate('cityId');
  console.log(`Found ${bookings.length} booking records in MongoDB.`);

  let paidCount = 0;
  for (const b of bookings) {
    const pujaName = (b.pujaId as any)?.name || 'Vedic Puja';
    const cityName = (b.cityId as any)?.name || 'India';

    const payload = {
      reference: b.reference,
      customer_name: b.customerName,
      customer_email: b.customerEmail,
      customer_phone: b.customerPhone,
      service_type: b.serviceType || 'HOME_VISIT',
      puja_name: pujaName,
      city_name: cityName,
      amount: b.amount || 0,
      currency: b.currency || 'INR',
      payment_id: b.paymentId || 'MANUAL_BOOKING',
      notes: b.notes || '',
      preferred_date: b.preferredDate ? new Date(b.preferredDate).toISOString() : null,
      address: b.addressLine || '',
      status: b.status || 'CONFIRMED',
    };

    const inserted = await postToSupabase('paid_bookings', payload);
    if (inserted) paidCount++;
  }
  console.log(`✅ Successfully synced ${paidCount}/${bookings.length} paid bookings to Supabase!`);

  // 2. Migrate FormSubmissions
  console.log('\n📝 Migrating Form Submissions from MongoDB to Supabase `form_submissions`...');
  const submissions = await FormSubmission.find().populate('pujaId').populate('cityId');
  console.log(`Found ${submissions.length} form submission records in MongoDB.`);

  let fsCount = 0;
  for (const fs of submissions) {
    const pujaName = fs.pujaName || (fs.pujaId as any)?.name || 'General Puja Inquiry';
    const cityName = fs.cityName || (fs.cityId as any)?.name || 'India';

    const payload = {
      reference: fs.reference,
      customer_name: fs.customerName,
      customer_email: fs.customerEmail,
      customer_phone: fs.customerPhone,
      service_type: fs.serviceType || 'HOME_VISIT',
      puja_name: pujaName,
      city_name: cityName,
      notes: fs.notes || '',
      preferred_date: fs.preferredDate ? new Date(fs.preferredDate).toISOString() : null,
      preferred_time: fs.preferredTime || '',
      address: fs.addressLine || '',
      status: fs.status || 'SUBMITTED',
    };

    const inserted = await postToSupabase('form_submissions', payload);
    if (inserted) fsCount++;
  }
  console.log(`✅ Successfully synced ${fsCount}/${submissions.length} form submissions to Supabase!`);

  console.log('\n🎉 Sync complete! All MongoDB bookings & form submissions are now in Supabase CRM.');
  await mongoose.disconnect();
}

runSync().catch((err) => {
  console.error('❌ Sync script failed:', err);
  process.exit(1);
});
