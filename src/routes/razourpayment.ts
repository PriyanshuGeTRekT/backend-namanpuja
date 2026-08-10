import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { validatePaymentVerification, validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import razorpay from '../config/razorpay.js';
import { Puja } from '../models/Puja.js';
import { createBooking } from '../bookings/createBooking.js';

export const paymentRouter = Router();

// Step 1: Create Order API
paymentRouter.post('/create-order', asyncHandler(async (req: Request, res: Response) => {
  const { pujaId, amount: bodyAmount, currency: bodyCurrency, receipt: bodyReceipt, notes: bodyNotes } = req.body || {};
  let puja: any = null;
  if (pujaId) {
    try {
      puja = await Puja.findOne({ $or: [{ _id: pujaId }, { slug: pujaId }] });
    } catch {
      // ignore invalid ObjectId format
    }
  }

  const pujaName = puja?.name || 'Vedic Puja Ceremony';
  const pujaPrice = puja?.basePrice ? Number(puja.basePrice) : null;

  // Amount in currency subunits (paise for INR). Default 50000 paise (₹500) or puja basePrice * 100
  let amountInPaise = bodyAmount ? Number(bodyAmount) : (pujaPrice ? Math.round(pujaPrice * 100) : 50000);
  const currency = bodyCurrency || puja?.currency || 'INR';
  const receipt = bodyReceipt || `receipt_${Date.now()}`;

  if (amountInPaise < 100) {
    throw ApiError.badRequest('Minimum amount must be at least 100 paise');
  }

  let order: any = null;
  try {
    order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes: {
        pujaName,
        pujaId: puja?._id?.toString() || pujaId || 'general',
        key1: bodyNotes?.key1 || 'value3',
        key2: bodyNotes?.key2 || 'value2',
        ...(bodyNotes || {}),
      },
    });
  } catch (err: any) {
    if (err?.statusCode === 401) {
      throw new ApiError(401, 'Razorpay Authentication Failed: Invalid Key ID or Secret');
    }
    throw new ApiError(502, err?.message || 'Razorpay order creation failed');
  }

  res.json({
    order_id: order.id,
    order,
    amount: order.amount,
    currency: order.currency,
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TMtbjf3c4YwwKA',
    puja: {
      id: puja?._id?.toString() || pujaId || 'general',
      name: pujaName,
      price: pujaPrice || (amountInPaise / 100),
    },
  });
}));

// Step 2: Verify Payment Signature API
paymentRouter.post('/verify-payment', asyncHandler(async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingPayload } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Missing required signature verification fields' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'CmXdWFwyhm5PvDxk4vb2RYdD';

  let isValid = false;
  try {
    isValid = validatePaymentVerification(
      { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
      razorpay_signature,
      keySecret
    );
  } catch {
    // Fallback manual HMAC SHA256 verification as per documentation:
    // generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret);
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    isValid = (generatedSignature === razorpay_signature);
  }

  if (!isValid) {
    return res.status(400).json({ verified: false, error: 'Signature mismatch' });
  }

  let bookingResult = null;
  if (bookingPayload) {
    try {
      bookingResult = await createBooking({
        ...bookingPayload,
        paymentId: razorpay_payment_id,
      });
    } catch {
      // Booking creation error ignored for payment verification response
    }
  }

  res.json({
    verified: true,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    signature: razorpay_signature,
    booking: bookingResult,
    message: 'Payment verified successfully and signature matched',
  });
}));

// Step 3: Webhook Event Endpoint
paymentRouter.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  const webhookSignature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret';

  if (webhookSignature && process.env.RAZORPAY_WEBHOOK_SECRET) {
    try {
      const isWebhookValid = validateWebhookSignature(
        JSON.stringify(req.body),
        webhookSignature,
        webhookSecret
      );
      if (!isWebhookValid) {
        return res.status(400).json({ status: 'invalid webhook signature' });
      }
    } catch {
      return res.status(400).json({ status: 'webhook verification error' });
    }
  }

  const event = req.body?.event;
  const paymentEntity = req.body?.payload?.payment?.entity;
  const orderEntity = req.body?.payload?.order?.entity;

  console.log(`Razorpay Webhook Event Received: ${event}`, {
    paymentId: paymentEntity?.id,
    orderId: orderEntity?.id,
    status: paymentEntity?.status,
  });

  if (event === 'payment.captured') {
    // Payment successfully captured
  } else if (event === 'payment.failed') {
    // Payment failed
  }

  res.json({ status: 'ok' });
}));
