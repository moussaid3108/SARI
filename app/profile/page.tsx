import ProfileClient from "@/components/ProfileClient";

export default function ProfilePage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-black/70 border-b border-white/8 px-4 py-3">
        <h1 className="text-white font-bold text-lg">Profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your anonymous identity</p>
      </header>
      <ProfileClient />
    </div>
  );
}
