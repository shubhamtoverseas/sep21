import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import Btn from "../../../../../components/ui/Btn";
import Modal from "../../../../../components/ui/Modal";
import { fetchHolidayById } from "../../../../../redux/Slices/settings/holidays/HolidaySlice";
import translation from "../../../../../utils/translation";
import shared from "../settings-newui.module.css";
import styles from "./Holiday.module.css";
import { DATE_DISPLAY_FORMAT } from "../settingsNewUiConstants";
import { headingCase } from "../../../../../utils/utils";

const formatDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).format(DATE_DISPLAY_FORMAT) : "—");

/** Ports ViewHolidayPopup: fetches the list on open and shows its holidays read-only. */
const ViewHolidayModal = ({ holidayListId, onClose }) => {
    const dispatch = useDispatch();
    const [holiday, setHoliday] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        dispatch(fetchHolidayById(holidayListId)).then((res) => {
            if (!active) return;
            if (!res.error) setHoliday(res.payload?.data || null);
            setIsLoading(false);
        });
        return () => { active = false; };
    }, [dispatch, holidayListId]);

    const rows = Array.isArray(holiday?.holidays_data) ? holiday.holidays_data : [];

    return (
        <Modal
            title={`${translation("key_view")} ${headingCase(translation("key_holiday_list"))}`}
            subtitle={holiday?.list_name || undefined}
            width={640}
            onClose={onClose}
            closeLabel={translation("key_close")}
            footer={<Btn variant="secondary" type="button" onClick={onClose}>{translation("key_close")}</Btn>}
        >
            {isLoading ? (
                <div className={shared.loadingState}>{translation("key_loading")}…</div>
            ) : rows.length === 0 ? (
                <div className={shared.loadingState}>{translation("key_no_records_found")}</div>
            ) : (
                <table className={styles.viewTable}>
                    <thead>
                        <tr>
                            <th className={styles.viewIndex}>#</th>
                            <th>{translation("key_holiday_name")}</th>
                            <th className={styles.viewDate}>{translation("key_date")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((item, index) => (
                            <tr key={item.id ?? `${item.holiday_name}-${index}`}>
                                <td className={styles.viewIndex}>{index + 1}</td>
                                <td>{item.holiday_name || "—"}</td>
                                <td className={styles.viewDate}>{formatDate(item.holiday_date)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Modal>
    );
};

ViewHolidayModal.propTypes = {
    holidayListId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
};

export default ViewHolidayModal;
