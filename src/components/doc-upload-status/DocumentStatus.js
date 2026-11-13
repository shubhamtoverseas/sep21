import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import closeMark from "../../assets/img/svg/close-mark.svg";
import docIcon from '../../assets/img/pdf.png';
import translation from "../../utils/translation";
import zoomOutIcon from "../../assets/img/svg/zoom_out.svg";
import zoomInIcon from "../../assets/img/svg/zoom_in.svg";
import handDragIcon from "../../assets/img/svg/hand-drag.svg";
import rotateIcon from "../../assets/img/svg/rotate-icon.svg";
import ImageZoomViewer from "../img-zoom-viewer/ImageZoomViewer";
import { timeSince } from "../../services/commonService";
import { changeDynamicDateFormate } from "../../utils/utils";
import dayjs from "dayjs";

const DocumentStatus = ({ docTitle, docStatus, docUpdatedAt, uploadedDoc, docText, id, canStartOn= '', lastAvailable }) => {

  const { allMessageListAction } = useSelector((state) => state.chat)
  const [daysDifference, setDaysDifference] = useState(null);
  const [actionClass, setActionClass] = useState("actionrequireddoc"); //actionrequireddoc, actionrequireddocBlue

  useEffect(() => {
    if (Array.isArray(allMessageListAction?.data) && allMessageListAction?.data.length > 0) {
      const allRecords = allMessageListAction?.data;
      const lastRecord = allRecords[allRecords.length - 1];
      if (lastRecord.created_by == id) {
        setActionClass("actionrequireddocBlue");
      } else {
        setActionClass("actionrequireddoc");
      }
    }
  }, [allMessageListAction, id]);


  const getItemColor = (status) => {
    switch (status) {
      case "in_complete":
        return "notuploadeddoc";
      case "in_review":
        return "inreviewdoc";
      case "action_required":
        return actionClass ? actionClass : "actionrequireddoc";
      case "verified":
        return "verified";
      case "uploaded":
        return "uploadeddoc";
      default:
        return "notuploadeddoc";
    }
  };

  const setStatuscolor = getItemColor(docStatus);
  const fileExtension = (uploadedDoc) ? uploadedDoc.split('.').pop().split('?')[0] : "";
  const isDocOrPdf = fileExtension === 'pdf' || fileExtension === 'doc' || fileExtension === 'docx';

  useEffect(() => {
    if (docUpdatedAt) {
      setDaysDifference(timeSince(docUpdatedAt));
    }
  }, [docUpdatedAt]);

  return (
    <div className="document-status">
      <div className="row align-items-center col-md-12 col-lg-12 col-xl-12">
        <div className="col d-flex align-items-center p-0">
          <p className="fz24 fw-700 d-inline-block m-0">{ docText ? docText : docTitle }</p>
          <button className={ `btn chip small ${ setStatuscolor } ml12 mr12` }>
            { !docStatus || docStatus === "in_complete"
              ? "Incomplete"
              : docStatus === "in_review"
                ? "In Review"
                : docStatus === "action_required" ? "Action Required" : docStatus?.charAt(0)?.toUpperCase() + docStatus.slice(1) }
          </button>
          { docStatus && docStatus !== "in_complete" && (
            <span className="fz14 fw-500 grey pl12 pr12 left-border">
              { (daysDifference) ? "Updated: " + daysDifference : "" }
            </span>
          ) }
          { canStartOn && (
            <span className="fz14 fw-500 grey pl12 pr12 left-border">
              {translation('key_can_start') + ' ' + translation('key_on')} : {changeDynamicDateFormate(canStartOn, "DD MMM YY")} 
            </span>
          ) }
          {lastAvailable && (
            <span className="fz14 fw-500 grey pl12 left-border">
              Last Avl : {changeDynamicDateFormate(lastAvailable, "DD MMM YYYY")}{" "}
              ({dayjs(lastAvailable).diff(dayjs(), "day")} days)
            </span>
          )}
        </div>
      </div>
      <div className="row align-items-center col-md-12 col-lg-12 col-xl-12 mt-3">
        <div className="col p-0">
          { (docTitle != "Photo" && docTitle != "Consulate" && docTitle != "Biodata" && docTitle != "Medical Verification" && docTitle != "Training Certificate" && docTitle != "Labor ID" && docTitle != "Submit Document" && docTitle != "PassportNeverApplied") && (<div className="doc-upload-wrapper mb24">

            { uploadedDoc ?

              isDocOrPdf ? (
                <div className="document-info">
                  { fileExtension === 'pdf' ? (
                    <div className="pdf-preview-container">
                      <iframe
                        src={ uploadedDoc }
                        className="pdf-preview"
                        style={ {
                          width: '100%',
                          height: '300px',
                          maxHeight: '300px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        } }
                        title={ translation('key_pdf_preview') }
                      />
                    </div>
                  ) : (
                    <>
                      <img loading="lazy"
                        src={ docIcon }
                        alt={ `${ fileExtension } icon` }
                        className="document-icon"
                      />
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={ uploadedDoc }
                        download={ uploadedDoc }
                        className="download-button"
                      >
                        { translation('key_download') }
                      </a>
                    </>
                  ) }
                </div>
              ) : (
                <ImageZoomViewer
                  imageSrc={ uploadedDoc }
                  altText={ translation('key_upload_document') }
                  zoomOutIcon={ zoomOutIcon }
                  zoomInIcon={ zoomInIcon }
                  handDragIcon={ handDragIcon }
                  rotateIcon={ rotateIcon }
                />
              )
              : (
                <div className="d-flex justify-content-center align-items-center text-danger workerDocumentnotuploaded">
                  <img loading="lazy" src={ closeMark } className="mr8" />
                  { translation('key_not_uploaded') }
                </div>
              ) }
          </div>) }  </div>
      </div>

    </div>
  );
};

DocumentStatus.propTypes = {
  docTitle: PropTypes.string,
  docStatus: PropTypes.string,
  docUpdatedAt: PropTypes.string,
  uploadedDoc: PropTypes.string,
  workerOverseasInfo: PropTypes.any,
  docText: PropTypes.string,
  id: PropTypes.any,
  canStartOn: PropTypes.string,
  lastAvailable: PropTypes.string
};
export default DocumentStatus;
