const GLOBAL_TIMING_LOGS_ENV = "APP_TIMING_LOGS";
const PAGE_TIMING_LOGS_ENV = "PAGE_TIMING_LOGS";

function timingEnvForScope(scope: string) {
  return `${scope.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}_TIMING_LOGS`;
}

export function shouldLogServerTimings(scope: string) {
  return (
    process.env[GLOBAL_TIMING_LOGS_ENV] === "true" ||
    process.env[PAGE_TIMING_LOGS_ENV] === "true" ||
    process.env[timingEnvForScope(scope)] === "true"
  );
}

export function logServerTiming(scope: string, label: string, startedAt: number) {
  if (!shouldLogServerTimings(scope)) return;

  const durationMs = Math.round(performance.now() - startedAt);
  console.log(`[${scope}] ${label}: ${durationMs}ms`);
}

export async function timedServerTask<T>(
  scope: string,
  label: string,
  task: () => PromiseLike<T> | T
): Promise<Awaited<T>> {
  if (!shouldLogServerTimings(scope)) return await task();

  const startedAt = performance.now();

  try {
    const result = await task();
    logServerTiming(scope, label, startedAt);
    return result;
  } catch (error) {
    logServerTiming(scope, `${label} erro`, startedAt);
    throw error;
  }
}
