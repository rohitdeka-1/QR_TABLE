import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = unknown, false = logged out, object = user
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get("/auth/me")
      .then((res) => mounted && setUser(res.data))
      .catch(() => mounted && setUser(false))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data.token) localStorage.setItem("qrt_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const registerRestaurant = async ({ restaurantName, ownerName, ownerEmail }) => {
    const res = await api.post("/auth/register", {
      restaurantName,
      ownerName,
      ownerEmail,
    });
    return res.data;
  };

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("qrt_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, registerRestaurant }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
