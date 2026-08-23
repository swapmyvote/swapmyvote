import { useContext } from "react";
import {
  AppModeContext,
  type AppModeContextValue,
} from "@/contexts/AppModeContext";

export function useAppMode(): AppModeContextValue {
  return useContext(AppModeContext);
}
