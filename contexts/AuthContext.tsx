import React, { createContext, useContext, useState } from 'react';
type Role = 'admin' | 'vendeur';
type User = { username: string; role: Role; name: string };
const AuthContext = createContext<any>(null);
export const AuthProvider = ({children}:{children:React.ReactNode}) => {
  const [user,setUser] = useState<User|null>(()=>{
    const s = localStorage.getItem('facturago_user');
    return s ? JSON.parse(s) : null;
  });
  const login = (u:string,p:string) => {
    let newUser: User | null = null;
    if(u==='admin' && p==='admin123') newUser={username:'admin', role:'admin', name:'Patron'};
    if(u==='vendeur1' && p==='1234') newUser={username:'vendeur1', role:'vendeur', name:'Vendeur 1'};
    if(u==='vendeur2' && p==='1234') newUser={username:'vendeur2', role:'vendeur', name:'Vendeur 2'};
    if(newUser){ localStorage.setItem('facturago_user', JSON.stringify(newUser)); setUser(newUser); return true; }
    return false;
  };
  const logout = () => { localStorage.removeItem('facturago_user'); setUser(null); };
  return <AuthContext.Provider value={{user, login, logout, isAdmin: user?.role==='admin'}}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
