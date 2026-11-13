import { apiPath, APP_URL, HRMS_API_URL, REACT_APP_X_API_KEY, HOST_TYPE } from './apiPath';
import app from './appClient';
import { getLocalTimeZone } from './commonService';
import createApiInstance from './createApiInstance';
const hrmApi = createApiInstance(HRMS_API_URL);

export const getCountries = (reqPayload) => app.post((APP_URL + apiPath.countries), reqPayload, {
    headers: {
        'language': localStorage.getItem('i18nextLng'),
        'Accept-Language': localStorage.getItem('i18nextLng'),
        'timezone': getLocalTimeZone(),
        'x-api-key': REACT_APP_X_API_KEY,
        'hosttype': HOST_TYPE,
        'device': navigator.userAgent
    }
});
export const getLocations = (params) => app.get(APP_URL + apiPath.locations, { params });
export const getDistrict = (payload) => app.post((APP_URL + apiPath.employerDistrict), payload);
export const getDistrictByCountryCode = (countryCode) => app.get((APP_URL + apiPath.getDistrictByCountryCode + '/' + countryCode));
export const getspokenLanguage = (params) => app.get((APP_URL + apiPath.getLanguage), { params });
export const getNotificationList = (params) => hrmApi.get(apiPath.notificationList, { params });
export const getNotificationUnreadCount = (params) => hrmApi.get(apiPath.notificationUnreadCount, { params });
export const setNotificationMarkRead = (params) => hrmApi.post(apiPath.notificationMarkRead, params);
export const setNotificationMarkAsUnread = (params) => hrmApi.post(apiPath.notificationMarkAsUnread, params);
export const setNotificationMarkAllRead = () => hrmApi.post(apiPath.notificationMarkAllRead, {});
export const getMaritalStatus = (params) => app.get((APP_URL + apiPath.getMaritalStatus), { params });
export const getTimeZoneAPI = (params) => app.get((APP_URL + apiPath.timeZoneList), { params });
export const getNumberCounter = (params) => app.get((APP_URL + apiPath.getNumberCounter), { params });
export const getChildCareAgeList = (params) => app.get((APP_URL + apiPath.getChildCareAgeList), { params });
export const getChildCareDuties = (params) => app.get((APP_URL + apiPath.getChildCareDuties), { params });
export const getElderlyCareDuties = (params) => app.get((APP_URL + apiPath.getElderlyCareDuties), { params });
export const getHouseholdChores = (params) => app.get((APP_URL + apiPath.getHouseHoldChores), { params });
export const getReligionList = (params) => app.get((APP_URL + apiPath.getReligionList), { params });
export const getFlexibleDate = (params) => app.get((APP_URL + apiPath.getFlexibleDate), { params });
export const getContractStatus = (params) => app.get((APP_URL + apiPath.getContractStatus), { params });
export const getMainSkills = (params) => app.get((APP_URL + apiPath.getMainSkills), { params });
export const getHeightList = (params) => app.get((APP_URL + apiPath.workerHeightMeasurement), { params });
export const getCookingList = (params) => app.get((APP_URL + apiPath.getCookingList), { params });
export const getPetListAPI = (params) => app.get((APP_URL + apiPath.getPetList), { params });
export const getCourseList = (params) => app.get((APP_URL + apiPath.getCourseList), { params });
export const getEducationList = (params) => app.get((APP_URL + apiPath.getEducationList), { params });
export const getAccommodation = (params) => app.get((APP_URL + apiPath.getAccommodation), { params });
export const getExpexctedSalary = (params) => app.get((APP_URL + apiPath.getExpectedSalary), { params });
export const getLanguage = (params) => app.get((APP_URL + apiPath.getLanguage), { params });
export const getDayOffList = (params) => app.get((APP_URL + apiPath.getDayOffList), { params });
export const getNationalities = (params) => app.get((APP_URL + apiPath.nationalities), { params });
export const getWorkerStatuses = (params) => app.get((APP_URL + apiPath.getWorkerStatus), { params });
export const getInterviewDayList = (params) => app.get((APP_URL + apiPath.getInterviewDayList), { params });
export const getGenderList = (params) => app.get((APP_URL + apiPath.workerGender), { params });
export const getWorkerProfileStatus = (params) => app.get((APP_URL + apiPath.getWorkerProfileStatus), { params });
export const getTerminationReason = (params) => app.get((APP_URL + apiPath.getTerminationReason), { params });
export const shiftExperienceAPI = (payload) => app.post((APP_URL + apiPath.shiftExperience),  payload );
export const checkDuplicateEmailAPI = (payload) => app.get((APP_URL + apiPath.checkDuplicateEmail),  { params: payload } );
export const checkDuplicateMobileAPI = (payload) => app.post((APP_URL + apiPath.checkDuplicateMobile), payload);
