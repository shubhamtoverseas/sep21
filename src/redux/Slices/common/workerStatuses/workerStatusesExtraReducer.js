const handleFulfilled = (state, action) => {
    state.status = 'succeeded';
    if (action.meta?.arg?.worker_id) {
        state.workerStatuses = action.payload;
    } else {
        state.allWorkerStatuses = action.payload;
    }
};

export const handleFulfilledWorkerProfileStatus = (state, action) => {
    state.status = 'succeeded';
    state.workerProfileStatusList = action.payload;
};

export {
    handleFulfilled,
};
