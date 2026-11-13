import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../../../components/Icon/Icon";
import { fetchContractDetailsById } from "../../../../redux/Slices/contract/ContractSlice";
import { canAccessProcessingDetails, useProcessingPermissions } from "../../../../utils/permissions/processingPermissionsUtils";
import { getContractDashboardListAPI } from "../../../../services/contracts";
import translation from "../../../../utils/translation";
import RecordHeader from "./RecordHeader";
import ActiveWorkBand from "./ActiveWorkBand";
import ContextRail from "./ContextRail";
import ProgressTab from "./ProgressTab";
import DetailsTab from "./DetailsTab";
import InvoiceTab from "./InvoiceTab";
import ActivityTab from "./ActivityTab";
import ContractEditRecordDialog from "./ContractEditRecordDialog";
import { hasPermission } from "../../../../services/commonService";
import { canOpenEmployer, railToggle } from "./contractRecordUtils";
import { CONTRACT_RECORD_QUERY, CONTRACT_STAGE_TAB_KEY } from "../../ProcessingPage/processingConstants";
import { CD_DEFAULT_STAGE_ORDER, CD_PERMISSION, CD_STAGE, CR_DETAIL_SECTION, CR_FORM_PERMISSION, CR_PERMISSION, CR_TAB, CR_TABS } from "../contractConstants";
import "./ContractDetails.css";

const ContractForms = lazy(() => import("../forms/ContractForms")); // the Forms tab: Master Form · ID 988A · ID 988B · ID 407 on one model
const ContractDocuments = lazy(() => import("./ContractDocuments")); // ?docs=<folder>: the Documents view replaces the record

/**
 * /contracts/details/:contract_id — the Contract record (prototype Contract_Details.html). Left: the context rail.
 * Right: the record header (name, phase, code, owners, Edit, Actions), the summary grid, the Active-contract work band,
 * the five tabs (Progress · Details · Forms · Invoice · Activity) and the Documents view. Data: one row of
 * POST /contract/global/dashboard-list (with stages) plus the Processing record (state.contracts.contractDetails) the
 * stage tabs, dialogs and terminal flows read. A record the viewer may not open (Details View) or that the server does
 * not deliver shows one neutral surface with no record facts.
 */
const Denied = () => (
    <div className="mcdt-denied" role="status" data-record-denied="" data-mc-denial="neutral">
        <div className="ic"><Icon name="lock" size={ 17 } strokeWidth={ 1.7 } /></div>
        <h1>{ translation("key_not_available") }</h1>
        <p>{ translation("key_cr_no_access_to_record") }</p>
    </div>
);
/* the details read failed (Priyanka 3 Nov: 404 with the reason, or a 200 with status:false): an error, not a record */
const LoadError = ({ message }) => (
    <div className="mcdt-denied" role="alert" data-record-error="">
        <div className="ic"><Icon name="alert" size={ 17 } strokeWidth={ 1.7 } /></div>
        <h1>{ translation("key_couldnt_load_this_view") }</h1>
        <p>{ message || translation("key_something_went_wrong") }</p>
    </div>
);
LoadError.propTypes = { message: PropTypes.string };

