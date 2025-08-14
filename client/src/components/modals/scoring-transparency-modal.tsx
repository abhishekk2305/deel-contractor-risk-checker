import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

interface ScoringTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScoringTransparencyModal({ isOpen, onClose }: ScoringTransparencyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How Risk Scoring Works</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Scoring Formula */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Risk Score Formula</h3>
            <p className="text-gray-600">
              Our multi-factor weighted algorithm combines real-time data from multiple sources to provide comprehensive contractor risk assessment.
            </p>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="font-medium">Sanctions Screening</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={45} className="w-20 h-2" />
                  <Badge variant="outline">45%</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">PEP (Politically Exposed Person)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={15} className="w-20 h-2" />
                  <Badge variant="outline">15%</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">Adverse Media</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={15} className="w-20 h-2" />
                  <Badge variant="outline">15%</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Internal History</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={15} className="w-20 h-2" />
                  <Badge variant="outline">15%</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Country Baseline Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={10} className="w-20 h-2" />
                  <Badge variant="outline">10%</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Thresholds */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Risk Tier Thresholds</h3>
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Low Risk</span>
                </div>
                <span className="text-sm text-gray-600">Score: 0-29</span>
              </div>
              
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">Medium Risk</span>
                </div>
                <span className="text-sm text-gray-600">Score: 30-69</span>
              </div>
              
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium">High Risk</span>
                </div>
                <span className="text-sm text-gray-600">Score: 70-100</span>
              </div>
            </div>
          </div>

          {/* Active Data Sources */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Active Data Sources</h3>
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium">OpenSanctions</span>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Live
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium">NewsAPI</span>
                </div>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                  Mock Mode
                </Badge>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Real-time provider integrations ensure the most current risk information is used in assessments.
            </p>
          </div>

          {/* Formula Example */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Calculation Example</h3>
            <div className="p-3 bg-blue-50 rounded text-sm">
              <p className="font-medium mb-2">Final Score = (Sanctions × 0.45) + (PEP × 0.15) + (Media × 0.15) + (History × 0.15) + (Country × 0.10)</p>
              <p className="text-gray-700">
                Example: (20 × 0.45) + (0 × 0.15) + (5 × 0.15) + (10 × 0.15) + (15 × 0.10) = 9 + 0 + 0.75 + 1.5 + 1.5 = <strong>12.75 (Low Risk)</strong>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}