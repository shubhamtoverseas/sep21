import React, { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import PropTypes from 'prop-types';
const ConsulatetTabFillipino = lazy(() => import("./ConsulatetTabFillipino"));
const ConsulatetTabIndonesia = lazy(() => import("./ConsulatetTabIndonesia"));
import WkdDetCardHead from "../../newui/details/WkdDetCardHead";
import WkdDetSaveBar from "../../newui/details/WkdDetSaveBar";
import { indonesiaId, fillipinoId } from "../../../../../../components/ReusableComponents/constants";
import translation from "../../../../../../utils/translation";
import { DET_FORM_IDS } from "../../../workerModuleConstants";

const ConsulatetTabDetails = ({ onSaved, onCancel, sectionStatus }) => {
    const { workerDetailTabInfoConsulate, status } = useSelector((state) => state.worker)

    return <>
        <div className="g2-card wkd-det-card">
            <WkdDetCardHead title={ translation('key_consulate') } status={ sectionStatus } />
            <Suspense fallback={ <div>{ translation('key_loading') }...</div> }>
                { (workerDetailTabInfoConsulate?.nationality?.id == fillipinoId)
                    && <ConsulatetTabFillipino workerDetail={ workerDetailTabInfoConsulate } formId={ DET_FORM_IDS.consulate } onSaved={ onSaved } />
                }
                { (workerDetailTabInfoConsulate?.nationality?.id == indonesiaId)
                    && <ConsulatetTabIndonesia workerDetail={ workerDetailTabInfoConsulate } formId={ DET_FORM_IDS.consulate } onSaved={ onSaved } />
                }
            </Suspense>
        </div>
        <WkdDetSaveBar formId={ DET_FORM_IDS.consulate } onCancel={ onCancel } saving={ status === 'loading' } />
    </>
}

ConsulatetTabDetails.propTypes = {
    onSaved: PropTypes.func,
    onCancel: PropTypes.func,
    sectionStatus: PropTypes.string,
};

export default React.memo(ConsulatetTabDetails);