const ContractDetails = () => {
    const { contract_id: contractId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const docsFolder = searchParams.get(CONTRACT_RECORD_QUERY.DOCS);
    const arrivalTab = searchParams.get(CONTRACT_RECORD_QUERY.TAB);
    const arrivalStage = searchParams.get(CONTRACT_RECORD_QUERY.STAGE);
    const { contractDetails, contractDetailsError } = useSelector((s) => s.contracts);
    const { permissionList, ownerOnboardingList } = useSelector((s) => s.users);
    const permissions = useProcessingPermissions(permissionList, ownerOnboardingList, contractId);
    const perms = permissionList?.data;
    const [row, setRow] = useState(null);
    const [stageOrder, setStageOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [tab, setTab] = useState(() => (CR_TABS.includes(arrivalTab) ? arrivalTab : CR_TAB.PROGRESS));
    /* PERM §6.7: without Forms — View the Forms tab is hidden */
    const visibleTabs = useMemo(() => CR_TABS.filter((t) => t !== CR_TAB.FORMS || (permissions?.formPermissions || []).includes(CR_FORM_PERMISSION.VIEW)), [permissions?.formPermissions]);
    useEffect(() => { if (!visibleTabs.includes(tab)) setTab(CR_TAB.PROGRESS); }, [visibleTabs, tab]);
    const [stage, setStage] = useState(() => (arrivalStage ? Object.keys(CONTRACT_STAGE_TAB_KEY).find((k) => CONTRACT_STAGE_TAB_KEY[k] === arrivalStage) || arrivalStage : CD_STAGE.CONTRACT));
    const [detailSection, setDetailSection] = useState(CR_DETAIL_SECTION.VISA);
    const [editOpen, setEditOpen] = useState(false);     /* header Edit → the "Edit record" dialog (PROCESS §3.3.2); the rail pencil closes it */

    useEffect(() => {
        let alive = true;
        if (reload === 0) setLoading(true);
        (async () => {
            try {
                /* both reads before the record renders: the row (header, stages) and the Processing record (stage panels) */
                const [, res] = await Promise.all([dispatch(fetchContractDetailsById(contractId)), getContractDashboardListAPI({ contract_id: Number(contractId), limit: 1 })]);
                if (!alive) return;
                const d = res?.data?.status ? res.data.data : null;
                setRow(d?.data?.[0] || null); setStageOrder(d?.stage_order || null);
            } catch { if (alive) setRow(null); }
            finally { if (alive) setLoading(false); }
        })();
        return () => { alive = false; };
    }, [contractId, reload, dispatch]);
    const refresh = useCallback(() => setReload((n) => n + 1), []);

    const openDocs = useCallback((folder) => { const p = new URLSearchParams(searchParams); p.set(CONTRACT_RECORD_QUERY.DOCS, folder); setSearchParams(p, { state: location.state }); }, [searchParams, setSearchParams, location.state]);
    const closeDocs = useCallback(() => {
        /* opened from the retired Processing screen's Documents address: "‹" goes back there */
        if (location.state?.fromProcessing && (window.history.state?.idx ?? 0) > 0) { navigate(-1); return; }
        const p = new URLSearchParams(searchParams); p.delete(CONTRACT_RECORD_QUERY.DOCS); setSearchParams(p); refresh();
    }, [searchParams, setSearchParams, refresh, location.state, navigate]);

    const stages = useMemo(() => (row ? (row.stage_order || (stageOrder && stageOrder[row.group]) || CD_DEFAULT_STAGE_ORDER[row.group] || Object.keys(row.stages || {})) : []), [row, stageOrder]);
    const railAccess = useMemo(() => ({
        remarks: railToggle(perms, permissions.isOwnerPermissions, CR_PERMISSION.REMARKS),
        followUp: Boolean(permissions.isViewFollowUpPermission),
        chatHistory: railToggle(perms, permissions.isOwnerPermissions, CR_PERMISSION.CHAT_HISTORY),
    }), [perms, permissions.isOwnerPermissions, permissions.isViewFollowUpPermission]);

    if (loading) return <div className="mcdt"><div className="mcdt-loading">{ translation("key_loading") }…</div></div>;
    if (contractDetailsError !== null && contractDetailsError !== undefined) {
        return <div className="mcdt" data-mc-module="contract-details"><aside className="mcdt-side" data-rail-denied="" aria-hidden="true" /><main className="mcdt-main"><LoadError message={ contractDetailsError } /></main></div>;
    }
    /* Details View composed with ownership, or no record delivered: one neutral surface, no rail, no record facts */
    if (!row || !canAccessProcessingDetails(permissions)) {
        return <div className="mcdt" data-mc-module="contract-details"><aside className="mcdt-side" data-rail-denied="" aria-hidden="true" /><main className="mcdt-main"><Denied /></main></div>;
    }

    return (
        <div className="mcdt" data-mc-module="contract-details">
            <ContextRail contractId={ contractId } row={ row } contractDetails={ contractDetails } permissions={ permissions } railAccess={ railAccess } canOpenEmployer={ canOpenEmployer(perms) } editOpen={ editOpen } onRailEdit={ () => setEditOpen(false) } onChanged={ refresh } />
            <main className="mcdt-main">
                { docsFolder ? (
                    <div className="mcdt-body">
                        <Suspense fallback={ <div className="mcdt-note">{ translation("key_loading") }…</div> }>
                            <ContractDocuments contractId={ contractId } row={ row } folder={ docsFolder } permissions={ permissions } onFolder={ openDocs } onBack={ closeDocs } />
                        </Suspense>
                    </div>
                ) : (
                    <>
                        <RecordHeader contractId={ contractId } row={ row } stages={ stages } contractDetails={ contractDetails } permissions={ permissions } tabs={ visibleTabs } tab={ tab } onTab={ setTab } onEdit={ () => setEditOpen(true) } onChanged={ refresh }>
                            <ActiveWorkBand contractId={ contractId } row={ row } canEdit={ Boolean(permissions?.stageActionPermissions?.includes("edit")) } canStartExtendVisa={ Boolean(contractDetails?.extend_visa?.can_start_phase) && !contractDetails?.extend_visa?.open_case && hasPermission(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.START_EXTEND_VISA) } />
                        </RecordHeader>
                        <div className="mcdt-content">
                            <div className="mcdt-body"><div className="col" data-mc-fullbleed="">
                                { tab === CR_TAB.PROGRESS && (
                                    <ProgressTab contractId={ contractId } row={ row } stages={ stages } stage={ stage } onStage={ setStage } contractDetails={ contractDetails } permissions={ permissions } onChanged={ refresh } />
                                ) }
                                { tab === CR_TAB.DETAILS && <DetailsTab contractId={ contractId } row={ row } section={ detailSection } onSection={ setDetailSection } canEditVisaExpiry={ Boolean(permissions?.stageActionPermissions?.includes("edit")) } onChanged={ refresh } /> }
                                { tab === CR_TAB.FORMS && (
                                    <div className="mcdt-forms">
                                        <Suspense fallback={ <div className="mcdt-note">{ translation("key_loading") }…</div> }><ContractForms contractId={ contractId } row={ row } formPermissions={ permissions?.formPermissions || [] } /></Suspense>
                                    </div>
                                ) }
                                { tab === CR_TAB.INVOICE && <InvoiceTab row={ row } /> }
                                { tab === CR_TAB.ACTIVITY && <ActivityTab contractId={ contractId } /> }
                            </div></div>
                        </div>
                    </>
                ) }
            </main>
            { editOpen && <ContractEditRecordDialog contractId={ contractId } row={ row } contractDetails={ contractDetails } onClose={ () => setEditOpen(false) } onSaved={ refresh } /> }
        </div>
    );
};

export default ContractDetails;
