import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../../../components/Icon/Icon";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import routes from "../../routes/routesConfig";
import { fetchContractDetailsById } from "../../../../redux/Slices/contract/ContractSlice";
import { canAccessProcessingDetails, useProcessingPermissions } from "../../../../utils/permissions/processingPermissionsUtils";
import { getContractDashboardListAPI } from "../../../../services/contracts";
import { extendVisaOwnerAPI } from "../../../../services/processings";
import PrepReadyReassignDialog from "../details/PrepReadyReassignDialog";
import ContextRail from "../details/ContextRail";
import { stageToken } from "../../../../components/Processing/StageTitle";
import { Avatar } from "../details/OwnersPill";
import { canOpenEmployer, dateOrDash, formatDate, railToggle } from "../details/contractRecordUtils";
import useExtendVisaCase from "./useExtendVisaCase";
import ExtendVisaImmigration from "./ExtendVisaImmigration";
import ExtendVisaVisa from "./ExtendVisaVisa";
import { caseLabel, isTerminalCase, lifecycleLabel, lifecycleTone, xvCall } from "./extendVisaUtils";
import { FolderFiles } from "./ExtendVisaShared";
import { CR_OWNER_ROLE, CR_PERMISSION, CR_XV, CR_XV_STAGE_KEY } from "../contractConstants";
import "../details/ContractDetails.css";
import "./extend-visa.css";

const STAGE = Object.freeze({ IMM: "immigration", VISA: "visa" });

const NotFound = () => (
    <div className="mcdt" data-mc-module="extend-visa-case"><main className="mcdt-main">
        <div className="mcdt-denied" role="status" data-record-denied="" data-mc-denial="neutral">
            <div className="ic"><Icon name="lock" size={ 17 } strokeWidth={ 1.7 } /></div>
            <h1>{ translation("key_not_available") }</h1>
            <p>{ translation("key_cr_no_access_to_record") }</p>
        </div>
    </main></div>
);

/**
 * /contracts/details/:contract_id/extend-visa/:extend_visa_case_id — one Extend Visa case (EXTEND.md §2, §15.2; prototype
 * group 'ev' record): the parent's name with the phase chip and the "Extend Visa · EV-n · Completed / Cancelled" chip,
 * a link back to the parent, the Prepared / Ready owners of the case, the two-stage rail (Immigration · Visa) and the
 * selected stage's panel. The parent's context rail (Context · Chat, Remarks, Follow Up, Chat History) stays beside the
 * case as in the prototype (group 'ev' renders inside the parent record). A terminal case is locked: every control is
 * withdrawn, evidence and Activity stay readable. Any refusal is the one neutral not-found surface (§2.2 non-disclosure).
 */
