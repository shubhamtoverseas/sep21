import axios from "axios";
import { getAccessToken, getLocalTimeZone } from "./commonService";
import { apiPath, APP_URL, REACT_APP_X_API_KEY, HOST_TYPE } from "./apiPath";
import { ShowToast } from "../components/show-toast/ShowToast";
import translation from "../utils/translation";

const isPresigned = (x) => x && typeof x === 'object' && typeof x.url === 'string';
const normalizeSignedUrlList = (body) => {
  const data = body?.data ?? body;
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return null;
  for (const key of ['data', 'urls', 'files', 'signed_urls', 'signedUrls', 'items']) {
    if (Array.isArray(data[key])) return data[key];
  }
  if (isPresigned(data)) return [data];
  const values = Object.values(data);
  return values.length && values.every(isPresigned) ? values : null;
};

export const uploadFilesToS3 = async (filesToUpload, hideToast = false) => {
  const fileData = filesToUpload.map((file) => ({
    file_extension: file.name.substring(file.name.lastIndexOf(".") + 1),
    path: file.path,
  }));

  try {
    // Step 1: Get signed URLs for files
    const res = await axios.post(APP_URL + apiPath.getMultiSignedUrl, {
      file_data: fileData,
    }, {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        language: localStorage.getItem('i18nextLng'),
        'Accept-Language': localStorage.getItem('i18nextLng'),
        timezone: getLocalTimeZone(),
        'x-api-key': REACT_APP_X_API_KEY,
        'hosttype': HOST_TYPE,
        'device': navigator.userAgent
      },
    });

    const signedUrlData = normalizeSignedUrlList(res.data);

    // Check if signed URLs were returned
    if (!signedUrlData || signedUrlData.length === 0) {
      console.error("get-multi-signed-url: no usable signed URL list in", res.data);
      ShowToast("error", translation('key_no_signed_urls_returned'));
      return null;
    }

    // Step 2: Upload each file using its signed URL
    const uploadPromises = signedUrlData.map(async (presignedPostData, index) => {
      const file = filesToUpload[index]; // Get the corresponding file

      const requestOptions = {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      };

      console.log("presignedPostData", presignedPostData)

      try {
        const resp = await fetch(presignedPostData.url, requestOptions);

        if (!resp.ok) throw new Error("Upload failed");

        // Success Toast
        if (!hideToast) {
          ShowToast("success", `File ${ file.name } uploaded successfully.`);
        }

        return { url: presignedPostData.preview_file_url, filename: presignedPostData.filename };
      } catch (error) {
        if (!hideToast) {
          ShowToast("error", `Failed to upload ${ file.name }`);
        }
        console.error(`Error uploading ${ file.name }:`, error);
        return false;
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);

    return results; // Returns array with individual upload results
  } catch (error) {
    console.error("Error getting signed URLs:", error);
    ShowToast("error", translation('key_failed_to_get_signed_urls'));
    return null;
  }
};

//Upload file to AWS S3
const uploadFileToS3 = async (file, pathName, hideToast = false) => {
  try {
    let fileExtension = file.name.substring(file.name.lastIndexOf(".") + 1);
    let res = await axios.post(APP_URL + apiPath.getSignedUrl, {
      file_extension: fileExtension,
      path: pathName,
    }, {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        language: "en",
        'x-api-key': REACT_APP_X_API_KEY,
        'timezone': getLocalTimeZone(),
        'hosttype': HOST_TYPE,
        'device': navigator.userAgent
      },
    });
    let presignedPostData = res.data.data;
    if (!presignedPostData?.url) {
      if (!hideToast) {
        ShowToast("error", translation('key_failed_to_get_upload_url'));
      }
      return false;
    }
    const url = presignedPostData.preview_file_url;
    const filePath = presignedPostData.filename;

    const requestOptions = {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    };
    const resp = await fetch(presignedPostData.url, requestOptions)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Upload failed");
        }
        if (!hideToast) {
          ShowToast("success", translation('key_file_uploaded_successfully'));
        }

        return { url: url, filename: filePath };
      })
      .catch(function (error) {
        ShowToast("error", error?.message || "Upload failed");
        return false;
      });
    return resp;
  } catch (error) {
    return false;
  }
};

export default uploadFileToS3;