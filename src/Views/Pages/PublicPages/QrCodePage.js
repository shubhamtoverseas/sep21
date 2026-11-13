import React, { useEffect, useState, lazy } from "react";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { Link } from "react-router-dom";
import appIcon from '../../../assets/img/svg/app-icon.svg';
import appText from '../../../assets/img/svg/app-text.svg';
import qrCodeImg from '../../../assets/img/qr-code.png';
import DetailItem from "../Employer/employer-details/basic-details/DetailItem";
import './qr-code.css';
import { SETTINGS_API_URL, REACT_APP_X_API_KEY, HOST_TYPE } from "../../../services/apiPath";
import translation from "../../../utils/translation";
const ActionLoader = lazy(() => import("../../../components/ReusableComponents/ActionLoader"));

const QrCodePage = () => {
  const [qrInfo, setQrInfo] = useState(null);
  const [branchDetails, setBranchDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQrInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        // Get branchId from URL query param "?q="
        const params = new URLSearchParams(window.location.search);
        const branchIdFromUrl = params.get('q');
        const token = branchIdFromUrl;
        if (!token) {
          throw new Error("QR token is required to fetch QR info.");
        }
        const response = await axios.get(
          `${ SETTINGS_API_URL }/settings/branch/qr-token-info?qrtoken=${ token }`,
          {
            headers: {
              hosttype: HOST_TYPE,
              timezone: 'Asia/Calcutta',
              'x-api-key': REACT_APP_X_API_KEY
            }
          }
        );
        console.log('QR Info Response:', response.data?.data);
        const data = response?.data?.data || {};
        setQrInfo(data);
        setBranchDetails(data.branch_details || {});
      } catch (err) {
        setError(err?.response?.data?.message || err.message);
        setQrInfo(null);
      } finally {
        setLoading(false);
      }
    };
    fetchQrInfo();
  }, []);

  const handlePrint = (e) => {
    e.preventDefault();
    window.print();
  };

  return (
    <>
      <Helmet>
        <title>Scan QR Code</title>
        <meta name="description" content={ '' } />
      </Helmet>
      <div className="qr-code-page home-page">
        <div className="qr-code-container">
          <div className="text-center">
            { loading && <div className="mb20"><ActionLoader /></div> }
            { !loading && (
              <>
                <div className="qr-code-box pb32 pt32">
                  { error && <div className="mb20 text-danger">{ error }</div> }
                  <div className="row">
                    <div className="col-12">
                      <img src={ appIcon } width={ 77 } alt="app icon mb18" className="mb18 app-icon" />
                    </div>
                    <div className="col-12 mb32">
                      <img src={ appText } width={ 187 } alt="app icon mb18" className="app-text" />
                    </div>
                    <div className="col-12 mb32">
                      <p className="fz22 fw-500 cooper-bt mb-0">Scan the QR Code</p>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-6 mb20">
                      <DetailItem title='Branch Name' desc={ branchDetails?.branch_name || "-" } />
                    </div>
                    <div className="col-6 mb20">
                      <DetailItem title='Agency Name' desc={ branchDetails?.agency_name || "-" } />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col mb20">
                      <DetailItem title='Branch Address' desc={ branchDetails?.branch_address || "-" } />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col mb20">
                      <img src={ qrInfo?.qr_image || qrCodeImg } alt={ translation('key_qr') } style={ { maxWidth: '370px' } } className="qr-code-image-popup mx-auto d-block" />
                    </div>
                  </div>
                  <div className="row no-print">
                    <div className="col">
                      <button className="rounded-filled-btn-maidmatch">Get The App</button>
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-end no-print">
                  <Link to="#" onClick={ handlePrint } className="mb-3 mt-1 px-3 fz18 fw-500 cooper-bt">Print</Link>
                </div></>
            ) }
          </div>
        </div>
      </div>
    </>
  );
};

export default QrCodePage;