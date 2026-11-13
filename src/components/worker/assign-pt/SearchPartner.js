import React from 'react';
import '../../collapsible-table/collapsible-table.css';
import { Link } from "react-router-dom";
import PropTypes from 'prop-types';
import translation from '../../../utils/translation';

const SearchPartner = ({ onClickSelectStaff, staffList, handleIsChatOpen }) => {
    const [selectedStaffId, setSelectedStaffId] = React.useState(null);

    return (
        <table className="table table-bordered table-hover collapsible-table">
            <thead>
                <tr>
                    <th></th>
                    <th>{ translation('key_name') }</th>
                    <th>{ translation('key_email_id') }</th>
                    <th> { translation('key_contact') }</th>
                    <th> { translation('key_worker_assigned') }</th>
                </tr>
            </thead>
            <tbody>
                { staffList?.map((detail, index) => (
                    <tr key={ index }>
                        <td className="text-center">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={ selectedStaffId === detail.id }
                                    onChange={ () => {
                                        const newSelected = selectedStaffId === detail.id ? null : detail.id;
                                        setSelectedStaffId(newSelected);
                                        if (newSelected) onClickSelectStaff(detail);
                                    } }
                                    id={ `flexCheckDefault-${ detail.id }-${ index }` }
                                />
                            </div>
                        </td>
                        <td>
                            <Link onClick={ () => handleIsChatOpen(detail) }>{ detail.name }</Link>
                        </td>
                        <td>{ detail.email }</td>
                        <td>
                            { detail.whatsapp && (
                                <i onClick={ () => handleIsChatOpen(detail) }
                                    title={ (detail?.whatsapp_country_code ?? "") + "" + (detail.whatsapp ?? "") }
                                    className="ri-whatsapp-fill fz20 grey2 whatsapp-color"
                                ></i>
                            ) }
                        </td>
                        <td>{ detail.worker_count }</td>
                    </tr>
                )) }
            </tbody>
        </table>
    );
};

SearchPartner.propTypes = {
    onClickSelectStaff: PropTypes.any,
    staffList: PropTypes.any,
    handleIsChatOpen: PropTypes.func
};

export default SearchPartner;
