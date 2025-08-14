import { useState } from "react";
import { Download, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePdfGeneration, usePdfReportStatus } from "@/hooks/use-risk-assessment";
import { Country } from "@/types";
import { analytics } from "@/lib/analytics";

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: Country | null;
}

export function PdfModal({ isOpen, onClose, country }: PdfModalProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState('Risk Assessment Report');
  const [email, setEmail] = useState('');

  const pdfMutation = usePdfGeneration();
  const { data: reportStatus } = usePdfReportStatus(jobId);

  const handleGenerate = async () => {
    if (!country) return;

    try {
      analytics.pdfGenerate(country.iso);
      
      // For demo purposes, we'll use a dummy contractor ID
      const result = await pdfMutation.mutateAsync('dummy-contractor-id');
      setJobId(result.jobId);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDownload = () => {
    if (reportStatus?.url && country) {
      analytics.pdfDownloadSuccess(country.iso, reportStatus.sizeBytes || 0);
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = reportStatus.url;
      link.download = `${country.name}-risk-assessment.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClose = () => {
    setJobId(null);
    setReportTitle('Risk Assessment Report');
    setEmail('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate PDF Report</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!jobId ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-deel-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-deel-primary text-2xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Ready to Generate Report</h3>
                <p className="text-gray-600 mt-2">
                  This will create a comprehensive PDF report with risk assessment details and recommendations.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Report Title (Optional)</Label>
                  <Input
                    id="title"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Risk Assessment Report"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Send copy to email..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={pdfMutation.isPending}
                  className="bg-deel-secondary hover:bg-deel-secondary/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {pdfMutation.isPending ? 'Generating...' : 'Generate PDF'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              {reportStatus?.status === 'completed' ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="text-green-600 text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Report Ready!</h3>
                  <p className="text-gray-600">
                    Your PDF report has been generated successfully.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button variant="outline" onClick={handleClose}>
                      Close
                    </Button>
                    <Button onClick={handleDownload} className="bg-deel-secondary hover:bg-deel-secondary/90">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </>
              ) : reportStatus?.status === 'failed' ? (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="text-red-600 text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Generation Failed</h3>
                  <p className="text-gray-600">
                    There was an error generating your PDF report. Please try again.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button variant="outline" onClick={handleClose}>
                      Close
                    </Button>
                    <Button onClick={() => setJobId(null)}>
                      Try Again
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Generating Report...</h3>
                  <p className="text-gray-600">
                    Please wait while we generate your PDF report. This may take a few moments.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
