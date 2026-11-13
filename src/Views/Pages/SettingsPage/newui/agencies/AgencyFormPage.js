import React from "react";
import { Link } from "react-router-dom";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { Switch } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { headingCase, toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./AgencyForm.module.css";
import useAgencyForm from "./useAgencyForm";
import AgencyFields from "./AgencyFields";
import AgencyBranchFields from "./AgencyBranchFields";

const AgencyFormPage = () => {
    const agencyForm = useAgencyForm();
    const { control, handleSubmit, setValue, clearErrors, formState: { errors } } = agencyForm.form;
    const titleKey = agencyForm.isEdit ? "key_edit_agency" : "key_add_agency";

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={`/${routes.agencies}`}>{toTitleCase(translation("key_agencies"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation(titleKey))}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(agencyForm.onSubmit)} noValidate>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{headingCase(translation(titleKey))}</h1>
                </div>

                {agencyForm.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <AgencyFields
                            control={control}
                            errors={errors}
                            countries={agencyForm.countries}
                            isEdit={agencyForm.isEdit}
                            agencyCategory={agencyForm.agencyCategory}
                        />

                        <div className={styles.statusRow}>
                            <Switch
                                id="agency-status"
                                label={translation("key_active")}
                                checked={agencyForm.agencyStatus}
                                onChange={agencyForm.toggleStatus}
                                disabled={!agencyForm.isEdit}
                            />
                        </div>

                        {!agencyForm.isEdit && (
                            <section className={styles.branchSection} aria-labelledby="agency-branches-title">
                                <h2 id="agency-branches-title" className={shared.sectionEyebrow}>{headingCase(translation("key_add_agency_branch"))}</h2>

                                {agencyForm.branches.map((branch, index) => (
                                    <div key={branch.id} className={styles.branchCard}>
                                        <div className={styles.branchCardHead}>{translation("key_branch")} {index + 1}</div>
                                        <AgencyBranchFields
                                            control={control}
                                            index={index}
                                            errors={errors.branch_data?.[index]}
                                            countries={agencyForm.branchCountries}
                                            districts={agencyForm.districts}
                                            selectedCountryCode={agencyForm.selectedLocations[index] ? String(agencyForm.selectedLocations[index]) : ""}
                                            onCountryChange={agencyForm.setBranchLocation}
                                            timezoneOptions={agencyForm.timezoneOptions}
                                            agencyCategory={agencyForm.agencyCategory}
                                            agencyCountryId={agencyForm.agencyCountryId}
                                            setValue={setValue}
                                            clearErrors={clearErrors}
                                        />
                                    </div>
                                ))}

                                <Btn variant="secondary" type="button" onClick={agencyForm.appendBranch}>
                                    <Icon name="plus" size={14} /> {translation("key_add_another_branch")}
                                </Btn>
                            </section>
                        )}

                        <div className={styles.footer}>
                            <Btn variant="primary" type="submit" disabled={agencyForm.isSaving}>
                                {agencyForm.isSaving ? translation("key_saving") : translation("key_done")}
                            </Btn>
                            <Btn variant="secondary" type="button" onClick={agencyForm.onCancel} disabled={agencyForm.isSaving}>
                                {translation("key_cancel")}
                            </Btn>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default AgencyFormPage;
