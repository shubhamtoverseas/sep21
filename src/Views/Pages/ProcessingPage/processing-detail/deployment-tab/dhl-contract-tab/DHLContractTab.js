import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import translation from "../../../../../../utils/translation";
import DateInput from "../../../../../../components/ui/DateInput";
import { deploymentDocumentView, deploymentStatusList, deploymentUpdateDHLContract } from "../../../../../../redux/Slices/processing/ProcessingSlice";
import { fetchCountries } from "../../../../../../redux/Slices/common/countries/CountriesSlice";
import { isAdminUser, showSuccessOrError } from "../../../../../../services/commonService";
import { FieldRead, Fld, FormGrid, NotRequiredNote, StageFooter, StagePanel, StagePanelHead } from "../../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../../components/Processing/newui/StageSendTemplate";
import { DEPLOYMENT_TYPED_FIELDS, SUB_STAGE_NOT_REQUIRED_CODE, isSubStageNotRequired } from "../../../processingConstants";
import { withFocusedText } from "../draftSync";
import { useIsProcessingContract } from "../../contractLifecycle";

const draftOf = (doc) => ({ sent_on: doc?.sent_on || "", sim_card_number: doc?.sim_card_number == null ? "" : String(doc.sim_card_number), current_location_code: doc?.current_location_code || "" });
const SIM_RULE = /^\d{0,20}$/;

/**
 * DHL Contract panel (prototype depPanel 'dhl'): Contract Number (read) · Sent On · SIM Card Number · Current Location,
 * autosaving per field; footer Send Template · status menu. Logic unchanged: deploymentUpdateDHLContract + refresh.
 */
const DHLContractTab = ({ statusList, onUpdateChangeStatus, deploymentDocument, stageActionPermission, reloadGlobalActivityList }) => {
    const { contract_id } = useParams();
    const dispatch = useDispatch();
    const { contractDetails } = useSelector((state) => state.contracts);
    const [locations, setLocations] = useState([]);
    const [draft, setDraft] = useState(draftOf(deploymentDocument));
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const processing = useIsProcessingContract(contractDetails);
    const canEdit = processing && stageActionPermission.includes("edit");
    /* backend 281: Not Required = details read-only (values kept); a 409 SUB_STAGE_NOT_REQUIRED keeps the typed values through the reload */
    const locked = isSubStageNotRequired(deploymentDocument?.dhl_contract_status);
    const canEditFields = canEdit && !locked;
    const menuRef = useRef(null);
    const pendingDraft = useRef(null);

    useEffect(() => { dispatch(fetchCountries({ type: "dhl_contract_deployment" })).then((res) => { if (!res.error) setLocations(res.payload || []); }); }, [dispatch, contract_id]);
    useEffect(() => { setDraft((prev) => withFocusedText(pendingDraft.current ? { ...draftOf(deploymentDocument), ...pendingDraft.current } : draftOf(deploymentDocument), prev, DEPLOYMENT_TYPED_FIELDS.dhl_contract)); }, [deploymentDocument]);

    const save = useCallback((next) => {
        dispatch(deploymentUpdateDHLContract({ ...next, contract_id, sent_on: next.sent_on || null })).then((res) => {
            showSuccessOrError(res);
            if (res.error && res.payload?.code === SUB_STAGE_NOT_REQUIRED_CODE) { pendingDraft.current = next; dispatch(deploymentDocumentView(contract_id)); return; }
            if (!res.error) { pendingDraft.current = null; }
            if (!res.error) { dispatch(deploymentDocumentView(contract_id)); dispatch(deploymentStatusList({ contract_id, type: "dhl_contract" })); reloadGlobalActivityList?.(); }
        });
    }, [dispatch, contract_id, reloadGlobalActivityList]);
    const commit = (key, value) => { const next = { ...draft, [key]: value }; setDraft(next); save(next); };

    const openSendTemplate = () => { setTemplate({ slug: "processing_deployment_dhl", statusKey: "" }); };

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_dhl_contract") } stage="dhl_contract" status={ deploymentDocument?.dhl_contract_status } updatedAt={ deploymentDocument?.dhl_contract_updated_at ?? deploymentDocument?.dhl_contract_last_status_updated_at } updatedBy={ deploymentDocument?.dhl_contract_updated_by_info ?? deploymentDocument?.dhl_contract_last_status_updated_name } utc={ Boolean(deploymentDocument?.dhl_contract_updated_at) } />
            { locked && processing && <NotRequiredNote onChangeStatus={ () => menuRef.current?.open() } /> }
            <FormGrid layout="dhl">
                <FieldRead label={ translation("key_contract_number") } value={ deploymentDocument?.contract_number } mono />
                <Fld id="dhl-so" label={ translation("key_sent_on") }>
                    <DateInput id="dhl-so" value={ draft.sent_on } disabled={ !canEditFields } className="mcdt-datewrap" onChange={ (v) => commit("sent_on", v) } />
                </Fld>
                <Fld id="dhl-sim" label={ translation("key_sim_card_number") }>
                    <input id="dhl-sim" className="g1-in mono" inputMode="numeric" value={ draft.sim_card_number } placeholder={ translation("key_enter_sim_card_number") } disabled={ !canEditFields }
                        onChange={ (e) => { if (SIM_RULE.test(e.target.value)) setDraft((d) => ({ ...d, sim_card_number: e.target.value })); } }
                        onBlur={ (e) => { if (e.target.value !== draftOf(deploymentDocument).sim_card_number) commit("sim_card_number", e.target.value); } } />
                </Fld>
                <Fld id="dhl-loc" label={ translation("key_current_location") }>
                    <select id="dhl-loc" className="g1-in" value={ draft.current_location_code } disabled={ !canEditFields } onChange={ (e) => commit("current_location_code", e.target.value) }>
                        <option value="">{ translation("key_please_select") }</option>
                        { locations.map((l) => <option key={ l.id } value={ l.country_code }>{ l.name }</option>) }
                    </select>
                </Fld>
            </FormGrid>
            <StageFooter menuRef={ menuRef } stage="dhl_contract" onSendTemplate={ openSendTemplate } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusList || [] } current={ deploymentDocument?.dhl_contract_status } onChangeStatus={ onUpdateChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) } />

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } />
            ) }
        </StagePanel>
    );
};

DHLContractTab.propTypes = {
    statusList: PropTypes.array,
    onUpdateChangeStatus: PropTypes.func.isRequired,
    deploymentDocument: PropTypes.object,
    stageActionPermission: PropTypes.array.isRequired,
    reloadGlobalActivityList: PropTypes.func,
};

export default React.memo(DHLContractTab);
