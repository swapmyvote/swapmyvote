import { useContext } from "react";
import {
  SessionContext,
  type SessionContextValue,
} from "@/contexts/SessionContext";

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside a <SessionProvider>");
  }
  return value;
}
