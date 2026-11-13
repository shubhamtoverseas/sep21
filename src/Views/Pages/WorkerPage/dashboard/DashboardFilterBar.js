import React, { useCallback, useMemo, useRef, useState } from "react";
import translation from "../../../../utils/translation";
import PropTypes from "prop-types";
import WgdIcon from "./WgdIcon";
import NewUiSelect from "../../../../components/newui-select/NewUiSelect";
import OwnerFilterMenu from "./OwnerFilterMenu";
import useOutsideClick from "../../../../hooks/useOutsideClick";
import ColumnsChooser from "../../../../components/ui/ColumnsChooser";
import { statusOptionsFor, NATIONALITIES, TYPES, COLS, tableKeyFor, tableColsFor, WORKER_MANDATORY_COLS } from "./workerDashboardConfig";
import { WGD_SEARCH_PLACEHOLDER, WGD_SEARCH_HELP_TEXT, WGD_SEARCH_DISABLED_TITLE } from "../workerModuleConstants";

const optionsFromChildren = (children) => React.Children.toArray(children)
    .filter((c) => c && c.type === 'option')
    .map((c) => ({
        value: String(c.props.value),
        label: Array.isArray(c.props.children) ? c.props.children.join('') : c.props.children,
    }));

const FilterSelect = ({ ctlKey, label, value, onChange, children, extraClass = '' }) => (
    <div className={ `fctl${ extraClass }` } data-mc-filter-control={ ctlKey }>
        <NewUiSelect
            variant="bare"
            label={ label }
            value={ String(value ?? '') }
            options={ optionsFromChildren(children) }
            onChange={ (v) => onChange(ctlKey, String(v)) }
        />
    </div>
);

FilterSelect.propTypes = {
    ctlKey: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func.isRequired,
    children: PropTypes.node,
    extraClass: PropTypes.string,
};

const SearchField = ({ value, enabled, onChange }) => {
    const [peek, setPeek] = useState(false);
    const [pinned, setPinned] = useState(false);
    const wrapRef = useRef(null);
    const btnRef = useRef(null);
    const help = peek || pinned;
    const closeHelp = useCallback(() => { setPinned(false); setPeek(false); }, []);
    useOutsideClick(wrapRef, closeHelp, pinned);
    const onHelpKeyDown = useCallback((e) => {
        if (e.key !== 'Escape' || !(peek || pinned)) return;
        e.preventDefault();
        closeHelp();
        btnRef.current?.focus();
    }, [peek, pinned, closeHelp]);
    return (
        <div className={ `fsearch mc-shelp-host${ enabled ? '' : ' off' }` }>
            <WgdIcon name="search" size={ 14 } />
            <input
                id="f-search"
                type="text"
                value={ enabled ? value : '' }
                placeholder={ translation(WGD_SEARCH_PLACEHOLDER) }
                aria-label={ translation(WGD_SEARCH_PLACEHOLDER) }
                disabled={ !enabled }
                aria-disabled={ !enabled }
                title={ enabled ? undefined : translation(WGD_SEARCH_DISABLED_TITLE) }
                onChange={ (e) => onChange(e.target.value) }
            />
            { /* DASH.md §9 (D27): the help control follows the search — disabled with it; the pinnable popover is a note, not a tooltip */ }
            <span
                ref={ wrapRef }
                className={ `mc-shelp-wrap${ help && enabled ? ' show' : '' }` }
                onMouseEnter={ () => { if (enabled) setPeek(true); } }
                onMouseLeave={ () => setPeek(false) }
                onKeyDown={ onHelpKeyDown }
            >
                <button
                    ref={ btnRef }
                    type="button"
                    className="mc-shelp-btn"
                    aria-label={ translation('key_jo_dash_search_help_label') }
                    aria-expanded={ help && enabled }
                    aria-pressed={ pinned }
                    aria-controls="f-search-help"
                    disabled={ !enabled }
                    onClick={ () => setPinned((p) => !p) }
                    onFocus={ () => setPeek(true) }
                    onBlur={ () => setPeek(false) }
                >
                    <WgdIcon name="help" size={ 13 } strokeWidth={ 1.8 } />
                </button>
                <span id="f-search-help" className="mc-shelp-pop" role="note">{ translation(WGD_SEARCH_HELP_TEXT) }</span>
            </span>
        </div>
    );
};

