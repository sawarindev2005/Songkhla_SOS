// Only the active, non-cancelled read may replace the cached result.
export function canCommitPoll(activeController, controller) {
  return Boolean(controller && activeController === controller && !controller.signal.aborted);
}

export function applyPollingUpdate(previous, path, updater, updatedAt = new Date()) {
  if (previous.path !== path) return previous;
  return { ...previous, data: updater(previous.data), error: null, updatedAt };
}
