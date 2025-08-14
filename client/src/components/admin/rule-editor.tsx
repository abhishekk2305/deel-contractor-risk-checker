import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ComplianceRule } from "@/types";
import { analytics } from "@/lib/analytics";

const ruleFormSchema = z.object({
  countryId: z.string().min(1, "Country is required"),
  ruleType: z.string().min(1, "Rule type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  severity: z.coerce.number().min(1).max(10),
  effectiveFrom: z.string().min(1, "Effective date is required"),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["draft", "published"]),
});

type RuleFormData = z.infer<typeof ruleFormSchema>;

interface RuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  rule?: ComplianceRule | null;
}

export function RuleEditor({ isOpen, onClose, rule }: RuleEditorProps) {
  const isEditing = !!rule;

  const form = useForm<RuleFormData>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      countryId: rule?.countryId || '',
      ruleType: rule?.ruleType || '',
      description: rule?.description || '',
      severity: rule?.severity || 5,
      effectiveFrom: rule?.effectiveFrom || '',
      sourceUrl: rule?.sourceUrl || '',
      status: rule?.status || 'draft',
    },
  });

  const onSubmit = async (data: RuleFormData) => {
    try {
      if (isEditing) {
        // TODO: Update existing rule
        analytics.adminRuleUpdate(rule!.id, data.countryId, data.ruleType);
        console.log('Updating rule:', rule?.id, data);
      } else {
        // TODO: Create new rule
        analytics.adminRuleCreate(data.countryId, data.ruleType);
        console.log('Creating rule:', data);
      }
      
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleSaveDraft = () => {
    const data = form.getValues();
    form.setValue('status', 'draft');
    form.handleSubmit(onSubmit)();
  };

  const handlePublish = () => {
    const data = form.getValues();
    form.setValue('status', 'published');
    form.handleSubmit(onSubmit)();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Compliance Rule' : 'Create New Compliance Rule'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="countryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="BR">Brazil</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rule type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Tax Compliance">Tax Compliance</SelectItem>
                        <SelectItem value="Worker Classification">Worker Classification</SelectItem>
                        <SelectItem value="Payment Processing">Payment Processing</SelectItem>
                        <SelectItem value="Sanctions/PEP">Sanctions/PEP</SelectItem>
                        <SelectItem value="Data Protection">Data Protection</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4}
                      placeholder="Describe the compliance rule in detail..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity (1-10)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="sourceUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://..."
                      {...field}
                    />
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
                type="button" 
                variant="outline"
                onClick={handleSaveDraft}
                className="border-deel-secondary text-deel-secondary hover:bg-deel-secondary/5"
              >
                Save as Draft
              </Button>
              <Button 
                type="submit"
                className="bg-deel-primary hover:bg-deel-primary/90"
              >
                {isEditing ? 'Update Rule' : 'Publish Rule'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
