import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import Icon from "../../../../../components/Icon/Icon";
import Modal from "../../../../../components/ui/Modal";
import { getInitials } from "../../../../../utils/utils";
import translation from "../../../../../utils/translation";
import JoIcon from "../joIcons";
import { JO_APPLICANT_COPY, JO_APPLICANT_VIEW_COPY, JO_RECORD_COPY, jobOfferDayOffNames } from "../../jobOfferConstants";

const EM = '—';
const namesOf = (list) => (Array.isArray(list) ? list.map((x) => x?.name).filter(Boolean) : []);
const money = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? `$${ n.toLocaleString('en-US', { maximumFractionDigits: 0 }) }` : ''; };

const Kv = ({ k, v }) => (
    <div className="f"><div className="l">{ k }</div><div className={ `v${ v ? '' : ' mc-unavailable' }` }>{ v || EM }</div></div>
);
Kv.propTypes = { k: PropTypes.node, v: PropTypes.node };

const Tags = ({ items }) => (items.length ? <div className="wd-tags">{ items.map((t) => <span key={ t } className="wd-tag">{ t }</span>) }</div> : <p className="mc-unavailable">{ EM }</p>);
Tags.propTypes = { items: PropTypes.array.isRequired };

const JoApplicantViewModal = ({ detail, employer, perms, onShare, onAddLink, onEdit, onClose }) => {
    const emp = detail?.employer_details;
    const family = detail?.employers_fullname || employer?.name || '';
    const location = [emp?.district_info?.name || emp?.location_info?.name, emp?.house_size ? `${ emp.house_size } ${ JO_APPLICANT_VIEW_COPY.sqft }` : ''].filter(Boolean).join(', ');
    const salary = money(detail?.fixed_salary) || [money(detail?.min_salary), money(detail?.max_salary)].filter(Boolean).join(' – ') || detail?.expected_salary?.name || '';
    const salary2 = detail?.higher_salary ? translation('key_higher_salary_note') : '';
    const canStart = detail?.asap === 1 ? JO_RECORD_COPY.asap : (detail?.start_date ? dayjs(detail.start_date).format(JO_APPLICANT_VIEW_COPY.startDateFormat) : '');
    const coworker = detail ? `${ detail.coworker_status ? translation('key_yes') : translation('key_no') }${ detail.co_worker_count ? ` · ${ detail.co_worker_count }` : '' }` : '';
    /* the generated package (D-09) is the saved copy; `head_line` / `job_description_english` are the rollout fallback */
    const headline = detail?.copy?.headline_en || detail?.head_line || '';
    const description = detail?.copy?.description_en || detail?.job_description_english || detail?.detailed_description || '';
    /* the same owner the record header shows (cs_owner_name first) — the two surfaces must never name different people */
    const csName = detail?.cs_owner_name || detail?.cs_name || '';
    const ref = detail?.reference_id || '';

    return (
        <Modal
            title={ JO_APPLICANT_VIEW_COPY.title }
            subtitle={ <>{ JO_APPLICANT_VIEW_COPY.subtitle } · <span className="mc-code-text">{ ref }</span></> }
            width={ 720 }
            className="jor-wv-modal"
            closeLabel={ JO_APPLICANT_VIEW_COPY.close }
            onClose={ onClose }
        >
            <div className="jor-wv">
                <div className="tools">
                    { perms.canShare && <button type="button" className="wd-btn" title={ JO_APPLICANT_COPY.shareTitle } onClick={ onShare }><JoIcon name="share" /> { translation('key_share') }</button> }
                    { perms.canShare && <button type="button" className="wd-btn" title={ JO_APPLICANT_COPY.addLinkTitle } onClick={ onAddLink }><JoIcon name="link" />{ JO_APPLICANT_COPY.addLink }</button> }
                    { /* Edit opens the editor; without the Edit grant it opens read-only (U-0136), so every Details View holder gets the entry */ }
                    { perms.canViewDetails && <button type="button" className="wd-btn" title={ `${ JO_APPLICANT_VIEW_COPY.editTitle } ${ ref }` } aria-label={ `${ JO_APPLICANT_VIEW_COPY.editTitle } ${ ref }` } onClick={ onEdit }><Icon name="edit" size={ 14 } /> { translation('key_edit') }</button> }
                    <span className="sp" />
                    <span className="wd-owner" aria-label={ `${ translation('key_cs_owner') } ${ csName || JO_RECORD_COPY.notAssigned }` }>
                        { csName && <span className="av">{ getInitials(csName) }</span> }
                        <span className="role">{ translation('key_cs_owner') } ·</span>
                        { csName ? <b>{ csName }</b> : <b className="mc-unavailable">{ EM }</b> }
                    </span>
                </div>
                <div className="title">
                    <span className="mc-code-text ref" data-mc-plain-job-offer-ref="true">{ ref }</span>
                    { headline && <div className="h">{ headline }</div> }
                    { family && <div className="fam">{ family }</div> }
                    { location && <div className="loc">{ location }</div> }
                </div>
                <div className="sec"><div className="mc-main-duties-label">{ JO_APPLICANT_VIEW_COPY.jobDescription }</div><p className={ `para${ description ? '' : ' mc-unavailable' }` }>{ description || EM }</p></div>
                <div className="sec"><div className="mc-main-duties-label">{ JO_APPLICANT_VIEW_COPY.mainDuties }</div><Tags items={ namesOf(detail?.skills_info) } /></div>
                <div className="sec"><div className="kv">
                    <Kv k={ JO_APPLICANT_VIEW_COPY.salary } v={ salary ? (salary2 ? `${ salary }\n${ salary2 }` : salary) : '' } />
                    <Kv k={ JO_APPLICANT_VIEW_COPY.startDate } v={ canStart } />
                    <Kv k={ JO_APPLICANT_VIEW_COPY.language } v={ namesOf(detail?.spoken_language_info).join('\n') } />
                </div></div>
                <div className="sec"><div className="mc-main-duties-label">{ JO_APPLICANT_VIEW_COPY.otherResponsibilities }</div><Tags items={ namesOf(detail?.responsibilities_info) } /></div>
                <div className="sec"><div className="kv">
                    <Kv k={ JO_APPLICANT_VIEW_COPY.accommodation } v={ detail?.helper_accommadation?.name || detail?.helper_accommadation_info?.name } />
                    <Kv k={ JO_APPLICANT_VIEW_COPY.coworker } v={ coworker } />
                    <Kv k={ JO_APPLICANT_VIEW_COPY.dayOff } v={ jobOfferDayOffNames(detail).join(', ') } />
                </div></div>
            </div>
        </Modal>
    );
};

JoApplicantViewModal.propTypes = {
    detail: PropTypes.object,
    employer: PropTypes.object,
    perms: PropTypes.object.isRequired,
    onShare: PropTypes.func.isRequired,
    onAddLink: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default React.memo(JoApplicantViewModal);
