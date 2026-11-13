import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import useLocalPricing from "./useLocalPricing";
import { FEE_KINDS, LOCAL_SERVICES, PERCENT_KEY, cellKey, entryLabel, reviewGroups, serviceKey, serviceName } from "./localPricingConfig";
import { clearedKeys, currentValue, formatMoney, formatNumber, formatPercent, lessPct } from "../shared/priceEntries";
import {
    DiscardDialog, FieldRow, FootBar, GridErrors, GridWrap, PageHead, PageLoading, PriceCell, ReviewDialog, Rows, SectionMeta, clearedEffect, keepEffect,
} from "../shared/PriceEntryParts";
/* after the shared parts, as the other Price List tabs import Btn before these styles (one CSS order in the shared chunk) */
import styles from "../PriceList.module.css";

/*
 * Price List · Local (27 Oct package; layout from the package's Local page). One Review changes / Save for the page.
 * Base fees (PL-S1): Standard and Driver grids by nationality and category; each category's Replacement row is calculated
 * from its base and the one Local replacement discount, read-only.
 * Local Transfer and Renewal (PL-S2): Standard and Driver grids by nationality and service; their own fees, with no New /
 * Replacement, replacement discount or supplements.
 * "Missing" = not entered; 0 shows as 0. Each grid's heading (Standard / Driver) and column names stay in view while its
 * rows scroll (PL-UI2).
 */

const KIND_LABEL = { [FEE_KINDS.STANDARD]: "key_pl_standard", [FEE_KINDS.DRIVER]: "key_pl_driver" };

