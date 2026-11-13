import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import './agent-dropdown-options.css';
import whatsApp from "../../assets/img/svg/whatsapp-icon.svg";
import lineApp from "../../assets/img/svg/chat-chatting-line.svg";
import mobileBlueIcon from '../../assets/img/svg/phone-blue.svg';
const AgentDropdownOptions = (props) => {
    const { data, isDisabled } = props;
    // (last_message can be null for conversations without a text message)
    const lastMessage = data.last_message || '';
    const truncatedMessage = lastMessage.length > 20
        ? lastMessage.slice(0, 20) + '...'
        : lastMessage;

    return (
        <components.Option { ...props }>
            <div className={ `agents-listing-options my-1${ isDisabled ? ' is-disabled' : '' }` } >
                <p className="agent-title mb4 mr4">{ data.name } <span className='agent-role'>{ data.role_name }</span></p>
                <div className='d-flex'>
                    <img
                        src={ data.platform === "line" ? lineApp : data.platform === "whatsapp" ? whatsApp : mobileBlueIcon }
                        alt={ `${ data.name } avatar` }
                        className='w20 h20 agent-type mr4'
                    />
                    <span className='agent-desc mr4'>{ truncatedMessage }</span>
                    <span className='agent-last-update'>{ data.timestamp }</span>
                </div>
            </div>
        </components.Option>
    );
};
AgentDropdownOptions.propTypes = {
    data: PropTypes.shape({
        avatar: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        role: PropTypes.string.isRequired,
        timestamp: PropTypes.string.isRequired,
        last_message: PropTypes.string,
        role_name: PropTypes.string,
        platform: PropTypes.string,
    }).isRequired,
    isDisabled: PropTypes.bool,
};
export default AgentDropdownOptions;