SearchField.propTypes = {
    value: PropTypes.string.isRequired,
    enabled: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
};

const DashboardFilterBar = ({
    bucket, pipeView, availView, filters, searchValue, sort,
    codeGroups, locations, checkinFilterLocations, tabStatuses, hiddenStatusIds, typeOptions, natOptions: natChoices,
    searchEnabled, showClear, isPartner,
    columnKeys, columnOrder, columnLabels, showColumns = false, onToggleColumn,
    onSearchChange, onFilterChange, onSortChange, onClear,
}) => {
    const isCommon = ['all', 'not_registered', 'hired', 'employed', 'not_active'].includes(bucket);
    const isAvailLocal = bucket === 'available' && availView === 'avail_local';

    const tableKey = tableKeyFor(bucket, pipeView, availView);
    const sortFields = tableColsFor(tableKey, { isPartner })
        .map((k) => COLS[k])
        .filter((c) => c.sort)
        .map((c) => ({ key: c.sort, label: c.label }));
    const currentSort = sortFields.some((f) => f.key === sort.key) ? sort.key : '';

    const [natMenu, setNatMenu] = useState(null);
    const natSelected = useMemo(() => new Set((filters.nats || []).map(String)), [filters.nats]);
    const natLabel = useMemo(() => {
        const ids = filters.nats || [];
        if (!ids.length) return 'All';
        if (ids.length === 1) {
            const n = natChoices.find((x) => String(x.id) === String(ids[0]));
            return n ? n.label : String(ids[0]);
        }
        return `${ ids.length } ${ translation('key_selected').toLowerCase() }`;
    }, [filters.nats, natChoices]);
    const natOptions = useMemo(() => natChoices.map((n) => ({ id: String(n.id), name: n.label })), [natChoices]);
    const handleNatToggle = useCallback((id) => {
        const next = new Set(natSelected);
        if (next.has(id)) next.delete(id); else next.add(id);
        onFilterChange('nats', [...next]);
    }, [natSelected, onFilterChange]);
    const handleNatClear = useCallback(() => {
        onFilterChange('nats', []);
        setNatMenu(null);
    }, [onFilterChange]);
    const closeNat = useCallback(() => setNatMenu(null), []);

    return (
        <div id="filters">
            <div className={ `filterbar${ isAvailLocal ? ' has-context' : '' }` }>
                <SearchField value={ searchValue } enabled={ searchEnabled } onChange={ onSearchChange } />

                <FilterSelect ctlKey="status" label={ translation('key_profile_status') } value={ filters.status } onChange={ onFilterChange }>
                    { statusOptionsFor(bucket, tabStatuses, hiddenStatusIds).map((o) => (
                        <option key={ o.value || '_all' } value={ o.value }>{ o.label }</option>
                    )) }
                </FilterSelect>

                { /* Priyanka 6 Nov: invited, not-yet-registered workers are always Overseas — no Type control there (the list request is forced to type 2) */ }
                { isCommon && bucket !== 'not_registered' && (
                    <FilterSelect ctlKey="type" label={ translation('key_type') } value={ filters.type } onChange={ onFilterChange }>
                        { typeOptions.map((t) => (
                            <option key={ t.label } value={ t.id }>{ t.id === '' ? translation('key_all') : t.label }</option>
                        )) }
                    </FilterSelect>
                ) }

                { bucket !== 'pipeline' && (
                    <label className="fctl" data-mc-filter-control="nat" data-mc-select-mode="multi">
                        <span className="lbl">{ translation('key_wkr_nationality') }</span>
                        <span className="sel">
                            <button
                                type="button"
                                className="natbtn"
                                aria-haspopup="true"
                                aria-expanded={ Boolean(natMenu) }
                                onClick={ (e) => { const rect = e.currentTarget.getBoundingClientRect(); setNatMenu((m) => (m ? null : rect)); } }
                            >
                                { natLabel }
                            </button>
                            <WgdIcon name="chev_down" size={ 11 } />
                        </span>
                    </label>
                ) }

                { /* user 10 Nov: Code Group stays on the Local VIEWS too (their initials fetch worker_type local);
                     only a Type = Local pick on the other buckets hides it (backend 401; value cleared on that pick) */ }
                { String(filters.type) !== '1' && (
                    <FilterSelect ctlKey="code" label={ translation('key_wkr_code_group') } value={ filters.code } onChange={ onFilterChange }>
                        <option value="">{ translation('key_all') }</option>
                        { codeGroups.map((c) => (
                            <option key={ c } value={ c }>{ c }</option>
                        )) }
                    </FilterSelect>
                ) }

                <FilterSelect ctlKey="sortby" label={ translation('key_jo_dash_sort') } value={ currentSort } onChange={ (k, v) => onSortChange(v) } extraClass=" mc-sort-control">
                    <option value="">{ translation('key_default') }</option>
                    { sortFields.map((f) => (
                        <option key={ f.key } value={ f.key }>{ f.label }</option>
                    )) }
                </FilterSelect>

                { isAvailLocal && (
                    <span className="mc-context-filter-row">
                        <FilterSelect ctlKey="preferred" label={ translation('key_wkr_preferred_location') } value={ filters.preferred } onChange={ onFilterChange }>
                            <option value="">{ translation('key_all') }</option>
                            { locations.map((b) => (
                                <option key={ b.id } value={ b.id }>{ b.name }</option>
                            )) }
                        </FilterSelect>
                        { /* PERM §5.7 Check In (D17): only the branches ticked on the actor's grid */ }
                        <FilterSelect ctlKey="qr" label={ translation('key_wkr_checked_in_at') } value={ filters.qr } onChange={ onFilterChange }>
                            <option value="">{ translation('key_all') }</option>
                            { checkinFilterLocations.map((b) => (
                                <option key={ b.id } value={ b.id }>{ b.name }</option>
                            )) }
                        </FilterSelect>
                    </span>
                ) }

                { /* U-0336: Choose listing columns — internal viewers with the grant, over this view's permitted columns */ }
                { showColumns && !isPartner && (
                    <ColumnsChooser order={ columnOrder } mandatory={ WORKER_MANDATORY_COLS } selected={ columnKeys } labels={ columnLabels } label={ translation('key_ins_columns') } title={ translation('key_ins_select_fields') } onToggle={ onToggleColumn } />
                ) }
                <button type="button" className="fclear" hidden={ !showClear } onClick={ onClear }>{ translation('key_ins_clear_filters') }</button>
            </div>

            { natMenu && (
                <OwnerFilterMenu
                    anchorRect={ natMenu }
                    options={ natOptions }
                    selected={ natSelected }
                    onToggle={ handleNatToggle }
                    onClear={ handleNatClear }
                    onClose={ closeNat }
                />
            ) }
        </div>
    );
};

