import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../../../components/Icon/Icon";
import { fetchEmployers } from "../../../../redux/Slices/employer/EmployerSlice";
import { SEARCH_DEBOUNCE_MS } from "../../../../components/ReusableComponents/constants";
import debounce from "../../../../utils/debounce";
import translation from "../../../../utils/translation";
import { getInitials } from "../../../../utils/utils";
import useOutsideClick from "../../../../hooks/useOutsideClick";
import { displayName, employerCode, fullName } from "./employerDashboardColumns";
import styles from "./NewEmployerModal.module.css";
import { DEDUPE_SEARCH_PAYLOAD, EMPLOYER_RESTRICTED_ROW_CAP, EMPLOYER_SEARCH_ACCESS, EMPLOYER_SEARCH_COPY } from "./employerNewUiConstants";
import { getEmployerGrants } from "./employerGrants";

const contactLine = (row) => {
    const code = employerCode(row);
    const phone = row?.mobile_number ? `${row.country_code || ""} ${row.mobile_number}`.trim() : "";
    return [code, phone].filter(Boolean).join(" · ");
};

/* U-0348 (21 Oct package): the existing-record lookup runs on the Employer module's Search Access, not on who may open the
   dialog — Off / none disables the box; Restricted answers at most ten accessible records on one page, no browsing past it */
const DedupeSearch = ({ onOpenEmployer, matchLabel }) => {
    const dispatch = useDispatch();
    const permissionList = useSelector((state) => state.users.permissionList);
    const searchAccess = useMemo(() => getEmployerGrants(permissionList).searchAccess, [permissionList]);
    const searchEnabled = searchAccess !== EMPLOYER_SEARCH_ACCESS.NONE && searchAccess !== EMPLOYER_SEARCH_ACCESS.OFF;
    const restricted = searchAccess === EMPLOYER_SEARCH_ACCESS.RESTRICTED;
    const [query, setQuery] = useState("");
    const [results, setResults] = useState(null);
    const [open, setOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    /* audit L2: a rejected lookup is an error, never the "safe to create" all-clear */
    const [searchError, setSearchError] = useState(false);
    const wrapRef = useRef(null);
    const latestQuery = useRef("");

    const close = useCallback(() => setOpen(false), []);
    useOutsideClick(wrapRef, close, open);

    const runSearch = useMemo(() => debounce((value) => {
        if (!value) { setResults(null); setIsSearching(false); return; }
        dispatch(fetchEmployers({ search_text: value, ...(restricted ? { limit: EMPLOYER_RESTRICTED_ROW_CAP, page: 1, context: DEDUPE_SEARCH_PAYLOAD.context } : DEDUPE_SEARCH_PAYLOAD) })).then((res) => {
            if (latestQuery.current !== value) return;
            if (res?.error || res?.payload?.status === false) {
                setSearchError(true);
                setResults(null);
                setIsSearching(false);
                return;
            }
            const rows = res?.payload?.data;
            setSearchError(false);
            setResults(Array.isArray(rows) ? (restricted ? rows.slice(0, EMPLOYER_RESTRICTED_ROW_CAP) : rows) : []);
            setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS), [dispatch, restricted]);

    useEffect(() => () => runSearch.cancel(), [runSearch]);

    const handleChange = useCallback((event) => {
        const value = event.target.value;
        setQuery(value);
        latestQuery.current = value.trim();
        setOpen(true);
        setSearchError(false);
        setIsSearching(Boolean(value.trim()));
        runSearch(value.trim());
    }, [runSearch]);

    const retrySearch = useCallback(() => {
        setSearchError(false);
        setIsSearching(true);
        runSearch(latestQuery.current);
    }, [runSearch]);

    const showPopover = open && query.trim() && !isSearching && (results !== null || searchError);

    return (
        <div ref={wrapRef} className={styles.dedupeWrap}>
            <div className={styles.dedupeBox}>
                <input
                    type="search"
                    className={styles.dedupeInput}
                    placeholder={translation("key_dedupe_search_placeholder")}
                    value={query}
                    onChange={handleChange}
                    onFocus={() => setOpen(true)}
                    aria-label={translation("key_dedupe_search_placeholder")}
                    autoComplete="off"
                    disabled={!searchEnabled}
                    title={searchEnabled ? undefined : EMPLOYER_SEARCH_COPY.disabledTitle}
                    data-mc-search-access={searchAccess || "none"}
                />
                <Icon name="search" size={12} className={styles.dedupeIcon} />
            </div>

            {showPopover && (
                <div className={styles.dedupePop} role="region" aria-live="polite">
                    {searchError ? (
                        <div className={styles.dedupeEmpty} role="alert">
                            <div className={styles.dedupeEmptyTitle}>{translation("key_couldnt_load_this_view")}</div>
                            <button type="button" className={styles.dedupeOpen} onClick={retrySearch}>{translation("key_retry")}</button>
                        </div>
                    ) : results.length > 0 ? (
                        <>
                            <div className={styles.dedupeHead}>
                                {results.length} {translation("key_possible_matches")}
                            </div>
                            {results.map((row) => (
                                <div
                                    key={row.employer_id ?? row.id}
                                    role="button"
                                    tabIndex={0}
                                    className={styles.dedupeRow}
                                    onClick={() => { setOpen(false); onOpenEmployer(row); }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            setOpen(false);
                                            onOpenEmployer(row);
                                        }
                                    }}
                                >
                                    <span className={styles.dedupeAvatar} aria-hidden="true">{getInitials(fullName(row))}</span>
                                    <span className={styles.dedupeMeta}>
                                        <span className={styles.dedupeName}>{displayName(row)}</span>
                                        <span className={styles.dedupeSub}>{contactLine(row)}</span>
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.dedupeOpen}
                                        onClick={(event) => { event.stopPropagation(); onOpenEmployer(row); }}
                                    >
                                        {matchLabel || translation("key_open")} →
                                    </button>
                                </div>
                            ))}
                            {restricted && results.length >= EMPLOYER_RESTRICTED_ROW_CAP && <div className={styles.dedupeFoot} data-mc-capped="">{EMPLOYER_SEARCH_COPY.tooMany}</div>}
                            <div className={styles.dedupeFoot}>{translation("key_not_the_same_person")}</div>
                        </>
                    ) : (
                        <div className={styles.dedupeEmpty}>
                            <div className={styles.dedupeEmptyTitle}>{translation("key_no_existing_record_matches")}</div>
                            <div className={styles.dedupeEmptyHint}>{translation("key_no_existing_record_matches_hint")}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

DedupeSearch.propTypes = {
    onOpenEmployer: PropTypes.func.isRequired,
    matchLabel: PropTypes.string,
};

export default React.memo(DedupeSearch);
