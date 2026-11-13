import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import configData from "../../../../components/ReusableComponents/app-configs";
import dayjs from "../../../../utils/dayjsConfig";
import { loadVisaExpiryHistory, loadVisaIssuanceHistory } from "../../../../components/visa-expiry/visaExpiryApi";
import { EM_DASH } from "./contractRecordUtils";
import { correctionLabelKey, isDateCorrection, issuanceActorName, issuanceCaseRef, issuanceValues, latestIssuance } from "./visaHistoryUtils";

const fmt = (iso) => (iso ? configData.formatDateToDDMMYYYY(iso) : EM_DASH);
const when = (ts) => (ts ? dayjs(ts).format("DD/MM/YYYY HH:mm") : "");
const joinMeta = (parts) => parts.filter(Boolean).join(" · ");

/**
 * Details → Visa "History (n)" (prototype b30DetVisaCard · visaHistToggle, open point 18): the issuance versions load with
 * the card so the button carries the count; the expiry-change rows load on the first open. `reload` re-reads both after a
 * save or a correction. Surface: Active contracts read the contract service, Processing ones the processing service.
 */
export const useVisaHistory = (contractId, surface) => {
    const [issuance, setIssuance] = useState(null);
    const [expiry, setExpiry] = useState(null);
    const [open, setOpen] = useState(false);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let alive = true;
        loadVisaIssuanceHistory(surface, contractId).then((r) => { if (alive) setIssuance(r.ok && r.data ? r.data : { versions: [] }); });
        return () => { alive = false; };
    }, [contractId, surface, tick]);

    const loadExpiry = useCallback(() => {
        loadVisaExpiryHistory(surface, contractId).then((r) => setExpiry(r.ok && Array.isArray(r.data) ? r.data : []));
    }, [contractId, surface]);

    useEffect(() => { if (open && tick > 0) loadExpiry(); }, [tick, open, loadExpiry]);

    const toggle = useCallback(() => {
        setOpen((o) => { if (!o && expiry === null) loadExpiry(); return !o; });
    }, [expiry, loadExpiry]);
    const reload = useCallback(() => setTick((n) => n + 1), []);

    const versions = Array.isArray(issuance?.versions) ? issuance.versions : [];
    return { versions, latest: latestIssuance(versions), count: versions.length, expiry: expiry || [], open, toggle, reload };
};

const ValuesLine = ({ prefixKey, values }) => (
    <span className="mcdt-vh-vals">
        { prefixKey ? `${ translation(prefixKey) }: ` : "" }
        <span className="mono">{ values.ref || EM_DASH }</span>
        { ` · ${ translation("key_payment") } ${ fmt(values.pay) } · ${ translation("key_release") } ${ fmt(values.release) } · ${ translation("key_expiry") } ${ fmt(values.expiry) }` }
    </span>
);
ValuesLine.propTypes = { prefixKey: PropTypes.string, values: PropTypes.object.isRequired };

export const VisaHistoryList = ({ versions, latest, expiry }) => {
    if (!versions.length && !expiry.length) return <div className="mcdt-vh" data-visa-history=""><div className="mcdt-vh-empty">{ translation("key_no_visa_expiry_history") }</div></div>;
    return (
        <div className="mcdt-vh" data-visa-history="">
            { [...versions].sort((a, b) => Number(b.version) - Number(a.version)).map((v) => {
                const corrections = Array.isArray(v.corrections) ? v.corrections : [];
                const isCurrent = latest && String(v.version) === String(latest.version);
                const caseRef = issuanceCaseRef(v);
                const actor = issuanceActorName(v);
                return (
                    <div key={ v.id || v.version } className={ `mcdt-vh-item${ isCurrent ? " current" : "" }` } data-visa-issuance={ v.version }>
                        <div className="mcdt-vh-head">
                            <b>{ translation("key_version") } { v.version }</b>
                            <span className="mcdt-vh-tag">{ translation(v.issuance_type === "extension" ? "key_extension" : "key_initial") }</span>
                            { caseRef && <span className="mcdt-vh-meta" data-visa-origin={ caseRef }>{ translation("key_cr_xv_case") } { caseRef }</span> }
                            { isCurrent && <span className="mcdt-vh-tag green">{ translation("key_current") }</span> }
                            <span className="grow" />
                            <span className="mcdt-vh-meta">{ joinMeta([actor || translation("key_cr_unknown_legacy"), when(v.confirmed_at)]) }</span>
                        </div>
                        <div className="mcdt-vh-lines">
                            <ValuesLine prefixKey={ corrections.length ? "key_as_issued" : null } values={ issuanceValues(v, "base") } />
                            { corrections.length > 0 && <ValuesLine prefixKey="key_after_corrections" values={ issuanceValues(v, "effective") } /> }
                        </div>
                        { corrections.length > 0 && (
                            <div className="mcdt-vh-corr">
                                { corrections.map((c, i) => {
                                    const labelKey = correctionLabelKey(c.field);
                                    const asDate = isDateCorrection(c.field);
                                    const show = (val) => (val ? (asDate ? fmt(val) : val) : EM_DASH);
                                    return (
                                        <div key={ `${ v.version }-${ c.seq || i }` } data-visa-correction={ `${ v.version }.${ c.seq || i + 1 }` }>
                                            { `${ translation("key_correction") } ${ c.seq || i + 1 } — ${ labelKey ? translation(labelKey) : c.field } ${ show(c.old_value ?? c.old) } → ${ show(c.new_value ?? c.nu) }` }
                                            { joinMeta(["", c.reason, c.created_by_name || c.actor?.name || c.actor, when(c.created_at || c.at)]) }
                                        </div>
                                    );
                                }) }
                            </div>
                        ) }
                    </div>
                );
            }) }
            { expiry.length > 0 && (
                <div className="mcdt-vh-item expiry">
                    <div className="mcdt-vh-head"><b>{ translation("key_visa_expiry_history") }</b></div>
                    <div className="mcdt-vh-corr">
                        { expiry.map((row, i) => (
                            <div key={ row.id || i }>
                                { `${ fmt(row.previous_visa_expiry_date) } → ${ fmt(row.visa_expiry_date) }` }
                                { joinMeta(["", row.reason, row.actor?.name || row.actor_name, when(row.created_at)]) }
                            </div>
                        )) }
                    </div>
                </div>
            ) }
        </div>
    );
};
VisaHistoryList.propTypes = { versions: PropTypes.array.isRequired, latest: PropTypes.object, expiry: PropTypes.array.isRequired };
