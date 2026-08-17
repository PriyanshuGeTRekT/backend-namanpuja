import mongoose from 'mongoose';

const pujaSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PujaCategory' },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    deity: { type: String },
    subtitle: { type: String },
    serviceType: { type: String, default: 'BOTH' },
    durationMin: { type: Number },
    duration: { type: String },
    basePrice: { type: Number, default: 0 },
    shortDesc: { type: String },
    shortDescription: { type: String },
    description: { type: String },
    heroImage: { type: String },
    benefits: { type: mongoose.Schema.Types.Mixed },
    rituals: { type: mongoose.Schema.Types.Mixed },
    samagri: { type: mongoose.Schema.Types.Mixed },
    occasions: { type: mongoose.Schema.Types.Mixed },
    faqs: { type: mongoose.Schema.Types.Mixed },
    enabled: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    bhaktiType: { type: String, default: 'main' },
  },
  { timestamps: true, strict: false },
);

pujaSchema.index({ slug: 1 });
pujaSchema.index({ enabled: 1, isFeatured: 1, sortOrder: 1 });
pujaSchema.index({ categoryId: 1 });
pujaSchema.index({ enabled: 1, bhaktiType: 1, isFeatured: -1, sortOrder: 1 });

pujaSchema.virtual('category', {
  ref: 'PujaCategory',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true,
});

pujaSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
  },
});

export const Puja = mongoose.model('Puja', pujaSchema);
