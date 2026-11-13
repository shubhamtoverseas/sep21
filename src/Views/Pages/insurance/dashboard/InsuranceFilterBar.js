import React, { lazy, Suspense, useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import FilterSelect from "../../../../components/ui/FilterSelect";
import StaffAccountCue from "../../../../components/ui/StaffAccountCue";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./InsuranceDashboard.module.css";
import InsuranceMenu, { MenuItem } from "./InsuranceMenu";
import { RequestTag } from "../shared/InsuranceWorkTags";
import {
    COVERAGE_LABELS, DATE_PRESET_KEYS, REQUEST_TYPES, coverageLabel, fmtDateShort, requestTypeLabel, translation,
} from "./insuranceDashboardConfig";

/* loaded on first open: the dialog's date picker stays out of the dashboard's chunk */
const InsuranceCustomRangeDialog = lazy(() => import("./InsuranceCustomRangeDialog"));

const allOption = () => ({ value: "", label: translation("key_all") });

/* Filter bar, in order (INDEX §3.1): Search · Coverage status · Request · Branch · CS Owner · Activity ·
   trailing Columns and Clear filters. Only granted options are offered (R5). */
const InsuranceFilterBar = ({
    meta, filters, searchInput, isFiltered, columnsMenu, onSearchChange, onFilterChange, onClear,
}) => {
    const [rangeOpen, setRangeOpen] = useState(false);
    const searchEnabled = Boolean(meta?.search?.enabled);
    const placeholder = !searchEnabled
        ? translation("key_ins_search_not_available")
        : translation(meta?.search?.invoice ? "key_ins_search_placeholder_invoice" : "key_ins_search_placeholder");

    const coverageOptions = useMemo(() => [allOption(), ...COVERAGE_LABELS.map((v) => ({ value: v, label: coverageLabel(v) }))], []);
    /* each request type is offered as its coloured tag (Insurance.html optionLabel: tagType → requestTag; INS08) */
    const requestOptions = useMemo(() => [allOption(), ...REQUEST_TYPES.map((v) => ({ value: v, label: requestTypeLabel(v), menuLabel: <RequestTag type={v} /> }))], []);
    const branchOptions = useMemo(
        () => (meta?.branches?.length ? [allOption(), ...meta.branches.map((b) => ({ value: String(b.id), label: b.name }))] : []),
        [meta]
    );
    const ownerOptions = useMemo(() => {
        const owners = meta?.owners;
        if (!owners?.offered) return [];
        return [
            { value: "all", label: translation("key_all") },
            ...(owners.mine ? [{ value: "mine", label: translation("key_ins_owner_mine") }] : []),
            /* inactive people stay listed so their records remain findable; the option keeps the plain name and carries the
               shared cue only for an explicitly inactive account (C3) */
            ...(owners.staff || []).map((s) => ({
                value: String(s.id),
                label: s.name,
                adornment: <StaffAccountCue active={s.active} embedded />,
            })),
        ];
    }, [meta]);

    const presets = meta?.datePresets || [];
    const durations = meta?.customDurations || [];
    const activity = filters.activity;
    const activityValue = activity?.preset
        ? translation(DATE_PRESET_KEYS[activity.preset])
        : activity?.from && activity?.to
            ? `${fmtDateShort(activity.from)} – ${fmtDateShort(activity.to)}`
            : translation("key_ins_any_time");

    const handleSearch = useCallback((event) => onSearchChange(event.target.value), [onSearchChange]);
    const applyRange = useCallback((range) => {
        setRangeOpen(false);
        onFilterChange("activity", range);
    }, [onFilterChange]);

    return (
        <div className={`${listStyles.filterBar} ${styles.filterCard}`} role="search" aria-label={translation("key_filters")}>
            <div className={`${listStyles.controlsRow} ${styles.filtersRow}`}>
                <div className={`${listStyles.controlsSearch} ${searchEnabled ? "" : styles.searchDisabled}`} aria-disabled={!searchEnabled || undefined}>
                    <Icon name="search" size={14} />
                    <input
                        id="insurance-search" maxLength={100}
                        type="search"
                        className={listStyles.controlsSearchInput}
                        placeholder={placeholder}
                        value={searchInput}
                        onChange={handleSearch}
                        disabled={!searchEnabled}
                        aria-label={translation("key_ins_search_aria")}
                        autoComplete="off"
                    />
                </div>

                <FilterSelect id="ins-filter-coverage" label={translation("key_ins_col_coverage_status")} value={filters.coverage} multiple
                    options={coverageOptions} menuWidth={200} onChange={(v) => onFilterChange("coverage", v)} />
                <FilterSelect id="ins-filter-request" label={translation("key_ins_filter_request")} value={filters.request} multiple
                    options={requestOptions} menuWidth={200} onChange={(v) => onFilterChange("request", v)} />
                {branchOptions.length > 0 && (
                    <FilterSelect id="ins-filter-branch" label={translation("key_branch")} value={filters.branch.map(String)} multiple
                        options={branchOptions} menuWidth={220} onChange={(v) => onFilterChange("branch", v)} />
                )}
                {ownerOptions.length > 0 && (
                    <FilterSelect id="ins-filter-owner" label={translation("key_ins_col_cs_owner")} value={String(filters.owner)}
                        options={ownerOptions} menuWidth={220} onChange={(v) => onFilterChange("owner", v)} />
                )}
                {(presets.length > 0 || durations.length > 0) && (
                    <InsuranceMenu
                        id="ins-filter-activity"
                        label={translation("key_ins_col_activity")}
                        active={Boolean(activity)}
                        trigger={<span>{translation("key_ins_col_activity")} · {activityValue}</span>}
                    >
                        {(close) => (
                            <>
                                <MenuItem role="menuitemradio" radio checked={!activity} onSelect={() => { onFilterChange("activity", null); close(); }}>
                                    {translation("key_ins_any_time")}
                                </MenuItem>
                                {presets.map((p) => (
                                    <MenuItem key={p} role="menuitemradio" radio checked={activity?.preset === p}
                                        onSelect={() => { onFilterChange("activity", { preset: p }); close(); }}>
                                        {translation(DATE_PRESET_KEYS[p])}
                                    </MenuItem>
                                ))}
                                {durations.length > 0 && (
                                    <>
                                        <div className={styles.menuSep} />
                                        <MenuItem role="menuitemradio" radio checked={Boolean(activity?.duration)}
                                            onSelect={() => { close(false); setRangeOpen(true); }}>
                                            {`${translation("key_ins_custom_range")}…`}
                                        </MenuItem>
                                    </>
                                )}
                            </>
                        )}
                    </InsuranceMenu>
                )}

                <div className={styles.filterEnd}>
                    {columnsMenu}
                    {isFiltered && (
                        <button type="button" className={styles.clearBtn} onClick={onClear}>
                            {translation("key_ins_clear_filters")}
                        </button>
                    )}
                </div>
            </div>
            {rangeOpen && (
                <Suspense fallback={null}>
                    <InsuranceCustomRangeDialog
                        initial={activity?.duration ? activity : null}
                        grantedDurations={durations}
                        onApply={applyRange}
                        onClose={() => setRangeOpen(false)}
                    />
                </Suspense>
            )}
        </div>
    );
};

InsuranceFilterBar.propTypes = {
    meta: PropTypes.object,
    filters: PropTypes.object.isRequired,
    searchInput: PropTypes.string.isRequired,
    isFiltered: PropTypes.bool,
    columnsMenu: PropTypes.node,
    onSearchChange: PropTypes.func.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
};

export default React.memo(InsuranceFilterBar);
