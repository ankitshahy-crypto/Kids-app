import { useEffect, useState } from "react";
import { getUnlockState, subscribeUnlock, type UnlockState } from "./store";

export function useUnlock(): UnlockState {
  const [state, setState] = useState(getUnlockState);
  useEffect(() => {
    setState(getUnlockState());
    return subscribeUnlock(setState);
  }, []);
  return state;
}
