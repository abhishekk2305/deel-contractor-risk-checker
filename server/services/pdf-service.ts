import puppeteer from 'puppeteer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createChildLogger } from "../lib/logger";
import { redis } from "../lib/redis";
import { db } from "../lib/database";
import { pdfReports } from "@shared/schema";
import { randomUUID } from 'crypto';

const logger = createChildLogger('pdf-service');

export interface PDFGenerationRequest {
  contractorName: string;
  countryName: string;
  riskAssessment: any;
  template?: 'standard' | 'detailed';
}

export class PDFService {
  private s3Client: S3Client | null;

  constructor() {
    // Check if AWS credentials are available
    const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && 
                             process.env.AWS_SECRET_ACCESS_KEY && 
                             process.env.AWS_S3_BUCKET;
    
    if (hasAWSCredentials) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    } else {
      logger.warn('AWS credentials not configured, PDF generation will use mock URLs');
      this.s3Client = null;
    }
  }
  async generateRiskReport(request: PDFGenerationRequest): Promise<string> {
    const startTime = Date.now();
    logger.info({ contractor: request.contractorName }, 'Starting PDF generation');

    try {
      // Create filename for the PDF
      const fileName = `risk-reports/${request.riskAssessment.id}_${request.contractorName.replace(/\s+/g, '_')}_Risk_Report.pdf`;
      let preSignedUrl: string;
      let s3Url: string;
      let pdfBuffer: Buffer;

      // For now, create a simple mock PDF buffer to test the pipeline
      // TODO: Implement actual Puppeteer PDF generation
      const mockPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Risk Report for ${request.contractorName}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000230 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
320
%%EOF`;

      pdfBuffer = Buffer.from(mockPdfContent);
      logger.info({ contractor: request.contractorName, bufferSize: pdfBuffer.length }, 'Mock PDF created');

      // Try S3 upload first
      if (this.s3Client && process.env.AWS_S3_BUCKET) {
        try {
          const bucketName = process.env.AWS_S3_BUCKET;
          
          const uploadCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            Metadata: {
              contractorName: request.contractorName,
              countryName: request.countryName,
              riskTier: request.riskAssessment.riskTier,
              generatedAt: new Date().toISOString(),
            },
          });

          await this.s3Client.send(uploadCommand);
          s3Url = `s3://${bucketName}/${fileName}`;

          // Generate pre-signed URL for download
          const downloadCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileName,
          });
          preSignedUrl = await getSignedUrl(this.s3Client, downloadCommand, { expiresIn: 3600 });
          
          logger.info({ bucketName, fileName, urlPrefix: preSignedUrl.substring(0, 50) }, 'PDF uploaded to S3 successfully');
        } catch (s3Error) {
          logger.error({ error: s3Error.message || s3Error }, 'S3 upload failed, using mock URL');
          preSignedUrl = this.generateMockPreSignedUrl(fileName);
          s3Url = `mock://${fileName}`;
        }
      } else {
        // Fallback to mock URL if S3 not configured
        preSignedUrl = this.generateMockPreSignedUrl(fileName);
        s3Url = `mock://${fileName}`;
        logger.info('Using mock PDF URL - S3 not configured');
      }

      // Store PDF report in database
      const [report] = await db.insert(pdfReports).values({
        contractorId: request.riskAssessment.contractorId,
        url: s3Url,
        sizeBytes: pdfBuffer.length,
        generatedAt: new Date(),
      }).returning();
      
      const duration = Date.now() - startTime;
      logger.info({ 
        reportId: report.id, 
        fileSize: pdfBuffer.length, 
        duration,
        urlType: s3Url.startsWith('s3://') ? 'S3' : 'mock'
      }, 'PDF generation completed');

      return preSignedUrl;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error({ 
        error: errorMessage, 
        stack: errorStack,
        request: request.contractorName 
      }, 'PDF generation failed with details');
      throw new Error(`PDF generation failed: ${errorMessage}`);
    }
  }

  // Use a global jobs map so it persists across instances
  private static jobs: Map<string, any> = new Map();

  async enqueuePDFGeneration(request: PDFGenerationRequest): Promise<string> {
    const jobId = randomUUID();
    
    try {
      // Store job status in memory (fallback for Redis)
      PDFService.jobs.set(jobId, {
        status: 'processing',
        contractorName: request.contractorName,
        createdAt: new Date().toISOString(),
      });

      // Try Redis first, fallback to memory
      if (redis) {
        await redis.setex(`pdf:job:${jobId}`, 3600, JSON.stringify({
          status: 'processing',
          contractorName: request.contractorName,
          createdAt: new Date().toISOString(),
        }));
      }

      // Generate PDF asynchronously (simulate with setTimeout)
      setTimeout(async () => {
        try {
          logger.info({ jobId, contractor: request.contractorName }, 'Starting PDF generation for job');
          
          // Process PDF generation with proper error handling
          let preSignedUrl: string;
          let actualSizeBytes: number;
          
          try {
            preSignedUrl = await this.generateRiskReport(request);
            actualSizeBytes = 250000; // Mock size - would be real in production
          } catch (pdfError) {
            logger.error({ error: pdfError, jobId }, 'PDF generation internal error');
            throw pdfError;
          }
          
          const completedJob = {
            status: 'completed',
            downloadUrl: preSignedUrl,
            sizeBytes: actualSizeBytes,
            contractorName: request.contractorName,
            completedAt: new Date().toISOString(),
          };

          // Store in both Redis and memory
          PDFService.jobs.set(jobId, completedJob);
          if (redis) {
            try {
              await redis.setex(`pdf:job:${jobId}`, 3600, JSON.stringify(completedJob));
            } catch (redisError) {
              logger.warn({ error: redisError, jobId }, 'Redis setex failed, using memory only');
            }
          }
          
          logger.info({ jobId, preSignedUrl: preSignedUrl.substring(0, 100) + '...' }, 'PDF generation completed successfully');
        } catch (error) {
          logger.error({ error: error.message || error, jobId, stack: error.stack }, 'PDF generation failed with details');
          const failedJob = {
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            contractorName: request.contractorName,
            failedAt: new Date().toISOString(),
          };

          PDFService.jobs.set(jobId, failedJob);
          if (redis) {
            try {
              await redis.setex(`pdf:job:${jobId}`, 3600, JSON.stringify(failedJob));
            } catch (redisError) {
              logger.warn({ error: redisError, jobId }, 'Redis setex failed for failed job');
            }
          }
        }
      }, 3000); // 3 second processing time to allow for testing

      return jobId;
    } catch (error) {
      logger.error({ error, request }, 'Failed to enqueue PDF generation');
      throw error;
    }
  }

  async getJobStatus(jobId: string) {
    // Try Redis first, then memory fallback
    let jobData = null;
    
    if (redis) {
      try {
        const redisData = await redis.get(`pdf:job:${jobId}`);
        if (redisData) {
          jobData = JSON.parse(redisData);
        }
      } catch (error) {
        logger.warn({ error, jobId }, 'Redis get failed, using memory fallback');
      }
    }
    
    // Fallback to in-memory storage
    if (!jobData) {
      jobData = PDFService.jobs.get(jobId);
    }
    
    if (!jobData) {
      return null;
    }
    
    // Return format expected by frontend with url and size_bytes
    if (jobData.status === 'completed') {
      return {
        status: 'completed',
        url: jobData.downloadUrl,
        size_bytes: jobData.sizeBytes || 0,
        contractorName: jobData.contractorName,
        completedAt: jobData.completedAt,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
    }
    
    return jobData;
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