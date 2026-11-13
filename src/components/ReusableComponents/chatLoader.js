import React from 'react';
import PropTypes from 'prop-types';
import '../../assets/css/liquidLoader.css';

const ChatBubbleLoader = ({ paddingClass = 'p50' }) => (
    <div className={ `${ paddingClass } text-center` }>
        <div className="chat-bubble-loader">
            <div className="typing">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
            </div>
        </div>
    </div>

);
ChatBubbleLoader.propTypes = {
    paddingClass: PropTypes.string
};
export default ChatBubbleLoader;