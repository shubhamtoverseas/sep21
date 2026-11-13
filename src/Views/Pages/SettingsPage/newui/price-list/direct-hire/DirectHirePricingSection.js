import React, { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import FilterSelect from "../../../../../../components/ui/FilterSelect";
import { fetchDirectHirePricing, saveDirectHirePricing } from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import { isAdminUser } from "../../../../../../services/commonService";
import { useConfigurationPermissions } from "../../../../../../utils/permissions/configurationPermissionUtils";
import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import usePriceListEditor from "../shared/usePriceListEditor";
import { clearedKeys } from "../shared/priceEntries";
import {
    DiscardDialog, FootBar, GridErrors, GridWrap, PageHead, PageLoading, PriceCell, ReviewDialog, SearchField, SectionMeta, clearedEffect, keepEffect,
} from "../shared/PriceEntryParts";
/* after the shared parts, as the other Price List tabs import Btn before these styles (one CSS order in the shared chunk) */
import styles from "../PriceList.module.css";
import { agencyMatches, agencyText } from "../overseas/overseasPricingConfig";
import { buildDirectHirePayload, dhKey, directHireLabel, directHireReviewGroups, savedDirectHire } from "./directHirePricingConfig";

/*
 * Price List · Direct Hire (27 Oct package, PL-S3; layout from the package's Direct Hire page): employer-sourced Overseas
 * workers, one fee per partner code, grouped by nationality, filtered by nationality or by a code or full agency name.
 */

/* The server's rule for a save: the Conditional item View key and the Direct Hire Edit key (admins pass). */
const useDirectHirePricing = () => {
    const dispatch = useDispatch();
    const data = useSelector((state) => state.priceList.directHirePricing);
    const { permissionList } = useSelector((state) => state.users);
    const permissions = useConfigurationPermissions(permissionList);
    const canEdit = useMemo(
        () => isAdminUser() || Boolean(permissions?.canViewConditionalItemPrice && permissions?.canEditConditionalDirectItemPrice),
        [permissions]
    );
    const fetch = useCallback(() => dispatch(fetchDirectHirePricing()), [dispatch]);
    const save = useCallback((body) => dispatch(saveDirectHirePricing(body)), [dispatch]);
    return usePriceListEditor({ data, canEdit, fetch, save, toSaved: savedDirectHire, toPayload: buildDirectHirePayload });
};

const DirectHirePricingSection = () => {
    const pl = useDirectHirePricing();
    const { data } = pl;
    const [query, setQuery] = useState("");
    const [nationalityId, setNationalityId] = useState("");
    const findLabel = translation("key_pl_find_agency");
    const head = (
        <PageHead title={translation("key_direct_hire")}>
            {data && (
                <>
                    {/* the admin's filter control */}
                    <FilterSelect
                        id="pl-dh-nationality"
                        label={translation("key_nationality")}
                        value={nationalityId}
                        options={[{ value: "", label: translation("key_pl_all_nationalities") }, ...data.nationalities.map((n) => ({ value: String(n.id), label: n.name }))]}
                        onChange={(value) => setNationalityId(String(value))}
                    />
                    <SearchField label={findLabel} value={query} onChange={setQuery} />
                </>
            )}
        </PageHead>
    );
    if (!data) return <PageLoading pl={pl} toolbar={head} />;

    const scope = translation("key_direct_hire");
    const keys = data.agencies.map((a) => dhKey(a.id));
    const groups = data.nationalities
        .filter((n) => !nationalityId || String(n.id) === nationalityId)
        .map((n) => ({ n, agencies: data.agencies.filter((a) => a.nationality_id === n.id && agencyMatches(a, query)) }))
        .filter((g) => g.agencies.length);
    const effects = pl.reviewOpen ? [...clearedEffect(clearedKeys(pl.changes, pl.draft, pl.saved).length), keepEffect()] : [];

    return (
        <div>
            {head}
            <p className={styles.plHelp}>{translation("key_pl_dh_help")}</p>
            <section className={styles.plSection} aria-labelledby="pl-dh">
                <div className={styles.plSecHead}>
                    <div>
                        <h3 id="pl-dh" className={styles.plSecTitle}>{translation("key_pl_dh_fees")}</h3>
                        <p className={styles.plSecSub}>{translation("key_pl_dh_sub")}</p>
                    </div>
                    <SectionMeta keys={keys} pl={pl} />
                </div>
                <GridWrap>
                    <table className={`${styles.plGrid} ${styles.plGridFit}`} aria-label={translation("key_pl_dh_fees")}>
                        <colgroup>
                            <col className={styles.plColAgency} />
                            <col className={styles.plColFee} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th scope="col" className={`${styles.plStick1} ${styles.plStickEnd}`}>{translation("key_pl_partner_agency")}</th>
                                <th scope="col" className={styles.plNum}>{translation("key_pl_dh_fee")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.length === 0 ? (
                                <tr><td colSpan={2} className={styles.plNone}>{translation("key_pl_no_agency_match")}</td></tr>
                            ) : groups.map(({ n, agencies }) => (
                                <React.Fragment key={n.id}>
                                    <tr className={styles.plBand}><th scope="colgroup" colSpan={2} className={styles.plStick1}>{n.name}</th></tr>
                                    {agencies.map((agency) => (
                                        <tr key={agency.id}>
                                            <th scope="row" className={`${styles.plStick1} ${styles.plStickEnd} ${styles.plAgCell}`}>
                                                <span className={styles.plAgName}>{agency.name}</span>
                                                <span className={styles.plAgCode}>{agency.code}</span>
                                            </th>
                                            <td>
                                                <PriceCell entryKey={dhKey(agency.id)} pl={pl} ariaLabel={interpolate(translation("key_pl_dh_fee_aria"), agencyText(agency))} />
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </GridWrap>
                <GridErrors keys={keys} pl={pl} labelOf={(key) => directHireLabel(data, key)} />
            </section>

            <FootBar pl={pl} scope={scope} />
            <ReviewDialog pl={pl} scope={scope} groups={directHireReviewGroups(data, pl.draft, pl.saved)} effects={effects} />
            <DiscardDialog pl={pl} scope={scope} />
        </div>
    );
};

export default DirectHirePricingSection;
