import { useState, useEffect } from "react";
import { ComplianceRule } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface RuleEditorProps {
  rule: ComplianceRule | null;
  onClose: () => void;
  onSubmit: (rule: Partial<ComplianceRule>) => void;
}

export function RuleEditor({ rule, onClose, onSubmit }: RuleEditorProps) {
  const [formData, setFormData] = useState<Partial<ComplianceRule>>({
    ruleType: '',
    description: '',
    severity: 5,
    effectiveFrom: new Date().toISOString().split('T')[0],
    status: 'draft',
    sourceUrl: ''
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        ...rule,
        effectiveFrom: rule.effectiveFrom.split('T')[0]
      });
    }
  }, [rule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={!!rule} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {rule?.id ? 'Edit Compliance Rule' : 'Create New Compliance Rule'}
          </DialogTitle>
          <DialogDescription>
            Configure compliance rules for contractor risk assessment.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ruleType">Rule Type</Label>
            <Input
              id="ruleType"
              value={formData.ruleType || ''}
              onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
              placeholder="e.g., tax_compliance, employment_law"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the compliance rule"
              required
            />
          </div>

          <div>
            <Label htmlFor="severity">Severity (1-10)</Label>
            <Select
              value={formData.severity?.toString()}
              onValueChange={(value) => setFormData({ ...formData, severity: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...Array(10)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1} - {i < 3 ? 'Low' : i < 7 ? 'Medium' : 'High'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="effectiveFrom">Effective From</Label>
            <Input
              id="effectiveFrom"
              type="date"
              value={formData.effectiveFrom || ''}
              onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sourceUrl">Source URL (Optional)</Label>
            <Input
              id="sourceUrl"
              type="url"
              value={formData.sourceUrl || ''}
              onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
              placeholder="https://example.com/regulation"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {rule?.id ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}