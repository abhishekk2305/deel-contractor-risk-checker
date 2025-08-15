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
    mutationFn: async (riskAssessmentId: string) => {
      // Use direct download instead of job-based system
      const downloadUrl = `/api/pdf-download/${riskAssessmentId}`;
      
      // Test that the PDF exists
      const response = await fetch(downloadUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('PDF not available for this assessment');
      }
      
      // Trigger immediate download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Risk_Assessment_${riskAssessmentId}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true, downloadUrl };
    },
    onSuccess: () => {
      toast({
        title: "PDF Downloaded",
        description: "Your risk assessment report has been downloaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "PDF Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const usePdfReportStatus = (jobId: string | null) => {
  return useQuery({
    queryKey: ["/api/pdf-report", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/pdf-report/${jobId}`);
      if (!response.ok) {
        if (response.status === 202) {
          // Still processing, return pending status
          return { status: 'pending' };
        }
        throw new Error('Failed to get PDF status');
      }
      return response.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      // If we have URL (200 response), stop polling, otherwise keep polling  
      const data = query.state?.data as any;
      if (data?.url || data?.status === 'completed') {
        return false;
      }
      // Keep polling if still pending or processing
      return 2000;
    },
  });
};
