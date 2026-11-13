/* Dispatches a thunk and returns its unwrapped promise, so a caller that awaits (or .catch()es) still receives the
   rejection. Most of the 150-odd callers fire and forget: for them a failed fetch must NOT become an unhandled
   rejection, because the top-level ErrorBoundary (captureGlobal, FE-5) treats every unhandled rejection as a crash
   and replaces the whole page with "Something went wrong" (staging 27 Oct: worker 688 → Photo, one 400 from
   worker-activity-log-list took the page down — backend 292). The error is logged outside production instead. */
export const dispatchWithHandling = (dispatch, action) => {
  const result = dispatch(action).unwrap();
  result.catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[dispatchWithHandling] rejected:", error?.message || error);
    }
  });
  return result;
};
