import { APP_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const app = createApiInstance(APP_URL);

export const loginAppAPI = (payload) => app.post(apiPath.login, payload);
export const forgotPasswordAPI = (payload) => app.post(apiPath.forgotPassword, payload);
export const resetPasswordAPI = (payload) => app.post(apiPath.resetPassword, payload);
export const verifyOtpAPI = (payload) => app.post(apiPath.verifyOtp, payload);
export const logoutAppAPI = (payload) => app.post(apiPath.logout, payload);