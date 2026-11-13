import { APP_URL } from './apiPath';
import createApiInstance from './createApiInstance';

const commonClient = createApiInstance(APP_URL, {
    sendAuthHeader: false,
    tokenInBody: false,
    // refreshOnAuthError inherits the shared default (true): on a 401/409 the
    // response interceptor refreshes the token and retries once, so the
    // revenue-critical invoice/insurance/contract calls recover from an
    // expired session instead of silently failing.
});

export default commonClient;
