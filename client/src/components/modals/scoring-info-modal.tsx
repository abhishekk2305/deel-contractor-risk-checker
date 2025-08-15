import { useState } from "react";
import { Info, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoringInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScoringInfoModal({ isOpen, onClose }: ScoringInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            How Risk Scoring Works
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Assessment Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Our risk scoring system evaluates contractors across multiple dimensions to provide 
                a comprehensive risk assessment from 0-100 points. Lower scores indicate lower risk.
              </p>
            </CardContent>
          </Card>

          {/* Scoring Formula */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scoring Formula & Weights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <span className="font-medium">Sanctions Screening</span>
                    <span className="font-bold text-red-600">45%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span className="font-medium">PEP (Politically Exposed)</span>
                    <span className="font-bold text-orange-600">15%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                    <span className="font-medium">Adverse Media</span>
                    <span className="font-bold text-yellow-600">15%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="font-medium">Internal History</span>
                    <span className="font-bold text-blue-600">15%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                    <span className="font-medium">Country Baseline Risk</span>
                    <span className="font-bold text-purple-600">10%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Tiers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Tier Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded">
                  <div>
                    <span className="font-bold text-green-800">LOW RISK</span>
                    <p className="text-sm text-green-600">Recommended for engagement</p>
                  </div>
                  <span className="font-bold text-green-800">0-29 points</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <div>
                    <span className="font-bold text-yellow-800">MEDIUM RISK</span>
                    <p className="text-sm text-yellow-600">Enhanced due diligence required</p>
                  </div>
                  <span className="font-bold text-yellow-800">30-69 points</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded">
                  <div>
                    <span className="font-bold text-red-800">HIGH RISK</span>
                    <p className="text-sm text-red-600">Significant compliance review needed</p>
                  </div>
                  <span className="font-bold text-red-800">70-100 points</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Sources & Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Primary Sources:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• OpenSanctions - Global sanctions screening</li>
                    <li>• PEP databases - Political exposure checks</li>
                    <li>• Media monitoring - Adverse news coverage</li>
                    <li>• Government watchlists - Regulatory databases</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Internal Data:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Previous engagement history</li>
                    <li>• Compliance incident records</li>
                    <li>• Performance metrics</li>
                    <li>• Country-specific risk profiles</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Real-time Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-gray-600">
                  Risk assessments are calculated in real-time using live data from external providers:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="font-semibold text-blue-800">Data Freshness</div>
                    <div className="text-blue-600">Updated every 24 hours</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <div className="font-semibold text-green-800">Processing Time</div>
                    <div className="text-green-600">Sub-3 second results</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <div className="font-semibold text-purple-800">Provider Coverage</div>
                    <div className="text-purple-600">1247+ verified matches</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ScoringInfoButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Info className="w-4 h-4" />
        How Scoring Works
      </Button>
      <ScoringInfoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}