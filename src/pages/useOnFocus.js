import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * A simple hook to call a function whenever the user navigates to the page
 * where this hook is used.
 */
export function useOnFocus(callback) {
  const location = useLocation();
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    savedCallback.current();
  }, [location]);
}