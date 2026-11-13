import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import Icon from "../../../../../components/Icon/Icon";
import Btn from "../../../../../components/ui/Btn";
import EngagementIcon from "../../../../../components/ui/EngagementIcon";
import { getCurrentEngagementKind } from "../../../../../services/commonService";
import { getInitials } from "../../../../../utils/utils";
import translation from "../../../../../utils/translation";
import JoStatusTag from "../JoStatusTag";
import { JO_APPLICANT_COPY, JO_OWNER_COPY, JO_RECORD_COPY } from "../../jobOfferConstants";

const facts = (detail, seed) => {
    const starts = detail?.asap === 1 ? JO_RECORD_COPY.asap : (detail?.start_date ? dayjs(detail.start_date).format('D MMM YYYY') : null);
    const daysOpen = detail?.days_open ?? seed?.days_open ?? null;
    const views = detail?.view_count ?? seed?.view_count ?? null;
    const branch = detail?.branch_display_name || detail?.branch_name || seed?.branch_display_name || seed?.branch_name || null;
    return { starts, daysOpen, views, branch };
};

const JobOfferRecordHeader = ({ detail, seed, employer, followUp = null, onStatusMenu, onApplicantView, applicantViewOpen, onChangeOwner = null }) => {
    const { starts, daysOpen, views, branch } = facts(detail, seed);
    const name = detail?.employers_fullname || seed?.employer_fullname || employer?.name || null;
    const chineseName = detail?.employer_chinese_name || employer?.chinese_name || seed?.employer_chinese_name || null;
    const engagement = getCurrentEngagementKind(detail) || getCurrentEngagementKind(seed) || getCurrentEngagementKind(employer);
    const csName = detail?.cs_owner_name || detail?.cs_name || seed?.cs_name || null;
    const dash = <span className="mc-unavailable">—</span>;

    return (
        <section className="jor-head" aria-label={ JO_APPLICANT_COPY.jobOffer }>
            <div className="row1">
                <span className="regicon">
                    <EngagementIcon kind={ engagement } />
                </span>
                <div className="ident">
                    <div className="idline">
                        <span className="empname mc-person-name">{ name || dash }{ name && chineseName ? <span className="zh"> · { chineseName }</span> : null }</span>
                        <JoStatusTag status={ detail?.status } />
                    </div>
                    <div className="refline">
                        <span className="mc-code-text" data-mc-plain-job-offer-ref="true">{ detail?.reference_id || seed?.reference_id || '—' }</span>
                        <span className="dot">·</span>
                        <span className="channel">{ engagement ? JO_RECORD_COPY.engagement[engagement] : '—' }</span>
                    </div>
                </div>
                <div className="r" data-jo-header-actions="true">
                    { followUp }
                    { onApplicantView && (
                        <Btn variant="secondary" aria-haspopup="dialog" aria-expanded={ applicantViewOpen } onClick={ onApplicantView }>
                            <Icon name="eye" size={ 14 } /> { JO_RECORD_COPY.applicantView }
                        </Btn>
                    ) }
                    { onStatusMenu }
                    <span className="wd-owner" aria-label={ `${ translation('key_cs_owner') } ${ csName || JO_RECORD_COPY.notAssigned }` }>
                        { csName && <span className="av">{ getInitials(csName) }</span> }
                        <span className="role">{ translation('key_cs_owner') } ·</span>
                        { csName ? <b>{ csName }</b> : <b className="mc-unavailable">—</b> }
                    </span>
                    { /* Change CS Owner (grant-gated): the record's own owner, never the employer's (PERM §4.13) */ }
                    { onChangeOwner && (
                        <Btn variant="secondary" aria-haspopup="dialog" aria-label={ JO_OWNER_COPY.title } title={ JO_OWNER_COPY.title } onClick={ onChangeOwner }>{ JO_OWNER_COPY.confirm }</Btn>
                    ) }
                </div>
            </div>
            <div className="row2 meta" data-jo-meta="true">
                <span className="fact"><span className="lbl">{ JO_RECORD_COPY.starts }</span> <b>{ starts || '—' }</b></span>
                <span className="vsep" aria-hidden="true" />
                <span className="secondary">
                    { daysOpen != null ? `${ daysOpen } ${ JO_RECORD_COPY.daysOpen }` : '—' } · { views != null ? `${ views } ${ JO_RECORD_COPY.views }` : '—' }
                </span>
                <span className="vsep" aria-hidden="true" />
                <span className="fact loc"><Icon name="pin" size={ 13 } /> { branch ? <b>{ branch } { JO_RECORD_COPY.office }</b> : dash }</span>
            </div>
        </section>
    );
};

JobOfferRecordHeader.propTypes = {
    followUp: PropTypes.node,
    detail: PropTypes.object,
    seed: PropTypes.object,
    employer: PropTypes.object,
    onStatusMenu: PropTypes.node,
    onApplicantView: PropTypes.func,
    applicantViewOpen: PropTypes.bool,
    onChangeOwner: PropTypes.func,
};

export default React.memo(JobOfferRecordHeader);
