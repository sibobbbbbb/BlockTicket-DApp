export default function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg animate-pulse">
      <div className="h-48 bg-slate-800 w-full"></div>
      <div className="p-5 space-y-3">
        <div className="h-6 bg-slate-800 rounded w-3/4"></div>
        <div className="h-4 bg-slate-800 rounded w-full"></div>
        <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        <div className="h-10 bg-slate-800 rounded w-full mt-4"></div>
      </div>
    </div>
  );
}