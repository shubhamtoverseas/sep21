export const addAgencyFormState = {
    agency_name: '',
    agency_code: '',
    agency_type: 'external',
    agency_category: 'partner',
    agency_poc: '',
    agency_phone_number: '',
    agency_license: '',
    country_id: null,
    status: true,
}
export const clinicFormState = {
    clinic_name: '',
    agency_id: '',
    country_id: '',
    clinic_map_link: '',
    clinic_address: '',
    clinic_email: '',
}
export const addWorkerPromotionFormState = {
    agency_id: '',
    interview_mode: '',
    start_date: new Date(),
    end_date: new Date(),
    workerPromotionItemModel: [{ item: '', description: '' }],
    isInfinite: false,
};
export const addAgencyBranchFormState = {
    addAgencyFormState,
    branch_data: [
        {
            branch_name: '',
            branch_display_name_en: '',
            branch_display_name_in: '',
            branch_display_name_zh_CN: '',
            branch_code: '',
            branch_poc: '',
            branch_phone_number: '',
            branch_email: '',
            branch_address: '',
            branch_provinces: null,
            branch_time_zone: '',
            // branch_postal_code: '',
            branch_country_code: null,
            branch_google_map_link: '',
            off_days: [],
            sunday_branch_operating_start_time: '',
            sunday_branch_operating_end_time: '',
            monday_branch_operating_start_time: '',
            monday_branch_operating_end_time: '',
            tuesday_branch_operating_start_time: '',
            tuesday_branch_operating_end_time: '',
            wednesday_branch_operating_start_time: '',
            wednesday_branch_operating_end_time: '',
            thursday_branch_operating_start_time: '',
            thursday_branch_operating_end_time: '',
            friday_branch_operating_start_time: '',
            friday_branch_operating_end_time: '',
            saturday_branch_operating_start_time: '',
            saturday_branch_operating_end_time: '',
        }
    ],
};
export const addBranchFormState = {
    agency_id: '',
    branch_name: '',
    branch_display_name_en: '',
    branch_display_name_in: '',
    branch_display_name_zh_CN: '',
    branch_code: '',
    branch_poc: '',
    branch_phone_number: '',
    branch_email: '',
    branch_address: '',
    branch_provinces: '',
    branch_time_zone: '',
    // branch_postal_code: '',
    branch_country_code: '',
    branch_google_map_link: '',
    status: true,
    off_days: [],
    sunday_branch_operating_start_time: '',
    sunday_branch_operating_end_time: '',
    monday_branch_operating_start_time: '',
    monday_branch_operating_end_time: '',
    tuesday_branch_operating_start_time: '',
    tuesday_branch_operating_end_time: '',
    wednesday_branch_operating_start_time: '',
    wednesday_branch_operating_end_time: '',
    thursday_branch_operating_start_time: '',
    thursday_branch_operating_end_time: '',
    friday_branch_operating_start_time: '',
    friday_branch_operating_end_time: '',
    saturday_branch_operating_start_time: '',
    saturday_branch_operating_end_time: '',
};
export const addRoleFormState = {
    role_name: '',
    status: true,
}
export const addTemplateFormState = {
    module_key: "",
    category_id: "",
    language_id: "",
    template_name: "",
    dynamic_field_key: "",
    accessibility: "",
    template_content: "",
}

