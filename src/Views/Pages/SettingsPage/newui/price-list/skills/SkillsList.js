import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Btn from "../../../../../../components/ui/Btn";
import { fetchPriceListSkills } from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import translation from "../../../../../../utils/translation";
import shared from "../../settings-newui.module.css";
import { PageHead } from "../shared/PriceEntryParts";
import { useFrameLink } from "../shared/priceListFrame";
import { PRICE_LIST_PAGE } from "../../settingsNewUiConstants";
/* after the shared parts, as the other Price List pages import Btn before these styles (one CSS order in the shared chunk) */
import styles from "../PriceList.module.css";

/*
 * Price List · Skills (27 Oct package, PL-S3; requirements section 11; layout from the package's Skills page, PL-UI3): the
 * supported profile-linked Overseas supplements, read-only — no Add skill action. Their amounts are set on each agency's schedule (Overseas). Another skill,
 * or one missing from the profile, is a Fixed Item.
 */

/* Worker Profile fields a skill can be linked to (price_skills.profile_field). */
const PROFILE_FIELD_LABEL = Object.freeze({ special_course: "key_special_course" });

const SkillsList = () => {
    const dispatch = useDispatch();
    const onOpenOverseas = useFrameLink(PRICE_LIST_PAGE.OVERSEAS);
    const onOpenFixedItems = useFrameLink(PRICE_LIST_PAGE.FIXED_ITEMS);
    const data = useSelector((state) => state.priceList.priceListSkills);
    const [loadError, setLoadError] = useState("");

    const load = () => {
        setLoadError("");
        dispatch(fetchPriceListSkills()).then((res) => {
            if (res?.error) setLoadError(res?.payload?.data?.data?.message || translation("key_pl_load_failed"));
        });
    };
    useEffect(load, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

    const toolbar = <PageHead title={translation("key_skills")} />;
    if (!data) {
        return (
            <div>
                {toolbar}
                {loadError ? (
                    <div className={styles.emptyState} role="alert">
                        <p>{loadError}</p>
                        <Btn variant="secondary" type="button" onClick={load}>{translation("key_retry")}</Btn>
                    </div>
                ) : <div className={shared.loadingState}>{translation("key_loading")}…</div>}
            </div>
        );
    }

    const [before, after = ""] = translation("key_pl_skills_other_note").split("%s");
    return (
        <div>
            {toolbar}
            <p className={styles.plHelp}>{translation("key_pl_skills_help")}</p>
            <section className={styles.plSection} aria-label={translation("key_skills")}>
                <div className={styles.plListWrap}>
                    <table className={`${styles.plList} ${styles.plStack}`} aria-label={translation("key_skills")}>
                        <thead>
                            <tr>
                                <th scope="col">{translation("key_pl_skill")}</th>
                                <th scope="col">{translation("key_pl_worker_profile_field")}</th>
                                <th scope="col">{translation("key_pl_required_value")}</th>
                                <th scope="col">{translation("key_pl_prices")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.skills.map((skill) => (
                                <tr key={skill.id}>
                                    <th scope="row">{skill.name}</th>
                                    <td>{PROFILE_FIELD_LABEL[skill.profile_field] ? translation(PROFILE_FIELD_LABEL[skill.profile_field]) : skill.profile_field}</td>
                                    <td>{skill.profile_value?.name}</td>
                                    <td>
                                        {onOpenOverseas
                                            ? <button type="button" className={styles.plLink} onClick={onOpenOverseas}>{translation("key_pl_agency_pricing")}</button>
                                            : translation("key_pl_agency_pricing")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <p className={styles.plHelp}>
                {before}
                {onOpenFixedItems
                    ? <button type="button" className={styles.plLink} onClick={onOpenFixedItems}>{translation("key_fixed_items")}</button>
                    : translation("key_fixed_items")}
                {after}
            </p>
        </div>
    );
};

export default SkillsList;
