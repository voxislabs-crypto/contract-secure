import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CaptureSignature() {
  const [params] = useSearchParams();
  const token = params.get("token");

  return (
    <div className="container mx-auto p-4 max-w-2xl mt-10">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Capture Your Signature</h1>
        <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 mb-6 flex items-center justify-center">
          <p>Signature pad will appear here</p>
        </div>
        <div className="flex justify-between">
          <Button variant="outline">Clear</Button>
          <Button>Submit Signature</Button>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Token: {token ? "✅ Valid" : "❌ Missing"}
        </div>
      </div>
    </div>
  );
}
