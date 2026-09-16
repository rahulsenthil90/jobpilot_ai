import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
      <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
        JobPilot AI
      </h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl">
        Find the right jobs. Match your skills. Apply smarter.
      </p>
      <div className="flex gap-4">
        <Link href="/login">
          <Button size="lg">Log In</Button>
        </Link>
        <Link href="/signup">
          <Button size="lg" variant="outline">Sign Up</Button>
        </Link>
      </div>
    </div>
  );
}