export const sendTemplateFormState = {
    module_key: "",
    category_id: "",
    language_id: "",
    template_name: "",
    channel: "",
    template_content: "",
    send_to: "",
}
export const leavePOlicyInitialFormState = {
    leaveType: "",
    accrualType: "",
    accrualRate: "",
    carryForwardMax: "",
    carryForwardType: "Percentage",
    encashMax: "",
    minThresholdToEncash: "",
    expiryInDays: "",
    effectiveFromDateOfHire: "",
    carryForwardable: "yes",
    encashable: "yes",
    expiry: "yes",
}
export const addUserDetailFormState = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_joining: '',
    role_id: '',
    whatsapp_country_code_name: '',
    // worker_staff_assign: [],
    // contract_staff_assign: [],
    spoken_languages: [],
    manager_id: '',
    password: '',
    personal_email: '',
    personal_phone: '',
    whatsapp: '',
    telephone: '',
    skype: '',
    facebook: '',
    airtable: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    bank_branch_code: '',
    bank_hkid_copy: '',
    bank_employment_contract: '',
    salary_amount: '',
    salary_mpf_contri_type: '',
    salary_mpf_contri_amount: '',
    salary_mpf_contri_rate: '',
    overtime_pay: '0',
    doop_id: '',
    leave_policy_id: '',
    holiday_list_id: '',
    prepared_groups: [],
    ready_groups: [],
    // contract_assign_type: '',
    // employer_assign_type: '',
    // worker_assign_type: '',
    // is_assign_employer: false,
    // is_assign_contract: false,
    // is_assign_worker: false,
    status: true,
    multifactor_email_authentication: false,
    staff_type: 'partner',
    staff_country_id: '',
    staff_agency_id: '',
    staff_branch_id: '',
    is_cs: 0,
    is_interpreter: 0,
    is_onboarding1: 0,
    is_onboarding2: 0,
    is_post_hire_interpreter: 0,
}
export const addHolidayFormState = {
    list_name: "",
    status: 1,
    holidays_data: [
        {
            holiday_name: "",
            holiday_date: null,
        },
    ],
}
export const addDoopFormState = {
    doop_name: '',
    status: true,
    off_days: [],
}
export const addAddressFormState = {
    type: '',
    address_line_1: '',
    address_line_2: '',
}

export const addCurrentWorkerFormState = {
    worker_name: '',
    employer_name: '',
    hk_id: '',
    staying_till_date_in_hk: '',
};

/* bug log #26 (fixed 2026-10-18): the first row carries the same keys as every added row (EMPTY_ROW in constants) */
export const addShiftCodeFormState = {
    shift_code_data: [
        {
            shift_code: "",
            shift_start_time: "",
            shift_end_time: "",
            duration: ""
        }
    ]
}
export const addLeaveFormState = {
    leave_policy_details_id: "",
    from_date: "",
    to_date: "",
    from_date_type: "",
    to_date_type: "",
    comment: ""
}
export const timeRequestFormState = {
    date: null,
    durationHours: 1,
    durationMinutes: 1,
    comment: '',
    attachment: null,
};

export const timeRequestActionFormState = {
    time_approved_hours: 1,
    time_approved_minutes: 1,
    admin_comment: ''
};

export const managerApprovedTimeEntryFormState = {
    user_id: "",
    from_date: null,
    from_time: null,
    to_time: null,
    hours: null,
    minutes: null,
    comment: "",
};

export const manualUpdateLeaveFormState = {
    method: '',
    leave_policy_details_id: '',
    user_id: '',
    leave_count: '',
};

export const profileUpdate = {
    mobile_number: '',
    hk_id: '',   /* backend 341: the server field is hk_id (the old `HKID` key never reached it) */
    birth_date: '',
    address1: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    whatsapp: '',
    telephone: '',
    personal_email: '',
    skype: '',
    facebook: '',
    instagram: '',
    airtable: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    bank_branch_code: '',
    bank_remarks: '',
    bank_hkid_copy: '',
    bank_copy: '',
    bank_employment_contract: '',
};
export const empBasicDetailFormState = {
    title: "",
    surname: "",
    name: "",
    chinese_name: "",
    gender: "",
    birth_date: "",
    hk_id: "",
    nationality: "",
    spoken_language: "",
}
export const addressDetailFormState = {
    primary_residential_address: {
        address_line_1: ""
    },
    primary_correspondence_address: {
        address_line_1: ""
    },
    nationality_info: {
        name: ""
    },
    district_info: {
        name: ""
    },
    isSameAsResidential: false
};
export const currentWorkerFormState = {
    workers: [
        {
            worker_name: "",
            employer_name: "",
            hk_id: "",
            staying_till_date_in_hk: "",
        }
    ]
};
export const addEmployerFormState = {
    device_type: 1,
    title: "",
    name: "",
    surname: "",
    chinese_name: "",
    country_code: "",
    mobile_number: "",
    whatsapp_country_code: "",
    whatsapp_number: "",
    email: "",
    spoken_language: "",
    nationality: "",
    district: null,
    branch_id: '',
    whatsapp_confirmed: false,
}

