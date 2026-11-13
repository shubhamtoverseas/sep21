import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../../../components/Icon/Icon";
import translation from "../../../../utils/translation";
import routes from "../../routes/routesConfig";
import { fetchProcessingGlobalSatusList } from "../../../../redux/Slices/processing/ProcessingSlice";
import { getCurrentUser, hasPermission } from "../../../../services/commonService";
import { startExtendVisaAPI } from "../../../../services/processings";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { caseRoute, xvCall } from "../extend-visa/extendVisaUtils";
import OwnersPill from "./OwnersPill";
import ActionsMenu from "./ActionsMenu";
import { EM_DASH, canOpenWorker, dateOrDash, isActive, isClosed, phaseTargets, statusKeyOf } from "./contractRecordUtils";
import { CONTRACT_STATUS } from "../../ProcessingPage/processingConstants";
import { CD_PERMISSION, CD_STATUS_LABEL_KEYS, CR_TAB_LABEL_KEYS, CR_TABS } from "../contractConstants";
import { recordEditRules } from "./recordEditRules";

const ContractStatusDialog = lazy(() => import("./ContractStatusDialogs"));
const ManageOwnersDrawer = lazy(() => import("./ManageOwnersDrawer"));

const SummaryCell = ({ labelKey, value, mono, wrap, children }) => (
    <div data-mc-field="">
        <div className="lbl">{ translation(labelKey) }</div>
        { children || <div className={ `val${ value ? "" : " empty" }${ mono ? " mono" : "" }${ wrap ? " wrap" : "" }` }>{ value || EM_DASH }</div> }
    </div>
);
SummaryCell.propTypes = { labelKey: PropTypes.string.isRequired, value: PropTypes.node, mono: PropTypes.bool, wrap: PropTypes.bool, children: PropTypes.node };

/**
 * Record header (prototype headerHTML): name · phase chip · Group chip · worker code (a link to Worker Details when
 * permitted, neutral otherwise) · Copy · Owners pill · Edit · Actions; the summary grid (two rows of four, the reason as
 * a ninth cell on a closed contract); the record tabs.
 */
