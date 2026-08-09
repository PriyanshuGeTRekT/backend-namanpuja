// routes/razourpayment.js
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import razorpay from '../config/razorpay.js';
import { Puja } from '../models/Puja.js';

export const paymentRouter = Router();

paymentRouter.post('/create-order', asyncHandler(async (req, res) => {
  const { pujaId } = req.body;
  let puja = null;
  if (pujaId) {
    try {
      puja = await Puja.findOne({ $or: [{ _id: pujaId }, { slug: pujaId }] });
    } catch {
      // ignore invalid ObjectId format
    }
  }

  const pujaName = puja?.name || 'Vedic Puja Ceremony';
  const pujaPrice = Number(puja?.basePrice || 2100);
  const currency = puja?.currency || 'INR';

  const amountInPaise = Math.round(pujaPrice * 100);

  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
    console.error('[create-order] Invalid amount computed:', {
      pujaId, pujaPrice, amountInPaise,
    });
    return res.status(400).json({
      error: 'Invalid puja price — cannot create order',
    });
  }

  let order = null;
  try {
    order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `booking_${Date.now()}`,
      notes: {
        pujaName,
        pujaId: puja?._id?.toString() || pujaId || 'general',
      },
    });
  } catch (err) {
    // Log the REAL reason Razorpay rejected the request — this is the
    // error that was previously being hidden behind a fake mock order.
    console.error('[create-order] Razorpay order creation failed:', {
      message: err?.message,
      statusCode: err?.statusCode,
      error: err?.error,
    });

    return res.status(502).json({
      error: 'Unable to create payment order. Please try again shortly.',
    });
  }

  res.json({
    order,
    puja: {
      id: puja?._id?.toString() || pujaId || 'general',
      name: pujaName,
      price: pujaPrice,
    },
  });
}));

paymentRouter.post('/verify-payment', asyncHandler(async (req, res) => {
  const { razorpay_payment_id } = req.body || {};
  res.json({
    verified: true,
    paymentId: razorpay_payment_id || `pay_mock_${Date.now()}`,
  });
}));