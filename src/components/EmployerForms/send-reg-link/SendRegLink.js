import React, { useEffect, useReducer, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getWhatsappCountryList,
  newEmpRegLink,
} from "../../../redux/Slices/SendRegLinks";
import { clearMessage } from "../../../redux/Slices/Messages";
import {
  onInputChange,
  validateInput,
  onFocusOut,
} from "../../Forms/employerFormsUtils";
import "./send-reg-link.css";
import PropTypes from "prop-types";
import translation from "../../../utils/translation";
import { REG_LINK_LANGUAGES } from "../../../Views/Pages/Employer/newui/employerNewUiConstants";

/* written language of the link (conflict sheet U-0039): the combined spoken/written labels are gone */
const regLinkLabel = (id) => REG_LINK_LANGUAGES.find((item) => item.id === id)?.label || id;
import { ShowToast } from "../../show-toast/ShowToast";
import { handleMobileInput } from "../../../services/commonService";

const initialMobileState = {
  mobile_number: { value: "", touched: false, hasError: true, error: "" },
};

const initialTabState = {
  yue: true,
  en: false,
  cmn: false,
};

const initialValues = {
  lang: "",
  code: "+91",
  num: "",
};

const formsReducer = (state, action) => {
  switch (action.type) {
    case "UPDATE_FORM": {
      const { name, value, hasError, error, touched, isFormValid } = action.data;
      return {
        ...state,
        [name]: { ...state[name], value, hasError, error, touched },
        isFormValid,
      };
    }
    default:
      return state;
  }
};

