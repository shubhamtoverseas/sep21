import React from "react";
import translation from "../../../../utils/translation";
import { CR_FX } from "../contractConstants";
import { FxField, FxGrid, FxGroup, FxSection, FxSubtitle, FxTable, useForms } from "./FxControls";
import { BLANK_HELPER, BLANK_MEMBER, BLANK_WORK } from "./formsModel";

/**
 * Master Form (prototype formMasterHTML; PROCESS §4.1–§4.4): Worker · Employer · Placement / Application · Contract and
 * Accommodation. Every field writes the canonical model the three official forms render from.
 */
export const WORK_COLUMNS = () => [
    { key: "employer_name", label: translation("key_fx_employer_name_col"), maxLength: 100 },
    { key: "employer_address", label: translation("key_address"), maxLength: 250 },
    { key: "start_date", label: translation("key_fx_from"), type: "date" },
    { key: "end_date", label: translation("key_fx_to"), type: "date" },
];
export const MEMBER_COLUMNS = () => [
    { key: "name", label: translation("key_name"), maxLength: 100 },
    { key: "ui_year", label: translation("key_fx_year_of_birth"), type: "num", placeholder: "yyyy", maxLength: 4 },
    { key: "relation", label: translation("key_relationship_with_employer"), maxLength: 100 },
    { key: "hk_id", label: translation("key_fx_hkid_no"), type: "mono", maxLength: 12 },
];
export const HELPER_COLUMNS = () => [
    { key: "worker_name", label: translation("key_fx_helper_name"), maxLength: 100 },
    { key: "hk_id", label: translation("key_fx_hkid_no"), type: "mono", maxLength: 12 },
    { key: "staying_till_date_in_hk", label: translation("key_fx_permitted_to_remain_until"), type: "date" },
    { key: "employer_name", label: translation("key_fx_employer_name_col"), maxLength: 100 },
];

