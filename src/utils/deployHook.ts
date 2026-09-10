import {
  AmplifyClient,
  StartJobCommand,
  JobType,
  type StartJobCommandOutput,
} from '@aws-sdk/client-amplify';

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
    .then((res: StartJobCommandOutput) => {
      const jobId = res.jobSummary?.jobId ?? '?';
      console.log(`[deployHook] ✅ Amplify build started for resource="${resource}" | jobId=${jobId} branch=${branchName}`);
    })
    .catch((err: Error) => {
      console.warn(`[deployHook] ❌ Failed to start Amplify build for resource="${resource}":`, err.message);
    });
  // intentionally NOT awaited — fire-and-forget
}