import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import WkdStageChip, { wkdStageLabel, wkdStageTone } from "../WkdStageChip";
import { ivMethodIcon } from "./wkdJoIcons";
import NewUiSelect from "../../../../../../components/newui-select/NewUiSelect";
import translation from "../../../../../../utils/translation";
import { getInitials, toTitleCase } from "../../../../../../utils/utils";
import { getJobOfferPermissions } from "../../../../../../utils/permissions/jobPermissionsUtils";
import { JO_FROM, JO_INTERVIEW_CELL_FORMAT, JO_INTERVIEW_METHOD, jobOfferDetailsPath } from "../../../../JobOfferPage/jobOfferConstants";
import {
    WKD_JO_STAGE_FILTERS, WKD_JO_STAGE_FILTER_ALL, WKD_STAGE_TITLE_CASE_KEYS, WKD_JO_INTERVIEW_STAGE_IDS, WKD_JO_IN_PERSON_TYPE, WKD_JO_SUGGESTED_STAGE_ID,
} from "../../../workerModuleConstants";
import "../wkd-listings.css";

const searchIcon = (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#676e77" strokeWidth="1.6" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" />
    </svg>
);

const stageFilterLabel = (filter) => {
    const label = translation(filter.labelKey);
    return WKD_STAGE_TITLE_CASE_KEYS.includes(filter.labelKey) ? toTitleCase(label) : label;
};

