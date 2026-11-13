import { createContext, useContext } from "react";

/**
 * True while a Processing stage tab is rendered inside the Contract Details page (prototype Contract_Details.html).
 * ProcessingDetail provides it in `embedded` mode; CommonTabContent (no Remarks / Chat side column) and StageTitle
 * (prototype panel head instead of the 24px title) read it, so nested tabs (Visa, Deployment, Pre-Departure) need no
 * prop threading.
 */
export const EmbeddedContext = createContext(false);
export const useEmbedded = () => useContext(EmbeddedContext);