export const addEmployerOfInvoiceFormState = {
    device_type: 1,
    title: "",
    name: "",
    surname: "",
    chinese_name: "",
    country_code: "",
    mobile_number: "",
    whatsapp_country_code: "",
    whatsapp_number: "",
    email: "",
    spoken_language: "",
    nationality: "",
    district: "",
    branch_id: '',
    birth_date: "",
    correspondence_address: "",
    residential_address: "",
    source: "",
    occupation: "",
    //birth_year_only: "",
    hk_id: ""
}

export const updateLocalWorkerOfInvoiceFormState = {
    name: "",
    surname: "",
    maiden_surname: "",
    alias_name: "",
    country_code: "",
    mobile_number: "",
    whatsapp_country_code: "",
    whatsapp_number: "",
    email: "",
    home_country_code: "",
    home_phone_number: "",
    nationality: "",
    hk_id: "",
    wait_in_macau: "",
    early_release_date: "",
    visa_expiry_date: "",
    contract_end_date: "",
    contract_category: "",
    contract_status: "",
    expect_released_early: "",
    terminated_reason: "",
}

/* Edit Worker panel (Name + Contact): only the fields the panel shows travel to /update-worker-details —
   a field it does not render (hk_id, maiden_surname, alias_name, other mobile, nationality…) is never sent,
   so its stored value stays untouched (backend ruling, 9 Nov) */
export const workerBasicProfileUpdate = {
    name: "",
    surname: "",
    country_code: "",
    mobile_number: "",
    whatsapp_country_code: "",
    whatsapp_number: "",
    email: "",
}

export const updateGeneralLocalWorkerOfInvoiceFormState = {

    name: "",
    surname: "",
    country_code: "",
    mobile_number: "",
    hk_id: "",
    date_of_birth: "",
    passport_number: "",
    country_code_name: "",

    // name: "",
    // surname: "",
    // maiden_surname: "",
    // alias_name: "",
    // country_code: "",
    // mobile_number: "",
    // whatsapp_country_code: "",
    // whatsapp_number: "",
    // email: "",
    // home_country_code: "",
    // home_phone_number: "",
    // country_code_name: "",
    // whatsapp_country_code_name: "",
    // date_of_birth: "",
    // passport_number: "",
    // mobile_verified: 0,
    // whatsapp_verified: 0,
    // whatsapp_verified_at:null,
    // nationality: "",
    // hk_id: "",
    // contract_category: "",
    // wait_in_macau: "",
    // early_release_date: "",
    // visa_expiry_date: "",
    // contract_end_date: "",
    // contract_status: "",
    // expect_released_early: "",
}

export const updateOverseasWorkerOfInvoiceFormState = {
    name: "",
    surname: "",
    maiden_surname: "",
    alias_name: "",
    country_code: "",
    mobile_number: "",
    whatsapp_country_code: "",
    whatsapp_number: "",
    email: "",
    home_country_code: "",
    home_phone_number: "",
    nationality: "",
    hk_id: "",
    contract_category: "",
    expect_released_early: "",
}

