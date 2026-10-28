import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center text-xl">
          <Logo />
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
