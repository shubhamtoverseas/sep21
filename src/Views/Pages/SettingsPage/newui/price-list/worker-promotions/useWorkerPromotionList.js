import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { fetchWorkerPromotionList } from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import { isAdminUser } from "../../../../../../services/commonService";
import { useConfigurationPermissions } from "../../../../../../utils/permissions/configurationPermissionUtils";
import { asArray, buildPageInfo, nextSortOrder, promotionSortQuery } from "../priceListConfig";
import { DEFAULT_WORKER_PROMOTION_SORT, PRICE_LIST_FIRST_PAGE, PRICE_LIST_LOADING_STATUS, PRICE_LIST_SORT_ORDER } from "../../settingsNewUiConstants";

const selectWorkerPromotions = (state) => ({
    workerPromotionList: state.priceList.workerPromotionList,
    status: state.priceList.status,
    currentPage: state.priceList.currentPageWorkerPromotion,
    totalPages: state.priceList.totalPagesWorkerPromotion,
    total: state.priceList.totalWorkerPromotions,
    limit: state.priceList.perPageWorkerPromotion,
    lastUpdated: state.priceList.lastUpdatedWorkerPromotion,
});

/** Ports WorkerPromotionsTab.js list behaviour (POST list, page 1 on mount, ASC/DESC toggle). */
const useWorkerPromotionList = () => {
    const dispatch = useDispatch();
    const slice = useSelector(selectWorkerPromotions, shallowEqual);
    const { permissionList } = useSelector((state) => state.users);
    const configurationPermissions = useConfigurationPermissions(permissionList);
    const canEditPrice = useMemo(() => isAdminUser() || Boolean(configurationPermissions?.canEditWorkerPromotion), [configurationPermissions]);

    const [tableHeaderFilter, setTableHeaderFilter] = useState(DEFAULT_WORKER_PROMOTION_SORT);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentWorkerPromotion, setCurrentWorkerPromotion] = useState(null);

    const currentPage = parseInt(slice.currentPage, 10);

    useEffect(() => {
        dispatch(fetchWorkerPromotionList({ page: PRICE_LIST_FIRST_PAGE }));
    }, [dispatch]);

    const sortTable = useCallback((sortKey) => {
        if (!sortKey) return;
        const newOrder = nextSortOrder(tableHeaderFilter, sortKey, { asc: PRICE_LIST_SORT_ORDER.ASC, desc: PRICE_LIST_SORT_ORDER.DESC });
        setTableHeaderFilter({ sort: sortKey, order: newOrder });
        dispatch(fetchWorkerPromotionList({ sort_by: sortKey, sort_order: newOrder, page: currentPage }));
    }, [dispatch, tableHeaderFilter, currentPage]);

    const handlePrevClick = useCallback(() => {
        if (currentPage > 1) dispatch(fetchWorkerPromotionList({ page: currentPage - 1, ...promotionSortQuery(tableHeaderFilter) }));
    }, [dispatch, currentPage, tableHeaderFilter]);

    const handleNextClick = useCallback(() => {
        if (currentPage < slice.totalPages) dispatch(fetchWorkerPromotionList({ page: currentPage + 1, ...promotionSortQuery(tableHeaderFilter) }));
    }, [dispatch, currentPage, slice.totalPages, tableHeaderFilter]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatch(fetchWorkerPromotionList({ limit: perPage, page: currentPage, ...promotionSortQuery(tableHeaderFilter) }));
    }, [dispatch, currentPage, tableHeaderFilter]);

    const handleRefresh = useCallback(() => {
        dispatch(fetchWorkerPromotionList({ page: currentPage, ...promotionSortQuery(tableHeaderFilter) }));
    }, [dispatch, currentPage, tableHeaderFilter]);

    const openAdd = useCallback(() => setIsFormOpen(true), []);
    const openEdit = useCallback((promotionObj) => {
        setIsFormOpen(true);
        setCurrentWorkerPromotion(promotionObj);
    }, []);
    const closeForm = useCallback(() => {
        setCurrentWorkerPromotion(null);
        setIsFormOpen(false);
    }, []);

    const pageInfo = useMemo(
        () => buildPageInfo({ currentPage: slice.currentPage, totalPages: slice.totalPages, total: slice.total, limit: slice.limit }),
        [slice.currentPage, slice.totalPages, slice.total, slice.limit]
    );

    return {
        canEditPrice,
        rows: asArray(slice.workerPromotionList),
        isLoading: slice.status === PRICE_LIST_LOADING_STATUS,
        pageInfo,
        lastUpdated: slice.lastUpdated,
        sort: tableHeaderFilter,
        isFormOpen,
        currentWorkerPromotion,
        sortTable,
        handlePrevClick,
        handleNextClick,
        handlePerPageChange,
        handleRefresh,
        openAdd,
        openEdit,
        closeForm,
    };
};

export default useWorkerPromotionList;
