import React, { useState, useCallback, useEffect } from "react";
import { Dropdown } from "react-bootstrap";
import { Link } from "react-router-dom";
import PropTypes from 'prop-types';
import translation from "../../../utils/translation";
const TranslationDropdown = ({ handleSaveTranslationLanguage, chatLanguageInfo, icon }) => {
    const [defaultView, setDefaultView] = useState(chatLanguageInfo?.chat_translate_view || "original");
    const [language, setLanguage] = useState(chatLanguageInfo?.chat_translate_language || "en");

    useEffect(() => {
        setDefaultView(chatLanguageInfo?.chat_translate_view || "original");
        setLanguage(chatLanguageInfo?.chat_translate_language || "en");
    }, [chatLanguageInfo]);

    const handleSaveTranslation = useCallback((key, value) => {
        if (key === "chat_translate_view") {
            setDefaultView(value);
            handleSaveTranslationLanguage({ "chat_translate_view": value, "chat_translate_language": language });
        } else {
            setLanguage(value);
            handleSaveTranslationLanguage({ "chat_translate_view": defaultView, "chat_translate_language": value });
        }
    }, [defaultView, language, handleSaveTranslationLanguage]);

    return (
        <Dropdown className="menu-btn-dropdown">
            { icon ?
                <Dropdown.Toggle as={ Link } className="menu-btn p-1 mt-2">
                    <i className="ri-translate grey2 fz18"></i>
                </Dropdown.Toggle>
                :
                <Dropdown.Toggle as={ Link } className="menu-btn p-1 mt-2">
                    <i className="ri-more-2-fill grey2 fz18"></i>
                </Dropdown.Toggle> }

            <Dropdown.Menu align="end" className="rounded-2xl shadow-md p12 w-48">
                <div className="flex flex-col gap-2 text-sm">
                    {/* Default View */ }
                    <div className="mode-radio-buttons">
                        <p className="fz14 fw-600 black font-roboto mb-1">{ translation("key_default_view") }:</p>

                        <div className="custom-radio compact pl12 pr12 pb8 pt8 mb-0 mr-0">
                            <input
                                type="radio"
                                name="view"
                                value="original"
                                id="originalRadio"
                                checked={ defaultView === "original" }
                                onChange={ () => handleSaveTranslation("chat_translate_view", "original") }
                                className="accent-blue-500"
                            />
                            <label htmlFor="originalRadio" className="radio-label black">
                                { translation('key_original') }
                            </label>
                        </div>
                        <div className="custom-radio compact pl12 pr12 pb8 pt8 mb-0 mr-0">
                            <input
                                type="radio"
                                name="view"
                                value="translated"
                                id="translatedRadio"
                                checked={ defaultView === "translated" }
                                onChange={ () => handleSaveTranslation("chat_translate_view", "translated") }
                                className="accent-blue-500"
                            />
                            <label htmlFor="translatedRadio" className="radio-label black">
                                { translation('key_translated') }
                            </label>
                        </div>
                    </div>

                    <hr className="my-1" />

                    {/* Translate To */ }
                    <div>
                        <p className="fz14 fw-600 black font-roboto mb-1"> { translation("key_translate_to") }:</p>

                        <div className="custom-radio compact pl12 pr12 pb8 pt8 mb-0 mr-0">
                            <input
                                type="radio"
                                name="language"
                                value="en"
                                id="enRadio"
                                checked={ language === "en" }
                                onChange={ () => handleSaveTranslation("chat_translate_language", "en") }
                                className="accent-blue-500"
                            />
                            <label htmlFor="enRadio" className="radio-label black">
                                English
                            </label>
                        </div>

                        <div className="custom-radio compact pl12 pr12 pb8 pt8 mb-0 mr-0">
                            <input
                                type="radio"
                                name="language"
                                value="id"
                                id="idRadio"
                                checked={ language === "id" }
                                onChange={ () => handleSaveTranslation("chat_translate_language", "id") }
                                className="accent-blue-500"
                            />
                            <label htmlFor="idRadio" className="radio-label black">
                                Indonesian
                            </label>
                        </div>

                        <div className="custom-radio compact pl12 pr12 pb8 pt8 mb-0 mr-0">
                            <input
                                type="radio"
                                name="language"
                                value="zh_cn"
                                id="chRadio"
                                checked={ language === "zh_cn" }
                                onChange={ () => handleSaveTranslation("chat_translate_language", "zh_cn") }
                                className="accent-blue-500"
                            />
                            <label htmlFor="chRadio" className="radio-label black">
                                Chinese
                            </label>
                        </div>
                    </div>
                </div>
            </Dropdown.Menu>
        </Dropdown>
    );

}

TranslationDropdown.propTypes = {
    handleSaveTranslationLanguage: PropTypes.func,
    chatLanguageInfo: PropTypes.object,
    icon: PropTypes.bool
}

export default TranslationDropdown;
