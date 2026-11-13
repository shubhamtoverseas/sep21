const handleFetchWorkerPromotionList = (state, action) => {
  state.status = 'succeeded';
  const workerPromotionData = action.payload?.data?.data || [];
  const paginationInfo = action.payload?.data;

  if (workerPromotionData.length > 0) {
    state.workerPromotionList = workerPromotionData; 
    state.currentPageWorkerPromotion = paginationInfo.current_page || 1; 
    state.perPageWorkerPromotion = paginationInfo.limit || 1; 
    state.totalPagesWorkerPromotion = paginationInfo.total_pages || 0; 
    state.totalWorkerPromotions = paginationInfo.total_count || 0; 
    state.lastUpdatedWorkerPromotion = paginationInfo.last_updated || '';
  } else {
    state.workerPromotionList = [];
    state.currentPageWorkerPromotion = 1; 
    state.perPageWorkerPromotion = 1; 
    state.totalPagesWorkerPromotion = 0; 
    state.totalWorkerPromotions = 0; 
    state.lastUpdatedWorkerPromotion = ''; 
  }
};

const handleSaveWorkerPromotionFulfilled = (state, action) => {
  state.status = "succeeded";
  state.message = action.payload?.message ?? state.message;
  if (!Array.isArray(state.workerPromotionList)) return;
  state.workerPromotionList = state.workerPromotionList.map((promotion) => {
    if (promotion.id === action.payload?.data?.id) {
      return action.payload?.data;
    }
    return promotion;
  });
};

/* PL-S1: the list and a successful save both answer with the whole Local schedule (values, masters, version). */
const handleLocalPricingFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.localPricing = action.payload?.data ?? state.localPricing;
};

/* PL-S3: each Overseas page's list and successful save answer with that page's whole schedule. */
const handleOverseasPricingFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.overseasPricing = action.payload?.data ?? state.overseasPricing;
};

const handleAgencyPricingFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.agencyPricing = action.payload?.data ?? state.agencyPricing;
};

const handleDirectHirePricingFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.directHirePricing = action.payload?.data ?? state.directHirePricing;
};

const handlePriceListSkillsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.priceListSkills = action.payload?.data ?? state.priceListSkills;
};

/* PL-S4: the Pricing countries list and a successful save answer with the whole page. */
const handleCountryGroupsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.countryGroups = action.payload?.data ?? state.countryGroups;
};

/* PL-S6: the Promotions list and a successful save answer with the whole page. */
const handlePromotionsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.promotions = action.payload?.data ?? state.promotions;
};

/* PL-S5: the Fixed items and Items by service lists and a successful save answer with the whole page. */
const handleFixedItemsFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.fixedItems = action.payload?.data ?? state.fixedItems;
};

const handleItemsByServiceFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.itemsByService = action.payload?.data ?? state.itemsByService;
};

export {
  handlePromotionsFulfilled,
  handleFetchWorkerPromotionList,
  handleSaveWorkerPromotionFulfilled,
  handleLocalPricingFulfilled,
  handleOverseasPricingFulfilled,
  handleAgencyPricingFulfilled,
  handleDirectHirePricingFulfilled,
  handlePriceListSkillsFulfilled,
  handleCountryGroupsFulfilled,
  handleFixedItemsFulfilled,
  handleItemsByServiceFulfilled,
};