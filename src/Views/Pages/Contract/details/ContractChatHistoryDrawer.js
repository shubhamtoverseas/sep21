import React, { useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import useDialogFocus from "../../../../hooks/useDialogFocus";
import { tr } from "../../../../components/mc-dialog/McDialog";
import WkdChatHistoryPanel from "../../WorkerPage/worker-detail/newui/context/WkdChatHistoryPanel";
import "../../WorkerPage/worker-detail/newui/worker-details.css";
import "./contract-actions.css";

/**
 * Contract Details → Context → Chat History drawer: the handoff's delivered Chat History panel (Worker_Details.html
 * chatHistoryPanelHTML — Contract_Details.html opens "this panel" from the rail card) in the shared .mcca-drawer frame.
 * The body is the same WkdChatHistoryPanel the Worker and Employer rails use (its `.wkd` stylesheet), on the record's
 * worker account: conversations list (chats/get-conversactions-history) → read-only timeline (chat history list).
 */
const X = <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>;

const ContractChatHistoryDrawer = ({ row, onClose }) => {
  const ref = useRef(null);
  useDialogFocus(ref, onClose);
  const sub = [row?.worker_name, row?.worker_code || row?.contract_number].filter(Boolean);
  return createPortal(
    <>
      <div className="mcca-backdrop" role="presentation" onClick={ onClose } />
      <aside ref={ ref } className="mcca-drawer mcca-chat" role="dialog" aria-modal="true" aria-labelledby="mcca-ch-title" tabIndex={ -1 } data-chat-history-drawer="">
        <header className="hd">
          <div><h2 id="mcca-ch-title">{ tr("key_chat_history", "Chat History") }</h2>{ sub.length > 0 && <div className="sub">{ sub[0] }{ sub[1] && <> · <span className="mono">{ sub[1] }</span></> }</div> }</div>
          <button type="button" className="ctx-icon-btn" aria-label={ tr("key_close", "Close") } onClick={ onClose }>{ X }</button>
        </header>
        <div className="bd wkd">
          { row?.worker_user_id ? (
            <WkdChatHistoryPanel userId={ row.worker_user_id } workerName={ row.worker_name || "" } entityLabelKey="key_worker" />
          ) : (
            /* prototype emptyPanel: a worker without an app account has no conversations to list */
            <div className="ctx-state" data-context-state="empty"><span className="ctx-state-icon" aria-hidden="true">—</span><strong>{ tr("key_no_chat_history", "No chat history") }</strong><span>{ tr("key_no_worker_account_linked", "No worker account is linked to this contract, so there are no conversations to show.") }</span></div>
          ) }
        </div>
      </aside>
    </>,
    document.body,
  );
};

ContractChatHistoryDrawer.propTypes = {
  row: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default ContractChatHistoryDrawer;