const BaseGrid = ({ kind, pl }) => {
    const { data } = pl;
    const kindText = translation(KIND_LABEL[kind]);
    const pct = currentValue(PERCENT_KEY, pl.draft, pl.saved);
    const lessText = pct == null ? translation("key_pl_base_less_discount") : interpolate(translation("key_pl_base_less"), formatPercent(pct));
    return (
        <GridWrap stickyHead style={{ "--pl-n": data.nationalities.length }}>
            <table className={`${styles.plGrid} ${styles.plGridLocal}`} aria-label={`${translation("key_pl_base_fees")} · ${kindText}`}>
                <colgroup>
                    <col className={styles.plC1} />
                    <col className={styles.plC2} />
                    {data.nationalities.map((n) => <col key={n.id} />)}
                </colgroup>
                <thead>
                    <tr className={styles.plGhRow}><th colSpan={2 + data.nationalities.length} scope="colgroup"><span className={styles.plGhTitle}>{kindText}</span></th></tr>
                    <tr>
                        <th scope="col" className={styles.plStick1}>{translation("key_contract_category")}</th>
                        <th scope="col" className={`${styles.plStick2} ${styles.plStickEnd}`}>{translation("key_type_internal")}</th>
                        {data.nationalities.map((n) => <th key={n.id} scope="col" className={styles.plNum}>{n.name}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.categories.map((category) => (
                        <React.Fragment key={category.id}>
                            <tr>
                                <th scope="rowgroup" rowSpan={2} className={`${styles.plStick1} ${styles.plRg}`}>{category.name}</th>
                                <th scope="row" className={`${styles.plPos} ${styles.plStick2} ${styles.plStickEnd}`}>{translation("key_new")}</th>
                                {data.nationalities.map((n) => (
                                    <td key={n.id}>
                                        <PriceCell
                                            entryKey={cellKey(category.id, n.id, kind)}
                                            pl={pl}
                                            ariaLabel={interpolate(translation("key_pl_base_fee_aria"), kindText, category.name, n.name)}
                                        />
                                    </td>
                                ))}
                            </tr>
                            {/* calculated from the base and the Local %: read-only, on a tinted row */}
                            <tr className={`${styles.plCalcRow} ${styles.plGrpEnd}`}>
                                <th scope="row" className={`${styles.plPos} ${styles.plStick2} ${styles.plStickEnd}`}>
                                    {translation("key_replacement")}
                                    <small>{lessText}</small>
                                </th>
                                {data.nationalities.map((n) => {
                                    const result = lessPct(currentValue(cellKey(category.id, n.id, kind), pl.draft, pl.saved) ?? null, pct ?? null);
                                    return (
                                        <td key={n.id} className={styles.plRo}>
                                            <span className={styles.plCalc}>{result == null ? "—" : formatNumber(result)}</span>
                                        </td>
                                    );
                                })}
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </GridWrap>
    );
};

BaseGrid.propTypes = { kind: PropTypes.string.isRequired, pl: PropTypes.object.isRequired };

const ServiceGrid = ({ kind, services, pl }) => {
    const { data } = pl;
    const kindText = translation(KIND_LABEL[kind]);
    return (
        <GridWrap stickyHead style={{ "--pl-n": data.nationalities.length }}>
            <table className={`${styles.plGrid} ${styles.plGridLocal}`} aria-label={`${translation("key_pl_local_services")} · ${kindText}`}>
                <colgroup>
                    <col className={styles.plC1} />
                    <col className={styles.plC2} />
                    {data.nationalities.map((n) => <col key={n.id} />)}
                </colgroup>
                <thead>
                    <tr className={styles.plGhRow}><th colSpan={2 + data.nationalities.length} scope="colgroup"><span className={styles.plGhTitle}>{kindText}</span></th></tr>
                    <tr>
                        <th scope="col" colSpan={2} className={`${styles.plStick1} ${styles.plStickEnd}`}>{translation("key_pl_service")}</th>
                        {data.nationalities.map((n) => <th key={n.id} scope="col" className={styles.plNum}>{n.name}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {services.map((service) => {
                        const name = serviceName(service.id);
                        return (
                            <tr key={service.id}>
                                <th scope="row" colSpan={2} className={`${styles.plStick1} ${styles.plStickEnd}`}>{name}</th>
                                {data.nationalities.map((n) => (
                                    <td key={n.id}>
                                        <PriceCell
                                            entryKey={serviceKey(service.id, n.id, kind)}
                                            pl={pl}
                                            ariaLabel={interpolate(translation("key_pl_service_fee_aria"), kindText, name, n.name)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </GridWrap>
    );
};

ServiceGrid.propTypes = { kind: PropTypes.string.isRequired, services: PropTypes.arrayOf(PropTypes.object).isRequired, pl: PropTypes.object.isRequired };

/* What saving means for invoices: a changed % (with one worked example), entries that become missing, and created invoices. */
const reviewEffects = (pl) => {
    const { data } = pl;
    const effects = [];
    if (pl.changes.includes(PERCENT_KEY)) {
        const first = data.cells[0];
        const exampleKey = first ? cellKey(first.contract_category_id, first.nationality_id, FEE_KINDS.STANDARD) : null;
        const before = exampleKey ? lessPct(pl.saved[exampleKey] ?? null, pl.saved[PERCENT_KEY] ?? null) : null;
        const after = exampleKey ? lessPct(currentValue(exampleKey, pl.draft, pl.saved) ?? null, currentValue(PERCENT_KEY, pl.draft, pl.saved) ?? null) : null;
        const example = before != null && after != null
            ? ` ${interpolate(translation("key_pl_effect_example"), entryLabel(data, exampleKey), formatMoney(before), formatMoney(after))}`
            : "";
        effects.push({ key: "rate", text: `${translation("key_pl_effect_local_rate")}${example}` });
    }
    return [...effects, ...clearedEffect(clearedKeys(pl.changes, pl.draft, pl.saved).length), keepEffect()];
};

const LocalPricingSection = () => {
    const pl = useLocalPricing();
    const { data } = pl;
    const head = <PageHead title={translation("key_local")} />;
    if (!data) return <PageLoading pl={pl} toolbar={head} />;

    const baseKeys = data.cells.flatMap((c) => [cellKey(c.contract_category_id, c.nationality_id, FEE_KINDS.STANDARD), cellKey(c.contract_category_id, c.nationality_id, FEE_KINDS.DRIVER)]);
    const services = LOCAL_SERVICES.filter((s) => (data.service_cells || []).some((c) => c.service === s.id));
    const serviceKeys = services.flatMap((s) => data.nationalities.flatMap((n) => [serviceKey(s.id, n.id, FEE_KINDS.STANDARD), serviceKey(s.id, n.id, FEE_KINDS.DRIVER)]));
    const labelOf = (key) => entryLabel(data, key);
    const scope = translation("key_local");

    return (
        <div>
            {head}
            <section className={styles.plSection} aria-labelledby="pl-local-base">
                <div className={styles.plSecHead}>
                    <div>
                        <h3 id="pl-local-base" className={styles.plSecTitle}>{translation("key_pl_base_fees")}</h3>
                        <p className={styles.plSecSub}>{translation("key_pl_base_fees_sub")}</p>
                    </div>
                    <SectionMeta keys={[PERCENT_KEY, ...baseKeys]} pl={pl} />
                </div>
                <Rows aboveGrid>
                    <FieldRow
                        label={translation("key_pl_local_replacement_discount")}
                        note={translation("key_pl_one_rate_note")}
                        hint={translation("key_pl_applied_once_note")}
                        entryKey={PERCENT_KEY}
                        pl={pl}
                    />
                </Rows>
                <BaseGrid kind={FEE_KINDS.STANDARD} pl={pl} />
                <BaseGrid kind={FEE_KINDS.DRIVER} pl={pl} />
                <GridErrors keys={baseKeys} pl={pl} labelOf={labelOf} />
            </section>

            {services.length > 0 && (
                <section className={styles.plSection} aria-labelledby="pl-local-services">
                    <div className={styles.plSecHead}>
                        <div>
                            <h3 id="pl-local-services" className={styles.plSecTitle}>{translation("key_pl_local_services")}</h3>
                            <p className={styles.plSecSub}>{translation("key_pl_local_services_sub")}</p>
                        </div>
                        <SectionMeta keys={serviceKeys} pl={pl} />
                    </div>
                    <ServiceGrid kind={FEE_KINDS.STANDARD} services={services} pl={pl} />
                    <ServiceGrid kind={FEE_KINDS.DRIVER} services={services} pl={pl} />
                    <GridErrors keys={serviceKeys} pl={pl} labelOf={labelOf} />
                </section>
            )}

            <FootBar pl={pl} scope={scope} />
            <ReviewDialog pl={pl} scope={scope} groups={reviewGroups(data, pl.draft, pl.saved)} effects={pl.reviewOpen ? reviewEffects(pl) : []} />
            <DiscardDialog pl={pl} scope={scope} />
        </div>
    );
};

export default LocalPricingSection;
