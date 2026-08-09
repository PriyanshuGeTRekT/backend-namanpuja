import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TMtbjf3c4YwwKA',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'CmXdWFwyhm5PvDxk4vb2RYdD',
});

export default razorpay;
