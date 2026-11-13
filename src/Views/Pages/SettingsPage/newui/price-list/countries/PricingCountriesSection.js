import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import useCountryGroups from "./useCountryGroups";
import { OTHER_GROUP_ID, countriesCount, currentGroups, groupIssues, nextNewGroupId, reviewRows } from "./countryGroupsConfig";
import { EXPERIENCE_COLUMNS, EXPERIENCE_POSITIONS } from "../overseas/overseasPricingConfig";
import { listOr } from "../shared/priceEntries";
import { DiscardDialog, FootBar, PageHead, PageLoading, ReviewDialog, keepEffect } from "../shared/PriceEntryParts";
/* after the shared parts, as the other Price List tabs import Btn before these styles (one CSS order in the shared chunk) */
import styles from "../PriceList.module.css";

/*
 * Price List · Pricing countries (27 Oct package, PL-S4; layout from the package's Pricing countries page). Groups of the
 * countries used in Worker Profile › Work Experience › Work Location, each country in one group at most; Other countries
 * holds every country in no group and cannot be edited. Add group, rename, add or remove countries; Review changes, then
 * Save changes. There is no delete.
 */

const RATES_PER_GROUP = EXPERIENCE_POSITIONS.length * EXPERIENCE_COLUMNS.length;
const trimmed = (name) => String(name ?? "").trim();