const RecordHeader = ({ contractId, row, stages, contractDetails, permissions, tabs = CR_TABS, tab, onTab, onEdit, onChanged, children }) => {
    const dispatch = useDispatch();
    const { processingGlobalStatusList } = useSelector((s) => s.processing);
    const { permissionList } = useSelector((s) => s.users);
    const perms = permissionList?.data;
    const [target, setTarget] = useState(null);
    const [dialog, setDialog] = useState(null);           /* 'owners' */
    const [startingXv, setStartingXv] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { if (contractId) dispatch(fetchProcessingGlobalSatusList({ contract_id: contractId })); }, [dispatch, contractId]);

    const statusId = Number(row.contract_status);
    const statusKey = statusKeyOf(statusId);
    const targets = useMemo(() => phaseTargets(statusId, processingGlobalStatusList), [statusId, processingGlobalStatusList]);
    const isPartner = getCurrentUser()?.data?.staff?.staff_type === "partner";
    const workerLink = row.worker_id && canOpenWorker(perms, isPartner) ? routes.workerDetails.replace(":worker_id", row.worker_id).replace("/:tab?", "") : null;
    const canChangeStatus = Boolean(permissions?.isChangeStatusPermission);
    /* PERM §6.7 / PROCESS §3.3.2 "Edit": the record's own metadata (Requested Start Date, Arrival Date) in the Edit record dialog — never the
       Employer form; Stage Actions `edit` in the viewer's context, and a status with at least one editable field (not Cancelled; B23) */
    const canEdit = Boolean(permissions?.isEditContractPermission) && recordEditRules(statusId).canOpen;
    const canChangeAssistant = hasPermission(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.CHANGE_ASSISTANT);
    const canChangeOwner = Boolean(permissions?.isChangeOwnerPermission);
    /* Prepared / Ready owner registers: one grant (admin always), only while Processing */
    const canChangePrepReady = hasPermission(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.CHANGE_PREP_READY) && statusId === CONTRACT_STATUS.PROCESSING;
    const canManageOwners = canChangeAssistant || canChangeOwner || canChangePrepReady;
    /* Extend Visa (EXTEND.md §15.2): details.extend_visa { open_case, latest_terminal, total, can_start_phase } */
    const xv = contractDetails?.extend_visa || null;
    const xvOpen = xv?.open_case || null;
    const canStartXv = Boolean(xv?.can_start_phase) && !xvOpen && isActive(row) && hasPermission(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.START_EXTEND_VISA);
    const extendVisa = xvOpen ? "open" : (canStartXv ? (startingXv ? "starting" : "start") : null);
    const onExtendVisa = useCallback(async () => {
        if (xvOpen?.extend_visa_case_id) { navigate(caseRoute(contractId, xvOpen.extend_visa_case_id)); return; }
        if (!canStartXv || startingXv) return;
        setStartingXv(true);
        const res = await xvCall(startExtendVisaAPI(contractId));
        setStartingXv(false);
        if (!res.ok || !res.data?.extend_visa_case_id) { ShowToast("error", res.message); onChanged(); return; }
        navigate(caseRoute(contractId, res.data.extend_visa_case_id));
    }, [xvOpen, canStartXv, startingXv, contractId, navigate, onChanged]);

    const afterStatusChange = useCallback(() => { setTarget(null); dispatch(fetchProcessingGlobalSatusList({ contract_id: contractId })); onChanged(); }, [dispatch, contractId, onChanged]);
    const copyCode = useCallback(() => { if (row.worker_code) navigator.clipboard?.writeText(row.worker_code); }, [row.worker_code]);

    const closed = isClosed(row);
    const reasonKey = statusId === CONTRACT_STATUS.CANCELLED ? "key_cd_cancellation_reason" : "key_cd_completion_reason";
    const reason = statusId === CONTRACT_STATUS.CANCELLED ? row.cancellation_reason : row.completion_reason;

    return (
        <div className="mcdt-rec">
            <div className="mcdt-head">
                <div className="hl">
                    <h1>
                        <span>{ row.worker_name }</span>
                        <span className={ `mcdt-pill ${ statusKey }` } data-phase-chip=""><span className="dot" aria-hidden="true" />{ translation(CD_STATUS_LABEL_KEYS[statusKey]) }</span>
                        { row.group && <span className="mcdt-pill" data-group-chip="">{ translation("key_group") } { row.group }</span> }
                    </h1>
                    <div className="mcdt-ref">
                        { row.worker_code
                            ? (workerLink
                                ? <Link className="code link" to={ workerLink } title={ `${ translation("key_cr_open_worker_details") } — ${ row.worker_code }` }>{ row.worker_code }</Link>
                                : <span className="code">{ row.worker_code }</span>)
                            : <span className="code">{ EM_DASH }</span> }
                        { row.worker_code && <button type="button" className="g1-btn copy" onClick={ copyCode }>{ translation("key_copy") }</button> }
                    </div>
                </div>
                <div className="mcdt-hact">
                    <OwnersPill row={ row } />
                    { canEdit && (
                        <button type="button" className="g1-btn mcdt-g1" data-fid="edit-contract" onClick={ onEdit }>
                            <Icon name="edit" size={ 12 } strokeWidth={ 1.5 } />{ translation("key_edit") }
                        </button>
                    ) }
                    <ActionsMenu
                        currentName={ translation(CD_STATUS_LABEL_KEYS[statusKey]) }
                        targets={ targets }
                        canChangeStatus={ canChangeStatus }
                        canManageOwners={ canManageOwners }
                        onPickStatus={ setTarget }
                        onManageOwners={ () => setDialog("owners") }
                        extendVisa={ extendVisa }
                        onExtendVisa={ onExtendVisa }
                    />
                </div>
            </div>

            <div className="mcdt-summary">
                <div className="mcdt-grid g1-summary">
                    <SummaryCell labelKey="key_contract_category" value={ row.contract_category } />
                    <SummaryCell labelKey="key_nationality" value={ row.nationality } />
                    <SummaryCell labelKey="key_location" value={ row.location } />
                    <SummaryCell labelKey="key_branch" value={ row.branch_name } />
                    <SummaryCell labelKey="key_contract_date" value={ dateOrDash(row.contract_date) } />
                    <SummaryCell labelKey="key_start_date" value={ dateOrDash(row.contract_start) } />
                    <SummaryCell labelKey="key_contract_end" value={ dateOrDash(row.contract_end) }>
                        { isActive(row) && (
                            <div className={ `val tagged${ row.contract_end ? "" : " empty" }` }>
                                <span className="txt">{ dateOrDash(row.contract_end) }</span>
                                { row.contract_end && <span className="mcdt-tag">{ translation("key_expected") }</span> }
                            </div>
                        ) }
                    </SummaryCell>
                    <SummaryCell labelKey="key_contract_number" value={ row.contract_number } mono />
                    { closed && <SummaryCell labelKey={ reasonKey } value={ reason } wrap /> }
                </div>
            </div>
            { children }

            <div className="mcdt-tabs" role="tablist" aria-label={ translation("key_cr_record_tabs") }>
                { tabs.map((key) => (
                    <button key={ key } type="button" role="tab" aria-selected={ tab === key } className={ tab === key ? "on" : "" } onClick={ () => onTab(key) }>
                        { translation(CR_TAB_LABEL_KEYS[key]) }
                    </button>
                )) }
            </div>

            <Suspense fallback={ null }>
                { target !== null && (
                    <ContractStatusDialog target={ target } current={ statusId } contractId={ contractId } row={ row } stages={ stages } contractDetails={ contractDetails } permissions={ permissions } onClose={ () => setTarget(null) } onDone={ afterStatusChange } />
                ) }
                { dialog === "owners" && (
                    <ManageOwnersDrawer contractId={ contractId } row={ row } canChangeOwner={ canChangeOwner } canChangeAssistant={ canChangeAssistant } canChangePrepReady={ canChangePrepReady } onClose={ () => setDialog(null) } onChanged={ onChanged } />
                ) }
            </Suspense>
        </div>
    );
};

RecordHeader.propTypes = {
    /* opens the contract's top-level field editor in the rail (U-0276) */
    onEdit: PropTypes.func,
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object.isRequired,
    stages: PropTypes.arrayOf(PropTypes.string).isRequired,
    contractDetails: PropTypes.object,
    permissions: PropTypes.object,
    tabs: PropTypes.arrayOf(PropTypes.string),
    tab: PropTypes.string.isRequired,
    onTab: PropTypes.func.isRequired,
    onChanged: PropTypes.func.isRequired,
    children: PropTypes.node,
};

export default RecordHeader;
