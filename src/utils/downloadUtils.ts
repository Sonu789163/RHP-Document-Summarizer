import { toast } from "sonner";

interface DownloadOptions {
  filename?: string;
  delay?: number; // Delay in milliseconds (default: 2000-5000ms random)
  showSuccessToast?: boolean;
}

/**
 * Downloads a blob with a processing toast notification and random delay
 * @param blob - The blob to download
 * @param options - Download configuration options
 */
export const downloadWithToast = async (
  blob: Blob,
  options: DownloadOptions = {}
): Promise<void> => {
  const {
    filename = "download",
    delay = Math.random() * 3000 + 2000, // Random delay between 2-5 seconds
    showSuccessToast = true,
  } = options;

  // Show processing toast immediately
  const processingToast = toast.loading(
    "Download Processing - Preparing your download..."
  );

  try {
    // Small delay to ensure toast renders
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add random delay between 2-5 seconds
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none"; // Hide the link
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    // Dismiss processing toast
    toast.dismiss(processingToast);

    // Show success toast
    if (showSuccessToast) {
      toast.success(`${filename} has been downloaded successfully`);
    }
  } catch (error) {
    // Dismiss processing toast
    toast.dismiss(processingToast);

    // Show error toast
    toast.error(`Failed to download ${filename}. Please try again.`);
    throw error;
  }
};

/**
 * Downloads content from a URL with a processing toast notification and delay
 * @param url - The URL to download from
 * @param options - Download configuration options
 */
export const downloadFromUrl = async (
  url: string,
  options: DownloadOptions = {}
): Promise<void> => {
  const {
    filename = "download",
    delay = Math.random() * 3000 + 2000, // Random delay between 2-5 seconds
    showSuccessToast = true,
  } = options;

  // Show processing toast immediately
  const processingToast = toast.loading(
    "Download Processing - Preparing your download..."
  );

  try {
    // Small delay to ensure toast renders
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add random delay between 2-5 seconds
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Fetch the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = "none"; // Hide the link
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);

    // Dismiss processing toast
    toast.dismiss(processingToast);

    // Show success toast
    if (showSuccessToast) {
      toast.success(`${filename} has been downloaded successfully`);
    }
  } catch (error) {
    // Dismiss processing toast
    toast.dismiss(processingToast);

    // Show error toast
    toast.error(`Failed to download ${filename}. Please try again.`);
    throw error;
  }
};

/**
 * Downloads content from a URL with authorization header
 * @param url - The URL to download from
 * @param token - Authorization token
 * @param options - Download configuration options
 */
export const downloadWithAuth = async (
  url: string,
  token: string,
  options: DownloadOptions = {}
): Promise<void> => {
  const {
    filename = "download",
    delay = Math.random() * 3000 + 2000, // Random delay between 2-5 seconds
    showSuccessToast = true,
  } = options;

  // Show processing toast immediately
  const processingToast = toast.loading(
    "Download Processing - Preparing your download..."
  );

  try {
    // Small delay to ensure toast renders
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add random delay between 2-5 seconds
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Fetch the file with authorization
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();

    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = "none"; // Hide the link
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);

    // Dismiss processing toast
    toast.dismiss(processingToast);

    // Show success toast
    if (showSuccessToast) {
      toast.success(`${filename} has been downloaded successfully`);
    }
  } catch (error) {
    // Dismiss processing toast
    toast.dismiss(processingToast);

    // Show error toast
    toast.error(`Failed to download ${filename}. Please try again.`);
    throw error;
  }
};
