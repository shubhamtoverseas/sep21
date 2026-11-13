import React from "react";
import translation from "../../../../utils/translation";
import { CR_FORM, CR_FORM_OFFICIAL, CR_FX } from "../contractConstants";
import { FxBlank, FxCheck, FxField, FxGrid, FxGroup, FxItem, FxLabel, FxPara, FxSection, FxTable, FxTick, useForms } from "./FxControls";
import { BLANK_WORK } from "./formsModel";
import { WORK_COLUMNS } from "./MasterForm";

/**
 * ID 988A (06/2024) — Visa / Extension of Stay Application Form for Domestic Helper from Abroad (to be completed by the
 * helper): prototype form988AHTML. Bilingual ImmD headings are official identifiers (SR-06) and stay literal.
 * The photograph, signatures, attestation and the Statement of Purpose live on the official PDF only (workbook #63).
 */
const ZH = Object.freeze({
    org: "香港特別行政區政府入境事務處", title: "從外國受聘來港家庭傭工簽證／延長逗留期限申請表 (由傭工填寫)",
    s1: "申請類別", s2: "個人資料", s2b: "個人資料（續）", s3: "家庭傭工的工作經驗 (按日期先後順序列出)", s4: "延長逗留期限", s5: "申請人的聲明", s6: "承諾",
    s1sub: "(請選擇下列申請類別", s4sub: "(適用於本表第 1 部分所述的 (b)(ii) 或 (c) 類申請。)", s6sub: "(只列出需要作出選擇的項目；全文載於官方表格)",
    a: "來港受僱為外籍家庭傭工", b: "與同一僱主續約或轉換僱主", b1: "緊接在履行新合約前返回原居地度假；或", b2: "押後返回原居地度假", c: "完成現有合約的剩餘／延長期間",
    entry: "入境簽證", entryExt: "入境簽證及延期逗留", ext: "延期逗留",
    surname: "姓 (英文)", given: "名 (英文)", maiden: "婚前姓氏 (如適用)", alias: "別名 (如有)", sex: "性別", dob: "出生日期", pob: "出生地點", marital: "婚姻狀況", hkid: "香港身份證號碼",
    nationality: "國籍", occupation: "職業", docType: "旅行證件類別", docNo: "旅行證件號碼", issuePlace: "簽發地點", issueDate: "簽發日期", expiry: "期滿日期",
    present: "現時住址", domicile: "居籍地址 (如與上述不同)", border: "(請在界內填寫)", tel: "聯絡電話號碼", extn: "內線", fax: "傳真號碼", email: "電郵地址 (如有)",
    curEmp: "現時僱主的姓名 (如適用)", curEmpAddr: "現時僱主的地址 (如適用)", total: "任職家庭傭工的工作經驗年資總計", years: "年", months: "月",
    status: "現時在港逗留的身份", until: "現時獲准在港逗留至", purpose: "申請目的", note: "附註:",
});

