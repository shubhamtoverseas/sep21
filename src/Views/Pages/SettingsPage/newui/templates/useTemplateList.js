import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import {
    deleteTemplate,
    fetchCategoryList,
    fetchLanguageList,
    fetchModuleList,
    fetchTemplates,
    setTemplateFilters,
} from "../../../../../redux/Slices/settings/templates/TemplateSlice";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import constData from "../../../../../components/ReusableComponents/constants";
import debounce from "../../../../../utils/debounce";
import { DEFAULT_PAGE_LIMIT, SORT_ORDER, TEMPLATE_SEARCH_DEBOUNCE_MS } from "../settingsNewUiConstants";

const selectTemplates = (state) => ({
    rows: state.templates.templates,
    currentPage: state.templates.currentPage,
    perPage: state.templates.perPage,
    totalPages: state.templates.totalPages,
    total: state.templates.totalTemplates,
    moduleList: state.templates.moduleList,
    categoryList: state.templates.categoryList,
    languageList: state.templates.languageList,
    filters: state.templates.templateFiltersData,
    lastUpdated: state.templates.lastUpdated,
});

/** Ports TemplateList + TemplateFilters: redux-held filters, master lists, POST /get-templates, delete. */
const useTemplateList = () => {
    const dispatch = useDispatch();
    const slice = useSelector(selectTemplates, shallowEqual);
    const filtersRef = useRef(slice.filters);
    filtersRef.current = slice.filters;

    const [sort, setSort] = useState({ by: "", order: "" });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const requestSeq = useRef(0);

    const load = useCallback((extra = {}) => {
        const seq = ++requestSeq.current;
        setIsLoading(true);
        setError(null);
        return dispatch(fetchTemplates({
            ...filtersRef.current,
            page: Number(slice.currentPage) || 1,
            limit: Number(slice.perPage) || DEFAULT_PAGE_LIMIT,
            ...extra,
        }))
            .unwrap()
            .catch((err) => {
                if (seq !== requestSeq.current) return;
                const message = err?.data?.data?.message || err?.message;
                setError(message || true);
                if (message) ShowToast("error", message);
            })
            .finally(() => { if (seq === requestSeq.current) setIsLoading(false); });
    }, [dispatch, slice.currentPage, slice.perPage]);

    const loadRef = useRef(load);
    loadRef.current = load;

    useEffect(() => {
        if (!slice.moduleList.length) dispatch(fetchModuleList());
        if (!slice.languageList.length) dispatch(fetchLanguageList());
        if (!slice.filters || Object.keys(slice.filters).length === 0) dispatch(setTemplateFilters(constData.templateFiltersData));
        loadRef.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    const patchFilters = useCallback((patch) => {
        dispatch(setTemplateFilters({ ...filtersRef.current, ...patch }));
        filtersRef.current = { ...filtersRef.current, ...patch };
    }, [dispatch]);

    const withSort = useCallback((extra = {}) => (
        sort.by ? { sort_by: sort.by, sort_order: sort.order, ...extra } : extra
    ), [sort]);

    const setModule = useCallback((value) => {
        patchFilters({ module_key: value, category_id: [] });
        dispatch(fetchCategoryList({ module: value }));
        load(withSort({ module_key: value, category_id: [], page: 1 }));
    }, [dispatch, load, patchFilters, withSort]);

    const setCategory = useCallback((values) => {
        patchFilters({ category_id: values });
        load(withSort({ category_id: values, page: 1 }));
    }, [load, patchFilters, withSort]);

    const setLanguage = useCallback((value) => {
        patchFilters({ language_id: value });
        load(withSort({ language_id: value, page: 1 }));
    }, [load, patchFilters, withSort]);

    const debouncedSearch = useMemo(
        () => debounce((value) => loadRef.current({ search_text: value, page: 1 }), TEMPLATE_SEARCH_DEBOUNCE_MS),
        []
    );
    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

    const setSearch = useCallback((value) => {
        patchFilters({ search_text: value });
        debouncedSearch(value);
    }, [debouncedSearch, patchFilters]);

    /* "Clear Filters": reset redux filters and re-query from page 1 (bug log #54, fixed 2026-10-18: legacy kept the current page and could land on an empty one) */
    const clearFilters = useCallback(() => {
        debouncedSearch.cancel();
        dispatch(setTemplateFilters(constData.templateFiltersData));
        filtersRef.current = { ...constData.templateFiltersData };
        setSort({ by: "", order: "" });
        const seq = ++requestSeq.current;
        setIsLoading(true);
        setError(null);
        dispatch(fetchTemplates({ page: 1, limit: Number(slice.perPage) || DEFAULT_PAGE_LIMIT }))
            .unwrap()
            .catch((err) => { if (seq === requestSeq.current) setError(err?.message || true); })
            .finally(() => { if (seq === requestSeq.current) setIsLoading(false); });
    }, [debouncedSearch, dispatch, slice.perPage]);

    const setSortKey = useCallback((sortKey) => {
        setSort((prev) => {
            const order = prev.by === sortKey && prev.order === SORT_ORDER.ASC ? SORT_ORDER.DESC : SORT_ORDER.ASC;
            load({ sort_by: sortKey, sort_order: order });
            return { by: sortKey, order };
        });
    }, [load]);

    const setPage = useCallback((page) => {
        if (page < 1 || page > Math.max(Number(slice.totalPages) || 1, 1)) return;
        load(withSort({ page }));
    }, [load, slice.totalPages, withSort]);

    const setLimit = useCallback((limit) => load(withSort({ limit, page: 1 })), [load, withSort]);

    const requestDelete = useCallback((id) => setDeletingId(id), []);
    const cancelDelete = useCallback(() => setDeletingId(null), []);

    const confirmDelete = useCallback(() => {
        if (!deletingId) return;
        setIsDeleting(true);
        dispatch(deleteTemplate({ id: deletingId })).then((res) => {
            if (res?.error) ShowToast("error", res?.payload?.message);
            else {
                ShowToast("success", res?.payload?.message);
                load(withSort());
            }
            setDeletingId(null);
            setIsDeleting(false);
        });
    }, [deletingId, dispatch, load, withSort]);

    const pageInfo = useMemo(() => {
        const total = Number(slice.total) || 0;
        const page = Number(slice.currentPage) || 1;
        const perPage = Number(slice.perPage) || DEFAULT_PAGE_LIMIT;
        return {
            from: total ? (page - 1) * perPage + 1 : 0,
            to: total ? Math.min(page * perPage, total) : 0,
            total,
            currentPage: page,
            lastPage: Math.max(Number(slice.totalPages) || 1, 1),
            limit: perPage,
        };
    }, [slice.total, slice.currentPage, slice.perPage, slice.totalPages]);

    return {
        lastUpdated: slice.lastUpdated,
        rows: Array.isArray(slice.rows) ? slice.rows : [],
        filters: slice.filters || constData.templateFiltersData,
        moduleList: Array.isArray(slice.moduleList) ? slice.moduleList : [],
        categoryList: Array.isArray(slice.categoryList) ? slice.categoryList : [],
        languageList: Array.isArray(slice.languageList) ? slice.languageList : [],
        sort,
        pageInfo,
        isLoading,
        error,
        deletingId,
        isDeleting,
        setSearch,
        setModule,
        setCategory,
        setLanguage,
        clearFilters,
        setSortKey,
        setPage,
        setLimit,
        requestDelete,
        cancelDelete,
        confirmDelete,
        refresh: () => load(withSort()),
    };
};

export default useTemplateList;
