const handleFetchSentChatMessagesFulfilled = (state, action) => {
  state.status = 'succeeded';
  if (action.payload && action.payload?.data) {
    state.chatSentMessages = action.payload?.data ?? state.chatSentMessages;
    state.totalSentMessages = action.payload?.totalSentMessages ?? state.totalSentMessages;
    state.lastSentMesageDateTime = action.payload?.lastSentMesageDateTime ?? state.lastSentMesageDateTime;
  } else {
    state.chatSentMessages = action.payload || [];
  }
};


const handleFetchReceivedChatMessagesFulfilled = (state, action) => {
  state.status = 'succeeded';
  if (action.payload && action.payload?.data) {
    state.chatReceivedMessages = action.payload?.data ?? state.chatReceivedMessages;
    state.totalReceivedMessages = action.payload?.totalReceivedMessages ?? state.totalReceivedMessages;
    state.lastReceivedMesageDateTime = action.payload?.lastReceivedMesageDateTime ?? state.lastReceivedMesageDateTime;
  } else {
    state.chatReceivedMessages = action.payload || [];
  }
};

const handleInitCoverdationFulfilled = (state, action) => {
  if (action.payload?.success == true) {
    state.status = 'succeeded';
  } else {
    state.status = 'failed';
    state.isChatConfig = 0;
  }
  state.message = action.payload?.message ?? state.message;
  state.chatConversationInfo = action.payload?.data ?? state.chatConversationInfo;

};

/*function calculateTimeDifference(inputDateTime) {
  const inputDate = new Date(inputDateTime);
  const currentDate = new Date();
  console.log('input  date ' + inputDate);
  console.log('current date ' + currentDate);
  const diffInMilliseconds = currentDate - inputDate;

  // Calculate time components
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  const remainingHours = diffInHours % 24;
  const remainingMinutes = diffInMinutes % 60;

  return {
    days: diffInDays,
    hours: remainingHours,
    minutes: remainingMinutes
  };
}*/

/*const handleMessageListFulfilledPREV = (state, action) => {
  if (action.payload?.success == true) {
    state.status = 'succeeded';
  } else {
    state.status = 'failed';
  }
  state.message = action.payload?.message ?? state.message;
  state.allMessageList = action.payload;
  state.limit = action.payload?.limit ?? state.limit;

  const current_message = state.allMessageList.data.find((el) => el.sender_id === state.chatConfig.userID);
  if (current_message) {
    const lastDateTime = calculateTimeDifference(current_message.created_at);
    if (parseInt(lastDateTime.days) > 1) {
      state.chatConfig.lastMesageTime = `${lastDateTime.days} Days`;
    } else if (parseInt(lastDateTime.days) === 1) {
      state.chatConfig.lastMesageTime = `${lastDateTime.days} Day`;
    } else {
      if (parseInt(lastDateTime.hours) === 0) {

        if (parseInt(lastDateTime.minutes) === 0) {
          state.chatConfig.lastMesageTime = 'Now';
        } else if (parseInt(lastDateTime.minutes) == 1) {
          state.chatConfig.lastMesageTime = `${lastDateTime.minutes} Min`;
        } else if (parseInt(lastDateTime.minutes) > 1) {
          state.chatConfig.lastMesageTime = `${lastDateTime.minutes} Mins`;
        }

      } else if (parseInt(lastDateTime.hours) == 1) {

        if (parseInt(lastDateTime.minutes) === 0) {
          state.chatConfig.lastMesageTime = `${lastDateTime.hours} Hr`;
        } else if (parseInt(lastDateTime.minutes) == 1) {
          state.chatConfig.lastMesageTime = `${lastDateTime.hours} Hr ${lastDateTime.minutes} Min`;
        } else if (parseInt(lastDateTime.minutes) > 1) {
          state.chatConfig.lastMesageTime = `${lastDateTime.hours} Hr ${lastDateTime.minutes} Mins`;
        }


      } else if (parseInt(lastDateTime.hours) > 1) {

        if (parseInt(lastDateTime.minutes) === 0) {
          state.chatConfig.lastMesageTime = `${lastDateTime.hours} Hrs`;
        } else if (parseInt(lastDateTime.minutes) == 1) {
          state.chatConfig.lastMesageTime = `${lastDateTime.hours} Hrs ${lastDateTime.minutes} Min`;
        } else if (parseInt(lastDateTime.minutes) > 1) {
          state.chatConfig.lastMesageTime = `${lastDateTime.hours} Hrs ${lastDateTime.minutes} Mins`;
        }

      }
    }
  }

};*/

