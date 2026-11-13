import React from 'react';
import PropTypes from 'prop-types';

import './chat-box-resizers.css';

const ChatBoxResizers = ({ onResizeStart }) => {
  const directions = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "top",
    "bottom",
    "left",
    "right",
  ];

  return (
    <>
      {directions.map((dir) => (
        <div
          key={dir}
          className={`chat-box-resizer ${dir}`}
          onMouseDown={(e) => onResizeStart(e, dir)}
        />
      ))}
    </>
  );
}
ChatBoxResizers.propTypes = {
    onResizeStart: PropTypes.func.isRequired
}

export default ChatBoxResizers;