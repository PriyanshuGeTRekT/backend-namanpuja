import Razorpay from 'razorpay';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  throw new Error(
    '[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment variables. ' +
    'Check your .env file — make sure you use = not : (e.g. RAZORPAY_KEY_ID=rzp_live_...).'
  );
}

const razorpay = new Razorpay({ key_id, key_secret });

export default razorpay;