const handleMessageListFulfilled = (state, action) => {
  if (action.payload?.success == true) {
    state.status = 'succeeded';
    state.messageStatus = 'succeeded';
  } else {
    state.status = 'failed';
    state.messageStatus = 'failed';
  }
  state.message = action.payload?.message ?? state.message;
  state.allMessageList = action.payload;
  state.limit = action.payload?.limit ?? state.limit;
  state.messagesList = action.payload?.data ?? state.messagesList;
};

const handleMessageListActionFulfilled = (state, action) => {
  if (action.payload?.success == true) {
    state.status = 'succeeded';
    state.messageStatus = 'succeeded';
  } else {
    state.status = 'failed';
    state.messageStatus = 'failed';
  }
  state.message = action.payload?.message ?? state.message;
  state.allMessageListAction = action.payload;
  state.limit = action.payload?.limit ?? state.limit;
  state.messagesListAction = action.payload?.data ?? state.messagesListAction;
};

const handleMessageHistoryListFulfilled = (state, action) => {
  if (action.payload?.success == true) {
    state.status = 'succeeded';
    state.messageStatus = 'succeeded';
  } else {
    state.status = 'failed';
    state.messageStatus = 'failed';
  }
  state.message = action.payload?.message ?? state.message;
  state.allChatHistoryList = action.payload;
  state.limit = action.payload?.limit ?? state.limit;
};

const handleMessageListWithKeyFulfilled = (state, action) => {
  if (action.payload?.success == true) {
    state.status = 'succeeded';
    state.messageStatus = 'succeeded';
  } else {
    state.status = 'failed';
    state.messageStatus = 'failed';
  }
  state.allMessageListWithKey = action.payload;
};

const handleMessageListWithKeyActionFulfilled = (state, action) => {
  if (action.payload?.success == true) {
    state.status = 'succeeded';
    state.messageStatus = 'succeeded';
  } else {
    state.status = 'failed';
    state.messageStatus = 'failed';
  }
  state.allMessageListWithKeyAction = action.payload;
};

const handleConversactionListFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.conversactionLoadingStatus = 'succeeded';
  state.conversactionStatus = 'succeeded';
  state.conversactionScrollStatus = 'succeeded';
  if (action.payload && action.payload?.data) {
    state.conversactionList = action.payload?.data ?? state.conversactionList;
  } else {
    state.conversactionList = action.payload || [];
  }
};

const handleFetchConversactionListAllFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.conversactionLoadingStatus = 'succeeded';
  state.conversactionStatus = 'succeeded';
  state.conversactionScrollStatus = 'succeeded';
  if (action.payload && action.payload?.data) {
    state.conversactionUserList = action.payload?.data ?? state.conversactionUserList;
  } else {
    state.conversactionUserList = action.payload || [];
  }
};

const handleConversactionsFulfilled = (state, action) => {
  state.status = 'succeeded';
  if (action.payload && action.payload?.data) {
    state.conversactions = action.payload?.data ?? state.conversactions;
  } else {
    state.conversactions = action.payload || [];
  }
};

const handlePendingStatus = (state) => {
  state.messageStatus = 'loading';
};

const handleRejectedStatus = (state) => {
  state.messageStatus = 'failed';
};

const handlePendingConversactions = (state) => {
  state.conversactionLoadingStatus = 'loading';
};

const handleConversactionRejected = (state) => {
  state.conversactionLoadingStatus = 'failed';
}

export {
  handleFetchSentChatMessagesFulfilled,
  handleFetchReceivedChatMessagesFulfilled,
  handleInitCoverdationFulfilled,
  handleMessageListFulfilled,
  handleConversactionListFulfilled,
  handleMessageListWithKeyFulfilled,
  handlePendingStatus,
  handleRejectedStatus,
  handleConversactionsFulfilled,
  handleMessageHistoryListFulfilled,
  handlePendingConversactions,
  handleConversactionRejected,
  handleMessageListActionFulfilled,
  handleMessageListWithKeyActionFulfilled,
  handleFetchConversactionListAllFulfilled
};
