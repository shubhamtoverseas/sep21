import { useCallback, useEffect, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { importShiftCode } from "../../../../../../redux/Slices/settings/shift-code/ShiftCodeSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { downloadExcelFromBufferData, downloadFile, generateFilename, showErrorMessage } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import {
    IMPORT_FEEDBACK_FILE_EXTENSION,
    IMPORT_FEEDBACK_FILE_KEYWORD,
    IMPORT_MAX_FILE_BYTES,
    SHIFT_TEMPLATE_PATH,
    XLSX_EXTENSION,
    XLSX_MIME,
} from "../../settingsNewUiConstants";

const isXlsx = (file) => file.type === XLSX_MIME || file.name.toLowerCase().endsWith(XLSX_EXTENSION);

const selectImport = (state) => ({
    feedbackData: state.shiftCodes.shiftCodeFeedbackData,
    feedbackHeaders: state.shiftCodes.shiftCodeFeedbackHeaders,
});

/** Ports ImportShiftRoaster.js: xlsx validation, FormData upload, feedback download. */
const useImportShiftRoster = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { feedbackData, feedbackHeaders } = useSelector(selectImport, shallowEqual);

    const [uploadedFile, setUploadedFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [isResultOpen, setIsResultOpen] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => () => { if (uploadedFile?.url) URL.revokeObjectURL(uploadedFile.url); }, [uploadedFile]);

    const acceptFile = useCallback((file) => {
        setFileError("");
        if (!file) return;
        if (!isXlsx(file)) {
            const message = translation("key_only_xlsx_files_are_allowed");
            setFileError(message);
            ShowToast("error", message);
            return;
        }
        if (file.size > IMPORT_MAX_FILE_BYTES) {
            const message = translation("key_drag_and_drop_to_upload_max_5m");
            setFileError(message);
            ShowToast("error", message);
            return;
        }
        setUploadedFile({ url: URL.createObjectURL(file), filename: file.name, size: file.size, file });
    }, []);

    const onInputChange = useCallback((event) => acceptFile(event.target.files?.[0]), [acceptFile]);
    const onDrop = useCallback((event) => {
        event.preventDefault();
        acceptFile(event.dataTransfer?.files?.[0]);
    }, [acceptFile]);

    const clearFile = useCallback(() => {
        if (uploadedFile?.url) URL.revokeObjectURL(uploadedFile.url);
        setUploadedFile(null);
        setFileError("");
        if (inputRef.current) inputRef.current.value = "";
    }, [uploadedFile]);

    const uploadAgain = useCallback(() => {
        clearFile();
        inputRef.current?.click();
    }, [clearFile]);

    const downloadUploaded = useCallback(() => {
        if (!uploadedFile?.url) return;
        const link = document.createElement("a");
        link.href = uploadedFile.url;
        link.download = uploadedFile.filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [uploadedFile]);

    const downloadTemplate = useCallback(() => downloadFile(SHIFT_TEMPLATE_PATH), []);

    const downloadFeedback = useCallback(async () => {
        if (feedbackData) await downloadExcelFromBufferData(feedbackData, generateFilename(IMPORT_FEEDBACK_FILE_KEYWORD, IMPORT_FEEDBACK_FILE_EXTENSION));
    }, [feedbackData]);

    const run = useCallback(() => {
        const file = uploadedFile?.file;
        if (!file || !isXlsx(file)) {
            ShowToast("error", translation("key_only_xlsx_files_are_allowed"));
            return;
        }
        const formData = new FormData();
        formData.append("file", file);
        setIsImporting(true);
        dispatch(importShiftCode(formData))
            .then((res) => {
                showErrorMessage(res);
                if (!res.error) {
                    ShowToast("success", translation("key_shift_roster_imported_successfully"));
                    setIsResultOpen(true);
                    clearFile();
                }
            })
            .finally(() => setIsImporting(false));
    }, [clearFile, dispatch, uploadedFile]);

    const onCancel = useCallback(() => navigate(-1), [navigate]);
    const closeResult = useCallback(() => setIsResultOpen(false), []);

    return {
        inputRef,
        uploadedFile,
        fileError,
        isImporting,
        isResultOpen,
        feedbackHeaders,
        onInputChange,
        onDrop,
        clearFile,
        uploadAgain,
        downloadUploaded,
        downloadTemplate,
        downloadFeedback,
        run,
        onCancel,
        closeResult,
    };
};

export default useImportShiftRoster;
