import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/lib/supabase";

const cloudAuth = createLovableAuth();

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type OAuthProvider = "google" | "apple" | "microsoft";

export async function signInWithCloudOAuth(provider: OAuthProvider, opts?: SignInOptions) {
  const result = await cloudAuth.signInWithOAuth(provider, {
    redirect_uri: opts?.redirect_uri,
    extraParams: {
      ...(opts?.extraParams ?? {}),
    },
  });

  if (result.redirected || result.error) {
    return result;
  }

  try {
    await supabase.auth.setSession(result.tokens);
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  return result;
}
