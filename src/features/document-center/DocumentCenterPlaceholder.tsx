import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card.tsx";

/**
 * Placeholder Document Center page to allow build to succeed
 * This will be replaced with the full implementation once UI components are available
 */
export function DocumentCenterPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Document Center</h1>
        <p className="text-gray-600">Generate, manage, and email professional documents</p>
      </div>

      <Card className="p-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Document Center</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Professional document generation with PDF creation, email delivery, and tracking is coming soon.
          </p>
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
            Feature in development - Backend API ready
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold">Generate Invoices</h4>
            <p className="text-sm text-gray-600">Create branded PDF invoices</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold">Generate Quotes</h4>
            <p className="text-sm text-gray-600">Professional estimate documents</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <h4 className="font-semibold">Work Orders</h4>
            <p className="text-sm text-gray-600">Job details and assignments</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold">Inspection Reports</h4>
            <p className="text-sm text-gray-600">Detailed inspection findings</p>
          </div>
        </Card>
      </div>
    </div>
  );
}