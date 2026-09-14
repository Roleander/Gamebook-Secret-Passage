"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink } from "lucide-react";

interface PayPalDonateProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function PayPalDonate({ variant = "outline", size = "default", className }: PayPalDonateProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDonate = () => {
    // Replace with your actual PayPal.me link or PayPal donation page
    const paypalUrl = "https://www.paypal.com/donate?hosted_button_id=YOUR_BUTTON_ID";
    window.open(paypalUrl, "_blank");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDonate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`gap-2 ${className || ""}`}
    >
      <Heart className={`w-4 h-4 ${isHovered ? "fill-current text-red-500" : ""}`} />
      Donar con PayPal
      <ExternalLink className="w-3 h-3 opacity-50" />
    </Button>
  );
}
