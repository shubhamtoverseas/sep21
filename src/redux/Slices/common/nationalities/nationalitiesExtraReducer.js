const handleFulfilled = (state, action) => {
    state.status = 'succeeded';
    const { type, group } = action.meta.arg;
    if (type === 'worker' && group) {
        state.workerNationalitiesGroupWise = action.payload;
    } else if (type === 'onboarding2') {
         state.workerNationalitiesOnboarding2 = action.payload;
    } else if (type === 'worker' && !group) {
        state.workerNationalities = action.payload;
    }
};

const handleFulfilledEmployerNationality = (state, action) => {
    state.status = 'succeeded';
    state.employerNationalities = action.payload;
};

export {
    handleFulfilled,
    handleFulfilledEmployerNationality
};
