import { HRMS_API_URL, apiPath } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(HRMS_API_URL);

export const getProfile = () => api.get(apiPath.profile);
export const updateProfile = (profileData) => api.patch(apiPath.updateProfile, profileData);
export const uploadProfileImageAPI = (profileData) => api.post(apiPath.uploadProfileImage, profileData);

