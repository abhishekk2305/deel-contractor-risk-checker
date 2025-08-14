import { createChildLogger } from '../lib/logger';

const logger = createChildLogger('notifications');

interface EmailNotification {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  templateId?: string;
  templateData?: Record<string, any>;
}

interface EmailResult {
  messageId: string;
  status: 'sent' | 'failed';
  error?: string;
}

interface RiskAssessmentNotification {
  contractorName: string;
  countryName: string;
  riskScore: number;
  riskTier: 'low' | 'medium' | 'high';
  reportUrl?: string;
}

interface RulePublishedNotification {
  ruleName: string;
  countryName: string;
  version: string;
  publishedBy: string;
}

class NotificationService {
  private postmarkToken: string;
  private fromEmail: string = 'noreply@deel.com';
  private baseUrl: string = 'https://api.postmarkapp.com';

  constructor() {
    this.postmarkToken = process.env.POSTMARK_TOKEN || process.env.POSTMARK_SERVER_TOKEN || '';
    
    if (!this.postmarkToken) {
      logger.warn('Postmark token not configured, email notifications will be logged only');
    }
  }

  async sendEmail(notification: EmailNotification): Promise<EmailResult> {
    if (!this.postmarkToken) {
      logger.info({ 
        to: notification.to, 
        subject: notification.subject 
      }, 'Email would be sent (no Postmark token configured)');
      
      return {
        messageId: `mock-${Date.now()}`,
        status: 'sent',
      };
    }

    try {
      logger.info({ to: notification.to, subject: notification.subject }, 'Sending email');

      const response = await fetch(`${this.baseUrl}/email`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.postmarkToken,
        },
        body: JSON.stringify({
          From: this.fromEmail,
          To: notification.to,
          Subject: notification.subject,
          HtmlBody: notification.htmlBody,
          TextBody: notification.textBody || this.htmlToText(notification.htmlBody),
          MessageStream: 'outbound',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Postmark API error: ${response.status} - ${errorData.Message || response.statusText}`);
      }

      const data = await response.json();

      logger.info({ 
        to: notification.to, 
        messageId: data.MessageID 
      }, 'Email sent successfully');

      return {
        messageId: data.MessageID,
        status: 'sent',
      };

    } catch (error) {
      logger.error({ 
        error, 
        to: notification.to, 
        subject: notification.subject 
      }, 'Failed to send email');

      return {
        messageId: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendRiskAssessmentComplete(
    email: string, 
    data: RiskAssessmentNotification
  ): Promise<EmailResult> {
    const subject = `Risk Assessment Complete - ${data.contractorName} (${data.countryName})`;
    
    const htmlBody = this.generateRiskAssessmentEmail(data);
    
    return this.sendEmail({
      to: email,
      subject,
      htmlBody,
    });
  }

  async sendRulePublished(
    email: string, 
    data: RulePublishedNotification
  ): Promise<EmailResult> {
    const subject = `Compliance Rule Published - ${data.ruleName} v${data.version}`;
    
    const htmlBody = this.generateRulePublishedEmail(data);
    
    return this.sendEmail({
      to: email,
      subject,
      htmlBody,
    });
  }

  async sendPDFReportReady(
    email: string, 
    contractorName: string, 
    countryName: string, 
    downloadUrl: string
  ): Promise<EmailResult> {
    const subject = `PDF Report Ready - ${contractorName} Risk Assessment`;
    
    const htmlBody = this.generatePDFReadyEmail(contractorName, countryName, downloadUrl);
    
    return this.sendEmail({
      to: email,
      subject,
      htmlBody,
    });
  }

  async sendBulkSubscriptionUpdate(
    emails: string[], 
    countryName: string, 
    updateType: 'rule_change' | 'risk_update',
    details: string
  ): Promise<EmailResult[]> {
    const subject = `${countryName} Compliance Update - ${updateType.replace('_', ' ').toUpperCase()}`;
    
    const htmlBody = this.generateSubscriptionUpdateEmail(countryName, updateType, details);
    
    const results = await Promise.all(
      emails.map(email => this.sendEmail({
        to: email,
        subject,
        htmlBody,
      }))
    );

    logger.info({ 
      emailCount: emails.length, 
      successCount: results.filter(r => r.status === 'sent').length 
    }, 'Bulk subscription update sent');

    return results;
  }

  private generateRiskAssessmentEmail(data: RiskAssessmentNotification): string {
    const riskColor = data.riskTier === 'low' ? '#10b981' : 
                     data.riskTier === 'medium' ? '#f59e0b' : '#ef4444';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Risk Assessment Complete</title>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: #6366f1; padding: 30px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <div style="width: 40px; height: 40px; background: rgba(255, 255, 255, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
              🌍
            </div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Deel Risk Assessment</h1>
          </div>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px;">Risk assessment completed</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Assessment Complete</h2>
          
          <p style="margin-bottom: 25px;">
            The risk assessment for <strong>${data.contractorName}</strong> in <strong>${data.countryName}</strong> has been completed.
          </p>

          <!-- Risk Score Card -->
          <div style="background: #f9fafb; border-radius: 8px; padding: 25px; text-align: center; margin-bottom: 25px;">
            <div style="font-size: 36px; font-weight: bold; color: #1f2937; margin-bottom: 10px;">
              ${data.riskScore}/100
            </div>
            <div style="display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; background: ${riskColor}20; color: ${riskColor};">
              ${data.riskTier} Risk
            </div>
          </div>

          ${data.reportUrl ? `
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${data.reportUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              View Full Report
            </a>
          </div>
          ` : ''}

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            This assessment was generated automatically by the Deel Risk Assessment System. 
            For questions, please contact <a href="mailto:compliance@deel.com" style="color: #6366f1;">compliance@deel.com</a>.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 Deel. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generateRulePublishedEmail(data: RulePublishedNotification): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Compliance Rule Published</title>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: #10b981; padding: 30px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <div style="width: 40px; height: 40px; background: rgba(255, 255, 255, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
              📋
            </div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Compliance Update</h1>
          </div>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px;">New rule published</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Rule Published</h2>
          
          <p style="margin-bottom: 25px;">
            A new compliance rule has been published for <strong>${data.countryName}</strong>.
          </p>

          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px;">${data.ruleName}</h3>
            <div style="color: #047857; font-size: 14px;">
              <p style="margin: 0 0 5px 0;"><strong>Version:</strong> ${data.version}</p>
              <p style="margin: 0 0 5px 0;"><strong>Published by:</strong> ${data.publishedBy}</p>
              <p style="margin: 0;"><strong>Country:</strong> ${data.countryName}</p>
            </div>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            This update may affect future risk assessments for contractors in ${data.countryName}. 
            Please review the new requirements in the admin panel.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 Deel. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generatePDFReadyEmail(contractorName: string, countryName: string, downloadUrl: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>PDF Report Ready</title>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: #f59e0b; padding: 30px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <div style="width: 40px; height: 40px; background: rgba(255, 255, 255, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
              📄
            </div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Report Ready</h1>
          </div>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px;">Your PDF report is ready for download</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">PDF Report Generated</h2>
          
          <p style="margin-bottom: 25px;">
            The risk assessment report for <strong>${contractorName}</strong> in <strong>${countryName}</strong> is now ready for download.
          </p>

          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${downloadUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Download PDF Report
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            This download link will expire in 5 minutes for security purposes. 
            If you need a new link, please generate another report from the dashboard.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 Deel. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generateSubscriptionUpdateEmail(countryName: string, updateType: string, details: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Compliance Update</title>
    </head>
    <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: #6366f1; padding: 30px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <div style="width: 40px; height: 40px; background: rgba(255, 255, 255, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
              🔔
            </div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Compliance Update</h1>
          </div>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px;">${countryName} - ${updateType.replace('_', ' ')}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Important Update</h2>
          
          <p style="margin-bottom: 25px;">
            There has been an important compliance update for <strong>${countryName}</strong> that may affect your contractors and risk assessments.
          </p>

          <div style="background: #eff6ff; border-left: 4px solid #6366f1; padding: 20px; margin-bottom: 25px;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">${details}</p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            You're receiving this email because you subscribed to updates for ${countryName}. 
            You can manage your subscriptions in the dashboard.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 Deel. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const notificationService = new NotificationService();
