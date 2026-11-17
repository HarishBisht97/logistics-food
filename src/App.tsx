import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { User } from "firebase/auth";
import { isFirebaseConfigured } from "./firebase";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { isAdminEmail } from "./lib/constants";
import { Splash } from "./components/Header";
import { LoginPage } from "./components/LoginPage";
import { NamePicker } from "./components/NamePicker";
import { OrderPage } from "./components/OrderPage";
import { AdminPage } from "./components/AdminPage";

export default function App() {
  const auth = useAuth();

  if (!isFirebaseConfigured()) {
    return <Splash label="Add your Firebase web app keys to .env, then refresh." />;
  }
  if (auth.loading) return <Splash label="Checking sign-in…" />;
  if (!auth.user) return <LoginPage onSignIn={auth.signIn} onSignUp={auth.signUp} error={auth.error} />;

  const user = auth.user;
  const signOut = () => void auth.signOut();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminGate user={user} onSignOut={signOut} />} />
        <Route path="/order" element={<OrderGate user={user} onSignOut={signOut} />} />
        <Route
          path="*"
          element={
            isAdminEmail(user.email) ? <Navigate to="/admin" replace /> : <OrderGate user={user} onSignOut={signOut} />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function AdminGate({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  if (!isAdminEmail(user.email)) return <Navigate to="/order" replace />;
  return <AdminPage email={user.email ?? ""} onSignOut={onSignOut} />;
}

function OrderGate({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const profile = useProfile(user.uid);
  if (profile.loading) return <Splash label="Loading your name…" />;
  if (profile.error) return <Splash label={profile.error} />;
  if (!profile.name) {
    return <NamePicker uid={user.uid} email={user.email ?? ""} onSignOut={onSignOut} />;
  }
  return <OrderPage email={user.email ?? ""} name={profile.name} onSignOut={onSignOut} />;
}
