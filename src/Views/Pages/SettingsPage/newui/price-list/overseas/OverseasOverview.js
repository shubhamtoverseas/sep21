import React, { useState } from "react";
import PropTypes from "prop-types";
import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import { useOverseasPricing } from "./useOverseasPricing";
import { OS_PERCENT_KEY, agencyMatches, baseKey, overseasLabel, overseasReviewGroups } from "./overseasPricingConfig";
import { clearedKeys, currentValue, formatMoney, lessPct, listAnd } from "../shared/priceEntries";
import {
    DiscardDialog, FieldRow, FootBar, GridErrors, GridWrap, LeaveDialog, PageHead, PageLoading, PriceCell, ReviewDialog, Rows, SearchField, SectionMeta,
    StatusTag, clearedEffect, keepEffect,
} from "../shared/PriceEntryParts";
/* after the shared parts, as the other Price List tabs import Btn before these styles (one CSS order in the shared chunk) */
import styles from "../PriceList.module.css";

/*
 * Price List · Overseas (27 Oct package, PL-S3; layout from the package's Overseas page). One base fee per nationality,
 * shared by its partner agencies, its calculated base for a Replacement, and the one Overseas replacement discount.
 * Each agency code opens that agency's schedule; its Supplements status is the schedule's configuration completeness.
 * The search finds a code or a full agency name.
 */

/* What saving means for invoices: a changed % (with one worked example), changed bases, cleared entries, created invoices. */
const reviewEffects = (pl) => {
    const { data } = pl;
    const effects = [];
    if (pl.changes.includes(OS_PERCENT_KEY)) {
        const first = data.nationalities[0];
        const key = first ? baseKey(first.id) : null;
        const before = key ? lessPct(pl.saved[key] ?? null, pl.saved[OS_PERCENT_KEY] ?? null) : null;
        const after = key ? lessPct(currentValue(key, pl.draft, pl.saved) ?? null, currentValue(OS_PERCENT_KEY, pl.draft, pl.saved) ?? null) : null;
        const example = before != null && after != null
            ? ` ${interpolate(translation("key_pl_effect_example"), first.name, formatMoney(before), formatMoney(after))}`
            : "";
        effects.push({ key: "rate", text: `${translation("key_pl_effect_os_rate")}${example}` });
    }
    data.nationalities.forEach((n) => {
        if (!pl.changes.includes(baseKey(n.id))) return;
        const codes = data.agencies.filter((a) => a.nationality_id === n.id).map((a) => a.code);
        if (codes.length) effects.push({ key: `base-${n.id}`, text: interpolate(translation("key_pl_effect_os_base"), n.name, listAnd(codes)) });
    });
    return [...effects, ...clearedEffect(clearedKeys(pl.changes, pl.draft, pl.saved).length), keepEffect()];
};

