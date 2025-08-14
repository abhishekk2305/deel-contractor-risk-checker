import puppeteer from 'puppeteer';
import { createChildLogger } from "../lib/logger";
import { redis } from "../lib/redis";
import { db } from "../lib/database";
import { pdfReports } from "@shared/schema";

const logger = createChildLogger('pdf-service');

export interface PDFGenerationRequest {
  contractorName: string;
  countryName: string;
  riskAssessment: any;
  template?: 'standard' | 'detailed';
}

export class PDFService {
  async generateRiskReport(request: PDFGenerationRequest): Promise<string> {
    const startTime = Date.now();
    logger.info({ contractor: request.contractorName }, 'Starting PDF generation');

    try {
      // Create HTML content
      const htmlContent = this.createHTMLTemplate(request);
      
      // Generate PDF with Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      await browser.close();

      // Store PDF report in database
      const fileName = `${request.contractorName.replace(/\s+/g, '_')}_Risk_Report.pdf`;
      const [report] = await db.insert(pdfReports).values({
        contractorId: request.riskAssessment.contractorId,
        url: `risk-reports/${request.riskAssessment.id}.pdf`,
        sizeBytes: pdfBuffer.length,
        generatedAt: new Date(),
      }).returning();

      // Simulate S3 upload (in real implementation, would upload to S3)
      const preSignedUrl = this.generateMockPreSignedUrl(fileName);
      
      const duration = Date.now() - startTime;
      logger.info({ 
        reportId: report.id, 
        fileSize: pdfBuffer.length, 
        duration 
      }, 'PDF generation completed');

      return preSignedUrl;

    } catch (error) {
      logger.error({ error, request }, 'PDF generation failed');
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async enqueuePDFGeneration(request: PDFGenerationRequest): Promise<string> {
    const jobId = crypto.randomUUID();
    
    try {
      // In a real implementation, this would use a job queue like Redis Bull
      // For now, we'll generate synchronously but simulate async behavior
      
      // Cache job status
      await redis?.setex(`pdf:job:${jobId}`, 3600, JSON.stringify({
        status: 'processing',
        contractorName: request.contractorName,
        createdAt: new Date().toISOString(),
      }));

      // Generate PDF asynchronously (simulate with setTimeout)
      setTimeout(async () => {
        try {
          const preSignedUrl = await this.generateRiskReport(request);
          
          await redis?.setex(`pdf:job:${jobId}`, 3600, JSON.stringify({
            status: 'completed',
            downloadUrl: preSignedUrl,
            contractorName: request.contractorName,
            completedAt: new Date().toISOString(),
          }));
        } catch (error) {
          await redis?.setex(`pdf:job:${jobId}`, 3600, JSON.stringify({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            contractorName: request.contractorName,
            failedAt: new Date().toISOString(),
          }));
        }
      }, 2000); // Simulate 2 second processing time

      return jobId;
    } catch (error) {
      logger.error({ error, request }, 'Failed to enqueue PDF generation');
      throw error;
    }
  }

  async getJobStatus(jobId: string) {
    try {
      const status = await redis?.get(`pdf:job:${jobId}`);
      return status ? JSON.parse(status) : null;
    } catch (error) {
      logger.error({ error, jobId }, 'Failed to get job status');
      return null;
    }
  }

  private createHTMLTemplate(request: PDFGenerationRequest): string {
    const { contractorName, countryName, riskAssessment } = request;
    const date = new Date().toLocaleDateString();

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Risk Assessment Report</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          line-height: 1.6;
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 300;
        }
        
        .header p {
          margin: 10px 0 0;
          opacity: 0.9;
        }
        
        .content {
          padding: 30px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .risk-tier {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          border-radius: 8px;
          font-size: 18px;
          font-weight: bold;
        }
        
        .risk-tier.low {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .risk-tier.medium {
          background-color: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }
        
        .risk-tier.high {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .section {
          margin: 30px 0;
          padding: 20px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background: #f8f9fa;
        }
        
        .section h2 {
          margin-top: 0;
          color: #495057;
          border-bottom: 2px solid #dee2e6;
          padding-bottom: 10px;
        }
        
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
          text-align: center;
          color: #6c757d;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Global Contractor Risk Assessment</h1>
        <p>Comprehensive Risk Analysis Report</p>
      </div>
      
      <div class="content">
        <div class="section">
          <h2>Assessment Overview</h2>
          <p><strong>Contractor:</strong> ${contractorName}</p>
          <p><strong>Country:</strong> ${countryName}</p>
          <p><strong>Assessment Date:</strong> ${date}</p>
          <p><strong>Report ID:</strong> ${riskAssessment.id}</p>
        </div>
        
        <div class="risk-tier ${riskAssessment.riskTier || 'medium'}">
          Risk Level: ${(riskAssessment.riskTier || 'medium').toUpperCase()}
          <br>
          Overall Score: ${riskAssessment.overallScore || 50}/100
        </div>
        
        <div class="section">
          <h2>Top Risk Factors</h2>
          ${(riskAssessment.topRisks || ['No significant risks identified']).map((risk: string) => `<p>• ${risk}</p>`).join('')}
        </div>
        
        <div class="section">
          <h2>Recommendations</h2>
          ${(riskAssessment.recommendations || ['Standard compliance procedures recommended']).map((rec: string) => `<p>• ${rec}</p>`).join('')}
        </div>
        
        <div class="footer">
          <p>This report was generated by Deel's Global Contractor Risk Checker on ${date}</p>
          <p>Report expires: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generateMockPreSignedUrl(fileName: string): string {
    // In a real implementation, this would be a real S3 pre-signed URL
    const baseUrl = process.env.S3_BASE_URL || 'https://mock-s3-bucket.s3.amazonaws.com';
    const mockSignature = Buffer.from(fileName).toString('base64').substring(0, 8);
    return `${baseUrl}/risk-reports/${fileName}?signature=${mockSignature}&expires=${Date.now() + 3600000}`;
  }
}

export const pdfService = new PDFService();