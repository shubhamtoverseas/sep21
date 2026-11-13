
export const handleFetchTemplatesFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.templates = action.payload?.data ?? state.templates;
  state.currentPage = action.payload?.current_page ?? state.currentPage;
  state.totalPages = action.payload?.total_pages ?? state.totalPages;
  state.perPage = action.payload?.limit ?? state.perPage;
  state.totalTemplates = action.payload?.total_template_count ?? state.totalTemplates;
  state.lastUpdated = action.payload?.last_updated ?? state.lastUpdated;
  state.message = action.payload?.message ?? state.message;
};

export const handleFetchTemplateWhatsAppFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.templatesWhatsApp = action.payload?.data;
  state.message = action.payload?.message;
};

export const handleFetchModuleFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.moduleList = action.payload?.data ?? state.moduleList;
  state.message = action.payload?.message ?? state.message;
};

export const handleFetchCategoryFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.categoryList = action.payload?.data ?? state.categoryList;
  state.message = action.payload?.message ?? state.message;
};

export const handleFetchLanguageFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.languageList = action.payload?.data ?? state.languageList;
  state.message = action.payload?.message ?? state.message;
}

export const handleAddTemplateFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.templates.push(action.payload?.data);
  state.message = action.payload?.message ?? state.message;
};

export const handleFetchTemplateByIdFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.currentTemplate = action.payload?.data ?? state.currentTemplate;
};

export const handleDeleteTemplateFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
  //state.currentTemplate = action.payload?.data ?? state.currentTemplate;
};

export const handleUpdateTemplateFulfilled = (state, action) => {
  state.status = 'succeeded';
  const updatedTemplateIndex = state.templates.findIndex(template => template.id === action.payload?.data?.id);
  if (updatedTemplateIndex !== -1) {
    state.templates[updatedTemplateIndex] = action.payload?.data;
  }
  //state.currentTemplate = action.payload?.data ?? state.currentTemplate;
  state.message = action.payload?.message ?? state.message;
};


export const handleTemplateNameByFilterFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.templateNameList = action.payload?.data ?? state.templateNameList;
  state.message = action.payload?.message ?? state.message;
};


export const handleTemplateMessageFulfilled = (state, action) => {
  state.status = 'succeeded';
  state.message = action.payload?.message ?? state.message;
};