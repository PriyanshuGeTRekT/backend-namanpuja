import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    serviceType: { type: String, default: 'HOME_VISIT' },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    notes: { type: String },
    preferredDate: { type: Date },
    preferredTime: { type: String },
    addressLine: { type: String },
    pincode: { type: String },
    pujaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Puja' },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number },
    currency: { type: String, default: 'INR' },
    paymentId: { type: String },
    crmContactId: { type: String },
    crmDealId: { type: String },
    crmSyncedAt: { type: Date },
    status: { type: String, default: 'PENDING' },
  },
  { timestamps: true },
);

bookingSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

bookingSchema.virtual('puja', {
  ref: 'Puja',
  localField: 'pujaId',
  foreignField: '_id',
  justOne: true,
});

bookingSchema.virtual('city', {
  ref: 'City',
  localField: 'cityId',
  foreignField: '_id',
  justOne: true,
});

bookingSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
  },
});

export const Booking = mongoose.model('Booking', bookingSchema);
