import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import {
    EMPLOYER_DUPLICATE_COPY, EMPLOYER_DUPLICATE_FIELD_KEYS, EMPLOYER_DUPLICATE_OTP_NOTE_FIELD, EMPLOYER_DUPLICATE_SOURCE_KEYS,
} from "./employerNewUiConstants";

/* E-1 / U-0032 warn step: the matched request fields name the step, the server message introduces it, every match is listed
   with its source, reference and the server-masked number. Presentational only — the host passes its own class names. */
export const duplicateWarningTitle = (fields) => {
    const labels = (fields || []).map((field) => EMPLOYER_DUPLICATE_FIELD_KEYS[field]).filter(Boolean).map((key) => translation(key));
    return labels.length ? labels.join(" · ") : translation("key_warning");
};

const sourceLabel = (source) => {
    const key = EMPLOYER_DUPLICATE_SOURCE_KEYS[source];
    return headingCase(key ? translation(key) : String(source || ""));
};

const maskedPhone = (row) => [row?.country_code, row?.number].filter(Boolean).join(" ");

const EmployerDuplicateWarning = ({ warning, classes }) => (
    <div className={ classes.root } role="alert">
        <div className={ classes.title }>{ duplicateWarningTitle(warning.fields) }</div>
        { warning.message && <div className={ classes.text }>{ warning.message }</div> }
        <ul className={ classes.list }>
            { (warning.duplicates || []).map((row, index) => (
                <li key={ `${ row.source }-${ row.id ?? index }` } className={ classes.row }>
                    <span className={ classes.source }>{ sourceLabel(row.source) }</span>
                    <span className={ classes.name }>{ [row.reference_id, row.name].filter(Boolean).join(" · ") }</span>
                    <span className={ classes.number }>{ maskedPhone(row) }</span>
                </li>
            )) }
        </ul>
        { (warning.fields || []).includes(EMPLOYER_DUPLICATE_OTP_NOTE_FIELD) && (
            <div className={ classes.note }>{ EMPLOYER_DUPLICATE_COPY.mobileOtpNote }</div>
        ) }
    </div>
);

EmployerDuplicateWarning.propTypes = {
    warning: PropTypes.shape({
        message: PropTypes.string,
        fields: PropTypes.arrayOf(PropTypes.string),
        duplicates: PropTypes.arrayOf(PropTypes.shape({
            field: PropTypes.string,
            source: PropTypes.string,
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            reference_id: PropTypes.string,
            name: PropTypes.string,
            country_code: PropTypes.string,
            number: PropTypes.string,
        })),
    }).isRequired,
    classes: PropTypes.shape({
        root: PropTypes.string,
        title: PropTypes.string,
        text: PropTypes.string,
        list: PropTypes.string,
        row: PropTypes.string,
        source: PropTypes.string,
        name: PropTypes.string,
        number: PropTypes.string,
        note: PropTypes.string,
    }).isRequired,
};

export default React.memo(EmployerDuplicateWarning);
