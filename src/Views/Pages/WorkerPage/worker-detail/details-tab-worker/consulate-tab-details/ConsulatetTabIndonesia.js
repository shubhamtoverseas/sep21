import React, { useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import PropTypes from "prop-types";
import { validateSaveBasicConsulateIndo } from '../../formValidation';
import { saveWorkerConsulateStateIndo } from "../../../../../../components/ReusableComponents/form-states";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { saveWorkerConsulateSlice, fetchWorkerDetailTabInfoConsulate, fetchWorkerDetailTabInfo } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import translation from "../../../../../../utils/translation";

const ConsulateField = ({ name, label, control, register, maxLength, mono }) => (
    <div className="wkd-det-field">
        <label className="wkd-det-elbl required">{ label }</label>
        <Controller
            name={ name }
            control={ control }
            render={ ({ field, fieldState: { error } }) => (
                <>
                    <input
                        className={ `form-control${ mono ? ' mono' : '' } ${ error?.message ? 'is-invalid' : '' }` }
                        type="text"
                        { ...field }
                        maxLength={ maxLength }
                        { ...register(name) }
                    />
                    { error && (
                        <small className="text-danger">{ error.message }</small>
                    ) }
                </>
            ) }
        />
    </div>
);

ConsulateField.propTypes = {
    name: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    control: PropTypes.object.isRequired,
    register: PropTypes.func.isRequired,
    maxLength: PropTypes.number,
    mono: PropTypes.bool,
};

const ConsulatetTabIndonesia = ({ workerDetail, formId, onSaved }) => {
    const dispatch = useDispatch();
    const { control, setValue, register, handleSubmit } = useForm({ resolver: yupResolver(validateSaveBasicConsulateIndo), defaultValues: saveWorkerConsulateStateIndo });

    useEffect(() => {
        Object.keys(saveWorkerConsulateStateIndo).forEach((key) => {
            setValue(key, workerDetail?.worker_cosulate_document?.[key] || '');
        });
    }, [workerDetail, setValue]);

    const onSubmit = useCallback((data) => {
        let payload = {
            ...data,
            worker_id: workerDetail.id,
            module_key: "worker"
        }
        dispatch(saveWorkerConsulateSlice(payload)).then(res => {
            if (res?.payload?.status) {
                dispatch(fetchWorkerDetailTabInfo({ "worker_id": workerDetail.id, type: 'basic' }));
                dispatchWithHandling(dispatch, fetchWorkerDetailTabInfoConsulate({
                    "worker_id": workerDetail.id,
                    "type": "consulate"
                }));
                ShowToast("success", res?.payload?.message);
                if (onSaved) onSaved();
            } else {
                ShowToast("error", res?.payload?.message);
            }
        });
    }, [dispatch, workerDetail?.id, onSaved]);

    return (
        <form id={ formId } className="wkd-bio-edit wkd-det-form" onSubmit={ handleSubmit(onSubmit) }>
            <div className="wkd-det-sec is-edit is-last" key="indo">
                <div className="det-grid-edit">
                    <ConsulateField name="ktp" label={ translation('key_ktp') } control={ control } register={ register } maxLength={ 20 } mono />
                    <ConsulateField name="nama_suami" label={ translation('key_nama_suami') } control={ control } register={ register } maxLength={ 30 } />
                    <ConsulateField name="nama_ayah" label={ translation('key_nama_ayah') } control={ control } register={ register } maxLength={ 30 } />
                    <ConsulateField name="nama_ibu" label={ translation('key_nama_ibu') } control={ control } register={ register } maxLength={ 30 } />
                </div>
            </div>
        </form>
    );
}

ConsulatetTabIndonesia.propTypes = {
    workerDetail: PropTypes.any,
    formId: PropTypes.string,
    onSaved: PropTypes.func
};

export default React.memo(ConsulatetTabIndonesia);
