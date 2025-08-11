import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface LegacyRedirectProps {
  to: string;
  children: React.ReactNode;
}

export const LegacyRedirect = ({ to, children }: LegacyRedirectProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);

  return <>{children}</>;
};