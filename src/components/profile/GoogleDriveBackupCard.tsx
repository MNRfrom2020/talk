import * as React from "react";
import { CloudUpload, Download, HardDrive, RefreshCw, ShieldCheck, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  type AutoBackupFrequency,
  connectGoogleDriveBackup,
  disconnectGoogleDriveBackup,
  getGoogleDriveBackupSettings,
  isGoogleDriveBackupConfigured,
  maybeRunSilentAutoBackup,
  restoreBackupFromGoogleDrive,
  saveGoogleDriveBackupSettings,
  uploadBackupToGoogleDrive,
} from "@/lib/google-drive-backup";

type StatusMessage = {
  tone: "muted" | "success" | "error";
  text: string;
};

const formatTimestamp = (value?: string) => {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
};

export default function GoogleDriveBackupCard() {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState(getGoogleDriveBackupSettings);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [status, setStatus] = React.useState<StatusMessage>({
    tone: "muted",
    text: "Connect Google Drive to keep your local data safe across devices.",
  });

  React.useEffect(() => {
    if (!settings.connected) {
      return;
    }

    let cancelled = false;

    const runAutoBackup = async () => {
      try {
        const result = await maybeRunSilentAutoBackup();
        if (!result.ran || cancelled) {
          return;
        }

        const nextSettings = getGoogleDriveBackupSettings();
        setSettings(nextSettings);
        setStatus({
          tone: "success",
          text: `Auto backup completed at ${formatTimestamp(result.lastBackupAt)}.`,
        });
      } catch (error: any) {
        if (cancelled) {
          return;
        }

        setStatus({
          tone: "error",
          text: error.message || "Auto backup could not be completed.",
        });
      }
    };

    runAutoBackup();

    return () => {
      cancelled = true;
    };
  }, [settings.connected, settings.autoBackupFrequency]);

  if (!isGoogleDriveBackupConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="h-5 w-5" />
            Google Drive Backup
          </CardTitle>
          <CardDescription>
            Add `VITE_GOOGLE_CLIENT_ID` to enable Google Drive backup and restore.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const refreshSettings = () => {
    setSettings(getGoogleDriveBackupSettings());
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectGoogleDriveBackup();
      refreshSettings();
      setStatus({
        tone: "success",
        text: "Google Drive connected. You can now back up and restore your local data.",
      });
      toast({
        title: "Google Drive Connected",
        description: "Backup & Restore is now ready.",
      });
    } catch (error: any) {
      const message = error.message || "Could not connect to Google Drive.";
      setStatus({ tone: "error", text: message });
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: message,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await uploadBackupToGoogleDrive();
      refreshSettings();
      setStatus({
        tone: "success",
        text: `Backup completed at ${formatTimestamp(result.lastBackupAt)}.`,
      });
      toast({
        title: "Backup Complete",
        description: "Your local data is now stored in Google Drive.",
      });
    } catch (error: any) {
      const message = error.message || "Backup failed.";
      setStatus({ tone: "error", text: message });
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: message,
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    const shouldRestore = window.confirm(
      "This will replace your current local data with the backup from Google Drive. Do you want to continue?",
    );

    if (!shouldRestore) {
      return;
    }

    setIsRestoring(true);
    try {
      await restoreBackupFromGoogleDrive();
      refreshSettings();
      toast({
        title: "Restore Complete",
        description: "Your local data has been replaced. The app will now reload.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error: any) {
      const message = error.message || "Restore failed.";
      setStatus({ tone: "error", text: message });
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: message,
      });
      setIsRestoring(false);
    }
  };

  const handleScheduleChange = (value: AutoBackupFrequency) => {
    const nextSettings = saveGoogleDriveBackupSettings({
      autoBackupFrequency: value,
    });
    setSettings(nextSettings);
    setStatus({
      tone: "muted",
      text:
        value === "off"
          ? "Auto backup is turned off."
          : `Auto backup is set to ${value}. It will run silently when the app opens and the schedule is due.`,
    });
  };

  const handleDisconnect = () => {
    const nextSettings = disconnectGoogleDriveBackup();
    setSettings(nextSettings);
    setStatus({
      tone: "muted",
      text: "Google Drive disconnected. Your existing backup file remains in Drive.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardDrive className="h-5 w-5" />
          Google Drive Backup
        </CardTitle>
        <CardDescription>
          Keep your local playlists, history, downloads, and settings backed up in your private Google Drive app data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!settings.connected ? (
          <Button
            className="w-full"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Connect to Google Drive
              </>
            )}
          </Button>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                variant="secondary"
                onClick={handleBackup}
                disabled={isBackingUp || isRestoring}
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Backing Up...
                  </>
                ) : (
                  <>
                    <CloudUpload className="mr-2 h-4 w-4" />
                    Manual Backup
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleRestore}
                disabled={isBackingUp || isRestoring}
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Restore / Replace Data
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Auto Backup</div>
              <Select
                value={settings.autoBackupFrequency}
                onValueChange={(value) =>
                  handleScheduleChange(value as AutoBackupFrequency)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-secondary/30 p-3 text-sm space-y-1">
              <div>Last backup: {formatTimestamp(settings.lastBackupAt)}</div>
              <div>Last restore: {formatTimestamp(settings.lastRestoreAt)}</div>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={handleDisconnect}
              disabled={isBackingUp || isRestoring}
            >
              <Unplug className="mr-2 h-4 w-4" />
              Disconnect Google Drive
            </Button>
          </>
        )}

        <div
          className={
            status.tone === "error"
              ? "text-sm text-destructive"
              : status.tone === "success"
                ? "text-sm text-green-600"
                : "text-sm text-muted-foreground"
          }
        >
          {status.text}
        </div>
      </CardContent>
    </Card>
  );
}
