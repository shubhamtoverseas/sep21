import constData from "../../../../components/ReusableComponents/constants";
import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Field, RadioGroup } from "../../../../components/ui/FormControls";
import { getCurrentUser } from "../../../../services/commonService";
const DetailsCardEmployer = lazy(() => import("./DetailsCardEmployer"));
const DetailsCardWorker = lazy(() => import("./DetailsCardWorker"));
const CancelContractPopup = lazy(() => import("./CancelContractPopup"));
const SelectEmployerModal = lazy(() => import("./SelectEmployerModal"));
const SelectWorkerModal = lazy(() => import("./SelectWorkerModal"));
const AddEmployerDetailsOfInvoice = lazy(() => import("./AddEmployerDetailsOfInvoice"));
const AddWorkerDetailsOfInvoice = lazy(() => import("./AddWorkerDetailsOfInvoice"));
/* the Standalone worker party's details: the Standalone Invoice's own form (names, mobile, HKID, date of birth, passport) */
const StandaloneWorkerDetails = lazy(() => import("../general/AddWorkerDetailsOfInvoice"));
const ContractSetupService = lazy(() => import("./ContractSetupService"));
const ContractSetupFacts = lazy(() => import("./ContractSetupFacts"));
const ExchangeOriginCard = lazy(() => import("./ExchangeOriginCard"));
import {
    EXCHANGE, PARTY_TYPES, STANDALONE, asksCategory, exchangeInput, exchangeServiceOf, initialChoices, pricingInput, routeOf, setupWhy, standaloneInput,
} from "./contractSetup";
import useContractPricing from "./useContractPricing";
import { interpolate } from "../../../../i18n/interpolate";
import { setInvoiceCurrentEmployer, clearCurrentEmployer, setInvoiceLocalInfo, clearInvoiceLocalInfo, setInvoiceCurrentJobInfo, fetchEmployerDetail } from "../../../../redux/Slices/employer/EmployerSlice";
import { setInvoiceCurrentWorker, clearWorkerDetail } from "../../../../redux/Slices/worker/WorkerSlice";
import { clearCurrentInvoiceExchange, clearInvoiceContractItemsList, setCurrentInvoiceExchange, validateContract } from "../../../../redux/Slices/invoices/InvoicesSlice";
import { fetchContractCategory } from "../../../../redux/Slices/contract/ContractSlice";
import CommonPageHeaderInvoice from "./CommonPageHeaderInvoice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import "../new-ui-shared.css";
import "../new-ui-create.css";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";

/*
 * The creation setup stage. Contract Invoice (INV-C2): the three cards Employer and worker · Service · Invoice. Standalone
 * Invoice (mode STANDALONE, INV-G2; register #28, #54, #80): the party card replaces the Employer and worker card — one
 * party, Employer or Worker, never both (an employer can be created through the existing form; a worker is searched and
 * selected, never created, and its details reviewed in the Standalone worker form as before) — the Service card keeps
 * only the engine's note and the Standalone rule note, and the Invoice card shows
 * the CS Owner as the creator, read-only. Both price with the engine on every change and never price themselves.
 * Exchange (mode EXCHANGE, INV-X2; register #70 – #76): opened from the original invoice (A1), whose card replaces the
 * Employer picker (A1's reference, employer and outgoing worker, Paid, refunds, the available credit the engine reports);
 * the replacement worker is picked from every worker (#76); the Service card asks the replacement's route as here, without
 * New / Replacement; the engine prices route "exchange" on every change. "Exchange of <A1 ref>" heads the page.
 */
const today = () => new Date().toISOString().split("T")[0];

