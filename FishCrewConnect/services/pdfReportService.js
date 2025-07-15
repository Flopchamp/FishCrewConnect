import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

class PDFReportService {
  constructor() {
    this.defaultColors = {
      primary: rgb(0.1, 0.4, 0.7),      // Blue
      secondary: rgb(0.3, 0.6, 0.9),   // Light Blue
      success: rgb(0.2, 0.7, 0.2),     // Green
      warning: rgb(0.9, 0.6, 0.1),     // Orange
      danger: rgb(0.8, 0.2, 0.2),      // Red
      text: rgb(0.2, 0.2, 0.2),        // Dark Gray
      lightText: rgb(0.5, 0.5, 0.5),   // Light Gray
      background: rgb(0.98, 0.98, 0.98) // Very Light Gray
    };
  }

  /**
   * Generate a comprehensive analytics PDF report
   * @param {Object} data - Analytics data from the API
   * @param {Object} options - Report options (title, period, etc.)
   * @returns {Promise<string>} - Path to the generated PDF file
   */
  static async generateAnalyticsReport(data, options = {}) {
    try {
      console.log('🔄 Generating PDF analytics report...');
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      
      // Embed fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Add first page
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      const { width, height } = page.getSize();
      
      // Define colors
      const primaryColor = rgb(0.1, 0.4, 0.7); // Blue
      const secondaryColor = rgb(0.2, 0.2, 0.2); // Dark gray
      const accentColor = rgb(0.9, 0.6, 0.1); // Orange
      
      let yPosition = height - 50;
      
      // Header
      this.drawHeader(page, {
        font: helveticaBoldFont,
        regularFont: helveticaFont,
        width,
        yPosition,
        primaryColor,
        title: options.title || 'FishCrewConnect Analytics Report',
        period: options.period || '30 days',
        generatedDate: new Date().toLocaleDateString()
      });
      
      yPosition -= 100;
      
      // Executive Summary
      if (data.overview) {
        yPosition = this.drawSection(page, {
          title: 'Executive Summary',
          content: this.formatOverviewData(data.overview),
          yPosition,
          font: helveticaFont,
          titleFont: helveticaBoldFont,
          primaryColor,
          secondaryColor,
          width
        });
      }
      
      // User Analytics
      if (data.users) {
        yPosition = this.drawSection(page, {
          title: 'User Analytics',
          content: this.formatUserData(data.users),
          yPosition,
          font: helveticaFont,
          titleFont: helveticaBoldFont,
          primaryColor,
          secondaryColor,
          width
        });
      }
      
      // Job Analytics
      if (data.jobs) {
        yPosition = this.drawSection(page, {
          title: 'Job Analytics',
          content: this.formatJobData(data.jobs),
          yPosition,
          font: helveticaFont,
          titleFont: helveticaBoldFont,
          primaryColor,
          secondaryColor,
          width
        });
      }
      
      // Payment Analytics (if available)
      if (data.payments) {
        yPosition = this.drawSection(page, {
          title: 'Payment Analytics',
          content: this.formatPaymentData(data.payments),
          yPosition,
          font: helveticaFont,
          titleFont: helveticaBoldFont,
          primaryColor,
          secondaryColor,
          width
        });
      }
      
      // Add footer
      this.drawFooter(page, {
        font: helveticaFont,
        width,
        height,
        secondaryColor
      });
      
      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();
      
      // Create file path
      const fileName = `FishCrewConnect_Report_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Write PDF to file system
      await FileSystem.writeAsStringAsync(
        fileUri,
        Array.from(pdfBytes, byte => String.fromCharCode(byte)).join(''),
        { encoding: FileSystem.EncodingType.Base64 }
      );
      
      console.log('✅ PDF report generated successfully:', fileUri);
      return fileUri;
      
    } catch (error) {
      console.error('❌ Error generating PDF report:', error);
      throw new Error('Failed to generate PDF report: ' + error.message);
    }
  }
  
  /**
   * Generate and share analytics report
   */
  async generateAndShareReport(reportType, data, config = {}) {
    try {
      console.log('🔄 Starting PDF report generation...', reportType);
      
      let pdfBytes;
      const timestamp = Date.now();
      const fileName = `FishCrewConnect_${reportType}_Report_${timestamp}.pdf`;
      
      switch (reportType) {
        case 'analytics':
          pdfBytes = await this.createAnalyticsReport(data, config);
          break;
        case 'payments':
          pdfBytes = await this.createPaymentReport(data, config);
          break;
        case 'users':
          pdfBytes = await this.createUserReport(data, config);
          break;
        default:
          pdfBytes = await this.createAnalyticsReport(data, config);
      }

      // Save and share the PDF
      const result = await this.savePDFToDevice(pdfBytes, fileName);
      
      if (result.success) {
        console.log('✅ PDF report generated successfully');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error generating PDF report:', error);
      throw error;
    }
  }

  /**
   * Create a payment report PDF
   */
  async createPaymentReport(paymentData, config = {}) {
    try {
      const {
        title = 'Payment Analytics Report',
        period = '30 days'
      } = config;

      console.log('🔄 Creating payment PDF with data:', paymentData);

      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const page = pdfDoc.addPage([595, 842]); // A4 size
      let yPosition = 800;

      // Add header
      yPosition = this.addReportHeader(page, helveticaBoldFont, helveticaFont, title, period);
      
      // Add payment statistics
      yPosition = await this.addPaymentStatistics(page, paymentData, helveticaFont, helveticaBoldFont, yPosition);
      
      // Add footer
      this.addReportFooter(page, helveticaFont);

      return await pdfDoc.save();
      
    } catch (error) {
      console.error('Error creating payment report:', error);
      throw error;
    }
  }

  /**
   * Create analytics report PDF
   */
  async createAnalyticsReport(data, config = {}) {
    try {
      const {
        title = 'FishCrewConnect Analytics Report',
        period = '30 days'
      } = config;

      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const page = pdfDoc.addPage([595, 842]); // A4 size
      let yPosition = 800;

      // Add header
      yPosition = this.addReportHeader(page, helveticaBoldFont, helveticaFont, title, period);
      
      // Add content based on available data
      if (data.users || data.jobs || data.payments) {
        yPosition = await this.addAnalyticsContent(page, data, helveticaFont, helveticaBoldFont, yPosition);
      }
      
      // Add footer
      this.addReportFooter(page, helveticaFont);

      return await pdfDoc.save();
      
    } catch (error) {
      console.error('Error creating analytics report:', error);
      throw error;
    }
  }

  /**
   * Create user report PDF
   */
  async createUserReport(userData, config = {}) {
    try {
      const {
        title = 'User Analytics Report',
        period = '30 days'
      } = config;

      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const page = pdfDoc.addPage([595, 842]); // A4 size
      let yPosition = 800;

      // Add header
      yPosition = this.addReportHeader(page, helveticaBoldFont, helveticaFont, title, period);
      
      // Add user analytics content
      yPosition = await this.addUserAnalyticsContent(page, userData, helveticaFont, helveticaBoldFont, yPosition);
      
      // Add footer
      this.addReportFooter(page, helveticaFont);

      return await pdfDoc.save();
      
    } catch (error) {
      console.error('Error creating user report:', error);
      throw error;
    }
  }

  /**
   * Add analytics content to PDF
   */
  async addAnalyticsContent(page, data, regularFont, boldFont, yPosition) {
    let currentY = yPosition;
    
    // Add general analytics
    currentY = this.addSectionTitle(page, boldFont, 'Platform Overview', currentY);
    currentY -= 20;

    const generalMetrics = [
      { label: 'Total Users', value: data.totalUsers || 0, format: 'number' },
      { label: 'Total Jobs', value: data.totalJobs || 0, format: 'number' },
      { label: 'Total Applications', value: data.totalApplications || 0, format: 'number' },
      { label: 'Active Conversations', value: data.activeConversations || 0, format: 'number' }
    ];

    currentY = this.addMetricsGrid(page, regularFont, boldFont, generalMetrics, currentY);

    return currentY;
  }

  /**
   * Add user analytics content to PDF
   */
  async addUserAnalyticsContent(page, data, regularFont, boldFont, yPosition) {
    let currentY = yPosition;
    
    currentY = this.addSectionTitle(page, boldFont, 'User Analytics', currentY);
    currentY -= 20;

    if (data.users) {
      const userMetrics = data.users.usersByType?.map(item => ({
        label: item.user_type,
        value: item.total,
        format: 'number'
      })) || [];

      if (userMetrics.length > 0) {
        currentY = this.addMetricsGrid(page, regularFont, boldFont, userMetrics, currentY);
      }
    }

    return currentY;
  }

  /**
   * Generate a payment report PDF
   * @param {Object} paymentData - Payment data from API
   * @param {Object} options - Report options
   * @returns {Promise<string>} - Path to the generated PDF file
   */
  static async generatePaymentReport(paymentData, options = {}) {
    try {
      console.log('🔄 Generating PDF payment report...');
      
      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      
      const primaryColor = rgb(0.1, 0.6, 0.1); // Green for payment reports
      const secondaryColor = rgb(0.2, 0.2, 0.2);
      
      let yPosition = height - 50;
      
      // Header
      this.drawHeader(page, {
        font: helveticaBoldFont,
        regularFont: helveticaFont,
        width,
        yPosition,
        primaryColor,
        title: 'Payment System Report',
        period: options.period || '30 days',
        generatedDate: new Date().toLocaleDateString()
      });
      
      yPosition -= 100;
      
      // Payment Summary
      const paymentSummary = [
        `Total Transactions: ${paymentData.total_transactions || 0}`,
        `Completed Transactions: ${paymentData.completed_transactions || 0}`,
        `Total Revenue: KSH ${this.formatCurrency(paymentData.total_revenue || 0)}`,
        `Platform Commission: KSH ${this.formatCurrency(paymentData.total_commission || 0)}`,
        `Success Rate: ${this.calculateSuccessRate(paymentData)}%`
      ];
      
      yPosition = this.drawSection(page, {
        title: 'Payment Summary',
        content: paymentSummary,
        yPosition,
        font: helveticaFont,
        titleFont: helveticaBoldFont,
        primaryColor,
        secondaryColor,
        width
      });
      
      // Generate PDF bytes and save
      const pdfBytes = await pdfDoc.save();
      const fileName = `Payment_Report_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(
        fileUri,
        Array.from(pdfBytes, byte => String.fromCharCode(byte)).join(''),
        { encoding: FileSystem.EncodingType.Base64 }
      );
      
      console.log('✅ PDF payment report generated:', fileUri);
      return fileUri;
      
    } catch (error) {
      console.error('❌ Error generating PDF payment report:', error);
      throw new Error('Failed to generate PDF payment report: ' + error.message);
    }
  }
  
