import { AuthBar } from "@/components/AuthBar";
import {
  isGoogleAuthConfigured,
  isKakaoAuthConfigured,
} from "@/lib/auth-providers";

export function AuthBarServer() {
  return (
    <AuthBar
      googleEnabled={isGoogleAuthConfigured()}
      kakaoEnabled={isKakaoAuthConfigured()}
    />
  );
}
