import { SETTINGS_API_URL, apiPath, REACT_APP_REMOVE_BG_API_URL } from './apiPath';
import createApiInstance from './createApiInstance';

const api = createApiInstance(SETTINGS_API_URL);
const apiUrl = createApiInstance(REACT_APP_REMOVE_BG_API_URL);

export const getHolidays = (params) => api.get(apiPath.holidays, { params });
export const getHolidaysByStatusAPI = (params) => api.get(apiPath.holidayListByStatus, { params });
export const getOfficialHolidaysAPI = (params) => apiUrl.get(apiPath.officialHolidays, { params });
export const addNewHoliday = (holidayData) => api.post(apiPath.addHoliday, holidayData);
export const getHolidayById = (id) => api.get(apiPath.viewHoliday + id);
export const updateHolidayById = (holidayData) => api.patch(apiPath.updateHoliday, holidayData);