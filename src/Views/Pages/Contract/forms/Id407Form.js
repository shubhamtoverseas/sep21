import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import { CR_FORM, CR_FORM_OFFICIAL, CR_FX } from "../contractConstants";
import { FxBlank, FxField, FxGrid, FxItem, FxPara, FxRo, FxSection, FxSegInline, FxTick, useForms } from "./FxControls";
import { employerFullName, workerFullName } from "./formsModel";

/**
 * ID 407 — Employment Contract (For A Domestic Helper recruited from abroad) + Schedule of Accommodation and Domestic
 * Duties (prototype form407HTML): only the clauses with a variable render; the statements without one stay on the
 * official PDF. Every blank writes the canonical model.
 */
const FAC_ROWS = [["a", "light_and_water_supply", "key_light_and_water_supply"], ["b", "toilet_and_bathing_facilities", "key_fx_toilet_and_bathing"], ["c", "bed", "key_bed"],
    ["d", "blankets_or_quilt", "key_blankets_or_quilt"], ["e", "pillows", "key_pillows"], ["f", "wardrobe", "key_wardrobe"], ["g", "refrigerator", "key_refrigerator"], ["h", "desk", "key_desk"]];

const FacRow = ({ letter, k, labelKey }) => {
    const { model, set, readOnly } = useForms();
    return (
        <div className="fx-fac-row">
            <span className="fx-fac-lab">({ letter }) { translation(labelKey) }</span>
            { [[CR_FX.BIT.YES, "key_yes"], [CR_FX.BIT.NO, "key_no"]].map(([v, key]) => (
                <label key={ v } className="fx-tick-inline">
                    <input type="radio" name={ `fx-${ k }` } value={ v } checked={ model[k] === v } disabled={ readOnly } data-fid={ `fx-${ k }-${ v === CR_FX.BIT.YES ? "yes" : "no" }` } onChange={ () => set(k, v) } />{ translation(key) }
                </label>
            )) }
        </div>
    );
};
FacRow.propTypes = { letter: PropTypes.string.isRequired, k: PropTypes.string.isRequired, labelKey: PropTypes.string.isRequired };

