
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function OfflineRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleOffline = () => {
      toast({
        title: "You are offline",
        description: "Redirecting to your downloads...",
      });
      if (location.pathname !== "/downloads") {
        navigate("/downloads");
      }
    };

    const handleOnline = () => {
      toast({
        title: "You are back online",
        description: "You can now browse all content.",
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Initial check
    if (!navigator.onLine && location.pathname !== "/downloads" && location.pathname !== "/login") {
      navigate("/downloads");
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [navigate, location.pathname, toast]);

  return null;
}
