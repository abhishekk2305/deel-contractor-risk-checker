import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRiskAssessment } from "@/hooks/use-risk-assessment";
import { RiskCheckRequest, riskCheckRequestSchema } from "@shared/schema";
import { Country } from "@/types";
import { PartialSourceWarning } from "@/components/shared/error-banner";

interface RiskCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: Country | null;
  onSuccess?: (riskAssessmentId: string) => void;
}

export function RiskCheckModal({ isOpen, onClose, country, onSuccess }: RiskCheckModalProps) {
  const [assessment, setAssessment] = useState<any>(null);
  const riskCheckMutation = useRiskAssessment();

  const form = useForm<RiskCheckRequest>({
    resolver: zodResolver(riskCheckRequestSchema),
    defaultValues: {
      countryIso: country?.iso || '',
      contractorType: 'independent',
      paymentMethod: 'wire',
      contractorName: '',
      registrationId: '',
    },
  });

  const onSubmit = async (data: RiskCheckRequest) => {
    try {
      const result = await riskCheckMutation.mutateAsync({
        request: { ...data, countryIso: country?.iso || data.countryIso },
        idempotencyKey: `${Date.now()}-${Math.random()}`,
      });
      
      setAssessment(result);
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess(result.id);
        }, 2000); // Show results for 2 seconds before closing
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleClose = () => {
    setAssessment(null);
    form.reset();
    onClose();
  };

  if (assessment) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Risk Assessment Results</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {assessment.partialSources.length > 0 && (
              <PartialSourceWarning partialSources={assessment.partialSources} />
            )}

            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {assessment.score}/100
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                assessment.tier === 'low' ? 'bg-green-100 text-green-800' :
                assessment.tier === 'medium' ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              }`}>
                {assessment.tier.toUpperCase()} RISK
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Top Risk Factors</h3>
              <div className="space-y-2">
                {(() => {
                  // Normalize topRisks to always be an array
                  const topRisks = Array.isArray(assessment.topRisks) ? assessment.topRisks : [assessment.topRisks].filter(Boolean);
                  console.log('topRisks normalized:', topRisks);
                  return topRisks.map((risk: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">{risk?.title || 'Risk Factor'}</div>
                      <div className="text-sm text-gray-600">{risk?.description || 'No description available'}</div>
                      {risk?.severity && (
                        <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                          risk.severity === 'low' ? 'bg-green-100 text-green-800' :
                          risk.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {risk.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
              <ul className="space-y-1">
                {(() => {
                  // Normalize recommendations to always be an array
                  const recommendations = Array.isArray(assessment.recommendations) ? assessment.recommendations : [assessment.recommendations].filter(Boolean);
                  console.log('recommendations normalized:', recommendations);
                  return recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      {rec}
                    </li>
                  ));
                })()}
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => onSuccess?.()}>
                Generate PDF Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Run Risk Assessment</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contractorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contractor name..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <Label>Country</Label>
                <Input value={country?.name || ''} disabled />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contractorType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="independent">Independent</SelectItem>
                        <SelectItem value="eor">EOR</SelectItem>
                        <SelectItem value="freelancer">Freelancer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="wire">Wire</SelectItem>
                        <SelectItem value="ach">ACH</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="registrationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter registration ID..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={riskCheckMutation.isPending}
                className="bg-deel-primary hover:bg-deel-primary/90"
              >
                <Search className="h-4 w-4 mr-2" />
                {riskCheckMutation.isPending ? 'Running Assessment...' : 'Run Assessment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
