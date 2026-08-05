import mongoose from 'mongoose';

const citySchema = new mongoose.Schema(
  {
    countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    state: { type: String },
    geoRegion: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    enabled: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

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
