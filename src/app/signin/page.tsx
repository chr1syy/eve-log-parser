import { Suspense } from "react";
import SignInContent from "./signin-content";

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
