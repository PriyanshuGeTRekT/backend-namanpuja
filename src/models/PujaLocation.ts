import mongoose from 'mongoose';

const pujaLocationSchema = new mongoose.Schema(
  {
    pujaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Puja', required: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    cityName: { type: String },
    countryName: { type: String },
    slug: { type: String, required: true, unique: true },
    h1: { type: String },
    heroTagline: { type: String },
    intro: { type: String },
    featuredImage: { type: String },     // uploaded hero image URL / base64
    blocks: { type: mongoose.Schema.Types.Mixed },  // full Content Builder blocks array
    sections: { type: mongoose.Schema.Types.Mixed }, // legacy heading+body pairs
    benefits: { type: mongoose.Schema.Types.Mixed },
    rituals: { type: mongoose.Schema.Types.Mixed },
    samagri: { type: mongoose.Schema.Types.Mixed },
    whyChooseUs: { type: mongoose.Schema.Types.Mixed },
    occasions: { type: mongoose.Schema.Types.Mixed },
    serviceAreas: { type: mongoose.Schema.Types.Mixed },
    faqs: { type: mongoose.Schema.Types.Mixed },
    cta: { type: mongoose.Schema.Types.Mixed },
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: { type: mongoose.Schema.Types.Mixed },
    ogImage: { type: String },
    canonicalUrl: { type: String },
    breadcrumb: { type: mongoose.Schema.Types.Mixed },
    internalLinks: { type: mongoose.Schema.Types.Mixed },
    imageAlt: { type: String },
    basePrice: { type: Number },
    onlinePrice: { type: Number },
    offlinePrice: { type: Number },
    published: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true, strict: false },
);

pujaLocationSchema.index({ slug: 1 });
pujaLocationSchema.index({ cityId: 1, published: 1 });
pujaLocationSchema.index({ pujaId: 1, published: 1 });
pujaLocationSchema.index({ published: 1 });

pujaLocationSchema.virtual('puja', {
  ref: 'Puja',
  localField: 'pujaId',
  foreignField: '_id',
  justOne: true,
});

pujaLocationSchema.virtual('city', {
  ref: 'City',
  localField: 'cityId',
  foreignField: '_id',
  justOne: true,
});

pujaLocationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
  },
});

export const PujaLocation = mongoose.model('PujaLocation', pujaLocationSchema);
