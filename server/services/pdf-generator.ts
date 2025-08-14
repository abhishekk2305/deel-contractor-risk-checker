import puppeteer from 'puppeteer';
import { s3Service } from '../lib/s3';
import { storage } from '../storage';
import { createChildLogger } from '../lib/logger';

const logger = createChildLogger('pdf-generator');

interface PdfGenerationOptions {
  contractorId: string;
  title?: string;
  includeBreakdown?: boolean;
}

interface PdfGenerationResult {
  url: string;
  sizeBytes: number;
  key: string;
}

class PdfGenerator {
  private browser: puppeteer.Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
        ],
      });
      logger.info('PDF generator initialized');
    }
  }

  async generateReport(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
    await this.initialize();

    try {
      // Get contractor and risk assessment data
      const contractor = await storage.getContractor(options.contractorId);
      if (!contractor) {
        throw new Error('Contractor not found');
      }

      const riskScore = await storage.getLatestRiskScore(options.contractorId);
      if (!riskScore) {
        throw new Error('Risk assessment not found');
      }

      const country = await storage.getCountryById(contractor.countryId);
      if (!country) {
        throw new Error('Country not found');
      }

      // Generate HTML content
      const html = this.generateHtmlTemplate({
        contractor,
        riskScore,
        country,
        title: options.title || 'Risk Assessment Report',
        includeBreakdown: options.includeBreakdown !== false,
      });

      // Create new page
      const page = await this.browser!.newPage();
      
      try {
        // Set page content
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm',
          },
          displayHeaderFooter: true,
          headerTemplate: this.getHeaderTemplate(),
          footerTemplate: this.getFooterTemplate(),
        });

        // Upload to S3
        const key = s3Service.generateKey('pdf-reports', `risk-assessment-${contractor.id}.pdf`);
        const url = await s3Service.uploadFile(key, pdfBuffer, 'application/pdf');

        // Store PDF record
        await storage.createPdfReport({
          contractorId: options.contractorId,
          url,
          sizeBytes: pdfBuffer.length,
        });

        logger.info({
          contractorId: options.contractorId,
          sizeBytes: pdfBuffer.length,
          key,
        }, 'PDF report generated successfully');

        return {
          url,
          sizeBytes: pdfBuffer.length,
          key,
        };

      } finally {
        await page.close();
      }

    } catch (error) {
      logger.error({ error, contractorId: options.contractorId }, 'PDF generation failed');
      throw error;
    }
  }

  private generateHtmlTemplate(data: {
    contractor: any;
    riskScore: any;
    country: any;
    title: string;
    includeBreakdown: boolean;
  }): string {
    const { contractor, riskScore, country, title, includeBreakdown } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: white;
        }
        
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #6366f1;
        }
        
        .logo {
          width: 40px;
          height: 40px;
          background: #6366f1;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
        }
        
        .logo::after {
          content: "🌍";
          font-size: 20px;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
        }
        
        .subtitle {
          font-size: 14px;
          color: #6b7280;
          margin-left: 10px;
        }
        
        .report-title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 30px;
          text-align: center;
          color: #1f2937;
        }
        
        .summary-section {
          background: #f9fafb;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .risk-score {
          font-size: 48px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 10px;
        }
        
        .risk-tier {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .risk-tier.low {
          background: #dcfce7;
          color: #166534;
        }
        
        .risk-tier.medium {
          background: #fef3c7;
          color: #92400e;
        }
        
        .risk-tier.high {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .info-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }
        
        .info-card h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #1f2937;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .info-label {
          color: #6b7280;
        }
        
        .info-value {
          font-weight: 500;
          color: #1f2937;
        }
        
        .risks-section {
          margin-bottom: 30px;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1f2937;
        }
        
        .risk-item {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 0 6px 6px 0;
        }
        
        .risk-title {
          font-weight: 600;
          color: #92400e;
          margin-bottom: 5px;
        }
        
        .risk-description {
          font-size: 14px;
          color: #78350f;
        }
        
        .recommendations {
          background: #ecfdf5;
          border-left: 4px solid #10b981;
          padding: 20px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 30px;
        }
        
        .recommendations h3 {
          color: #047857;
          margin-bottom: 15px;
        }
        
        .recommendation-list {
          list-style: none;
        }
        
        .recommendation-list li {
          position: relative;
          padding-left: 20px;
          margin-bottom: 8px;
          font-size: 14px;
          color: #065f46;
        }
        
        .recommendation-list li::before {
          content: "💡";
          position: absolute;
          left: 0;
        }
        
        .breakdown-chart {
          display: grid;
          gap: 15px;
          margin: 20px 0;
        }
        
        .breakdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .breakdown-label {
          font-size: 14px;
          color: #6b7280;
          min-width: 120px;
        }
        
        .breakdown-bar {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          margin: 0 15px;
          position: relative;
        }
        
        .breakdown-fill {
          height: 100%;
          background: #6366f1;
          border-radius: 4px;
        }
        
        .breakdown-value {
          font-weight: 600;
          font-size: 14px;
          color: #1f2937;
          min-width: 50px;
          text-align: right;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
        
        .partial-sources {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .partial-sources h4 {
          color: #92400e;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .partial-sources p {
          font-size: 12px;
          color: #78350f;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo"></div>
        <div>
          <div class="company-name">
            Deel
            <span class="subtitle">Risk Assessment Report</span>
          </div>
        </div>
      </div>
      
      <h1 class="report-title">${title}</h1>
      
      <div class="summary-section">
        <div class="risk-score">${riskScore.score}/100</div>
        <div class="risk-tier ${riskScore.tier}">${riskScore.tier.toUpperCase()} RISK</div>
      </div>
      
      ${riskScore.partialSources.length > 0 ? `
      <div class="partial-sources">
        <h4>⚠️ Partial Data Warning</h4>
        <p>Some data sources were unavailable during this assessment: ${riskScore.partialSources.join(', ')}. The risk score may be higher than calculated.</p>
      </div>
      ` : ''}
      
      <div class="info-grid">
        <div class="info-card">
          <h3>Contractor Information</h3>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${contractor.name || 'Not provided'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">${contractor.type}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Method:</span>
            <span class="info-value">${contractor.paymentMethod}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Registration ID:</span>
            <span class="info-value">${contractor.registrationId || 'Not provided'}</span>
          </div>
        </div>
        
        <div class="info-card">
          <h3>Country Information</h3>
          <div class="info-row">
            <span class="info-label">Country:</span>
            <span class="info-value">${country.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ISO Code:</span>
            <span class="info-value">${country.iso}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Assessment Date:</span>
            <span class="info-value">${new Date(riskScore.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ruleset Version:</span>
            <span class="info-value">v${riskScore.rulesetVersion}</span>
          </div>
        </div>
      </div>
      
      ${riskScore.topRisks && riskScore.topRisks.length > 0 ? `
      <div class="risks-section">
        <h2 class="section-title">Top Risk Factors</h2>
        ${riskScore.topRisks.map((risk: any) => `
        <div class="risk-item">
          <div class="risk-title">${risk.title}</div>
          <div class="risk-description">${risk.description}</div>
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      ${riskScore.recommendations && riskScore.recommendations.length > 0 ? `
      <div class="recommendations">
        <h3>Recommendations</h3>
        <ul class="recommendation-list">
          ${riskScore.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${includeBreakdown ? `
      <div class="info-card">
        <h3>Risk Score Breakdown</h3>
        <div class="breakdown-chart">
          ${Object.entries(riskScore.breakdown).map(([key, value]: [string, any]) => `
          <div class="breakdown-item">
            <span class="breakdown-label">${this.formatBreakdownLabel(key)}</span>
            <div class="breakdown-bar">
              <div class="breakdown-fill" style="width: ${value}%"></div>
            </div>
            <span class="breakdown-value">${value}/100</span>
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <div class="info-card">
        <h3>Potential Penalties</h3>
        <p style="font-size: 14px; color: #6b7280;">${riskScore.penaltyRange}</p>
      </div>
      
      <div class="footer">
        <p>This report was generated by Deel Risk Assessment System on ${new Date().toLocaleDateString()}.</p>
        <p>For questions about this assessment, please contact compliance@deel.com</p>
      </div>
    </body>
    </html>
    `;
  }

  private formatBreakdownLabel(key: string): string {
    const labels = {
      sanctions: 'Sanctions',
      pep: 'PEP',
      adverseMedia: 'Adverse Media',
      internalHistory: 'Internal History',
      countryBaseline: 'Country Baseline',
    };
    return labels[key as keyof typeof labels] || key;
  }

  private getHeaderTemplate(): string {
    return `
    <div style="font-size: 10px; color: #6b7280; text-align: center; width: 100%; margin-top: 10px;">
      Deel Risk Assessment Report - Confidential
    </div>
    `;
  }

  private getFooterTemplate(): string {
    return `
    <div style="font-size: 10px; color: #6b7280; text-align: center; width: 100%; margin-bottom: 10px;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>
    `;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('PDF generator closed');
    }
  }
}

export const pdfGenerator = new PdfGenerator();

// Graceful shutdown
process.on('SIGINT', async () => {
  await pdfGenerator.close();
});

process.on('SIGTERM', async () => {
  await pdfGenerator.close();
});
