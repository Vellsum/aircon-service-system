import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("aircon_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem("aircon_user", JSON.stringify(userData));
    if (token) localStorage.setItem("aircon_token", token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("aircon_user");
    localStorage.removeItem("aircon_token");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);