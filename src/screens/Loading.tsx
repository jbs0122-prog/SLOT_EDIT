export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-16 h-16 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
        <h2 className="text-2xl font-light tracking-tight mb-2">
          Loading NYC Trends...
        </h2>
        <p className="text-sm text-gray-500 font-light">
          Curating your personalized style
        </p>
      </div>
    </div>
  );
}