const MasterForm = () => {
    const { model: m } = useForms();
    const hasHkid = m.ui_worker_has_hk_id === CR_FX.YES_NO.YES;
    const eNoHkid = !m.employer_hk_id;
    const isReplace = m.employment_of_the_helper === CR_FX.EMPLOYMENT.REPLACE;
    const basisB = m.contract_commencement_basis === CR_FX.BASIS.B;
    const foodAllow = m.ui_food_arrangement === CR_FX.FOOD.ALLOWANCE;
    const room = m.separate_servant_room;
    const sleep = m.sleeping_arrangement;
    /* K-18: the application type follows Immigration (read-only once resolved); the home-leave choice is editable on a (b) application only */
    const appResolved = Boolean(m.ui_app_type?.resolved);
    const homeLeave = m.ui_app_type?.derived === "b";
    return (
        <div className="fx-form fx-master">
            <FxSection title={ translation("key_worker") }>
                <FxGrid>
                    <FxField k="worker_surname" label={ translation("key_surname") } req />
                    <FxField k="worker_name" label={ translation("key_given_names") } req />
                    <FxField k="worker_chinese_name" label={ translation("key_name_in_chinese") } />
                    <FxField k="worker_maiden_surname" label={ translation("key_fx_maiden_surname") } />
                    <FxField k="worker_alias_name" label={ translation("key_fx_alias") } />
                    <FxField k="worker_gender" label={ translation("key_sex") } type="seg" opts="sex" w="xs" />
                </FxGrid>
                <FxGrid>
                    <FxField k="worker_date_of_birth" label={ translation("key_date_of_birth") } type="date" w="s" req />
                    <FxField k="worker_birth_place" label={ translation("key_place_of_birth") } />
                    <FxField k="worker_marital_status" label={ translation("key_marital_status") } type="select" opts="maritalStatus" w="s" />
                    <FxField k="worker_nationality" label={ translation("key_nationality") } type="select" opts="workerNationality" w="s" req />
                    <FxField k="worker_occupation" label={ translation("key_occupation") } w="s" />
                </FxGrid>
                <FxGroup title={ translation("key_fx_hong_kong_identity_card") }>
                    <FxGrid>
                        <FxField k="ui_worker_has_hk_id" label={ translation("key_fx_holds_a_hkid") } type="seg" opts="yesnoPlain" w="s" />
                        <FxField k="worker_hk_id" label={ translation("key_fx_hkid_no") } type="mono" w="s" na={ !hasHkid } maxLength={ 12 } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_travel_document") }>
                    <FxGrid>
                        <FxField k="worker_travel_document_type" label={ translation("key_fx_document_type") } w="s" />
                        <FxField k="worker_passport_number" label={ translation("key_fx_document_no") } type="mono" w="s" req />
                        <FxField k="worker_passport_place_of_issue" label={ translation("key_place_of_issue") } />
                        <FxField k="worker_passport_issue_date" label={ translation("key_date_of_issue") } type="date" w="s" />
                        <FxField k="worker_passport_expiry_date" label={ translation("key_fx_expiry_date") } type="date" w="s" min={ m.worker_passport_issue_date || undefined } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_addresses_and_contact") }>
                    <FxGrid>
                        <FxField k="ui_worker_present_address" label={ translation("key_present_address") } type="textarea" w="l" maxLength={ 250 } />
                        <FxField k="ui_worker_domicile_address" label={ translation("key_fx_home_country_address") } type="textarea" w="l" maxLength={ 250 } note={ translation("key_fx_home_country_address_note") } />
                        <FxField k="worker_contact_telephone_number" label={ translation("key_fx_contact_telephone") } w="s" maxLength={ 20 } />
                        <FxField k="worker_contact_telephone_ext" label={ translation("key_ext") } w="xs" maxLength={ 6 } />
                        <FxField k="worker_fax_number" label={ translation("key_fax") } w="s" maxLength={ 20 } />
                        <FxField k="worker_contact_email" label={ translation("key_email") } maxLength={ 100 } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_current_employer") }>
                    <FxGrid>
                        <FxField k="worker_current_employer_name" label={ translation("key_fx_current_employer_name") } maxLength={ 100 } />
                        <FxField k="worker_current_employer_address_line_1" label={ translation("key_fx_current_employer_address") } type="textarea" rows={ 1 } w="xl" maxLength={ 250 } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_domestic_helper_work_experience") }>
                    <FxTable k="worker_employers" columns={ WORK_COLUMNS() } blank={ BLANK_WORK } addLabel={ translation("key_fx_add_employment") } emptyLabel={ translation("key_fx_no_previous_employment") } />
                    <FxGrid>
                        <FxField k="worker_work_experience" label={ translation("key_fx_total_experience_years") } type="num" w="xs" maxLength={ 2 } />
                        <FxField k="worker_work_experience_in_months" label={ translation("key_fx_total_experience_months") } type="num" w="xs" maxLength={ 2 } />
                    </FxGrid>
                </FxGroup>
            </FxSection>

            <FxSection title={ translation("key_employer") }>
                <FxGrid>
                    <FxField k="employer_surname" label={ translation("key_surname") } req />
                    <FxField k="employer_name" label={ translation("key_given_names") } req />
                    <FxField k="employer_chinese_name" label={ translation("key_name_in_chinese") } w="s" />
                    <FxField k="employer_gender" label={ translation("key_sex") } type="seg" opts="sex" w="xs" />
                    <FxField k="employer_birth_date" label={ translation("key_date_of_birth") } type="date" w="s" />
                    <FxField k="employer_hk_id" label={ translation("key_fx_hkid_no") } type="mono" w="s" req maxLength={ 12 } />
                    <FxField k="employer_nationality" label={ translation("key_nationality") } type="select" opts="employerNationality" w="s" />
                    <FxField k="employer_occupation" label={ translation("key_occupation") } w="s" />
                </FxGrid>
                <FxGroup title={ translation("key_fx_travel_document_employer_no_hkid") } na={ !eNoHkid }>
                    <FxGrid>
                        <FxField k="employer_travel_document_type" label={ translation("key_travel_document_held") } na={ !eNoHkid } />
                        <FxField k="employer_travel_document_number" label={ translation("key_fx_travel_document_no") } type="mono" w="s" na={ !eNoHkid } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_addresses_and_contact") }>
                    <FxGrid>
                        <FxField k="employer_residential_address" label={ translation("key_residential_address") } type="textarea" w="l" maxLength={ 250 } />
                        <FxField k="employer_correspondence_address" label={ translation("key_fx_correspondence_address") } type="textarea" w="l" maxLength={ 250 } note={ translation("key_fx_if_different_from_residential") } />
                        <FxField k="employer_day_time_contact_telephone_number" label={ translation("key_fx_contact_telephone") } w="s" maxLength={ 20 } />
                        <FxField k="employer_contact_telephone_ext" label={ translation("key_ext") } w="xs" maxLength={ 6 } />
                        <FxField k="employer_home_telephone_number" label={ translation("key_fx_home_telephone") } w="s" maxLength={ 20 } />
                        <FxField k="employer_fax_number" label={ translation("key_fax") } w="s" maxLength={ 20 } />
                        <FxField k="employer_contact_email" label={ translation("key_email") } maxLength={ 100 } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_household") }>
                    <FxGrid>
                        <FxField k="employer_monthly_household_check" label={ translation("key_fx_income_meets_15000") } type="seg" opts="yesnoPlain" w="s" />
                        <FxField k="employer_monthly_household" label={ translation("key_fx_monthly_household_income") } type="money" w="s" na={ m.employer_monthly_household_check !== CR_FX.YES_NO.YES } />
                        <FxField k="employer_bedroom_no" label={ translation("key_fx_bedrooms") } type="num" w="xs" maxLength={ 2 } />
                        <FxField k="separate_servant_room" label={ translation("key_separate_servant_room") } type="seg" opts="yn" w="s" />
                    </FxGrid>
                    <FxSubtitle>{ translation("key_fx_household_members_at_address") }</FxSubtitle>
                    <FxTable k="employer_family" columns={ MEMBER_COLUMNS() } blank={ BLANK_MEMBER } addLabel={ translation("key_fx_add_household_member") } emptyLabel={ translation("key_fx_no_household_members") } />
                    <FxSubtitle>{ translation("key_fx_helpers_currently_employed") }</FxSubtitle>
                    <FxTable k="employer_workers" columns={ HELPER_COLUMNS() } blank={ BLANK_HELPER } addLabel={ translation("key_add_helper") } emptyLabel={ translation("key_fx_no_helper_employed") } />
                </FxGroup>
            </FxSection>

            <FxSection title={ translation("key_fx_placement_application") }>
                <FxGrid>
                    <FxField k="entry_visa" label={ translation("key_fx_application_type") } type="select" opts="appType" w="xl" blank={ !appResolved && !m.entry_visa } na={ appResolved } note={ m.ui_app_type && !appResolved ? translation("key_needs_review") : undefined } />
                    { homeLeave && <FxField k="worker_purpose_of_application" label={ translation("key_fx_purpose_of_application") } type="select" opts="purpose" w="l" /> }
                    <FxField k="employment_of_the_helper" label={ translation("key_employment_of_the_helper") } type="select" opts="employment" blank={ false } />
                    <FxField k="helper_application_reference_no" label={ translation("key_fx_application_reference_no") } type="mono" w="s" maxLength={ 30 } />
                    <FxField k="relationship_with_helper" label={ translation("key_relationship_with_the_helper") } type="select" opts="relationship" w="s" />
                </FxGrid>
                <FxGroup title={ translation("key_fx_helper_being_replaced") } na={ !isReplace }>
                    <FxGrid>
                        <FxField k="name_of_helper_being_replaced" label={ translation("key_name") } na={ !isReplace } maxLength={ 100 } />
                        <FxField k="hk_id_of_helper_being_replaced" label={ translation("key_fx_hkid_no") } type="mono" w="s" na={ !isReplace } maxLength={ 12 } />
                        <FxField k="contract_termination_date" label={ translation("key_fx_contract_termination_date") } type="date" w="s" na={ !isReplace } />
                    </FxGrid>
                </FxGroup>
            </FxSection>

            <FxSection title={ translation("key_fx_contract_and_accommodation") }>
                <FxGrid>
                    <FxField k="contract_number" label={ translation("key_fx_dh_contract_no") } type="mono" w="s" req maxLength={ 20 } />
                    <FxField k="worker_contract_date" label={ translation("key_contract_date") } type="date" w="s" req />
                    <FxField k="worker_origin_place" label={ translation("key_place_of_origin") } />
                    <FxField k="contract_commencement_basis" label={ translation("key_fx_commencement") } type="select" opts="basis" w="l" blank={ false } />
                    <FxField k="contract_commencing_date" label={ translation("key_fx_commencement_date") } type="date" w="s" na={ !basisB } />
                    <FxField k="previous_contract_number" label={ translation("key_fx_previous_dh_contract_no") } type="mono" w="s" na={ !basisB } maxLength={ 20 } />
                </FxGrid>
                <FxGroup title={ translation("key_fx_wage_and_allowances") }>
                    <FxGrid>
                        <FxField k="wage" label={ translation("key_fx_wage_per_month") } type="money" w="s" req />
                        <FxField k="ui_food_arrangement" label={ translation("key_fx_food") } type="seg" opts="food" w="l" />
                        <FxField k="food_allowence" label={ translation("key_fx_food_allowance_per_month") } type="money" w="s" na={ !foodAllow } />
                        <FxField k="other_fees" label={ translation("key_fx_other_fees_borne") } w="l" maxLength={ 100 } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_residence_and_household") }>
                    <FxGrid>
                        <FxField k="employer_residential_address" label={ translation("key_fx_residence_address") } type="textarea" w="xl" maxLength={ 250 } />
                        <FxField k="employer_house_size" label={ translation("key_fx_size_of_flat_house") } type="num" w="xs" maxLength={ 6 } />
                        <FxField k="ui_house_size_unit" label={ translation("key_fx_unit") } type="seg" opts="unit" w="s" />
                        <FxField k="employer_adult_count" label={ translation("key_fx_adults") } type="num" w="xs" maxLength={ 2 } />
                        <FxField k="employer_child_age_5_8_count" label={ translation("key_fx_minors_5_18") } type="num" w="xs" maxLength={ 2 } />
                        <FxField k="employer_child_age_below_5_count" label={ translation("key_fx_minors_under_5") } type="num" w="xs" maxLength={ 2 } />
                        <FxField k="employer_expecting_baby_count" label={ translation("key_fx_expecting_babies") } type="num" w="xs" maxLength={ 2 } />
                        <FxField k="employer_special_needs_count" label={ translation("key_fx_persons_constant_care") } type="num" w="xs" maxLength={ 2 } />
                        <FxField k="employer_no_of_helpers_to_serve_houseold" label={ translation("key_fx_helpers_currently_employed_count") } type="num" w="xs" maxLength={ 2 } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_accommodation") }>
                    <FxGrid>
                        <FxField k="separate_servant_room" label={ translation("key_separate_servant_room") } type="seg" opts="yn" w="s" />
                        <FxField k="servant_room_size" label={ translation("key_fx_servant_room_size") } type="num" w="xs" na={ room !== CR_FX.YN.YES } maxLength={ 6 } />
                        <FxField k="ui_servant_room_unit" label={ translation("key_fx_unit") } type="seg" opts="unit" w="s" na={ room !== CR_FX.YN.YES } />
                    </FxGrid>
                    <FxGroup title={ translation("key_fx_sleeping_arrangement_no_room") } na={ room !== CR_FX.YN.NO }>
                        <FxGrid>
                            <FxField k="sleeping_arrangement" label={ translation("key_fx_arrangement") } type="radio" opts="sleep" w="l" na={ room !== CR_FX.YN.NO } />
                            <FxField k="employer_share_room_with_no_of_child" label={ translation("key_number_of_children") } type="num" w="xs" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.SHARE } maxLength={ 2 } />
                            <FxField k="employer_share_room_with_child_age" label={ translation("key_fx_children_aged") } w="xs" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.SHARE } maxLength={ 20 } />
                            <FxField k="employer_separate_partitionate_area_size" label={ translation("key_fx_partitioned_area_size") } type="num" w="xs" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.PARTITION } maxLength={ 6 } />
                            <FxField k="ui_partition_unit" label={ translation("key_fx_unit") } type="seg" opts="unit" w="s" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.PARTITION } />
                            <FxField k="employer_other_servant_room_details" label={ translation("key_fx_other_arrangement") } w="l" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.OTHERS } maxLength={ 200 } />
                        </FxGrid>
                    </FxGroup>
                    <FxSubtitle>{ translation("key_fx_facilities_provided") }</FxSubtitle>
                    <FxGrid>
                        <FxField k="light_and_water_supply" label={ translation("key_light_and_water_supply") } type="seg" opts="bit" w="s" />
                        <FxField k="toilet_and_bathing_facilities" label={ translation("key_fx_toilet_and_bathing") } type="seg" opts="bit" w="s" />
                        <FxField k="bed" label={ translation("key_bed") } type="seg" opts="bit" w="s" />
                        <FxField k="blankets_or_quilt" label={ translation("key_blankets_or_quilt") } type="seg" opts="bit" w="s" />
                        <FxField k="pillows" label={ translation("key_pillows") } type="seg" opts="bit" w="s" />
                        <FxField k="wardrobe" label={ translation("key_wardrobe") } type="seg" opts="bit" w="s" />
                        <FxField k="refrigerator" label={ translation("key_refrigerator") } type="seg" opts="bit" w="s" />
                        <FxField k="desk" label={ translation("key_desk") } type="seg" opts="bit" w="s" />
                        <FxField k="other_facilities_please_specify" label={ translation("key_other_facilities") } w="l" maxLength={ 100 } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_domestic_duties") }>
                    <FxGrid>
                        <FxField k="aged_care_required" label={ translation("key_fx_care_of_aged_persons") } type="seg" opts="agedCare" w="l" />
                        <FxField k="other_duties" label={ translation("key_other_duties") } type="textarea" rows={ 1 } w="l" maxLength={ 100 } />
                    </FxGrid>
                </FxGroup>
                <FxGroup title={ translation("key_fx_witnesses") }>
                    <FxGrid>
                        <FxField k="employer_witness" label={ translation("key_fx_employers_witness") } maxLength={ 100 } />
                        <FxField k="worker_witness" label={ translation("key_fx_helpers_witness") } maxLength={ 100 } />
                    </FxGrid>
                </FxGroup>
            </FxSection>
        </div>
    );
};

export default MasterForm;
