import mongoose from 'mongoose';

const pujaCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    icon: { type: String },
    description: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

pujaCategorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
  },
});

export const PujaCategory = mongoose.model('PujaCategory', pujaCategorySchema);
