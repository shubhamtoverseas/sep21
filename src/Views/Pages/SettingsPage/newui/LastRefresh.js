import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import translation from "../../../../utils/translation";
import listStyles from "../../Invoice/InvoiceList.module.css";
import shared from "./settings-newui.module.css";
import { LAST_REFRESH_FORMAT } from "./settingsNewUiConstants";

/** "Last refresh 16/09/2026 · 10:42" under a list title — same treatment as the employer / worker dashboards. */
const LastRefresh = ({ value }) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return (
        <p className={`${listStyles.pageSubtitle} ${shared.lastRefresh}`}>
            {translation("key_last_refresh")} <b>{parsed.isValid() ? parsed.format(LAST_REFRESH_FORMAT) : value}</b>
        </p>
    );
};

LastRefresh.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(LastRefresh);
