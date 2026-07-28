import mongoose from 'mongoose';

const templeSchema = new mongoose.Schema(
  {
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    deity: { type: String },
    shortDesc: { type: String },
    description: { type: String },
    history: { type: String },
    significance: { type: String },
    timings: { type: String },
    heroImage: { type: String },
    enabled: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

templeSchema.virtual('city', {
  ref: 'City',
  localField: 'cityId',
  foreignField: '_id',
  justOne: true,
});

templeSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
  },
});

export const Temple = mongoose.model('Temple', templeSchema);
