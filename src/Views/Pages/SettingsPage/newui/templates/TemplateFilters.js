import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import FilterSelect from "../../../../../components/ui/FilterSelect";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";

const ALL = "";

const withAll = (options) => [{ value: ALL, label: translation("key_all") }, ...options];

/** Search · Module · Category (multi, per module) · Language · Clear. */
const TemplateFilters = ({ filters, moduleList, categoryList, languageList, onSearch, onModule, onCategory, onLanguage, onClear }) => {
    const moduleOptions = useMemo(() => withAll(moduleList.map((item) => ({ value: item.id, label: item.name }))), [moduleList]);
    const categoryOptions = useMemo(() => withAll(categoryList.map((item) => ({ value: item.id, label: item.name_en }))), [categoryList]);
    const languageOptions = useMemo(() => withAll(languageList.map((item) => ({ value: item.id, label: item.name_en }))), [languageList]);

    const categoryValue = Array.isArray(filters.category_id) ? filters.category_id : [];
    const isFiltered = Boolean(filters.search_text || filters.module_key || categoryValue.length || filters.language_id);

    return (
        <div className={listStyles.filterBar}>
            <div className={`${listStyles.controlsRow} ${shared.filtersRow}`}>
                <div className={listStyles.controlsSearch}>
                    <Icon name="search" size={14} />
                    <input
                        id="template-search"
                        type="search"
                        className={listStyles.controlsSearchInput}
                        placeholder={translation("key_search")}
                        value={filters.search_text ?? ""}
                        onChange={(event) => onSearch(event.target.value)}
                        aria-label={translation("key_search")}
                        autoComplete="off"
                    />
                </div>

                <FilterSelect id="template-filter-module" label={translation("key_module")} value={filters.module_key ?? ALL} options={moduleOptions} menuWidth={200} onChange={onModule} />
                <FilterSelect id="template-filter-category" label={translation("key_category")} value={categoryValue} options={categoryOptions} multiple menuWidth={220} onChange={onCategory} />
                <FilterSelect id="template-filter-language" label={translation("key_language")} value={filters.language_id ?? ALL} options={languageOptions} menuWidth={180} onChange={onLanguage} />

                <button type="button" className={shared.clearBtn} onClick={onClear} disabled={!isFiltered}>
                    {translation("key_clear_filters")}
                </button>
            </div>
        </div>
    );
};

TemplateFilters.propTypes = {
    filters: PropTypes.object.isRequired,
    moduleList: PropTypes.array.isRequired,
    categoryList: PropTypes.array.isRequired,
    languageList: PropTypes.array.isRequired,
    onSearch: PropTypes.func.isRequired,
    onModule: PropTypes.func.isRequired,
    onCategory: PropTypes.func.isRequired,
    onLanguage: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
};

export default React.memo(TemplateFilters);
