import React from "react";
import PropTypes from "prop-types";
import { doopDays } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import { headingCase } from "../../../../../../utils/utils";

const ReadOnlySection = ({ title, rows }) => (
    <section className={styles.sectionCard}>
        <div className={styles.sectionCardHead}>
            <h2 className={shared.sectionEyebrow}>{title}</h2>
        </div>
        {rows.map((row) => (
            <div className={styles.infoRow} key={row.label}>
                <span className={styles.infoLabel}>{row.label}</span>
                <span className={styles.infoValue} title={row.value || ""}>{row.value || translation("key_na")}</span>
            </div>
        ))}
    </section>
);
ReadOnlySection.propTypes = {
    title: PropTypes.string.isRequired,
    rows: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) })).isRequired,
};

/** Ports SalaryAndBenefitsOfMyProfile.js (read-only). */
const ProfileSalaryTab = ({ profileData }) => (
    <div className={styles.sectionGrid}>
        <ReadOnlySection
            title={headingCase(translation("key_salary_information"))}
            rows={[
                { label: translation("key_salary_basis"), value: profileData?.salary_basis },
                { label: translation("key_salary_amount"), value: profileData?.salary_amount },
                { label: translation("key_mpf_contribution"), value: profileData?.salary_mpf_contri_type },
                { label: translation("key_mpf_contribution_amount_per_month"), value: profileData?.salary_mpf_contri_amount },
                { label: translation("key_mpf_contribution_rate"), value: profileData?.salary_mpf_contri_rate },
            ]}
        />
        <ReadOnlySection
            title={headingCase(translation("key_benefits_entitled"))}
            rows={[
                { label: translation("key_overtime_pay"), value: profileData?.overtime_pay },
                { label: translation("key_doop"), value: profileData?.doop_name ? doopDays(profileData.doop_name) : "" },
                { label: translation("key_leave_policy"), value: profileData?.leave_policy_name },
                { label: translation("key_holiday_list"), value: profileData?.list_name },
            ]}
        />
    </div>
);

ProfileSalaryTab.propTypes = {
    profileData: PropTypes.object,
};

export default ProfileSalaryTab;
