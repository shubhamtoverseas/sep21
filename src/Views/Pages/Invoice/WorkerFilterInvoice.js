import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from 'prop-types';
import { Link } from "react-router-dom";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { workerTypeList, workerTypeListLocal } from "../../../components/ReusableComponents/constants";
import "../WorkerPage/worker.css";
import CustomFormGroup from "../../../components/custom-form-group/CustomFormGroup";
import { fetchWorkerStatuses } from "../../../redux/Slices/common/workerStatuses/WorkerStatusesSlice";
import ProfileStatusMultiSelect from "../../../components/worker/ProfileStatusMultiSelect";
import configData from "../../../components/ReusableComponents/app-configs";
import { customStylesOfMultiSelect } from "../../../utils/customStylesOfMultiSelect";
import { getPermissionValue, isAdminUser } from "../../../services/commonService";
const WorkerFilterInvoice = ({
    selectedRows,
    filterByTypeWorkers,
    setType,
    filterByNationalityWorker,
    setNationality,
    filterByProfileStatusWorker,
    setStatus,
    filterByBranchCodeWorker,
    setWorkerKababOptions,
    workerNationalities,
    workerProfileStatusList,
    mappingReferenceId,
    handleClearFilter,
    actionType,
    updateFilters,
    isDefaultType
}) => {
    const { t } = useTranslation(); // Access translations
    const dispatch = useDispatch();
    const isAdmin = isAdminUser();
    const availableStatus = Object.values(configData.WorkerStatusNameMapping).find((type) => type.key === "available");
    const [defaultWorkerType, setDefaultWorkerType] = useState("");
    const [profileStatus, setProfileStatus] = useState([]);
    const { permissionList } = useSelector((state) => state.users);
    const workerGlobalType = getPermissionValue(permissionList?.data, 'worker', 'worker_global_type');
    const allowedTypeIds = workerGlobalType
        ? workerGlobalType.split(',').map(id => id.trim())
        : [];
    const workerGlobalNationality = getPermissionValue(permissionList?.data, 'worker', 'worker_global_nationality');
    const allowedNationalityIds = workerGlobalNationality
        ? workerGlobalNationality.split(',').map(id => parseInt(id.trim()))
        : [];

    useEffect(() => {
        if (actionType === "insurance") {
            let dashboard1 = workerProfileStatusList.find(status => status.id === "dashboard_1");
            let dashboard2 = workerProfileStatusList.find(status => status.id === "dashboard_2");
            let dashboard3 = (dashboard2 && Array.isArray(dashboard2.values))
                ? dashboard2.values.filter(status => status.id === 2 || status.id === 3)
                : [];
            let dashboard_3 = workerProfileStatusList.find(status => status.id === "dashboard_3");
            let dashboard_4 = workerProfileStatusList.find(status => status.id === "dashboard_4");
            dashboard2 = dashboard2 ? { ...dashboard2, values: dashboard3 } : undefined;
            setProfileStatus([dashboard1, dashboard2, dashboard_3, dashboard_4].filter(Boolean));
        }
    }, [actionType, workerProfileStatusList, dispatch]);

    useEffect(() => {
        const optionToAdd = { id: 3, name: t('key_change_individual_interpreter'), type: 2 };
        if (selectedRows?.length > 0) {
            if (selectedRows?.length == 1) {
                dispatch(fetchWorkerStatuses({ worker_id: selectedRows[0].id }));
            }
            setWorkerKababOptions((prevOptions) => {
                if (!prevOptions.some((option) => option.id === optionToAdd.id)) {
                    return [...prevOptions, optionToAdd];
                }
                return prevOptions;
            });
        } else {
            setWorkerKababOptions((prevOptions) =>
                prevOptions.filter((option) => option.id !== optionToAdd.id)
            );
        }
    }, [selectedRows, dispatch]);

    const handleBranchFilter = (selectedOptions) => {
        const branchIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
        filterByBranchCodeWorker(branchIds);
    };

    const handleClearFilterAll = () => {
        handleClearFilter();
    }

    const handleStatusChange = (selected) => {
        if (selected.length === 0) {
            // setFilterData({ ...filterData, dashboard: "", statusIds: [] });
            filterByProfileStatusWorker("", []);
            return false;
        }

        let selectedIds = selected.map(option => option.valueId);

        setStatus(selectedIds);
        if (!selectedIds || !selectedIds.length) {
            selectedIds = [availableStatus.id];
        }
        if (selectedIds.length > 1) {
            let idsArr = selectedIds.filter(item => item !== 'dashboard_2');
            let selectedId = idsArr.map(option => Number(option));
            filterByProfileStatusWorker("dashboard_2", selectedId);
        } else {
            console.log("handleStatusChange 1", selectedIds);
            filterByProfileStatusWorker(selectedIds[0], []);
        }
    }

    const handleNationalityFilterList = (selectedOptions) => {
        const { value, label } = selectedOptions;
        // setdefaultWorkerNationality(label);
        setNationality(value);
        filterByNationalityWorker(label, value);
    }

    const handleTypeFilter = (selectedOptions) => {
        const { value, label } = selectedOptions;
        setDefaultWorkerType(label);
        // setSelectedType(value);
        setType(value);
        filterByTypeWorkers(label, value);
    }

    return (
        <div className="entity-filter-bar tableHead bg-white mb24" >
            <div className="filterRow p24">
                <div className="custom-row d-flex align-items-center">
                    { actionType === "insurance" && <CustomFormGroup classNames={ 'flex-sm-fill flex-fill px6 mb-md-0 mb-2' }>
                        <label className="form-label mb12">{ t('key_profile_status') }</label>
                        <ProfileStatusMultiSelect
                            default={ defaultWorkerType }
                            options={ profileStatus }
                            onSelectChange={ handleStatusChange }
                        />
                    </CustomFormGroup> }

                    {/* <CustomFormGroup classNames={ 'flex-sm-fill flex-fill px6 customSelect mb-md-0 mb-2' }>
                        <label className="form-label mb12">{ t('key_type') }</label>
                        <div className="abc brdr9e">
                            <CustomDropDown
                                default={ defaultWorkerType }
                                handleClick={ handleTypeFilter }
                                list={ workerTypeList() }
                            />
                        </div>
                    </CustomFormGroup> */}

                    { isDefaultType === 1 ?
                        <div className="col-lg-3 col-md">
                            <label className="form-label">{ t('key_type') }</label>
                            <Select
                                styles={ customStylesOfMultiSelect }
                                closeMenuOnSelect={ true }
                                maxMenuHeight={ 170 }
                                options={
                                    workerTypeListLocal().map((item) => {
                                        return {
                                            value: item.id,
                                            label: item.name,
                                            isDisabled: !isAdmin && !allowedTypeIds.includes(item.key)
                                        };
                                    })
                                }
                                name="type"
                                placeholder={ t('key_please_select') }
                                onChange={ handleTypeFilter }
                                value={
                                    updateFilters?.type
                                        ? workerTypeListLocal()
                                            ?.map(item => ({
                                                value: item.id,
                                                label: item.name
                                            }))
                                            .find(option => option.value === updateFilters.type)
                                        : null
                                }
                            />
                        </div>
                        :
                        <div className="col-lg-3 col-md">
                            <label className="form-label">{ t('key_type') }</label>
                            <Select
                                styles={ customStylesOfMultiSelect }
                                closeMenuOnSelect={ true }
                                maxMenuHeight={ 170 }
                                options={
                                    workerTypeList().map((item) => {
                                        return {
                                            value: item.id,
                                            label: t(item.translationKey),
                                            isDisabled: !isAdmin && !allowedTypeIds.includes(item.key)
                                        };
                                    })
                                }
                                name="type"
                                placeholder={ t('key_please_select') }
                                onChange={ handleTypeFilter }
                                value={
                                    updateFilters?.type
                                        ? workerTypeList()
                                            ?.map(item => ({
                                                value: item.id,
                                                label: t(item.translationKey)
                                            }))
                                            .find(option => option.value === updateFilters.type)
                                        : null
                                }
                            />
                        </div>

                    }


                    {/* <CustomFormGroup classNames={ 'flex-sm-fill flex-fill px6 customSelect mb-md-0 mb-2' }>
                        <label className="form-label mb12">{ t('key_nationality') }</label>
                        <div className="abc brdr9e">
                            { (defaultWorkerType == "Local") ?
                                <CustomDropDown
                                    default={ defaultWorkerNationality }
                                    handleClick={ handleNationalityFilter }
                                    list={ workerNationalities }
                                />
                                :
                                <CustomDropDown
                                    default={ defaultWorkerNationality }
                                    handleClick={ handleNationalityFilter }
                                    list={ workerNationalities }
                                /> }
                        </div>
                    </CustomFormGroup> */}

                    <div className="col-lg-3 col-md">
                        <label className="form-label">{ t('key_nationality') }</label>
                        <Select
                            styles={ customStylesOfMultiSelect }
                            closeMenuOnSelect={ true }
                            maxMenuHeight={ 170 }
                            options={
                                workerNationalities.map((item) => {
                                    return {
                                        value: item.id,
                                        label: item.name,
                                        isDisabled: !isAdmin && !allowedNationalityIds.includes(item.id)
                                    };
                                })
                            }
                            name="nationality"
                            placeholder={ t('key_please_select') }
                            onChange={ handleNationalityFilterList }
                            value={
                                updateFilters?.nationality
                                    ? workerNationalities
                                        ?.map(item => ({
                                            value: item.id,
                                            label: item.name
                                        }))
                                        .find(option => option.value === updateFilters.nationality[0])
                                    : null
                            }
                        />
                    </div>

                    {/* <CustomFormGroup classNames={ ' flex-sm-fill flex-fill px6 customSelect mb-md-0 mb-2' }>
                        <label className="form-label mb12">{ t('key_code') }</label>
                        <Select
                            styles={ {
                                control: (provided) => ({
                                    ...provided,
                                    minHeight: '44px',
                                    border: '1px solid #9e9e9e',
                                    color: 'rgba(33, 33, 33, 1)',
                                    fontSize: '1rem',
                                }),
                            } }
                            maxMenuHeight={ 170 }
                            options={
                                mappingReferenceId &&
                                mappingReferenceId.map((item) => {
                                    return { value: item, label: item };
                                })
                            }
                            name="branch_id"
                            placeholder={ t('key_please_select') }
                            onChange={ handleBranchFilter }
                            isMulti
                        />
                    </CustomFormGroup> */}

                    <div className="col-lg-3 col-md">
                        <label className="form-label">{ t('key_code') }</label>
                        <Select
                            styles={ customStylesOfMultiSelect }
                            closeMenuOnSelect={ true }
                            maxMenuHeight={ 170 }
                            options={
                                mappingReferenceId &&
                                mappingReferenceId.map((item) => {
                                    return { value: item, label: item };
                                })
                            }
                            name="reference_id"
                            placeholder={ t('key_please_select') }
                            onChange={ handleBranchFilter }
                            isMulti
                            value={
                                mappingReferenceId && updateFilters?.reference_id
                                    ? mappingReferenceId
                                        .filter(item => updateFilters?.reference_id.includes(item))
                                        .map(item => {
                                            return { value: item, label: item };
                                        })
                                    : []
                            }
                        />
                    </div>


                    <CustomFormGroup classNames={ 'col  px-0 mb-md-0 mb-3' }>
                        <Link className="fw-500 fz16 lh-normal blue position-relative text-nowrap" style={ { top: '15px' } } onClick={ handleClearFilterAll }>{ t('key_clear_filters') }</Link>
                    </CustomFormGroup>

                    {/* <CustomFormGroup classNames={' flex-sm-fill flex-fill px6 customSelect mb-md-0 mb-2'}>
                        <label className="form-label mb12">Sort By</label>
                        <Select
                            styles={{
                                control: (provided) => ({
                                    ...provided,
                                    minHeight: '44px',
                                    border: '1px solid #9e9e9e',
                                    color: 'rgba(33, 33, 33, 1)',
                                    fontSize: '1rem',
                                }),
                            }}
                            maxMenuHeight={170}
                            options={
                                sortByList &&
                                sortByList.map((item) => {
                                    return { value: item.id, label: item.name };
                                })
                            }
                            name="sort_by"
                            placeholder="{ translation('key_please_select') }"
                            onChange={handleSortBy}
                        />
                    </CustomFormGroup> */}
                    {/* <CustomFormGroup classNames={' flex-sm-fill flex-fill px6 customSelect mb-md-0 mb-2'}>
                        <label className="form-label mb12">Order By</label>
                        <Select
                            styles={{
                                control: (provided) => ({
                                    ...provided,
                                    minHeight: '44px',
                                    border: '1px solid #9e9e9e',
                                    color: 'rgba(33, 33, 33, 1)',
                                    fontSize: '1rem',
                                }),
                            }}
                            maxMenuHeight={170}
                            options={
                                sortOrderList &&
                                sortOrderList.map((item) => {
                                    return { value: item.id, label: item.name };
                                })
                            }
                            name="sort_by"
                            placeholder="{ translation('key_please_select') }"
                            onChange={handleOrderBy}
                        />
                    </CustomFormGroup> */}
                </div>
            </div>
        </div >
    );
};

