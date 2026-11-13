import React, { useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import translation from "../../../../../utils/translation";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { PROCESSING_FILE_UPLOAD_SIZE_LIMIT } from "../../../../../components/ReusableComponents/constants";
import { isAdminUser, showSuccessOrError, uploadFile } from "../../../../../services/commonService";
import { medicalShareUpdate, preDepartureMedicalDocFileDelete, preDepartureMedicalDocStatusList, preDepartureUploadMedFile } from "../../../../../redux/Slices/processing/ProcessingSlice";
import { FileTile, FolderButton, PdAction, StageFooter, StagePanel, StagePanelHead, StageTag, lastUpdatedText } from "../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../components/Processing/newui/StageSendTemplate";
import Icon from "../../../../../components/Icon/Icon";
import { PROCESSING_MEDICAL_ACCEPT } from "../../processingConstants";
import { useIsProcessingContract } from "../contractLifecycle";

/**
 * One Pre-Departure sub-stage panel (prototype preDeparturePanel): titled by the sub-stage, the Pre-Departure folder, a
 * status row (tag + last update), the worker-app question with its Yes / Not Yet answer, the medical file tile on the
 * Medical sub-stage (with Share), footer Send Template · status menu. Statuses stay per sub-stage as the API records them.
 */
const PreDeparturePanel = ({ title, question, done, status, updatedAt, updatedBy, statusList, statusNote, onChangeStatus, stageActionPermission, isMedical, file, onFileChanged }) => {
    const dispatch = useDispatch();
    const { contract_id } = useParams();
    const { contractDetails } = useSelector((state) => state.contracts);
    const [fileBusy, setFileBusy] = useState(false);
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const processing = useIsProcessingContract(contractDetails);
    const canEdit = processing && stageActionPermission.includes("edit");

    const openTemplate = (slug, statusKey) => { setTemplate({ slug, statusKey }); };

    const onFile = async (f) => {
        if (f.size > PROCESSING_FILE_UPLOAD_SIZE_LIMIT) { ShowToast("error", translation("key_please_upload_file_smaller_than_5mb")); return; }
        try {
            setFileBusy(true);
            const res = await uploadFile([{ file: f, name: "processing/predeparture/medical" }]);
            if (!res?.filename) { ShowToast("error", translation("key_failed_to_upload_file")); return; }
            const saved = await dispatch(preDepartureUploadMedFile({ contract_id, medical_file: res.filename }));
            showSuccessOrError(saved);
            if (!saved.error) onFileChanged?.();
        } catch (e) { ShowToast("error", e?.message || translation("key_failed_to_upload_file")); }
        finally { setFileBusy(false); }
    };
    const onRemove = () => { dispatch(preDepartureMedicalDocFileDelete({ contract_id })).then((res) => { showSuccessOrError(res); if (!res.error) onFileChanged?.(); }); };
    const onDownload = () => { if (file?.url) { const a = document.createElement("a"); a.href = file.url; a.download = file.name || "medical_document"; a.target = "_blank"; a.click(); } };
    const handleShareMedicalUpdate = (data) => {
        dispatch(medicalShareUpdate({ contract_id, type: template?.statusKey, template_data: data })).then((res) => { showSuccessOrError(res); if (!res.error) dispatch(preDepartureMedicalDocStatusList(contract_id)); });
    };

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ title } noTag>
                <FolderButton folder="predeparture" label={ translation("key_pre_departure") } />
            </StagePanelHead>
            <div className="g1-panel-body">
                <div className="g2-pd-status" data-pd-status="">
                    <span className="g2-pd-status-lb">{ translation("key_cr_pre_departure_status") }</span>
                    <StageTag stage="pre_departure" status={ status } />
                    { lastUpdatedText(updatedAt, updatedBy) && <span className="g1-meta">{ lastUpdatedText(updatedAt, updatedBy) }</span> }
                </div>
                <PdAction question={ question } done={ done } />
                { isMedical && status && status !== "not_ready" && (
                    <div>
                        <FileTile file={ file } emptyLabel={ translation("key_cr_no_file_uploaded") } accept={ PROCESSING_MEDICAL_ACCEPT } busy={ fileBusy } canUpload={ canEdit } canManage={ canEdit }
                            onFile={ onFile } onDownload={ file ? onDownload : undefined } onRemove={ file ? onRemove : undefined } />
                        <div className="g1-share">
                            <button type="button" className="g1-btn" disabled={ !canEdit } onClick={ () => openTemplate("processing_predeparture_share_medical", "share_medical") }><Icon name="external" size={ 12 } strokeWidth={ 1.6 } />{ translation("key_share") }</button>
                        </div>
                    </div>
                ) }
            </div>
            <StageFooter stage="pre_departure" onSendTemplate={ () => openTemplate("processing_predeparture", "") } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusList } current={ status } note={ statusNote } onChangeStatus={ onChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) } />

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } onSent={ (data) => { if (template.statusKey) handleShareMedicalUpdate(data); } } />
            ) }
        </StagePanel>
    );
};

PreDeparturePanel.propTypes = {
    title: PropTypes.node.isRequired,
    question: PropTypes.node.isRequired,
    done: PropTypes.bool,
    status: PropTypes.string,
    updatedAt: PropTypes.string,
    updatedBy: PropTypes.string,
    statusList: PropTypes.array,
    statusNote: PropTypes.node,   /* why the list is empty when its request failed (a refused / failed load is not "no transitions") */
    onChangeStatus: PropTypes.func.isRequired,
    stageActionPermission: PropTypes.array.isRequired,
    isMedical: PropTypes.bool,
    file: PropTypes.object,
    onFileChanged: PropTypes.func,
};

export default PreDeparturePanel;
