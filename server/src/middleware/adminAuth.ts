import { Request, Response, NextFunction } from "express";

// List of admin emails
const ADMIN_EMAILS = [
  "abhay@keyvalue.systems",
];

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  // Check if user email is in admin list
  const userEmail = req.user.email?.toLowerCase();
  const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);

  if (!isAdmin) {
    res.status(403).json({ 
      error: "Forbidden: Admin access required",
      message: "You do not have permission to access this resource"
    });
    return;
  }

  // User is admin, proceed
  next();
}

// Helper function to check if a user is admin (for use in other parts of the code)
export function isAdmin(email: string): boolean {
  const normalizedEmail = email.toLowerCase();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalizedEmail);
}

// Function to add admin emails dynamically (if needed)
export function addAdminEmail(email: string): void {
  const normalizedEmail = email.toLowerCase();
  if (!ADMIN_EMAILS.includes(normalizedEmail)) {
    ADMIN_EMAILS.push(normalizedEmail);
  }
}
