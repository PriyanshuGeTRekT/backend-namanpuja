import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    isoCode: { type: String },
    currencyCode: { type: String },
    currencySymbol: { type: String },
    flagEmoji: { type: String },
    continent: { type: String, default: 'Asia' },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

countrySchema.index({ slug: 1 });
countrySchema.index({ enabled: 1, sortOrder: 1 });

countrySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
  },
});

export const Country = mongoose.model('Country', countrySchema);
