import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';
import { fetchAgencyPricingAPI, fetchCountryGroupsAPI, fetchDirectHirePricingAPI, fetchFixedItemsAPI, fetchItemsByServiceAPI, fetchLocalPricingAPI, fetchOverseasPricingAPI, fetchPriceListSkillsAPI, fetchWorkerPromotionListAPI, saveAgencyPricingAPI, saveCountryGroupsAPI, saveDirectHirePricingAPI, saveFixedItemsAPI, saveItemsByServiceAPI, fetchPromotionsAPI, savePromotionsAPI, saveLocalPricingAPI, saveOverseasPricingAPI, saveWorkerPromotionAPI } from '../../../../services/settings/priceList';
import { handleAgencyPricingFulfilled, handleCountryGroupsFulfilled, handleDirectHirePricingFulfilled, handleFetchWorkerPromotionList, handleFixedItemsFulfilled, handleItemsByServiceFulfilled, handleLocalPricingFulfilled, handleOverseasPricingFulfilled, handlePromotionsFulfilled, handlePriceListSkillsFulfilled, handleSaveWorkerPromotionFulfilled } from './priceListExtraReducers';

export const fetchWorkerPromotionList = createAsyncThunk('priceList/fetchWorkerPromotionList', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await fetchWorkerPromotionListAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveWorkerPromotion = createAsyncThunk('priceList/saveWorkerPromotion', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await saveWorkerPromotionAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

/* Price List · Local (27 Oct package, PL-S1): the Local base fees and the Local replacement discount. */
export const fetchLocalPricing = createAsyncThunk('priceList/fetchLocalPricing', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchLocalPricingAPI();
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveLocalPricing = createAsyncThunk('priceList/saveLocalPricing', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await saveLocalPricingAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

/* Price List · Overseas, agency schedules, Direct Hire and Skills (27 Oct package, PL-S3). */
export const fetchOverseasPricing = createAsyncThunk('priceList/fetchOverseasPricing', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchOverseasPricingAPI();
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveOverseasPricing = createAsyncThunk('priceList/saveOverseasPricing', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await saveOverseasPricingAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchAgencyPricing = createAsyncThunk('priceList/fetchAgencyPricing', async (agencyId, { rejectWithValue }) => {
  try {
    const response = await fetchAgencyPricingAPI(agencyId);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveAgencyPricing = createAsyncThunk('priceList/saveAgencyPricing', async ({ agencyId, body }, { rejectWithValue }) => {
  try {
    const response = await saveAgencyPricingAPI(agencyId, body);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchDirectHirePricing = createAsyncThunk('priceList/fetchDirectHirePricing', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchDirectHirePricingAPI();
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveDirectHirePricing = createAsyncThunk('priceList/saveDirectHirePricing', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await saveDirectHirePricingAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchPriceListSkills = createAsyncThunk('priceList/fetchPriceListSkills', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchPriceListSkillsAPI();
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

/* Price List · Pricing countries (27 Oct package, PL-S4). */
export const fetchCountryGroups = createAsyncThunk('priceList/fetchCountryGroups', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchCountryGroupsAPI();
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveCountryGroups = createAsyncThunk('priceList/saveCountryGroups', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await saveCountryGroupsAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

/* Price List · Promotions (27 Oct package, PL-S6). */
export const fetchPromotions = createAsyncThunk('priceList/fetchPromotions', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchPromotionsAPI();
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const savePromotions = createAsyncThunk('priceList/savePromotions', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await savePromotionsAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

/* Price List · Fixed items and Items by service (27 Oct package, PL-S5). */
export const fetchFixedItems = createAsyncThunk('priceList/fetchFixedItems', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchFixedItemsAPI();
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveFixedItems = createAsyncThunk('priceList/saveFixedItems', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await saveFixedItemsAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchItemsByService = createAsyncThunk('priceList/fetchItemsByService', async (_, { rejectWithValue }) => {
  try {
    const response = await fetchItemsByServiceAPI();
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveItemsByService = createAsyncThunk('priceList/saveItemsByService', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await saveItemsByServiceAPI(reqPayload);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const priceListSlice = createSlice({
  name: 'priceList',
  initialState: {
    workerPromotionList: {}, 
    localPricing: null,
    overseasPricing: null,
    agencyPricing: null,
    directHirePricing: null,
    priceListSkills: null,
    countryGroups: null,
    fixedItems: null,
    itemsByService: null,
    promotions: null,
    status: 'success',
    error: null,
    message: null,
    currentPageWorkerPromotion: 1, 
    perPageWorkerPromotion: 1, 
    totalPagesWorkerPromotion: 0,
    totalWorkerPromotions: 0,
    lastUpdatedWorkerPromotion: '',
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkerPromotionList.pending, handlePending)
      .addCase(fetchWorkerPromotionList.fulfilled, handleFetchWorkerPromotionList)
      .addCase(fetchWorkerPromotionList.rejected, handleRejected)
      .addCase(saveWorkerPromotion.pending, handlePending)
      .addCase(saveWorkerPromotion.fulfilled, handleSaveWorkerPromotionFulfilled)
      .addCase(saveWorkerPromotion.rejected, handleRejected)

      .addCase(fetchLocalPricing.pending, handlePending)
      .addCase(fetchLocalPricing.fulfilled, handleLocalPricingFulfilled)
      .addCase(fetchLocalPricing.rejected, handleRejected)
      .addCase(saveLocalPricing.pending, handlePending)
      .addCase(saveLocalPricing.fulfilled, handleLocalPricingFulfilled)
      .addCase(saveLocalPricing.rejected, handleRejected)

      .addCase(fetchOverseasPricing.pending, handlePending)
      .addCase(fetchOverseasPricing.fulfilled, handleOverseasPricingFulfilled)
      .addCase(fetchOverseasPricing.rejected, handleRejected)
      .addCase(saveOverseasPricing.pending, handlePending)
      .addCase(saveOverseasPricing.fulfilled, handleOverseasPricingFulfilled)
      .addCase(saveOverseasPricing.rejected, handleRejected)
      .addCase(fetchAgencyPricing.pending, handlePending)
      .addCase(fetchAgencyPricing.fulfilled, handleAgencyPricingFulfilled)
      .addCase(fetchAgencyPricing.rejected, handleRejected)
      .addCase(saveAgencyPricing.pending, handlePending)
      .addCase(saveAgencyPricing.fulfilled, handleAgencyPricingFulfilled)
      .addCase(saveAgencyPricing.rejected, handleRejected)
      .addCase(fetchDirectHirePricing.pending, handlePending)
      .addCase(fetchDirectHirePricing.fulfilled, handleDirectHirePricingFulfilled)
      .addCase(fetchDirectHirePricing.rejected, handleRejected)
      .addCase(saveDirectHirePricing.pending, handlePending)
      .addCase(saveDirectHirePricing.fulfilled, handleDirectHirePricingFulfilled)
      .addCase(saveDirectHirePricing.rejected, handleRejected)
      .addCase(fetchPriceListSkills.pending, handlePending)
      .addCase(fetchPriceListSkills.fulfilled, handlePriceListSkillsFulfilled)
      .addCase(fetchPriceListSkills.rejected, handleRejected)
      .addCase(fetchCountryGroups.pending, handlePending)
      .addCase(fetchCountryGroups.fulfilled, handleCountryGroupsFulfilled)
      .addCase(fetchCountryGroups.rejected, handleRejected)
      .addCase(saveCountryGroups.pending, handlePending)
      .addCase(saveCountryGroups.fulfilled, handleCountryGroupsFulfilled)
      .addCase(saveCountryGroups.rejected, handleRejected)
      .addCase(fetchFixedItems.pending, handlePending)
      .addCase(fetchFixedItems.fulfilled, handleFixedItemsFulfilled)
      .addCase(fetchFixedItems.rejected, handleRejected)
      .addCase(saveFixedItems.pending, handlePending)
      .addCase(saveFixedItems.fulfilled, handleFixedItemsFulfilled)
      .addCase(saveFixedItems.rejected, handleRejected)
      .addCase(fetchItemsByService.pending, handlePending)
      .addCase(fetchItemsByService.fulfilled, handleItemsByServiceFulfilled)
      .addCase(fetchItemsByService.rejected, handleRejected)
      .addCase(saveItemsByService.pending, handlePending)
      .addCase(saveItemsByService.fulfilled, handleItemsByServiceFulfilled)
      .addCase(saveItemsByService.rejected, handleRejected)
      .addCase(fetchPromotions.pending, handlePending)
      .addCase(fetchPromotions.fulfilled, handlePromotionsFulfilled)
      .addCase(fetchPromotions.rejected, handleRejected)
      .addCase(savePromotions.pending, handlePending)
      .addCase(savePromotions.fulfilled, handlePromotionsFulfilled)
      .addCase(savePromotions.rejected, handleRejected);
      
  },
});


export default priceListSlice.reducer;
