const handleFetchEmployersFulfilled = (state, action) => {
  state.status = 'succeeded';
  const { context } = action.meta.arg;

  if (context !== 'search') {
    const body = action.payload?.data;
    /* backend 375 (E-20a): `last_update` sits at data.last_update; when nothing matches the envelope is `data: []` with none */
    state.lastUpdated = body?.last_update ?? action.payload?.last_update ?? state.lastUpdated;
    if (Array.isArray(body)) {
      /* E-21: a `restricted` viewer gets at most 10 rows as a plain array — no paginator */
      state.employers = body;
      state.currentPage = 1;
      state.perPage = body.length || 10;
      state.totalPages = 1;
      state.totalEmployers = body.length;
      state.totalAccessible = 0;
    } else if (body && body.data) {
      state.employers = body.data ?? state.employers;
      state.currentPage = body.current_page ?? state.currentPage;
      state.perPage = body.per_page ?? state.perPage;
      state.totalPages = body.last_page ?? state.totalPages;
      state.totalEmployers = body.total ?? state.totalEmployers;
      /* E-15a: the unfiltered accessible population (location + branch scope only) */
      state.totalAccessible = Number(body.total_accessible) || 0;
    } else {
      state.employers = [];
      state.currentPage = 1;
      state.perPage = 10;
      state.totalPages = 0;
      state.totalEmployers = 0;
      state.totalAccessible = 0;
    }
  }
};

const handleFetchDuplicateEmployersFulfilled = (state, action) => {
  state.status = 'succeeded';
  if (action.payload && action.payload?.data && action.payload?.data?.data) {
    state.duplicateEmployers = action.payload?.data?.data ?? state.duplicateEmployers;
    state.currentPage = action.payload?.data?.current_page ?? state.currentPage;
    state.perPage = action.payload?.data?.per_page ?? state.perPage;
    state.totalPages = action.payload?.data?.last_page ?? state.totalPages;
    state.totalEmployers = action.payload?.data?.total ?? state.totalEmployers;
    state.lastUpdated = action.payload?.data?.last_update ?? state.lastUpdated;
    state.employerIDs = action.payload?.data?.employer_ids || [];
  } else {
    state.duplicateEmployers = action.payload || [];
    state.currentPage = 1;
    state.perPage = 10;
    state.totalPages = 0;
    state.totalEmployers = 0;
    state.lastUpdated = action.payload?.data?.last_update ?? state.lastUpdated;
    state.employerIDs = [];
  }
};

const handleEmpJobOffersFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.empJobOffers = action.payload?.data ?? state.empJobOffers;
};

const handleFetchEmployerFulfilled = (state, action) => {
  state.status = 'succeeded';
  /* audit P-09: a 200 `{ status:false, data:null }` (unknown record) must not throw here — the record hook then shows
     the neutral "could not be opened" state instead of a crashed reducer */
  const data = action.payload?.data;
  if (!data) return;
  state.currentEmployer = { ...data, id: data.employer_id || 0, user_id: data.employer_user_id || 0 };
};

const handleAddEmployerAddressFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.currentEmployer.address_count = state.currentEmployer.address_count + 1;

};
const handleAddEmployerFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};
const handleUpdateEmployerAddressFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  const updatedEmpAddressIndex = state.addresses.findIndex(address => address.id === action.payload?.data?.id);
  if (updatedEmpAddressIndex === -1) {
    return;
  }
  const updatedAddress = state.addresses[updatedEmpAddressIndex];
  updatedAddress.address_line_1 = action.payload?.data?.address_line_1;
  updatedAddress.type = action.payload?.data?.type;

  if (updatedAddress.default === 1) {
    const primaryAddressKey = updatedAddress.type === 1 ? 'primary_residential_address' :
      updatedAddress.type === 2 ? 'primary_correspondence_address' :
        null;

    if (primaryAddressKey) {
      if (state.currentEmployer[primaryAddressKey] === null) {
        state.currentEmployer[primaryAddressKey] = {};
      }
      state.currentEmployer[primaryAddressKey].address_line_1 = updatedAddress.address_line_1;
    }
  }
};

const handleAddEmpCurrentWorkerFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentWorkers.push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

const handleDeleteEmpCurrentWorkerFulfilled = (state, action) => {
  state.status = 'succeeded';
  const employerWorkerId = action.payload?.data?.[0]?.id;
  state.currentWorkers = state.currentWorkers.filter(worker => worker.id !== employerWorkerId);
  state.message = action.payload?.message ?? state.message;
};

const handleEmployerAddressListFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.addresses = action.payload?.data ?? state.addresses;
};

const handleDeleteEmpAddressFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  state.currentEmployer.address_count = Math.max(0, state.currentEmployer.address_count - 1);

  // Get the deleted address ID
  const deletedAddressId = action.payload?.data[0]?.address_id;

  // Find the address before removing it to check its type
  const deletedAddress = state.addresses.find(address => address.id === deletedAddressId);

  // Remove the address from the addresses array
  state.addresses = state.addresses.filter(address => address.id !== deletedAddressId);

  // If the deleted address was a default address, remove it from currentEmployer
  if (deletedAddress) {
    if (deletedAddress.type === 1 && state.currentEmployer.primary_residential_address?.address_line_1 === deletedAddress.address_line_1) {
      state.currentEmployer.primary_residential_address = null;
    } else if (deletedAddress.type === 2 && state.currentEmployer.primary_correspondence_address?.address_line_1 === deletedAddress.address_line_1) {
      state.currentEmployer.primary_correspondence_address = null;
    }
  }

};

const handleUpdateEmpCurrentWorkerFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  const updatedEmpWorkerIndex = state.currentWorkers.findIndex(currentWorker => currentWorker.id === action.payload?.data?.id);
  if (updatedEmpWorkerIndex !== -1) {
    state.currentWorkers[updatedEmpWorkerIndex] = action.payload?.data;
  }
};

const handleDefaultEmpAddressFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;

  state.addresses.forEach(address => {
    address.default = address.id === action.payload?.data?.id ? action.payload?.data?.default : 0;
  });

  state.addresses.forEach(address => {
    address.default = address.id === action.payload?.data?.id ? action.payload?.data?.default : 0;
    if (address.default) {
      const primaryAddressKey = address.type === 1 ? 'primary_residential_address' :
        address.type === 2 ? 'primary_correspondence_address' :
          null;
      if (primaryAddressKey) {
        if (state.currentEmployer[primaryAddressKey] === null) {
          state.currentEmployer[primaryAddressKey] = {};
        }
        state.currentEmployer[primaryAddressKey].address_line_1 = address.address_line_1;
      }
    }
  });
};

const handleDFetchWorkerFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentWorkers = action.payload?.data ?? state.currentWorkers;
};

const handleSpokenLanguageFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.spokenLanguages = action.payload?.data ?? state.spokenLanguages;
  state.message = action.payload?.message ?? state.message;
};

const handleSendOtpFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};

const handleSaveEmpInfoFulfilled = (state, action) => {
  state.status = 'succeeded';
  // const updatedData = action.payload?.data[0];
  state.message = action.payload?.message ?? state.message;
  // state.currentEmployer = {
  //   ...state.currentEmployer,
  //   expecting_baby_count: updatedData.expecting_baby_count,
  //   special_needs_count: updatedData.special_needs_count,
  //   adult_count: updatedData.adult_count,
  //   child_age_below_5_count: updatedData.child_age_below_5_count,
  //   child_age_5_8_count: updatedData.child_age_5_8_count,
  //   family_members: updatedData.family_member_info
  //     .filter(member => !member.deleted_at)
  //     .map(member => ({
  //       ...state.currentEmployer.family_members.find(fm => fm.id === member.id) || {},
  //       ...member
  //     }))
  // };
};
const handleUpdateEmpBasicFulfilled = (state, action) => {
  state.status = 'succeeded';
  const updatedData = action.payload?.data;
  Object.keys(updatedData).forEach(key => {
    if (key !== 'spoken_language') {
      state.currentEmployer[key] = updatedData[key];
    }
  });
};

const handleUpdateEmployerBanOrRemoveStatusFulfilled = (state) => {
  state.status = 'succeeded';
}

export {
  handleFetchEmployersFulfilled,
  handleEmpJobOffersFulfilled,
  handleFetchEmployerFulfilled,
  handleAddEmployerFulfilled,
  handleAddEmployerAddressFulfilled,
  handleUpdateEmployerAddressFulfilled,
  handleUpdateEmpCurrentWorkerFulfilled,
  handleAddEmpCurrentWorkerFulfilled,
  handleDeleteEmpCurrentWorkerFulfilled,
  handleEmployerAddressListFulfilled,
  handleDeleteEmpAddressFulfilled,
  handleDefaultEmpAddressFulfilled,
  handleDFetchWorkerFulfilled,
  handleSpokenLanguageFulfilled,
  handleSaveEmpInfoFulfilled,
  handleSendOtpFulfilled,
  handleUpdateEmpBasicFulfilled,
  handleFetchDuplicateEmployersFulfilled,
  handleUpdateEmployerBanOrRemoveStatusFulfilled
};