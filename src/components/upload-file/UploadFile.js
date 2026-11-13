import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import "./upload-file.css";
import uploadBoxIcon from "../../assets/img/svg/upload-box-icon.svg";
import translation from "../../utils/translation";
const UploadFile = forwardRef(({ marginBottomClass = 'mb24', onChange, accept, ...rest }, ref) => {
    return (
        <div className={`${marginBottomClass} upload-file-wrapper text-center`}>
            <div className='upload-box mx-auto'>
                <input
                    type='file'
                    className='file-input'
                    onChange={onChange}
                    accept={accept}
                    ref={ref}
                    {...rest}
                />
                <img src={uploadBoxIcon} className='mb-3' alt="Upload Icon" />
                <p className='mb-0'>{ translation('key_drag_and_drop_to_upload_max_5m') }</p>
            </div>
        </div>
    );
});

UploadFile.displayName = 'UploadFile';

UploadFile.propTypes = {
    onChange: PropTypes.func.isRequired,
    accept: PropTypes.string,
    marginBottomClass: PropTypes.string,
};

export default UploadFile;
