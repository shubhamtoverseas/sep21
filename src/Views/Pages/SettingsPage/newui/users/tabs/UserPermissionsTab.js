import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Controller, useFormContext } from "react-hook-form";
import { useDispatch } from "react-redux";
import Select from "react-select";
import { Field, FormGrid, RadioGroup, SelectBox } from "../../../../../../components/ui/FormControls";
import { fetchActiveAgencies } from "../../../../../../redux/Slices/settings/agencies/AgenciesSlice";
import { fetchBranchesByAgencyId } from "../../../../../../redux/Slices/settings/branches/BranchesSlice";
import { fetchSpokenLanguage } from "../../../../../../redux/Slices/common/spokenLanguage/SpokenLanguageSlice";
import { fetchCountries } from "../../../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchActiveUsers } from "../../../../../../redux/Slices/settings/users/UsersSlice";
import translation from "../../../../../../utils/translation";
import shared from "../../settings-newui.module.css";
import styles from "../UserForm.module.css";
import { headingCase } from "../../../../../../utils/utils";
import UserPermissionsEditor from "../permissions/UserPermissionsEditor";
import {
    ACTIVE_LANGUAGES_QUERY,
    ACTIVE_USERS_QUERY,
    AGENCY_CATEGORY,
    COUNTRY_LOOKUP_TYPE,
    MANAGER_SELF_VALUE,
    STAFF_TYPE,
    STAFF_TYPE_OPTIONS,
} from "../../settingsNewUiConstants";

const toBranchValueList = (value) => (
    Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",").filter(Boolean) : []
);
const initialsOf = (name) => String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

/**
 * Tab 4 of the wizard (`showScope`): the account scope — user type, partner country / agency / branches, direct manager.
 * The Permissions page (`showEditor`, U-0357): the account identity with read-only User Type above the client's
 * Permissions editor (modules · sections · review · copy). U-0358 (21 Oct): User Type is Internal or Partner and is
 * read-only after creation; the separately governed override has no named holder yet, so no override path exists.
 */
