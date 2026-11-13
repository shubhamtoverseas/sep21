export const UPDATE_FORM = "UPDATE_FORM";

export const validateInput = (name, value) => {
  let hasError = false,
    error = "";
  switch (name) {
    case "title":
      if (value.trim() === "") {
        hasError = true;
        error = "Title can't be empty";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "name":
      if (value.trim() === "") {
        hasError = true;
        error = "Name can't be empty";
      } else if (!/^[a-zA-Z ]+$/.test(value)) {
        hasError = true;
        error = "Invalid name. avoid special characters";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "surname":
      if (value.trim() === "") {
        hasError = true;
        error = "Name can't be empty";
      } else if (!/^[a-zA-Z ]+$/.test(value)) {
        hasError = true;
        error = "Invalid name. avoid special characters";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "country_code":
      if (value.trim() === "") {
        hasError = true;
        error = "Please Select a country code";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "password":
      if (value.trim() === "") {
        hasError = true;
        error = "Password can't be empty";
      } else if (value.trim().length < 8) {
        hasError = true;
        error = "Password must have at least 8 characters";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "mobile_number":
      if (value.trim() === "") {
        hasError = true;
        error = "Number can't be empty";
      } else if (!/^[0-9]+$/.test(value)) {
        hasError = true;
        error = "Invalid mobile number";
      } else if (value.length < 8 || value.length > 14) {
        hasError = true;
        error = "Invalid mobile number";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "whatsapp_number":
      if (value === "") {
        hasError = false;
        error = "";
      } else if (!/^[0-9]+$/.test(value)) {
        hasError = true;
        error = "Invalid mobile number";
      } else if (value.length < 8 || value.length > 14) {
        hasError = true;
        error = "Invalid mobile number";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "spoken_language":
      if (value.length === 0) {
        hasError = true;
        error = "Please Select a language";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "nationality":
      if (value === "") {
        hasError = true;
        error = "Please Select nationality";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "hk_id":
      if (value.trim() === "") {
        hasError = false;
        error = "";
      } else if (!/^([A-Z]{1,2}[0-9]{6})+$/.test(value)) {
        hasError = true;
        error = "Invalid HKID";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "role_id":
      if (value === "") {
        hasError = true;
        error = "Please Select role";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "flexible_start_date":
      if (value.trim() === "") {
        hasError = true;
        error = "Please Select flexible date";
      } else {
        hasError = false;
        error = "";
      }
      break;

    case "main_duties":
      if (value.length === 0) {
        hasError = true;
        error = "Please Select duties";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "job_skill":
      if (value.length === 0) {
        hasError = true;
        error = "Please Select skills";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "interview_availabilty":
      if (value.length === 0) {
        hasError = true;
        error = "Please Select interview slots";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "cooking":
      if (value.length === 0) {
        hasError = true;
        error = "Please Select type of cooking";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "employer_nationality":
      if (value === "") {
        hasError = true;
        error = "Please Select a course";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "district":
      if (value === "") {
        hasError = true;
        error = "Please Select a district";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "care_kids_count_info":
      for (const key in value) {
        if (value[key].age === 0) {
          hasError = true;
          error = "Please enter kid's age";
          break;
        } else {
          hasError = false;
          error = "";
        }
        // if (value[key].age === 0) {
        //   hasError = true;
        //   error = "Please enter kid's age";
        //   break;
        // } else if (
        //   /^[a-zA-Z ]+$/.test(value[key].age) ||
        //   value[key].age < value[key].minAge ||
        //   value[key].age > value[key].maxAge
        // ) {
        //   hasError = true;
        //   error =
        //     "Kid's age must be between " +
        //     value[key].minAge +
        //     " and " +
        //     value[key].maxAge;
        //   break;
        // } else if (value[key].gender === 0) {
        //   hasError = true;
        //   error = "Please Select kid's gender";
        //   break;
        // } else {
        //   hasError = false;
        //   error = "";
        // }
      }
      break;
    case "care_elderly_count_info":
      for (const key in value) {
        if (value[key].age === 0) {
          hasError = true;
          error = "Please enter elder's age";
          break;
        } else if (
          /^[a-zA-Z ]+$/.test(value[key].age) ||
          value[key].age < 65 ||
          value[key].age > 110
        ) {
          hasError = true;
          error = "Elder's age must be between 65 and 110";
          break;
        } else if (value[key].gender === 0) {
          hasError = true;
          error = "Please Select elder's gender";
          break;
        } else {
          hasError = false;
          error = "";
        }
      }
      break;
    case "helper_accommadation":
      if (value === "") {
        hasError = true;
        error = "Please Select accomadation";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "day_off":
      if (value === "") {
        hasError = true;
        error = "Please Select day off value";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "holiday_leave":
      if (value === "") {
        hasError = true;
        error = "Please Select holiday leave";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "coworker_status":
      if (value === "") {
        hasError = true;
        error = "Please Select a coworker status";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "expected_salary":
      if (value === "") {
        hasError = true;
        error = "Please Select expected salary";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "max_salary":
      if (value === "") {
        hasError = true;
        error = "Please enter salary";
      } else if (!/^[0-9]+$/.test(value)) {
        hasError = true;
        error = "Invalid value";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "fixed_salary":
      if (value === "") {
        hasError = true;
        error = "Please enter salary";
      } else if (!/^[0-9]+$/.test(value)) {
        hasError = true;
        error = "Invalid Value";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "salary_bonus":
      if (value === "") {
        hasError = true;
        error = "Please Select a value";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "office_location":
      if (value === "") {
        hasError = true;
        error = "Please Select interview location";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "house_size":
      if (value === "") {
        hasError = true;
        error = "Size can't be empty";
      } else if (!/^[0-9]+$/.test(value)) {
        hasError = true;
        error = "Invalid home size";
      } else {
        hasError = false;
        error = "";
      }
      break;
    case "search":
      if (value === "") {
        hasError = true;
        error = "Please Select employer";
      } else {
        hasError = false;
        error = "";
      }
      break;
    //email validation
    case "email":
      if (value === "") {
        hasError = true;
        error = "Please enter an email";
      } else if (
        !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
          value
        )
      ) {
        hasError = true;
        error = "Please enter a valid email";
      } else {
        hasError = false;
        error = "";
      }
      break;
    default:
      break;
  }
  return { hasError, error };
};

export const onInputChange = (name, value, dispatch, formState) => {
  const { hasError, error } = validateInput(name, value);
  let isFormValid = true;

  for (const key in formState) {
    const item = formState[key];
    // Check if the current field has error
    if (key === name && hasError) {
      isFormValid = false;
      break;
    } else if (key !== name && item.hasError) {
      // Check if any other field has error
      isFormValid = false;
      break;
    }
  }

  dispatch({
    type: UPDATE_FORM,
    data: { name, value, hasError, error, touched: false, isFormValid },
  });
};
export const onFocusOut = (name, value, dispatch, formState) => {
  const { hasError, error } = validateInput(name, value);
  let isFormValid = true;
  for (const key in formState) {
    const item = formState[key];
    if (key === name && hasError) {
      isFormValid = false;
      break;
    } else if (key !== name && item.hasError) {
      isFormValid = false;
      break;
    }
  }

  dispatch({
    type: UPDATE_FORM,
    data: { name, value, hasError, error, touched: true, isFormValid },
  });
};
