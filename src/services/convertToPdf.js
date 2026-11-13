import { ShowToast } from "../components/show-toast/ShowToast";
import { apiPath, REACT_APP_REMOVE_BG_API_URL, CONVERSION_API_KEY } from "./apiPath";
import translation from "../utils/translation";

 export const convertFilesToPdf = async (files) => {
    try {
      const convertPromises = Array.from(files).map(async (file) => {
        // Skip PDF files
        if (file.type === "application/pdf") {
          return file;
        }
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(REACT_APP_REMOVE_BG_API_URL + apiPath.convertToPdf, {
          method: "POST",
          headers: {
            "api-key": CONVERSION_API_KEY,
          },
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Failed to convert ${file.name}`);
        }
        
        const convertedBlob = await response.blob();
        const convertedFile = new File(
          [convertedBlob], 
          `${file.name.split('.')[0]}.pdf`, 
          { type: "application/pdf" }
        );
        return convertedFile;
      });
      
      return await Promise.all(convertPromises);
    } catch (error) {
      ShowToast("error", translation('key_error_converting_files_to_pdf'));
      console.error("Conversion error:", error);
      throw error;
    }
  };