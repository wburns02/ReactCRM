import { Button } from "@/components/ui/Button.tsx";
import { FileText, FileEdit, Wrench, Search } from "lucide-react";
import { DocumentType, DOCUMENT_TYPE_INFO } from "@/api/types/documentCenter.ts";

interface QuickActionsBarProps {
  onGenerateClick: (documentType: DocumentType) => void;
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

function QuickActionButton({ icon, title, description, onClick, color }: QuickActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="h-auto p-6 flex-col items-center gap-3 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 text-gray-900 hover:text-gray-900"
      variant="outline"
    >
      <div style={{ color }} className="text-2xl">
        {icon}
      </div>
      <div className="text-center">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </div>
    </Button>
  );
}

export function QuickActionsBar({ onGenerateClick }: QuickActionsBarProps) {
  const quickActions = [
    {
      type: DocumentType.INVOICE as DocumentType,
      icon: <FileText size={32} />,
      title: "Generate Invoice PDF",
      description: "Create branded invoice documents",
    },
    {
      type: DocumentType.QUOTE as DocumentType,
      icon: <FileEdit size={32} />,
      title: "Generate Quote PDF",
      description: "Professional estimate documents",
    },
    {
      type: DocumentType.WORK_ORDER as DocumentType,
      icon: <Wrench size={32} />,
      title: "Generate Work Order PDF",
      description: "Job details and assignments",
    },
    {
      type: DocumentType.INSPECTION_REPORT as DocumentType,
      icon: <Search size={32} />,
      title: "Generate Inspection Report",
      description: "Detailed inspection findings",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-600">Generate new documents from existing records</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const typeInfo = DOCUMENT_TYPE_INFO[action.type];
          return (
            <QuickActionButton
              key={action.type}
              icon={action.icon}
              title={action.title}
              description={action.description}
              color={typeInfo.color}
              onClick={() => onGenerateClick(action.type)}
            />
          );
        })}
      </div>
    </div>
  );
}