WorkerFilterInvoice.propTypes = {
    handleClearFilter: PropTypes.func,
    mappingReferenceId: PropTypes.array,
    fieldsToShow: PropTypes.array,
    handleFieldsToShow: PropTypes.func,
    selectedRows: PropTypes.array,
    setSelectedRows: PropTypes.func,
    filterByTypeWorkers: PropTypes.func,
    setType: PropTypes.func,
    filterByNationalityWorker: PropTypes.func,
    setNationality: PropTypes.func,
    filterByProfileStatusWorker: PropTypes.func,
    setStatus: PropTypes.func,
    filterByBranchCodeWorker: PropTypes.func,
    filterBySearchTextWorker: PropTypes.func,
    workerKababOptions: PropTypes.array,
    setWorkerKababOptions: PropTypes.func,
    handleRefresh: PropTypes.func,
    setCheckedItems: PropTypes.func,
    workerProfileStatusList: PropTypes.array,
    onUpdateActiveDashboard: PropTypes.func,
    workerNationalities: PropTypes.array,
    filterBySortWorker: PropTypes.func,
    filterByOrderWorker: PropTypes.func,
    actionType: PropTypes.string,
    trans: PropTypes.func,
    updateFilters: PropTypes.object,
    isDefaultType: PropTypes.string
}

export default WorkerFilterInvoice;