const Id988aForm = () => {
    const { model: m, lookups } = useForms();
    const t = m.entry_visa;
    const appResolved = Boolean(m.ui_app_type?.resolved);   /* K-18: the type follows Immigration */
    const isA = t === CR_FX.ENTRY_VISA.ENTRY;
    const isExt = t === CR_FX.ENTRY_VISA.RENEW_DEFER || t === CR_FX.ENTRY_VISA.EXTEND;
    const hasHkid = m.ui_worker_has_hk_id === CR_FX.YES_NO.YES;
    const declPair = (num, k, yesKey, noKey, detailKey, na) => (
        <div className={ `fx-decl${ na ? " fx-na" : "" }` }>
            <FxItem num={ num } na={ na }>
                <FxTick k={ k } value={ CR_FX.YN.NO } na={ na }>{ translation(noKey) }</FxTick>
                <FxTick k={ k } value={ CR_FX.YN.YES } na={ na }>{ translation(yesKey) }</FxTick>
            </FxItem>
            <div className="fx-decl-detail"><FxGrid><FxField k={ detailKey } type="textarea" rows={ 2 } w="full" na={ na || m[k] !== CR_FX.YN.YES } label={ translation("key_fx_details") } maxLength={ 250 } /></FxGrid></div>
        </div>
    );
    return (
        <div className="fx-form fx-official">
            <div className="fx-formhead">
                <div className="fx-formhead-org"><span className="fx-zh">{ ZH.org }</span>{ translation("key_fx_immd_org") }</div>
                <div className="fx-formhead-title"><span className="fx-zh">{ ZH.title }</span>{ translation("key_fx_988a_title") } <em>({ translation("key_fx_to_be_completed_by_helper") })</em></div>
                <span className="fx-formhead-ref">{ CR_FORM_OFFICIAL[CR_FORM.ID988A].version }</span>
            </div>

            <FxSection num="1." zh={ ZH.s1 } title={ translation("key_fx_application_type") } sub={ `${ ZH.s1sub } ${ translation("key_fx_select_application_type_below") })` }>
                <div className="fx-apptype">
                    <div className="fx-apptype-row"><FxTick k="entry_visa" value={ CR_FX.ENTRY_VISA.ENTRY } zh={ ZH.a } na={ appResolved }>(a) { translation("key_entry_to_hk_for_domestic_helper") }</FxTick><div className="fx-apptype-out"><span className="fx-zh">{ ZH.entry }</span>{ translation("key_entry_visa") }</div></div>
                    <div className="fx-apptype-row fx-apptype-b">
                        <div className="fx-apptype-bhead"><span className="fx-item-num">(b)</span><div><span className="fx-zh">{ ZH.b }</span>{ translation("key_contract_renewal_same_employer_or_change_employer") }</div></div>
                        <div className="fx-apptype-row fx-apptype-sub"><FxTick k="entry_visa" value={ CR_FX.ENTRY_VISA.RENEW_LEAVE } zh={ ZH.b1 } na={ appResolved }>(i) { translation("key_taking_home_leave_before_new_contract") }</FxTick><div className="fx-apptype-out"><span className="fx-zh">{ ZH.entry }</span>{ translation("key_entry_visa") }</div></div>
                        <div className="fx-apptype-row fx-apptype-sub"><FxTick k="entry_visa" value={ CR_FX.ENTRY_VISA.RENEW_DEFER } zh={ ZH.b2 } na={ appResolved }>(ii) { translation("key_deferring_home_leave") }</FxTick><div className="fx-apptype-out"><span className="fx-zh">{ ZH.entryExt }</span>{ translation("key_fx_entry_visa_and_extension") }</div></div>
                    </div>
                    <div className="fx-apptype-row"><FxTick k="entry_visa" value={ CR_FX.ENTRY_VISA.EXTEND } zh={ ZH.c } derived>(c) { translation("key_complete_remaining_extended_period_current_contract") }</FxTick><div className="fx-apptype-out"><span className="fx-zh">{ ZH.ext }</span>{ translation("key_extension_of_stay") }</div></div>
                </div>
            </FxSection>

            <FxSection num="2." zh={ ZH.s2 } title={ translation("key_fx_personal_particulars") }>
                <FxGrid>
                    <FxField k="worker_surname" zh={ ZH.surname } label={ translation("key_surname_in_english") } w="l" req />
                    <FxField k="worker_name" zh={ ZH.given } label={ translation("key_given_names_in_english") } w="l" req />
                    <FxField k="worker_maiden_surname" zh={ ZH.maiden } label={ translation("key_maiden_surname_if_applicable") } />
                    <FxField k="worker_chinese_name" label={ translation("key_name_in_chinese_if_applicable") } />
                    <FxField k="worker_alias_name" zh={ ZH.alias } label={ translation("key_alias_if_any") } />
                    <FxField k="worker_gender" zh={ ZH.sex } label={ translation("key_sex") } type="radio" opts="sex" w="s" />
                    <FxField k="worker_date_of_birth" zh={ ZH.dob } label={ translation("key_date_of_birth") } type="date" w="s" />
                    <FxField k="worker_birth_place" zh={ ZH.pob } label={ translation("key_place_of_birth") } />
                    <FxField k="worker_marital_status" zh={ ZH.marital } label={ translation("key_marital_status") } type="radio" options={ lookups.maritalStatus } w="full" />
                    <div className="fx-cell fx-w-l">
                        <FxLabel zh={ ZH.hkid }>{ translation("key_fx_hk_identity_card_no") }</FxLabel>
                        <div className="fx-hkid">
                            <FxField k="ui_worker_has_hk_id" type="radio" opts="yesno" w="s" />
                            <FxField k="worker_hk_id" type="mono" w="s" na={ !hasHkid } maxLength={ 12 } />
                        </div>
                    </div>
                    <FxField k="worker_nationality" zh={ ZH.nationality } label={ translation("key_nationality") } type="select" opts="workerNationality" w="s" />
                    <FxField k="worker_occupation" zh={ ZH.occupation } label={ translation("key_occupation") } w="s" />
                    <FxField k="worker_travel_document_type" zh={ ZH.docType } label={ translation("key_fx_travel_document_type") } w="s" />
                    <FxField k="worker_passport_number" zh={ ZH.docNo } label={ translation("key_fx_travel_document_no") } type="mono" w="s" />
                    <FxField k="worker_passport_place_of_issue" zh={ ZH.issuePlace } label={ translation("key_place_of_issue") } />
                    <FxField k="worker_passport_issue_date" zh={ ZH.issueDate } label={ translation("key_date_of_issue") } type="date" w="s" />
                    <FxField k="worker_passport_expiry_date" zh={ ZH.expiry } label={ translation("key_date_of_expiry") } type="date" w="s" />
                </FxGrid>
            </FxSection>

            <FxSection num="2." zh={ ZH.s2b } title={ translation("key_fx_personal_particulars_continued") }>
                <FxGrid>
                    <FxField k="ui_worker_present_address" zh={ ZH.present } label={ translation("key_present_address") } type="textarea" w="l" note={ `${ ZH.border } ${ translation("key_fx_fill_within_border") }` } maxLength={ 250 } />
                    <FxField k="ui_worker_domicile_address" zh={ ZH.domicile } label={ translation("key_fx_domicile_address_if_different") } type="textarea" w="l" note={ `${ ZH.border } ${ translation("key_fx_fill_within_border") }` } maxLength={ 250 } />
                    <FxField k="worker_contact_telephone_number" zh={ ZH.tel } label={ translation("key_fx_contact_telephone_no") } w="s" maxLength={ 20 } />
                    <FxField k="worker_contact_telephone_ext" zh={ ZH.extn } label={ translation("key_ext") } w="xs" maxLength={ 6 } />
                    <FxField k="worker_fax_number" zh={ ZH.fax } label={ translation("key_fx_fax_no") } w="s" maxLength={ 20 } />
                    <FxField k="worker_contact_email" zh={ ZH.email } label={ translation("key_email_address_if_any") } maxLength={ 100 } />
                    <FxField k="worker_current_employer_name" zh={ ZH.curEmp } label={ translation("key_name_of_current_employer_if_applicable") } w="l" maxLength={ 100 } />
                    <FxField k="worker_current_employer_address_line_1" zh={ ZH.curEmpAddr } label={ translation("key_address_of_current_employer_if_applicable") } type="textarea" rows={ 1 } w="l" maxLength={ 250 } />
                </FxGrid>
            </FxSection>

            <FxSection num="3." zh={ ZH.s3 } title={ translation("key_fx_working_experience_as_dh") } sub={ translation("key_no_need_complete_if_applying_for_renewal") } na={ !isA }>
                <FxTable k="worker_employers" columns={ WORK_COLUMNS() } blank={ BLANK_WORK } addLabel={ translation("key_fx_add_employer") } emptyLabel={ translation("key_fx_no_previous_employment") } na={ !isA } />
                <div className={ `fx-inline-row${ isA ? "" : " fx-na" }` }>
                    <span className="fx-lab"><span className="fx-zh">{ ZH.total } </span>{ translation("key_total_duration_of_working_experience_domestic_helper") }</span>
                    <FxBlank k="worker_work_experience" size="xs" na={ !isA } label={ translation("key_years") } /> { ZH.years } { translation("key_years") }
                    <FxBlank k="worker_work_experience_in_months" size="xs" na={ !isA } label={ translation("key_months") } /> { ZH.months } { translation("key_months") }
                </div>
            </FxSection>

            <FxSection num="4." zh={ ZH.s4 } title={ translation("key_extension_of_stay") } sub={ `${ ZH.s4sub } ${ translation("key_fx_applicable_to_b2_or_c") }` } na={ !isExt }>
                <FxGroup num="(a)" zh={ ZH.status } title={ translation("key_fx_current_status_in_hong_kong") } na={ !isExt }>
                    <FxGrid>
                        <FxField k="worker_current_status_in_hongkong" type="radio" opts="status" na={ !isExt } />
                        <FxField k="worker_current_status_other_text" label={ translation("key_fx_others_please_specify") } na={ !isExt || m.worker_current_status_in_hongkong !== CR_FX.STATUS.OTHER } maxLength={ 100 } />
                        <FxField k="worker_permit_date_in_hong_kong" zh={ ZH.until } label={ translation("key_fx_currently_permitted_until") } type="date" w="s" na={ !isExt } />
                    </FxGrid>
                </FxGroup>
                <FxGroup num="(b)" zh={ ZH.purpose } title={ translation("key_fx_purpose_of_application") } na={ !isExt }>
                    <div className="fx-purpose">
                        <FxTick k="entry_visa" value={ CR_FX.ENTRY_VISA.RENEW_DEFER } derived na={ t !== CR_FX.ENTRY_VISA.RENEW_DEFER }><b>{ translation("key_extension_of_stay_application_deferring_home_leave") }</b></FxTick>
                        <FxPara indent>{ translation("key_defer_home_leave_max_1_year") } { translation("key_i_now_apply_to_extend_my_stay_until") } <FxBlank k="worker_purpose_of_application_date" type="date" na={ t !== CR_FX.ENTRY_VISA.RENEW_DEFER } label={ translation("key_apply_extend_stay_until") } /> { translation("key_apply_extend_stay_for_new_contract") }.</FxPara>
                        <FxTick k="entry_visa" value={ CR_FX.ENTRY_VISA.EXTEND } derived na={ t !== CR_FX.ENTRY_VISA.EXTEND }><b>{ translation("key_extension_of_stay_application_remaining_period") }</b> { translation("key_fx_provide_supporting_letter") }</FxTick>
                        <FxPara indent>{ translation("key_i_now_apply_to_extend_my_stay_until") } <FxBlank k="worker_purpose_of_application_date" type="date" na={ t !== CR_FX.ENTRY_VISA.EXTEND } label={ translation("key_apply_extend_stay_until") } /> { translation("key_supporting_letter_for_continuous_employment") }.</FxPara>
                    </div>
                </FxGroup>
            </FxSection>

            <FxSection num="5." zh={ ZH.s5 } title={ translation("key_fx_declaration_of_applicant") }>
                <FxPara>{ translation("key_apply_immigration_department_visa_extension") }</FxPara>
                { declPair("(i)(a)", "worker_change_name_option", "key_used_previous_names", "key_fx_not_changed_name", "worker_change_name", false) }
                { declPair("(b)", "worker_refused_visa", "key_previous_refusal_details", "key_fx_never_refused_visa", "worker_refused_visa_details", false) }
                <FxPara indent>{ translation("key_fx_decl_c_only_type_a") }</FxPara>
                { declPair("(c)", "convicted_of_any_crime", "key_previous_conviction_details", "key_fx_never_convicted", "convicted_of_any_crime_details", !isA) }
            </FxSection>

            <FxSection num="6." zh={ ZH.s6 } title={ translation("key_undertaking") } sub={ `${ ZH.s6sub } ${ translation("key_fx_only_item_needing_choice") }` }>
                <FxPara>{ translation("key_undertake_to_govt_of_hong_kong") }</FxPara>
                <FxItem num="(i)">{ translation("key_fx_undertaking_i_contract_no") } <FxBlank k="contract_number" size="s" type="mono" label={ translation("key_fx_dh_contract_no") } />)</FxItem>
                <FxItem num="(ii)"><FxCheck k="worker_undertaking_live_in" yes={ CR_FX.YES_NO.YES } no={ CR_FX.YES_NO.NO }>{ translation("key_helper_reside_only_in_given_residence") } { translation("key_fx_delete_if_inappropriate") }</FxCheck></FxItem>
                <FxItem note num={ `${ ZH.note } ${ translation("key_fx_note") }` }>{ translation("key_fx_live_out_note") }</FxItem>
            </FxSection>
        </div>
    );
};

export default Id988aForm;