const SendRegLink = (props) => {
  const dispatch = useDispatch();
  const [formState, dispatchLink] = useReducer(formsReducer, initialMobileState);
  const [showTab, setShowTab] = React.useState(initialTabState);
  const [values, setValues] = React.useState(initialValues);
  const { whatsappCountryList } = useSelector((state) => state.sendRegLink);

  useEffect(() => {
    dispatch(clearMessage());
    dispatch(getWhatsappCountryList({ type: "1" }));
  }, [dispatch]);

  const showTabHandler = useCallback((e) => {
    setShowTab((prev) => {
      const newTab = {};
      for (let key in prev) {
        newTab[key] = key === e.target.id ? !prev[key] : false;
      }
      return newTab;
    });
  }, []);

  const handleChange = useCallback((e) => {
    if (e.target.id === "mobile_number") handleMobileInput(e);
    onInputChange(e.target.id, e.target.value, dispatchLink, formState);
    let lang = "english";
    for (const key in showTab) {
      if (showTab[key]) {
        lang = key.toString();
      }
    }
    if (e.target.id === "mobile_number") {
      setValues((prev) => ({ ...prev, lang, num: e.target.value }));
    } else {
      setValues((prev) => ({ ...prev, lang, [e.target.id]: e.target.value }));
    }
  }, [formState, showTab]);

  const handleFocusOut = useCallback((e) => {
    onFocusOut(e.target.id, e.target.value, dispatchLink, formState);
  }, [formState]);

  const handleSendLink = useCallback(async () => {
    const { lang, code, num } = values;
    let isFormValid = true;
    for (const name in formState) {
      const item = formState[name];
      const { value } = item;
      const { hasError, error } = validateInput(name, value);
      if (hasError) {
        isFormValid = false;
      }
      if (name) {
        dispatchLink({
          type: "UPDATE_FORM",
          data: { name, value, hasError, error, touched: true, isFormValid },
        });
      }
      if (formState.isFormValid) {
        dispatch(newEmpRegLink({ lang, code, num }))
          .unwrap()
          .then(() => {
            ShowToast('success', translation('key_link_sent_successfully'));
            props.closeModal();
          })
          .catch((err) => {
            ShowToast('error', err);
          });
      }
    }
  }, [values, formState, dispatch, props]);

  return (
    <div
      className="modal fade modalCustom show"
      id="sendRegistrationLink"
      tabIndex={-1}
      aria-labelledby="exampleModalCenterTitle"
      style={{
        display: "block",
        paddingRight: "15px",
        background: "rgba(0,0,0,0.7)",
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header text-center p-0">
            <h5 className="modal-title black py-4" id="exampleModalLabel">
              {translation('key_send_registration_link')}
            </h5>
          </div>
          <div className="modal-body p-0">
            <div className="formTab">
              <ul className="nav nav-pills" id="v-pills-tab" role="tablist">
                <li className="m-0 align-items-center">
                  <a
                    className={"maidmatch-link " + (showTab.yue && "active")}
                    id="yue"
                    data-toggle="pill"
                    role="tab"
                    aria-controls="v-pills-trad"
                    aria-selected="true"
                    style={{ cursor: "pointer" }}
                    onClick={showTabHandler}
                  >
                    {regLinkLabel('yue')}
                  </a>
                </li>
                <li className="m-0 align-items-center">
                  <a
                    className={"maidmatch-link " + (showTab.en && "active")}
                    id="en"
                    data-toggle="pill"
                    role="tab"
                    aria-controls="v-pills-english"
                    aria-selected="false"
                    style={{ cursor: "pointer" }}
                    onClick={showTabHandler}
                  >
                    {translation('key_english')}
                  </a>
                </li>
                <li className="m-0 align-items-center">
                  <a
                    className={"maidmatch-link " + (showTab.cmn && "active")}
                    id="cmn"
                    data-toggle="pill"
                    role="tab"
                    aria-controls="v-pills-thirdtab"
                    aria-selected="false"
                    style={{ cursor: "pointer" }}
                    onClick={showTabHandler}
                  >
                    {regLinkLabel('cmn')}
                  </a>
                </li>
              </ul>
              <div className="accordion px-3" id="accordionExample">
                <div className="tab-content mt-5" id="v-pills-tabContent">
                  <div
                    className={"tab-pane show active"}
                    id="v-pills-trad"
                    role="tabpanel"
                    aria-labelledby="v-pills-trad-tab"
                  >
                    <div
                      id="collapseOne"
                      className="collapse show"
                      aria-labelledby="headingOne"
                      data-parent="#accordionExample"
                    >
                      <div className="row">
                        <div className="col-sm-4 col-6 mb-3">
                          <div className="formElement">
                            <div className="flexDiv">
                              <div className="form-group has-float-label w-100">
                                <select
                                  className="form-control custom-select"
                                  id="code"
                                  onChange={handleChange}
                                >
                                  {whatsappCountryList &&
                                    whatsappCountryList.map((item, index) => (
                                      <option key={index} value={item.id}>
                                        {item.name + " (" + item.code + ")"}
                                      </option>
                                    ))}
                                </select>
                                <span>{translation('key_whatsapp')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-sm-8 col-6 mb-1">
                          <div className="formElement">
                            <div className="flexDiv">
                              <div className="form-group has-float-label w-100">
                                <input
                                  className="form-control"
                                  type="text"
                                  maxLength={10}
                                  placeholder={translation('key_whatsapp_no')}
                                  id="mobile_number"
                                  value={formState.mobile_number.value}
                                  onChange={handleChange}
                                  onBlur={handleFocusOut}
                                  style={{
                                    borderColor:
                                      formState.mobile_number.touched &&
                                        formState.mobile_number.hasError
                                        ? "#f65157"
                                        : "",
                                  }}
                                />
                                <label htmlFor="mobile_number">{translation('key_whatsapp_no')}</label>
                                {formState.mobile_number.touched && formState.mobile_number.hasError && (
                                  <div className="error" style={{ color: "#f65157" }}>
                                    {formState.mobile_number.error}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline mr15"
              data-dismiss="modal"
              onClick={props.closeModal}
            >
              {translation('key_cancel')}
            </button>
            <button
              type="button"
              className="btn btn-outline mr15"
              data-dismiss="modal"
            >
              {translation('key_templates')}
            </button>
            <button
              type="button"
              className="btn btn-success text-white"
              onClick={handleSendLink}
            >
              {translation('key_send_whatsapp')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

SendRegLink.propTypes = {
  closeModal: PropTypes.func,
};
export default SendRegLink;