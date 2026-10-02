import { Download } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { ANDROID_APP_DOWNLOAD_URL } from "@/lib/config";

export function AndroidAppDownloadButton() {
  return (
    <a
      href={ANDROID_APP_DOWNLOAD_URL}
      download
      className={buttonClass("primary", "md", "w-full shrink-0 sm:w-auto")}
    >
      <Download className="size-5" aria-hidden="true" />
      Download APK
    </a>
  );
}
