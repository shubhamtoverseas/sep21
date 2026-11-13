import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import WkdReadField from "../../../../WorkerPage/worker-detail/newui/details/WkdReadField";
import WkdSubTabBar from "../../../../WorkerPage/worker-detail/newui/WkdSubTabBar";
import Icon from "../../../../../../components/Icon/Icon";
import ConfirmModal from "../../../../../../components/ui/ConfirmModal";
import { fetchCurrentWorkers, removeCurrentWorker } from "../../../../../../redux/Slices/employer/EmployerSlice";
import { showSuccessOrError } from "../../../../../../services/commonService";
import { getEmployerGrants } from "../../employerGrants";
import translation from "../../../../../../utils/translation";
import EmdCard from "./EmdCard";
import EmployerBasicCard from "./EmployerBasicCard";
import OtherContactCard from "./OtherContactCard";
import EmployerFamilyCard from "./EmployerFamilyCard";
import EmployerSectionSendTemplate from "./EmployerSectionSendTemplate";
import useEmployerBasicForm from "./useEmployerBasicForm";
import styles from "../../NewEmployerModal.module.css";
import { DETAILS_CARDS, DATE_DISPLAY_FORMAT, EMPLOYER_DETAILS_SUBTABS } from "../../employerNewUiConstants";

const AllAddressesModal = lazy(() => import("./AllAddressesModal"));
const AddressModal = lazy(() => import("./AddressModal"));
const CurrentWorkerModal = lazy(() => import("./CurrentWorkerModal"));

