import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import { Checkbox, Field, FormGrid, SelectBox } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { showErrorMessage } from "../../../../../services/commonService";
import { headingCase } from "../../../../../utils/utils";
import { fetchCountries } from "../../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchOfficialHolidays } from "../../../../../redux/Slices/settings/holidays/HolidaySlice";
import { DATE_DISPLAY_FORMAT, SMART_FILL_YEARS_AHEAD } from "../settingsNewUiConstants";
import styles from "./SmartFillDialog.module.css";

/*
 * Smart Fill Holidays (Add / Edit Holiday List) on the kit Modal: Country + Year, Fetch the official holidays
 * (`fetchOfficialHolidays { country, year }`), tick the ones to add (select all), Add hands the rows to the form as
 * `{ holiday_name, holiday_date }` exactly as the legacy popup did. UI only — the logic is the legacy SmartFillPopup's.
 */
const SmartFillDialog = ({ onClose, onHolidaysSelected }) => {
    const dispatch = useDispatch();
    const { countries } = useSelector((state) => state.countries);
    const [country, setCountry] = useState("");
    const [year, setYear] = useState("");
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState("");            /* "" · loading · done */
    const [holidays, setHolidays] = useState([]);
    const [selected, setSelected] = useState([]);

    const years = useMemo(() => { const now = new Date().getFullYear(); return Array.from({ length: SMART_FILL_YEARS_AHEAD + 1 }, (_, i) => now + i); }, []);
    useEffect(() => { dispatch(fetchCountries({ type: "" })); }, [dispatch]);

    const fetchHolidays = useCallback((event) => {
        event.preventDefault();
        const next = {};
        if (!country) next.country = translation("key_this_field_is_required");
        if (!year) next.year = translation("key_this_field_is_required");
        setErrors(next);
        if (Object.keys(next).length) return;
        setStatus("loading");
        dispatch(fetchOfficialHolidays({ country, year })).then((res) => {
            if (res?.error) showErrorMessage(res);
            setStatus("done");
            setHolidays(Array.isArray(res?.payload) ? res.payload : []);
            setSelected([]);
        });
    }, [dispatch, country, year]);

    const isSelected = (h) => selected.some((s) => s.date === h.date);
    const toggle = (h, checked) => setSelected((prev) => (checked ? [...prev, h] : prev.filter((s) => s.date !== h.date)));
    const allSelected = holidays.length > 0 && selected.length === holidays.length;
    const toggleAll = (checked) => setSelected(checked ? [...holidays] : []);

    const add = useCallback(() => {
        onHolidaysSelected?.(selected.map((h) => ({ holiday_name: h.name, holiday_date: new Date(h.date).toISOString() })));
        onClose();
    }, [selected, onHolidaysSelected, onClose]);

    const footer = (
        <>
            { status === "done" && holidays.length > 0 && <span className={ styles.count }>{ selected.length } { translation("key_selected").toLowerCase() }</span> }
            <span className={ styles.grow } />
            <Btn variant="secondary" type="button" onClick={ onClose }>{ translation("key_cancel") }</Btn>
            { status === "done" && holidays.length > 0
                ? <Btn variant="primary" type="button" disabled={ selected.length === 0 } onClick={ add }>{ translation("key_add") }</Btn>
                : <Btn variant="primary" type="submit" form="smart-fill-form" disabled={ status === "loading" }>{ status === "loading" ? `${ translation("key_fetching") }…` : translation("key_fetch") }</Btn> }
        </>
    );

    return (
        <Modal title={ headingCase(translation("key_smart_fill_holidays")) } width={ 560 } onClose={ onClose } footer={ footer } busy={ status === "loading" }>
            <form id="smart-fill-form" onSubmit={ fetchHolidays } noValidate>
                <FormGrid columns={ 2 }>
                    <Field label={ translation("key_country") } htmlFor="smart-fill-country" required error={ errors.country }>
                        <SelectBox id="smart-fill-country" value={ country } invalid={ Boolean(errors.country) } onChange={ (e) => { setCountry(e.target.value); setErrors((p) => ({ ...p, country: "" })); } }>
                            <option value="">{ translation("key_please_select") }</option>
                            { (countries || []).map((c) => <option key={ c.id } value={ c.country_code }>{ c.name }</option>) }
                        </SelectBox>
                    </Field>
                    <Field label={ translation("key_year") } htmlFor="smart-fill-year" required error={ errors.year }>
                        <SelectBox id="smart-fill-year" value={ year } invalid={ Boolean(errors.year) } onChange={ (e) => { setYear(e.target.value); setErrors((p) => ({ ...p, year: "" })); } }>
                            <option value="">{ translation("key_please_select") }</option>
                            { years.map((y) => <option key={ y } value={ y }>{ y }</option>) }
                        </SelectBox>
                    </Field>
                </FormGrid>
            </form>
            { status === "done" && (
                <section className={ styles.results } aria-live="polite">
                    <p className={ styles.summary }>{ holidays.length } { translation("key_holidays").toLowerCase() } { translation("key_found").toLowerCase() }</p>
                    { holidays.length > 0 && (
                        <table className={ styles.table }>
                            <thead>
                                <tr>
                                    <th scope="col"><Checkbox label={ translation("key_holiday_name") } checked={ allSelected } onChange={ (e) => toggleAll(e.target.checked) } /></th>
                                    <th scope="col">{ translation("key_date") }</th>
                                </tr>
                            </thead>
                            <tbody>
                                { holidays.map((h, index) => (
                                    <tr key={ h.date || index }>
                                        <td><Checkbox label={ h.name } checked={ isSelected(h) } onChange={ (e) => toggle(h, e.target.checked) } /></td>
                                        <td className={ styles.date }>{ h.date ? dayjs(h.date).format(DATE_DISPLAY_FORMAT) : "" }</td>
                                    </tr>
                                )) }
                            </tbody>
                        </table>
                    ) }
                </section>
            ) }
        </Modal>
    );
};

SmartFillDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    /* receives `[{ holiday_name, holiday_date }]` — the form merges them (useHolidayForm.applySmartFill) */
    onHolidaysSelected: PropTypes.func,
};

export default SmartFillDialog;