  /**
   * Share generated PDF report
   * @param {string} fileUri - Path to the PDF file
   * @param {string} title - Share dialog title
   */
  static async shareReport(fileUri, title = 'FishCrewConnect Report') {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: title,
          UTI: 'com.adobe.pdf'
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('❌ Error sharing PDF report:', error);
      throw new Error('Failed to share PDF report: ' + error.message);
    }
  }
  
  // Helper Methods
  
  static drawHeader(page, options) {
    const { font, regularFont, width, yPosition, primaryColor, title, period, generatedDate } = options;
    
    // Company logo area (placeholder)
    page.drawRectangle({
      x: 50,
      y: yPosition - 40,
      width: 40,
      height: 40,
      borderColor: primaryColor,
      borderWidth: 2
    });
    
    // Title
    page.drawText(title, {
      x: 100,
      y: yPosition - 15,
      size: 24,
      font: font,
      color: primaryColor
    });
    
    // Period and date
    page.drawText(`Period: ${period}`, {
      x: 100,
      y: yPosition - 35,
      size: 12,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4)
    });
    
    page.drawText(`Generated: ${generatedDate}`, {
      x: width - 150,
      y: yPosition - 15,
      size: 12,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4)
    });
    
    // Divider line
    page.drawRectangle({
      x: 50,
      y: yPosition - 55,
      width: width - 100,
      height: 1,
      color: primaryColor
    });
  }
  
  static drawSection(page, options) {
    const { title, content, yPosition, font, titleFont, primaryColor, secondaryColor, width } = options;
    
    let currentY = yPosition;
    
    // Section title
    page.drawText(title, {
      x: 50,
      y: currentY,
      size: 16,
      font: titleFont,
      color: primaryColor
    });
    
    currentY -= 25;
    
    // Section content
    if (Array.isArray(content)) {
      content.forEach(line => {
        if (currentY < 50) return; // Prevent overflow
        
        page.drawText(`• ${line}`, {
          x: 70,
          y: currentY,
          size: 11,
          font: font,
          color: secondaryColor
        });
        
        currentY -= 20;
      });
    } else {
      // Handle string content
      const lines = content.split('\n');
      lines.forEach(line => {
        if (currentY < 50) return;
        
        page.drawText(line, {
          x: 70,
          y: currentY,
          size: 11,
          font: font,
          color: secondaryColor
        });
        
        currentY -= 20;
      });
    }
    
    return currentY - 20; // Return new Y position
  }
  
  static drawFooter(page, options) {
    const { font, width, height, secondaryColor } = options;
    
    const footerY = 30;
    
    // Footer line
    page.drawRectangle({
      x: 50,
      y: footerY + 15,
      width: width - 100,
      height: 1,
      color: rgb(0.8, 0.8, 0.8)
    });
    
    // Footer text
    page.drawText('FishCrewConnect Platform - Confidential Report', {
      x: 50,
      y: footerY,
      size: 10,
      font: font,
      color: secondaryColor
    });
    
    page.drawText(`Page 1`, {
      x: width - 100,
      y: footerY,
      size: 10,
      font: font,
      color: secondaryColor
    });
  }
  
  /**
   * Add report header
   */
  addReportHeader(page, boldFont, regularFont, title, period) {
    const { width, height } = page.getSize();
    
    // Header background
    page.drawRectangle({
      x: 50,
      y: height - 80,
      width: width - 100,
      height: 60,
      color: this.defaultColors.primary,
    });

    // App title
    page.drawText('🐟 FishCrewConnect', {
      x: 60,
      y: height - 50,
      size: 18,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    // Report title
    page.drawText(title, {
      x: 60,
      y: height - 70,
      size: 12,
      font: regularFont,
      color: rgb(1, 1, 1),
    });

    // Date and period
    const currentDate = new Date().toLocaleDateString();
    page.drawText(`Generated: ${currentDate} | Period: ${period}`, {
      x: width - 200,
      y: height - 50,
      size: 10,
      font: regularFont,
      color: rgb(1, 1, 1),
    });

    return height - 100;
  }

  /**
   * Add section title with underline
   */
  addSectionTitle(page, boldFont, title, yPosition) {
    page.drawText(title, {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: this.defaultColors.primary,
    });

    // Add underline
    page.drawLine({
      start: { x: 50, y: yPosition - 5 },
      end: { x: 50 + (title.length * 8), y: yPosition - 5 },
      thickness: 1,
      color: this.defaultColors.primary,
    });

    return yPosition - 10;
  }

  /**
   * Add metrics in a grid layout
   */
  addMetricsGrid(page, regularFont, boldFont, metrics, yPosition) {
    let currentY = yPosition;
    const { width } = page.getSize();
    const itemsPerRow = 2;
    const itemWidth = (width - 100) / itemsPerRow;

    for (let i = 0; i < metrics.length; i += itemsPerRow) {
      for (let j = 0; j < itemsPerRow && i + j < metrics.length; j++) {
        const metric = metrics[i + j];
        const x = 50 + (j * itemWidth);

        // Draw metric box
        page.drawRectangle({
          x: x,
          y: currentY - 40,
          width: itemWidth - 10,
          height: 35,
          borderColor: this.defaultColors.lightText,
          borderWidth: 1,
          color: this.defaultColors.background,
        });

        // Draw metric label
        page.drawText(metric.label, {
          x: x + 10,
          y: currentY - 15,
          size: 10,
          font: regularFont,
          color: this.defaultColors.text,
        });

        // Format and draw metric value
        let formattedValue = metric.value;
        if (metric.format === 'currency') {
          formattedValue = `KSH ${this.formatCurrency(metric.value)}`;
        } else if (metric.format === 'number') {
          formattedValue = metric.value.toLocaleString();
        }

        page.drawText(formattedValue.toString(), {
          x: x + 10,
          y: currentY - 30,
          size: 12,
          font: boldFont,
          color: this.defaultColors.primary,
        });
      }
      currentY -= 50;
    }

    return currentY;
  }

  /**
   * Add report footer
   */
  addReportFooter(page, regularFont) {
    const { width } = page.getSize();
    
    page.drawText('Generated by FishCrewConnect Analytics System', {
      x: 50,
      y: 30,
      size: 8,
      font: regularFont,
      color: this.defaultColors.lightText,
    });

    page.drawText('Page 1', {
      x: width - 80,
      y: 30,
      size: 8,
      font: regularFont,
      color: this.defaultColors.lightText,
    });
  }

  /**
   * Add payment statistics to PDF
   */
  async addPaymentStatistics(page, data, regularFont, boldFont, yPosition) {
    let currentY = yPosition;
    
    // Payment overview
    currentY = this.addSectionTitle(page, boldFont, 'Payment Overview', currentY);
    currentY -= 20;

    const metrics = [
      { label: 'Total Transactions', value: data.total_transactions || 0, format: 'number' },
      { label: 'Completed Payments', value: data.completed_transactions || 0, format: 'number' },
      { label: 'Pending Payments', value: data.pending_transactions || 0, format: 'number' },
      { label: 'Failed Payments', value: data.failed_transactions || 0, format: 'number' },
      { label: 'Total Revenue', value: data.total_revenue || 0, format: 'currency' },
      { label: 'Platform Commission', value: data.total_commission || 0, format: 'currency' }
    ];

    currentY = this.addMetricsGrid(page, regularFont, boldFont, metrics, currentY);
    
    // Success rate
    const successRate = this.calculateSuccessRate(data);
    currentY -= 30;
    currentY = this.addSectionTitle(page, boldFont, `Payment Success Rate: ${successRate}%`, currentY);

    return currentY;
  }

  // Data formatting methods
  
  static formatOverviewData(overview) {
    return [
      `Total Platform Users: ${overview.totalUsers || 0}`,
      `Active Jobs: ${overview.activeJobs || 0}`,
      `Total Applications: ${overview.totalApplications || 0}`,
      `Success Rate: ${overview.successRate || 0}%`,
      `Platform Growth: ${overview.growth || 0}%`
    ];
  }
  
  static formatUserData(users) {
    const data = [];
    
    if (users.usersByType) {
      data.push('User Distribution:');
      users.usersByType.forEach(type => {
        data.push(`  ${type.user_type}: ${type.total}`);
      });
    }
    
    if (users.userGrowth && users.userGrowth.length > 0) {
      data.push(`Recent Growth: ${users.userGrowth.length} days of data`);
    }
    
    return data;
  }
  
  static formatJobData(jobs) {
    const data = [];
    
    if (jobs.jobsByStatus) {
      data.push('Job Status Distribution:');
      jobs.jobsByStatus.forEach(status => {
        data.push(`  ${status.status}: ${status.total} jobs`);
      });
    }
    
    if (jobs.jobsByLocation) {
      data.push('Top Job Locations:');
      jobs.jobsByLocation.slice(0, 5).forEach(location => {
        data.push(`  ${location.location}: ${location.job_count} jobs`);
      });
    }
    
    return data;
  }
  
  static formatPaymentData(payments) {
    return [
      `Total Payment Volume: KSH ${this.formatCurrency(payments.totalVolume || 0)}`,
      `Completed Payments: ${payments.completedPayments || 0}`,
      `Pending Payments: ${payments.pendingPayments || 0}`,
      `Platform Commission: KSH ${this.formatCurrency(payments.totalCommission || 0)}`,
      `Average Transaction: KSH ${this.formatCurrency(payments.averageTransaction || 0)}`
    ];
  }
  
  static formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-KE', { minimumFractionDigits: 2 });
  }
  
  static calculateSuccessRate(paymentData) {
    const total = paymentData.total_transactions || 0;
    const completed = paymentData.completed_transactions || 0;
    
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }
}

// Export singleton instance
export default new PDFReportService();
