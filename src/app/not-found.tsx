import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#f6fafa] dark:bg-[#0b1a1f]">
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2">404</h1>
      <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">Page Not Found</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
        The requested page does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-extrabold shadow-sm hover:bg-teal-800 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}
