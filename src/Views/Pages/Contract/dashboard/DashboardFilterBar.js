import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import FilterSelect from "../../../../components/ui/FilterSelect";
import useOutsideClick from "../../../../hooks/useOutsideClick";
import translation from "../../../../utils/translation";

export const BRANCH_MODE = Object.freeze({ MENU: "menu", FIXED: "fixed", HIDDEN: "hidden" });
const ALL = "";
const HELP_ID = "cd-search-help-pop";

/* Search help (DASH §9): hover or focus shows it, a click pins it, Escape closes it and returns focus to the button */
const SearchField = ({ value, enabled, onChange }) => {
    const [peek, setPeek] = useState(false);
    const [pinned, setPinned] = useState(false);
    const wrapRef = useRef(null);
    const btnRef = useRef(null);
    const show = peek || pinned;
    const closeHelp = useCallback(() => { setPinned(false); setPeek(false); }, []);
    useOutsideClick(wrapRef, closeHelp, pinned);
    const onKeyDown = useCallback((event) => {
        if (event.key !== "Escape" || !(peek || pinned)) return;
        event.preventDefault();
        closeHelp();
        btnRef.current?.focus();
    }, [peek, pinned, closeHelp]);
    return (
        <div className={ `fsearch${ enabled ? "" : " off" }` }>
            <Icon name="search" size={ 14 } />
            <input
                id="f-search"
                type="text"
                value={ enabled ? value : "" }
                placeholder={ translation("key_search_workers_contracts_invoices") }
                aria-label={ translation("key_cd_search_processing_records") }
                aria-describedby={ HELP_ID }
                disabled={ !enabled }
                aria-disabled={ !enabled }
                title={ enabled ? undefined : translation("key_cd_search_disabled") }
                onChange={ (event) => onChange(event.target.value) }
            />
            <span
                ref={ wrapRef }
                className={ `fhelp-wrap${ show ? " show" : "" }${ pinned ? " pinned" : "" }` }
                data-help-wrap=""
                onMouseEnter={ () => setPeek(true) }
                onMouseLeave={ () => setPeek(false) }
                onKeyDown={ onKeyDown }
            >
                <button
                    ref={ btnRef }
                    type="button"
                    className="fhelp"
                    aria-label={ translation("key_cd_search_help") }
                    aria-expanded={ show }
                    aria-pressed={ pinned }
                    aria-controls={ HELP_ID }
                    onClick={ () => setPinned((p) => !p) }
                    onFocus={ () => setPeek(true) }
                    onBlur={ () => setPeek(false) }
                >
                    <Icon name="help" size={ 13 } strokeWidth={ 1.9 } />
                </button>
                <div className="fhelp-pop" id={ HELP_ID } role="tooltip">{ translation("key_cd_search_help_text") }</div>
            </span>
        </div>
    );
};
SearchField.propTypes = { value: PropTypes.string.isRequired, enabled: PropTypes.bool.isRequired, onChange: PropTypes.func.isRequired };

const withAll = (options) => [{ value: ALL, label: translation("key_all") }, ...options];

/**
 * The filter card (prototype filterbarHTML): search + help · Contract Category · Nationality · Code Group · Branch
 * (multi-select of the exposed branches, a fixed single branch, or no control) · Columns · Clear filters (always on).
 */
const DashboardFilterBar = ({
    search, searchEnabled, onSearch,
    filters, categoryOptions, nationalityVisible = true, nationalityOptions, codeOptions, onFilter,
    branch, onBranch,
    visibleCount, totalCount, columnsOpen, onColumnsOpen,
    onClear,
}) => (
    <div className="fcard" data-filters="">
        <div className="frow" data-frow="1">
            <SearchField value={ search } enabled={ searchEnabled } onChange={ onSearch } />
            <FilterSelect id="cd-f-category" label={ translation("key_contract_category") } value={ filters.contract_category } options={ withAll(categoryOptions) } onChange={ (v) => onFilter("contract_category", v) } menuWidth={ 220 } />
            { nationalityVisible && (
                <FilterSelect id="cd-f-nationality" label={ translation("key_nationality") } value={ filters.nationality } options={ withAll(nationalityOptions) } onChange={ (v) => onFilter("nationality", v) } />
            ) }
            <FilterSelect id="cd-f-code" label={ translation("key_code_group") } value={ filters.code_group } options={ withAll(codeOptions) } onChange={ (v) => onFilter("code_group", v) } />
            { branch.mode === BRANCH_MODE.MENU && (
                <FilterSelect id="cd-f-branch" label={ translation("key_branch") } value={ branch.selected } options={ withAll(branch.options) } onChange={ onBranch } multiple menuWidth={ 220 } />
            ) }
            { branch.mode === BRANCH_MODE.FIXED && (
                <span className="fwrap">
                    <button type="button" className="ftrig fixed" disabled data-fixed-option={ branch.fixedLabel } title={ `${ translation("key_branch") } · ${ branch.fixedLabel }` }>
                        <span className="flbl">{ translation("key_branch") } ·</span><span className="fval">{ branch.fixedLabel }</span>
                    </button>
                </span>
            ) }
            <span className="fwrap">
                <button
                    type="button"
                    className={ `ftrig fcols${ columnsOpen ? " on" : "" }` }
                    aria-haspopup="true"
                    aria-expanded={ columnsOpen }
                    title={ `${ translation("key_columns") } · ${ visibleCount } ${ translation("key_of") } ${ totalCount }` }
                    onClick={ (event) => onColumnsOpen(event.currentTarget) }
                >
                    <Icon name="columns" size={ 13 } />
                    <span className="fcolslbl">{ translation("key_columns") }</span><span className="kbd">{ visibleCount }</span>
                </button>
            </span>
            <button type="button" className="fclear" onClick={ onClear }>{ translation("key_clear_filters") }</button>
        </div>
    </div>
);

const optionShape = PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, label: PropTypes.string.isRequired }));
DashboardFilterBar.propTypes = {
    search: PropTypes.string.isRequired,
    searchEnabled: PropTypes.bool.isRequired,
    onSearch: PropTypes.func.isRequired,
    filters: PropTypes.shape({ contract_category: PropTypes.string, nationality: PropTypes.string, code_group: PropTypes.string }).isRequired,
    categoryOptions: optionShape.isRequired,
    /* ClickUp 14ykpqtz7y7: Groups 2 & 4 carry no Nationality filter */
    nationalityVisible: PropTypes.bool,
    nationalityOptions: optionShape.isRequired,
    codeOptions: optionShape.isRequired,
    onFilter: PropTypes.func.isRequired,
    branch: PropTypes.shape({ mode: PropTypes.oneOf(Object.values(BRANCH_MODE)).isRequired, options: optionShape, selected: PropTypes.arrayOf(PropTypes.string), fixedLabel: PropTypes.string }).isRequired,
    onBranch: PropTypes.func.isRequired,
    visibleCount: PropTypes.number.isRequired,
    totalCount: PropTypes.number.isRequired,
    columnsOpen: PropTypes.bool.isRequired,
    onColumnsOpen: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
};

export default React.memo(DashboardFilterBar);
