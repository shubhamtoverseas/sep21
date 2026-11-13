import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Modal from "../../../../../../components/ui/Modal";
import Btn from "../../../../../../components/ui/Btn";
import Icon from "../../../../../../components/Icon/Icon";
import ConfirmModal from "../../../../../../components/ui/ConfirmModal";
import { deleteEmpAddress, employerAddressList, setEmpAddressPrimary } from "../../../../../../redux/Slices/employer/EmployerSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { showSuccessOrError } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import { headingCase } from "../../../../../../utils/utils";
import styles from "../../NewEmployerModal.module.css";
import { ADDRESS_TYPE_OPTIONS } from "../../employerNewUiConstants";

const AddressModal = lazy(() => import("./AddressModal"));

const AllAddressesModal = ({ employerId, employer, canEdit = true, onClose }) => {
    const dispatch = useDispatch();
    const addresses = useSelector((state) => state.employer.addresses);
    const [type, setType] = useState(ADDRESS_TYPE_OPTIONS[0].value);
    const [isLoading, setIsLoading] = useState(false);
    const [editAddress, setEditAddress] = useState(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setIsLoading(true);
        dispatch(employerAddressList({ employer_id: employerId, type })).finally(() => setIsLoading(false));
    }, [dispatch, employerId, type]);

    useEffect(() => { load(); }, [load]);

    const handleSetPrimary = useCallback((addressId) => {
        setBusy(true);
        dispatch(setEmpAddressPrimary({ employer_id: employerId, address_id: addressId })).then((res) => {
            setBusy(false);
            if (res.error) { showSuccessOrError(res); return; }
            ShowToast('success', translation('key_address_set_as_default_successfully'));
        });
    }, [dispatch, employerId]);

    const handleDelete = useCallback(() => {
        setBusy(true);
        dispatch(deleteEmpAddress({ address_id: deleteId })).then((res) => {
            setBusy(false);
            showSuccessOrError(res);
            setDeleteId(null);
        });
    }, [dispatch, deleteId]);

    const handleFormClose = useCallback((changed) => {
        setEditAddress(null);
        setIsAddOpen(false);
        if (changed) load();
    }, [load]);

    const list = Array.isArray(addresses) ? addresses : [];
    const locationLine = (address) => [
        address?.district_info?.name ?? address?.district_name ?? employer?.district_info?.name,
        address?.location_info?.name ?? address?.location_name ?? employer?.location_info?.name,
    ].filter(Boolean).join(' · ');

    return (
        <Modal
            title={ headingCase(translation('key_all_addresses')) }
            width={ 520 }
            onClose={ onClose }
            footer={ (
                <>
                    <span className={ styles.spacer } />
                    <Btn variant="primary" onClick={ onClose }>{ translation('key_done') }</Btn>
                </>
            ) }
        >
            <div className={ styles.segmented } role="tablist">
                { ADDRESS_TYPE_OPTIONS.map((item) => (
                    <button key={ item.value } type="button" role="tab" aria-selected={ type === item.value }
                        className={ `${ styles.segment } ${ type === item.value ? styles.segmentOn : '' }` } onClick={ () => setType(item.value) }>
                        { translation(item.key) }
                    </button>
                )) }
            </div>

            { isLoading ? (
                <div className={ styles.hint }>{ translation('key_loading') }…</div>
            ) : list.length === 0 ? (
                <div className={ styles.dedupeEmpty }><div className={ styles.dedupeEmptyTitle }>{ translation('key_no_addresses_to_display') }</div></div>
            ) : list.map((address) => (
                <div key={ address.id } className={ `${ styles.addressCard } ${ address.default ? styles.addressCardPrimary : '' }` }>
                    <div className={ styles.addressBody }>
                        <div className={ styles.addressLine }>{ address.address_line_1 }</div>
                        { locationLine(address) && <div className={ styles.addressSub }>{ locationLine(address) }</div> }
                        <div className={ styles.addressFoot }>
                            { address.default
                                ? <span className={ styles.verifiedTag }><span className={ styles.verifiedDot } />{ translation('key_primary') }</span>
                                : canEdit && <button type="button" className={ styles.linkBtn } onClick={ () => handleSetPrimary(address.id) } disabled={ busy }>{ translation('key_set_as_primary') }</button> }
                        </div>
                    </div>
                    { canEdit && <div className={ styles.addressActions }>
                        <button type="button" className={ styles.iconBtn } aria-label={ translation('key_edit_address') } onClick={ () => setEditAddress(address) }>
                            <Icon name="edit" size={ 12 } />
                        </button>
                        { Boolean(address.status) && !address.default && (
                            <button type="button" className={ styles.iconBtn } aria-label={ translation('key_delete') } onClick={ () => setDeleteId(address.id) }>
                                <Icon name="trash" size={ 12 } />
                            </button>
                        ) }
                    </div> }
                </div>
            )) }

            { canEdit && <div className={ styles.addressAddRow }>
                <button type="button" className={ styles.linkBtnBordered } onClick={ () => setIsAddOpen(true) }>+ { translation('key_add_address') }</button>
            </div> }

            <Suspense fallback={ null }>
                { (isAddOpen || editAddress) && (
                    <AddressModal employerId={ employerId } employer={ employer } address={ editAddress } onClose={ handleFormClose } />
                ) }
            </Suspense>
            { deleteId && (
                <ConfirmModal
                    title={ translation('key_confirm_delete') }
                    body={ translation('key_are_you_sure_delete_address') }
                    confirmLabel={ translation('key_delete') }
                    danger
                    busy={ busy }
                    onConfirm={ handleDelete }
                    onClose={ () => setDeleteId(null) }
                />
            ) }
        </Modal>
    );
};

AllAddressesModal.propTypes = {
    employerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    employer: PropTypes.object,
    canEdit: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
};

export default React.memo(AllAddressesModal);
