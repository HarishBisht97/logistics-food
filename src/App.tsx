import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { User } from "firebase/auth";
import { isFirebaseConfigured } from "./firebase";
import { useAdmin } from "./hooks/useAdmin";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { Splash } from "./components/Header";
import { LoginPage } from "./components/LoginPage";
import { NamePicker } from "./components/NamePicker";
import { RolePicker } from "./components/RolePicker";
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

  return <SignedIn user={user} onSignOut={signOut} />;
}

function SignedIn({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const access = useAdmin(user.email);
  if (access.loading) return <Splash label="Checking access…" />;
  if (access.error) return <Splash label={access.error} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin"
          element={
            access.admin ? (
              <AdminPage email={user.email ?? ""} onSignOut={onSignOut} />
            ) : (
              <Navigate to="/order" replace />
            )
          }
        />
        <Route path="/order" element={<OrderGate user={user} onSignOut={onSignOut} />} />
        <Route
          path="*"
          element={
            access.admin ? <Navigate to="/admin" replace /> : <OrderGate user={user} onSignOut={onSignOut} />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function OrderGate({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const profile = useProfile(user.uid);
  if (profile.loading) return <Splash label="Loading your name…" />;
  if (profile.error) return <Splash label={profile.error} />;
  if (!profile.side) {
    return <RolePicker uid={user.uid} email={user.email ?? ""} onSignOut={onSignOut} />;
  }
  if (!profile.name) {
    return <NamePicker uid={user.uid} email={user.email ?? ""} side={profile.side} onSignOut={onSignOut} />;
  }
  return <OrderPage email={user.email ?? ""} name={profile.name} side={profile.side} onSignOut={onSignOut} />;
}