const UserPermissionsTab = ({
    id,
    isEdit = false,
    showScope = true,
    showEditor = true,
    currentUser,
    mappingIds,
    loadOnce,
    perm,
    audience,
    permDraft,
    permSaved,
    permAlert,
    onChangeDraft,
    onApplyCopy,
    loadUserGrants,
    onHistory,
    readOnlyModules,
    readOnlyNote,
}) => {
    const dispatch = useDispatch();
    const { control, setValue, watch, formState: { errors } } = useFormContext();
    const staffType = watch("staff_type");
    const staffCountryId = watch("staff_country_id");
    const staffAgencyId = watch("staff_agency_id");
    const firstName = watch("first_name");
    const lastName = watch("last_name");

    const [activeUsers, setActiveUsers] = useState([]);
    const [activePermissionUsers, setActivePermissionUsers] = useState([]);
    const [partnerCountries, setPartnerCountries] = useState([]);
    const [partnerAgencies, setPartnerAgencies] = useState([]);
    const [partnerBranches, setPartnerBranches] = useState([]);

    const isInternal = staffType === STAFF_TYPE.INTERNAL;
    const isPartner = staffType === STAFF_TYPE.PARTNER;

    useEffect(() => {
        loadOnce("activeUsers:internal", () => dispatch(fetchActiveUsers(ACTIVE_USERS_QUERY.INTERNAL))).then((res) => {
            if (!res?.error) setActiveUsers(res?.payload?.data || []);
        });
        loadOnce("activeUsers:staff_type", () => dispatch(fetchActiveUsers(ACTIVE_USERS_QUERY.BY_STAFF_TYPE))).then((res) => {
            if (!res?.error) setActivePermissionUsers(res?.payload?.data || []);
        });
        loadOnce("spokenLanguages:active", () => dispatch(fetchSpokenLanguage(ACTIVE_LANGUAGES_QUERY)));
        loadOnce("countries:worker_home", () => dispatch(fetchCountries({ type: COUNTRY_LOOKUP_TYPE.WORKER_HOME }))).then((res) => {
            if (res?.payload) setPartnerCountries(Array.isArray(res.payload) ? res.payload : []);
        });
    }, [dispatch, loadOnce]);

    useEffect(() => {
        if (!staffCountryId) { setPartnerAgencies([]); return; }
        loadOnce(`partnerAgencies:${staffCountryId}`, () => dispatch(fetchActiveAgencies({ agency_category: AGENCY_CATEGORY.PARTNER, country_id: staffCountryId })))
            .then((res) => setPartnerAgencies(!res?.error ? (res?.payload?.data || []) : []))
            .catch(() => setPartnerAgencies([]));
    }, [dispatch, loadOnce, staffCountryId]);

    useEffect(() => {
        if (!staffAgencyId) { setPartnerBranches([]); return; }
        loadOnce(`partnerBranches:${staffAgencyId}`, () => dispatch(fetchBranchesByAgencyId({ agency_id: staffAgencyId })))
            .then((res) => setPartnerBranches(!res?.error ? (res?.payload?.data || []) : []))
            .catch(() => setPartnerBranches([]));
    }, [dispatch, loadOnce, staffAgencyId]);

    useEffect(() => {
        if (mappingIds && mappingIds.length) setValue("mapped_id", [...new Set(mappingIds)]);
    }, [mappingIds, setValue]);

    const handleStaffTypeChange = useCallback((type) => {
        setValue("staff_type", type);
        if (type === STAFF_TYPE.INTERNAL) {
            setValue("staff_country_id", "");
            setValue("staff_agency_id", "");
            setValue("staff_branch_id", "");
        }
    }, [setValue]);

    const handleCountryChange = useCallback((event) => {
        setValue("staff_country_id", event.target.value);
        setValue("staff_agency_id", "");
        setValue("staff_branch_id", "");
    }, [setValue]);

    const handleAgencyChange = useCallback((event) => {
        setValue("staff_agency_id", event.target.value);
        setValue("staff_branch_id", "");
    }, [setValue]);

    const staffTypeOptions = useMemo(() => STAFF_TYPE_OPTIONS.map((option) => ({ value: option.value, label: translation(option.key) })), []);
    const staffTypeLabel = useMemo(() => translation(STAFF_TYPE_OPTIONS.find((o) => o.value === staffType)?.key || "key_internal"), [staffType]);

    /* same-type active users the person may copy from (never the account being edited) */
    const copyUsers = useMemo(
        () => activePermissionUsers.filter((user) => user.staff_type === staffType && String(user.id) !== String(id || "")).map((user) => ({ id: user.id, name: user.name })),
        [activePermissionUsers, staffType, id]
    );

    const branchOptions = useMemo(
        () => partnerBranches.map((branch) => ({ value: String(branch.id), label: branch.branch_name })),
        [partnerBranches]
    );

    const who = useMemo(() => {
        const name = [firstName, lastName].filter(Boolean).join(" ") || currentUser?.name || "";
        const org = isPartner ? (partnerAgencies.find((a) => String(a.id) === String(staffAgencyId))?.agency_name || "") : "";
        return { name, initials: initialsOf(name), type: staffTypeLabel, org };
    }, [firstName, lastName, currentUser, isPartner, partnerAgencies, staffAgencyId, staffTypeLabel]);

    return (
        <>
            {showEditor && (
                <div className="upm upm-head" data-mc-user-identity="1">
                    <div>
                        <h2>{headingCase(translation("key_permissions"))}</h2>
                        <div className="upm-who">
                            <span className="av" aria-hidden="true">{who.initials}</span>
                            <span className="who-t">
                                <span className="nm">{who.name}</span>
                                <span className="dot">·</span>
                                <span>{translation("key_user_type")}: {who.type}</span>
                                {who.org && <><span className="dot">·</span><span>{who.org}</span></>}
                            </span>
                        </div>
                    </div>
                </div>
            )}
            {showScope && <section className={styles.section}>
                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_assignment_details"))}</h2>
                <FormGrid columns={4}>
                    {/* U-0358 (21 Oct): read-only after creation (sheet Revised answer supersedes the 22 Oct ruling) */}
                    <Field label={translation("key_user_type")} required hint={isEdit ? translation("key_read_only") : undefined}>
                        <RadioGroup name="staff_type" value={staffType} options={staffTypeOptions} onChange={handleStaffTypeChange} disabled={isEdit} ariaLabel={translation("key_user_type")} />
                    </Field>

                    {isPartner && (
                        <>
                            <Field label={translation("key_partner_country")} htmlFor="user-staff_country_id" required error={errors.staff_country_id?.message}>
                                <Controller name="staff_country_id" control={control} render={({ field }) => (
                                    <SelectBox {...field} id="user-staff_country_id" invalid={Boolean(errors.staff_country_id)} onChange={handleCountryChange}>
                                        <option value="">{translation("key_please_select")}</option>
                                        {partnerCountries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
                                    </SelectBox>
                                )} />
                            </Field>

                            <Field label={translation("key_partner_agency")} htmlFor="user-staff_agency_id" required error={errors.staff_agency_id?.message}>
                                <Controller name="staff_agency_id" control={control} render={({ field }) => (
                                    <SelectBox {...field} id="user-staff_agency_id" disabled={!staffCountryId} invalid={Boolean(errors.staff_agency_id)} onChange={handleAgencyChange}>
                                        <option value="">{translation("key_please_select")}</option>
                                        {partnerAgencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.agency_name}</option>)}
                                    </SelectBox>
                                )} />
                            </Field>

                            <Field label={translation("key_partner_branch")} htmlFor="user-staff_branch_id" required error={errors.staff_branch_id?.message}>
                                <Controller name="staff_branch_id" control={control} render={({ field }) => {
                                    const selected = toBranchValueList(field.value)
                                        .map((value) => branchOptions.find((option) => option.value === value))
                                        .filter(Boolean);
                                    return (
                                        <Select
                                            inputId="user-staff_branch_id"
                                            className={`${styles.reactSelect} ${errors.staff_branch_id ? styles.reactSelectInvalid : ""}`}
                                            classNamePrefix="nuform"
                                            options={branchOptions}
                                            value={selected}
                                            onChange={(options) => field.onChange(options ? options.map((option) => option.value).join(",") : "")}
                                            isMulti
                                            closeMenuOnSelect={false}
                                            placeholder={translation("key_please_select")}
                                            noOptionsMessage={() => translation("key_no_options")}
                                            maxMenuHeight={170}
                                            isDisabled={!staffAgencyId}
                                        />
                                    );
                                }} />
                            </Field>
                        </>
                    )}

                    {isInternal && (
                        <Field label={translation("key_direct_manager")} htmlFor="user-manager_id" required error={errors.manager_id?.message}>
                            <Controller name="manager_id" control={control} render={({ field }) => (
                                <SelectBox {...field} id="user-manager_id" invalid={Boolean(errors.manager_id)}>
                                    <option value="">{translation("key_select_direct_manager")}</option>
                                    <option value={MANAGER_SELF_VALUE}>{translation("key_self")}</option>
                                    {/* the edited user never lists as their own manager — Self is that choice (Priyanka, 11 Nov) */}
                                    {activeUsers.filter((user) => String(user.user_id) !== String(currentUser?.user_id)).map((user) => <option key={user.user_id} value={user.user_id}>{user.name}</option>)}
                                </SelectBox>
                            )} />
                        </Field>
                    )}
                </FormGrid>
            </section>}

            {showEditor && <UserPermissionsEditor
                engine={perm.engine}
                rows={perm.rows}
                bindingOf={perm.bindingOf}
                audience={audience}
                draft={permDraft}
                saved={permSaved}
                alert={permAlert}
                who={who}
                onChange={onChangeDraft}
                onApplyCopy={onApplyCopy}
                copyUsers={copyUsers}
                loadUserGrants={loadUserGrants}
                onHistory={onHistory}
                readOnlyModules={readOnlyModules}
                readOnlyNote={readOnlyNote}
            />}
        </>
    );
};

UserPermissionsTab.propTypes = {
    id: PropTypes.string,
    isEdit: PropTypes.bool,
    showScope: PropTypes.bool,
    showEditor: PropTypes.bool,
    currentUser: PropTypes.object,
    mappingIds: PropTypes.array,
    loadOnce: PropTypes.func.isRequired,
    perm: PropTypes.shape({ engine: PropTypes.object, rows: PropTypes.array, bindingOf: PropTypes.func }).isRequired,
    audience: PropTypes.string.isRequired,
    permDraft: PropTypes.object.isRequired,
    permSaved: PropTypes.object.isRequired,
    onChangeDraft: PropTypes.func.isRequired,
    onApplyCopy: PropTypes.func.isRequired,
    loadUserGrants: PropTypes.func.isRequired,
    onHistory: PropTypes.func,
    readOnlyModules: PropTypes.arrayOf(PropTypes.string),
    readOnlyNote: PropTypes.string,
    permAlert: PropTypes.string,
};

export default React.memo(UserPermissionsTab);
