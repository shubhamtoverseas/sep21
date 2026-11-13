import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import "./job-offer-suggest.css";
import Icon from "../../../../../components/Icon/Icon";
import DateInput from "../../../../../components/ui/DateInput";
import useDialogFocus from "../../../../../hooks/useDialogFocus";
import { getCurrentEngagementKind } from "../../../../../services/commonService";
import JoStatusTag from "../JoStatusTag";
import JoApplicantProfile from "../record/JoApplicantProfile";
import JoSuggestFilters from "./JoSuggestFilters";
import JoSuggestResults from "./JoSuggestResults";
import JoSuggestSuggested from "./JoSuggestSuggested";
import useJobOfferSuggest, { JO_SUGGEST_VIEW } from "./useJobOfferSuggest";
import { JO_RECORD_COPY, JO_SUGGEST_COPY, JO_SUGGEST_MODE } from "../../jobOfferConstants";

const JobOfferSuggestModal = ({ jobId, detail, employer, perms, canOpenWorker, onOpenWorker, onClose, onChanged }) => {
    const dialogRef = useRef(null);
    useDialogFocus(dialogRef, onClose);
    useEffect(() => {
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = overflow; };
    }, []);

    const sw = useJobOfferSuggest({ jobId, detail, onChanged });
    const { filtersOpen, setFiltersOpen } = sw;

    /* focus follows the prototype: opening Filters lands on the first control, closing it (button or Escape) returns to the
       Filters button, and Search ⇄ Suggested lands on the view control (Suggested n / Back) */
    const filtersBtnRef = useRef(null);
    const filtersWasOpen = useRef(false);
    useEffect(() => {
        if (filtersOpen) {
            filtersWasOpen.current = true;
            dialogRef.current?.querySelector('#jo-sw-filters .mc-sw-ctl:not([disabled])')?.focus();
        } else if (filtersWasOpen.current) {
            filtersWasOpen.current = false;
            filtersBtnRef.current?.focus();
        }
    }, [filtersOpen]);
    const viewMounted = useRef(false);
    useEffect(() => {
        if (!viewMounted.current) { viewMounted.current = true; return; }
        dialogRef.current?.querySelector('[data-sw-view]')?.focus();
    }, [sw.view]);

    const onKeyDown = useCallback((event) => {
        if (event.key === 'Escape' && filtersOpen && !event.defaultPrevented) { event.preventDefault(); setFiltersOpen(false); }
    }, [filtersOpen, setFiltersOpen]);

    const employerName = detail?.employers_fullname || employer?.name || '';
    const chineseName = employer?.chinese_name || null;
    const engagement = getCurrentEngagementKind(detail) || getCurrentEngagementKind(employer);
    const isSearch = sw.view === JO_SUGGEST_VIEW.SEARCH;

    return createPortal(
        <div className="jo-sw jor" role="presentation">
            <div className="mc-sw-backdrop" onClick={ onClose } role="presentation" />
            <div ref={ dialogRef } className="mc-sw-dialog" role="dialog" aria-modal="true" aria-labelledby="jo-sw-title" aria-describedby="jo-sw-sub" tabIndex={ -1 } onKeyDown={ onKeyDown }>
                <header className="mc-sw-head">
                    <h2 id="jo-sw-title">{ JO_SUGGEST_COPY.title }</h2>
                    <span className="mc-sw-sep" aria-hidden="true">·</span>
                    <span className="mc-sw-sub" id="jo-sw-sub">
                        { employerName && <span className="emp mc-person-name">{ employerName }{ chineseName ? <span className="zh"> · { chineseName }</span> : null }</span> }
                        { detail?.reference_id && <span className="mc-code-text" data-mc-plain-job-offer-ref="true">{ detail.reference_id }</span> }
                        <JoStatusTag status={ detail?.status } className="mc-sw-jostatus" />
                        { engagement && <span className="mc-sw-channel">{ JO_RECORD_COPY.engagement[engagement] }</span> }
                    </span>
                    <span className="sp" />
                    <button type="button" className="mc-sw-close" onClick={ onClose } aria-label={ JO_SUGGEST_COPY.close }><Icon name="x" size={ 16 } /></button>
                </header>

                <div className="mc-sw-body">
                    { isSearch ? (
                        <>
                            <div className="mc-sw-bar" role="group" aria-label={ JO_SUGGEST_COPY.searchGroup }>
                                <label className="mc-sw-wrap search" title={ JO_SUGGEST_COPY.searchHelp }>
                                    <span className="ic s"><Icon name="search" size={ 14 } /></span>
                                    <input type="search" className="mc-sw-search" placeholder={ JO_SUGGEST_COPY.searchPlaceholder } aria-label={ `${ JO_SUGGEST_COPY.searchPlaceholder } — ${ JO_SUGGEST_COPY.searchHelp }` } value={ sw.searchInput } onChange={ (event) => sw.setSearch(event.target.value) } />
                                </label>
                                <div className="mc-sw-seg" role="group" aria-label={ JO_SUGGEST_COPY.workerSet }>
                                    <button type="button" aria-pressed={ sw.mode === JO_SUGGEST_MODE.LOCAL } onClick={ () => sw.setMode(JO_SUGGEST_MODE.LOCAL) }>{ JO_SUGGEST_COPY.local }</button>
                                    <button type="button" aria-pressed={ sw.mode === JO_SUGGEST_MODE.OVERSEAS } onClick={ () => sw.setMode(JO_SUGGEST_MODE.OVERSEAS) }>{ JO_SUGGEST_COPY.overseas }</button>
                                </div>
                                <label className="mc-sw-wrap date" htmlFor="jo-sw-start">
                                    <span className="dl">{ JO_SUGGEST_COPY.startDate }</span>
                                    <DateInput id="jo-sw-start" value={ sw.filters.start_date } onChange={ (value) => sw.setFilter('start_date', value) } className="mc-sw-date" />
                                </label>
                                <button ref={ filtersBtnRef } type="button" className={ `mc-sw-btn${ filtersOpen ? ' on' : '' }` } aria-expanded={ filtersOpen } aria-controls="jo-sw-filters" onClick={ () => setFiltersOpen((open) => !open) }>
                                    <span className="ic"><Icon name="filter" size={ 13 } /></span>{ JO_SUGGEST_COPY.filters } ({ sw.filterCount })
                                </button>
                                { sw.showClear && <button type="button" className="mc-sw-btn link" onClick={ sw.clearAll }>{ JO_SUGGEST_COPY.clearAll }</button> }
                                { sw.showRestore && <button type="button" className="mc-sw-btn link" onClick={ sw.restore }>{ JO_SUGGEST_COPY.restore }</button> }
                                <span className="sp" />
                                <button type="button" className="mc-sw-dest" data-sw-view="suggested" aria-label={ `${ JO_SUGGEST_COPY.suggested }, ${ sw.suggested.total }` } onClick={ () => sw.openView(JO_SUGGEST_VIEW.SUGGESTED) }>
                                    <span className="dot" aria-hidden="true" />{ JO_SUGGEST_COPY.suggested }
                                    <span className="n">{ sw.suggested.total }</span>
                                    <span className="ic"><Icon name="chev_right" size={ 12 } /></span>
                                </button>
                            </div>
                            { filtersOpen && <JoSuggestFilters mode={ sw.mode } filters={ sw.filters } lists={ sw.lists } onChange={ sw.setFilter } /> }
                            <div className="mc-sw-grid">
                                <JoSuggestResults
                                    mode={ sw.mode }
                                    results={ sw.results }
                                    page={ sw.page }
                                    onPage={ sw.setPage }
                                    selected={ sw.selected }
                                    onToggle={ sw.toggleSelected }
                                    profileId={ sw.profileRow?.id ?? null }
                                    onProfile={ sw.setProfileId }
                                    canOpenWorker={ canOpenWorker }
                                    onOpenWorker={ onOpenWorker }
                                    canSend={ perms.canSuggestWorker }
                                    sending={ sw.sending }
                                    onSend={ sw.send }
                                    onRetry={ sw.refetch }
                                    batch={ sw.batch }
                                    onDismissBatch={ sw.dismissBatch }
                                />
                                <section className="mc-sw-card side" aria-label={ JO_SUGGEST_COPY.profileLabel }>
                                    <JoApplicantProfile
                                        row={ sw.profileRow }
                                        perms={ perms }
                                        showTools={ false }
                                        emptyText={ JO_SUGGEST_COPY.selectWorker }
                                        canOpenWorker={ canOpenWorker }
                                        onOpenWorker={ onOpenWorker }
                                    />
                                </section>
                            </div>
                        </>
                    ) : (
                        <JoSuggestSuggested
                            suggested={ sw.suggested }
                            page={ sw.suggestedPage }
                            onPage={ sw.setSuggestedPage }
                            onBack={ () => sw.openView(JO_SUGGEST_VIEW.SEARCH) }
                            canOpenWorker={ canOpenWorker }
                            onOpenWorker={ onOpenWorker }
                        />
                    ) }
                </div>
            </div>
        </div>,
        document.body
    );
};

JobOfferSuggestModal.propTypes = {
    jobId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    detail: PropTypes.object,
    employer: PropTypes.object,
    perms: PropTypes.object.isRequired,
    canOpenWorker: PropTypes.bool,
    onOpenWorker: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onChanged: PropTypes.func,
};

export default JobOfferSuggestModal;
