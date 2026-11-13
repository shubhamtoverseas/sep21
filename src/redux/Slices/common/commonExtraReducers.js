import translation from "../../../utils/translation";

const handleMaritalStatusFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.maritalStatus = action.payload?.data ?? state.maritalStatus;
};

const handleTimeZoneFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.timeZones = action.payload?.data;
};

const handleNumberCounterFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.numberCounter = action.payload?.data ?? state.numberCounter;
};

const handleReligionListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.religionList = action.payload?.data ?? state.religionList;
};

const handleFlexibleDateFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.flexibleDates = action.payload?.data ?? state.flexibleDates;
};

const handleContractStatusFulfilled = (state, action) => {
    state.status = 'succeeded';
    const { group } = action.meta.arg; 
    if (group) {
        state.contractStatusGroupWise = action.payload?.data ?? state.contractStatusGroupWise;
    } else {
        state.contractStatus = action.payload?.data ?? state.contractStatus;
    }
};

const handleMainSkillsFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.mainSkills = action.payload?.data ?? state.mainSkills;
};

const handleCookingListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.cookingList = action.payload?.data ?? state.cookingList;
};

const handleGetPetListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.petList = action.payload?.data ?? state.petList;
}

const handleCourseListFulfilled = (state, action) => {
  state.status = 'succeeded';
  if (action?.payload?.data && action.payload?.data?.length > 0) {
    const { type } = action.meta.arg;
    const baseList = action.payload?.data;

    state.courseList =
      type !== 'employer'
        ? [{ id: 0, name_en: "None", name: translation("key_none") }, ...baseList]
        : baseList;
  } else {
    state.courseList = [];
  }
};
const handleEducationListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.educationList = action.payload?.data ?? state.educationList;
};
const handleAccomodationFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.accommodations = action.payload?.data ?? state.accommodations;
};
const handleExpectedSalaryFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.expectedSalaryList = action.payload?.data ?? state.expectedSalaryList;
};
const handleLanguageListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.languages = action.payload?.data ?? state.languages;
};
const handleDayOffListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.dayOffList = action.payload?.data ?? state.dayOffList;
};

const handleInterviewDayListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.interviewDayList = action.payload?.data ?? state.interviewDayList;
}
const handleSpokenLanguageListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.spokenLanguages = action.payload?.data ?? state.spokenLanguages;
    state.message = action.payload?.message ?? state.message;

};
const handleGenderListListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.genderList = action.payload?.data ?? state.genderList;
}

const handleHeightListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.heightList = action.payload?.data ?? state.heightList;
}

const handleChildCareAgeListFulfilled = (state, action) => {
    state.childCareAgeList = action.payload?.data ?? state.childCareAgeList;
    state.status = 'succeeded';
};

const handleChildCareDutiesFulfilled = (state, action) => {
    state.childCareDuties = action.payload?.data ?? state.childCareDuties;
    state.status = 'succeeded';
};

const handleElderlyCareDutiesFulfilled = (state, action) => {
    state.elderlyCareDuties = action.payload?.data ?? state.elderlyCareDuties;
    state.status = 'succeeded';
};

const handleHouseholdChoresFulfilled = (state, action) => {
    state.householdChores = action.payload?.data ?? state.householdChores;
    state.status = 'succeeded';
};

const handleSpokenLanguageWorkerListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.spokenLanguagesList = action.payload?.data ?? state.spokenLanguagesList;
}

const handleSpokenLanguageEmployerListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.spokenLanguagesListEmp = action.payload?.data ?? state.spokenLanguagesListEmp;
}

const handleFetchNotificationListFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.notificationList = action.payload?.data ?? state.notificationList;
}

const handlefetchContractWorkerStatusFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.workerContractStatus = action.payload?.data ?? state.workerContractStatus;
}

/* the unread count: from /get-unread-count and from every read-state reply (`total` = the caller's new unread count) */
const handleFetchNotificationUnreadCountFulfilled = (state, action) => {
    state.status = 'succeeded';
    if (action.payload && typeof action.payload.total === 'number') state.notificationUnreadCount = action.payload.total;
    else if (action.payload?.total !== undefined) state.notificationUnreadCount = Number(action.payload.total) || 0;
}

const handleShiftExperienceFulfilled = (state) => {
    state.status = 'succeeded';
}

const handleCheckDuplicateEmailFulfilled = (state) => {
    state.status = 'succeeded';
}

const handleCheckDuplicateMobileFulfilled = (state) => {
    state.status = 'succeeded';
}


export {
    handleMaritalStatusFulfilled,
    handleTimeZoneFulfilled,
    handleNumberCounterFulfilled,
    handleReligionListFulfilled,
    handleFlexibleDateFulfilled,
    handleContractStatusFulfilled,
    handleMainSkillsFulfilled,
    handleCookingListFulfilled,
    handleGetPetListFulfilled,
    handleCourseListFulfilled,
    handleEducationListFulfilled,
    handleAccomodationFulfilled,
    handleExpectedSalaryFulfilled,
    handleLanguageListFulfilled,
    handleDayOffListFulfilled,
    handleInterviewDayListFulfilled,
    handleSpokenLanguageListFulfilled,
    handleGenderListListFulfilled,
    handleHeightListFulfilled,
    handleChildCareAgeListFulfilled,
    handleChildCareDutiesFulfilled,
    handleElderlyCareDutiesFulfilled,
    handleHouseholdChoresFulfilled,
    handleSpokenLanguageWorkerListFulfilled,
    handleSpokenLanguageEmployerListFulfilled,
    handleFetchNotificationListFulfilled,
    handlefetchContractWorkerStatusFulfilled,
    handleFetchNotificationUnreadCountFulfilled,
    handleShiftExperienceFulfilled,
    handleCheckDuplicateEmailFulfilled,
    handleCheckDuplicateMobileFulfilled
};
