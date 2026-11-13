import { REACT_APP_CONTRACT_API_URL, apiPath } from '../apiPath';
import createApiInstance from '../createApiInstance';

const contractApi = createApiInstance(REACT_APP_CONTRACT_API_URL);

export const fetchLocalPricingAPI = () => contractApi.get(apiPath.priceListLocal);
export const fetchWorkerPromotionListAPI = (data) => contractApi.post(apiPath.invoiceWorkerPromotionList, data);
export const saveLocalPricingAPI = (data) => contractApi.post(apiPath.priceListLocal, data);
export const fetchOverseasPricingAPI = () => contractApi.get(apiPath.priceListOverseas);
export const saveOverseasPricingAPI = (data) => contractApi.post(apiPath.priceListOverseas, data);
export const fetchAgencyPricingAPI = (agencyId) => contractApi.get(`${apiPath.priceListAgencies}/${agencyId}`);
export const saveAgencyPricingAPI = (agencyId, data) => contractApi.post(`${apiPath.priceListAgencies}/${agencyId}`, data);
export const fetchDirectHirePricingAPI = () => contractApi.get(apiPath.priceListDirectHire);
export const saveDirectHirePricingAPI = (data) => contractApi.post(apiPath.priceListDirectHire, data);
export const fetchPriceListSkillsAPI = () => contractApi.get(apiPath.priceListSkills);
export const fetchCountryGroupsAPI = () => contractApi.get(apiPath.priceListCountryGroups);
export const saveCountryGroupsAPI = (data) => contractApi.post(apiPath.priceListCountryGroups, data);
export const fetchFixedItemsAPI = () => contractApi.get(apiPath.priceListFixedItems);
export const saveFixedItemsAPI = (data) => contractApi.post(apiPath.priceListFixedItems, data);
export const fetchItemsByServiceAPI = () => contractApi.get(apiPath.priceListItemsByService);
export const saveItemsByServiceAPI = (data) => contractApi.post(apiPath.priceListItemsByService, data);
export const fetchPromotionsAPI = () => contractApi.get(apiPath.priceListPromotions);
export const savePromotionsAPI = (data) => contractApi.post(apiPath.priceListPromotions, data);
export const saveWorkerPromotionAPI = (data) => contractApi.post(apiPath.workerPromotionSave, data);