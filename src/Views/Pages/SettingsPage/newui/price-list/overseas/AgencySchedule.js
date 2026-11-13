import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import Btn from "../../../../../../components/ui/Btn";
import Modal from "../../../../../../components/ui/Modal";
import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import { fetchAgencyPricingAPI } from "../../../../../../services/settings/priceList";
import styles from "../PriceList.module.css";
import { useAgencyPricing } from "./useOverseasPricing";
import {
    EXPERIENCE_COLUMNS, EXPERIENCE_POSITIONS, NOE_KEY, agencyLabel, agencyReviewGroups, agencyScope, agencyText, bandName, copiedEntries, expKey, expKeys,
    groupCountriesText, groupName, historyGroups, outcomeName, scheduleKeys, skillKey, skillKeys,
} from "./overseasPricingConfig";
import { completeness, formatMoney, formatPercent, lessPct } from "../shared/priceEntries";
import {
    DiscardDialog, DraftStatus, FieldRow, FootBar, GridErrors, GridWrap, LeaveDialog, Missing, PageHead, PageLoading, PriceCell, ReviewDialog, Rows,
    SectionMeta, keepEffect,
} from "../shared/PriceEntryParts";
import { useFrameCrumb } from "../shared/priceListFrame";

/*
 * Price List · Overseas › one partner agency's schedule (27 Oct package, PL-S3 / PL-S4; layout from the package's agency
 * page). The nationality base and the shared Overseas % are shown read-only with a way back to Overseas to edit them;
 * the schedule itself is No Overseas Experience, the six history rates of every pricing group (Other countries included)
 * and the skill supplements. Copy pricing (requirements section 23) copies another agency's saved schedule into this
 * draft for review; nothing is saved until Save changes.
 */

const plural = (n, one, many) => interpolate(translation(n === 1 ? one : many), n);

/* What saving means for invoices (requirements section 15: configuration status, not invoice eligibility). */
const reviewEffects = (pl) => {
    const keys = scheduleKeys(pl.data);
    const before = completeness(keys, {}, pl.saved);
    const after = completeness(keys, pl.draft, pl.saved);
    const effects = [];
    if (after.complete && !before.complete) effects.push({ key: "complete", text: translation("key_pl_effect_schedule_complete") });
    else if (!after.complete) {
        effects.push({ key: "missing", text: plural(after.missing, "key_pl_effect_schedule_missing_one", "key_pl_effect_schedule_missing"), warn: true });
    }
    return [...effects, keepEffect()];
};

/* "Shared by every Filipino partner agency. Set on [Overseas]." — the link takes staff to the base. */
const SharedBaseHint = ({ nationality, onOverseas }) => {
    const [before, after = ""] = translation("key_pl_base_shared_note").split("%2$s");
    return (
        <>
            {interpolate(before, nationality)}
            <button type="button" className={styles.plLink} onClick={onOverseas}>{translation("key_overseas")}</button>
            {after}
        </>
    );
};

SharedBaseHint.propTypes = { nationality: PropTypes.string.isRequired, onOverseas: PropTypes.func.isRequired };

