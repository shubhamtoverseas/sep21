import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handlePending, handleRejected } from '../common/extra-reducers/commonExtraReducers';
import {
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
} from './chatExtraReducers';
import {
  getAllSentMessages,
  getAllReceivedMessages,
  setIntConversation,
  createGroupConversationChat,
  getAllMessageList,
  getAllConversactionList,
  getConversactions,
  getChatHistoryList,
  getRestrictedKey,
  addWhatsappWelcomeMessage,
  getConversactionsHistory,
  getConversactionListAll,
  getTotalUnreadMessageCount,
  saveTranslationLanguageChat,
  getTranslationLanguageChat
} from '../../../services/chat';

export const fetchSentMessages = createAsyncThunk('chat/fetchSentMessages', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getAllSentMessages(reqPayload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchReceivedMessages = createAsyncThunk('chat/fetchReceivedMessages', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getAllReceivedMessages(reqPayload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const setConversation = createAsyncThunk('chat/setConversation', async (reqPayload) => {
  const response = await setIntConversation(reqPayload);
  return response.data;
});

export const sentWhatsappWelcomeMessage = createAsyncThunk('chat/sentWhatsappWelcomeMessage', async (reqPayload) => {
  const response = await addWhatsappWelcomeMessage(reqPayload);
  return response.data;
});

export const createGroupConversation = createAsyncThunk('chat/createGroupConversation', async (reqPayload) => {
  const response = await createGroupConversationChat(reqPayload);
  return response.data;
});

export const fetchMessageList = createAsyncThunk('chat/fetchMessageList', async (reqPayload) => {
  const response = await getAllMessageList(reqPayload);
  return response.data;
});

export const fetchMessageListAction = createAsyncThunk('chat/fetchMessageListAction', async (reqPayload) => {
  const response = await getAllMessageList(reqPayload);
  return response.data;
});


export const fetchConversactionList = createAsyncThunk('chat/fetchConversactionList', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getAllConversactionList(reqPayload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchConversactionListAll = createAsyncThunk('chat/fetchConversactionListAll', async (reqPayload, { rejectWithValue, dispatch }) => {
  try {
    const response = await getConversactionListAll(reqPayload);
    if (response.data?.counts) dispatch(setConversationCounts(response.data.counts));
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchConversactionListByTeam = createAsyncThunk('chat/fetchConversactionListByTeam', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getAllConversactionList(reqPayload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchConversactionListAllByTeam = createAsyncThunk('chat/fetchConversactionListAllByTeam', async (reqPayload, { rejectWithValue, dispatch }) => {
  try {
    const response = await getConversactionListAll(reqPayload);
    if (response.data?.counts) dispatch(setConversationCounts(response.data.counts));
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


export const fetchConversactionListAllByTeamScroll = createAsyncThunk('chat/fetchConversactionListAllByTeamScroll', async (reqPayload, { rejectWithValue, dispatch }) => {
  try {
    const response = await getConversactionListAll(reqPayload);
    if (response.data?.counts) dispatch(setConversationCounts(response.data.counts));
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


export const fetchConversactionListByTeamScroll = createAsyncThunk('chat/fetchConversactionListByTeamScroll', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getAllConversactionList(reqPayload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchConversactions = createAsyncThunk('chat/fetchConversactions', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getConversactions(reqPayload);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

/* The record rails' Chat History page size: the 50 conversations the endpoint always returned before it honoured
   `limit` for staff (CH-7), so the drawer lists what it listed before while the count comes from `total`. */
export const CHAT_HISTORY_PAGE_LIMIT = 50;

/* CH-7: the rows plus the API's `total` (all of the person's conversations) — the rows stay an array in the store */
export const fetchConversactionsHistory = createAsyncThunk('chat/fetchConversactionsHistory', async (reqPayload, { rejectWithValue }) => {
  try {
    const response = await getConversactionsHistory(reqPayload);
    return { data: response.data.data, total: response.data.total };
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


export const fetchMessageListWithKey = createAsyncThunk('chat/fetchMessageListWithKey', async (reqPayload) => {
  const response = await getAllMessageList(reqPayload);
  return response.data;
});

export const fetchRestrictedKey = createAsyncThunk('chat/fetchRestrictedKey', async (reqPayload) => {
  const response = await getRestrictedKey(reqPayload);
  return response.data;
});

export const fetchMessageListWithKeyAction = createAsyncThunk('chat/fetchMessageListWithKeyAction', async (reqPayload) => {
  const response = await getAllMessageList(reqPayload);
  return response.data;
});


export const fetchChatHistoryList = createAsyncThunk('chat/fetchChatHistoryList', async (reqPayload) => {
  const response = await getChatHistoryList(reqPayload);
  return response.data;
});


export const fetchChatHistoryWithKeyList = createAsyncThunk('chat/fetchChatHistoryWithKeyList', async (reqPayload) => {
  const response = await getChatHistoryList(reqPayload);
  return response.data;
});

export const fetchTotalUnreadMessageCount = createAsyncThunk('chat/fetchTotalUnreadMessageCount', async (reqPayload) => {
  const response = await getTotalUnreadMessageCount(reqPayload);
  return response.data;
});

export const saveTranslationLanguage = createAsyncThunk('chat/saveTranslationLanguage', async (reqPayload) => {
  const response = await saveTranslationLanguageChat(reqPayload);
  return response.data;
});

export const getLanguageTranslate = createAsyncThunk('chat/getLanguageTranslate', async (reqPayload) => {
  const response = await getTranslationLanguageChat(reqPayload);
  return response.data;
});


const chatSlice = createSlice({
  name: 'myChat',
  initialState: {
    chatSentMessages: [],
    lastSentMesageDateTime: '',
    totalUnreadMessageCount: 0,
    totalSentMessages: 0,
    chatReceivedMessages: [],
    allChatHistoryList: [],
    conversactionsListHistory: [],
    conversactionsHistoryTotal: null,
    chatLanguageInfo: {},
    conversactionUserList: [],
    totalReceivedMessages: 0,
    lastReceivedMesageDateTime: '',
    isMessageListFetched: false,
    chatConfig: [],
    conversactionList: [],
    conversactions: [],
    chatConversationInfo: '',
    allMessageList: null,
    allMessageListWithKey: null,
    messagesList: [],
    limit: 0,
    total_count: 0,
    total_pages: 0,
    error: null,
    message: null,
    status: 'success',
    mediaUploadStatus: '',
    isChatConfig: 0,
    loadingStatus: 'idle',
    messageStatus: 'success',
    conversactionLoadingStatus: 'success',
    conversactionStatus: 'success',
    conversactionScrollStatus: 'success',
    chatUserInfo: {},
    messagesListAction: [],
    allMessageListAction: [],
    allMessageListWithKeyAction: [],
    restrictedKey: null,
    unreadChatCount: 0,
    conversationCounts: null,
  },
  reducers: {

    updateUnreadChatCount(state, action) {
      state.unreadChatCount = action.payload?.count ?? state.unreadChatCount;
    },

    setConversationCounts(state, action) {
      state.conversationCounts = action.payload || null;
    },

    incrementUnreadChatCount(state) {
      state.unreadChatCount += 1;
    },

    clearUnreadChatCount(state) {
      state.unreadChatCount = 0;
    },

    updateChatUserInfo(state, action) {
      state.chatUserInfo = action.payload;
    },

    setChatMediaLoading(state) {
      state.loadingStatus = 'loading';
    },

    clearChatMediaLoading(state) {
      state.loadingStatus = false;
    },

    clearMessage(state) {
      state.message = null;
      state.isChatConfig = 0;
    },

    clearMessageList(state) {
      state.messagesList = [];
      state.allMessageList = null;
      state.allChatHistoryList = []
      state.conversactions = []
    },

    clearMessages(state) {
      state.allMessageList = null;
      state.allChatHistoryList = []
    },

    createChatConfig(state) {
      state.isMessageListFetched = false;
    },

    clearChatConfig(state) {
      state.chatConfig = [];
    }

  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSentMessages.pending, handlePending)
      .addCase(fetchSentMessages.fulfilled, handleFetchSentChatMessagesFulfilled)
      .addCase(fetchSentMessages.rejected, handleRejected)
      .addCase(fetchReceivedMessages.pending, handlePending)
      .addCase(fetchReceivedMessages.fulfilled, handleFetchReceivedChatMessagesFulfilled)
      .addCase(fetchReceivedMessages.rejected, handleRejected)

      .addCase(setConversation.pending, handlePending)
      .addCase(setConversation.fulfilled, handleInitCoverdationFulfilled)
      .addCase(setConversation.rejected, handleRejected)

      .addCase(createGroupConversation.pending, handlePending)
      .addCase(createGroupConversation.fulfilled, handleInitCoverdationFulfilled)
      .addCase(createGroupConversation.rejected, handleRejected)

      .addCase(fetchMessageList.pending, handlePendingStatus)
      .addCase(fetchMessageList.fulfilled, handleMessageListFulfilled)
      .addCase(fetchMessageList.rejected, handleRejectedStatus)

      .addCase(fetchMessageListAction.pending, handlePendingStatus)
      .addCase(fetchMessageListAction.fulfilled, handleMessageListActionFulfilled)
      .addCase(fetchMessageListAction.rejected, handleRejectedStatus)

      .addCase(fetchMessageListWithKeyAction.pending, handlePendingStatus)
      .addCase(fetchMessageListWithKeyAction.fulfilled, handleMessageListWithKeyActionFulfilled)
      .addCase(fetchMessageListWithKeyAction.rejected, handleRejectedStatus)

      .addCase(fetchMessageListWithKey.pending, handlePendingStatus)
      .addCase(fetchMessageListWithKey.fulfilled, handleMessageListWithKeyFulfilled)
      .addCase(fetchMessageListWithKey.rejected, handleRejectedStatus)

      .addCase(fetchChatHistoryWithKeyList.pending, handlePendingStatus)
      .addCase(fetchChatHistoryWithKeyList.fulfilled, handleMessageListWithKeyFulfilled)
      .addCase(fetchChatHistoryWithKeyList.rejected, handleRejectedStatus)

      .addCase(fetchConversactionList.pending, handlePending)
      .addCase(fetchConversactionList.fulfilled, handleConversactionListFulfilled)
      .addCase(fetchConversactionList.rejected, handleConversactionRejected)

      .addCase(fetchConversactionListByTeam.pending, (state) => {
        state.conversactionStatus = "loading";
        state.conversactionLoadingStatus = "succeeded";
      })
      .addCase(fetchConversactionListByTeam.fulfilled, handleConversactionListFulfilled)
      .addCase(fetchConversactionListByTeam.rejected, handleConversactionRejected)

      .addCase(fetchConversactionListAllByTeam.pending, (state) => {
        state.conversactionStatus = "loading";
        state.conversactionLoadingStatus = "succeeded";
      })
      .addCase(fetchConversactionListAllByTeam.fulfilled, handleFetchConversactionListAllFulfilled)
      .addCase(fetchConversactionListAllByTeam.rejected, handleConversactionRejected)

      .addCase(fetchConversactionListByTeamScroll.pending, (state) => {
        state.conversactionStatus = "succeeded";
        state.conversactionLoadingStatus = "succeeded";
        state.conversactionScrollStatus = "loading";
      })
      .addCase(fetchConversactionListByTeamScroll.fulfilled, handleConversactionListFulfilled)
      .addCase(fetchConversactionListByTeamScroll.rejected, handleConversactionRejected)

      .addCase(fetchConversactionListAllByTeamScroll.pending, (state) => {
        state.conversactionStatus = "succeeded";
        state.conversactionLoadingStatus = "succeeded";
        state.conversactionScrollStatus = "loading";
      })
      .addCase(fetchConversactionListAllByTeamScroll.fulfilled, handleFetchConversactionListAllFulfilled)
      .addCase(fetchConversactionListAllByTeamScroll.rejected, handleConversactionRejected)

      .addCase(fetchConversactions.pending, handlePendingConversactions)
      .addCase(fetchConversactions.fulfilled, handleConversactionsFulfilled)
      .addCase(fetchConversactions.rejected, handleRejected)

      .addCase(fetchChatHistoryList.pending, handlePendingStatus)
      .addCase(fetchChatHistoryList.fulfilled, handleMessageHistoryListFulfilled)
      .addCase(fetchChatHistoryList.rejected, handleRejectedStatus)

      .addCase(fetchRestrictedKey.pending, handlePendingStatus)
      .addCase(fetchRestrictedKey.fulfilled, (state, action) => {
        state.restrictedKey = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchRestrictedKey.rejected, handleRejectedStatus)
      .addCase(sentWhatsappWelcomeMessage.pending, handlePendingStatus)
      .addCase(sentWhatsappWelcomeMessage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.message = action.payload?.message ?? state.message;
      })
      .addCase(sentWhatsappWelcomeMessage.rejected, handleRejectedStatus)
      .addCase(fetchConversactionsHistory.pending, handlePendingStatus)
      .addCase(fetchConversactionsHistory.fulfilled, (state, action) => {
        state.conversactionsListHistory = action.payload?.data;
        state.conversactionsHistoryTotal = typeof action.payload?.total === 'number' ? action.payload.total : null;
        state.status = 'succeeded';
      })
      .addCase(fetchConversactionsHistory.rejected, handleRejectedStatus)
      .addCase(fetchConversactionListAll.pending, (state) => {
        state.status = 'loading';
        state.conversactionLoadingStatus = 'loading';
        state.conversactionUserList = [];
      })
      .addCase(fetchConversactionListAll.fulfilled, handleFetchConversactionListAllFulfilled)
      .addCase(fetchConversactionListAll.rejected, handleConversactionRejected)
      .addCase(fetchTotalUnreadMessageCount.pending, handlePendingStatus)
      .addCase(fetchTotalUnreadMessageCount.fulfilled, (state, action) => {
        state.totalUnreadMessageCount = action.payload?.data?.total_count || 0;
        state.status = 'succeeded';
      })
      .addCase(saveTranslationLanguage.rejected, handleRejectedStatus)
      .addCase(getLanguageTranslate.pending, handlePendingStatus)
      .addCase(getLanguageTranslate.fulfilled, (state, action) => {
        state.chatLanguageInfo = action.payload?.data || {};
        state.status = 'succeeded';
      }
    )
      .addCase(getLanguageTranslate.rejected, handleRejectedStatus);

  },
});

export const selectChatConfig = (state) => state.myChat.chatConfig
export const { clearMessage,
  createChatConfig,
  clearChatConfig,
  setChatMediaLoading,
  clearChatMediaLoading,
  clearMessageList,
  clearMessages,
  updateChatUserInfo,
  updateUnreadChatCount,
  incrementUnreadChatCount,
  clearUnreadChatCount,
  setConversationCounts
} = chatSlice.actions;
export default chatSlice.reducer;
