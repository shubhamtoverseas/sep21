import React from 'react';
import JoStatusTag from '../../JobOfferPage/newui/JoStatusTag';

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
                    { renderDefault(row?.name) }
                </div>
            )
        },
        {
            header: t("key_chinese_name"),
            columnKey: 'key_chinese_name',
            sortKey: 'chinese_name',
            render: (row) => renderDefault(row?.chinese_name)
        },
        {
            header: t("key_hkid"),
            columnKey: 'key_hkid',
            sortKey: 'hk_id',
            render: (row) => {
                const hkId = row?.hk_id;
                const isBlank = !hkId || hkId === "''" || hkId === '""' || hkId === "''''''";
                let formattedHKID = isBlank ? '' : hkId.replace(/\s|\(|\)/g, '').toUpperCase();
                return renderDefault(isBlank ? null : `${ formattedHKID.slice(0, -1) }(${ formattedHKID.slice(-1) })`);
            }
        },
        {
            header: t("key_mobile"),
            columnKey: 'key_mobile',
            sortKey: 'mobile_number',
            render: (row) => renderDefault(row?.mobile_number)
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
            render: (row) => renderDefault(row?.latest_jo)
        },
        {
            header: t("key_jo_status"),
            columnKey: 'key_jo_status',
            render: (row) => (row?.latest_jo_status ? <JoStatusTag status={ row.latest_jo_status } /> : renderDefault(null))
        },
        {
            header: t("key_latest_contract"),
            columnKey: 'key_latest_contract',
            render: (row) => {
                try {
                    if (row?.latest_contract && typeof row.latest_contract === 'string') {
                        const parsed = JSON.parse(row.latest_contract);
                        return renderDefault(parsed?.display_status);
                    }
                    return renderDefault(null);
                } catch (e) {
                    return renderDefault(null);
                }
            }
        },
        {
            header: t("key_cs"),
            columnKey: 'key_cs',
            sortKey: 'cs_name',
            render: (row) => renderDefault(row?.cs_name)
        },
    ];
    return allColumns?.filter(column => fieldsToShow?.includes(column.columnKey));
} 