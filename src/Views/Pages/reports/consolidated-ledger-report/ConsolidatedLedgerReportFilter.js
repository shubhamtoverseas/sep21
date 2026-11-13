import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import PropTypes from 'prop-types';

import translation from "../../../../utils/translation";
import { isAdminUser } from "../../../../services/commonService";
import { ReportChip, ReportDateChip, ReportFilters } from "../ReportShell";
import dayjs from "dayjs";

const formatDate = (date) => {
    if (!date) return '';
    return dayjs(date).format('YYYY-MM-DD');
};

const ConsolidatedLedgerReportFilter = ({
    onClearFilter,
    onFilterLedgerList,
    updateFilters,
    actionList,
    paymentMethodList,
    branchList,
    invoiceCsList,
}) => {
    const [dateRange, setDateRange] = useState({
        startDate: null,
        endDate: null,
    });

    // First 3 are multiselect
    const [actionSelect, setActionSelect] = useState([]);
    const [paymentMethodSelect, setPaymentMethodSelect] = useState([]);
    const [branchSelect, setBranchSelect] = useState([]);

    // Invoice CS is single select
    const [invoiceCsSelect, setInvoiceCsSelect] = useState(null);

    const isAdmin = isAdminUser();


    const actionOptions = useMemo(() => (
        Array.isArray(actionList)
            ? actionList.map(item => ({ value: item.id, label: item.name }))
            : []
    ), [actionList]);

    const paymentMethodOptions = useMemo(() => (
        Array.isArray(paymentMethodList)
            ? paymentMethodList.map(item => ({ value: item.id, label: item.name }))
            : []
    ), [paymentMethodList]);

    const branchOptions = useMemo(() => (
        Array.isArray(branchList)
            ? branchList.map(item => ({ value: item.id, label: item.name }))
            : []
    ), [branchList]);

    const invoiceCsOptions = useMemo(() => (
        Array.isArray(invoiceCsList)
            ? invoiceCsList.map(item => ({ value: item.id, label: item.name }))
            : []
    ), [invoiceCsList]);

    // Sync local state with updateFilters from Redux
    useEffect(() => {
        if (updateFilters) {
            // Date range
            if (updateFilters.from_date && updateFilters.to_date) {
                setDateRange({
                    startDate: dayjs(updateFilters.from_date).toDate(),
                    endDate: dayjs(updateFilters.to_date).toDate(),
                });
            } else {
                setDateRange({ startDate: null, endDate: null });
            }

            // Action (multiselect)
            if (updateFilters.action && Array.isArray(updateFilters.action) && actionList) {
                const selected = updateFilters.action.map(value => {
                    const found = actionList.find(a => a.id === value);
                    return found ? { value: found.id, label: found.name } : null;
                }).filter(Boolean);
                setActionSelect(selected);
            } else {
                setActionSelect([]);
            }

            // Payment Method (multiselect)
            if (updateFilters.payment_method && Array.isArray(updateFilters.payment_method) && paymentMethodList) {
                const selected = updateFilters.payment_method.map(value => {
                    const found = paymentMethodList.find(p => p.id === value);
                    return found ? { value: found.id, label: found.name } : null;
                }).filter(Boolean);
                setPaymentMethodSelect(selected);
            } else {
                setPaymentMethodSelect([]);
            }

            // Branch (multiselect)
            if (updateFilters.branch_id && Array.isArray(updateFilters.branch_id) && branchList) {
                const selected = updateFilters.branch_id.map(id => {
                    const branch = branchList.find(b => b.id === id);
                    return branch ? { value: branch.id, label: branch.name } : null;
                }).filter(Boolean);
                setBranchSelect(selected);
            } else {
                setBranchSelect([]);
            }

            // Invoice CS (single select)
            if (updateFilters.invoice_cs_id && invoiceCsList) {
                const found = invoiceCsList.find(c => c.id === updateFilters.invoice_cs_id);
                setInvoiceCsSelect(found ? { value: found.id, label: found.name } : null);
            } else {
                setInvoiceCsSelect(null);
            }
        }
    }, [updateFilters, actionList, paymentMethodList, branchList, invoiceCsList]);

    const buildFilters = useCallback((
        currentDateRange = dateRange,
        currentActionSelect = actionSelect,
        currentPaymentMethodSelect = paymentMethodSelect,
        currentBranchSelect = branchSelect,
        currentInvoiceCsSelect = invoiceCsSelect,
    ) => {
        const filters = {};

        // Date range
        if (currentDateRange.startDate && currentDateRange.endDate) {
            filters.from_date = formatDate(currentDateRange.startDate);
            filters.to_date = formatDate(currentDateRange.endDate);
        } else {
            filters.from_date = '';
            filters.to_date = '';
        }

        filters.action = Array.isArray(currentActionSelect)
            ? currentActionSelect.map(item => item.value)
            : [];
        filters.payment_method = Array.isArray(currentPaymentMethodSelect)
            ? currentPaymentMethodSelect.map(item => item.value)
            : [];
        filters.branch_id = Array.isArray(currentBranchSelect)
            ? currentBranchSelect.map(item => item.value)
            : [];
        filters.invoice_cs_id = currentInvoiceCsSelect?.value || null;

        return filters;
    }, [dateRange, actionSelect, paymentMethodSelect, branchSelect, invoiceCsSelect]);

    const handleDateRangeChange = useCallback((range) => {
        if (!range.startDate || !range.endDate) {
            setDateRange({ startDate: null, endDate: null });
        } else {
            setDateRange({
                startDate: dayjs(range.startDate).startOf('day').toDate(),
                endDate: dayjs(range.endDate).startOf('day').toDate(),
            });
        }
    }, []);

    const handleActionChange = useCallback((selectedOptions) => {
        setActionSelect(selectedOptions || []);
    }, []);

    const handlePaymentMethodChange = useCallback((selectedOptions) => {
        setPaymentMethodSelect(selectedOptions || []);
    }, []);

    const handleBranchChange = useCallback((selectedOptions) => {
        setBranchSelect(selectedOptions || []);
    }, []);

    const handleInvoiceCsChange = useCallback((selectedOption) => {
        setInvoiceCsSelect(selectedOption || null);
    }, []);

    const handleGoClick = useCallback(() => {
        const filters = buildFilters();
        onFilterLedgerList(filters);
    }, [buildFilters, onFilterLedgerList]);

    const handleClearFilter = useCallback(() => {
        setDateRange({ startDate: null, endDate: null });
        setActionSelect([]);
        setPaymentMethodSelect([]);
        setBranchSelect([]);
        setInvoiceCsSelect(null);
        onClearFilter();
    }, [onClearFilter]);

    return (
        <ReportFilters onGo={handleGoClick} onClear={handleClearFilter}>
            <ReportChip id="ledger-report-action" label={translation('key_action')} options={actionOptions} value={actionSelect} onChange={handleActionChange} multiple />
            <ReportChip id="ledger-report-payment_method" label={translation('key_payment_method')} options={paymentMethodOptions} value={paymentMethodSelect} onChange={handlePaymentMethodChange} multiple />
            <ReportChip id="ledger-report-branch_id" label={translation('key_branch')} options={branchOptions} value={branchSelect} onChange={handleBranchChange} multiple />
            <ReportChip id="ledger-report-invoice_cs_id" label={translation('key_invoice') + ' ' + translation('key_cs')} options={invoiceCsOptions} value={invoiceCsSelect} onChange={handleInvoiceCsChange} />
            <ReportDateChip label={translation('key_date_range')} onChange={handleDateRangeChange} startDate={dateRange.startDate} endDate={dateRange.endDate} isClearable={true} datePermission={null} customDatePermission={null} isAdmin={isAdmin} />
        </ReportFilters>
    );
};

ConsolidatedLedgerReportFilter.propTypes = {
    onClearFilter: PropTypes.func,
    onFilterLedgerList: PropTypes.func,
    updateFilters: PropTypes.object.isRequired,
    actionList: PropTypes.array,
    paymentMethodList: PropTypes.array,
    branchList: PropTypes.array,
    invoiceCsList: PropTypes.array,
};

export default memo(ConsolidatedLedgerReportFilter);