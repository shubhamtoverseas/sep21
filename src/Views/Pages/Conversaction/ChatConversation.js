import React from 'react';
import PropTypes from 'prop-types';
import mobileWhite from "../../../assets/img/svg/white-phone.svg";
import msgBlackIcon from "../../../assets/img/svg/message-black-icon.svg";
import crossCircle from "../../../assets/img/svg/cross-circle.svg";
const TranslationDropdown = React.lazy(() => import('./TranslationDropdown'));
const ChatConversation = ({ userDetailInfo, onOpenMessageTemplate, viewFrom = 'chat', onCloseChat, handleSaveTranslationLanguageMessage, chatLanguageInfo }) => {

    const handleSaveTranslationLanguagesChat = (payload) => {
        handleSaveTranslationLanguageMessage(payload);
    }
    return (
        <div className="chat-item d-flex align-items-center p-2 px-3 mb-0">
            <div className="mobile-icon-blue-bg avatar-img mr15">
                <img src={ mobileWhite } className="w20 h20" />
            </div>
            <div className="chat-info">
                <p className="user-name fz16 fw-500 lh-normal m-0 blue">
                    { userDetailInfo?.user_id ? userDetailInfo?.name : userDetailInfo?.friendly_name }
                </p>
            </div>
            <div className="ml-auto text-muted fz14 fw-400 d-flex justify-content-end">
                { viewFrom === 'processing' ? (
                    <img
                        src={ crossCircle }
                        className="cursor-pointer pointer"
                        onClick={ () => {
                            onCloseChat();
                        } }
                        width={20} height={20}
                    />
                ) : viewFrom === 'whatsapp' ? (
                    <>
                        <img
                            src={ msgBlackIcon }
                            className="mr-3 pointer"
                            onClick={ () => {
                                onOpenMessageTemplate();
                            } }
                        />
                        <img
                            src={ crossCircle }
                            className="cursor-pointer pointer"
                            onClick={ () => {
                                onCloseChat();
                            } }
                        />
                    </>
                ) : viewFrom === 'chat-screen' ? (
                    (userDetailInfo?.friend_type === "worker" || userDetailInfo?.friend_type === "employer") ? <img
                        src={ msgBlackIcon }
                        className="pointer"
                        onClick={ () => {
                            onOpenMessageTemplate();
                        } }
                    /> : ""
                ) : (
                    <img
                        src={ crossCircle }
                        className="cursor-pointer pointer"
                        onClick={ () => {
                            onCloseChat();
                        } }
                    />
                ) }
                <TranslationDropdown handleSaveTranslationLanguage={ handleSaveTranslationLanguagesChat } chatLanguageInfo={ chatLanguageInfo } />
            </div>
        </div>
    );
};
ChatConversation.propTypes = {
    userDetailInfo: PropTypes.object,
    onOpenMessageTemplate: PropTypes.func,
    viewFrom: PropTypes.string,
    onCloseChat: PropTypes.func,
    handleSaveTranslationLanguageMessage: PropTypes.func,
    chatLanguageInfo: PropTypes.object
}
export default ChatConversation;