const EmployerDetailsTab = ({ employer, employerId }) => {
    const dispatch = useDispatch();
    const { permissionList } = useSelector((state) => state.users);
    const workers = useSelector((state) => state.employer.currentWorkers);
    /* PERM §9.2 / §9.4 + 21 Oct catalogue (U-0346): a section without its View is hidden, without its Edit read-only. The 21 Oct
       catalogue has no Address and no Current Worker control (U-0054): both are fields of a section and follow that section's
       Edit — Address the Basic section (U-0423, 29 Oct: Address is a Basic details field), Current Worker the Basic section (its owner still with Mike).
       @migration-unspecified(employer): no document names the section that owns Address or Current Worker (U-0054 leaves
       Current Worker open); the existing owners are retained. Confirm with product before release. */
    const grants = useMemo(() => getEmployerGrants(permissionList), [permissionList]);
    useEffect(() => {
        if (!(grants.basicView || grants.contactView) && grants.familyView) setActiveSubTab(EMPLOYER_DETAILS_SUBTABS.FAMILY);
    }, [grants.basicView, grants.contactView, grants.familyView]);

    const [editingCard, setEditingCard] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState(EMPLOYER_DETAILS_SUBTABS.EMPLOYER);
    const [isAllAddressesOpen, setIsAllAddressesOpen] = useState(false);
    const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
    const [workerModal, setWorkerModal] = useState(null);
    const [deleteWorkerId, setDeleteWorkerId] = useState(null);
    const [busy, setBusy] = useState(false);

    const basic = useEmployerBasicForm({ employer, employerId });

    useEffect(() => {
        if (employer?.employer_id) dispatch(fetchCurrentWorkers({ employer_id: employer.employer_id }));
    }, [dispatch, employer?.employer_id]);

    const startEdit = useCallback((card) => setEditingCard(card), []);
    /* backend 334: a card saves and cancels only its own fields; the other card's unsaved edits survive either */
    const cancelCard = useCallback((card) => {
        basic.cancelCard(card);
        setEditingCard((current) => (current === card ? null : current));
    }, [basic]);
    const saveCard = useCallback((card) => {
        basic.saveCard(card).then((ok) => { if (ok) setEditingCard((current) => (current === card ? null : current)); });
    }, [basic]);

    const handleWorkerModalClose = useCallback((changed) => {
        setWorkerModal(null);
        if (changed && employer?.employer_id) dispatch(fetchCurrentWorkers({ employer_id: employer.employer_id }));
    }, [dispatch, employer?.employer_id]);

    const handleDeleteWorker = useCallback(() => {
        setBusy(true);
        dispatch(removeCurrentWorker({ employer_worker_id: deleteWorkerId })).then((res) => {
            setBusy(false);
            showSuccessOrError(res);
            setDeleteWorkerId(null);
        });
    }, [dispatch, deleteWorkerId]);

    const workerRows = Array.isArray(workers) ? workers : [];

    return (
        <div className="emd-details">
            {/* prototype "Details sections": Employer Details · Family Details — each sub-tab follows its own View grants.
                Each sub-tab's pane carries `det-body wkd-read-cards` (as the Worker details sub-tabs do): the g2-cards sit
                straight on the grey, and the sub-tab shell drops its own card chrome (`.wkd-subtab-content:has(.wkd-read-cards)`) */}
            <WkdSubTabBar
                activeKey={ activeSubTab }
                onSelect={ setActiveSubTab }
                emptyMessage={ translation('key_you_are_not_authorized_to_access_this_page') }
                tabs={ [
                    ...((grants.basicView || grants.contactView) ? [{
                        eventKey: EMPLOYER_DETAILS_SUBTABS.EMPLOYER,
                        title: translation('key_employer_details'),
                        content: (
                            <div className="det-body wkd-read-cards">
                    { grants.basicView && <EmployerBasicCard
                        employer={ employer }
                        canEdit={ grants.basicEdit }
                        actions={ grants.basicSendTemplate ? <EmployerSectionSendTemplate section="basic" employer={ employer } /> : null }
                        editing={ editingCard === DETAILS_CARDS.BASIC }
                        onEdit={ () => startEdit(DETAILS_CARDS.BASIC) }
                        onCancel={ () => cancelCard(DETAILS_CARDS.BASIC) }
                        onSave={ () => saveCard(DETAILS_CARDS.BASIC) }
                        saving={ basic.isSaving }
                        error={ basic.cardErrors[DETAILS_CARDS.BASIC] }
                        form={ basic.form }
                        errors={ basic.errors }
                        lookups={ basic.lookups }
                    /> }

                    { grants.contactView && <OtherContactCard
                        employer={ employer }
                        canEdit={ grants.contactEdit }
                        editing={ editingCard === DETAILS_CARDS.OTHER_CONTACT }
                        onEdit={ () => startEdit(DETAILS_CARDS.OTHER_CONTACT) }
                        onCancel={ () => cancelCard(DETAILS_CARDS.OTHER_CONTACT) }
                        onSave={ () => saveCard(DETAILS_CARDS.OTHER_CONTACT) }
                        saving={ basic.isSaving }
                        error={ basic.cardErrors[DETAILS_CARDS.OTHER_CONTACT] }
                        form={ basic.form }
                        errors={ basic.errors }
                    /> }

                    { grants.basicView && <EmdCard title={ translation('key_address') } onAdd={ grants.basicEdit ? () => setIsAddAddressOpen(true) : undefined }>
                        { /* prototype Address card: Residential · Correspondence only (audit D-11) — Country / District live on the address itself */ }
                        <div className="det-grid">
                            <WkdReadField label={ translation('key_residential_address') } value={ employer?.primary_residential_address?.address_line_1 } />
                            <WkdReadField label={ translation('key_correspondence_address') } value={ employer?.primary_correspondence_address?.address_line_1 } />
                        </div>
                        <div className="emd-card-foot">
                            <button type="button" className={ styles.linkBtn } onClick={ () => setIsAllAddressesOpen(true) }>
                                { translation('key_view_all_addresses') } ({ employer?.address_count ?? 0 })
                            </button>
                        </div>
                    </EmdCard> }

                    { grants.basicView && <EmdCard title={ translation('key_current_worker') } onAdd={ grants.basicEdit ? () => setWorkerModal({}) : undefined } tableBody>
                        { workerRows.length ? (
                            <div className="det-tablewrap wkd-tablewrap-flush">
                                <table className="emd-table">
                                    <thead>
                                        <tr>
                                            <th>{ translation('key_worker_name') }</th>
                                            <th>{ translation('key_stay_in_hk_until') }</th>
                                            <th>{ translation('key_hkid') }</th>
                                            <th>{ translation('key_employer_name') }</th>
                                            <th aria-label={ translation('key_actions') } />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        { workerRows.map((worker) => (
                                            <tr key={ worker.id }>
                                                <td className="emd-primary">{ worker.worker_name || '—' }</td>
                                                <td className="emd-mono">{ worker.staying_till_date_in_hk ? dayjs(worker.staying_till_date_in_hk).format(DATE_DISPLAY_FORMAT) : '—' }</td>
                                                <td className="emd-mono">{ worker.hk_id || '—' }</td>
                                                <td>{ worker.employer_name || '—' }</td>
                                                <td>
                                                    { grants.basicEdit && <span className="emd-row-actions">
                                                        <button type="button" className={ styles.iconBtn } aria-label={ translation('key_edit_current_worker') } onClick={ () => setWorkerModal(worker) }><Icon name="edit" size={ 13 } /></button>
                                                        <button type="button" className={ styles.iconBtn } aria-label={ translation('key_delete') } onClick={ () => setDeleteWorkerId(worker.id) }><Icon name="trash" size={ 13 } /></button>
                                                    </span> }
                                                </td>
                                            </tr>
                                        )) }
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="mc-worker-listing-empty">{ translation('key_no_workers_to_display') }</div>
                        ) }
                    </EmdCard> }
                            </div>
                        ),
                    }] : []),
                    ...(grants.familyView ? [{
                        eventKey: EMPLOYER_DETAILS_SUBTABS.FAMILY,
                        title: translation('key_family_details'),
                        content: (
                            <div className="det-body wkd-read-cards">
                    { grants.familyView && <EmployerFamilyCard
                        employer={ employer }
                        canEdit={ grants.familyEdit }
                        actions={ grants.familySendTemplate ? <EmployerSectionSendTemplate section="family" employer={ employer } /> : null }
                        editing={ editingCard === DETAILS_CARDS.FAMILY }
                        onEdit={ () => startEdit(DETAILS_CARDS.FAMILY) }
                        onCancel={ () => setEditingCard(null) }
                        onSaved={ () => setEditingCard(null) }
                    /> }
                            </div>
                        ),
                    }] : []),
                ] }
            />

            <Suspense fallback={ null }>
                { isAllAddressesOpen && <AllAddressesModal employerId={ employerId } employer={ employer } canEdit={ grants.contactEdit } onClose={ () => setIsAllAddressesOpen(false) } /> }
                { isAddAddressOpen && <AddressModal employerId={ employerId } employer={ employer } onClose={ () => setIsAddAddressOpen(false) } /> }
                { workerModal && <CurrentWorkerModal employerId={ employer?.employer_id } worker={ workerModal.id ? workerModal : null } onClose={ handleWorkerModalClose } /> }
            </Suspense>
            { deleteWorkerId && (
                <ConfirmModal
                    title={ translation('key_confirm_delete') }
                    body={ translation('key_are_you_sure_delete_worker') }
                    confirmLabel={ translation('key_delete') }
                    danger
                    busy={ busy }
                    onConfirm={ handleDeleteWorker }
                    onClose={ () => setDeleteWorkerId(null) }
                />
            ) }
        </div>
    );
};

EmployerDetailsTab.propTypes = {
    employer: PropTypes.object,
    employerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

export default React.memo(EmployerDetailsTab);
