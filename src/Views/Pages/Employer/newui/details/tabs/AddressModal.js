import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Modal from "../../../../../../components/ui/Modal";
import Btn from "../../../../../../components/ui/Btn";
import Icon from "../../../../../../components/Icon/Icon";
import { addAddressSchema } from "../../../../../../components/Layout/popups/add-address/addAddressSchema";
import { addEmployerAddress, employerAddressList, setEmpAddressPrimary, updateEmployerAddress } from "../../../../../../redux/Slices/employer/EmployerSlice";
import { fetchDistrictByCountryCode } from "../../../../../../redux/Slices/common/district/DistrictSlice";
import { showSuccessOrError } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import { headingCase } from "../../../../../../utils/utils";
import styles from "../../NewEmployerModal.module.css";
import { ADDRESS_TYPE } from "../../employerNewUiConstants";

const employerAddressSchema = addAddressSchema.concat(yup.object().shape({
    district: yup.string().nullable(),
}));

const toId = (value) => (value === undefined || value === null ? '' : String(value));

const addressDistrictId = (address, employer) => toId(address?.district_id ?? address?.district_info?.id ?? employer?.district_info?.id);

const typeKey = (type) => (type === ADDRESS_TYPE.correspondence ? 'correspondence' : 'residential');

const AddressModal = ({ employerId, employer, address, onClose }) => {
    const dispatch = useDispatch();
    const isEdit = Boolean(address);
    const [busy, setBusy] = useState(false);
    const [districts, setDistricts] = useState([]);
    const [districtsLoadedFor, setDistrictsLoadedFor] = useState(null);
    const { register, handleSubmit, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(employerAddressSchema),
        defaultValues: {
            type: address ? typeKey(address.type) : 'residential',
            address_line_1: address?.address_line_1 || '',
            district: addressDistrictId(address, employer),
        },
    });

    const country = employer?.location_info || null;
    const countryCode = country?.country_code;
    const showDistrict = Boolean(countryCode) && !(districtsLoadedFor === countryCode && districts.length === 0);

    useEffect(() => {
        if (!countryCode) { setDistricts([]); setDistrictsLoadedFor(null); return undefined; }
        let cancelled = false;
        dispatch(fetchDistrictByCountryCode(countryCode)).then((res) => {
            if (cancelled) return;
            const list = Array.isArray(res?.payload?.data) ? res.payload.data : [];
            setDistricts(list);
            setDistrictsLoadedFor(countryCode);
            if (!list.length) setValue('district', '');
        });
        return () => { cancelled = true; };
    }, [countryCode, dispatch, setValue]);

    const ensurePrimaryIfFirst = useCallback((type, newId) => (
        dispatch(employerAddressList({ employer_id: employerId, type })).then((res) => {
            const all = res?.payload?.data;
            if (Array.isArray(all) && newId && all.filter((item) => item.type === type).length === 1) {
                dispatch(setEmpAddressPrimary({ employer_id: employerId, address_id: newId }));
            }
        })
    ), [dispatch, employerId]);

    const onSubmit = useCallback((data) => {
        const type = ADDRESS_TYPE[data.type];
        const payload = { employer_id: employerId, address_line_1: data.address_line_1, type };
        if (showDistrict && data.district) payload.district_id = Number(data.district);
        setBusy(true);
        const request = isEdit
            ? dispatch(updateEmployerAddress({ address_id: address.id, ...payload }))
            : dispatch(addEmployerAddress(payload));
        request.then((res) => {
            showSuccessOrError(res);
            if (res.error) { setBusy(false); return; }
            if (isEdit) { onClose(true); return; }
            ensurePrimaryIfFirst(type, res?.payload?.data?.id).finally(() => onClose(true));
        });
    }, [dispatch, employerId, isEdit, address?.id, showDistrict, ensurePrimaryIfFirst, onClose]);

    return (
        <Modal
            title={ headingCase(translation(isEdit ? 'key_edit_address' : 'key_add_address')) }
            width={ 520 }
            onClose={ () => onClose(false) }
            footer={ (
                <>
                    <span className={ styles.spacer } />
                    <Btn variant="secondary" onClick={ () => onClose(false) } disabled={ busy }>{ translation('key_cancel') }</Btn>
                    <Btn variant="primary" type="submit" form="employer-address-form" disabled={ busy }>
                        { busy ? translation('key_loading') : translation(isEdit ? 'key_update' : 'key_save') }
                    </Btn>
                </>
            ) }
        >
            <form id="employer-address-form" className={ styles.form } onSubmit={ handleSubmit(onSubmit) } noValidate>
                <div className={ styles.radioRow } role="radiogroup">
                    <label className={ styles.radioLabel }>
                        <input type="radio" value="residential" className={ styles.radio } { ...register('type') } />
                        { translation('key_residential_address') }
                    </label>
                    <label className={ styles.radioLabel }>
                        <input type="radio" value="correspondence" className={ styles.radio } { ...register('type') } />
                        { translation('key_correspondence_address') }
                    </label>
                </div>
                { errors.type && <div className={ styles.fieldError }>{ errors.type.message }</div> }
                <div className={ styles.field }>
                    <div className={ styles.fieldLabel }><span>{ translation('key_address') }<span className={ styles.required }>*</span></span></div>
                    <textarea
                        rows={ 3 }
                        className={ `${ styles.input } ${ styles.textarea } ${ errors.address_line_1 ? styles.invalid : '' }` }
                        placeholder={ translation('key_address_placeholder') }
                        { ...register('address_line_1') }
                    />
                    { errors.address_line_1 && <div className={ styles.fieldError }>{ errors.address_line_1.message }</div> }
                </div>
                <div className={ styles.grid }>
                    <div className={ styles.field }>
                        <div className={ styles.fieldLabel }><span>{ translation('key_country') }</span></div>
                        <input type="text" className={ `${ styles.input } ${ styles.readonly }` } value={ country?.name || '—' } readOnly disabled aria-label={ translation('key_country') } />
                    </div>
                    { showDistrict && (
                        <div className={ styles.field }>
                            <div className={ styles.fieldLabel }><span>{ translation('key_district') }</span></div>
                            <div className={ styles.selectWrap }>
                                <select className={ styles.select } { ...register('district') }>
                                    <option value="">{ translation('key_please_select') }</option>
                                    { districts.map((district) => <option key={ district.id } value={ district.id }>{ district.name }</option>) }
                                </select>
                                <Icon name="chev_down" size={ 10 } className={ styles.selectChevron } />
                            </div>
                        </div>
                    ) }
                </div>
            </form>
        </Modal>
    );
};

AddressModal.propTypes = {
    employerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    employer: PropTypes.object,
    address: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};

export default React.memo(AddressModal);
