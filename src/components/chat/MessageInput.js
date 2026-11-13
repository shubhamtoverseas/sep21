import React, { useEffect, useRef, useCallback, memo } from "react";
import PropTypes from "prop-types";

const MAX_HEIGHT = 136;

const textareaStyle = {
  resize: "none",
  minHeight: "38px",
  maxHeight: "136px"
};

const MessageInput = ({
  message,
  setMessage,
  handleKeyDown,
  placeholder,
  disabled,
  containerHeight,
  onHeightChange
}) => {
  const textareaRef = useRef(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";

    const scrollHeight = el.scrollHeight;
    if (scrollHeight === 0) return;

    const newHeight = Math.min(scrollHeight, MAX_HEIGHT);

    el.style.height = newHeight + "px";
    el.style.overflowY = scrollHeight > MAX_HEIGHT ? "auto" : "hidden";

    if (onHeightChange) {
      onHeightChange(newHeight);
    }
  }, [onHeightChange]);

  useEffect(() => {
    if (!containerHeight) {
      autoResize();
    }
  }, [message, containerHeight, autoResize]);

  return (
    <textarea
      ref={ textareaRef }
      rows={ 1 }
      disabled={ disabled }
      className="form-control mr-2"
      value={ message }
      placeholder={ placeholder }
      onChange={ (e) => {
        setMessage(e.target.value);
        if (!containerHeight) {
          autoResize();
        }
      } }
      onKeyDown={ handleKeyDown }
      style={ textareaStyle }
    />
  );
};

MessageInput.propTypes = {
  message: PropTypes.string.isRequired,
  setMessage: PropTypes.func.isRequired,
  handleKeyDown: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  containerHeight: PropTypes.any,
  onHeightChange: PropTypes.func
};

export default memo(MessageInput);
