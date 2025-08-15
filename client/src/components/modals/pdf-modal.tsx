import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Clock, CheckCircle } from "lucide-react";

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  riskAssessmentId?: string;
}

export function PdfModal({ isOpen, onClose, riskAssessmentId }: PdfModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PDF Report Generator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Report Generation</span>
            </div>
            <p className="text-sm text-blue-700">
              Your comprehensive risk assessment report will include:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Complete risk breakdown and scoring</li>
              <li>• Provider data sources and methodology</li>
              <li>• Actionable recommendations</li>
              <li>• Compliance requirements summary</li>
            </ul>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Generation Time</span>
            </div>
            <Badge variant="outline">~3-5 seconds</Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm">File Format</span>
            </div>
            <Badge variant="outline">PDF</Badge>
          </div>

          {riskAssessmentId && (
            <div className="p-2 bg-gray-50 rounded text-xs font-mono text-gray-600">
              Assessment ID: {riskAssessmentId}
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            {riskAssessmentId ? (
              <a 
                href={`/api/pdf-download/${riskAssessmentId}`}
                download={`Risk_Assessment_${riskAssessmentId}.pdf`}
                className="flex-1 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
                onClick={onClose}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF Report
              </a>
            ) : (
              <Button disabled className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                No Assessment Available
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}