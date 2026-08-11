import mongoose from 'mongoose';

const formSubmissionSchema = new mongoose.Schema(
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
    pujaName: { type: String },
    cityName: { type: String },
    status: { type: String, default: 'PENDING' },
    crmSyncedAt: { type: Date },
  },
  { timestamps: true },
);

formSubmissionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
  },
});

export const FormSubmission = mongoose.model('FormSubmission', formSubmissionSchema, 'form_filled');
