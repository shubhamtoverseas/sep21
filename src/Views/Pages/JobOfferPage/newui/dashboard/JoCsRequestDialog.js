import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import { Field, FormGrid, TextArea, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import JoChangeOwnerDialog from "../record/JoChangeOwnerDialog";

/*
 * A Job Offer's CS-change request (dashboard / duplicates "CS change requested" cell): who asked, which Job Offer, the
 * reason and when — Close, or Change CS Owner, which hands over to the JOB OFFER's Change CS Owner dialog (U-0036 /
 * backend 332: an employer has no owner; the transfer approves and clears the request in one commit). List refresh
 * through `onRefreshList`.
 */
const JoCsRequestDialog = ({ requestedCsObj: row, onClose, onRefreshList }) => {
    const [changeOpen, setChangeOpen] = useState(false);
    if (changeOpen) {
        return (
            <JoChangeOwnerDialog jobId={ row?.id } currentOwnerName={ row?.cs_name || "" } requestReason={ row?.cs_change_reason || "" }
                onClose={ () => setChangeOpen(false) } onDone={ onRefreshList } />
        );
    }
    const footer = (
        <>
            <Btn variant="secondary" onClick={ onClose }>{ translation("key_close") }</Btn>
            <Btn variant="primary" onClick={ () => setChangeOpen(true) }>{ translation("key_change_cs_owner") }</Btn>
        </>
    );
    return (
        <Modal title={ headingCase(translation("key_cs_change_request")) } width={ 520 } onClose={ onClose } footer={ footer }>
            <FormGrid columns={ 2 }>
                <Field label={ translation("key_employer") } htmlFor="jo-csreq-employer" full>
                    <TextInput id="jo-csreq-employer" type="text" readOnly value={ [row?.employer_name, row?.employer_reference_id].filter(Boolean).join(" · ") } />
                </Field>
                <Field label={ translation("key_jo_ref") } htmlFor="jo-csreq-ref">
                    <TextInput id="jo-csreq-ref" type="text" readOnly value={ row?.reference_id ? `#${ row.reference_id }` : "" } />
                </Field>
                <Field label={ translation("key_date") } htmlFor="jo-csreq-at">
                    <TextInput id="jo-csreq-at" type="text" readOnly value={ row?.cs_change_reason_updated_at || "" } />
                </Field>
                <Field label={ translation("key_reason") } htmlFor="jo-csreq-reason" full>
                    <TextArea id="jo-csreq-reason" rows={ 3 } readOnly value={ row?.cs_change_reason || "" } />
                </Field>
            </FormGrid>
        </Modal>
    );
};

JoCsRequestDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    requestedCsObj: PropTypes.object,
    onRefreshList: PropTypes.func,
};

export default JoCsRequestDialog;
