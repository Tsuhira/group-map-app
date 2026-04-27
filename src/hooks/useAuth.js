import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken, onAuthStateChanged } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kumaToken = params.get("kumaToken");

    if (kumaToken) {
      signInWithCustomToken(auth, kumaToken).catch(err =>
        console.error("kuma SSO sign-in failed:", err)
      );
      const url = new URL(window.location.href);
      url.searchParams.delete("kumaToken");
      window.history.replaceState({}, "", url.toString());
    }

    return onAuthStateChanged(auth, u => setUser(u ?? null));
  }, []);

  return { user, loading: user === undefined };
}
