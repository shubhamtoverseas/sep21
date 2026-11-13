import React, { lazy, Suspense } from "react";
import PropTypes from "prop-types";
import WkdStatusChip from "../WkdStatusChip";
import WkdDocField from "./WkdDocField";
import WkdDocPreview from "./WkdDocPreview";
import useDocReview from "./useDocReview";
import { BioStatusPop } from "../../profile-tab/biodata-tab/BioCard";
import ActivityStatusCollapsible from "../../../../../../components/activity-status/ActivityStatusCollapsible";
import CustomSpinner from "../../../../../../components/ReusableComponents/CustomSpinner";
import { timeSince } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import { DOC_REVIEW_ROLE, DOC_STATUS_META, PASSPORT_LOST_REASON_KEYS } from "../../../workerModuleConstants";
import "../wkd-doc-review.css";

const WkdSendTemplateModal = lazy(() => import("../WkdSendTemplateModal"));

/* The selected document's review card (prototype docsHTML review card): title · status · Updated over a two-column
   body — the scan on the left, the captured fields / activity / Change Status rail on the right. Mounted by
   WorkerDocUploadDetails for the document the list selects; every rule it applies comes from useDocReview. */
const WkdDocReview = ({ docKey, uploadDocPermission, isAdmin, onRefreshActivity, centralVerified }) => {
    const r = useDocReview(docKey, { uploadDocPermission, isAdmin, onRefreshActivity, centralVerified });
    const { spec, record, overseas, updateStatus } = r;
    const label = translation(spec.labelKey);
    const meta = DOC_STATUS_META[updateStatus] || DOC_STATUS_META.in_complete;
    /* passport declared lost / expired / never applied: the declaration stands in for the scan and the fields (legacy; the package has no screen for it) */
    const declarationKey = spec.role === DOC_REVIEW_ROLE.PASSPORT ? PASSPORT_LOST_REASON_KEYS[overseas?.passport_lost_reason] : undefined;
    const updated = updateStatus && updateStatus !== 'in_complete' && r.uploadedAt ? timeSince(r.uploadedAt) : '';
    const matchLabel = r.match.ref ? translation(r.match.ref.labelKey) : '';
    const groupTitle = spec.groupTitleKey
        ? translation(spec.groupTitleKey)
        : (spec.groupSubjectKey ? `${ translation('key_details_in') } ${ translation(spec.groupSubjectKey) }` : '');
    const showFields = !declarationKey && spec.fields.length > 0;
    const holdingText = translation('key_wkr_pending_central_doc_verification');

    return (
        <div className="wkd-docrv" data-mc-doc-review={ docKey } data-mc-doc-status={ updateStatus || '' }>
            <div className="wkd-docrv-head">
                <span className="t">{ label }</span>
                <WkdStatusChip label={ translation(meta.key) } tone={ meta.tone } />
                { updated && <span className="note">{ translation('key_updated') }: { updated }</span> }
            </div>
            <div className={ `wkd-docrv-body${ declarationKey ? ' is-single' : '' }` }>
                { !declarationKey && r.fileUrl && <WkdDocPreview url={ r.fileUrl } label={ label } /> }
                <div className="wkd-docrv-rail">
                    { declarationKey && <div className="wkd-docrv-note">{ translation(declarationKey) }</div> }
                    { showFields && groupTitle && (
                        <div className="wkd-docrv-grp">{ groupTitle }{ matchLabel && <span className="cmp"> · compared with { matchLabel }</span> }</div>
                    ) }
                    { showFields && spec.fields.map((f) => (
                        <WkdDocField
                            key={ f.name }
                            field={ f }
                            value={ r.form[f.name] }
                            onChange={ r.handleChange }
                            readOnly={ r.isReadOnly }
                            match={ Boolean(r.match.flags[f.name]) }
                            matchLabel={ matchLabel }
                            error={ r.errors[f.name] }
                            minAge={ r.minAge }
                        />
                    )) }
                    { !declarationKey && spec.noFieldsNoteKey && <div className="wkd-docrv-note is-dashed">{ translation(spec.noFieldsNoteKey) }</div> }
                    { showFields && r.canEdit && !r.isLocked && (
                        <div className="wkd-docrv-save">
                            <button type="button" className="g2-button primary" disabled={ !r.isDirty || r.loading } aria-disabled={ !r.isDirty || r.loading } onClick={ r.handleSave }>{ translation('key_save') }</button>
                        </div>
                    ) }
                    <ActivityStatusCollapsible variant="flat" defaultOpen documentStatus={ r.activityLogList } />
                    { r.canChangeStatus && (
                        <div className="wkd-docrv-foot" data-mc-doc-holding={ r.holding ? '1' : undefined }>
                            { r.holding && <span className="wkd-docrv-holding">{ holdingText }</span> }
                            { r.loading
                                ? <CustomSpinner />
                                : <BioStatusPop current={ updateStatus } options={ r.statusOptions } onPick={ r.handleChangeStatus } direction="up" disabled={ r.holding } title={ r.holding ? holdingText : undefined } /> }
                        </div>
                    ) }
                </div>
            </div>
            { r.templateOpen && (
                <Suspense fallback={ null }>
                    <WkdSendTemplateModal
                        onClose={ r.closeTemplate }
                        site={ r.template.site }
                        context={ { worker_id: record?.id } }
                        userType={ r.template.userType }
                        slug={ r.template.slug }
                        parties={ { worker: { name: record?.fullname || "" } } }
                        title={ r.template.title }
                        status_key={ r.template.statusKey }
                        actionStatusType={ r.template.actionStatusType }
                        handleRefreshProfile={ r.handleTemplateSent }
                        contextLabel={ label }
                        allowSelfTools={ false }
                    />
                </Suspense>
            ) }
        </div>
    );
};

WkdDocReview.propTypes = {
    docKey: PropTypes.string.isRequired,
    uploadDocPermission: PropTypes.any,
    isAdmin: PropTypes.any,
    onRefreshActivity: PropTypes.func.isRequired,
    centralVerified: PropTypes.bool,   /* W-27: false = the central document is not Verified, Verify stays disabled */
};

export default React.memo(WkdDocReview);
