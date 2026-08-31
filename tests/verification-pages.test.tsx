// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VerificationResultPage, { metadata as resultMetadata } from "@/app/verification/result/page";
import VerifyPage, { metadata as verifyMetadata } from "@/app/verify/[token]/page";

describe("verification pages", () => {
  it("keeps the provider return page non-authoritative and no-index", () => {
    render(<VerificationResultPage />);
    expect(screen.getByText("Verification submitted")).toBeInTheDocument();
    expect(screen.getByText(/does not determine the result/)).toBeInTheDocument();
    expect(resultMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("renders a dynamic opaque-token page", async () => {
    render(await VerifyPage({ params: Promise.resolve({ token: "opaque-token" }) }));
    expect(verifyMetadata.robots).toEqual({ index: false, follow: false });
  });
});
