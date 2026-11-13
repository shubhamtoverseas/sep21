import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "../../../../../utils/dayjsConfig";
import translation from "../../../../../utils/translation";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { updateImmigrationPurposeAPI } from "../../../../../services/processings";
import { Cell, Listing, ListingRow } from "../../../../../components/Processing/newui/StagePanel";
import { IMMIGRATION_PURPOSE_LABEL_KEYS } from "../../processingConstants";

/**
 * Immigration → Application type (backend answers 15 Oct K-18; CT-03 / CROSSWALK §1): the Immigration stage owns the purpose
 * (Entry · Change · Renew). The category fixes it or leaves `options[]` for staff to confirm through
 * POST /update-immigration-purpose { contract_id, purpose } (Stage Actions · Edit, Processing, not while Submitted). An
 * unresolved purpose stays unresolved — it never defaults — and the Master Form's application type follows it read-only.
 * `data`: { purpose, resolved, fixed, options[], application_type, label, confirmed_by_name, confirmed_at }
 */
const when = (at) => { if (!at) return ""; const d = dayjs(String(at).replace("T", " ").slice(0, 19), ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true); return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : String(at); };
const labelOf = (purpose) => (purpose && IMMIGRATION_PURPOSE_LABEL_KEYS[purpose] ? translation(IMMIGRATION_PURPOSE_LABEL_KEYS[purpose]) : purpose || "");

const ApplicationPurpose = ({ contractId, data, canEdit = false, onSaved }) => {
    const [value, setValue] = useState(data?.purpose || "");
    const [busy, setBusy] = useState(false);
    const inFlight = useRef(false);
    useEffect(() => { setValue(data?.purpose || ""); }, [data?.purpose]);
    const options = Array.isArray(data?.options) ? data.options : [];
    const editable = canEdit && !data?.fixed && options.length > 0;
    const confirm = useCallback(async () => {
        if (inFlight.current || value === (data?.purpose || "")) return;
        inFlight.current = true; setBusy(true);
        try {
            const response = await updateImmigrationPurposeAPI({ contract_id: Number(contractId), purpose: value || null });
            if (!response?.data?.status) { ShowToast("error", response?.data?.message || translation("key_something_went_wrong")); return; }
            ShowToast("success", response.data.message);
            if (onSaved) await onSaved();
        } catch (e) {
            ShowToast("error", e?.response?.data?.message || translation("key_something_went_wrong"));
        } finally { inFlight.current = false; setBusy(false); }
    }, [value, data?.purpose, contractId, onSaved]);
    /* backend 302: Local Terminated arrives `purpose: entry, defaulted: true` with Change still selectable — read "Entry (default)" */
    const purposeLabel = `${ labelOf(data?.purpose) }${ data?.defaulted ? ` (${ translation("key_default").toLowerCase() })` : "" }`;
    const meta = [data?.fixed ? translation("key_fixed") : "", data?.confirmed_by_name || "", when(data?.confirmed_at)].filter(Boolean).join(" · ");
    return (
        <div data-application-purpose="" data-purpose={ data?.purpose || "" } data-resolved={ data?.resolved ? "1" : "0" } data-defaulted={ data?.defaulted ? "1" : "0" }>
            <Listing title={ translation("key_fx_application_type") } columns={ [] }>
                <ListingRow name={ data?.label || (data?.resolved ? labelOf(data?.purpose) : translation("key_fx_application_type")) }>
                    <Cell>
                        <div className="g1-cell-auto">
                            { data?.resolved
                                ? <span className="g1-st applies">{ purposeLabel }{ data.application_type ? ` (${ data.application_type })` : "" }</span>
                                : <span className={ `g1-st ${ editable ? "review" : "none" }` }>{ translation("key_needs_review") }</span> }
                            { meta && <span className="g1-rmeta">{ meta }</span> }
                            { editable && (
                                <>
                                    <select className="g1-in" aria-label={ translation("key_fx_application_type") } value={ value } disabled={ busy } onChange={ (e) => setValue(e.target.value) }>
                                        <option value="">{ translation("key_select") }</option>
                                        { options.map((o) => <option key={ o } value={ o }>{ labelOf(o) }</option>) }
                                    </select>
                                    <button type="button" className="g1-btn sm" disabled={ busy || value === (data?.purpose || "") } onClick={ confirm }>{ busy ? `${ translation("key_loading") }…` : translation("key_confirm") }</button>
                                </>
                            ) }
                        </div>
                    </Cell>
                </ListingRow>
            </Listing>
        </div>
    );
};
ApplicationPurpose.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    data: PropTypes.shape({ purpose: PropTypes.string, resolved: PropTypes.bool, fixed: PropTypes.bool, defaulted: PropTypes.bool, default_purpose: PropTypes.string, options: PropTypes.array, application_type: PropTypes.string, label: PropTypes.string, confirmed_by_name: PropTypes.string, confirmed_at: PropTypes.string }),
    canEdit: PropTypes.bool,
    onSaved: PropTypes.func,
};

export default ApplicationPurpose;