const AddContractInvoice = ({ mode }) => {
    const { t } = useTranslation(); // Access translations
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const standalone = mode === STANDALONE;
    const exchangeMode = mode === EXCHANGE;
    /* Standalone: the party type the entry chose (the "Who is this invoice for?" choice or a record page), changeable here */
    const { selection_type: selectionParam } = useParams();
    const [partyType, setPartyType] = useState(() => (PARTY_TYPES.includes(selectionParam) ? selectionParam : ""));
    /* #80: the creator is the CS Owner of a Standalone Invoice (shown, never chosen) */
    const creator = useMemo(() => {
        const user = getCurrentUser()?.data;
        const staff = user?.staff;
        return { id: staff?.id ?? null, name: [staff?.first_name, staff?.last_name].filter(Boolean).join(" ") || user?.name || "" };
    }, []);
    const [currentContractCategory, setCurrentContractCategory] = useState("");
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [empOpen, setEmpOpen] = useState(false);
    const [wkrOpen, setWkrOpen] = useState(false);
    const [empFormOpen, setEmpFormOpen] = useState(false);
    const [empFormId, setEmpFormId] = useState(null);
    const [wkrFormOpen, setWkrFormOpen] = useState(false);
    const [wkrFormId, setWkrFormId] = useState(null);
    /* which surface opened the edit modal: the picker (Back returns to it) or the details card (Cancel only) */
    const [empFormFromPicker, setEmpFormFromPicker] = useState(false);
    const [wkrFormFromPicker, setWkrFormFromPicker] = useState(false);
    const [employerAdded, setEmployerAdded] = useState(false);
    const [contractSelectionFormInfo, setContractSelectionFormInfo] = useState({ contract_type_internal: "new" });
    const currentInvoiceEmployerDetail = useSelector((state) => state.employer.currentInvoiceEmployerDetail);
    const currentInvoiceWorkerDetail = useSelector((state) => state.worker.currentInvoiceWorkerDetail);
    const contractCategoryLists = useSelector((state) => state.contracts.contractCategoryLists);
    const currentInvoiceLocalInfo = useSelector((state) => state.employer.currentInvoiceLocalInfo);
    const invoiceCurrentJobInfo = useSelector((state) => state.employer.invoiceCurrentJobInfo);
    /* the header's Invoice Date and Branch as shown (today's date is there before anyone changes it) */
    const invoiceHeaderForm = useSelector((state) => state.invoices.invoiceHeaderForm);
    /* the worker found eligible when it was picked on this screen (performance track A-18): Continue does not ask again for
       that same worker; a worker that came another way (another screen, a draft) is still checked on Continue. Creating
       the invoice checks it again on the server. */
    const pickedEligibleWorkerRef = useRef(null);
    /* the "Invoice" card's body: the header renders Invoice Date, Branch and CS Owner into it (OP-27-43) */
    const [invoiceCardNode, setInvoiceCardNode] = useState(null);
    /* Exchange: the original invoice (A1) its detail screen opened the exchange with, kept for Back and a refresh */
    const storedExchange = useSelector((state) => state.invoices.currentInvoiceExchange);
    const a1 = exchangeMode ? (location.state?.exchangeInvoiceInfo || storedExchange) : null;
    const exchangeReady = !exchangeMode || (Boolean(a1?.id) && String(currentInvoiceLocalInfo?.exchange_a1 ?? "") === String(a1.id));

    /* A new exchange starts clean: A1's employer, branch and CS Owner, today's date (#54: the engine allows seven days either
       side), no worker and no items. @migration-unspecified(invoice): the old Exchange took A1's own invoice date, which the
       engine now refuses once A1 is older than seven days; the exchange date is today, editable. Confirm with product (OP-27-124). */
    useEffect(() => {
        if (!exchangeMode) return;
        if (!a1?.id) { navigate("/invoices", { replace: true }); return; }
        if (location.state?.exchangeInvoiceInfo) dispatch(setCurrentInvoiceExchange(location.state.exchangeInvoiceInfo));
        if (String(currentInvoiceLocalInfo?.exchange_a1 ?? "") !== String(a1.id)) {
            dispatch(clearWorkerDetail());
            dispatch(clearInvoiceContractItemsList());
            dispatch(setInvoiceLocalInfo({
                exchange_a1: a1.id, invoice_date: today(),
                branchId: a1.branch_id ? String(a1.branch_id) : "", branch_id: a1.branch_id ? `${ a1.branch_id } | ${ a1.branch_name }` : "", branch_name: a1.branch_name || "",
                csId: a1.staff_id ? String(a1.staff_id) : "", cs_id: a1.staff_id ? `${ a1.staff_id } | ${ a1.staff_name }` : "", cs_name: a1.staff_name || "",
            }));
        }
        if (a1.employer_id) {
            dispatch(fetchEmployerDetail({ employer_id: a1.employer_id })).then((res) => { if (res?.payload?.data) dispatch(setInvoiceCurrentEmployer(res.payload.data)); });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exchangeMode, a1?.id]);

    useEffect(() => {
        if (currentInvoiceWorkerDetail && !standalone) {
            dispatch(fetchContractCategory({ contract_status: (typeof currentInvoiceWorkerDetail?.contract_status === 'object' ? currentInvoiceWorkerDetail.contract_status?.id : currentInvoiceWorkerDetail?.contract_status) ?? currentInvoiceWorkerDetail?.contract_status_info?.id ?? null }));
        }
    }, [dispatch, currentInvoiceWorkerDetail, standalone]);


    useEffect(() => {
        if (contractCategoryLists && currentInvoiceWorkerDetail) {
            const currentcategory = contractCategoryLists.find((item) => String(item.id) === String(currentInvoiceWorkerDetail?.contract_category));
            setCurrentContractCategory(currentcategory?.name_en);
        }
    }, [contractCategoryLists, currentInvoiceWorkerDetail]);

    useEffect(() => {
        if (location.state?.currentInvoiceWorker) {
            dispatch(setInvoiceCurrentWorker(location.state?.currentInvoiceWorker));
        }
        if (location.state?.currentInvoiceEmployer) {
            dispatch(setInvoiceCurrentEmployer(location.state?.currentInvoiceEmployer));
        }
        if (location.state?.jobInfo) {
            dispatch(setInvoiceCurrentJobInfo(location.state?.jobInfo));
        }
    }, [location.state, dispatch]);

    const REPLACEMENT_CATEGORIES = useMemo(() => new Set(constData.INVOICE_REPLACEMENT_CATEGORIES), []);

    /* Once the worker and its category are known: the stored Type (Internal) of Renew / Local Transfer / Direct Hire stays as
       before (user ruling 22 Oct 2026; CF-2 open), and a newly picked worker starts the Service choices again (INV-C2):
       Local Transfer / Direct Hire from its profile category, Process as driver unset. */
    useEffect(() => {
        if (standalone || !currentInvoiceWorkerDetail || !currentContractCategory) return;
        const patch = {};
        if (REPLACEMENT_CATEGORIES.has(currentContractCategory) && currentInvoiceLocalInfo?.contract_type_internal !== "replacement") {
            patch.contract_type_internal = "replacement";
        }
        if (String(currentInvoiceLocalInfo?.setup_worker_id ?? "") !== String(currentInvoiceWorkerDetail.id)) {
            Object.assign(patch, initialChoices(currentInvoiceWorkerDetail, currentContractCategory), { setup_worker_id: currentInvoiceWorkerDetail.id });
        }
        if (!Object.keys(patch).length) return;
        setContractSelectionFormInfo((prev) => ({ ...prev, ...patch }));
        dispatch(setInvoiceLocalInfo({ ...currentInvoiceLocalInfo, ...patch }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, currentContractCategory, currentInvoiceWorkerDetail?.id, REPLACEMENT_CATEGORIES]);

    const handleCancelSelection = useCallback(() => {
        setShowConfirmDialog(true);
    }, []);

    const confirmCancelContract = useCallback(() => {
        dispatch(clearCurrentEmployer());
        dispatch(clearWorkerDetail());
        dispatch(clearInvoiceLocalInfo());
        dispatch(clearInvoiceContractItemsList());
        if (exchangeMode) dispatch(clearCurrentInvoiceExchange());
        setContractSelectionFormInfo("");
        window.history.back();
    }, [dispatch, exchangeMode]);

    const handleUpdateType = useCallback((type) => {
        setContractSelectionFormInfo((prev) => ({ ...prev, contract_type_internal: type }));
        dispatch(setInvoiceLocalInfo({ ...currentInvoiceLocalInfo, contract_type_internal: type }));
    }, [dispatch, currentInvoiceLocalInfo]);

    const cancelContractDialog = useCallback(() => {
        setShowConfirmDialog(false);
    }, []);

    const handleUpdateContractForm = useCallback((form) => {
        dispatch(setInvoiceLocalInfo({ ...currentInvoiceLocalInfo, ...form }));
        setContractSelectionFormInfo((prev) => ({ ...prev, ...form }));
    }, [dispatch, currentInvoiceLocalInfo]);

    /* a Service choice, this application's own (it never changes the worker profile). A route change (Local Transfer, Direct
       Hire) starts the Invoice items choices again; Type (Internal), the Contract category and Process as driver keep them
       (the reference page's setupChange; INV-C3) */
    const handleChooseService = useCallback((patch) => {
        if ("local_transfer" in patch || "direct_hire" in patch) dispatch(clearInvoiceContractItemsList());
        if ("contract_type_internal" in patch) handleUpdateType(patch.contract_type_internal);
        else handleUpdateContractForm(patch);
    }, [dispatch, handleUpdateType, handleUpdateContractForm]);

    const serviceChoices = useMemo(() => ({
        local_transfer: currentInvoiceLocalInfo?.local_transfer,
        direct_hire: currentInvoiceLocalInfo?.direct_hire,
        contract_category: currentInvoiceLocalInfo?.contract_category,
        process_as_driver: currentInvoiceLocalInfo?.process_as_driver,
        contract_type_internal: currentInvoiceLocalInfo?.contract_type_internal,
    }), [currentInvoiceLocalInfo]);
    const route = standalone ? STANDALONE
        : exchangeMode ? exchangeServiceOf(currentInvoiceWorkerDetail, currentContractCategory, serviceChoices)
            : routeOf(currentInvoiceWorkerDetail, currentContractCategory, serviceChoices);

    /* The pricing engine on every change (INV-C2): the worker and employer, the choices, the invoice date and branch, and
       the Contract the creation was opened from when the origin names one (OP-27-41; no origin sends one yet). Standalone
       (INV-G2): route "standalone", the one party, the invoice date and branch. */
    const employerId = currentInvoiceEmployerDetail?.employer_id ?? currentInvoiceEmployerDetail?.id;
    const originContractId = location.state?.originContractId;
    const invoiceDate = currentInvoiceLocalInfo?.invoice_date || invoiceHeaderForm?.invoice_date;
    const branchId = currentInvoiceLocalInfo?.branchId || invoiceHeaderForm?.branchId;
    const partyId = partyType === "employer" ? employerId : partyType === "worker" ? currentInvoiceWorkerDetail?.id : null;
    const pricingArgs = useMemo(() => (standalone
        ? standaloneInput({ partyType, employerId, workerId: currentInvoiceWorkerDetail?.id, invoiceDate, branchId })
        : exchangeMode
            ? (exchangeReady ? exchangeInput({ a1Id: a1?.id, worker: currentInvoiceWorkerDetail, categoryName: currentContractCategory, choices: serviceChoices, invoiceDate, branchId }) : null)
            : pricingInput({
                worker: currentInvoiceWorkerDetail, employerId, categoryName: currentContractCategory, choices: serviceChoices, invoiceDate, branchId, originContractId,
            })), [standalone, exchangeMode, exchangeReady, a1?.id, partyType, currentInvoiceWorkerDetail, employerId, currentContractCategory, serviceChoices, invoiceDate, branchId, originContractId]);
    const pricing = useContractPricing(pricingArgs);
    /* the last answer for this worker (kept while the next one is read) */
    const lastPricing = !standalone && pricing.result && currentInvoiceWorkerDetail && String(pricing.result.worker?.id) === String(currentInvoiceWorkerDetail.id) ? pricing.result : null;
    /* OP-27-40: the Contract category is asked where the profile holds a route, or where the engine says the profile's
       category is not a Local one */
    const categoryAsked = !standalone && (asksCategory(currentInvoiceWorkerDetail, currentContractCategory) || lastPricing?.category?.source === "chosen");
    /* the reference page's setupWhy: the Contract category where it is asked (OP-27-40), Process as driver on a Local route
       (R-B2); a Renewal also waits for its predecessor Contract (OP-27-41) and, when none or more than one is found,
       says why */
    const why = standalone ? "" : setupWhy(route, serviceChoices, categoryAsked);

    /* Standalone: one party, never both (#28) — choosing a party type drops the other party; another party starts the
       items again (the draft's items belong to the party they were priced for) */
    useEffect(() => {
        if (!standalone || !partyType) return;
        if (partyType === "employer" && currentInvoiceWorkerDetail) dispatch(clearWorkerDetail());
        if (partyType === "worker" && currentInvoiceEmployerDetail) dispatch(clearCurrentEmployer());
    }, [dispatch, standalone, partyType, currentInvoiceWorkerDetail, currentInvoiceEmployerDetail]);
    const partyKey = partyType && partyId ? `${ partyType }:${ partyId }` : "";
    useEffect(() => {
        if (!standalone || !partyKey || currentInvoiceLocalInfo?.standalone_party === partyKey) return;
        dispatch(clearInvoiceContractItemsList());
        dispatch(setInvoiceLocalInfo({ ...currentInvoiceLocalInfo, standalone_party: partyKey }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, standalone, partyKey]);
    const predecessorProblem = route === "renewal" && pricing.status === "ready" ? (pricing.result.problems || []).find((p) => p.scope === "predecessor") : null;
    const waitsForPredecessor = route === "renewal" && !lastPricing?.predecessor;
    const whyText = (why === "category" && t('key_inv_choose_contract_category'))
        || (why === "driver" && t('key_inv_choose_process_as_driver'))
        || (predecessorProblem && predecessorProblem.text)
        || "";

    /* Continue is enabled only when every field handleNextStep validates is
       filled — employer, worker, branch, invoice date, handling staff, and
       contract type — the Contract category and Process as driver are chosen where they are asked, and a Renewal has its
       predecessor. Mirrors the toast validation; contract eligibility (validateContract) still runs on click. */
    const isNextDisabled = useMemo(() => (standalone
        /* Standalone: the one party, the branch and the invoice date (the CS Owner is the creator) */
        ? !(partyId && currentInvoiceLocalInfo?.branchId && currentInvoiceLocalInfo?.invoice_date)
        /* Exchange: the replacement worker, the branch, the invoice date and the CS Owner, and the setup choices asked */
        : exchangeMode ? !(exchangeReady && currentInvoiceWorkerDetail && currentInvoiceLocalInfo?.branchId && currentInvoiceLocalInfo?.invoice_date
            && currentInvoiceLocalInfo?.csId) || Boolean(why)
        : !(
            currentInvoiceEmployerDetail &&
            currentInvoiceWorkerDetail &&
            currentInvoiceLocalInfo?.branchId &&
            currentInvoiceLocalInfo?.invoice_date &&
            currentInvoiceLocalInfo?.csId &&
            currentInvoiceLocalInfo?.contract_type_internal
        ) || Boolean(why) || waitsForPredecessor),
    [standalone, exchangeMode, exchangeReady, partyId, currentInvoiceEmployerDetail, currentInvoiceWorkerDetail, currentInvoiceLocalInfo, why, waitsForPredecessor]);

    const handleNextStep = useCallback(() => {
        if (standalone) {
            if (!partyId) return ShowToast("error", t(partyType === "worker" ? "key_please_select_worker_first" : "key_please_select_employer_first"));
            if (!currentInvoiceLocalInfo?.branchId) return ShowToast("error", t("key_please_select_branch_first"));
            if (!currentInvoiceLocalInfo?.invoice_date) return ShowToast("error", t("key_please_select_invoice_date_first"));
            /* no contract, so nothing to validate: Invoice items prices with the same input this stage priced with */
            navigate(`/invoices/general/form`, { state: {
                contractFormInfo: {
                    ...currentInvoiceLocalInfo, party_type: partyType, csId: creator.id, cs_name: creator.name,
                    currentInvoiceEmployerDetail: partyType === "employer" ? currentInvoiceEmployerDetail : null,
                    currentInvoiceWorkerDetail: partyType === "worker" ? currentInvoiceWorkerDetail : null,
                },
                setupInput: pricingArgs,
            } });
            return;
        }
        if (exchangeMode) {
            if (!currentInvoiceWorkerDetail) return ShowToast("error", t("key_please_select_worker_first"));
            if (!currentInvoiceLocalInfo?.branchId) return ShowToast("error", t("key_please_select_branch_first"));
            if (!currentInvoiceLocalInfo?.invoice_date) return ShowToast("error", t("key_please_select_invoice_date_first"));
            if (!currentInvoiceLocalInfo?.csId) return ShowToast("error", t("key_please_select_cs_first"));
            /* the replacement worker is checked by the engine on every change and by the server on submission (#56) */
            navigate("/invoices/exchange/add-contract-invoice-exchange", { state: {
                contractFormInfo: { ...currentInvoiceLocalInfo, currentInvoiceEmployerDetail, currentInvoiceWorkerDetail, currentInvoiceExchange: a1 },
                setupInput: pricingArgs,
            } });
            return;
        }
        if (!currentInvoiceEmployerDetail) {
            return ShowToast("error", t('key_please_select_employer_worker_first'));
        }
        if (!currentInvoiceWorkerDetail) {
            return ShowToast("error", t('key_please_select_employer_worker_first'));
        }
        if (!currentInvoiceLocalInfo?.branchId)
            return ShowToast("error", t('key_please_select_branch_first'));
        if (!currentInvoiceLocalInfo?.invoice_date)
            return ShowToast("error", t('key_please_select_invoice_date_first'));
        if (!currentInvoiceLocalInfo?.csId)
            return ShowToast("error", t('key_please_select_cs_first'));

        if (!currentInvoiceLocalInfo?.contract_type_internal)
            return ShowToast("error", t('key_please_select_contract_type_first'));

        /* the Items stage prices with the same input this stage priced with (INV-C3) */
        const toPricing = () => navigate(`/invoices/add-contract-invoice/form`, { state: { contractFormInfo: { ...currentInvoiceLocalInfo, currentInvoiceEmployerDetail, currentInvoiceWorkerDetail, jobInfo: invoiceCurrentJobInfo }, setupInput: pricingArgs } });
        if (pickedEligibleWorkerRef.current !== null && String(pickedEligibleWorkerRef.current) === String(currentInvoiceWorkerDetail?.id)) {
            toPricing();
            return;
        }
        /* OP-27-53: the Renewal exception is scoped to this employer and route (the server checks the predecessor) */
        dispatch(validateContract({ worker_id: currentInvoiceWorkerDetail?.id, employer_id: employerId ? Number(employerId) : null, route, ...(originContractId ? { origin_contract_id: Number(originContractId) } : {}) }))
            .then((res) => {
                console.log("Contract validation response:", res?.payload?.status);
                if (res?.payload?.status !== 400) {
                    ShowToast("error", res?.payload?.message);
                    return;
                } else {
                    toPricing();
                }
            })
            .catch(() => {
                ShowToast("error", t('key_contract_validation_failed'));
            });
    }, [t, dispatch, navigate, standalone, exchangeMode, a1, partyId, partyType, creator, currentInvoiceEmployerDetail, currentInvoiceWorkerDetail, currentInvoiceLocalInfo, invoiceCurrentJobInfo, pricingArgs, employerId, route, originContractId]);

    return (
        <>
            <div className="invd add-contract-invoice">
                <div className="review-breadcrumb">
                    <span className="step here">{ t(standalone ? 'key_invoice_setup' : 'key_contract_setup') }</span>
                    <span className="sep">›</span>
                    <span className="step">{ t('key_pricing_items') }</span>
                    <span className="sep">›</span>
                    {/* an exchange settles on its review: there is no payment step (#72) */}
                    <span className="step">{ t(exchangeMode ? 'key_inv_exchange_settlement_review' : 'key_invoice_review') }</span>
                    { !exchangeMode && <>
                        <span className="sep">›</span>
                        <span className="step">{ t('key_payment_confirmation') }</span>
                    </> }
                </div>
                { exchangeReady && <CommonPageHeaderInvoice title={ t(standalone ? 'key_add_general_invoice' : exchangeMode ? 'key_exchange_contract_invoice' : 'key_add_contract_invoice') } stepBadge={ `${ t('key_step') } 1 ${ t('key_of') } 3` } onUpdateContractForm={ handleUpdateContractForm } currentInvoiceLocalInfo={ currentInvoiceLocalInfo } contractFormInfo={ contractSelectionFormInfo } inCard cardTarget={ invoiceCardNode }
                    csFixed={ standalone ? creator : undefined } context={ exchangeMode ? interpolate(t('key_inv_exchange_of'), a1?.invoice_number || "") : undefined } /> }

                {/* the reference page's three cards (OP-27-43): Employer and worker · Service · Invoice */}
                <div className="cs-setup single">
                    <div>
                        { employerAdded && currentInvoiceEmployerDetail && (
                            <div className="added-banner">
                                <i className="ri-check-line" />
                                <span>
                                    <strong>{ t('key_employer_added_and_selected') }</strong>{ ' ' }
                                    { currentInvoiceEmployerDetail.name }{ currentInvoiceEmployerDetail.reference_id ? ` (${ currentInvoiceEmployerDetail.reference_id })` : '' } { t('key_is_now_on_this_invoice') }
                                </span>
                            </div>
                        ) }
                        { exchangeMode && exchangeReady && (
                            <Suspense fallback={ <CustomSpinner /> }>
                                <ExchangeOriginCard a1={ a1 } pricing={ pricing } />
                                <div className="party-card setup-parties" data-replacement>
                                    <div className="pc-head"><span className="role">{ t('key_inv_replacement_worker') }</span></div>
                                    <div className="pc-body">
                                        <div className="setup-pickers">
                                            <DetailsCardWorker entityName='Worker' currentInvoiceWorkerDetail={ currentInvoiceWorkerDetail } currentContractCategory={ currentContractCategory } actionType="invoice" onSelectClick={ () => setWkrOpen(true) } onEditClick={ () => { setWkrFormId(currentInvoiceWorkerDetail?.id); setWkrFormFromPicker(false); setWkrFormOpen(true); } } typeField={ false } chips={ false } />
                                        </div>
                                        <ContractSetupFacts worker={ currentInvoiceWorkerDetail } categoryName={ currentContractCategory } partner={ lastPricing?.worker?.partner || null } />
                                    </div>
                                </div>
                            </Suspense>
                        ) }
                        {/* @migration-unspecified(invoice): the package names no title for the Standalone party card; "Bill to" was
                            chosen here. Confirm with product before release (OP-27-85). */}
                        { !exchangeMode && <div className="party-card setup-parties">
                            <div className="pc-head"><span className="role">{ t(standalone ? 'key_inv_bill_to' : 'key_inv_employer_and_worker') }</span></div>
                            <div className="pc-body">
                                <Suspense fallback={ <CustomSpinner /> }>
                                    { standalone ? <>
                                        <Field label={ t('key_who_generate_invoice') }>
                                            <RadioGroup name="party_type" ariaLabel={ t('key_who_generate_invoice') } value={ partyType } onChange={ setPartyType }
                                                options={ [{ value: "employer", label: t('key_employer') }, { value: "worker", label: t('key_worker') }] } />
                                        </Field>
                                        <div className="setup-pickers">
                                            { partyType === "employer" && <DetailsCardEmployer entityName='Employer' currentInvoiceEmployerDetail={ currentInvoiceEmployerDetail } actionType="invoice" onSelectClick={ () => setEmpOpen(true) } onEditClick={ () => { setEmpFormId(currentInvoiceEmployerDetail?.employer_id); setEmpFormFromPicker(false); setEmpFormOpen(true); } } /> }
                                            {/* a worker is searched and selected (never created from Invoice); Edit reviews its details */}
                                            { partyType === "worker" && <DetailsCardWorker entityName='Worker' currentInvoiceWorkerDetail={ currentInvoiceWorkerDetail } actionType="invoice" onSelectClick={ () => setWkrOpen(true) } onEditClick={ () => { setWkrFormId(currentInvoiceWorkerDetail?.id); setWkrFormFromPicker(false); setWkrFormOpen(true); } } typeField={ false } /> }
                                        </div>
                                    </> : <>
                                    <div className="setup-pickers">
                                        <DetailsCardEmployer entityName='Employer' currentInvoiceEmployerDetail={ currentInvoiceEmployerDetail } actionType="invoice" onSelectClick={ () => setEmpOpen(true) } onEditClick={ () => { setEmpFormId(currentInvoiceEmployerDetail?.employer_id); setEmpFormFromPicker(false); setEmpFormOpen(true); } } />
                                        {/* Type (Internal) is a Service choice on this screen (INV-C2) and the worker's facts are the row below, not card fields */}
                                        <DetailsCardWorker entityName='Worker' currentInvoiceWorkerDetail={ currentInvoiceWorkerDetail } currentContractCategory={ currentContractCategory } handleUpdateType={ handleUpdateType } actionType="invoice" contractType={ currentInvoiceLocalInfo?.contract_type_internal } onSelectClick={ () => { if (currentInvoiceEmployerDetail) setWkrOpen(true); } } onEditClick={ () => { setWkrFormId(currentInvoiceWorkerDetail?.id); setWkrFormFromPicker(false); setWkrFormOpen(true); } } disableSelect={ !currentInvoiceEmployerDetail } typeField={ false } chips={ false } />
                                    </div>
                                    <ContractSetupFacts worker={ currentInvoiceWorkerDetail } categoryName={ currentContractCategory } partner={ lastPricing?.worker?.partner || null } />
                                    </> }
                                </Suspense>
                            </div>
                        </div> }
                        <Suspense fallback={ <CustomSpinner /> }>
                            <ContractSetupService
                                mode={ mode }
                                worker={ currentInvoiceWorkerDetail }
                                categoryName={ currentContractCategory }
                                route={ route }
                                categoryAsked={ categoryAsked }
                                choices={ serviceChoices }
                                pricing={ pricing }
                                onChoose={ handleChooseService }
                            />
                        </Suspense>
                        <div className="party-card setup-invoice-card">
                            <div className="pc-head"><span className="role">{ t('key_invoice') }</span></div>
                            <div className="pc-body" ref={ setInvoiceCardNode } />
                        </div>
                    </div>
                </div>

                <div className="review-foot">
                    { whyText && <span className="why">{ whyText }</span> }
                    <button type="button" className="btn btn-secondary md" onClick={ handleCancelSelection }><i className="ri-close-line" />{ t('key_cancel') }</button>
                    <button type="button" className="btn btn-primary md" onClick={ handleNextStep } disabled={ isNextDisabled }>{ t('key_continue_to_pricing_items') || t('key_next') }<i className="ri-arrow-right-s-line" /></button>
                </div>
            </div>
            <Suspense fallback={ null }>
                <CancelContractPopup showConfirmDialog={ showConfirmDialog } cancelContractDialog={ cancelContractDialog } confirmCancelContract={ confirmCancelContract } trans={ t } />
            </Suspense>
            <Suspense fallback={ null }>
                <SelectEmployerModal
                    open={ empOpen }
                    onClose={ () => setEmpOpen(false) }
                    onSelect={ (emp) => { dispatch(setInvoiceCurrentEmployer({ ...emp })); setEmployerAdded(false); setEmpOpen(false); } }
                    onNewEmployer={ () => { setEmpOpen(false); setEmpFormId(null); setEmpFormFromPicker(true); setEmpFormOpen(true); } }
                />
                <SelectWorkerModal
                    open={ wkrOpen }
                    exchange={ exchangeMode }
                    employerName={ standalone ? undefined : currentInvoiceEmployerDetail?.name }
                    employerId={ standalone ? undefined : employerId }
                    onClose={ () => setWkrOpen(false) }
                    onSelect={ (wkr) => {
                        /* Standalone: no contract to check; the worker's details are reviewed in its own form, as before. Exchange:
                           a contract-held worker cannot be picked (#76); the engine and the server check the rest (#56) */
                        if (standalone || exchangeMode) {
                            setWkrOpen(false); setWkrFormId(wkr.id); setWkrFormFromPicker(true); setWkrFormOpen(true);
                            return;
                        }
                        /* Mockup blocks ineligible workers at selection time. Reuses the same
                           validateContract thunk the Continue button runs (which stays in place
                           as the safety net) — status 400 means the worker is eligible. */
                        dispatch(validateContract({ worker_id: wkr.id, employer_id: employerId ? Number(employerId) : null }))
                            .then((res) => {
                                if (res?.payload?.status !== 400) {
                                    ShowToast("error", res?.payload?.message || t('key_worker_already_active_processing_contract'));
                                    return;
                                }
                                pickedEligibleWorkerRef.current = wkr.id;
                                setWkrOpen(false); setWkrFormId(wkr.id); setWkrFormFromPicker(true); setWkrFormOpen(true);
                            })
                            .catch(() => { setWkrOpen(false); setWkrFormId(wkr.id); setWkrFormFromPicker(true); setWkrFormOpen(true); });
                    } }
                />
            </Suspense>
            { empFormOpen && (
                <Suspense fallback={ null }>
                    <AddEmployerDetailsOfInvoice
                        asModal
                        standalone={ standalone }
                        employerId={ empFormId }
                        onClose={ () => setEmpFormOpen(false) }
                        onBack={ empFormFromPicker ? () => { setEmpFormOpen(false); setEmpOpen(true); } : undefined }
                        onDone={ (emp) => { dispatch(setInvoiceCurrentEmployer({ ...emp })); setEmployerAdded(empFormId == null); setEmpFormOpen(false); } }
                    />
                </Suspense>
            ) }
            { wkrFormOpen && standalone && (
                <Suspense fallback={ null }>
                    <StandaloneWorkerDetails
                        workerId={ wkrFormId }
                        onClose={ () => setWkrFormOpen(false) }
                        onBack={ wkrFormFromPicker ? () => { setWkrFormOpen(false); setWkrOpen(true); } : undefined }
                        onDone={ (wkr) => {
                            dispatch(setInvoiceCurrentWorker(wkr));
                            dispatch(clearInvoiceContractItemsList());
                            setWkrFormOpen(false);
                        } }
                    />
                </Suspense>
            ) }
            { wkrFormOpen && !standalone && (
                <Suspense fallback={ null }>
                    <AddWorkerDetailsOfInvoice
                        asModal
                        workerId={ wkrFormId }
                        onClose={ () => setWkrFormOpen(false) }
                        onBack={ wkrFormFromPicker ? () => { setWkrFormOpen(false); setWkrOpen(true); } : undefined }
                        onDone={ (wkr) => {
                            dispatch(setInvoiceCurrentWorker(wkr));
                            dispatch(clearInvoiceContractItemsList());
                            setWkrFormOpen(false);
                        } }
                    />
                </Suspense>
            ) }
        </>
    );
};

AddContractInvoice.propTypes = {
    /** STANDALONE for a Standalone Invoice (the /invoices/general/ routes), EXCHANGE for an Exchange (the /invoices/exchange/
        routes); a Contract Invoice otherwise */
    mode: PropTypes.oneOf([STANDALONE, EXCHANGE]),
};

export default AddContractInvoice;