import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { fetchActiveAgencies } from "../../../../../../redux/Slices/settings/agencies/AgenciesSlice";
import { fetchWorkerPromotionList, saveWorkerPromotion } from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import { addWorkerPromotionFormState } from "../../../../../../components/ReusableComponents/form-states";
import { addWorkerPromotionSchema } from "../../../price-list/worker-promotions-tab/addWorkerPromotionSchema";
import { showSuccessOrError } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import {
    asArray,
    buildWorkerPromotionPayload,
    hasEmptyWorkerPromotionItems,
    initialWorkerPromotionItems,
    newWorkerPromotionItem,
    workerPromotionDefaultValues,
} from "../priceListConfig";
import { ACTIVE_AGENCIES_QUERY, PRICE_LIST_FIRST_PAGE } from "../../settingsNewUiConstants";

/** Ports AddWorkerPromotionForm.js: defaults, agencies lookup, local items list, saveWorkerPromotion + refetch page 1. */
const useWorkerPromotionForm = ({ currentWorkerPromotion, onClose }) => {
    const dispatch = useDispatch();
    const activeAgencies = useSelector((state) => state.agencies.activeAgencies);
    const [isInfinite, setIsInfiniteState] = useState(currentWorkerPromotion ? !currentWorkerPromotion.end_date : false);
    const [itemsError, setItemsError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [items, setItems] = useState(() => initialWorkerPromotionItems(currentWorkerPromotion));

    const form = useForm({
        defaultValues: {
            ...workerPromotionDefaultValues(currentWorkerPromotion, addWorkerPromotionFormState),
            isInfinite: currentWorkerPromotion ? !currentWorkerPromotion.end_date : false,
        },
        resolver: yupResolver(addWorkerPromotionSchema),
    });
    const startDate = form.watch("start_date");
    const { setValue, clearErrors } = form;

    /* bug log #69 (fixed 2026-10-18): the Indefinite checkbox is mirrored into the `isInfinite` form field (see #68) */
    const setIsInfinite = useCallback((next) => {
        setIsInfiniteState(next);
        setValue("isInfinite", next, { shouldValidate: false });
        if (next) clearErrors("end_date");
    }, [setValue, clearErrors]);

    useEffect(() => {
        dispatch(fetchActiveAgencies(ACTIVE_AGENCIES_QUERY));
    }, [dispatch]);

    const addItem = useCallback(() => setItems((prev) => [...prev, newWorkerPromotionItem()]), []);
    const removeItem = useCallback((id) => setItems((prev) => prev.filter((item) => item.id !== id)), []);
    const handleItemChange = useCallback((id, field, value) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    }, []);

    const onSubmit = useCallback((data) => {
        if (hasEmptyWorkerPromotionItems(items)) {
            setItemsError(translation("key_please_add_an_item"));
            return;
        }
        setIsSaving(true);
        dispatch(saveWorkerPromotion(buildWorkerPromotionPayload(data, isInfinite, items, currentWorkerPromotion?.id)))
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) {
                    dispatch(fetchWorkerPromotionList({ page: PRICE_LIST_FIRST_PAGE }));
                    onClose();
                }
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, isInfinite, items, onClose, currentWorkerPromotion?.id]);

    return {
        form,
        isEdit: Boolean(currentWorkerPromotion),
        isSaving,
        isInfinite,
        setIsInfinite,
        startDate,
        activeAgencies: asArray(activeAgencies),
        items,
        itemsError,
        addItem,
        removeItem,
        handleItemChange,
        onSubmit,
    };
};

export default useWorkerPromotionForm;