DashboardFilterBar.propTypes = {
    /* U-0336 column chooser (internal viewers with the grant) */
    columnKeys: PropTypes.array,
    columnOrder: PropTypes.array,
    columnLabels: PropTypes.object,
    showColumns: PropTypes.bool,
    onToggleColumn: PropTypes.func,
    tabStatuses: PropTypes.array,
    bucket: PropTypes.string.isRequired,
    pipeView: PropTypes.string.isRequired,
    availView: PropTypes.string.isRequired,
    filters: PropTypes.object.isRequired,
    searchValue: PropTypes.string.isRequired,
    sort: PropTypes.object.isRequired,
    codeGroups: PropTypes.array.isRequired,
    locations: PropTypes.array.isRequired,
    checkinFilterLocations: PropTypes.array,
    hiddenStatusIds: PropTypes.array,
    typeOptions: PropTypes.array,
    natOptions: PropTypes.array,
    searchEnabled: PropTypes.bool,
    showClear: PropTypes.bool,
    isPartner: PropTypes.bool,
    onSearchChange: PropTypes.func.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    onSortChange: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
};

DashboardFilterBar.defaultProps = {
    checkinFilterLocations: [],
    hiddenStatusIds: null,
    typeOptions: TYPES,
    natOptions: NATIONALITIES,
    searchEnabled: true,
    showClear: false,
    isPartner: false,
};

export default React.memo(DashboardFilterBar);
