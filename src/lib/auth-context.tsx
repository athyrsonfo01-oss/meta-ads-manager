"use client";

import { createContext, useContext } from "react";

interface SessionContextValue {
  role: "admin" | "user";
  name: string;
  email: string;
}

const SessionContext = createContext<SessionContextValue>({
  role: "user",
  name: "",
  email: "",
});

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: SessionContextValue;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
