import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { APP_URL, REACT_APP_X_API_KEY, HOST_TYPE } from './apiPath';
import { getStoredUser } from '../utils/storage';
import { getLocalTimeZone } from './commonService';
import { forceLogout, isLoggedOutResponse } from '../utils/forceLogout';

/* A server failure (HTTP 5xx) never shows its raw text — a Prisma / SQL / stack message is not a user message. The body
   keeps its shape (readers take `message` from `payload.message` or `payload.data.data.message`), the original text moves
   to `raw_message` for the console, and `server_error: true` marks it. The friendly copy is resolved lazily so this
   module never imports the i18n layer at load time (store → slices → services → here). */
const SERVER_ERROR_FALLBACK = 'Something went wrong. Please try again.';
const friendlyServerMessage = () => {
    try {
        const translation = require('../utils/translation').default;
        const text = translation('key_something_went_wrong');
        return text && text !== 'key_something_went_wrong' ? text : SERVER_ERROR_FALLBACK;
    } catch (e) {
        return SERVER_ERROR_FALLBACK;
    }
};
const maskServerError = (response) => {
    if (!response || Number(response.status) < 500) return;
    const body = response.data && typeof response.data === 'object' ? response.data : {};
    const raw = typeof response.data === 'string' ? response.data : body.message;
    if (raw) console.error(`API ${ response.status } ${ response.config?.url || '' }:`, raw);
    response.data = { ...body, status: false, message: friendlyServerMessage(), raw_message: raw ?? null, server_error: true };
};

/**
 * Single configurable axios factory shared by every API client.
 *
 * Behaviour is tuned per call site through the options object so that each
 * legacy client (createApiInstance / commonClient / appClient / aiCreateApiInstance)
 * keeps its exact request/auth contract while sharing one request + one
 * response interceptor.
 *
 * @param {string} baseURL
 * @param {object} [options]
 * @param {string}  [options.apiKey]              value sent as the `x-api-key` header
 * @param {boolean} [options.sendTokenHeader]     send the auth token as the `token` header
 * @param {boolean} [options.sendAuthHeader]      send the auth token as the `Authorization` header
 * @param {boolean} [options.tokenInBody]         inject the token into the body of POST/PUT/PATCH
 * @param {boolean} [options.tokenInParams]       inject the token into the params of GET/DELETE
 * @param {boolean} [options.refreshOnAuthError]  attempt a token refresh + retry on 401
 */

/* The Idempotency-Key contract exists only on the admin API (APP_URL,
   e.g. https://adminapi.maidmatch.ai/api). Requests to the other hosts
   (contract, insurance, settings, HRMS, chat, PDF…) must NOT carry it.
   An absolute config.url overrides the instance's baseURL (the invoice
   service does this through commonClient), so the effective URL decides. */
const isAdminApiRequest = (config) => {
    if (!APP_URL) return false;
    const url = String(config.url || '');
    if (/^https?:\/\//i.test(url)) return url.startsWith(APP_URL);
    return String(config.baseURL || '').startsWith(APP_URL);
};

let refreshPromise = null;

// Retry-After may be seconds ("5") or an HTTP date; returns milliseconds or null
const parseRetryAfterMs = (headerValue) => {
    if (!headerValue) return null;
    const seconds = Number(headerValue);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    const untilDateMs = Date.parse(headerValue) - Date.now();
    return Number.isFinite(untilDateMs) && untilDateMs > 0 ? untilDateMs : null;
};

const RATE_LIMIT_DEFAULT_WAIT_MS = 2000;
const RATE_LIMIT_MAX_WAIT_MS = 30000;

const performTokenRefresh = (currentUser) => {
    if (!refreshPromise) {
        refreshPromise = axios
            .get(`${ APP_URL }/refresh-token`, {
                headers: {
                    'Authorization': `Bearer ${ currentUser.token }`,
                    'x-api-key': REACT_APP_X_API_KEY,
                    'hosttype': HOST_TYPE,
                    'device': navigator.userAgent,
                    'timezone': getLocalTimeZone()
                },
            })
            .then((refreshResponse) => {
                const newToken = refreshResponse.data.token;
                sessionStorage.setItem('user', JSON.stringify({ ...currentUser, token: newToken }));
                return newToken;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

const createApiInstance = (
    baseURL,
    {
        apiKey = REACT_APP_X_API_KEY,
        sendTokenHeader = true,
        sendAuthHeader = true,
        tokenInBody = false,
        tokenInParams = false,
        refreshOnAuthError = true,
    } = {}
) => {
    const api = axios.create({
        baseURL,
        timeout: 30000,
    });

    api.interceptors.request.use(
        (config) => {
            const currentUser = getStoredUser();
            const token = currentUser?.token;

            config.headers['x-api-key'] = apiKey;
            config.headers['timezone'] = getLocalTimeZone();
            config.headers['hosttype'] = HOST_TYPE;
            config.headers['device'] = navigator.userAgent;
            config.headers['language'] = localStorage.getItem('i18nextLng');
            config.headers['Accept-Language'] = localStorage.getItem('i18nextLng');
            if (isAdminApiRequest(config) && !config.headers['Idempotency-Key']) {
                config.headers['Idempotency-Key'] = uuidv4();
            }

            if (token) {
                if (sendTokenHeader) {
                    config.headers['token'] = `${ token }`;
                }
                if (sendAuthHeader) {
                    config.headers['Authorization'] = `Bearer ${ token }`;
                }

                const method = config.method?.toLowerCase();
                if (tokenInBody && (method === 'post' || method === 'put' || method === 'patch')) {
                     let body = config.data;
                    if (typeof body === 'string') {
                        try {
                            body = JSON.parse(body);
                        } catch (e) {
                            body = {};
                        }
                    }
                    config.data = { ...body, token };
                }
                if (tokenInParams && (method === 'get' || method === 'delete')) {
                    config.params = { ...config.params, token };
                }
            }

            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    api.interceptors.response.use(
        (response) => {
            if (isLoggedOutResponse(response?.data)) {
                forceLogout();
            }
            return response;
        },
        async (error) => {
            const originalRequest = error.config;

            if (isLoggedOutResponse(error.response?.data)) {
                forceLogout();
                return Promise.reject(error);
            }
            maskServerError(error.response);

            // Rate limited (429): safe to retry — the server rejected the
            // request before processing it. Honor Retry-After, retry once.
            if (
                error.response &&
                error.response.status === 429 &&
                originalRequest &&
                !originalRequest._retry429
            ) {
                originalRequest._retry429 = true;
                const waitMs = Math.min(
                    parseRetryAfterMs(error.response.headers?.['retry-after']) ?? RATE_LIMIT_DEFAULT_WAIT_MS,
                    RATE_LIMIT_MAX_WAIT_MS
                );
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                return api(originalRequest);
            }

            if (
                refreshOnAuthError &&
                error.response &&
                error.response.status === 401 &&
                !originalRequest._retry
            ) {
                originalRequest._retry = true;
                const currentUser = getStoredUser();
                if (currentUser?.token) {
                    try {
                        const newToken = await performTokenRefresh(currentUser);
                        originalRequest.headers['token'] = newToken;
                        return api(originalRequest);
                    } catch (e) {
                        console.error('Token refresh failed');
                    }
                }
            }
            return Promise.reject(error);
        }
    );

    return api;
};

export default createApiInstance;
