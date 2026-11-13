import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import { SelectBox } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { associateProcessingFileAPI } from "../../../../services/processings";

/**
 * Excel Contract No. 11: explicit file association on the Documents view. Linking a file sets the
 * requirement's "Uploaded" (derived on the server); it never marks Prepared or Ready.
 * Kit select (the same control the Immigration listing's "Link file" uses); read-only text without Manage.
 * A refusal (400 INVALID_REQUIREMENT_KEY — the row set changed meanwhile) shows the message and asks the view to
 * re-read the details and files, so the card never shows a selection the server did not store.
 */
const RequirementLinkSelect = ({ contractId, file, options, canEdit, onLinked, onRefused }) => {
    const [isSaving, setIsSaving] = useState(false);
    const inFlight = useRef(false);
    const value = file?.requirement_key || "";

    const handleChange = useCallback(async (event) => {
        if (inFlight.current) return;
        inFlight.current = true;
        setIsSaving(true);
        try {
            const response = await associateProcessingFileAPI({
                contract_id: Number(contractId),
                file_id: Number(file.id),
                requirement_key: event.target.value || null,
            });
            if (!response?.data?.status) {
                ShowToast("error", response?.data?.message || translation("key_something_went_wrong"));
                if (onRefused) onRefused();
                return;
            }
            ShowToast("success", response.data.message);
            if (onLinked) onLinked();
        } catch (error) {
            ShowToast("error", error?.response?.data?.message || translation("key_something_went_wrong"));
            if (onRefused) onRefused();
        } finally {
            inFlight.current = false;
            setIsSaving(false);
        }
    }, [contractId, file, onLinked, onRefused]);

    const current = options.find((o) => o.value === value);
    const id = `requirement-${ file.id }`;
    if (!canEdit) {
        return <span className="g1-file-meta">{ translation("key_linked_requirement") }: { current?.label || "—" }</span>;
    }
    return (
        <label className="g1-file-linkrow" htmlFor={ id }>
            <span className="lb">{ translation("key_linked_requirement") }</span>
            <SelectBox id={ id } className="g1-decl g1-doc-link" value={ value } disabled={ isSaving } onChange={ handleChange }>
                <option value="">{ translation("key_not_linked") }</option>
                { options.map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
            </SelectBox>
        </label>
    );
};

RequirementLinkSelect.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    file: PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), requirement_key: PropTypes.string }).isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })).isRequired,
    canEdit: PropTypes.bool,
    onLinked: PropTypes.func,
    onRefused: PropTypes.func,
};

export default React.memo(RequirementLinkSelect);
