// routes/payment.ts
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import razorpay from '../config/razorpay.js';
import { Puja } from '../models/Puja.js';

export const paymentRouter = Router();

paymentRouter.post('/create-order', asyncHandler(async (req, res) => {
  const { pujaId } = req.body;
  const puja = await Puja.findById(pujaId);
  if (!puja) throw ApiError.badRequest('Invalid puja selected');

  const amountInPaise = Math.round(puja.basePrice * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: puja.currency || 'INR',
    receipt: `booking_${Date.now()}`,
    notes: {
      pujaName: puja.name,
      pujaId: puja._id.toString(),
    },
  });

  res.json({ order, puja: { id: puja._id, name: puja.name, price: puja.basePrice } });
}));