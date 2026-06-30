export default function OfflinePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center mb-6 shadow-lg">
        <span className="text-white text-2xl font-black">S</span>
      </div>
      <h1 className="text-xl font-bold text-[#0f1419] mb-2">Vous êtes hors ligne</h1>
      <p className="text-[#536471] text-sm max-w-xs">
        SARI a besoin d'une connexion internet pour afficher le fil. Reconnectez-vous et réessayez.
      </p>
    </div>
  );
}
