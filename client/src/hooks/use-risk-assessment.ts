import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { RiskCheckRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export const useRiskAssessment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request, idempotencyKey }: { request: RiskCheckRequest; idempotencyKey?: string }) =>
      api.runRiskCheck(request, idempotencyKey),
    onSuccess: (data, variables) => {
      analytics.riskCheckSuccess(
        variables.request.countryIso,
        data.tier,
        data.score
      );
      
      toast({
        title: "Risk Assessment Complete",
        description: `Risk level: ${data.tier.toUpperCase()} (Score: ${data.score}/100)`,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
    },
    onError: (error, variables) => {
      analytics.riskCheckError(
        variables.request.countryIso,
        error.message
      );
      
      toast({
        title: "Risk Assessment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const usePdfGeneration = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (contractorId: string) => api.generatePdfReport(contractorId),
    onSuccess: (data) => {
      toast({
        title: "PDF Generation Started",
        description: "Your report is being generated. You'll be notified when it's ready.",
      });
      
      analytics.pdfGenerate('unknown'); // We don't have country context here
    },
    onError: (error) => {
      toast({
        title: "PDF Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const usePdfReportStatus = (jobId: string | null) => {
  return useQuery({
    queryKey: ["/api/pdf-report", jobId],
    queryFn: () => api.getPdfReportStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop polling when the report is ready or failed
      return data?.status === 'completed' || data?.status === 'failed' ? false : 2000;
    },
  });
};
