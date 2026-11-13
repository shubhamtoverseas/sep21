import { REACT_APP_PROMPT_AI_COPYWRITER_URL, REACT_APP_AL_X_API_KEY, apiPath } from '../apiPath';
import createApiInstance from '../createApiInstance';

const api = createApiInstance(REACT_APP_PROMPT_AI_COPYWRITER_URL, {
    apiKey: REACT_APP_AL_X_API_KEY,
    sendTokenHeader: false,
    sendAuthHeader: false,
});

export const getPromptManagerListAPI = (params) => api.get(apiPath.promptsManager, { params });
export const createPromptManagerAPI = (data) => api.post(apiPath.promptsManager, data);
export const updatePromptManagerAPI = (data) => api.put(`${ apiPath.promptsManager }${ data.id }`, data);
export const deletePromptManagerAPI = (id) => api.delete(`${ apiPath.promptsManager }${ id }`);
export const togglePromptManagerAPI = (data) => api.put(`${ apiPath.promptsManager }${ data.id }/toggle?is_active=${ data.is_active }`);
