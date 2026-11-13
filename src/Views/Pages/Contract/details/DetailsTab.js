import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import routes from "../../routes/routesConfig";
import VisaExpiryEditor from "../../../../components/visa-expiry/VisaExpiryEditor";
import { VISA_EXPIRY_SURFACE } from "../../../../components/visa-expiry/visaExpiryApi";
import { toneFor } from "../dashboard/contractDashboardUtils";
import Icon from "../../../../components/Icon/Icon";
import { EM_DASH, dateOrDash, daysBetween, formatDate, initialsOf, isActive, isoOf } from "./contractRecordUtils";
import { VisaHistoryList, useVisaHistory } from "./VisaHistory";
import { CD_STAGE, CD_TOKEN, CD_TONE, CR_DETAIL_SECTION, CR_DETAIL_SECTION_LABEL_KEYS } from "../contractConstants";

const Tok = ({ tone, children }) => <span className={ `mcdt-tok inline ${ tone }` }>● { children }</span>;
Tok.propTypes = { tone: PropTypes.string.isRequired, children: PropTypes.node };

const FileCard = ({ title, path }) => {
    const base = process.env.REACT_APP_AWS_URL || "";
    return (
        <div className="mcdt-doc">
            <div className="dt">{ title }</div>
            { path ? (
                <div className="dc">
                    <div className="th" aria-hidden="true" />
                    <div className="dn"><div className="fn">{ String(path).split("/").pop() }</div></div>
                    <a className="dl" href={ base + path } target="_blank" rel="noreferrer" title={ translation("key_download") } aria-label={ translation("key_download") }>⤓</a>
                </div>
            ) : <div className="dc empty">{ translation("key_not_uploaded") }</div> }
        </div>
    );
};
FileCard.propTypes = { title: PropTypes.string.isRequired, path: PropTypes.string };

/**
 * Details tab (prototype detSubBar / detVisaCard / passport card / detInsCard): Visa · Passport · Insurance.
 * The Visa surface by phase (Record / Update Visa Expiry, issuance history) is section S8; the Insurance row opening
 * the policy and the run-out warning follow the Insurance record route (other team).
 */
