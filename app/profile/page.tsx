import ProfileClient from "@/components/ProfileClient";

export default function ProfilePage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-[#eff3f4] px-4 py-3">
        <h1 className="text-[#0f1419] font-bold text-lg">Profile</h1>
        <p className="text-[#536471] text-sm mt-0.5">Your anonymous identity</p>
      </header>
      <ProfileClient />
    </div>
  );
}
