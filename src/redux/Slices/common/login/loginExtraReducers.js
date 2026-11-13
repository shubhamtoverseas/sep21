const handleLoginAppFulfilled = (state) => {
  state.status = 'succeeded';
  // state.locations = action.payload?.data ?? state.locations;
  // state.message = action.payload?.message ?? state.message;
};

const handleForgotPasswordFulfilled = (state) => {
  state.status = 'succeeded';
}

const handleResetPasswordFulfilled = (state) => {
  state.status = 'succeeded';
}

const handleVerifyOtpFulfilled = (state) => {
  state.status = 'succeeded';
}

const handleLogoutAppFulfilled = (state) => {
  state.status = 'succeeded';
}

export {
  handleLoginAppFulfilled,
  handleForgotPasswordFulfilled,
  handleResetPasswordFulfilled,
  handleVerifyOtpFulfilled,
  handleLogoutAppFulfilled
};