/* Add a country: the master's active countries not in this group; a country in another group is shown, not offered. */
const CountryPicker = ({ index, group, groups, countries, groupLabel, onPick }) => {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const listId = `pl-cl-${index}`;
    const q = query.trim().toLowerCase();
    const options = countries
        .filter((c) => c.active && !group.country_ids.includes(c.id) && (!q || c.name.toLowerCase().includes(q)))
        .map((c) => {
            const owner = groups.find((g) => g.country_ids.includes(c.id));
            return { ...c, inGroup: owner ? (trimmed(owner.name) || translation("key_pl_the_new_group")) : null };
        });
    const selectable = options.filter((o) => !o.inGroup);
    const pick = (country) => { onPick(country.id); setQuery(""); setActive(-1); };
    const onKeyDown = (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            if (!selectable.length) return;
            setActive((current) => (event.key === "ArrowDown" ? Math.min(selectable.length - 1, current + 1) : Math.max(0, current - 1)));
        } else if (event.key === "Enter") {
            event.preventDefault();
            const choice = selectable[active] || (selectable.length === 1 ? selectable[0] : null);
            if (choice) pick(choice);
        } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
        }
    };
    const activeId = active >= 0 && selectable[active] ? `${listId}-${selectable[active].id}` : undefined;
    return (
        <div className={styles.plCombo} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
            <Icon name="search" size={14} />
            <input
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-activedescendant={activeId}
                aria-label={interpolate(translation("key_pl_add_country_to"), groupLabel)}
                className={styles.plText}
                placeholder={translation("key_pl_add_country")}
                value={query}
                autoComplete="off"
                onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
            />
            {open && (
                <ul className={styles.plComboList} role="listbox" id={listId} aria-label={translation("key_pl_countries")}>
                    {options.length === 0 ? (
                        <li role="option" aria-disabled="true" aria-selected="false" className={styles.plComboNone}>{translation("key_pl_no_matching_country")}</li>
                    ) : options.map((option) => {
                        const at = selectable.indexOf(option);
                        return (
                            <li
                                key={option.id}
                                id={`${listId}-${option.id}`}
                                role="option"
                                aria-disabled={option.inGroup ? "true" : undefined}
                                aria-selected={at >= 0 && at === active}
                                className={at >= 0 && at === active ? styles.plComboActive : undefined}
                                onMouseDown={(event) => { event.preventDefault(); if (!option.inGroup) pick(option); }}
                            >
                                <span>{option.name}</span>
                                {option.inGroup && <small>{interpolate(translation("key_pl_in_group"), option.inGroup)}</small>}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

CountryPicker.propTypes = {
    index: PropTypes.number.isRequired,
    group: PropTypes.object.isRequired,
    groups: PropTypes.arrayOf(PropTypes.object).isRequired,
    countries: PropTypes.arrayOf(PropTypes.object).isRequired,
    groupLabel: PropTypes.string.isRequired,
    onPick: PropTypes.func.isRequired,
};

/* What saving means for invoices: a new group needs its rates in every schedule; moved countries use their new group's. */
const reviewEffects = (pl, changes) => {
    const { data } = pl;
    const effects = changes.filter((c) => c.kind === "new").map((c) => {
        const names = c.group.country_ids.map(pl.countryName);
        const where = names.length <= 3 ? listOr(names) : interpolate(translation("key_pl_its_countries"), names.length);
        return { key: c.key, warn: true, text: interpolate(translation("key_pl_effect_new_group"), trimmed(c.group.name), RATES_PER_GROUP, data.agency_count, where) };
    });
    const moves = changes.filter((c) => c.kind === "move");
    if (moves.length) {
        const known = (id) => id === OTHER_GROUP_ID || data.groups.some((g) => g.id === id);
        const complete = (id) => (id === OTHER_GROUP_ID ? data.other?.rates_complete : data.groups.find((g) => g.id === id)?.rates_complete);
        const gaps = moves.some((m) => known(m.toId) && complete(m.toId) === false);
        effects.push({ key: "moves", text: `${translation("key_pl_effect_moved")}${gaps ? ` ${translation("key_pl_effect_moved_gaps")}` : ""}` });
    }
    return [...effects, keepEffect()];
};

const PricingCountriesSection = () => {
    const pl = useCountryGroups();
    const { data } = pl;
    const [focusIndex, setFocusIndex] = useState(null);

    useEffect(() => {
        if (focusIndex == null) return;
        const input = document.getElementById(`pl-gn-${focusIndex}`);
        if (input) input.focus();
        setFocusIndex(null);
    }, [focusIndex]);

    /* change the draft's groups, starting from the saved ones */
    const withGroups = (fn) => pl.updateDraft((draft) => ({
        ...draft,
        groups: fn(draft.groups || pl.saved.groups.map((g) => ({ ...g, country_ids: [...g.country_ids] }))),
    }));
    const addGroup = () => {
        const count = currentGroups(pl.draft, pl.saved).length;
        withGroups((groups) => [...groups, { id: nextNewGroupId(groups), name: "", country_ids: [] }]);
        setFocusIndex(count);
    };
    const rename = (index, name) => withGroups((groups) => groups.map((g, i) => (i === index ? { ...g, name } : g)));
    const addCountry = (index, countryId) => withGroups((groups) => (groups.some((g) => g.country_ids.includes(countryId))
        ? groups
        : groups.map((g, i) => (i === index ? { ...g, country_ids: [...g.country_ids, countryId] } : g))));
    const removeCountry = (index, countryId) => withGroups((groups) => groups.map((g, i) => (i === index ? { ...g, country_ids: g.country_ids.filter((c) => c !== countryId) } : g)));

    const head = (
        <PageHead title={translation("key_pl_pricing_countries")}>
            {data && pl.canEdit && (
                <Btn variant="secondary" type="button" onClick={addGroup} disabled={pl.isSaving || Boolean(pl.blocked)}>
                    <Icon name="plus" size={14} /> {translation("key_pl_add_group")}
                </Btn>
            )}
        </PageHead>
    );
    if (!data) return <PageLoading pl={pl} toolbar={head} />;

    const scope = translation("key_pl_pricing_countries");
    const editing = pl.isEditMode;
    const groups = editing ? currentGroups(pl.draft, pl.saved) : pl.saved.groups;
    const issues = groupIssues(pl.draft, pl.saved, pl.otherName, pl.countryName).filter((issue) => !issue.req || pl.checked);
    const changes = pl.changes;
    const reviewGroups = changes.length ? [{ title: translation("key_pl_country_groups"), rows: reviewRows(changes, pl.countryName) }] : [];

    return (
        <div>
            {head}
            <p className={styles.plHelp}>{translation("key_pl_countries_help")}</p>
            {groups.map((group, index) => {
                const savedGroup = pl.saved.groups.find((g) => g.id === group.id);
                const label = trimmed(group.name) || translation("key_pl_new_group");
                const nameIssue = issues.find((issue) => issue.index === index && issue.field === "name");
                const countryIssues = issues.filter((issue) => issue.index === index && issue.field === "countries");
                const renamed = !savedGroup || savedGroup.name !== trimmed(group.name);
                const removed = savedGroup ? savedGroup.country_ids.filter((c) => !group.country_ids.includes(c)) : [];
                return (
                    <section key={group.id} className={`${styles.plSection} ${styles.plGrpCard}`} aria-label={label}>
                        <div className={styles.plSecHead}>
                            <div className={styles.plGroupTitle}>
                                {editing ? (
                                    <>
                                        <input
                                            id={`pl-gn-${index}`}
                                            type="text"
                                            className={[styles.plText, styles.plGrpName, nameIssue ? styles.plTextInvalid : "", !nameIssue && renamed ? styles.plTextChanged : ""].filter(Boolean).join(" ")}
                                            value={group.name}
                                            placeholder={translation("key_pl_group_name")}
                                            aria-label={translation("key_pl_group_name")}
                                            aria-invalid={nameIssue ? true : undefined}
                                            aria-describedby={nameIssue ? `pl-gn-err-${index}` : undefined}
                                            disabled={pl.isSaving}
                                            onChange={(event) => rename(index, event.target.value)}
                                        />
                                        {nameIssue && <span className={styles.plFieldErr} id={`pl-gn-err-${index}`} role="alert">{nameIssue.err}</span>}
                                    </>
                                ) : <h3 className={styles.plSecTitle}>{group.name}</h3>}
                            </div>
                            <div className={styles.plMeta}>{countriesCount(group.country_ids.length)}</div>
                        </div>
                        <div className={styles.plChips}>
                            {group.country_ids.map((countryId) => {
                                const name = pl.countryName(countryId);
                                const added = editing && (!savedGroup || !savedGroup.country_ids.includes(countryId));
                                return (
                                    <span key={countryId} className={[styles.plChip, editing ? "" : styles.plChipRo, added ? styles.plChipNew : ""].filter(Boolean).join(" ")}>
                                        {name}
                                        {editing && (
                                            <button
                                                type="button"
                                                aria-label={interpolate(translation("key_pl_remove_country_aria"), name, label)}
                                                disabled={pl.isSaving}
                                                onClick={() => removeCountry(index, countryId)}
                                            >
                                                <Icon name="x" size={12} />
                                            </button>
                                        )}
                                    </span>
                                );
                            })}
                            {editing && (
                                <CountryPicker
                                    index={index}
                                    group={group}
                                    groups={groups}
                                    countries={data.countries}
                                    groupLabel={label}
                                    onPick={(countryId) => addCountry(index, countryId)}
                                />
                            )}
                        </div>
                        {countryIssues.map((issue) => <p key={issue.key} className={`${styles.plFieldErr} ${styles.plFieldErrBlock}`}>{issue.err}</p>)}
                        {editing && removed.length > 0 && (
                            <p className={styles.plRemoved}>
                                {translation("key_pl_moving_to_other")}{" "}
                                {removed.map((countryId, at) => <React.Fragment key={countryId}>{at > 0 && ", "}<s>{pl.countryName(countryId)}</s></React.Fragment>)}
                            </p>
                        )}
                    </section>
                );
            })}
            <section className={`${styles.plSection} ${styles.plGrpCard}`} aria-label={pl.otherLabel}>
                <div className={`${styles.plSecHead} ${styles.plSecHeadBare}`}>
                    <div>
                        <h3 className={styles.plSecTitle}>{pl.otherLabel}</h3>
                        <p className={styles.plSecSub}>{translation("key_pl_other_countries_sub")}</p>
                    </div>
                </div>
            </section>

            <FootBar pl={pl} scope={scope} />
            <ReviewDialog pl={pl} scope={scope} groups={reviewGroups} effects={pl.reviewOpen ? reviewEffects(pl, changes) : []} />
            <DiscardDialog pl={pl} scope={scope} />
        </div>
    );
};


export default PricingCountriesSection;
