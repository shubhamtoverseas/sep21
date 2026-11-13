import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAccommodation, getContractStatus, getCookingList, getCourseList, getDayOffList, getEducationList, getExpexctedSalary, getFlexibleDate, getLanguage, getMainSkills, getMaritalStatus, getReligionList, getspokenLanguage, getInterviewDayList, setNotificationMarkRead, setNotificationMarkAsUnread, setNotificationMarkAllRead, getGenderList, getHeightList, getNumberCounter, getHouseholdChores, getChildCareDuties, getChildCareAgeList, getElderlyCareDuties, getNotificationList, getNotificationUnreadCount, getPetListAPI, getTimeZoneAPI, getTerminationReason, shiftExperienceAPI, checkDuplicateEmailAPI, checkDuplicateMobileAPI } from '../../../services/commonApi';
import { handleAccomodationFulfilled, handleContractStatusFulfilled, handleCookingListFulfilled, handleCourseListFulfilled, handleDayOffListFulfilled, handleEducationListFulfilled, handleExpectedSalaryFulfilled, handleFlexibleDateFulfilled, handleLanguageListFulfilled, handleMainSkillsFulfilled, handleMaritalStatusFulfilled, handleReligionListFulfilled, handleSpokenLanguageListFulfilled, handleInterviewDayListFulfilled, handleGenderListListFulfilled, handleHeightListFulfilled, handleNumberCounterFulfilled, handleHouseholdChoresFulfilled, handleElderlyCareDutiesFulfilled, handleChildCareDutiesFulfilled, handleChildCareAgeListFulfilled, handleSpokenLanguageWorkerListFulfilled, handleSpokenLanguageEmployerListFulfilled, handleFetchNotificationListFulfilled, handleGetPetListFulfilled, handlefetchContractWorkerStatusFulfilled, handleTimeZoneFulfilled, handleFetchNotificationUnreadCountFulfilled, handleShiftExperienceFulfilled, handleCheckDuplicateEmailFulfilled, handleCheckDuplicateMobileFulfilled } from './commonExtraReducers';

import { handlePending, handleRejected } from './extra-reducers/commonExtraReducers';

