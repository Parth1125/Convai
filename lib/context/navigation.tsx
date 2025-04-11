"use client";
import { createContext, useContext, useState } from "react";

interface NavigateConetxtType {
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  closeMobileNav: () => void;
}

const NavigationContext = createContext<NavigateConetxtType | undefined>(
  undefined
);
export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const closeMobileNav = () => setIsMobileNavOpen(false);

  return (
    <NavigationContext
      value={{ isMobileNavOpen, setIsMobileNavOpen, closeMobileNav }}
    >
      {children}
    </NavigationContext>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
