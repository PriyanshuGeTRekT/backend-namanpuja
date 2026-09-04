import axios from 'axios';

export async function triggerAmplifyRebuild() {
  const webhookUrl = process.env.AMPLIFY_BUILD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await axios.post(webhookUrl, {});
    console.log('🚀 Triggered Amplify rebuild webhook successfully.');
  } catch (err: any) {
    console.error('⚠️ Failed to trigger Amplify rebuild webhook:', err?.message || err);
  }
}
