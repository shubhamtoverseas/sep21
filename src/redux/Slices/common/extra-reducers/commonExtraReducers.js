const handlePending = (state) => {
    state.status = 'loading';
};

const handleRejected = (state, action) => {
    state.status = 'failed';
    state.error = action?.payload?.message || action?.error?.message || 'An unknown error occurred';
};
export {
    handlePending,
    handleRejected,
}