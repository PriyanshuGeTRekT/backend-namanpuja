import mongoose from 'mongoose';

const pujaSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PujaCategory' },
    name: { type: String, required: true },
    title: { type: String },
    slug: { type: String, required: true },
    deity: { type: String },
    subtitle: { type: String },
    serviceType: { type: String, default: 'BOTH' },
    durationMin: { type: Number },
    duration: { type: String },
    basePrice: { type: Number, default: 0 },
    onlinePrice: { type: Number, default: 0 },
    offlinePrice: { type: Number, default: 0 },
    shortDesc: { type: String },
    shortDescription: { type: String },
    description: { type: String },
    featuredImage: { type: String },
    heroImage: { type: String },
    h1: { type: String },
    heroTagline: { type: String },
    intro: { type: String },
    excerpt: { type: String },
    blocks: { type: mongoose.Schema.Types.Mixed },
    sections: { type: mongoose.Schema.Types.Mixed },
    benefits: { type: mongoose.Schema.Types.Mixed },
    rituals: { type: mongoose.Schema.Types.Mixed },
    samagri: { type: mongoose.Schema.Types.Mixed },
    whyChooseUs: { type: mongoose.Schema.Types.Mixed },
    occasions: { type: mongoose.Schema.Types.Mixed },
    serviceAreas: { type: mongoose.Schema.Types.Mixed },
    faqs: { type: mongoose.Schema.Types.Mixed },
    cta: { type: mongoose.Schema.Types.Mixed },
    packages: { type: mongoose.Schema.Types.Mixed },
    metaTitle: { type: String },
    seoTitle: { type: String },
    metaDescription: { type: String },
    seoDescription: { type: String },
    keywords: { type: mongoose.Schema.Types.Mixed },
    seoKeywords: { type: mongoose.Schema.Types.Mixed },
    ogImage: { type: String },
    canonicalUrl: { type: String },
    breadcrumb: { type: mongoose.Schema.Types.Mixed },
    internalLinks: { type: mongoose.Schema.Types.Mixed },
    imageAlt: { type: String },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    cityName: { type: String },
    city: { type: String },
    citySlug: { type: String },
    countryName: { type: String },
    country: { type: String },
    countrySlug: { type: String },
    state: { type: String },
    targetPujaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Puja' },
    pujaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Puja' },
    status: { type: String, default: 'published' },
    published: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    bhaktiType: { type: String, default: 'main' },
  },
  { timestamps: true, strict: false },
);

pujaSchema.index({ enabled: 1, isFeatured: 1, sortOrder: 1 });
pujaSchema.index({ categoryId: 1 });
pujaSchema.index({ cityId: 1, published: 1 });
pujaSchema.index({ city: 1, country: 1 });
pujaSchema.index({ enabled: 1, bhaktiType: 1, isFeatured: -1, sortOrder: 1 });
// Unique per slug for main master pujas
pujaSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { bhaktiType: 'main' } }
);
// Unique per slug + city for location-specific custom pages (allows same slug across different cities)
pujaSchema.index(
  { slug: 1, city: 1, country: 1 },
  { unique: true, partialFilterExpression: { bhaktiType: 'location' } }
);

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
    if (!ret.onlinePrice && ret.basePrice) {
      ret.onlinePrice = ret.basePrice;
    }
    delete ret._id;
  },
});

export const Puja = mongoose.model('Puja', pujaSchema);
