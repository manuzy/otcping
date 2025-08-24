import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { EdgeLogger } from "../_shared/logger.ts";
import { EdgeErrorHandler } from "../_shared/errorHandler.ts";
import { ResponseBuilder, defaultCorsHeaders } from "../_shared/responseUtils.ts";
import { sanitizeEdgeFunctionInput } from "../../../src/lib/security/enhancedValidation.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const logger = new EdgeLogger("send-contact-email");
const errorHandler = new EdgeErrorHandler(logger, defaultCorsHeaders);
const startTime = Date.now();
const responseBuilder = new ResponseBuilder(defaultCorsHeaders, startTime);

interface ContactFormData {
  name: string;
  subject: string;
  message: string;
  contact: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return ResponseBuilder.cors(defaultCorsHeaders);
  }

  if (req.method !== "POST") {
    return errorHandler.createErrorResponse(
      "Method not allowed",
      405,
      { method: req.method }
    );
  }

  logger.info("Contact form submission started");

  try {
    // Validate environment
    const envValidation = errorHandler.validateEnvironment(["RESEND_API_KEY"]);
    if (!envValidation.isValid) {
      return errorHandler.createErrorResponse(envValidation.error!, 500);
    }

    // Parse and validate request body
    const bodyValidation = await errorHandler.validateJsonBody<ContactFormData>(req);
    if (!bodyValidation.isValid) {
      return errorHandler.createErrorResponse(bodyValidation.error, 400);
    }

    // Sanitize input data
    const sanitizedData = sanitizeEdgeFunctionInput(bodyValidation.data) as ContactFormData;
    const { name, subject, message, contact } = sanitizedData;

    // Additional validation
    if (!name?.trim() || !subject?.trim() || !message?.trim() || !contact?.trim()) {
      return errorHandler.createErrorResponse(
        "All fields are required",
        400,
        { missingFields: { name: !name?.trim(), subject: !subject?.trim(), message: !message?.trim(), contact: !contact?.trim() } }
      );
    }

    logger.info("Sending contact email", {
      operation: "send_email",
      metadata: { 
        subject: subject.substring(0, 50) + "...",
        hasContact: !!contact,
        messageLength: message.length 
      }
    });

    // Determine contact method
    const isEmail = contact.includes("@") && !contact.startsWith("@");
    const contactMethod = isEmail ? "Email" : "Telegram";

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "OTCping Contact Form <noreply@otcping.com>",
      to: ["manuel@31third.com"],
      subject: `[OTCping Beta] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Contact Information</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>${contactMethod}:</strong> ${contact}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #495057;">Message</h3>
            <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #007bff; border-radius: 4px;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
            <p>Submitted: ${new Date().toLocaleString()}</p>
            <p>Source: OTCping Beta Contact Form</p>
          </div>
        </div>
      `,
    });

    if (emailResponse.error) {
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    logger.apiSuccess("Contact email sent successfully", {
      emailId: emailResponse.data?.id,
      metadata: { contactMethod, subjectPreview: subject.substring(0, 30) }
    });

    return responseBuilder.success({
      message: "Contact form submitted successfully",
      emailId: emailResponse.data?.id
    });

  } catch (error: any) {
    logger.error("Failed to send contact email", { error: error.message }, error);
    
    if (error.message?.includes("Rate limit")) {
      return errorHandler.createErrorResponse(
        "Too many requests. Please try again later.",
        429,
        { operation: "send_contact_email" }
      );
    }
    
    return errorHandler.createErrorResponse(
      "Failed to send contact form. Please try again.",
      500,
      { operation: "send_contact_email", error: error.message }
    );
  }
};

serve(handler);