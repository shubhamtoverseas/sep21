const handleFetchSpokenLanguageFulfilled = (state, action) => {
    state.status = 'succeeded';
    state.spokenLanguage = action.payload?.data ?? state.spokenLanguage;
    state.message = action.payload?.message ?? state.message;
};

export {
    handleFetchSpokenLanguageFulfilled
};
