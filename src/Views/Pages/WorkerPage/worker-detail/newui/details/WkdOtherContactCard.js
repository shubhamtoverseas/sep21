import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useParams } from "react-router-dom";
import PropTypes from 'prop-types';
import WkdReadField from "./WkdReadField";
import WkdDetCardHead from "./WkdDetCardHead";
import { fetchCountriesGeneral } from "../../../../../../redux/Slices/common/countries/CountriesSlice";
import { updateWorkerDetailsSlice, fetchWorkerDetailTabInfo } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { handleMobileInput } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import { STALE_VERSION_CODE } from "../../../workerModuleConstants";

export const useOtherContactEdit = (workerDetailTabInfo, editing, onSaved) => {
    const dispatch = useDispatch();
    const { worker_id } = useParams();
    const [saving, setSaving] = useState(false);
    const [code, setCode] = useState('');
    const [number, setNumber] = useState('');
    const { workerContriesGeneral } = useSelector((state) => ({
        workerContriesGeneral: state.countries.workerContriesGeneral,
    }), shallowEqual);

    const hasFetched = useRef(false);
    useEffect(() => {
        if (!editing || hasFetched.current) return;
        hasFetched.current = true;
        if (!workerContriesGeneral?.length) dispatch(fetchCountriesGeneral({ type: "worker_only" }));
    }, [editing, workerContriesGeneral?.length, dispatch]);

    const savedCode = workerDetailTabInfo?.other_mobile_number_country_code || '';
    const savedNumber = workerDetailTabInfo?.other_mobile_number || '';

    const begin = useCallback(() => {
        setCode(savedCode);
        setNumber(savedNumber);
    }, [savedCode, savedNumber]);

    const countryOptions = useMemo(() => workerContriesGeneral?.map((item, index) => (
        <option key={ index } value={ item.code }>
            { (item.country_code ? `${ item.country_code } ` : `${ item.name } `) + item.code }
        </option>
    )), [workerContriesGeneral]);

    const save = useCallback(() => {
        setSaving(true);
        /* W-40: `edit_type: "other_contact"` updates these two fields only — strings so a leading zero survives, "" clears both;
           the detail's version travels (W-18) so a concurrent edit is refused with 409 STALE_VERSION instead of overwritten */
        const payload = {
            worker_id,
            user_id: workerDetailTabInfo?.user_id,
            edit_type: 'other_contact',
            other_mobile_number: String(number ?? '').trim(),
            other_mobile_number_country_code: String(code ?? '').trim(),
            ...(workerDetailTabInfo?.version && { version: workerDetailTabInfo.version }),
        };
        dispatch(updateWorkerDetailsSlice(payload)).then((res) => {
            setSaving(false);
            if (res?.error || res?.payload?.status === false) {
                ShowToast('error', res?.payload?.message);
                /* stale version: reload the record; the typed value stays in the card for re-apply, never auto-retried */
                if (res?.payload?.code === STALE_VERSION_CODE) dispatch(fetchWorkerDetailTabInfo({ worker_id, type: 'basic' }));
            } else {
                ShowToast('success', res?.payload?.message);
                if (onSaved) onSaved();
                dispatch(fetchWorkerDetailTabInfo({ worker_id, type: 'basic' }));
            }
        });
    }, [dispatch, worker_id, workerDetailTabInfo?.user_id, workerDetailTabInfo?.version, number, code, onSaved]);

    return { code, number, setCode, setNumber, saving, begin, save, countryOptions };
};

const WkdOtherContactCard = ({ workerDetailTabInfo, canEdit, editing, onEdit, edit }) => {
    const savedCode = workerDetailTabInfo?.other_mobile_number_country_code || '';
    const savedNumber = workerDetailTabInfo?.other_mobile_number || '';
    const readValue = [savedCode, savedNumber].filter(Boolean).join(' ');

    return (
        <div className="g2-card wkd-det-card">
            <WkdDetCardHead title={ translation('key_other_contact') }>
                { canEdit && !editing && (
                    <button type="button" className="g2-button wkd-det-headbtn" onClick={ onEdit }>
                        { translation('key_edit') }
                    </button>
                ) }
            </WkdDetCardHead>
            <div className="wkd-det-sec is-last">
                <div className={ editing ? 'det-grid-edit' : 'det-grid' }>
                    { !editing ? (
                        <WkdReadField det label={ translation('key_home_country_mobile') } value={ readValue } mono={ !!readValue } />
                    ) : (
                        <div className="wkd-ew-field">
                            <span className="wkd-ew-lbl">{ translation('key_home_country_mobile') }</span>
                            <div className="wkd-ew-phone">
                                <select
                                    className="wkd-ew-code"
                                    aria-label={ translation('key_select_country_code') }
                                    value={ edit.code }
                                    onChange={ (e) => edit.setCode(e.target.value) }
                                >
                                    <option value="">--</option>
                                    { edit.countryOptions }
                                </select>
                                <input
                                    type="text"
                                    inputMode="tel"
                                    className="wkd-ew-input mono"
                                    aria-label={ translation('key_home_country_mobile') }
                                    value={ edit.number }
                                    onChange={ (e) => { handleMobileInput(e); edit.setNumber(e.target.value); } }
                                />
                            </div>
                        </div>
                    ) }
                </div>
            </div>
        </div>
    );
};

WkdOtherContactCard.propTypes = {
    workerDetailTabInfo: PropTypes.object,
    canEdit: PropTypes.bool,
    editing: PropTypes.bool,
    onEdit: PropTypes.func,
    edit: PropTypes.shape({
        code: PropTypes.string,
        number: PropTypes.string,
        setCode: PropTypes.func,
        setNumber: PropTypes.func,
        countryOptions: PropTypes.node,
    }),
};

export default React.memo(WkdOtherContactCard);
