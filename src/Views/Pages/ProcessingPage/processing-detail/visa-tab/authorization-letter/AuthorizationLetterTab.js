import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import visaConfigs from "../../../../../../components/ReusableComponents/processing-configs/VisaConfigs";
import translation from "../../../../../../utils/translation";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { downloadNonEditablePdf, eVisaDocumentStatusChange, fetchEvisaDocumentStatusList, updateProcessingVisaAuth, visaDocumentDetails } from "../../../../../../redux/Slices/processing/ProcessingSlice";
import { fetchContractDetailsById } from "../../../../../../redux/Slices/contract/ContractSlice";
import { isAdminUser, showSuccessOrError } from "../../../../../../services/commonService";
import CircularSpinner from "../../../../../../components/ReusableComponents/CircularSpinner";
import pdfIcon from "../../../../../../assets/img/svg/pdf-red.svg";
import { CheckCell, Listing, ListingRow, PortalButton, StageFooter, StagePanel, StagePanelHead } from "../../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../../components/Processing/newui/StageSendTemplate";
import { useIsProcessingContract } from "../../contractLifecycle";

/**
 * Authorization Letter panel (prototype authPanel): head with the Immigration portal link, one Document listing with the
 * CS mark per letter (Employer · Helper) autosaving, footer Send Template · status menu. The letter opens as a PDF.
 */
const AuthorizationLetterTab = ({ onFetchProcessingTabActivities, contractDetails, stageActionPermission, reloadGlobalActivityList, isActive }) => {
    const dispatch = useDispatch();
    const { contract_id } = useParams();
    const { visaDocument } = useSelector((state) => state.processing);
    const [rows, setRows] = useState(visaConfigs.mapVisaAuthLetterTableData());
    const [statusList, setStatusList] = useState(null);
    const [loadingRows, setLoadingRows] = useState({});
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const isUserUpdate = useRef(false);
    const processing = useIsProcessingContract(contractDetails);
    const canTick = processing && stageActionPermission.includes("edit");

    const refreshStatusList = useCallback(() => {
        dispatch(fetchEvisaDocumentStatusList({ id: contract_id, type: "authorization-letter" })).then((res) => { if (!res.error && res?.payload?.data) setStatusList(res.payload.data); });
    }, [dispatch, contract_id]);
    useEffect(() => { dispatch(visaDocumentDetails(contract_id)); }, [dispatch, contract_id]);
    useEffect(() => { if (isActive) refreshStatusList(); }, [isActive, refreshStatusList]);
    useEffect(() => { if (isActive) onFetchProcessingTabActivities("authorization_letter"); }, [onFetchProcessingTabActivities, isActive]);
    useEffect(() => {
        if (!visaDocument) return;
        isUserUpdate.current = false;
        setRows((prev) => prev.map((item, index) => ({ ...item, cs: index === 0 ? Boolean(visaDocument?.employer_authorization_letter_reviewed) : Boolean(visaDocument?.helper_authorization_letter_reviewed) })));
    }, [visaDocument]);
    /* a CS mark autosaves (the ref is a flag, not a dependency) */
    useEffect(() => {
        if (!rows || !isUserUpdate.current) return;
        dispatch(updateProcessingVisaAuth({ ...visaConfigs.updatePayloadOfVisaAuthLetter(rows, contract_id), contract_id })).then((res) => {
            showSuccessOrError(res);
            if (!res.error) { refreshStatusList(); dispatch(fetchContractDetailsById(contract_id)); reloadGlobalActivityList?.(); }
        });
        isUserUpdate.current = false;
    }, [dispatch, rows, contract_id, reloadGlobalActivityList, refreshStatusList]);

    const tick = (label, checked) => { isUserUpdate.current = true; setRows((prev) => prev.map((item) => (item.label === label ? { ...item, cs: checked } : item))); };
    const handleChangeStatus = (id) => {
        dispatch(eVisaDocumentStatusChange({ contract_id, status: id })).then((res) => {
            showSuccessOrError(res);
            if (!res.error) { refreshStatusList(); dispatch(visaDocumentDetails(contract_id)); dispatch(fetchContractDetailsById(contract_id)); reloadGlobalActivityList?.(); }
        });
    };
    const onDocumentClick = async (row) => {
        setLoadingRows((prev) => ({ ...prev, [row.label]: true }));
        try {
            const result = await dispatch(downloadNonEditablePdf({ worker_id: contractDetails.worker_id, pdf_file_name: row.pdfFileName }));
            if (downloadNonEditablePdf.fulfilled.match(result)) {
                const blobUrl = URL.createObjectURL(result.payload);
                const win = window.open(blobUrl, "_blank"); if (win) win.focus();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            } else ShowToast("error", result.payload?.message || translation("key_failed_to_open_pdf"));
        } catch { ShowToast("error", translation("key_failed_to_open_pdf")); }
        finally { setLoadingRows((prev) => ({ ...prev, [row.label]: false })); }
    };
    const openSendTemplate = () => { setTemplate({ slug: "processing_visa_authorization_letter", statusKey: "" }); };

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_authorization_letter") } stage="authorization_letter" status={ visaDocument?.authorization_letter_status } updatedAt={ visaDocument?.updated_at } updatedBy={ visaDocument?.last_updated_by_info }>
                <PortalButton />
            </StagePanelHead>
            <div className="g1-panel-body">
                <Listing title={ translation("key_document_name") } done={ rows.filter((r) => r.cs).length } total={ rows.length } columns={ [{ key: "cs", label: translation("key_cs") }] }>
                    { rows.map((row) => (
                        <ListingRow key={ row.label } name={ row.label }
                            icon={ loadingRows[row.label] ? <CircularSpinner paddingClass="p-0" /> : <button type="button" className="g1-ico-btn" aria-label={ `${ translation("key_download") } ${ row.label }` } onClick={ () => onDocumentClick(row) }><img src={ pdfIcon } alt="" /></button> }>
                            <CheckCell checked={ Boolean(row.cs) } disabled={ !canTick } label={ `${ row.label } — ${ translation("key_cs") }` } onChange={ (v) => tick(row.label, v) } />
                        </ListingRow>
                    )) }
                </Listing>
            </div>
            <StageFooter stage="authorization_letter" onSendTemplate={ openSendTemplate } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusList || [] } current={ visaDocument?.authorization_letter_status } onChangeStatus={ handleChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) } />

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } />
            ) }
        </StagePanel>
    );
};

AuthorizationLetterTab.propTypes = {
    contractDetails: PropTypes.object,
    stageActionPermission: PropTypes.array,
    reloadGlobalActivityList: PropTypes.func,
    onFetchProcessingTabActivities: PropTypes.func,
    isActive: PropTypes.bool,
};

export default AuthorizationLetterTab;
