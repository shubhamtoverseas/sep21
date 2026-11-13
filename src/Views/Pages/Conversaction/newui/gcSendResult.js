/**
 * Outcome of a chat send thunk (CH-11). `chats/send-template-message` answers HTTP 200 even when the send failed —
 * `{ success: false, message }` — so a fulfilled thunk is not proof of delivery. A send counts as failed when the
 * thunk was rejected or the service said `success: false`. A rejected thunk carries the server message under
 * `payload.data.data.message` (rejectWithValue({ data: error.response })).
 *
 * @param {{ error?: unknown, payload?: any }} res the dispatched thunk's result
 * @returns {{ failed: boolean, message: string }}
 */
export const gcSendOutcome = (res) => ({
    failed: Boolean(res?.error) || res?.payload?.success === false,
    message: res?.payload?.message || res?.payload?.data?.data?.message || "",
});
