"use client";

import { Download } from "lucide-react";
import { Button, ExternalLinkButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ANDROID_APP_DOWNLOAD_URL } from "@/lib/config";

const UNAVAILABLE_MESSAGE = "Aplikasi Android segera tersedia.";

export function AndroidAppDownloadButton() {
  const toast = useToast();
  const icon = <Download className="size-5" aria-hidden="true" />;

  if (ANDROID_APP_DOWNLOAD_URL) {
    return (
      <ExternalLinkButton
        href={ANDROID_APP_DOWNLOAD_URL}
        download
        size="md"
        icon={icon}
        className="w-full shrink-0 sm:w-auto"
      >
        Download APK
      </ExternalLinkButton>
    );
  }

  return (
    <Button
      size="md"
      icon={icon}
      className="w-full shrink-0 sm:w-auto"
      onClick={() => toast(UNAVAILABLE_MESSAGE, "warning")}
    >
      Download APK
    </Button>
  );
}
