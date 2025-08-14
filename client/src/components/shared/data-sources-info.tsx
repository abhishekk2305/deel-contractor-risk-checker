import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function DataSourcesInfo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="h-4 w-4 mr-2" />
          Data Sources
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Data Sources & Scoring</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">Live Provider Integration</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Sanctions & PEP Screening</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  OpenSanctions (live)
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Adverse Media Monitoring</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  NewsAPI (live)
                </Badge>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Risk Scoring Weights</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sanctions/PEP</span>
                <span className="font-medium">45%</span>
              </div>
              <div className="flex justify-between">
                <span>Adverse Media</span>
                <span className="font-medium">15%</span>
              </div>
              <div className="flex justify-between">
                <span>Internal History</span>
                <span className="font-medium">15%</span>
              </div>
              <div className="flex justify-between">
                <span>Country Baseline</span>
                <span className="font-medium">10%</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Risk Thresholds</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Low Risk</span>
                <span className="font-medium text-green-600">&lt; 30</span>
              </div>
              <div className="flex justify-between">
                <span>Medium Risk</span>
                <span className="font-medium text-amber-600">30-70</span>
              </div>
              <div className="flex justify-between">
                <span>High Risk</span>
                <span className="font-medium text-red-600">&gt; 70</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 border-t pt-3">
            Data updated in real-time • Ruleset v1 • {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short', 
              day: 'numeric'
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}