const OverseasOverview = ({ onOpenAgency }) => {
    const pl = useOverseasPricing();
    const { data } = pl;
    const [query, setQuery] = useState("");
    const [pending, setPending] = useState(null);
    const findLabel = translation("key_pl_find_agency");
    const head = (
        <PageHead title={translation("key_overseas")}>
            {data && <SearchField label={findLabel} value={query} onChange={setQuery} />}
        </PageHead>
    );
    if (!data) return <PageLoading pl={pl} toolbar={head} />;

    const scope = translation("key_overseas");
    const baseKeys = data.nationalities.map((n) => baseKey(n.id));
    const pct = currentValue(OS_PERCENT_KEY, pl.draft, pl.saved);
    const groups = data.nationalities
        .map((n) => ({ n, agencies: data.agencies.filter((a) => a.nationality_id === n.id && agencyMatches(a, query)) }))
        .filter((g) => g.agencies.length);
    const open = (agencyId) => (pl.changes.length ? setPending(() => () => onOpenAgency(agencyId)) : onOpenAgency(agencyId));

    return (
        <div>
            {head}
            <p className={styles.plHelp}>{translation("key_pl_os_help")}</p>
            <section className={styles.plSection} aria-labelledby="pl-os-base">
                <div className={styles.plSecHead}>
                    <div>
                        <h3 id="pl-os-base" className={styles.plSecTitle}>{translation("key_pl_base_fees")}</h3>
                        <p className={styles.plSecSub}>{translation("key_pl_os_base_sub")}</p>
                    </div>
                    <SectionMeta keys={[...baseKeys, OS_PERCENT_KEY]} pl={pl} />
                </div>
                <Rows aboveGrid>
                    <FieldRow
                        label={translation("key_pl_overseas_replacement_discount")}
                        note={translation("key_pl_one_rate_nationality")}
                        hint={translation("key_pl_applied_once_note")}
                        entryKey={OS_PERCENT_KEY}
                        pl={pl}
                    />
                </Rows>
                <GridWrap>
                    <table className={`${styles.plGrid} ${styles.plGridOb}`} aria-label={`${scope} · ${translation("key_pl_base_fees")}`}>
                        <colgroup>
                            <col className={styles.plObNat} />
                            <col className={styles.plObBase} />
                            <col className={styles.plObRepl} />
                            <col className={styles.plObAg} />
                            <col />
                        </colgroup>
                        <thead>
                            <tr>
                                <th scope="col">{translation("key_nationality")}</th>
                                <th scope="col" className={styles.plNum}>{translation("key_pl_base_fee")}</th>
                                <th scope="col" className={styles.plNum}>{translation("key_pl_base_for_replacement")}</th>
                                <th scope="col" className={styles.plGl}>{translation("key_pl_partner_agency")}</th>
                                <th scope="col">{translation("key_pl_supplements")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.length === 0 ? (
                                <tr><td colSpan={5} className={styles.plNone}>{interpolate(translation("key_pl_no_agency_matches"), query.trim())}</td></tr>
                            ) : groups.map(({ n, agencies }, at) => agencies.map((agency, index) => {
                                const replacement = lessPct(currentValue(baseKey(n.id), pl.draft, pl.saved) ?? null, pct ?? null);
                                /* the nationality's base spans its agencies; a rule closes each nationality but the last */
                                const lastGroup = at === groups.length - 1;
                                const end = lastGroup ? "" : styles.plRgEnd;
                                return (
                                    <tr key={agency.id} className={index === agencies.length - 1 && !lastGroup ? styles.plGrpEnd : undefined}>
                                        {index === 0 && (
                                            <>
                                                <th scope="rowgroup" rowSpan={agencies.length} className={`${styles.plRg} ${end}`}>{n.name}</th>
                                                <td rowSpan={agencies.length} className={`${styles.plObBaseCell} ${end}`}>
                                                    <PriceCell entryKey={baseKey(n.id)} pl={pl} ariaLabel={interpolate(translation("key_pl_os_base_aria"), n.name)} />
                                                </td>
                                                <td rowSpan={agencies.length} className={`${styles.plObReplCell} ${end}`}>
                                                    <span className={styles.plCalc}>{replacement == null ? "—" : formatMoney(replacement)}</span>
                                                </td>
                                            </>
                                        )}
                                        <td className={`${styles.plObText} ${styles.plGl}`}>
                                            <button
                                                type="button"
                                                className={`${styles.plLink} ${styles.plCodeLink}`}
                                                aria-label={interpolate(translation("key_pl_open_pricing_aria"), agency.code, agency.name)}
                                                onClick={() => open(agency.id)}
                                            >
                                                {agency.code}
                                            </button>
                                        </td>
                                        <td className={styles.plObText}><StatusTag missing={agency.missing} /></td>
                                    </tr>
                                );
                            }))}
                        </tbody>
                    </table>
                </GridWrap>
                <GridErrors keys={baseKeys} pl={pl} labelOf={(key) => overseasLabel(data, key)} />
            </section>

            <FootBar pl={pl} scope={scope} />
            <ReviewDialog pl={pl} scope={scope} groups={overseasReviewGroups(data, pl.draft, pl.saved)} effects={pl.reviewOpen ? reviewEffects(pl) : []} />
            <DiscardDialog pl={pl} scope={scope} />
            <LeaveDialog pl={pl} scope={scope} pending={pending} onClose={() => setPending(null)} />
        </div>
    );
};

OverseasOverview.propTypes = { onOpenAgency: PropTypes.func.isRequired };

export default OverseasOverview;