export const updateGeneralOverseasWorkerOfInvoiceFormState = {
    name: "",
    surname: "",
    country_code: "",
    mobile_number: "",
    hk_id: "",
    date_of_birth: "",
    passport_number: "",
    country_code_name: "",
    // name: "",
    // surname: "",
    // maiden_surname: "",
    // alias_name: "",
    // country_code: "",
    // mobile_number: "",
    // whatsapp_country_code: "",
    // whatsapp_number: "",
    // // email: "",
    // home_country_code: "",
    // home_phone_number: "",
    // country_code_name: "",
    // whatsapp_country_code_name: "",
    // mobile_verified: 0,
    // whatsapp_verified: 0,
    // whatsapp_verified_at: null,
    // nationality: "",
    //hk_id: "",
    // contract_category: ""
}
export const updateEmployerFormState = {
    employer_id: null,
    title: "",
    name: "",
    surname: "",
    chinese_name: "",
    country_code: "",
    mobile_number: "",
    gender: "",
    whatsapp_country_code: "",
    whatsapp_number: "",
    email: "",
    spoken_language: "",
    nationality: "",
    district: null,
    location: "",
    location_country_code: "",
    branch_id: null,
    birth_date: '',
    hk_id: '',
    occupation: "",
    travel_document_held: "",
    travel_document_number: "",
    contact_telephone_number: "",
    contact_telephone_ext: "",
    home_telephone_number: "",
    residential_address_id: 1,
    residential_address_line_1: "",
    correspondence_address_id: "",
    correspondence_address_line_1: "",
    current_worker: []
}

export const instantInterviewFormState = {
    status: 6,
    type: "update_original",
    comment: "",
}

export const workerBioProfileState = {
    current_location: "",
    earliest_can_start_date: "",
    contract_status: "",
    age: "",
    contract_end_date: null,
    contract_can_start_date: null,
    open_to_working_in: [],
    job_status: "",
    role: "",
    gender: "",
    nationality: "",
    religion: "",
    height: "",
    weight: 0,
    date_of_birth: null,
    spoken_language: [],
    marital_status: "",
    oldest_child_age: 0,
    children_count: 0,
    siblings_count: 0,
    //language: [],
    special_course: [],
    education: "",
    college_name: "",
    skills: [],
    cooking: [],
    care_newborn: 0,
    day_off: "",
    care_disability: 0,
    interview_day: [],
    share_work: 0,
    reference_letter: 0,
    share_room: 0,
    additional_info: "",
    work_experience: 0,
    care_elderly: 0,
    visa_expiry_date: "",
    expect_released_early: "0",
    early_release_date: "",
    age_of_elder: null,
    child_care_age_ids: [],
    preferred_interview_locations: [],
}

export const workerExperienceState =
{
    id: "",
    worker_role: "",
    spoken_language: [],
    work_country_id: "",
    end_date: "",
    domestic_experience: "",
    employer_nationality: "",
    start_date: "",
    family_size: "",
    house_size: "",
    district_id: "",
    cooking: [],
    main_duties: []
}

export const addUpdateWorkerBioState = {
    start_date: new Date().toISOString().split('T')[0]
}

export const saveWorkerBasicProfileState = {
    surname: "",
    name: "",
    chinese_name: "",
    maiden_surname: "",
    alias_name: "",
    marital_status: "",
    hk_id: "",
    nationality: "",
    date_of_birth: "",
    birth_place: "",
    origin_place: "",
    occupation: "",
    primary_present_address: "",
    primary_domicile_address: "",
    current_employer_name: "",
    current_employer_address_line_1: "",
    worker_employer: []
}

export const editProfileState = {
    title: "",
    chinese_name: "",
    name: "",
    surname: "",
    country_code: "",
    whatsapp_number: "",
    whatsapp_country_code: "",
    mobile_number: "",
    alternate_mobile_country_code: "",
    alternate_mobile_number: "",
    email: "",
}

export const saveWorkerConsulateState = {
    sss_number: "",
    phill_health_number: "",
    pag_ibig_number: "",
    beneficiary_name: "",
    beneficiary_contact: "",
    beneficiary_address: "",
    relationship_with_worker: ""
}


export const saveWorkerConsulateStateIndo = {
    ktp: "",
    nama_suami: "",
    nama_ayah: "",
    nama_ibu: ""
}

export const workerUploadPassportState = {
    passport_number: "",
    passport_place_of_issue: "",
    passport_issue_date: "",
    passport_expiry_date: ""
}

export const saveWorkerPassportDocUploadState = {
    name_in_passport: "",
    birth_date_in_passport: "",
    birth_place_in_passport: "",
    passport_number: "",
    passport_issue_date: "",
    passport_expiry_date: ""
}

export const eVisaFormState = {
    visa_reference_no: "",
    e_visa_payment_date: null,
    ac_refunded: "1",
}
