"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getOnboardingStore, useOnboardingState } from "@/hooks/useOnboardingState";
import {
  onboardingSchema,
  STEP_FIELDS,
  type OnboardingFormValues,
} from "@/lib/onboardingSchema";
import ProgressStepper from "./ProgressStepper";
import { toast } from "react-hot-toast";
import { useWallet } from "@/context/WalletContext";

const STEPS = ["Connect Wallet", "Verify History", "Set Goal", "First Deposit"];

export default function OnboardingWizard() {
  const router = useRouter();
  const store = getOnboardingStore();
  const { publicKey, connect } = useWallet();

  // State from Zustand store (persisted across reloads).
  const step = useOnboardingState((s) => s.step);
  const isVerified = useOnboardingState((s) => s.isVerified);

  // Local component state
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  // react-hook-form drives all field-level validation. Default values are
  // seeded from the persisted store so a reload keeps the user's progress.
  const {
    control,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      recipientAddress: store.getState().recipientAddress,
      savingsTarget: store.getState().savingsTarget,
      savingsDuration: store.getState().savingsDuration as 6 | 9 | 12,
      firstDepositAmount: store.getState().firstDepositAmount,
    },
  });

  const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL!;
  const USDC_TOKEN_ID = process.env.NEXT_PUBLIC_USDC_TOKEN_ID!;

  useEffect(() => {
    if (step === 1 && publicKey) {
      fetchUSDCBalance(publicKey);
    }
  }, [step, publicKey]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const connectedPublicKey = await connect();
      if (connectedPublicKey) {
        await fetchUSDCBalance(connectedPublicKey);
        toast.success("Wallet connected!");
      } else {
        toast.error("Freighter is not available. Please install and set up the Freighter wallet extension.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect wallet.");
    }
    setIsLoading(false);
  };

  const fetchUSDCBalance = async (pk: string) => {
    try {
      const { Horizon } = await import("@stellar/stellar-sdk");
      const server = new Horizon.Server(HORIZON_URL);
      const account = await server.accounts().accountId(pk).call();
      const usdcBalanceLine = (account.balances as any[]).find(
        (b) => b.asset_code === "USDC" && b.asset_issuer === USDC_TOKEN_ID
      );
      setUsdcBalance(usdcBalanceLine ? parseFloat(usdcBalanceLine.balance).toFixed(2) : "0.00");
    } catch (e) {
      console.warn("Could not fetch USDC balance.", e);
      setUsdcBalance("0.00");
    }
  };

  const handleVerify = async () => {
    const valid = await trigger("recipientAddress");
    if (!valid) return;

    setIsLoading(true);
    setVerificationMessage("");
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientAddress: getValues("recipientAddress") }),
      });
      const data = await response.json();
      if (response.ok && data.eligible) {
        store.getState().setIsVerified(true);
        setVerificationMessage(data.message);
        toast.success("Remittance history verified!");
      } else {
        store.getState().setIsVerified(false);
        setVerificationMessage(data.message || "Verification failed. Please check the address and try again.");
        toast.error(data.message || "Verification failed.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during verification.");
    }
    setIsLoading(false);
  };

  const handleDeposit = async () => {
    if (!publicKey) {
      toast.error("Wallet not connected.");
      return;
    }
    const valid = await trigger("firstDepositAmount");
    if (!valid) return;

    setIsLoading(true);
    toast.loading("Preparing transaction...");

    try {
      // TODO: Build and sign Soroban deposit transaction using Contract SDK
      // Placeholder: simulate success flow
      toast.dismiss();
      toast.success("Simulated deposit success! Real Soroban integration pending.");
      store.getState().reset();
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      toast.dismiss();
      toast.error("Deposit failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Derived from the live form values so it updates as the user types.
  const watchedTarget = useWatch({ control, name: "savingsTarget" });
  const watchedDuration = useWatch({ control, name: "savingsDuration" });
  const monthlyContribution = useMemo(() => {
    if (watchedDuration > 0 && watchedTarget > 0) {
      return (watchedTarget / watchedDuration).toFixed(2);
    }
    return "0.00";
  }, [watchedTarget, watchedDuration]);

  const renderStepContent = () => {
    switch (step) {
      case 1: // Connect Wallet
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Connect Your Freighter Wallet</h3>
            <p className="text-[var(--text-secondary)] mb-6">Connect your wallet to check your USDC balance and interact with the protocol.</p>
            {publicKey ? (
              <div className="glass-card p-4 text-left">
                <p className="text-sm text-[var(--text-muted)]">Connected Address:</p>
                <p className="font-mono text-sm break-all mb-2">{publicKey}</p>
                <p className="text-sm text-[var(--text-muted)]">USDC Balance:</p>
                <p className="font-semibold text-lg">${usdcBalance}</p>
              </div>
            ) : (
              <button onClick={handleConnect} className="btn-primary" disabled={isLoading}>
                {isLoading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        );
      case 2: // Verify Remittances
        return (
          <div>
            <h3 className="text-xl font-semibold mb-4">Verify Your Remittance History</h3>
            <p className="text-[var(--text-secondary)] mb-6">Enter the Stellar address of the family member you regularly send remittances to.</p>
            <Controller
              name="recipientAddress"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2 mb-1">
                  <input
                    type="text"
                    placeholder="Recipient's G... address"
                    className="input-field flex-1"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      store.getState().setRecipientAddress(e.target.value);
                    }}
                    onBlur={field.onBlur}
                    disabled={isLoading || isVerified}
                  />
                  <button onClick={handleVerify} className="btn-primary" disabled={isLoading || !field.value || isVerified}>
                    {isLoading ? "Verifying..." : isVerified ? "Verified" : "Verify"}
                  </button>
                </div>
              )}
            />
            {errors.recipientAddress && (
              <p className="text-red-400 text-sm mb-3">{errors.recipientAddress.message}</p>
            )}
            {verificationMessage && (
              <div className={`p-3 rounded-lg text-sm ${isVerified ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                {verificationMessage}
              </div>
            )}
          </div>
        );
      case 3: // Set Savings Goal
        return (
          <div>
            <h3 className="text-xl font-semibold mb-4">Set Your Savings Goal</h3>
            <p className="text-[var(--text-secondary)] mb-6">Define your 30% down payment target and savings duration.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[var(--text-muted)]">Down Payment Target (USDC)</label>
                <Controller
                  name="savingsTarget"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      className="input-field w-full"
                      value={Number.isNaN(field.value) ? "" : field.value}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        field.onChange(value);
                        store.getState().setSavingsTarget(value);
                      }}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.savingsTarget && (
                  <p className="text-red-400 text-sm mt-1">{errors.savingsTarget.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-[var(--text-muted)]">Savings Duration</label>
                <Controller
                  name="savingsDuration"
                  control={control}
                  render={({ field }) => (
                    <select
                      className="input-field w-full"
                      value={field.value}
                      onChange={(e) => {
                        const value = Number(e.target.value) as 6 | 9 | 12;
                        field.onChange(value);
                        store.getState().setSavingsDuration(value);
                      }}
                      onBlur={field.onBlur}
                    >
                      <option value={6}>6 Months</option>
                      <option value={9}>9 Months</option>
                      <option value={12}>12 Months</option>
                    </select>
                  )}
                />
                {errors.savingsDuration && (
                  <p className="text-red-400 text-sm mt-1">{errors.savingsDuration.message}</p>
                )}
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-sm text-[var(--text-muted)]">Estimated Monthly Contribution</p>
                <p className="text-2xl font-bold">${monthlyContribution}</p>
              </div>
            </div>
          </div>
        );
      case 4: // First Deposit
        return (
          <div>
            <h3 className="text-xl font-semibold mb-4">Make Your First Deposit</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Kickstart your savings journey by making your first deposit into the secure escrow contract. Your estimated monthly contribution is ${monthlyContribution}.
            </p>
            <Controller
              name="firstDepositAmount"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Enter deposit amount"
                    className="input-field flex-1"
                    value={field.value ? field.value : ""}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      field.onChange(value);
                      store.getState().setFirstDepositAmount(value);
                    }}
                    onBlur={field.onBlur}
                  />
                  <button onClick={handleDeposit} className="btn-primary" disabled={isLoading || !field.value || field.value <= 0}>
                    {isLoading ? "Processing..." : "Deposit"}
                  </button>
                </div>
              )}
            />
            {errors.firstDepositAmount && (
              <p className="text-red-400 text-sm mt-1">{errors.firstDepositAmount.message}</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const handleNext = async () => {
    const fields = STEP_FIELDS[step] ?? [];
    const valid = fields.length === 0 ? true : await trigger(fields);
    if (valid) {
      store.getState().setStep(step + 1);
    }
  };

  // Step gating: step 1 requires a wallet, step 2 requires a verified history,
  // remaining steps are gated by react-hook-form validation on Next.
  const canGoNext = () => {
    switch (step) {
      case 1:
        return !!publicKey;
      case 2:
        return isVerified;
      case 3:
        return true;
      case 4:
        return false; // Final step
      default:
        return false;
    }
  };

  return (
    <div className="glass-card p-8">
      <ProgressStepper steps={STEPS} currentStep={step} />
      <div className="min-h-[200px] flex flex-col justify-center">{renderStepContent()}</div>
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-[var(--border-color)]">
        <button
          onClick={() => store.getState().setStep(step - 1)}
          className="btn-outline"
          disabled={step === 1 || isLoading}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="btn-primary"
          disabled={!canGoNext() || isLoading}
        >
          Next
        </button>
      </div>
    </div>
  );
}
