import React, { useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import PropTypes from "prop-types";
import { validateSaveBasicConsulate } from '../../formValidation';
import { saveWorkerConsulateState } from "../../../../../../components/ReusableComponents/form-states";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { saveWorkerConsulateSlice, fetchWorkerDetailTabInfoConsulate, fetchWorkerDetailTabInfo } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import translation from "../../../../../../utils/translation";

const ConsulateField = ({ name, label, control, register, maxLength, mono, span }) => (
    <div className={ `wkd-det-field${ span ? ' det-full' : '' }` }>
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
    span: PropTypes.bool,
};

const ConsulatetTabFillipino = ({ workerDetail, formId, onSaved }) => {
    const dispatch = useDispatch();
    const { control, setValue, register, handleSubmit } = useForm({ resolver: yupResolver(validateSaveBasicConsulate), defaultValues: saveWorkerConsulateState });
    useEffect(() => {
        Object.keys(saveWorkerConsulateState).forEach((key) => {
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
            <div className="wkd-det-sec is-edit is-last" key="fillipinoId">
                <div className="det-grid-edit">
                    <ConsulateField name="sss_number" label={ translation('key_sss_no') } control={ control } register={ register } maxLength={ 20 } mono />
                    <ConsulateField name="phill_health_number" label={ translation('key_philhealth_no') } control={ control } register={ register } maxLength={ 20 } mono />
                    <ConsulateField name="pag_ibig_number" label={ translation('key_pag_ibig_no') } control={ control } register={ register } maxLength={ 20 } mono />
                    <ConsulateField name="beneficiary_name" label={ translation('key_beneficiary_name') } control={ control } register={ register } maxLength={ 30 } />
                    <ConsulateField name="beneficiary_contact" label={ translation('key_beneficiary_contact') } control={ control } register={ register } maxLength={ 15 } />
                    <ConsulateField name="relationship_with_worker" label={ translation('key_relationship_to_worker') } control={ control } register={ register } maxLength={ 15 } />
                    <ConsulateField name="beneficiary_address" label={ translation('key_beneficiary_address') } control={ control } register={ register } maxLength={ 100 } span />
                </div>
            </div>
        </form>
    );
}

ConsulatetTabFillipino.propTypes = {
    workerDetail: PropTypes.any,
    formId: PropTypes.string,
    onSaved: PropTypes.func
};

export default React.memo(ConsulatetTabFillipino);
