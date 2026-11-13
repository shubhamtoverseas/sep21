import React, { useState } from 'react';
import '../../collapsible-table/collapsible-table.css';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import translation from "../../../utils/translation";
const SelectAgentBranch = ({ onRowClick, mappingAgencies }) => {
    const [collapsed, setCollapsed] = useState({
        BGS: true,
        BSMS: false,
        MLS: false,
    });

    // Initialize selected state for checkbox selection
    const [selected, setSelected] = useState({ agencyCode: null, branchIndex: null });

    // Helper to initialize collapsed state for all agencies on first render
    React.useEffect(() => {
        if (mappingAgencies && mappingAgencies.length > 0) {
            const initialCollapsed = {};
            mappingAgencies.forEach(agency => {
                initialCollapsed[agency.code] = true; // or false if you want all collapsed by default
            });
            setCollapsed(initialCollapsed);
        }
        // eslint-disable-next-line
    }, [mappingAgencies]);

    const toggleCollapse = (key) => {
        setCollapsed({ ...collapsed, [key]: !collapsed[key] });
    };

    const onRowClicks = (agency, agencyCode, branchIndex) => {
        setSelected({ agencyCode, branchIndex });
        onRowClick(agency);
    }

    return (
        <table className="table table-bordered table-hover collapsible-table">
            <thead>
                <tr>
                    <th></th>
                    <th> { translation('key_agency_code_and_branch') }</th>
                    <th> { translation('key_cancelled') }</th>
                    <th> { translation('key_processing') }</th>
                    <th> { translation('key_placement') }</th>
                </tr>
            </thead>
            <tbody>
                { mappingAgencies?.map((agency) => (
                    <React.Fragment key={ agency.code }>
                        <tr className="collapse-head" >
                            <td className="p-0 collapsed-row">
                                <Link className="btn btn-link w-100 black" onClick={ (e) => { e.stopPropagation(); toggleCollapse(agency.code); } }>
                                    { collapsed[agency.code] ? <i className="ri-arrow-up-s-line fz20"></i> : <i className="ri-arrow-down-s-line fz20"></i> }
                                </Link>
                            </td>
                            <td><Link>{ agency.code }</Link>({ agency.branch_count })</td>
                            <td>0</td>
                            <td>0</td>
                            <td>0</td>
                            {/* <td className={agency.score >= 4 ? 'text-success' : agency.score >= 3 ? 'text-warning' : 'text-danger'}>{agency.score}</td> */ }
                            {/* <td>{agency.reviews}</td> */ }
                        </tr>
                        { collapsed[agency.code] &&
                            agency?.branch_list.map((detail, index) => (
                                <tr key={ index }>
                                    <td className="text-center">
                                        <div className="form-check">
                                            <input className="form-check-input"
                                                checked={ selected.agencyCode === agency.code && selected.branchIndex === index }
                                                onClick={ () => onRowClicks({ id: agency?.id, agency_name: agency?.name, code: agency?.code, branch_id: detail?.id, branch_name: detail?.branch_name, branch_code: detail?.branch_code }, agency.code, index) } type="checkbox" value="" id={ `flexCheckDefault-${ agency.code }-${ index }` }
                                            />
                                        </div>
                                    </td>
                                    <td><Link>{ detail?.branch_name } ({ detail?.branch_code })</Link></td>
                                    {/* <td><Link onClick={ () => onRowClicks({ id: agency?.id, agency_name: agency?.name, code: agency?.code, branch_id: detail?.id, branch_name: detail?.branch_name, branch_code: detail?.branch_code }, agency.code, index) }>{ detail?.branch_name } ({ detail?.branch_code })</Link></td> */ }
                                    {/* <td>{detail.joSpots}</td> */ }
                                    {/* <td className={detail.score >= 4 ? 'text-success' : detail.score >= 3 ? 'text-warning' : 'text-danger'}>{detail.score}</td> */ }
                                    <td>0</td>
                                    <td>0</td>
                                    <td>0</td>
                                </tr>
                            )) }
                    </React.Fragment>
                )) }
            </tbody>
        </table>
    );
};

SelectAgentBranch.propTypes = {
    onRowClick: PropTypes.func.isRequired,
    mappingAgencies: PropTypes.any
};

export default SelectAgentBranch;