/* The history rates: each pricing group (Other countries last) x WE1 / earlier history x the three qualifying columns. */
const HistoryGrid = ({ pl }) => {
    const groups = historyGroups(pl.data);
    /* the second qualifying column opens Terminated: a rule before it */
    const terminatedFrom = 1;
    return (
        <GridWrap>
            <table className={`${styles.plGrid} ${styles.plGridExp}`} aria-label={translation("key_pl_experience_supplement")}>
                <colgroup>
                    <col className={styles.plC1} />
                    <col className={styles.plC2} />
                    {EXPERIENCE_COLUMNS.map((c) => <col key={`${c.outcome}-${c.band}`} />)}
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col" rowSpan={2} className={styles.plStick1}>{translation("key_pl_country_group")}</th>
                        <th scope="col" rowSpan={2} className={`${styles.plStick2} ${styles.plStickEnd}`}>{translation("key_pl_history")}</th>
                        <th scope="colgroup" className={styles.plGrp}>{translation("key_pl_finished")}</th>
                        <th scope="colgroup" colSpan={2} className={`${styles.plGrp} ${styles.plGl}`}>{translation("key_pl_terminated")}</th>
                    </tr>
                    <tr>
                        {EXPERIENCE_COLUMNS.map((c, at) => (
                            <th key={`${c.outcome}-${c.band}`} scope="col" className={[styles.plNum, styles.plSub, at === terminatedFrom ? styles.plGl : ""].filter(Boolean).join(" ")}>
                                {bandName(c.band)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {groups.map((group) => EXPERIENCE_POSITIONS.map((position, index) => (
                        <tr key={`${group.id}-${position.id}`} className={index === EXPERIENCE_POSITIONS.length - 1 ? styles.plGrpEnd : undefined}>
                            {index === 0 && (
                                <th scope="rowgroup" rowSpan={EXPERIENCE_POSITIONS.length} className={`${styles.plRg} ${styles.plStick1}`}>
                                    {groupName(group)}
                                    <small>{groupCountriesText(group)}</small>
                                </th>
                            )}
                            <th scope="row" className={`${styles.plPos} ${styles.plStick2} ${styles.plStickEnd}`}>{translation(position.labelKey)}</th>
                            {EXPERIENCE_COLUMNS.map((c, at) => (
                                <td key={`${c.outcome}-${c.band}`} className={[at === terminatedFrom ? styles.plGl : "", pl.isEditMode ? "" : styles.plRo].filter(Boolean).join(" ") || undefined}>
                                    <PriceCell
                                        entryKey={expKey(group.id, position.id, c.outcome, c.band)}
                                        pl={pl}
                                        ariaLabel={interpolate(translation("key_pl_rate_aria"), groupName(group), translation(position.longKey), outcomeName(c.outcome), bandName(c.band))}
                                    />
                                </td>
                            ))}
                        </tr>
                    )))}
                </tbody>
            </table>
        </GridWrap>
    );
};

HistoryGrid.propTypes = { pl: PropTypes.object.isRequired };

/* "Countries in no group use Other countries. Groups are set in [Pricing countries]." */
const GroupsNote = ({ onPricingCountries }) => {
    const [before, after = ""] = translation("key_pl_history_note_groups").split("%s");
    return (
        <p className={styles.plNote}>
            {before}
            {onPricingCountries
                ? <button type="button" className={styles.plLink} onClick={onPricingCountries}>{translation("key_pl_pricing_countries")}</button>
                : translation("key_pl_pricing_countries")}
            {after}
        </p>
    );
};

GroupsNote.propTypes = { onPricingCountries: PropTypes.func };

const CopyPricingDialog = ({ destination, sources, nationalities, dirty, onCopy, onClose }) => {
    const [sourceId, setSourceId] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const nationalityName = (id) => nationalities.find((n) => n.id === id)?.name || "";
    const copy = () => {
        const source = sources.find((a) => String(a.id) === sourceId);
        if (!source) {
            setError(translation("key_pl_choose_partner_code_err"));
            return;
        }
        setBusy(true);
        fetchAgencyPricingAPI(source.id)
            .then((res) => onCopy(source, res?.data?.data))
            .catch(() => { setError(translation("key_pl_copy_load_failed")); setBusy(false); });
    };
    return (
        <Modal
            title={translation("key_pl_copy_pricing")}
            width={480}
            onClose={onClose}
            busy={busy}
            footer={(
                <>
                    <span className={styles.plSpacer} />
                    <Btn variant="secondary" type="button" onClick={onClose} disabled={busy}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" type="button" onClick={copy} disabled={busy}>{interpolate(translation("key_pl_copy_to"), destination.code)}</Btn>
                </>
            )}
        >
            <div className={styles.plForm}>
                <label htmlFor="pl-copy-source">{translation("key_pl_copy_from")}</label>
                <select id="pl-copy-source" className={styles.plSelect} value={sourceId} onChange={(event) => { setSourceId(event.target.value); setError(""); }}>
                    <option value="">{translation("key_pl_choose_partner_code")}</option>
                    {sources.map((a) => <option key={a.id} value={String(a.id)}>{`${a.code} · ${nationalityName(a.nationality_id)}`}</option>)}
                </select>
                <p className={styles.plHint}>{interpolate(translation("key_pl_copy_note"), destination.code)}</p>
                {dirty && <p className={styles.plHint}>{translation("key_pl_copy_replaces_note")}</p>}
                {error && <p className={`${styles.plFieldErr} ${styles.plFieldErrBlock}`} role="alert">{error}</p>}
            </div>
        </Modal>
    );
};

CopyPricingDialog.propTypes = {
    destination: PropTypes.object.isRequired,
    sources: PropTypes.arrayOf(PropTypes.object).isRequired,
    nationalities: PropTypes.arrayOf(PropTypes.object).isRequired,
    dirty: PropTypes.bool.isRequired,
    onCopy: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

const AgencySchedule = ({ agencyId, onBack, onSwitch, onOpenPricingCountries = null }) => {
    const pl = useAgencyPricing(agencyId);
    const overview = useSelector((state) => state.priceList.overseasPricing);
    const { data } = pl;
    const [copyOpen, setCopyOpen] = useState(false);
    const [pending, setPending] = useState(null);
    const agencies = overview?.agencies || [];
    const nationalities = overview?.nationalities || [];
    const guard = (go) => (pl.changes.length ? setPending(() => go) : go());
    /* the breadcrumb (… › Overseas › Filipino · BGS): Overseas returns to the overview, asking first with unsaved changes */
    const unsaved = pl.changes.length;
    const back = useCallback(() => (unsaved ? setPending(() => onBack) : onBack()), [unsaved, onBack]);
    useFrameCrumb(data ? agencyScope(data.agency) : null, back);

    const switcher = (
        <label className={styles.plSwitch}>
            <span>{translation("key_pl_schedule")}</span>
            <select
                className={styles.plSelect}
                value={String(agencyId)}
                disabled={pl.isSaving}
                onChange={(event) => { const next = Number(event.target.value); guard(() => onSwitch(next)); }}
            >
                {nationalities.map((n) => (
                    <optgroup key={n.id} label={n.name}>
                        {agencies.filter((a) => a.nationality_id === n.id).map((a) => <option key={a.id} value={String(a.id)}>{agencyText(a)}</option>)}
                    </optgroup>
                ))}
            </select>
        </label>
    );
    const head = (
        <PageHead title={translation("key_overseas")}>
            {data && pl.canEdit && (
                <Btn variant="secondary" type="button" onClick={() => setCopyOpen(true)} disabled={pl.isSaving || Boolean(pl.blocked)}>
                    {translation("key_pl_copy_pricing_from")}
                </Btn>
            )}
            {data && switcher}
        </PageHead>
    );
    if (!data) return <PageLoading pl={pl} toolbar={head} />;

    const { agency } = data;
    const scope = agencyScope(agency);
    const replacement = lessPct(data.base_fee ?? null, data.overseas_replacement_percent ?? null);

    return (
        <div>
            {head}

            {/* the facts strip (the reference page's .facts): stays in view while the schedule scrolls */}
            <section className={styles.plFacts} aria-label={translation("key_pl_partner_agency")}>
                <div className={styles.plFact}>
                    <div className={styles.plFactKey}>{translation("key_nationality")}</div>
                    <div className={styles.plFactValue}>{agency.nationality_name}</div>
                </div>
                <div className={styles.plFact}>
                    <div className={styles.plFactKey}>{translation("key_pl_partner_agency")}</div>
                    <div className={styles.plFactValue}>{agency.name}<span className={styles.plCode}>{agency.code}</span></div>
                </div>
                <div className={`${styles.plFact} ${styles.plFactStatus}`}>
                    <div className={styles.plFactKey}>{translation("key_pl_supplements")}</div>
                    <div className={styles.plFactValue}><DraftStatus keys={scheduleKeys(data)} pl={pl} /></div>
                </div>
            </section>

            <section className={styles.plSection} aria-labelledby="pl-ag-base">
                <div className={styles.plSecHead}><h3 id="pl-ag-base" className={styles.plSecTitle}>{translation("key_pl_base_fee")}</h3></div>
                <Rows>
                    <FieldRow label={translation("key_pl_base_fee")} hint={<SharedBaseHint nationality={agency.nationality_name} onOverseas={() => guard(onBack)} />}>
                        {data.base_fee == null ? <Missing /> : <span className={styles.plVal}>{formatMoney(data.base_fee)}</span>}
                    </FieldRow>
                    <FieldRow label={translation("key_pl_replacement_discount")} hint={translation("key_pl_shared_every_nationality")}>
                        {data.overseas_replacement_percent == null ? <Missing /> : <span className={styles.plVal}>{formatPercent(data.overseas_replacement_percent)}</span>}
                    </FieldRow>
                    <FieldRow label={translation("key_pl_base_fee_replacement")}>
                        <span className={styles.plCalc}>{replacement == null ? "—" : formatMoney(replacement)}</span>
                    </FieldRow>
                </Rows>
            </section>

            <section className={styles.plSection} aria-labelledby="pl-ag-exp">
                <div className={styles.plSecHead}>
                    <div>
                        <h3 id="pl-ag-exp" className={styles.plSecTitle}>{translation("key_pl_experience_supplement")}</h3>
                        <p className={styles.plSecSub}>{translation("key_pl_experience_sub")}</p>
                    </div>
                    <SectionMeta keys={[NOE_KEY, ...expKeys(data)]} pl={pl} />
                </div>
                <Rows aboveGrid>
                    <FieldRow
                        label={translation("key_pl_no_overseas_experience")}
                        note={translation("key_pl_no_overseas_experience_note")}
                        entryKey={NOE_KEY}
                        pl={pl}
                    />
                </Rows>
                <HistoryGrid pl={pl} />
                <GridErrors keys={[NOE_KEY, ...expKeys(data)]} pl={pl} labelOf={(key) => agencyLabel(data, key)} />
                <p className={styles.plNote}>{translation("key_pl_history_note_status")}</p>
                <GroupsNote onPricingCountries={onOpenPricingCountries ? () => guard(onOpenPricingCountries) : null} />
            </section>

            <section className={styles.plSection} aria-labelledby="pl-ag-skills">
                <div className={styles.plSecHead}>
                    <div>
                        <h3 id="pl-ag-skills" className={styles.plSecTitle}>{translation("key_pl_skill_supplements")}</h3>
                        <p className={styles.plSecSub}>{translation("key_pl_skill_supplements_sub")}</p>
                    </div>
                    <SectionMeta keys={skillKeys(data)} pl={pl} unit="" />
                </div>
                <Rows>
                    {data.skills.map((skill) => <FieldRow key={skill.id} label={skill.name} entryKey={skillKey(skill.id)} pl={pl} />)}
                </Rows>
                <GridErrors keys={skillKeys(data)} pl={pl} labelOf={(key) => agencyLabel(data, key)} />
            </section>

            <FootBar pl={pl} scope={scope} />
            <ReviewDialog
                pl={pl}
                scope={scope}
                lead={pl.note?.copiedFrom ? <p className={styles.plReviewWho}>{interpolate(translation("key_pl_copied_from"), pl.note.copiedFrom.code, agency.code)}</p> : null}
                groups={agencyReviewGroups(data, pl.draft, pl.saved)}
                effects={pl.reviewOpen ? reviewEffects(pl) : []}
            />
            <DiscardDialog pl={pl} scope={scope} />
            <LeaveDialog pl={pl} scope={scope} pending={pending} onClose={() => setPending(null)} />
            {copyOpen && (
                <CopyPricingDialog
                    destination={agency}
                    sources={agencies.filter((a) => a.id !== agency.id)}
                    nationalities={nationalities}
                    dirty={pl.changes.length > 0}
                    onClose={() => setCopyOpen(false)}
                    onCopy={(source, sourceData) => {
                        pl.replaceEntries(copiedEntries(data, sourceData), { copiedFrom: { id: source.id, code: source.code } });
                        setCopyOpen(false);
                    }}
                />
            )}
        </div>
    );
};

AgencySchedule.propTypes = {
    agencyId: PropTypes.number.isRequired,
    onBack: PropTypes.func.isRequired,
    onSwitch: PropTypes.func.isRequired,
    onOpenPricingCountries: PropTypes.func,
};

export default AgencySchedule;