export const fetchMaritalStatus = createAsyncThunk('common/fetchMaritalStatus', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getMaritalStatus(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchTimeZone = createAsyncThunk('common/fetchTimeZone', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getTimeZoneAPI(reqPayload);
        return response.data?.original;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchNumberCounter = createAsyncThunk('common/fetchNumberCounter', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getNumberCounter(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchChildCareAgeList = createAsyncThunk('common/fetchChildCareAgeList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getChildCareAgeList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchChildCareDuties = createAsyncThunk('common/fetchChildCareDuties', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getChildCareDuties(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchElderlyCareDuties = createAsyncThunk('common/fetchElderlyCareDuties', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getElderlyCareDuties(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchHouseholdChores = createAsyncThunk('common/fetchHouseholdChores', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getHouseholdChores(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchReligionList = createAsyncThunk('common/fetchReligionList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getReligionList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});


export const fetchFlexibleDate = createAsyncThunk('common/fetchFlexibleDate', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getFlexibleDate(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchContractStatus = createAsyncThunk('common/fetchContractStatus', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getContractStatus(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchContractWorkerStatus = createAsyncThunk('common/fetchContractWorkerStatus', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getContractStatus(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchMainSkills = createAsyncThunk('common/fetchMainSkills', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getMainSkills(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchHeghtList = createAsyncThunk('common/fetchHeghtList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getHeightList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchCookingList = createAsyncThunk('common/fetchCookingList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getCookingList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchPetList = createAsyncThunk('common/fetchPetList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getPetListAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchCourseList = createAsyncThunk('common/fetchCourseList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getCourseList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchEducationList = createAsyncThunk('common/fetchEducationList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getEducationList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchAccommodation = createAsyncThunk('common/fetchAccommodation', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getAccommodation(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});


export const fetchExpectedSalary = createAsyncThunk('common/fetchExpectedSalary', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getExpexctedSalary(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchLanguageList = createAsyncThunk('common/fetchLanguageList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getLanguage(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});
export const fetchSpokenLanguageList = createAsyncThunk('common/fetchSpokenLanguageList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getspokenLanguage(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});
export const fetchDayOffList = createAsyncThunk('common/fetchDayOffList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getDayOffList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchInterviewDayList = createAsyncThunk('common/fetchInterviewDayList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getInterviewDayList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchGetGenderList = createAsyncThunk('common/fetchGetGenderList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getGenderList(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});
export const fetchSpokenLanguageWorkerList = createAsyncThunk('common/fetchSpokenLanguageWorkerList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getspokenLanguage(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});
export const fetchSpokenEmployerLanguageList = createAsyncThunk('common/fetchSpokenEmployerLanguageList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getspokenLanguage(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchNotificationList = createAsyncThunk('common/fetchNotificationList', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getNotificationList(reqPayload);
        return response.data?.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const fetchNotificationUnreadCount = createAsyncThunk('common/fetchNotificationUnreadCount', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getNotificationUnreadCount(reqPayload);
        return response.data?.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

/* read state (hrms API, 14 Oct): mark-read · mark-as-unread · mark-all-as-read; every reply carries `total`, the caller's new unread count */
const readThunk = (name, call) => createAsyncThunk(name, async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await call(reqPayload);
        return response.data?.data;
    } catch (error) {
        return rejectWithValue(error.response?.data);
    }
});
export const notificationMarkRead = readThunk('common/notificationMarkRead', setNotificationMarkRead);
export const notificationMarkAsUnread = readThunk('common/notificationMarkAsUnread', setNotificationMarkAsUnread);
export const notificationMarkAllRead = readThunk('common/notificationMarkAllRead', setNotificationMarkAllRead);

export const fetchTerminationReason = createAsyncThunk('common/fetchTerminationReason', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await getTerminationReason(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const shiftExperience = createAsyncThunk('common/shiftExperience', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await shiftExperienceAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const checkDuplicateEmail = createAsyncThunk('common/checkDuplicateEmail', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await checkDuplicateEmailAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

export const checkDuplicateMobile = createAsyncThunk('common/checkDuplicateMobile', async (reqPayload, { rejectWithValue }) => {
    try {
        const response = await checkDuplicateMobileAPI(reqPayload);
        return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
});

const CommonSlice = createSlice({
    name: 'common',
    initialState: {
        maritalStatus: [],
        timeZones: [],
        numberCounter: [],
        religionList: [],
        flexibleDates: [],
        contractStatus: [],
        workerContractStatus: [],
        contractStatusGroupWise: [],
        mainSkills: [],
        cookingList: [],
        courseList: [],
        genderList: [],
        educationList: [],
        accommodations: [],
        expectedSalaryList: [],
        dayOffList: [],
        interviewDayList: [],
        languages: [],
        spokenLanguages: [],
        spokenLanguagesList: [],
        spokenLanguagesListEmp: [],
        heightList: [],
        childCareAgeList: [],
        childCareDuties: [],
        elderlyCareDuties: [],
        householdChores: [],
        terminationReasons: [],
        notificationList: [],
        petList: [],
        notificationUnreadCount: 0,
        message: '',
        status: 'idle',
        error: null,
        isDensePadding: false,
        receivedNotification: null,
    },
    reducers: {
        clearMessage(state) {
            state.message = null;
            state.error = null;
        },
        toggleDensePadding: (state) => {
            state.isDensePadding = !state.isDensePadding;
        },
        setDensePadding: (state, action) => {
            state.isDensePadding = action.payload;
        },
        setReceivedNotification: (state, action) => {
            state.receivedNotification = action.payload;
        },
        clearReceivedNotification: (state) => {
            state.receivedNotification = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMaritalStatus.pending, handlePending)
            .addCase(fetchMaritalStatus.fulfilled, handleMaritalStatusFulfilled)
            .addCase(fetchMaritalStatus.rejected, handleRejected)
            .addCase(fetchTimeZone.pending, handlePending)
            .addCase(fetchTimeZone.fulfilled, handleTimeZoneFulfilled)
            .addCase(fetchTimeZone.rejected, handleRejected)
            .addCase(fetchNumberCounter.pending, handlePending)
            .addCase(fetchNumberCounter.fulfilled, handleNumberCounterFulfilled)
            .addCase(fetchNumberCounter.rejected, handleRejected)
            .addCase(fetchReligionList.pending, handlePending)
            .addCase(fetchReligionList.fulfilled, handleReligionListFulfilled)
            .addCase(fetchReligionList.rejected, handleRejected)
            .addCase(fetchFlexibleDate.pending, handlePending)
            .addCase(fetchFlexibleDate.fulfilled, handleFlexibleDateFulfilled)
            .addCase(fetchFlexibleDate.rejected, handleRejected)
            .addCase(fetchContractStatus.pending, handlePending)
            .addCase(fetchContractStatus.fulfilled, handleContractStatusFulfilled)
            .addCase(fetchContractStatus.rejected, handleRejected)
            .addCase(fetchMainSkills.pending, handlePending)
            .addCase(fetchMainSkills.fulfilled, handleMainSkillsFulfilled)
            .addCase(fetchMainSkills.rejected, handleRejected)
            .addCase(fetchCookingList.pending, handlePending)
            .addCase(fetchCookingList.fulfilled, handleCookingListFulfilled)
            .addCase(fetchCookingList.rejected, handleRejected)
            .addCase(fetchPetList.pending, handlePending)
            .addCase(fetchPetList.fulfilled, handleGetPetListFulfilled)
            .addCase(fetchPetList.rejected, handleRejected)
            .addCase(fetchCourseList.pending, handlePending)
            .addCase(fetchCourseList.fulfilled, handleCourseListFulfilled)
            .addCase(fetchCourseList.rejected, handleRejected)
            .addCase(fetchEducationList.pending, handlePending)
            .addCase(fetchEducationList.fulfilled, handleEducationListFulfilled)
            .addCase(fetchEducationList.rejected, handleRejected)
            .addCase(fetchAccommodation.pending, handlePending)
            .addCase(fetchAccommodation.fulfilled, handleAccomodationFulfilled)
            .addCase(fetchAccommodation.rejected, handleRejected)
            .addCase(fetchExpectedSalary.pending, handlePending)
            .addCase(fetchExpectedSalary.fulfilled, handleExpectedSalaryFulfilled)
            .addCase(fetchExpectedSalary.rejected, handleRejected)
            .addCase(fetchLanguageList.pending, handlePending)
            .addCase(fetchLanguageList.fulfilled, handleLanguageListFulfilled)
            .addCase(fetchLanguageList.rejected, handleRejected)
            .addCase(fetchSpokenLanguageList.pending, handlePending)
            .addCase(fetchSpokenLanguageList.fulfilled, handleSpokenLanguageListFulfilled)
            .addCase(fetchSpokenLanguageList.rejected, handleRejected)
            .addCase(fetchDayOffList.pending, handlePending)
            .addCase(fetchDayOffList.fulfilled, handleDayOffListFulfilled)
            .addCase(fetchDayOffList.rejected, handleRejected)
            .addCase(fetchInterviewDayList.pending, handlePending)
            .addCase(fetchInterviewDayList.fulfilled, handleInterviewDayListFulfilled)
            .addCase(fetchInterviewDayList.rejected, handleRejected)
            .addCase(fetchGetGenderList.pending, handlePending)
            .addCase(fetchGetGenderList.fulfilled, handleGenderListListFulfilled)
            .addCase(fetchGetGenderList.rejected, handleRejected)
            .addCase(fetchHeghtList.pending, handlePending)
            .addCase(fetchHeghtList.fulfilled, handleHeightListFulfilled)
            .addCase(fetchHeghtList.rejected, handleRejected)
            .addCase(fetchChildCareAgeList.pending, handlePending)
            .addCase(fetchChildCareAgeList.fulfilled, handleChildCareAgeListFulfilled)
            .addCase(fetchChildCareAgeList.rejected, handleRejected)
            .addCase(fetchChildCareDuties.pending, handlePending)
            .addCase(fetchChildCareDuties.fulfilled, handleChildCareDutiesFulfilled)
            .addCase(fetchChildCareDuties.rejected, handleRejected)
            .addCase(fetchElderlyCareDuties.pending, handlePending)
            .addCase(fetchElderlyCareDuties.fulfilled, handleElderlyCareDutiesFulfilled)
            .addCase(fetchElderlyCareDuties.rejected, handleRejected)
            .addCase(fetchHouseholdChores.pending, handlePending)
            .addCase(fetchHouseholdChores.fulfilled, handleHouseholdChoresFulfilled)
            .addCase(fetchHouseholdChores.rejected, handleRejected)
            .addCase(fetchSpokenLanguageWorkerList.pending, handlePending)
            .addCase(fetchSpokenLanguageWorkerList.fulfilled, handleSpokenLanguageWorkerListFulfilled)
            .addCase(fetchSpokenLanguageWorkerList.rejected, handleRejected)
            .addCase(fetchSpokenEmployerLanguageList.pending, handlePending)
            .addCase(fetchSpokenEmployerLanguageList.fulfilled, handleSpokenLanguageEmployerListFulfilled)
            .addCase(fetchSpokenEmployerLanguageList.rejected, handleRejected)
            .addCase(fetchNotificationList.pending, handlePending)
            .addCase(fetchNotificationList.fulfilled, handleFetchNotificationListFulfilled)
            .addCase(fetchNotificationList.rejected, handleRejected)
            .addCase(fetchContractWorkerStatus.pending, handlePending)
            .addCase(fetchContractWorkerStatus.fulfilled, handlefetchContractWorkerStatusFulfilled)
            .addCase(fetchContractWorkerStatus.rejected, handleRejected)
            .addCase(fetchNotificationUnreadCount.pending, handlePending)
            .addCase(fetchNotificationUnreadCount.fulfilled, handleFetchNotificationUnreadCountFulfilled)
            .addCase(fetchNotificationUnreadCount.rejected, handleRejected)
            .addCase(notificationMarkRead.fulfilled, handleFetchNotificationUnreadCountFulfilled)
            .addCase(notificationMarkAsUnread.fulfilled, handleFetchNotificationUnreadCountFulfilled)
            .addCase(notificationMarkAllRead.fulfilled, handleFetchNotificationUnreadCountFulfilled)
            .addCase(fetchTerminationReason.pending, handlePending)
            .addCase(shiftExperience.pending, handlePending)
            .addCase(shiftExperience.fulfilled, handleShiftExperienceFulfilled)
            .addCase(shiftExperience.rejected, handleRejected)
            .addCase(fetchTerminationReason.fulfilled, (state, action) => {
                state.terminationReasons = action.payload?.data || [];
                state.status = 'succeeded';
            })
            .addCase(fetchTerminationReason.rejected, handleRejected)
            .addCase(checkDuplicateEmail.pending, handlePending)
            .addCase(checkDuplicateEmail.fulfilled, handleCheckDuplicateEmailFulfilled)
            .addCase(checkDuplicateEmail.rejected, handleRejected)

            .addCase(checkDuplicateMobile.pending, handlePending)
            .addCase(checkDuplicateMobile.fulfilled, handleCheckDuplicateMobileFulfilled)
            .addCase(checkDuplicateMobile.rejected, handleRejected);
    }
});
export const { clearMessage, toggleDensePadding, setDensePadding, setReceivedNotification, clearReceivedNotification } = CommonSlice.actions;

export default CommonSlice.reducer;
