import React from "react";
import translation from "../../../../utils/translation";
import { CR_FORM, CR_FORM_OFFICIAL, CR_FX } from "../contractConstants";
import { FxBlank, FxField, FxGrid, FxGroup, FxItem, FxPara, FxSection, FxTable, FxTick, useForms } from "./FxControls";
import { BLANK_HELPER, BLANK_MEMBER, workerFullName } from "./formsModel";
import { HELPER_COLUMNS, MEMBER_COLUMNS } from "./MasterForm";

/**
 * ID 988B (06/2024) — Application for Employment of Domestic Helper from Abroad (to be completed by the employer):
 * prototype form988BHTML. The home-leave choice writes the shared application type (b)(i) / (b)(ii).
 */
const ZH = Object.freeze({
    org: "香港特別行政區政府入境事務處", title: "從外國聘用家庭傭工申請表 (由僱主填寫)",
    s1: "在港的僱主資料", s2: "家庭傭工資料", s2b: "家庭傭工資料（續）", s3: "住戶資料", s4: "聲明", s5: "承諾",
    s4sub: "(只列出需要填寫的項目；全文載於官方表格)",
    noHkid: "如僱主並未持有香港身份證，請填寫此欄", docHeld: "持有的旅行證件", res: "住址", corr: "通訊地址 (如與住址不同)", border: "(請在邊界內填寫)", homeTel: "住宅電話號碼",
    hkid: "香港身份證號碼 (如有)", helperName: "傭工姓名", refNo: "傭工申請編號 (如有)", rel: "與傭工的關係", employment: "聘用家庭傭工",
    first: "首次聘用", renewal: "續約聘用", replace: "轉換傭工聘用", replacedName: "被轉換的家庭傭工姓名", termDate: "終止合約日期", additional: "增聘傭工聘用",
    income: "每月平均住戶入息不少於：港幣", proof: "(請提供有關證明，續約除外)", bedrooms: "睡房數目", servant: "獨立工人房", yes: "是", no: "否",
    declC: "本人願意負責將傭工遣返", undI: "僱傭合約（家庭傭工合約號碼）", note1: "附註 1:",
});

