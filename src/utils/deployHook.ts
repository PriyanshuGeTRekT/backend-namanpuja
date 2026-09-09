/**
 * deployHook.ts
 *
 * Triggers an AWS Amplify build via the Amplify StartJob API whenever
 * content is created, updated, or deleted in the admin panel.
 *
 * Required environment variables (set in .env and in your hosting env):
 *   AMPLIFY_APP_ID       – Your Amplify app ID (e.g. d1234abcde)
 *   AMPLIFY_BRANCH       – Branch to build (e.g. main)
 *   AWS_REGION           – AWS region (e.g. ap-south-1)
 *   AWS_ACCESS_KEY_ID    – IAM access key with amplify:StartJob permission
 *   AWS_SECRET_ACCESS_KEY – IAM secret key
 *
 * The call is fully fire-and-forget: it does NOT await the build to finish,
 * it does NOT throw, and it does NOT block the admin save response.
 */

import { AmplifyClient, StartJobCommand, JobType } from '@aws-sdk/client-amplify';

let _client: AmplifyClient | null = null;

function getClient(): AmplifyClient | null {
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (!region || !accessKeyId || !secretAccessKey) return null;

  // Reuse the client across calls (singleton per process)
  if (!_client) {
    _client = new AmplifyClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

export function fireDeployHook(resource: string): void {
  const appId = process.env.AMPLIFY_APP_ID?.trim();
  const branchName = process.env.AMPLIFY_BRANCH?.trim() ?? 'main';

  if (!appId) return; // silently disabled — env var not set

  const client = getClient();
  if (!client) {
    console.warn('[deployHook] ⚠️  AMPLIFY_APP_ID set but AWS credentials missing — skipping deploy trigger.');
    return;
  }

  const command = new StartJobCommand({
    appId,
    branchName,
    jobType: JobType.RELEASE,
    jobReason: `Content change: ${resource} (triggered by admin panel)`,
  });

  client.send(command)
    .then((res) => {
      const jobId = res.jobSummary?.jobId ?? '?';
      console.log(`[deployHook] ✅ Amplify build started for resource="${resource}" | jobId=${jobId} branch=${branchName}`);
    })
    .catch((err: Error) => {
      console.warn(`[deployHook] ❌ Failed to start Amplify build for resource="${resource}":`, err.message);
    });
  // intentionally NOT awaited — fire-and-forget
}
