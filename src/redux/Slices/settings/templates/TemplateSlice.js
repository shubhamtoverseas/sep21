import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { handleFetchTemplatesFulfilled, handleFetchModuleFulfilled, handleFetchCategoryFulfilled, handleFetchLanguageFulfilled, handleAddTemplateFulfilled, handleFetchTemplateByIdFulfilled, handleUpdateTemplateFulfilled, handleDeleteTemplateFulfilled, handleTemplateNameByFilterFulfilled, handleTemplateMessageFulfilled, handleFetchTemplateWhatsAppFulfilled } from './templatesExtraReducers';
import { getTemplates, getModuleList, getCategoryList, getLanguageList, addNewTemplate, getTemplateById, updateTemplateById, deleteTemplateById, getTemplateNameByFilter, getTemplateWhatsApp, sendTemplate, sendChatMessageAPI, sentWhatsAppTemplateMessageAPI, sendActionRequiredLogs, getActionRequiredLogsList } from '../../../../services/templates';
import { handlePending, handleRejected } from '../../common/extra-reducers/commonExtraReducers';

export const fetchTemplates = createAsyncThunk('templates/fetchTemplates', async (params, { rejectWithValue }) => {
  try {
    const response = await getTemplates(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


export const fetchModuleList = createAsyncThunk('templates/fetchModuleList', async (params, { rejectWithValue }) => {
  try {
    const response = await getModuleList(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchCategoryList = createAsyncThunk('templates/fetchCategoryList', async (params, { rejectWithValue }) => {
  try {
    const response = await getCategoryList(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchLanguageList = createAsyncThunk('templates/fetchLanguageList', async (params, { rejectWithValue }) => {
  try {
    const response = await getLanguageList(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const addTemplate = createAsyncThunk('templates/addTemplate', async (params, { rejectWithValue }) => {
  try {
    const response = await addNewTemplate(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchTemplateById = createAsyncThunk('templates/fetchTemplateById', async (id, { rejectWithValue }) => {
  try {
    const response = await getTemplateById(id);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const updateTemplate = createAsyncThunk('templates/updateTemplate', async (params, { rejectWithValue }) => {
  try {
    const response = await updateTemplateById(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});


export const deleteTemplate = createAsyncThunk('templates/deleteTemplate', async (params, { rejectWithValue }) => {
  try {
    const response = await deleteTemplateById(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchTemplateNameByFilter = createAsyncThunk('templates/fetchTemplateNameByFilter', async (params, { rejectWithValue }) => {
  try {
    const response = await getTemplateNameByFilter(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const fetchTemplateWhatsApp = createAsyncThunk('templates/fetchTemplateWhatsApp', async (params, { rejectWithValue }) => {
  try {
    const response = await getTemplateWhatsApp(params);
    return response.data.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const sendTemplateMessage = createAsyncThunk('templates/sendTemplateMessage', async (params, { rejectWithValue }) => {
  try {
    const response = await sendTemplate(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const saveActionRequiredLogs = createAsyncThunk('templates/saveActionRequiredLogs', async (params, { rejectWithValue }) => {
  try {
    const response = await sendActionRequiredLogs(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const sendChatMessage = createAsyncThunk('templates/sendChatMessage', async (params, { rejectWithValue }) => {
  try {
    const response = await sendChatMessageAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const sentWhatsAppTemplateMessage = createAsyncThunk('templates/sentWhatsAppTemplateMessage', async (params, { rejectWithValue }) => {
  try {
    const response = await sentWhatsAppTemplateMessageAPI(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

export const getActionRequiredLogs = createAsyncThunk('templates/getActionRequiredLogs', async (params, { rejectWithValue }) => {
  try {
    const response = await getActionRequiredLogsList(params);
    return response.data;
  } catch (error) {
    return rejectWithValue({
      data: error.response || 'An error occurred',
    });
  }
});

const templatesSlice = createSlice({
  name: 'templates',
  initialState: {
    templates: [],
    templatesWhatsApp: [],
    moduleList: [],
    categoryList: [],
    languageList: [],
    templateNameList: [],
    actionRequiredList: [],
    status: 'idle',
    error: null,
    currentTemplate: null,
    message: null,
    currentPage: 1,
    perPage: 10,
    totalPages: 0,
    totalTemplates: 0,
    lastUpdated: '',
    templateFiltersData: {
      module_key: "",
      category_id: [],
      language_id: "",
      template_type: "",
      search_text: '',
      accessibility: "",
    }
  },
  reducers: {
    clearMessage(state) {
      state.message = null;
      state.error = null;
    },
    clearTemplate(state) {
      state.currentTemplate = null;
      state.templateNameList = [];
    },
    setTemplateFilters: (state, action) => {
      state.templateFiltersData = { ...state.templateFiltersData, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, handlePending)
      .addCase(fetchTemplates.fulfilled, handleFetchTemplatesFulfilled)
      .addCase(fetchTemplates.rejected, handleRejected)
      .addCase(fetchModuleList.pending, handlePending)
      .addCase(fetchModuleList.fulfilled, handleFetchModuleFulfilled)
      .addCase(fetchModuleList.rejected, handleRejected)
      .addCase(fetchCategoryList.pending, handlePending)
      .addCase(fetchCategoryList.fulfilled, handleFetchCategoryFulfilled)
      .addCase(fetchCategoryList.rejected, handleRejected)
      .addCase(fetchLanguageList.pending, handlePending)
      .addCase(fetchLanguageList.fulfilled, handleFetchLanguageFulfilled)
      .addCase(fetchLanguageList.rejected, handleRejected)
      .addCase(addTemplate.pending, handlePending)
      .addCase(addTemplate.fulfilled, handleAddTemplateFulfilled)
      .addCase(addTemplate.rejected, handleRejected)
      .addCase(fetchTemplateById.pending, handlePending)
      .addCase(fetchTemplateById.fulfilled, handleFetchTemplateByIdFulfilled)
      .addCase(fetchTemplateById.rejected, handleRejected)
      .addCase(updateTemplate.pending, handlePending)
      .addCase(updateTemplate.fulfilled, handleUpdateTemplateFulfilled)
      .addCase(updateTemplate.rejected, handleRejected)
      .addCase(deleteTemplate.pending, handlePending)
      .addCase(deleteTemplate.fulfilled, handleDeleteTemplateFulfilled)
      .addCase(deleteTemplate.rejected, handleRejected)
      .addCase(fetchTemplateNameByFilter.pending, handlePending)
      .addCase(fetchTemplateNameByFilter.fulfilled, handleTemplateNameByFilterFulfilled)
      .addCase(fetchTemplateNameByFilter.rejected, handleRejected)
      .addCase(sendTemplateMessage.pending, handlePending)
      .addCase(sendTemplateMessage.fulfilled, handleTemplateMessageFulfilled)
      .addCase(sendTemplateMessage.rejected, handleRejected)
      .addCase(sendChatMessage.pending, handlePending)
      .addCase(sendChatMessage.fulfilled, handleTemplateMessageFulfilled)
      .addCase(sendChatMessage.rejected, handleRejected)
      .addCase(saveActionRequiredLogs.pending, handlePending)
      .addCase(saveActionRequiredLogs.fulfilled, (state, action) => {
        state.message = action.payload?.message ?? state.message;
        state.error = null;
      })
      .addCase(saveActionRequiredLogs.rejected, handleRejected)
      .addCase(getActionRequiredLogs.pending, handlePending)
      .addCase(getActionRequiredLogs.fulfilled, (state, action) => {
        state.actionRequiredList = action.payload?.data ?? state.actionRequiredList;
        state.error = null;
      })
      .addCase(getActionRequiredLogs.rejected, handleRejected)
      .addCase(fetchTemplateWhatsApp.pending, handlePending)
      .addCase(fetchTemplateWhatsApp.fulfilled, handleFetchTemplateWhatsAppFulfilled)
      .addCase(fetchTemplateWhatsApp.rejected, handleRejected)
      .addCase(sentWhatsAppTemplateMessage.pending, handlePending)
      .addCase(sentWhatsAppTemplateMessage.fulfilled, handleTemplateMessageFulfilled)
      .addCase(sentWhatsAppTemplateMessage.rejected, handleRejected);
  },
});

export const { clearMessage, clearTemplate, setTemplateFilters } = templatesSlice.actions;
export default templatesSlice.reducer;
