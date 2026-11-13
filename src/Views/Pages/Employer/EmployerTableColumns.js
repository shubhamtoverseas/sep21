import React from 'react';
import { formatHKIDForDisplay } from '../../../services/commonService';
import JoStatusTag from '../JobOfferPage/newui/JoStatusTag';

const renderDefault = (value) => <span>{ value || '-' }</span>;

export const EmployerTableColumns = ({ fieldsToShow, t }) => {
    const allColumns = [
        {
            header: t("key_employer_name"),
            columnKey: 'key_employer_name',
            sortKey: 'name',
            leftAlign: true,
            render: (row) => (
                <div className="fz14 fw-400">
                    { renderDefault(row?.name.trim()) }
                </div>
            )
        },
        {
            header: t("key_chinese_names"),
            columnKey: 'key_chinese_names',
            sortKey: 'chinese_names',
            render: (row) => renderDefault(row?.chinese_name)
        },
        {
            header: t("key_hkid"),
            columnKey: 'key_hkid',
            sortKey: 'hk_id',
            render: (row) => renderDefault(formatHKIDForDisplay(row?.hk_id) || null)
        },
        {
            header: t("key_mobile"),
            columnKey: 'key_mobile',
            sortKey: 'mobile_number',
            render: (row) => renderDefault(row?.mobile_number)
        },
        {
            header: t("key_whatsapp"),
            columnKey: 'key_whatsapp',
            sortKey: 'whatsapp_number',
            render: (row) => renderDefault(row?.whatsapp_number)
        },
        {
            header: t("key_email"),
            columnKey: 'key_email',
            sortKey: 'email',
            render: (row) => renderDefault(row?.email)
        },
        {
            header: t("key_latest_job_offer"),
            columnKey: 'key_latest_job_offer',
            render: (row) => <span className="blue">{ renderDefault(row?.latest_jo) }</span>
        },
        {
            header: t("key_jo_status"),
            columnKey: 'key_jo_status',
            render: (row) => (row?.latest_jo_status ? <JoStatusTag status={ row.latest_jo_status } /> : '-')
        },
        {
            header: t("key_latest_contract"),
            columnKey: 'key_latest_contract',
            render: (row) => {
                try {
                    if (row?.latest_contract && typeof row.latest_contract === 'string') {
                        const parsed = JSON.parse(row.latest_contract);
                        return <span className="blue">{ renderDefault(parsed?.display_status) }</span>;
                    }
                    return <span className="blue">{ renderDefault(null) }</span>;
                } catch (e) {
                    return <span className="blue">{ renderDefault(null) }</span>;
                }
            }
        },
        {
            header: t("key_cs"),
            columnKey: 'key_cs',
            sortKey: 'cs_name',
            render: (row) => renderDefault(row?.cs_name)
        },
        {
            header: t("key_duplicate_reason"),
            columnKey: 'key_duplicate_reason',
            sortKey: '',
            render: (row) => <span className="text-danger">{ row?.matched_columns || '-' }</span>
        },
    ];
    return allColumns?.filter(column => fieldsToShow?.includes(column.columnKey));
} 