const Id407Form = () => {
    const { model: m } = useForms();
    const basis = m.contract_commencement_basis;
    const room = m.separate_servant_room;
    const sleep = m.sleeping_arrangement;
    const foodAllow = m.ui_food_arrangement === CR_FX.FOOD.ALLOWANCE;
    return (
        <div className="fx-form fx-official fx-407">
            <div className="fx-formhead fx-formhead-407">
                <div className="fx-formhead-no"><span className="fx-lab">{ translation("key_fx_dh_contract_no") }</span><FxBlank k="contract_number" size="s" type="mono" label={ translation("key_fx_dh_contract_no") } /></div>
                <div className="fx-formhead-title fx-center">{ translation("key_fx_employment_contract_title") }<br /><em>({ translation("key_for_domestic_helper_recruited_from_abroad") })</em></div>
                <span className="fx-formhead-ref">{ CR_FORM_OFFICIAL[CR_FORM.ID407].version }</span>
            </div>

            <FxSection plain title={ translation("key_fx_employment_contract_title") }>
                <FxPara>
                    <span className="fx-parties">{ translation("key_contract_terms_introduction") } <FxRo inline value={ employerFullName(m) } /> { translation("key_employer_and") } <FxRo inline value={ workerFullName(m) } /> ({ translation("key_fx_the_helper") }) { translation("key_on") } <FxBlank k="worker_contract_date" type="date" label={ translation("key_contract_date") } /> { translation("key_following_terms") }</span>
                </FxPara>
                <FxItem>{ translation("key_helpers_place_of_origin") } <FxBlank k="worker_origin_place" size="l" label={ translation("key_place_of_origin") } /></FxItem>
                <FxItem num="2.">
                    <div className="fx-clause2">
                        <FxTick k="contract_commencement_basis" value={ CR_FX.BASIS.A }>(A)† { translation("key_helper_employed_period_two_years") }</FxTick>
                        <FxTick k="contract_commencement_basis" value={ CR_FX.BASIS.B }>(B)† { translation("key_helper_shall_be_employed_by_the_employer") } <FxBlank k="contract_commencing_date" type="date" na={ basis !== CR_FX.BASIS.B } label={ translation("key_fx_commencement_date") } />, { translation("key_which_is_the_date_following_expiry") } <FxBlank k="previous_contract_number" size="s" type="mono" na={ basis !== CR_FX.BASIS.B } label={ translation("key_fx_previous_dh_contract_no") } /> { translation("key_for_the_employment_with_the_same_employer") }.</FxTick>
                        <FxTick k="contract_commencement_basis" value={ CR_FX.BASIS.C }>(C)† { translation("key_fx_basis_c_clause") }</FxTick>
                    </div>
                </FxItem>
                <FxItem>{ translation("key_helper_work_reside_employer_residence") } <FxBlank k="employer_residential_address" size="xl" label={ translation("key_residential_address") } /></FxItem>
                <FxItem>
                    { translation("key_employer_pay_helper_wages") } <FxBlank k="wage" size="s" label={ translation("key_fx_wage_per_month") } /> { translation("key_minimum_allowable_wage_required") }
                    <div className="fx-sub">{ translation("key_employer_provide_suitable_accommodation") } <FxBlank k="food_allowence" size="s" na={ !foodAllow } label={ translation("key_fx_food_allowance_per_month") } /> { translation("key_food_allowance_if_no_food_provided") }</div>
                </FxItem>
                <FxItem>
                    { translation("key_employer_responsible_for_fees_expenses") }
                    <div className="fx-sub fx-sub-list">
                        <div>{ translation("key_medical_examination_fees") }</div><div>{ translation("key_authentication_fees_consulate") }</div><div>{ translation("key_visa_fee") }</div>
                        <div>{ translation("key_insurance_fee") }</div><div>{ translation("key_administration_fee") }</div>
                        <div>{ translation("key_fx_others_colon") } <FxBlank k="other_fees" size="xl" label={ translation("key_fx_other_fees_borne") } /></div>
                    </div>
                    <div className="fx-sub">{ translation("key_employer_reimburse_helper_costs") }</div>
                </FxItem>
                <div className="fx-footnote">{ translation("key_fx_clause2_footnote") }</div>
            </FxSection>

            <FxSection plain title={ translation("key_fx_witnesses") }>
                <FxGrid>
                    <FxField k="employer_witness" label={ translation("key_fx_signed_by_employer_witness") } w="l" maxLength={ 100 } />
                    <FxField k="worker_witness" label={ translation("key_fx_signed_by_helper_witness") } w="l" maxLength={ 100 } />
                </FxGrid>
            </FxSection>

            <FxSection plain title={ translation("key_schedule_of_accommodation_and_domestic_duties") }>
                <FxItem>
                    { translation("key_employer_residence_and_number_served") }
                    <div className="fx-sub">{ translation("key_flat_house_size") } <FxBlank k="employer_house_size" size="xs" label={ translation("key_fx_size_of_flat_house") } /> <FxSegInline k="ui_house_size_unit" opts="unit" ariaLabel={ translation("key_fx_unit") } />*</div>
                    <div className="fx-sub">{ translation("key_number_of_persons_served") }</div>
                    <div className="fx-sub fx-counts">
                        <FxBlank k="employer_adult_count" size="xs" label={ translation("key_fx_adults") } /> { translation("key_adult") } <FxBlank k="employer_child_age_5_8_count" size="xs" label={ translation("key_fx_minors_5_18") } /> { translation("key_minors_aged_5_18") } <FxBlank k="employer_child_age_below_5_count" size="xs" label={ translation("key_fx_minors_under_5") } /> { translation("key_minors_aged_below_5") } <FxBlank k="employer_expecting_baby_count" size="xs" label={ translation("key_fx_expecting_babies") } /> { translation("key_expecting_babies") }.<br />
                        <FxBlank k="employer_special_needs_count" size="xs" label={ translation("key_fx_persons_constant_care") } /> { translation("key_persons_needing_care") }<br />
                        { translation("key_number_of_helpers") } <FxBlank k="employer_no_of_helpers_to_serve_houseold" size="xs" label={ translation("key_fx_helpers_currently_employed_count") } />)
                    </div>
                </FxItem>
                <FxItem>
                    { translation("key_accommodation_and_facilities_for_helper") }
                    <div className="fx-sub">{ translation("key_accommodation_to_helper") } <span className="fx-legal-inline">{ translation("key_unsuitable_accommodation_examples") }</span></div>
                    <div className="fx-sub">
                        <FxTick k="separate_servant_room" value={ CR_FX.YN.YES }>{ translation("key_estimated_size_of_servant_room") } <FxBlank k="servant_room_size" size="xs" na={ room !== CR_FX.YN.YES } label={ translation("key_fx_servant_room_size") } /> <FxSegInline k="ui_servant_room_unit" opts="unit" na={ room !== CR_FX.YN.YES } ariaLabel={ translation("key_fx_unit") } /></FxTick>
                        <FxTick k="separate_servant_room" value={ CR_FX.YN.NO }>{ translation("key_sleeping_arrangement_for_helper") }</FxTick>
                        <div className={ `fx-sleep${ room === CR_FX.YN.NO ? "" : " fx-na" }` }>
                            <FxTick k="sleeping_arrangement" value={ CR_FX.SLEEP.SHARE } na={ room !== CR_FX.YN.NO }>{ translation("key_share_room_with") } <FxBlank k="employer_share_room_with_no_of_child" size="xs" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.SHARE } label={ translation("key_number_of_children") } /> { translation("key_fx_child_children_aged") } <FxBlank k="employer_share_room_with_child_age" size="xs" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.SHARE } label={ translation("key_fx_children_aged") } /></FxTick>
                            <FxTick k="sleeping_arrangement" value={ CR_FX.SLEEP.PARTITION } na={ room !== CR_FX.YN.NO }>{ translation("key_separate_partitioned_area") } <FxBlank k="employer_separate_partitionate_area_size" size="xs" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.PARTITION } label={ translation("key_fx_partitioned_area_size") } /> <FxSegInline k="ui_partition_unit" opts="unit" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.PARTITION } ariaLabel={ translation("key_fx_unit") } /></FxTick>
                            <FxTick k="sleeping_arrangement" value={ CR_FX.SLEEP.OTHERS } na={ room !== CR_FX.YN.NO }>{ translation("key_others_specify") } <FxBlank k="employer_other_servant_room_details" size="xl" na={ room !== CR_FX.YN.NO || sleep !== CR_FX.SLEEP.OTHERS } label={ translation("key_fx_other_arrangement") } /></FxTick>
                        </div>
                    </div>
                    <div className="fx-sub">{ translation("key_facilities_for_helper") } <span className="fx-legal-inline">{ translation("key_note_application_for_entry_visa") }</span></div>
                    <div className="fx-facilities">
                        { FAC_ROWS.map(([letter, k, labelKey]) => <FacRow key={ k } letter={ letter } k={ k } labelKey={ labelKey } />) }
                        <div className="fx-fac-row"><span className="fx-fac-lab">(i) { translation("key_other_facilities_specify") }</span><FxBlank k="other_facilities_please_specify" size="l" label={ translation("key_other_facilities") } /></div>
                    </div>
                </FxItem>
                <FxItem>
                    { translation("key_domestic_duties_include") }
                    <div className="fx-sub">{ translation("key_major_portion_of_domestic_duties") }</div>
                    <div className="fx-sub fx-sub-list">
                        <div>1. { translation("key_household_chores") }</div><div>2. { translation("key_cooking") }</div>
                        <div className="fx-duty3">3. { translation("key_fx_looking_after_aged_persons") } <FxSegInline k="aged_care_required" opts="agedCare" ariaLabel={ translation("key_fx_care_of_aged_persons") } />*)</div>
                        <div>4. { translation("key_baby_sitting") }</div><div>5. { translation("key_child_minding") }</div>
                        <div>6. { translation("key_others_specify_duties") }</div>
                    </div>
                    <FxGrid><FxField k="other_duties" type="textarea" rows={ 2 } w="full" label={ translation("key_other_duties") } maxLength={ 100 } /></FxGrid>
                </FxItem>
                <div className="fx-footnote"><span className="fx-legend-box" /> { translation("key_fx_tick_as_appropriate") }</div>
            </FxSection>
        </div>
    );
};

export default Id407Form;