const Id988bForm = () => {
    const { model: m } = useForms();
    const noHkid = !m.employer_hk_id;
    const isReplace = m.employment_of_the_helper === CR_FX.EMPLOYMENT.REPLACE;
    const isRenew = m.entry_visa === CR_FX.ENTRY_VISA.RENEW_LEAVE || m.entry_visa === CR_FX.ENTRY_VISA.RENEW_DEFER;
    const appResolved = Boolean(m.ui_app_type?.resolved);   /* K-18: the type follows Immigration */
    const defer = m.entry_visa === CR_FX.ENTRY_VISA.RENEW_DEFER;
    return (
        <div className="fx-form fx-official">
            <div className="fx-formhead">
                <div className="fx-formhead-org"><span className="fx-zh">{ ZH.org }</span>{ translation("key_fx_immd_org") }</div>
                <div className="fx-formhead-title"><span className="fx-zh">{ ZH.title }</span>{ translation("key_fx_988b_title") } <em>({ translation("key_fx_to_be_completed_by_employer") })</em></div>
                <span className="fx-formhead-ref">{ CR_FORM_OFFICIAL[CR_FORM.ID988B].version }</span>
            </div>

            <FxSection num="1." zh={ ZH.s1 } title={ translation("key_fx_particulars_of_employer_in_hk") }>
                <FxGrid>
                    <FxField k="employer_chinese_name" label={ translation("key_name_in_chinese_if_applicable") } />
                    <FxField k="employer_surname" label={ translation("key_surname_in_english") } req />
                    <FxField k="employer_name" label={ translation("key_given_names_in_english") } req />
                    <FxField k="employer_gender" label={ translation("key_sex") } type="radio" opts="sex" w="s" />
                    <FxField k="employer_birth_date" label={ translation("key_date_of_birth") } type="date" w="s" />
                    <FxField k="employer_hk_id" zh={ ZH.hkid } label={ translation("key_hk_identity_card_no") } type="mono" w="s" maxLength={ 12 } />
                    <FxField k="employer_nationality" label={ translation("key_nationality") } type="select" opts="employerNationality" w="s" />
                    <FxField k="employer_occupation" label={ translation("key_occupation") } w="s" />
                </FxGrid>
                <FxGroup zh={ ZH.noHkid } title={ translation("key_if_employer_no_hk_identity_card") } na={ !noHkid }>
                    <FxGrid>
                        <FxField k="employer_travel_document_type" zh={ ZH.docHeld } label={ translation("key_travel_document_held") } na={ !noHkid } />
                        <FxField k="employer_travel_document_number" label={ translation("key_fx_travel_document_no") } type="mono" w="s" na={ !noHkid } />
                    </FxGrid>
                </FxGroup>
                <FxGrid>
                    <FxField k="employer_residential_address" zh={ ZH.res } label={ translation("key_residential_address") } type="textarea" w="l" note={ `${ ZH.border } ${ translation("key_fx_fill_within_border") }` } maxLength={ 250 } />
                    <FxField k="employer_correspondence_address" zh={ ZH.corr } label={ translation("key_correspondence_address_if_different") } type="textarea" w="l" note={ `${ ZH.border } ${ translation("key_fx_fill_within_border") }` } maxLength={ 250 } />
                    <FxField k="employer_day_time_contact_telephone_number" label={ translation("key_fx_contact_telephone_no") } w="s" maxLength={ 20 } />
                    <FxField k="employer_contact_telephone_ext" label={ translation("key_ext") } w="xs" maxLength={ 6 } />
                    <FxField k="employer_fax_number" label={ translation("key_fx_fax_no") } w="s" maxLength={ 20 } />
                    <FxField k="employer_home_telephone_number" zh={ ZH.homeTel } label={ translation("key_home_telephone_number") } w="s" maxLength={ 20 } />
                    <FxField k="employer_contact_email" label={ translation("key_email_address_if_any") } maxLength={ 100 } />
                </FxGrid>
            </FxSection>

            <FxSection num="2." zh={ ZH.s2 } title={ translation("key_fx_information_on_domestic_helper") }>
                <FxGrid>
                    <FxField k="ui_worker_full_name" zh={ ZH.helperName } label={ translation("key_name_of_the_helper") } type="ro" w="l" value={ workerFullName(m) } />
                    <FxField k="helper_application_reference_no" zh={ ZH.refNo } label={ translation("key_fx_application_reference_no_if_any") } type="mono" maxLength={ 30 } />
                    <FxField k="relationship_with_helper" zh={ ZH.rel } label={ translation("key_relationship_with_the_helper") } maxLength={ 100 } />
                </FxGrid>
                <FxGroup zh={ ZH.employment } title={ translation("key_employment_of_the_helper") }>
                    <div className="fx-employment">
                        <FxTick k="employment_of_the_helper" value={ CR_FX.EMPLOYMENT.FIRST } zh={ ZH.first }>{ translation("key_first_time_employment") }</FxTick>
                        <FxTick k="employment_of_the_helper" value={ CR_FX.EMPLOYMENT.RENEWAL } zh={ ZH.renewal }>{ translation("key_contract_renewal_with_the_same_helper") }</FxTick>
                        <div className="fx-employment-replace">
                            <FxTick k="employment_of_the_helper" value={ CR_FX.EMPLOYMENT.REPLACE } zh={ ZH.replace }>{ translation("key_replacement") }</FxTick>
                            <FxGrid>
                                <FxField k="name_of_helper_being_replaced" zh={ ZH.replacedName } label={ translation("key_name_of_domestic_helper_being_replaced") } w="l" na={ !isReplace } maxLength={ 100 } />
                                <FxField k="hk_id_of_helper_being_replaced" label={ translation("key_hk_identity_card_number") } type="mono" w="s" na={ !isReplace } maxLength={ 12 } />
                                <FxField k="contract_termination_date" zh={ ZH.termDate } label={ translation("key_date_of_termination_contract") } type="date" w="s" na={ !isReplace } />
                            </FxGrid>
                        </div>
                        <div className="fx-employment-additional">
                            <FxTick k="employment_of_the_helper" value={ CR_FX.EMPLOYMENT.ADDITIONAL } zh={ ZH.additional }>{ translation("key_additional") }</FxTick>
                            <FxPara indent>{ translation("key_please_attach_a_letter_to_state") }</FxPara>
                        </div>
                    </div>
                </FxGroup>
            </FxSection>

            <FxSection num="2." zh={ ZH.s2b } title={ translation("key_fx_information_on_domestic_helper_continued") }>
                <FxPara>{ translation("key_if_application_approved_then_helper_home_leave_criteria") }</FxPara>
                <div className={ `fx-homeleave${ isRenew ? "" : " fx-na" }` }>
                    <FxTick k="entry_visa" value={ CR_FX.ENTRY_VISA.RENEW_LEAVE } na={ !isRenew || appResolved }>{ translation("key_to_leace_before_commencement_of_the_new_contract") }</FxTick>
                    <FxTick k="entry_visa" value={ CR_FX.ENTRY_VISA.RENEW_DEFER } na={ !isRenew || appResolved }>{ translation("key_manual_agreed_to_defer_leave") } ({ translation("key_reason") }: <FxBlank k="mututaly_agreed_defer_leave_reason" size="l" na={ !isRenew || !defer } label={ translation("key_reason") } />)</FxTick>
                </div>
                <FxItem note num={ `${ ZH.note1 } ${ translation("key_fx_note_1") }` }>{ translation("key_employer_shall_arrange_the_helper_form") }</FxItem>
            </FxSection>

            <FxSection num="3." zh={ ZH.s3 } title={ translation("key_household_information") }>
                <FxPara>{ translation("key_please_declare_wheather_average_monthly_household") }</FxPara>
                <FxGrid>
                    <FxField k="employer_monthly_household_check" type="radio" options={ [{ value: CR_FX.YES_NO.YES, label: translation("key_yes"), zh: ZH.yes }, { value: CR_FX.YES_NO.NO, label: translation("key_no"), zh: ZH.no }] } w="xs" />
                    <FxField k="employer_monthly_household" zh={ ZH.income } label={ translation("key_average_monthly_household_income_no_less_than") } type="money" na={ m.employer_monthly_household_check !== CR_FX.YES_NO.YES } note={ `${ ZH.proof } ${ translation("key_except_for_contract_renewal_please_provide_proof") }` } />
                    <FxField k="employer_bedroom_no" zh={ ZH.bedrooms } label={ translation("key_fx_number_of_bedrooms") } type="num" w="xs" maxLength={ 2 } />
                    <FxField k="separate_servant_room" zh={ ZH.servant } label={ translation("key_separate_servant_room") } type="radio" opts="yn" w="s" />
                </FxGrid>
                <FxPara>{ translation("key_particulars_of_household_members_residing") } { translation("key_number_of_household_members_must_match_with_paragraph2") }</FxPara>
                <FxTable k="employer_family" columns={ MEMBER_COLUMNS() } blank={ BLANK_MEMBER } addLabel={ translation("key_fx_add_household_member") } emptyLabel={ translation("key_fx_no_household_members") } />
                <FxPara>{ translation("key_details_of_domestic_helpers") }</FxPara>
                <FxTable k="employer_workers" columns={ HELPER_COLUMNS() } blank={ BLANK_HELPER } addLabel={ translation("key_add_helper") } emptyLabel={ translation("key_fx_no_helper_employed") } />
            </FxSection>

            <FxSection num="4." zh={ ZH.s4 } title={ translation("key_declaration") } sub={ `${ ZH.s4sub } ${ translation("key_fx_only_item_with_blank") }` }>
                <FxItem num="(c)"><span className="fx-zh">{ ZH.declC }</span>{ translation("key_i_will_assume_responsibility_for_helper") } <FxBlank k="worker_origin_place" size="l" label={ translation("key_place_of_origin") } /> { translation("key_place_of_origin_failure_to_leave") }</FxItem>
            </FxSection>

            <FxSection num="5." zh={ ZH.s5 } title={ translation("key_undertaking") } sub={ `${ ZH.s4sub } ${ translation("key_fx_only_item_with_blank_undertaking") }` }>
                <FxItem num="(i)"><span className="fx-zh">{ ZH.undI }</span>{ translation("key_fx_undertaking_i_contract_no") } <FxBlank k="contract_number" size="s" type="mono" label={ translation("key_fx_dh_contract_no") } />)</FxItem>
            </FxSection>
        </div>
    );
};

export default Id988bForm;
