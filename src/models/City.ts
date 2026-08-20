import mongoose from 'mongoose';

const citySchema = new mongoose.Schema(
  {
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    state: { type: String },
    geoRegion: { type: String },
    region: { type: String, default: 'General' },
    description: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    enabled: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

citySchema.index({ slug: 1 });
citySchema.index({ countryId: 1, enabled: 1 });
citySchema.index({ enabled: 1, isPopular: -1, sortOrder: 1, name: 1 });

citySchema.virtual('country', {
  ref: 'Country',
  localField: 'countryId',
  foreignField: '_id',
  justOne: true,
});

citySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
  },
});

export const City = mongoose.model('City', citySchema);
