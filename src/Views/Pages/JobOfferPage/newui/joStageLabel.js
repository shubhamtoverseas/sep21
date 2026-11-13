import translation from "../../../../utils/translation";
import { toTitleCase } from "../../../../utils/utils";
import { JO_STAGE } from "../jobOfferConstants";

const joStageLabel = (stageId) => toTitleCase(translation(JO_STAGE[stageId]?.key));

export default joStageLabel;