const DetailsTab = ({ contractId, row, section, onSection, canEditVisaExpiry = false, onChanged }) => {
    const visa = row.details?.visa || {};
    const insurance = row.details?.insurance || {};
    const passport = row.details?.passport || {};
    const visaTone = toneFor(CD_STAGE.VISA, visa.token || CD_TOKEN.NOT_READY);
    /* prototype b30DetVisaCard: "Version n" on the header, "History (n)" toggles the issuance list inline (open point 18) */
    const history = useVisaHistory(contractId, isActive(row) ? VISA_EXPIRY_SURFACE.ACTIVE : VISA_EXPIRY_SURFACE.PROCESSING);
    const insuranceTone = toneFor(CD_STAGE.INSURANCE, insurance.token || CD_TOKEN.NOT_READY);
    const sections = [
        [CR_DETAIL_SECTION.VISA, visaTone],
        [CR_DETAIL_SECTION.PASSPORT, CD_TONE.GREEN],
        [CR_DETAIL_SECTION.INSURANCE, insuranceTone],
    ];
    const workerLink = routes.workerDetails && row.worker_id ? routes.workerDetails.replace(":worker_id", row.worker_id).replace("/:tab?", "") : null;
    /* prototype Details → Visa: the visa runs out before the contract ends */
    const visaIso = isoOf(visa.expiry_date); const endIso = isoOf(row.contract_end);
    const runOut = visaIso && endIso && daysBetween(visaIso, endIso) > 0 ? daysBetween(visaIso, endIso) : 0;
    return (
        <>
            <div className="mcdt-subtabs" role="tablist" aria-label={ translation("key_details") }>
                { sections.map(([key, tone]) => (
                    <button key={ key } type="button" role="tab" aria-selected={ section === key } className={ section === key ? "on" : "" } onClick={ () => onSection(key) }>
                        <span className={ `dot ${ tone }` } />{ translation(CR_DETAIL_SECTION_LABEL_KEYS[key]) }
                    </button>
                )) }
            </div>
            { section === CR_DETAIL_SECTION.VISA && (
                <div className="mcdt-dcard">
                    <div className="h">
                        <span className="t">{ translation("key_stage_visa") }</span><Tok tone={ visaTone }>{ visa.token || CD_TOKEN.NOT_READY }</Tok>
                        { history.latest && <span className="mcdt-vh-tag" data-visa-projection={ `v${ history.latest.version }` }>{ translation("key_version") } { history.latest.version }</span> }
                        <span className="grow" />
                        <button type="button" className="g1-btn" data-fid="visa-hist" aria-expanded={ history.open } onClick={ history.toggle }>
                            { history.open ? translation("key_hide_history") : `${ translation("key_history") } (${ history.count })` }
                        </button>
                    </div>
                    { runOut > 0 && (
                        <div className="mcdt-warn" role="status" data-visa-runout={ runOut }><Icon name="info" size={ 12 } strokeWidth={ 1.5 } /><span>{ translation("key_cr_visa_runs_out").replace("{date}", formatDate(visaIso)).replace("{days}", String(runOut)).replace("{end}", formatDate(endIso)) }</span></div>
                    ) }
                    <div className="g">
                        <div><div className="l">{ headingCase(translation("key_visa_ref_no")) }</div><div className="v mono">{ visa.reference_no || EM_DASH }</div></div>
                        <div><div className="l">{ translation("key_visa_release_date") }</div><div className="v">{ visa.token === CD_TOKEN.VISA_RELEASED ? dateOrDash(visa.e_visa_payment_date) : EM_DASH }</div></div>
                        <div><div className="l">{ translation("key_entry_visa_expiry") }</div><div className="v">{ dateOrDash(visa.entry_visa_expiry) }</div></div>
                        <div>
                            <div className="l">{ translation("key_visa_expiry") }</div><div className="v">{ dateOrDash(visa.expiry_date) }</div>
                            { /* TERMINAL §5: Record / Update Visa Expiry while Active — reason, history and the issuance corrections in one dialog; read-only once closed */ }
                            { isActive(row) && (
                                <div className="mcdt-visa-edit">
                                    <VisaExpiryEditor surface={ VISA_EXPIRY_SURFACE.ACTIVE } contractId={ contractId } visaExpiry={ isoOf(visa.expiry_date) } contractStart={ isoOf(row.contract_start) } canEdit={ canEditVisaExpiry } onSaved={ () => { if (onChanged) onChanged(); history.reload(); } } showValue={ false }
                                        visaFields={ { entry_visa_expiry_date: isoOf(visa.entry_visa_expiry), visa_reference_no: visa.reference_no || "", e_visa_payment_date: isoOf(visa.e_visa_payment_date) } } />
                                </div>
                            ) }
                        </div>
                    </div>
                    { history.open && <VisaHistoryList versions={ history.versions } latest={ history.latest } expiry={ history.expiry } /> }
                </div>
            ) }
            { section === CR_DETAIL_SECTION.PASSPORT && (
                <div className="mcdt-dcard">
                    <div className="h">
                        <span className="t">{ translation("key_passport") }</span>
                        <Tok tone={ passport.complete ? CD_TONE.GREEN : CD_TONE.GRAY }>{ translation(passport.complete ? "key_cr_complete" : "key_incomplete") }</Tok>
                        <span className="grow" />
                        { workerLink && <Link className="g1-btn" to={ workerLink }>{ translation("key_edit") }</Link> }
                    </div>
                    <FileCard title={ translation("key_cr_passport_main_page") } path={ passport.main_page } />
                    <FileCard title={ translation("key_cr_passport_sign_page") } path={ passport.sign_page } />
                    <div className="g bt">
                        <div><div className="l">{ translation("key_passport_no") }</div><div className="v mono">{ passport.number || EM_DASH }</div></div>
                        <div><div className="l">{ translation("key_place_of_issue") }</div><div className="v">{ passport.place_of_issue || EM_DASH }</div></div>
                        <div><div className="l">{ translation("key_passport_issue_date") }</div><div className="v">{ dateOrDash(passport.issue_date) }</div></div>
                        <div><div className="l">{ translation("key_date_of_expiry") }</div><div className="v">{ dateOrDash(passport.expiry_date) }</div></div>
                    </div>
                </div>
            ) }
            { section === CR_DETAIL_SECTION.INSURANCE && (
                <div className="mcdt-dcard flush">
                    <table className="mcdt-list">
                        <thead>
                            <tr>
                                { ["key_policy_status", "key_policy_no", "key_effective_date", "key_expiry_date", "key_invoice_ref", "key_cs_owner"].map((k) => <th key={ k }>{ headingCase(translation(k)) }</th>) }
                            </tr>
                        </thead>
                        <tbody>
                            { insurance.ref ? (
                                <tr>
                                    <td><Tok tone={ insuranceTone }>{ insurance.token || CD_TOKEN.NOT_READY }</Tok></td>
                                    {/* the applicable period's QBE policy number and confirmed dates ("—" before the insurer issues them) */}
                                    <td className="mono">{ insurance.policy_number || EM_DASH }</td>
                                    <td className="mono">{ dateOrDash(insurance.effective_date) }</td>
                                    <td className="mono">{ dateOrDash(insurance.expiry_date) }</td>
                                    <td className="mono">{ insurance.invoice_ref || EM_DASH }</td>
                                    <td>{ row.cs_owner_name ? <span className="mcdt-owner"><span className="mcdt-av sm cs">{ initialsOf(row.cs_owner_name) }</span>{ row.cs_owner_name }</span> : EM_DASH }</td>
                                </tr>
                            ) : <tr><td colSpan={ 6 } className="mcdt-emptyrow">{ translation("key_no_policy_yet") }</td></tr> }
                        </tbody>
                    </table>
                </div>
            ) }
        </>
    );
};

DetailsTab.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    canEditVisaExpiry: PropTypes.bool,
    onChanged: PropTypes.func,
    row: PropTypes.object.isRequired,
    section: PropTypes.string.isRequired,
    onSection: PropTypes.func.isRequired,
};

export default React.memo(DetailsTab);
