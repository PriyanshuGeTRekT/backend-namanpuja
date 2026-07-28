import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'ADMIN' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

adminUserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.passwordHash;
  },
});

export const AdminUser = mongoose.model('AdminUser', adminUserSchema);
