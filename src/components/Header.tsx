import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "../data/iitb.svg";
import { useAdmin } from "../hooks/useAdmin";

export function Brand({
  subtitle,
  logoClassName = "h-11 w-11",
}: {
  subtitle?: string;
  logoClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={logo}
        alt=""
        className={`${logoClassName} shrink-0 object-contain`}
      />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold leading-5 tracking-tight">
          IPT FoodHub
        </p>
        {subtitle ? (
          <p className="truncate text-xs leading-4 text-muted">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export function Header({
  email,
  subtitle,
  onSignOut,
}: {
  email: string | null;
  subtitle?: string;
  onSignOut: () => void;
}) {
  const access = useAdmin(email);
  const admin = access.admin;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Brand subtitle={subtitle} />
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {admin && (
            <Link
              to="/order"
              className="rounded-full px-2.5 py-2 text-sm font-semibold text-primary sm:px-3"
            >
              Order food
            </Link>
          )}
          {admin && (
            <Link
              to="/admin"
              className="rounded-full px-2.5 py-2 text-sm font-semibold text-primary sm:px-3"
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="h-10 rounded-full border border-line bg-white px-3 text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export function Splash({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <img src={logo} alt="" className="mx-auto h-16 w-16 object-contain" />
        <h1 className="mt-3 text-[28px] font-bold leading-[34px] tracking-tight sm:text-4xl">
          IPT FoodHub
        </h1>
        <p className="mt-4 text-muted">{label}</p>
        {children}
      </div>
    </main>
  );
}
