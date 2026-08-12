"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

export async function getPaddleClient(opts: {
  token: string;
  env: "sandbox" | "production";
}): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token: opts.token,
      environment: opts.env,
    });
  }
  return paddlePromise;
}

export async function openPaddleCheckout(opts: {
  token: string;
  env: "sandbox" | "production";
  transactionId: string;
  onCompleted?: () => void;
}) {
  const paddle = await getPaddleClient({ token: opts.token, env: opts.env });
  if (!paddle) throw new Error("Paddle yuklanmadi");

  paddle.Checkout.open({
    transactionId: opts.transactionId,
  });

  // checkout.completed brauzerda kelishi mumkin — webhook asosiy manba
  opts.onCompleted?.();
}
