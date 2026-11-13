import { APP_URL } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(APP_URL, {
  sendTokenHeader: false,
  sendAuthHeader: true,
  tokenInBody: false,
  tokenInParams: false,
  refreshOnAuthError: false,
});

export default api;