const WkdJobOfferListing = ({ handleJobDetailView, workerJobs, handleJoStatusChange, onSearchJORefresh, listState, onRetry }) => {
    const navigate = useNavigate();
    const permissionList = useSelector((state) => state.users.permissionList);
    const ownerOnboardingList = useSelector((state) => state.users.ownerOnboardingList);
    const [joStatus, setJoStatus] = useState(WKD_JO_STAGE_FILTER_ALL);

    /* U-0326 (21 Oct): a suggestion is not a Job Offer stage on this screen — Suggested (17) rows stay on the Suggest screen; Invited (1) stays here */
    const rows = useMemo(() => (workerJobs?.data ? workerJobs.data.filter((row) => Number(row?.job_stage_status) !== WKD_JO_SUGGESTED_STAGE_ID) : []), [workerJobs?.data]);
    const isLoading = Boolean(listState?.loading);
    const hasError = Boolean(listState?.error) && !isLoading;

    const handleSearchChange = useCallback((e) => {
        onSearchJORefresh(e.target.value);
    }, [onSearchJORefresh]);

    /* proto JO_STAGE_LIST: a fixed vocabulary, not the server's stage table */
    const stageOptions = useMemo(() => [
        { value: WKD_JO_STAGE_FILTER_ALL, label: translation('key_all') },
        ...WKD_JO_STAGE_FILTERS.map((filter) => ({ value: filter.id, label: stageFilterLabel(filter) })),
    ], []);

    const canOpenEmployerJo = useCallback((row) => Boolean(
        row?.employer_id
        && getJobOfferPermissions(permissionList, ownerOnboardingList, row.employer_id)?.canViewDetails
    ), [permissionList, ownerOnboardingList]);

    const openEmployerJo = useCallback((row) => {
        navigate(jobOfferDetailsPath(row.job_id, JO_FROM.WORKER));
    }, [navigate]);

    /* proto joListHTML hasDt: a time shows only for stages that carry an interview; the branch only for in-person */
    const interviewCell = (row) => {
        const type = Number(row?.worker_interview_type);
        const hasInterview = WKD_JO_INTERVIEW_STAGE_IDS.includes(Number(row?.job_stage_status)) && row?.interview_date && row?.interview_time;
        const method = JO_INTERVIEW_METHOD[type] ? translation(JO_INTERVIEW_METHOD[type].key) : '';
        const location = type === WKD_JO_IN_PERSON_TYPE ? row?.branch_display_name : '';
        const methodLocation = [method, location].filter(Boolean).join(' · ');
        return (
            <div className="wkd-jo-ivcell">
                { hasInterview
                    ? (
                        <div>
                            <div className="wkd-jo-dt">{ dayjs(`${ row.interview_date } ${ row.interview_time }`).format(JO_INTERVIEW_CELL_FORMAT) }</div>
                            { methodLocation && (
                                <div className="wkd-jo-ml">
                                    { ivMethodIcon(type) }
                                    <span>{ methodLocation }</span>
                                </div>
                            ) }
                        </div>
                    )
                    : <span className="mc-listing-missing">—</span> }
            </div>
        );
    };

    const refCell = (row) => {
        if (!canOpenEmployerJo(row)) {
            return <span className="mc-code-plain" data-mc-plain-job-offer-ref="true" data-worker-job-offer-ref="list">{ row.reference_id }</span>;
        }
        return (
            <button
                type="button"
                className="mc-code-link"
                role="link"
                data-worker-job-offer-ref="list"
                aria-label={ `${ translation('key_job_offer') } ${ row.reference_id }` }
                onClick={ (e) => { e.stopPropagation(); openEmployerJo(row); } }
                onKeyDown={ (e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); } }
            >
                { row.reference_id }
            </button>
        );
    };

    const body = () => {
        if (hasError) {
            return (
                <div className="ctx-state wkd-listing-state" data-context-state="error">
                    <span className="ctx-state-icon">!</span>
                    <strong>{ translation('key_something_went_wrong') }</strong>
                    { onRetry && (
                        <button type="button" className="ctx-btn secondary" onClick={ onRetry }>{ translation('key_retry') }</button>
                    ) }
                </div>
            );
        }
        if (isLoading && rows.length === 0) {
            return (
                <div className="ctx-state wkd-listing-state" data-context-state="loading" aria-busy="true">
                    <span className="ctx-spinner" />
                    <strong>{ translation('key_loading') }…</strong>
                </div>
            );
        }
        if (rows.length === 0) {
            return <div className="wkd-jo-empty">{ translation('key_no_job_offers_match') }</div>;
        }
        return rows.map((row) => (
            <div
                key={ row.job_id }
                role="link"
                tabIndex={ 0 }
                aria-label={ row.reference_id }
                className="mc-worker-listing-row row-nav wkd-grid-jo"
                onClick={ () => handleJobDetailView(row) }
                onKeyDown={ (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleJobDetailView(row);
                    }
                } }
            >
                <div className="mc-listing-primary">
                    { row.employers_fullname || <span className="mc-listing-missing">—</span> }
                </div>
                <div>{ refCell(row) }</div>
                <div>
                    <WkdStageChip label={ wkdStageLabel(row) } tone={ wkdStageTone(row) } compact />
                </div>
                { interviewCell(row) }
                <div>
                    { row.cs_name ? (
                        <div className="wkd-listing-owner">
                            <span className="wkd-listing-owner-av">{ getInitials(row.cs_name) }</span>
                            <span className="mc-listing-owner-name">{ row.cs_name }</span>
                        </div>
                    ) : <span className="mc-listing-missing">—</span> }
                </div>
            </div>
        ));
    };

    return (
        <div className="mc-worker-listing-body">
            <div className="mc-newtop" aria-hidden="true" />
            <div className="mc-worker-listing-card" aria-busy={ isLoading || undefined }>
                <div className="wkd-jo-filterbar" data-mc-filter-toolbar="job-offer">
                    <div className="wkd-jo-search" data-mc-filter-search="job-offer">
                        { searchIcon }
                        <input
                            type="text"
                            aria-label={ translation('key_search') }
                            placeholder={ translation('key_search') }
                            onChange={ handleSearchChange }
                        />
                    </div>
                    <NewUiSelect
                        label={ translation('key_stage') }
                        value={ joStatus }
                        options={ stageOptions }
                        onChange={ (v) => { setJoStatus(v); handleJoStatusChange(v); } }
                    />
                    <span className="wkd-jo-count">
                        { rows.length }{ workerJobs?.total ? ` ${ translation('key_of') } ${ workerJobs.total }` : '' }
                    </span>
                </div>

                <div className="mc-worker-listing-header wkd-grid-jo">
                    <span className="mc-collabel">{ translation('key_employer_name') }</span>
                    <span className="mc-collabel">{ translation('key_job_offer_ref') }</span>
                    <span className="mc-collabel">{ translation('key_stage') }</span>
                    <span className="mc-collabel">{ translation('key_interview_details') }</span>
                    <span className="mc-collabel">{ translation('key_cs_owner') }</span>
                </div>

                { body() }
            </div>
        </div>
    );
};

WkdJobOfferListing.propTypes = {
    handleJobDetailView: PropTypes.func,
    handleJoStatusChange: PropTypes.func,
    onSearchJORefresh: PropTypes.func,
    workerJobs: PropTypes.any,
    listState: PropTypes.shape({ loading: PropTypes.bool, error: PropTypes.bool }),
    onRetry: PropTypes.func,
};

export default React.memo(WkdJobOfferListing);