const ExtendVisaCase = () => {
    const { contract_id: contractId, extend_visa_case_id: caseId } = useParams();
    const dispatch = useDispatch();
    const { contractDetails } = useSelector((s) => s.contracts);
    const { permissionList, ownerOnboardingList } = useSelector((s) => s.users);
    const permissions = useProcessingPermissions(permissionList, ownerOnboardingList, contractId);
    const cs = useExtendVisaCase(contractId, caseId);
    const [stage, setStage] = useState(STAGE.IMM);
    const [row, setRow] = useState(null);                /* the parent's dashboard row — the rail reads it */
    const [reassign, setReassign] = useState(null);      /* CR_OWNER_ROLE.PREPARED · READY — the owner dialog open for that register */
    const perms = permissionList?.data;
    const loadRow = useCallback(async () => {
        try { const res = await getContractDashboardListAPI({ contract_id: Number(contractId), limit: 1 }); setRow(res?.data?.status ? (res.data.data?.data?.[0] || null) : null); }
        catch { setRow(null); }
    }, [contractId]);
    useEffect(() => { loadRow(); }, [loadRow]);
    const railAccess = useMemo(() => ({
        remarks: railToggle(perms, permissions.isOwnerPermissions, CR_PERMISSION.REMARKS),
        followUp: Boolean(permissions.isViewFollowUpPermission),
        chatHistory: railToggle(perms, permissions.isOwnerPermissions, CR_PERMISSION.CHAT_HISTORY),
    }), [perms, permissions.isOwnerPermissions, permissions.isViewFollowUpPermission]);
    const onParentChanged = useCallback(() => { loadRow(); dispatch(fetchContractDetailsById(contractId)); }, [loadRow, dispatch, contractId]);
    /* backend 378 (EXTEND §11.3): assign / reassign a register of this case; the dialog reads the xvCall result (409 = stale unless "already assigned") */
    const caseRef = cs.caseRef;
    const submitOwner = useCallback((body) => xvCall(extendVisaOwnerAPI(caseRef, body)), [caseRef]);

    useEffect(() => { if (contractId && String(contractDetails?.id) !== String(contractId)) dispatch(fetchContractDetailsById(contractId)); }, [dispatch, contractId, contractDetails?.id]);
    /* a case that has reached the Visa stage opens on it */
    useEffect(() => { if (cs.data && cs.data.immigration?.status === CR_XV.IMM.SUBMITTED && cs.data.visa?.status !== CR_XV.VISA.NOT_READY) setStage(STAGE.VISA); }, [cs.data?.extend_visa_case_id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (cs.loading) return <div className="mcdt"><div className="mcdt-loading">{ translation("key_loading") }…</div></div>;
    /* U-0308: record access (Details View composed with ownership) opens the case; a refusal is the same neutral surface */
    if (cs.notFound || !cs.data || !canAccessProcessingDetails(permissions)) return <NotFound />;
    const c = cs.data;
    /* K-8: the server composes the rail grant (Stage Actions · View) — without it the case opens with the rail withdrawn */
    const stageView = c.can?.view_rail !== undefined ? Boolean(c.can.view_rail) : Boolean(permissions?.stageActionPermission?.includes("view"));
    const terminal = isTerminalCase(c);
    const parentLink = routes.contractDetails.replace(":contract_id", String(contractId));
    const immTok = stageToken(CR_XV_STAGE_KEY.IMM, c.immigration?.status);
    const visaTok = stageToken(CR_XV_STAGE_KEY.VISA, c.visa?.status);
    const rail = [
        { key: STAGE.IMM, label: translation("key_immigration"), tok: immTok, at: c.immigration?.updated_at },
        { key: STAGE.VISA, label: headingCase(translation("key_visa")), tok: visaTok, at: c.visa?.updated_at },
    ];
    const owners = [
        { role: CR_OWNER_ROLE.PREPARED, labelKey: "key_prepared_owner", o: c.owners?.prepared },
        { role: CR_OWNER_ROLE.READY, labelKey: "key_ready_owner", o: c.owners?.ready },
    ];
    /* the server composes the grant (open case + Change Prepared / Ready owner, or admin); nothing is offered on a terminal case */
    const canChangeOwner = Boolean(c.can?.change_owner) && !terminal;
    const holderOf = (o) => (o && (o.staff_id ?? o.id) != null ? { id: o.staff_id ?? o.id, name: o.name || "" } : null);
    const reassignOwner = owners.find((x) => x.role === reassign);

    return (
        <div className="mcdt mcdt-xv" data-mc-module="extend-visa-case" data-xv-lifecycle={ c.lifecycle }>
            { row ? <ContextRail contractId={ contractId } row={ row } contractDetails={ contractDetails } permissions={ permissions } railAccess={ railAccess } canOpenEmployer={ canOpenEmployer(perms) } onChanged={ onParentChanged } />
                : <aside className="mcdt-side" data-rail-loading="" aria-hidden="true" /> }
            <main className="mcdt-main">
                <div className="mcdt-rec">
                    <Link className="mcdt-xvback" to={ parentLink }><Icon name="chev_left" size={ 12 } strokeWidth={ 1.8 } />{ translation("key_cr_xv_back_to_contract") }</Link>
                    <div className="mcdt-head">
                        <div className="hl">
                            <h1>
                                <span>{ contractDetails?.worker_name || "" }</span>
                                <span className="mcdt-pill active" data-phase-chip=""><span className="dot" aria-hidden="true" />{ translation("key_active") }</span>
                                <span className={ `mcdt-pill xv ${ lifecycleTone(c.lifecycle) }` } data-ev-case-chip={ c.lifecycle }>
                                    { translation("key_stage_extend_visa") } · { caseLabel(c) }{ terminal ? ` · ${ lifecycleLabel(c.lifecycle) }` : "" }
                                </span>
                            </h1>
                            <div className="mcdt-ref"><span className="code">{ contractDetails?.contract_number || contractDetails?.worker_code || "" }</span></div>
                        </div>
                        <div className="mcdt-hact mcdt-xvowners" data-xv-owners="">
                            { owners.map(({ role, labelKey, o }) => (
                                <div key={ role } className="xvown">
                                    <Avatar name={ o?.name } role={ role } size="md" />
                                    <div className="b">
                                        <div className={ `nm${ o?.name ? "" : " unassigned" }` }>{ o?.name || translation("key_unassigned") }{ o?.name && o?.active === false && <span className="inactive">{ translation("key_inactive") }</span> }</div>
                                        <div className="rl">
                                            { translation(labelKey) }
                                            { canChangeOwner && <button type="button" className="xvown-act" data-xv-owner-act={ role } disabled={ cs.busy } onClick={ () => setReassign(role) }>{ translation(o?.name ? "key_change" : "key_assign") }</button> }
                                        </div>
                                    </div>
                                </div>
                            )) }
                        </div>
                        { reassignOwner && (
                            <PrepReadyReassignDialog role={ reassignOwner.role } contractId={ contractId } row={ row || {} } holder={ holderOf(reassignOwner.o) } submit={ submitOwner } onClose={ () => setReassign(null) } onChanged={ cs.reload } />
                        ) }
                    </div>
                </div>
                <div className="mcdt-content">
                    <div className="mcdt-body"><div className="col" data-mc-fullbleed="">
                        { /* U-0308: the case rail needs Stage Actions · View; without it the rail and the status menus are withdrawn, the panel facts stay */ }
                        { stageView && <div className="mcdt-stages g1-stage-rail" role="tablist" aria-label={ translation("key_stage_extend_visa") } data-stages="2">
                            { rail.map((r) => (
                                <button key={ r.key } type="button" role="tab" aria-selected={ stage === r.key } className={ `mcdt-stage${ stage === r.key ? " on" : "" }` } onClick={ () => setStage(r.key) }>
                                    <div className="n">{ r.label }</div>
                                    <div className="d">{ dateOrDash(r.at) }</div>
                                    <div className={ `mcdt-tok ${ r.tok.tone }` }><span>{ r.tok.label }</span></div>
                                </button>
                            )) }
                        </div> }
                        { terminal && (
                            <div className="mcdt-lock"><div className="mcdt-xvlock" role="status" data-stage-lock={ c.lifecycle }>
                                <Icon name="lock" size={ 13 } strokeWidth={ 1.6 } />
                                <span>
                                    { c.lifecycle === CR_XV.LIFECYCLE.CANCELLED
                                        ? `${ translation("key_cr_xv_locked_cancelled") }${ c.cancel_reason ? ` (${ c.cancel_reason })` : "" }${ c.cancelled_at ? ` · ${ formatDate(c.cancelled_at) }` : "" }`
                                        : `${ translation("key_cr_xv_locked_completed") }${ c.completed_at ? ` · ${ formatDate(c.completed_at) }` : "" }` }
                                </span>
                            </div></div>
                        ) }
                        { stageView ? (
                            <div className="tab-content mcdt-embed" data-stage-locked={ terminal ? "" : undefined }>
                                { stage === STAGE.IMM
                                    ? <ExtendVisaImmigration caseData={ c } run={ cs.run } busy={ cs.busy } permissions={ permissions } stageView={ stageView } />
                                    : <ExtendVisaVisa caseData={ c } run={ cs.run } busy={ cs.busy } permissions={ permissions } stageView={ stageView } onCompleted={ () => dispatch(fetchContractDetailsById(contractId)) } /> }
                            </div>
                        ) : (
                            <div className="tab-content mcdt-embed" data-xv-rail-withdrawn="">
                                <div className="g1-note">{ translation("key_cr_xv_rail_withdrawn") }</div>
                                <FolderFiles files={ c.folder_files } canManage={ false } run={ cs.run } busy={ cs.busy } />
                            </div>
                        ) }
                    </div></div>
                </div>
            </main>
        </div>
    );
};

export default ExtendVisaCase;
